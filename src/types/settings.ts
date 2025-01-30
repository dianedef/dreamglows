export interface Ritual {
    label: string;
    isCompleted: boolean;
    dueDate?: string;
    linkToOptimizer?: boolean;
    linkToGenerator?: boolean;
}

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
    notesFormat: '1' | '2' | 'custom';
    customNotesFormat?: string;
    noteTemplate: string;
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
    notesFormat: "1",
    noteTemplate: `<!--
⚠️ IMPORTANT : Pour assurer le bon fonctionnement du plugin
- Ne pas modifier les titres de sections (## 🎯 GoalFlowz, etc.)
- Ne pas déplacer les notes vers d'autres dossiers
- Éviter les caractères spéciaux dans les titres : < > : " | ? * 
- Les tags doivent suivre le format #tag-name
-->

# 📓 {day}{suffix} {month}

*{MM}/{DD}*

## 😊 Humeur
- Niveau d'humeur : _/5
- Niveau d'énergie : _/5
- Notes : 
- Timestamp : {MM}/{DD}

## 🎯 GoalFlowz

### Objectifs

### Tâches à commencer

### Tâches à terminer

## 📝 Journal

## 📊 Bilan de la journée

`,
    lastMainWidth: 50,
    timelineStartHour: "09:00",
    timelineEndHour: "18:00",
    timeFormat: "24h"
}; 