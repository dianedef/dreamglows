export interface Task {
    id: string;
    label: string;
    done: boolean;
    linkToOptimizer?: boolean;
    linkToGenerator?: boolean;
}

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