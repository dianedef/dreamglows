export * from './tasks';
export * from './notes';
export * from './goals';
export * from './settings';

export interface Note {
    path: string;
    title: string;
    status: 'todo' | 'in-progress' | 'done';
    created: string;
    lastUpdated: string;
    wordCount: number;
    tasks: Task[];
}
