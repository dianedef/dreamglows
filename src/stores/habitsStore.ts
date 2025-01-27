import { defineStore } from 'pinia';
import type { Habit, DailyHabitLog, DayStats } from '@/types/habits';
import { DateTime } from 'luxon';

interface HabitsState {
    habits: Habit[];
    logs: DailyHabitLog[];
    dayStats: { [date: string]: DayStats };
}

export const useHabitsStore = defineStore('habits', {
    state: (): HabitsState => ({
        habits: [],
        logs: [],
        dayStats: {}
    }),

    getters: {
        activeHabits: (state) => state.habits.filter(h => h.active),
        
        getHabitsByCategory: (state) => (category: string) => 
            state.habits.filter(h => h.category === category && h.active),
        
        getDayLogs: (state) => (date: string) => 
            state.logs.filter(log => log.date === date),
        
        getDayStats: (state) => (date: string) => 
            state.dayStats[date] || {
                date,
                completedHabits: 0,
                totalHabits: 0,
                completionRate: 0,
                streaks: {}
            },
        
        getHabitStreak: (state) => (habitId: string) => {
            const today = DateTime.now().toISOString().split('T')[0];
            return state.dayStats[today]?.streaks[habitId] || 0;
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

        toggleHabit(habitId: string, date: string, value?: number) {
            const today = date || DateTime.now().toISOString().split('T')[0];
            const existingLog = this.logs.find(
                log => log.habitId === habitId && log.date === today
            );

            if (existingLog) {
                existingLog.completed = !existingLog.completed;
                if (value !== undefined) existingLog.value = value;
            } else {
                this.logs.push({
                    habitId,
                    date: today,
                    completed: true,
                    value
                });
            }

            this.updateDayStats(today);
        },

        updateDayStats(date: string) {
            const dayLogs = this.getDayLogs(date);
            const activeHabits = this.activeHabits;
            const completedHabits = dayLogs.filter(log => log.completed).length;

            // Calculer les streaks
            const streaks: { [habitId: string]: number } = {};
            for (const habit of activeHabits) {
                let streak = 0;
                let currentDate = DateTime.fromISO(date);

                while (true) {
                    const dateStr = currentDate.toISOString().split('T')[0];
                    const log = this.logs.find(
                        l => l.habitId === habit.id && l.date === dateStr
                    );

                    if (log?.completed) {
                        streak++;
                        currentDate = currentDate.minus({ days: 1 });
                    } else {
                        break;
                    }
                }

                streaks[habit.id] = streak;
            }

            this.dayStats[date] = {
                date,
                completedHabits,
                totalHabits: activeHabits.length,
                completionRate: activeHabits.length ? 
                    (completedHabits / activeHabits.length) * 100 : 0,
                streaks
            };
        },

        setDayMood(date: string, mood: 1 | 2 | 3 | 4 | 5) {
            if (!this.dayStats[date]) {
                this.updateDayStats(date);
            }
            this.dayStats[date].mood = mood;
        },

        setDayEnergyLevel(date: string, level: 1 | 2 | 3 | 4 | 5) {
            if (!this.dayStats[date]) {
                this.updateDayStats(date);
            }
            this.dayStats[date].energyLevel = level;
        },

        setDayNotes(date: string, notes: string) {
            if (!this.dayStats[date]) {
                this.updateDayStats(date);
            }
            this.dayStats[date].notes = notes;
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
        }
    }
}); 