import { defineStore } from 'pinia';
import type { Habit, DailyHabitLog, DayStats, MoodLevel, LoveLevel, EnergyLevel, HabitsState } from '@/types/habits';
import { DateTime } from 'luxon';
import { ref } from 'vue';
import { useProgressionStore } from './progressionStore';

// Types pour les niveaux d'humeur et d'énergie
export type MoodLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13;
export type LoveLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type EnergyLevel = 1 | 2 | 3 | 4 | 5;

export interface DayStats {
    date: string;
    completedHabits: number;
    totalHabits: number;
    completionRate: number;
    streaks: Record<string, number>;
    mood?: MoodLevel;
    love?: LoveLevel;
    energyLevel?: EnergyLevel;
    notes?: string;
}

export const useHabitsStore = defineStore('habits', {
    state: (): HabitsState => ({
        habits: [],
        logs: [],
        dayStats: {
            [DateTime.now().toFormat('yyyy-MM-dd')]: {
                date: DateTime.now().toFormat('yyyy-MM-dd'),
                completedHabits: 0,
                totalHabits: 0,
                completionRate: 0,
                streaks: {},
                mood: undefined,
                love: undefined,
                energyLevel: undefined,
                notes: ''
            }
        }
    }),

    getters: {
        activeHabits: (state): Habit[] => state.habits.filter((h: Habit) => h.active),
        
        getHabitsByCategory: (state) => (category: string): Habit[] => 
            state.habits.filter((h: Habit) => h.category === category && h.active),
        
        getDayLogs: (state) => (date: string): DailyHabitLog[] => 
            state.logs.filter((log: DailyHabitLog) => log.date === date),
        
        getHabitStreak: (state) => (habitId: string): number => {
            const today = DateTime.now().toFormat('yyyy-MM-dd');
            let streak = 0;
            let currentDate = DateTime.fromISO(today);

            while (true) {
                const dateStr = currentDate.toFormat('yyyy-MM-dd');
                const log = state.logs.find(
                    (l: DailyHabitLog) => l.habitId === habitId && l.date === dateStr && l.completed
                );

                if (log) {
                    streak++;
                    currentDate = currentDate.minus({ days: 1 });
                } else {
                    break;
                }
            }

            return streak;
        },
        
        getDayStats: (state) => (date: string) => {
            const dayLogs = state.logs.filter(log => log.date === date);
            const activeHabits = state.habits.filter(h => h.active);
            const completedHabits = dayLogs.filter(log => log.completed).length;

            // Ajouter 2 au total (1 pour l'humeur, 1 pour l'énergie)
            const totalItems = activeHabits.length + 2;
            
            // Compter les éléments complétés (habitudes + humeur + énergie)
            let completedItems = completedHabits;
            if (state.dayStats?.[date]?.mood) completedItems++;
            if (state.dayStats?.[date]?.energyLevel) completedItems++;

            const completionRate = totalItems ? 
                (completedItems / totalItems) * 100 : 0;

            console.log('Calcul du taux de complétion:', {
                date,
                activeHabits: activeHabits.length,
                completedHabits,
                hasMood: !!state.dayStats?.[date]?.mood,
                hasEnergy: !!state.dayStats?.[date]?.energyLevel,
                totalItems,
                completedItems,
                completionRate
            });

            return {
                date,
                completedHabits: completedItems,
                totalHabits: totalItems,
                completionRate,
                streaks: {},
                mood: state.dayStats?.[date]?.mood,
                energyLevel: state.dayStats?.[date]?.energyLevel,
                notes: state.dayStats?.[date]?.notes
            };
        }
    },

    actions: {
        addHabit(habit: Omit<Habit, 'id'>) {
            const newHabit: Habit = {
                ...habit,
                id: crypto.randomUUID()
            };
            this.habits.push(newHabit);
        },

        updateHabit(habitId: string, updates: Partial<Habit>) {
            const index = this.habits.findIndex(h => h.id === habitId);
            if (index !== -1) {
                this.habits[index] = { ...this.habits[index], ...updates };
            }
        },

        toggleHabit(habitId: string, date: string, value?: number, app?: any) {
            try {
                // Trouver ou créer le log
                let log = this.logs.find(l => l.habitId === habitId && l.date === date);
                const wasCompleted = !!log?.completed;
                if (!log) {
                    log = {
                        habitId,
                        date,
                        completed: false,
                        value: value
                    };
                    this.logs.push(log);
                }

                // Basculer l'état et mettre à jour la valeur
                log.completed = !log.completed;
                if (value !== undefined) {
                    log.value = value;
                }
                if (!wasCompleted && log.completed) {
                    const progressionStore = useProgressionStore();
                    progressionStore.rewardHabitCompletion(habitId, date);
                }

                // Mettre à jour les stats du jour
                const stats = this.getDayStats(date);
                if (!this.dayStats) this.dayStats = {};
                
                console.log('Mise à jour des stats:', {
                    avant: this.dayStats[date]?.completionRate,
                    apres: stats.completionRate,
                    completed: log.completed
                });

                this.dayStats[date] = {
                    ...stats,
                    completedHabits: stats.completedHabits,
                    totalHabits: stats.totalHabits,
                    completionRate: stats.completionRate
                };

                // Synchroniser avec la note quotidienne si nécessaire
                if (app) {
                    this.syncWithDailyNote(date, app);
                }

                console.log('Habitude basculée:', {
                    habitId,
                    date,
                    completed: log.completed,
                    value,
                    stats: this.dayStats[date]
                });
            } catch (error) {
                console.error('Erreur lors du basculement de l\'habitude:', error);
            }
        },

        // Méthode pour initialiser les habitudes par défaut
        initializeDefaultHabits() {
            const defaultHabits: Omit<Habit, 'id'>[] = [
                {
                    name: 'Sport',
                    icon: '🏃',
                    category: 'health',
                    unit: 'h',
                    target: 8,
                    active: true
                },
                {
                    name: 'Fruits & Légumes',
                    icon: '🥗',
                    category: 'health',
                    target: 5,
                    unit: '',
                    active: true
                },
                {
                    name: 'Sommeil',
                    icon: '😴',
                    category: 'health',
                    target: 8,
                    unit: 'h',
                    active: true
                },
                {
                    name: 'Musique',
                    icon: '🎹',
                    category: 'personal',
                    active: true
                },
                {
                    name: 'Méditation',
                    icon: '🧘',
                    category: 'lifestyle',
                    target: 10,
                    unit: 'min',
                    active: true
                }
            ];

            defaultHabits.forEach(habit => {
                if (!this.habits.some(h => h.name === habit.name)) {
                    this.addHabit(habit);
                }
            });
        },

        async syncWithDailyNote(date: string, app: any) {
            try {
                const dailyNote = await app.vault.getAbstractFileByPath(`Journal/${date}.md`);
                if (!dailyNote) return;

                let content = await app.vault.read(dailyNote);

                // Générer le contenu des habitudes
                const stats = this.getDayStats(date);
                const habitsContent = `## Habitudes du jour\n${this.habits
                    .filter(h => h.active)
                    .map(habit => {
                        const log = this.logs.find(l => l.habitId === habit.id && l.date === date);
                        const status = log?.completed ? '✅' : '⬜';
                        const value = log?.value ? ` (${log.value}${habit.unit || ''})` : '';
                        const streak = stats.streaks[habit.id] ? ` 🔥 ${stats.streaks[habit.id]} jours` : '';
                        return `- ${status} ${habit.icon} ${habit.name}${value}${streak}`;
                    })
                    .join('\n')}\n`;

                // Vérifier si une section habitudes existe déjà
                const habitsSectionRegex = /## Habitudes du jour[\s\S]*?(?=\n## |$)/;
                if (content.match(habitsSectionRegex)) {
                    // Mettre à jour la section existante
                    content = content.replace(habitsSectionRegex, habitsContent);
                } else {
                    // Ajouter la nouvelle section à la fin
                    content += '\n' + habitsContent;
                }

                // Sauvegarder la note mise à jour
                await app.vault.modify(dailyNote, content);
            } catch (error) {
                console.warn('Erreur lors de la synchronisation avec la note journalière:', error);
            }
        },

        setDayMood(date: string, mood: MoodLevel) {
            if (!this.dayStats) this.dayStats = {};
            if (!this.dayStats[date]) {
                this.dayStats[date] = {
                    date,
                    completedHabits: 0,
                    totalHabits: 0,
                    completionRate: 0,
                    streaks: {},
                    mood,
                    energyLevel: undefined,
                    notes: undefined
                };
            } else {
                this.dayStats[date].mood = mood;
            }
        },

        setDayEnergyLevel(date: string, level: EnergyLevel) {
            if (!this.dayStats) this.dayStats = {};
            if (!this.dayStats[date]) {
                this.dayStats[date] = {
                    date,
                    completedHabits: 0,
                    totalHabits: 0,
                    completionRate: 0,
                    streaks: {},
                    energyLevel: level,
                    mood: undefined,
                    notes: undefined
                };
            } else {
                this.dayStats[date].energyLevel = level;
            }
        },

        setDayNotes(date: string, notes: string) {
            if (!this.dayStats) this.dayStats = {};
            if (!this.dayStats[date]) {
                this.dayStats[date] = {
                    date,
                    completedHabits: 0,
                    totalHabits: 0,
                    completionRate: 0,
                    streaks: {},
                    mood: undefined,
                    energyLevel: undefined,
                    notes
                };
            } else {
                this.dayStats[date].notes = notes;
            }
        },

        setDayLove(date: string, level: LoveLevel) {
            if (!this.dayStats) this.dayStats = {};
            if (!this.dayStats[date]) {
                this.dayStats[date] = {
                    date,
                    completedHabits: 0,
                    totalHabits: 0,
                    completionRate: 0,
                    streaks: {},
                    love: level,
                    mood: undefined,
                    energyLevel: undefined,
                    notes: undefined
                };
            } else {
                this.dayStats[date].love = level;
            }
        }
    }
});

export const getMoodEmoji = (level: MoodLevel): string => {
    const emojis: Record<MoodLevel, string> = {
        1: '😭',
        2: '😡',
        3: '😵‍💫',
        4: '😩',
        5: '😓',
        6: '😢',
        7: '😐',
        8: '🙂',
        9: '🫣',
        10: '😊',
        11: '🌞',
        12: '🥳',
        13: '🤠'
    };
    return emojis[level];
};

export const getLoveEmoji = (level: LoveLevel): string => {
    const emojis: Record<LoveLevel, string> = {
        1: '🖤',
        2: '💔',
        3: '❤️‍🩹',
        4: '🤍',
        5: '🩷',
        6: '💖',
        7: '❤️‍🔥'
    };
    return emojis[level];
};

export const getEnergyEmoji = (level: EnergyLevel): string => {
    const emojis: Record<EnergyLevel, string> = {
        1: '💤',
        2: '🪫',
        3: '⚡',
        4: '🔋',
        5: '🚀',
    };
    return emojis[level];
};
