import type { Task } from './index';

export interface Goal {
    id: string;
    title: string;
    description?: string;
    category?: string;  // Pour grouper les objectifs par catégorie
    dueDate?: string;
    completedDate?: string;
    startDate: string;  // Date de création/début
    status: 'todo' | 'in-progress' | 'done';
    tasks: Task[];
    priority: 'low' | 'medium' | 'high';
    parentGoalId?: string;  // Si c'est un sous-objectif, référence à son parent
    subGoalIds: string[];   // Liste des IDs des sous-objectifs
    progress: number;  // Pourcentage de progression
    tags?: string[];  // Pour le filtrage et la catégorisation
    recurring?: {
        frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
        endDate?: string;
    };
    linkedNotes?: string[];  // Chemins vers les notes liées
    metrics?: {
        target?: number;
        current?: number;
        unit?: string;
    };
}

export interface GoalViewProps {
    goals: Goal[];
    expandedGoals: string[];
    app: any;
    filters?: {
        status?: string[];
        priority?: string[];
        categories?: string[];
        tags?: string[];
    };
    sortBy?: 'dueDate' | 'priority' | 'progress' | 'title';
    sortDirection?: 'asc' | 'desc';
}

export interface GoalViewEmits {
    (e: 'toggle-goal', id: string): void;
    (e: 'update-status', goal: Goal, status: string): void;
    (e: 'add-task', goal: Goal, taskLabel: string): void;
    (e: 'delete-task', goal: Goal, taskId: string): void;
    (e: 'toggle-task', goal: Goal, task: Task): void;
    (e: 'add-subgoal', parentGoal: Goal, newGoal: Partial<Goal>): void;
    (e: 'update-goal', goal: Goal): void;
    (e: 'delete-goal', goalId: string): void;
    (e: 'update-metrics', goal: Goal, metrics: Goal['metrics']): void;
    (e: 'link-note', goal: Goal, notePath: string): void;
} 