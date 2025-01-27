export type TaskPriority = 'low' | 'medium' | 'high';
export type TaskStatus = 'todo' | 'in-progress' | 'done';

export interface Task {
    id: string;
    title: string;
    label: string;
    description?: string;
    date?: string;
    priority: TaskPriority;
    status: TaskStatus;
    done: boolean;
    tags?: string[];
    createdAt: string;
    updatedAt: string;
    linkToOptimizer?: boolean;
    linkToGenerator?: boolean;
} 