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
            const today = DateTime.now().toFormat('yyyy-MM-dd');
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

        async toggleHabit(habitId: string, date: string, value?: number, app?: any) {
            const today = date || DateTime.now().toFormat('yyyy-MM-dd');
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

            // Synchroniser avec la note journalière si app est fourni
            if (app) {
                await this.syncWithDailyNote(today, app);
            }
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
                    const dateStr = currentDate.toFormat('yyyy-MM-dd');
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
                streaks,
                mood: this.dayStats[date]?.mood,
                energyLevel: this.dayStats[date]?.energyLevel,
                notes: this.dayStats[date]?.notes
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
        },

        async syncWithDailyNote(date: string, app: any) {
            try {
                const settings = app.plugins.plugins.goalflowz.settings;
                const formattedDate = DateTime.fromISO(date);
                
                // Construire le chemin de la note en fonction de la structure
                let notePath = settings.notesPath;
                if (settings.folderStructure === 'monthly') {
                    const monthName = formattedDate.setLocale(settings.monthLanguage).toFormat('MMMM');
                    notePath = `${notePath}/${monthName}`;
                }

                // Construire le nom du fichier selon le format choisi
                let fileName;
                if (settings.notesFormat === 'custom' && settings.customNotesFormat) {
                    fileName = formattedDate.toFormat(settings.customNotesFormat);
                } else {
                    const day = formattedDate.day;
                    const monthName = formattedDate.setLocale(settings.monthLanguage).toFormat('MMMM');
                    fileName = `📓 ${day}${day === 1 ? 'er' : ''} ${monthName}`;
                }

                const filePath = `${notePath}/${fileName}.md`;
                
                // Récupérer ou créer la note du jour
                let dailyNote = app.vault.getAbstractFileByPath(filePath);
                if (!dailyNote) {
                    // Si la note n'existe pas, on la crée avec le template
                    const template = settings.noteTemplate
                        .replace('{day}', formattedDate.day.toString())
                        .replace('{suffix}', formattedDate.day === 1 ? 'er' : '')
                        .replace('{month}', formattedDate.setLocale(settings.monthLanguage).toFormat('MMMM'))
                        .replace('{MM}', formattedDate.toFormat('MM'))
                        .replace('{DD}', formattedDate.toFormat('dd'));
                    
                    dailyNote = await app.vault.create(filePath, template);
                }

                // Lire le contenu actuel
                let content = await app.vault.read(dailyNote);

                // Préparer le contenu des habitudes
                const dayLogs = this.getDayLogs(date);
                const stats = this.getDayStats(date);
                
                const habitsContent = `
## Habitudes du jour
- Taux de complétion : ${stats.completionRate.toFixed(0)}%
${this.activeHabits.map(habit => {
    const log = dayLogs.find(l => l.habitId === habit.id);
    const status = log?.completed ? '✅' : '⭕';
    const value = log?.value ? ` (${log.value}${habit.unit || ''})` : '';
    const streak = stats.streaks[habit.id] ? ` 🔥 ${stats.streaks[habit.id]} jours` : '';
    return `- ${status} ${habit.icon} ${habit.name}${value}${streak}`;
}).join('\n')}

${stats.mood ? `Humeur : ${['😢', '😕', '😐', '😊', '😄'][stats.mood - 1]}` : ''}
${stats.energyLevel ? `Énergie : ${'🔋'.repeat(stats.energyLevel)}` : ''}

${stats.notes ? `Notes : ${stats.notes}` : ''}
`;

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
        }
    }
}); 