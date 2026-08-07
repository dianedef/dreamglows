import { getDefaultTemplate } from '../constants/templates';

export interface DefaultTask {
    label: string;
    isCompleted: boolean;
    linkToOptimizer: boolean;
    linkToGenerator: boolean;
    dueDate?: string;
}

export interface Ritual {
    label: string;
    isCompleted: boolean;
    dueDate?: string;
    linkToOptimizer?: boolean;
    linkToGenerator?: boolean;
}

export type NoteFormat = 
    | 'full-date-emoji' // 📓 1er Janvier 01-01 ou 📓 1st January 01-01
    | 'name-emoji'      // 📓 1er Janvier ou 📓 1st January
    | 'short-emoji'     // 📓 01-01
    | 'full-write'      // ✍️ 1er Janvier ou ✍️ 1st January
    | 'short-write'     // ✍️ 01-01
    | 'name-only'       // 1er Janvier ou 1st January
    | 'short-only';     // 01-01

export interface GameProgression {
    level: number;
    xp: number;
    totalXp: number;
    gold: number;
    streak: number;
    bestStreak: number;
    lastActivityDate: string;
    rewardedByDate: Record<string, string[]>;
    rewardHistory: RewardEvent[];
}

export interface RewardEvent {
    date: string;
    source: 'task' | 'goal' | 'habit' | 'milestone';
    sourceId: string;
    title: string;
    xp: number;
    gold: number;
    message: string;
}

export const DEFAULT_GAME_PROGRESSION: GameProgression = {
    level: 1,
    xp: 0,
    totalXp: 0,
    gold: 0,
    streak: 0,
    bestStreak: 0,
    lastActivityDate: '',
    rewardedByDate: {},
    rewardHistory: []
};

export interface DreamGlowsSettings {
    defaultTasks: DefaultTask[];
    rituals: Ritual[];
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
    monthLanguage: 'fr' | 'en';
    notesFormat: NoteFormat;
    customNotesFormat?: string;
    noteTemplate?: string;
    lastMainWidth: number;
    timelineStartHour: string;
    timelineEndHour: string;
    timeFormat: '12h' | '24h';
    gameProgression: GameProgression;
}

export const DEFAULT_SETTINGS: DreamGlowsSettings = {
    defaultTasks: [],
    rituals: [
        { label: "Méditation matinale", isCompleted: false, linkToGenerator: false },
        { label: "Revue des objectifs", isCompleted: false, linkToOptimizer: true },
        { label: "Planification de la journée", isCompleted: false }
    ],
    projectFolders: [],
    frequencyColors: {
        high: "#ff0000",
        medium: "#ffff00",
        low: "#00ff00"
    },
    openAIKey: "",
    openRouterKey: "",
    lastActiveTab: "day",
    recentGoals: [],
    notesPath: "notes",
    folderStructure: "flat",
    monthLanguage: "fr",
    notesFormat: "full-date-emoji",
    lastMainWidth: 50,
    timelineStartHour: "09:00",
    timelineEndHour: "18:00",
    timeFormat: "24h",
    gameProgression: DEFAULT_GAME_PROGRESSION
}; 

export type DreamGlowsSettings = DreamGlowsSettings;
