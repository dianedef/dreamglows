import { Goal, Task, DataStore } from '../types/models';
import { DateService } from './DateService';
import { StorageService } from './StorageService';
import { addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';

export interface TimelineItem {
    id: string;
    type: 'goal' | 'task';
    title: string;
    startDate: Date;
    endDate?: Date;
    status: string;
    group?: string;
    parentId?: string;  // Pour les sous-tâches
    progress?: number;  // Pour les objectifs
    priority?: string;
}

export interface TimelineGroup {
    id: string;
    content: string;
    subgroups?: TimelineGroup[];
}

export class TimelineService {
    private dateService: DateService;
    private storageService: StorageService;

    constructor(dateService: DateService, storageService: StorageService) {
        this.dateService = dateService;
        this.storageService = storageService;
    }

    /**
     * Charge les données pour la timeline sur une période donnée
     */
    async loadTimelineData(start: Date, end: Date): Promise<{
        items: TimelineItem[],
        groups: TimelineGroup[]
    }> {
        const data = await this.storageService.loadDataForRange(start, end);
        const items: TimelineItem[] = [];
        const groups = new Map<string, TimelineGroup>();

        // Convertir les goals en items de timeline
        for (const goal of data.goals) {
            items.push({
                id: `goal-${goal.id}`,
                type: 'goal',
                title: goal.title,
                startDate: new Date(goal.startDate),
                endDate: goal.dueDate ? new Date(goal.dueDate) : undefined,
                status: goal.status,
                group: goal.category || 'Sans catégorie',
                progress: goal.progress,
                priority: goal.priority
            });

            // Créer ou mettre à jour le groupe de catégorie
            if (!groups.has(goal.category)) {
                groups.set(goal.category || 'Sans catégorie', {
                    id: goal.category || 'Sans catégorie',
                    content: goal.category || 'Sans catégorie'
                });
            }
        }

        // Convertir les tasks en items de timeline
        for (const task of data.tasks) {
            const taskGroup = task.goalId || 'Sans objectif';
            items.push({
                id: `task-${task.id}`,
                type: 'task',
                title: task.title,
                startDate: new Date(task.startDate),
                endDate: task.dueDate ? new Date(task.dueDate) : undefined,
                status: task.status,
                group: taskGroup,
                parentId: task.parentTaskId,
                priority: task.priority
            });

            // Ajouter le groupe si c'est une tâche sans objectif
            if (taskGroup === 'Sans objectif' && !groups.has(taskGroup)) {
                groups.set(taskGroup, {
                    id: taskGroup,
                    content: taskGroup
                });
            }
        }

        return {
            items: this.sortTimelineItems(items),
            groups: Array.from(groups.values())
        };
    }

    /**
     * Calcule les statistiques pour une période donnée
     */
    async getTimelineStats(start: Date, end: Date): Promise<{
        totalGoals: number;
        completedGoals: number;
        totalTasks: number;
        completedTasks: number;
        progressByCategory: Record<string, number>;
    }> {
        const data = await this.storageService.loadDataForRange(start, end);
        
        const stats = {
            totalGoals: data.goals.length,
            completedGoals: data.goals.filter(g => g.status === 'done').length,
            totalTasks: data.tasks.length,
            completedTasks: data.tasks.filter(t => t.status === 'done').length,
            progressByCategory: {} as Record<string, number>
        };

        // Calculer la progression par catégorie
        const categoriesMap = new Map<string, { total: number; completed: number }>();
        for (const goal of data.goals) {
            const category = goal.category;
            if (!categoriesMap.has(category)) {
                categoriesMap.set(category, { total: 0, completed: 0 });
            }
            const categoryStats = categoriesMap.get(category)!;
            categoryStats.total++;
            if (goal.status === 'done') categoryStats.completed++;
        }

        // Convertir en pourcentages
        for (const [category, { total, completed }] of categoriesMap) {
            stats.progressByCategory[category] = (completed / total) * 100;
        }

        return stats;
    }

    /**
     * Génère des suggestions de planification pour les tâches non planifiées
     */
    async suggestTaskScheduling(tasks: Task[], goals: Goal[]): Promise<Map<string, Date>> {
        const suggestions = new Map<string, Date>();
        const goalDates = new Map(goals.map(g => [g.id, new Date(g.dueDate)]));

        for (const task of tasks) {
            if (!task.startDate && task.goalId) {
                const goalDueDate = goalDates.get(task.goalId);
                if (goalDueDate) {
                    // Suggérer une date entre aujourd'hui et la date de fin du goal
                    const today = new Date();
                    const daysUntilDue = Math.floor((goalDueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                    const suggestedDate = new Date(today);
                    suggestedDate.setDate(today.getDate() + Math.floor(daysUntilDue / 2));
                    suggestions.set(task.id, suggestedDate);
                }
            }
        }

        return suggestions;
    }

    /**
     * Trie les éléments de la timeline
     */
    private sortTimelineItems(items: TimelineItem[]): TimelineItem[] {
        return items.sort((a, b) => {
            // D'abord par date de début
            const dateCompare = a.startDate.getTime() - b.startDate.getTime();
            if (dateCompare !== 0) return dateCompare;

            // Ensuite par type (goals avant tasks)
            if (a.type !== b.type) return a.type === 'goal' ? -1 : 1;

            // Enfin par titre
            return a.title.localeCompare(b.title);
        });
    }

    /**
     * Calcule la charge de travail quotidienne
     */
    async calculateDailyWorkload(start: Date, end: Date): Promise<Map<string, number>> {
        const data = await this.storageService.loadDataForRange(start, end);
        const workload = new Map<string, number>();
        const priorityWeights = {
            high: 3,
            medium: 2,
            low: 1
        };

        // Créer une entrée pour chaque jour de la période
        const days = eachDayOfInterval({ start, end });
        for (const day of days) {
            workload.set(this.dateService.formatForFile(day), 0);
        }

        // Calculer la charge pondérée par priorité
        for (const task of data.tasks) {
            const taskStart = new Date(task.startDate);
            const taskEnd = task.dueDate ? new Date(task.dueDate) : taskStart;
            
            if (taskStart <= end && taskEnd >= start) {
                const taskDays = eachDayOfInterval({ 
                    start: taskStart > start ? taskStart : start,
                    end: taskEnd < end ? taskEnd : end
                });

                const weight = priorityWeights[task.priority || 'medium'];
                for (const day of taskDays) {
                    const key = this.dateService.formatForFile(day);
                    workload.set(key, (workload.get(key) || 0) + weight);
                }
            }
        }

        return workload;
    }
} 