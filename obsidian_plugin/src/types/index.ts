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

export interface GoalFlowzSettings {
    notesPath: string;
    folderStructure: 'flat' | 'monthly';
    notesFormat: '1' | '2' | 'custom';
    customNotesFormat?: string;
    noteTemplate: string;
} 