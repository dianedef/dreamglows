export type TaskPriority = 'low' | 'medium' | 'high';
export type TaskStatus = 'todo' | 'in-progress' | 'done';

export interface Task {
    id: string;
    title: string;
    description?: string;
    date?: string;
    priority: TaskPriority;
    status: TaskStatus;
    tags?: string[];
    createdAt: string;
    updatedAt: string;
} 