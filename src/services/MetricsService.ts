import { Goal, Task } from '../types/models';
import { DateService } from './DateService';
import { StorageService } from './StorageService';
import { DateTime } from 'luxon';

export interface DayStats {
    mood?: number;
    energyLevel?: number;
    completionRate?: number;
    completedTasks: number;
}

export interface CategoryStats {
    total: number;
    completed: number;
    inProgress: number;
    todo: number;
    completionRate: number;
}

export interface PeriodStats {
    startDate: DateTime;
    endDate: DateTime;
    goals: {
        total: number;
        completed: number;
        inProgress: number;
        todo: number;
        completionRate: number;
    };
    tasks: {
        total: number;
        completed: number;
        completionRate: number;
        dailyAverage: number;
    };
    categories: Record<string, CategoryStats>;
    dailyStats: Record<string, DayStats>;
}

export class MetricsService {
    private dateService: DateService;
    private storageService: StorageService;

    constructor(dateService: DateService, storageService: StorageService) {
        this.dateService = dateService;
        this.storageService = storageService;
    }

    /**
     * Calcule les statistiques pour une période donnée
     */
    async calculatePeriodStats(days: number): Promise<PeriodStats> {
        const endDate = DateTime.now().endOf('day');
        const startDate = endDate.minus({ days }).startOf('day');

        const data = await this.storageService.loadDataForRange(
            startDate.toJSDate(),
            endDate.toJSDate()
        );

        // Statistiques des objectifs
        const goals = {
            total: data.goals.length,
            completed: data.goals.filter(g => g.status === 'done').length,
            inProgress: data.goals.filter(g => g.status === 'in-progress').length,
            todo: data.goals.filter(g => g.status === 'todo').length,
            completionRate: 0
        };
        goals.completionRate = goals.total > 0 
            ? (goals.completed / goals.total) * 100 
            : 0;

        // Statistiques des tâches
        const tasks = {
            total: data.tasks.length,
            completed: data.tasks.filter(t => t.status === 'done').length,
            completionRate: 0,
            dailyAverage: 0
        };
        tasks.completionRate = tasks.total > 0 
            ? (tasks.completed / tasks.total) * 100 
            : 0;
        tasks.dailyAverage = tasks.completed / days;

        // Statistiques par catégorie
        const categories: Record<string, CategoryStats> = {};
        for (const goal of data.goals) {
            if (!categories[goal.category]) {
                categories[goal.category] = {
                    total: 0,
                    completed: 0,
                    inProgress: 0,
                    todo: 0,
                    completionRate: 0
                };
            }
            
            const catStats = categories[goal.category];
            catStats.total++;
            
            switch (goal.status) {
                case 'done':
                    catStats.completed++;
                    break;
                case 'in-progress':
                    catStats.inProgress++;
                    break;
                case 'todo':
                    catStats.todo++;
                    break;
            }
            
            catStats.completionRate = (catStats.completed / catStats.total) * 100;
        }

        // Statistiques journalières
        const dailyStats: Record<string, DayStats> = {};
        let current = startDate;
        while (current <= endDate) {
            const dateStr = current.toFormat('yyyy-MM-dd');
            const dayTasks = data.tasks.filter(t => 
                t.startDate === dateStr || t.dueDate === dateStr
            );
            
            dailyStats[dateStr] = {
                completedTasks: dayTasks.filter(t => t.status === 'done').length
            };
            
            current = current.plus({ days: 1 });
        }

        return {
            startDate,
            endDate,
            goals,
            tasks,
            categories,
            dailyStats
        };
    }

    /**
     * Calcule les métriques de progression d'un objectif
     */
    calculateGoalProgress(goal: Goal, tasks: Task[]): number {
        if (goal.metrics) {
            // Si l'objectif a des métriques définies, utiliser celles-ci
            return (goal.metrics.current / goal.metrics.target) * 100;
        }

        // Sinon, calculer basé sur les tâches associées
        const goalTasks = tasks.filter(t => t.goalId === goal.id);
        if (goalTasks.length === 0) return goal.progress || 0;

        const completed = goalTasks.filter(t => t.status === 'done').length;
        return (completed / goalTasks.length) * 100;
    }

    /**
     * Calcule la répartition du temps par catégorie
     */
    calculateTimeDistribution(goals: Goal[]): Record<string, number> {
        const distribution: Record<string, number> = {};
        const totalDuration = goals.reduce((total, goal) => {
            const duration = DateTime.fromISO(goal.dueDate)
                .diff(DateTime.fromISO(goal.startDate))
                .as('hours');
            return total + duration;
        }, 0);

        for (const goal of goals) {
            const duration = DateTime.fromISO(goal.dueDate)
                .diff(DateTime.fromISO(goal.startDate))
                .as('hours');
            
            const category = goal.category;
            distribution[category] = (distribution[category] || 0) + 
                (duration / totalDuration) * 100;
        }

        return distribution;
    }

    /**
     * Calcule les tendances de productivité
     */
    calculateProductivityTrends(tasks: Task[]): {
        morning: number;
        afternoon: number;
        evening: number;
    } {
        const completedTasks = tasks.filter(t => t.status === 'done');
        const total = completedTasks.length;
        
        const morning = completedTasks.filter(t => {
            const hour = DateTime.fromISO(t.updatedAt).hour;
            return hour >= 5 && hour < 12;
        }).length;

        const afternoon = completedTasks.filter(t => {
            const hour = DateTime.fromISO(t.updatedAt).hour;
            return hour >= 12 && hour < 18;
        }).length;

        const evening = completedTasks.filter(t => {
            const hour = DateTime.fromISO(t.updatedAt).hour;
            return hour >= 18 || hour < 5;
        }).length;

        return {
            morning: total > 0 ? (morning / total) * 100 : 0,
            afternoon: total > 0 ? (afternoon / total) * 100 : 0,
            evening: total > 0 ? (evening / total) * 100 : 0
        };
    }
} 