export interface GoalFlowzSettings {
    defaultTasks: DefaultTask[];
    projectFolders: string[];
    frequencyColors: {
        high: string;
        medium: string;
        low: string;
    };
    openAIKey: string;
    openRouterKey: string;
    lastActiveTab: string;
    recentGoals: Array<{
        folder: string;
        keyword: string;
        niche: string;
        isFinished: boolean;
        taskId?: string;
        words: number;
        article: string;
        date: string;
    }>;
    notesPath: string;
    folderStructure: 'flat' | 'monthly';
    notesFormat: '1' | '2' | 'custom';
    customNotesFormat?: string;
    noteTemplate: string;
    lastMainWidth: number;
}

export interface DefaultTask {
    label: string;
    isCompleted: boolean;
    dueDate?: string;
    linkToOptimizer?: boolean;
    linkToGenerator?: boolean;
}

export const DEFAULT_SETTINGS: GoalFlowzSettings = {
    defaultTasks: [
        { label: "Définir l'objectif", isCompleted: false, linkToGenerator: true },
        { label: "Planifier les étapes", isCompleted: false, linkToOptimizer: true },
        { label: "Suivre les progrès", isCompleted: false }
    ],
    projectFolders: [],
    frequencyColors: {
        high: "#ff0000",
        medium: "#ffa500",
        low: "#008000"
    },
    openAIKey: "",
    openRouterKey: "",
    lastActiveTab: "goals",
    recentGoals: [],
    notesPath: "notes",
    folderStructure: "flat",
    notesFormat: "1",
    noteTemplate: "# {{title}}\n\n## Objectif\n\n## Tâches\n\n## Notes",
    lastMainWidth: 50
}; 