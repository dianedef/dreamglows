export type HabitCategory = 'health' | 'productivity' | 'lifestyle' | 'personal';

export interface Habit {
    id: string;
    name: string;
    icon: string;
    category: HabitCategory;
    color?: string;
    target?: number; // Pour les habitudes quantifiables (ex: boire 2L d'eau)
    unit?: string;   // L'unité de mesure si applicable
    active: boolean; // Si l'habitude est actuellement suivie
}

export interface DailyHabitLog {
    habitId: string;
    date: string;    // Format YYYY-MM-DD
    completed: boolean;
    value?: number;  // Pour les habitudes quantifiables
    notes?: string;  // Commentaires optionnels
}

export interface DayStats {
    date: string;
    completedHabits: number;
    totalHabits: number;
    completionRate: number;
    streaks: { [habitId: string]: number };
    nextGoal?: {
        id: string;
        title: string;
        dueDate: string;
    };
    lastCompletedGoal?: {
        id: string;
        title: string;
        completedDate: string;
    };
    nextTask?: {
        id: string;
        title: string;
        date: string;
    };
    mood?: 1 | 2 | 3 | 4 | 5; // Échelle de 1 à 5
    energyLevel?: 1 | 2 | 3 | 4 | 5;
    notes?: string; // Notes personnelles du jour
} 