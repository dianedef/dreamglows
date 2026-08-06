import { getDefaultTemplate } from '../constants/templates';

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

export interface GoalFlowzSettings {
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
    lastMainWidth: number;
    timelineStartHour: string;
    timelineEndHour: string;
    timeFormat: '12h' | '24h';
}

export const DEFAULT_SETTINGS: GoalFlowzSettings = {
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
    timeFormat: "24h"
}; 