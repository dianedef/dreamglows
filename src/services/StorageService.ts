import { App, TFile, Notice } from 'obsidian';
import { Goal, Task, DataStore } from '../types/models';
import { StorageError } from '../types/errors';
import { DateService } from './DateService';
import { ValidationService } from './ValidationService';
import { FormatterService } from './FormatterService';
import { ParserService } from './ParserService';
import { EventService } from './EventService';
import { DateTime } from 'luxon';

export interface DailyMood {
    mood: number;  // 1-5
    energyLevel: number;  // 1-5
    notes?: string;
    timestamp: string;
}

export class StorageService {
    private app: App;
    private dataFile: string = '.obsidian/plugins/obs-GoalFlowz/data.json';
    private dateService: DateService;
    private validationService: ValidationService;
    private formatterService: FormatterService;
    private parserService: ParserService;
    private eventService: EventService;

    constructor(
        app: App,
        dateService: DateService,
        validationService: ValidationService,
        formatterService: FormatterService,
        parserService: ParserService,
        eventService: EventService
    ) {
        this.app = app;
        this.dateService = dateService;
        this.validationService = validationService;
        this.formatterService = formatterService;
        this.parserService = parserService;
        this.eventService = eventService;

        // Initialiser les données
        this.initializeData();
    }

    /**
     * Initialise les données depuis le stockage
     */
    private async initializeData(): Promise<void> {
        try {
            const now = new Date();
            const startDate = new Date(now.getFullYear() - 1, 0, 1);
            const data = await this.loadDataForRange(startDate, now);
            
            this.eventService.emit('data:synced', {
                goals: data.goals,
                tasks: data.tasks,
                moods: data.moods.reduce((acc, mood) => ({
                    ...acc,
                    [mood.timestamp.split('T')[0]]: mood
                }), {})
            });
        } catch (error) {
            console.error('Erreur lors de l\'initialisation des données:', error);
        }
    }

    /**
     * Récupère une note quotidienne
     */
    private async getDailyNote(date: string): Promise<TFile | null> {
        const files = await this.app.vault.getFiles();
        return files.find(file => 
            file.path === `${this.dateService.getNotesDirectory()}/${date}.md`
        ) || null;
    }

    /**
     * Sauvegarde l'humeur et le niveau d'énergie pour une journée
     */
    async saveDailyMood(date: string, mood: DailyMood): Promise<void> {
        const dailyNote = await this.getDailyNote(date);
        const content = dailyNote ? await this.app.vault.read(dailyNote) : '';

        // Formatter la section d'humeur
        const moodSection = this.formatterService.formatMoodSection(mood);

        if (dailyNote) {
            // Mettre à jour la section d'humeur existante ou l'ajouter
            const updatedContent = this.updateOrAddMoodSection(content, moodSection);
            await this.app.vault.modify(dailyNote, updatedContent);
        } else {
            // Créer une nouvelle note avec la section d'humeur
            const newContent = this.formatterService.formatDailyNote(date, [], [], [], mood);
            const notePath = `${this.dateService.getNotesDirectory()}/${date}.md`;
            await this.app.vault.create(notePath, newContent);
        }

        // Émettre l'événement de mise à jour
        this.eventService.updateMood(date, mood);
    }

    /**
     * Récupère l'humeur et le niveau d'énergie pour une journée
     */
    async getDailyMood(date: string): Promise<DailyMood | null> {
        const dailyNote = await this.getDailyNote(date);
        if (!dailyNote) return null;

        const content = await this.app.vault.read(dailyNote);
        return this.parserService.parseMoodSection(content);
    }

    /**
     * Charge les données pour une période donnée, incluant l'humeur et l'énergie
     */
    async loadDataForRange(start: Date, end: Date): Promise<DataStore & { moods: DailyMood[] }> {
        const data = {
            goals: [] as Goal[],
            tasks: [] as Task[],
            moods: [] as DailyMood[]
        };

        let current = DateTime.fromJSDate(start);
        const endDt = DateTime.fromJSDate(end);

        while (current <= endDt) {
            const dateStr = current.toFormat('yyyy-MM-dd');
            const dailyNote = await this.getDailyNote(dateStr);
            
            if (dailyNote) {
                const content = await this.app.vault.read(dailyNote);
                const parsed = this.parserService.parseDailyNote(content, dateStr);
                data.goals.push(...parsed.goals);
                data.tasks.push(...parsed.tasksToStart, ...parsed.tasksToEnd);
                
                if (parsed.mood) {
                    data.moods.push(parsed.mood);
                }
            }

            current = current.plus({ days: 1 });
        }

        return data;
    }

    /**
     * Met à jour ou ajoute la section d'humeur dans le contenu
     */
    private updateOrAddMoodSection(content: string, moodSection: string): string {
        const moodSectionRegex = /## 😊 Humeur[\s\S]*?(?=##|$)/;
        
        if (moodSectionRegex.test(content)) {
            // Remplacer la section existante
            return content.replace(moodSectionRegex, moodSection);
        } else {
            // Ajouter la nouvelle section après l'en-tête
            const headerRegex = /^# .*\n/;
            if (headerRegex.test(content)) {
                return content.replace(headerRegex, `$&\n${moodSection}`);
            } else {
                return `${content}\n${moodSection}`;
            }
        }
    }

    /**
     * Sauvegarde un goal
     */
    async saveGoal(goal: Goal): Promise<void> {
        try {
            // Valider le goal
            this.validationService.validateGoal(goal);

            // Sauvegarder dans la note de sa dueDate
            if (goal.dueDate) {
                const dateStr = DateTime.fromISO(goal.dueDate).toFormat('yyyy-MM-dd');
                const dailyNote = await this.getDailyNote(dateStr);
                const content = dailyNote ? await this.app.vault.read(dailyNote) : '';

                if (dailyNote) {
                    // Mettre à jour la note existante
                    const parsed = this.parserService.parseDailyNote(content, dateStr);
                    const updatedGoals = parsed.goals.filter(g => g.id !== goal.id);
                    updatedGoals.push(goal);
                    
                    const newContent = this.formatterService.formatDailyNote(
                        dateStr,
                        updatedGoals,
                        parsed.tasksToStart,
                        parsed.tasksToEnd,
                        parsed.mood
                    );
                    await this.app.vault.modify(dailyNote, newContent);
                } else {
                    // Créer une nouvelle note
                    const newContent = this.formatterService.formatDailyNote(dateStr, [goal], [], []);
                    const notePath = `${this.dateService.getNotesDirectory()}/${dateStr}.md`;
                    await this.app.vault.create(notePath, newContent);
                }
            }

            // Sauvegarder dans data.json
            const data = await this.loadFromDataJson();
            const index = data.goals.findIndex(g => g.id === goal.id);
            if (index >= 0) {
                data.goals[index] = goal;
            } else {
                data.goals.push(goal);
            }
            await this.saveToDataJson(data);

            // Émettre l'événement approprié
            const eventType = index >= 0 ? 'goal:updated' : 'goal:created';
            this.eventService.emit(eventType, goal);

        } catch (error) {
            throw new StorageError('Erreur lors de la sauvegarde du goal', error as Error);
        }
    }

    /**
     * Sauvegarde une tâche
     */
    async saveTask(task: Task): Promise<void> {
        try {
            // Valider la tâche
            this.validationService.validateTask(task);

            // Sauvegarder dans la note de startDate
            if (task.startDate) {
                const dateStr = DateTime.fromISO(task.startDate).toFormat('yyyy-MM-dd');
                const dailyNote = await this.getDailyNote(dateStr);
                const content = dailyNote ? await this.app.vault.read(dailyNote) : '';

                if (dailyNote) {
                    // Mettre à jour la note existante
                    const parsed = this.parserService.parseDailyNote(content, dateStr);
                    const updatedTasksToStart = parsed.tasksToStart.filter(t => t.id !== task.id);
                    updatedTasksToStart.push(task);
                    
                    const newContent = this.formatterService.formatDailyNote(
                        dateStr,
                        parsed.goals,
                        updatedTasksToStart,
                        parsed.tasksToEnd,
                        parsed.mood
                    );
                    await this.app.vault.modify(dailyNote, newContent);
                } else {
                    // Créer une nouvelle note
                    const newContent = this.formatterService.formatDailyNote(dateStr, [], [task], []);
                    const notePath = `${this.dateService.getNotesDirectory()}/${dateStr}.md`;
                    await this.app.vault.create(notePath, newContent);
                }
            }

            // Sauvegarder dans la note de dueDate
            if (task.dueDate) {
                const dateStr = DateTime.fromISO(task.dueDate).toFormat('yyyy-MM-dd');
                const dailyNote = await this.getDailyNote(dateStr);
                const content = dailyNote ? await this.app.vault.read(dailyNote) : '';

                if (dailyNote) {
                    // Mettre à jour la note existante
                    const parsed = this.parserService.parseDailyNote(content, dateStr);
                    const updatedTasksToEnd = parsed.tasksToEnd.filter(t => t.id !== task.id);
                    updatedTasksToEnd.push(task);
                    
                    const newContent = this.formatterService.formatDailyNote(
                        dateStr,
                        parsed.goals,
                        parsed.tasksToStart,
                        updatedTasksToEnd,
                        parsed.mood
                    );
                    await this.app.vault.modify(dailyNote, newContent);
                } else {
                    // Créer une nouvelle note
                    const newContent = this.formatterService.formatDailyNote(dateStr, [], [], [task]);
                    const notePath = `${this.dateService.getNotesDirectory()}/${dateStr}.md`;
                    await this.app.vault.create(notePath, newContent);
                }
            }

            // Sauvegarder dans data.json
            const data = await this.loadFromDataJson();
            const index = data.tasks.findIndex(t => t.id === task.id);
            if (index >= 0) {
                data.tasks[index] = task;
            } else {
                data.tasks.push(task);
            }
            await this.saveToDataJson(data);

            // Émettre l'événement approprié
            const eventType = index >= 0 ? 'task:updated' : 'task:created';
            this.eventService.emit(eventType, task);

        } catch (error) {
            throw new StorageError('Erreur lors de la sauvegarde de la tâche', error as Error);
        }
    }

    /**
     * Charge les données depuis data.json
     */
    private async loadFromDataJson(): Promise<DataStore> {
        try {
            const exists = await this.app.vault.adapter.exists(this.dataFile);
            if (!exists) {
                return { goals: [], tasks: [] };
            }
            const content = await this.app.vault.adapter.read(this.dataFile);
            const data = JSON.parse(content);
            return {
                goals: this.validationService.validateGoalsList(data.goals),
                tasks: this.validationService.validateTasksList(data.tasks)
            };
        } catch (error) {
            throw new StorageError('Erreur lors de la lecture de data.json', error as Error);
        }
    }

    /**
     * Sauvegarde les données dans data.json
     */
    private async saveToDataJson(data: DataStore): Promise<void> {
        try {
            await this.app.vault.adapter.write(
                this.dataFile,
                JSON.stringify(data, null, 2)
            );
        } catch (error) {
            throw new StorageError('Erreur lors de la sauvegarde dans data.json', error as Error);
        }
    }
} 