import type { Task } from './tasks';

export interface Note {
    path: string;
    title: string;
    status: 'todo' | 'in-progress' | 'done';
    created: string;
    lastUpdated: string;
    wordCount: number;
    tasks: Task[];
} 