import type { Task } from './tasks';

export type GoalPriority = 'low' | 'medium' | 'high';
export type GoalStatus = 'todo' | 'in_progress' | 'done' | 'cancelled';
export type GoalFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface GoalMetrics {
    target: number;
    current: number;
    unit: string;
}

export interface GoalRecurring {
    frequency: GoalFrequency;
    endDate?: string;
}

export interface Goal {
    id: string;
    title: string;
    description: string;
    timeframe: GoalTimeframe;
    status: GoalStatus;
    progress: number;
    parentGoalId?: string;
    childGoals?: string[];
    startDate: Date;
    endDate: Date;
    metrics?: GoalMetric[];
}

export enum GoalTimeframe {
    DAILY = 'daily',
    WEEKLY = 'weekly',
    MONTHLY = 'monthly',
    QUARTERLY = 'quarterly',
    YEARLY = 'yearly',
    FIVE_YEAR = 'five_year',
    TEN_YEAR = 'ten_year'
}

export enum GoalStatus {
    NOT_STARTED = 'not_started',
    IN_PROGRESS = 'in_progress',
    COMPLETED = 'completed',
    ON_HOLD = 'on_hold'
}

export interface GoalMetric {
    id: string;
    name: string;
    value: number;
    target: number;
    unit: string;
}

export interface GoalChain {
    id: string;
    mainGoalId: string;
    subGoals: Goal[];
    createdAt: Date;
    updatedAt: Date;
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