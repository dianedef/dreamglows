export type TaskPriority = 'low' | 'medium' | 'high';
export type TaskStatus = 'todo' | 'in-progress' | 'done';

export interface Task {
    id: string;
    title: string;
    description?: string;
    startDate: string;
    dueDate?: string;
    priority: TaskPriority;
    status: TaskStatus;
    goalId?: string;
    notes?: string;
    tags?: string[];
    createdAt: string;
    updatedAt: string;
    completedAt?: string;
    linkToOptimizer?: boolean;
    linkToGenerator?: boolean;
} 