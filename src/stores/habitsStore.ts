import { defineStore } from 'pinia';
import type { Habit, DailyHabitLog, DayStats } from '@/types/habits';
import { DateTime } from 'luxon';
import { ref } from 'vue';

interface HabitsState {
    habits: Habit[];
    logs: DailyHabitLog[];
    dayStats?: { [date: string]: DayStats };
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
                energyLevel: undefined,
                notes: ''
            }
        }
    }),

    getters: {
        activeHabits: (state) => state.habits.filter(h => h.active),
        
        getHabitsByCategory: (state) => (category: string) => 
            state.habits.filter(h => h.category === category && h.active),
        
        getDayLogs: (state) => (date: string) => 
            state.logs.filter(log => log.date === date),
        
        getHabitStreak: (state) => (habitId: string) => {
            const today = DateTime.now().toFormat('yyyy-MM-dd');
            let streak = 0;
            let currentDate = DateTime.fromISO(today);

            while (true) {
                const dateStr = currentDate.toFormat('yyyy-MM-dd');
                const log = state.logs.find(
                    l => l.habitId === habitId && l.date === dateStr && l.completed
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

            // Calculer les streaks
            const streaks: { [habitId: string]: number } = {};
            for (const habit of activeHabits) {
                let streak = 0;
                let currentDate = DateTime.fromISO(date);

                while (true) {
                    const dateStr = currentDate.toFormat('yyyy-MM-dd');
                    const log = state.logs.find(
                        l => l.habitId === habit.id && l.date === dateStr && l.completed
                    );

                    if (log) {
                        streak++;
                        currentDate = currentDate.minus({ days: 1 });
                    } else {
                        break;
                    }
                }

                streaks[habit.id] = streak;
            }

            return {
                date,
                completedHabits,
                totalHabits: activeHabits.length,
                completionRate: activeHabits.length ? 
                    (completedHabits / activeHabits.length) * 100 : 0,
                streaks,
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

                // Mettre à jour les stats du jour
                const stats = this.getDayStats(date);
                if (!this.dayStats) this.dayStats = {};
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
                    active: true
                },
                {
                    name: 'Fruits & Légumes',
                    icon: '🥗',
                    category: 'health',
                    target: 5,
                    unit: 'portions',
                    active: true
                },
                {
                    name: 'Sommeil',
                    icon: '😴',
                    category: 'health',
                    target: 8,
                    unit: 'heures',
                    active: true
                },
                {
                    name: 'Musique',
                    icon: '🎵',
                    category: 'personal',
                    active: true
                },
                {
                    name: 'Méditation',
                    icon: '🧘',
                    category: 'lifestyle',
                    target: 10,
                    unit: 'minutes',
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

        setDayMood(date: string, mood: 1 | 2 | 3 | 4 | 5) {
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

        setDayEnergyLevel(date: string, level: 1 | 2 | 3 | 4 | 5) {
            if (!this.dayStats) this.dayStats = {};
            if (!this.dayStats[date]) {
                this.dayStats[date] = {
                    date,
                    completedHabits: 0,
                    totalHabits: 0,
                    completionRate: 0,
                    streaks: {},
                    mood: undefined,
                    energyLevel: level,
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
        }
    }
});