export type HabitCategory = 'health' | 'productivity' | 'relationships' | 'personal';

export type MoodLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13;
export type LoveLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type EnergyLevel = 1 | 2 | 3 | 4 | 5 ;

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
    streaks: Record<string, number>;
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
    mood?: MoodLevel;
    love?: LoveLevel;
    energyLevel?: EnergyLevel;
    notes?: string; // Notes personnelles du jour
}

export interface HabitStreak {
    habitId: string;
    currentStreak: number;
    longestStreak: number;
    lastCompletedDate?: string;
}

export interface HabitsState {
    habits: Habit[];
    logs: DailyHabitLog[];
    dayStats?: { [date: string]: DayStats };
} 