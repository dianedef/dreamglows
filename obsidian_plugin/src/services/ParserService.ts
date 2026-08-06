import { Goal, Task, DailyNote } from '../types/models';
import { EMOJI_STATUS } from '../constants/emojis';
import { DELIMITERS, SECTIONS, MIN_FIELDS, FIELD_INDEX } from '../constants/formats';
import { ValidationService } from './ValidationService';
import { ParsingError } from '../types/errors';
import { DateService } from './DateService';
import { DailyMood } from './StorageService';

export class ParserService {
    private validationService: ValidationService;
    private dateService: DateService;
    private language: 'fr' | 'en';

    constructor(validationService: ValidationService, dateService: DateService, language: 'fr' | 'en' = 'fr') {
        this.validationService = validationService;
        this.dateService = dateService;
        this.language = language;
    }

    /**
     * Parse une ligne de goal en objet
     */
    parseGoal(line: string): Goal {
        try {
            const fields = line.split(DELIMITERS.ITEM);
            if (fields.length < MIN_FIELDS.GOAL) {
                throw new ParsingError('Nombre de champs insuffisant pour un goal', line);
            }

            // Parse le statut et le titre
            const titleStatusField = fields[FIELD_INDEX.TITLE_AND_STATUS];
            const statusEmoji = Object.keys(EMOJI_STATUS).find(emoji => titleStatusField.includes(emoji));
            if (!statusEmoji) {
                throw new ParsingError('Statut invalide', titleStatusField);
            }

            const title = titleStatusField.replace(statusEmoji, '').trim();
            const status = EMOJI_STATUS[statusEmoji];

            // Parse les métriques
            const metricsField = fields[FIELD_INDEX.METRICS_OR_TAGS];
            let metrics = undefined;
            if (metricsField) {
                const metricsMatch = metricsField.match(/(\d+)\/(\d+)\s+(.*)/);
                if (metricsMatch) {
                    metrics = {
                        current: parseInt(metricsMatch[1]),
                        target: parseInt(metricsMatch[2]),
                        unit: metricsMatch[3].trim()
                    };
                }
            }

            // Parse les tâches et tags
            const tasks = (fields[FIELD_INDEX.TASKS].match(new RegExp(`${DELIMITERS.TASK_REF}([^,\\s]+)`, 'g')) || [])
                .map(id => id.replace(DELIMITERS.TASK_REF, ''));

            const tags = (fields[FIELD_INDEX.TAGS].match(new RegExp(`${DELIMITERS.TAG}([^,\\s]+)`, 'g')) || [])
                .map(tag => tag.replace(DELIMITERS.TAG, ''));

            // Construire et valider l'objet
            const goal: Goal = {
                id: fields[FIELD_INDEX.ID].trim(),
                title,
                status,
                category: fields[FIELD_INDEX.CATEGORY_OR_GOAL_ID].trim(),
                priority: fields[FIELD_INDEX.PRIORITY].trim() as any,
                startDate: fields[FIELD_INDEX.START_DATE].trim(),
                dueDate: fields[FIELD_INDEX.DUE_DATE].trim(),
                progress: parseInt(fields[FIELD_INDEX.PROGRESS_OR_DESCRIPTION]) || 0,
                description: fields[FIELD_INDEX.DESCRIPTION_OR_NOTES].trim(),
                metrics,
                tasks,
                tags,
                subGoalIds: [] // À implémenter si nécessaire
            };

            return this.validationService.validateGoal(goal);
        } catch (error) {
            if (error instanceof ParsingError) throw error;
            throw new ParsingError('Erreur lors du parsing du goal', line);
        }
    }

    /**
     * Parse une ligne de tâche en objet
     */
    parseTask(line: string): Task {
        try {
            const fields = line.split(DELIMITERS.ITEM);
            if (fields.length < MIN_FIELDS.TASK) {
                throw new ParsingError('Nombre de champs insuffisant pour une tâche', line);
            }

            // Parse le statut et le titre
            const titleStatusField = fields[FIELD_INDEX.TITLE_AND_STATUS];
            const statusEmoji = Object.keys(EMOJI_STATUS).find(emoji => titleStatusField.includes(emoji));
            if (!statusEmoji) {
                throw new ParsingError('Statut invalide', titleStatusField);
            }

            const title = titleStatusField.replace(statusEmoji, '').trim();
            const status = EMOJI_STATUS[statusEmoji];

            // Parse les tags
            const tags = (fields[FIELD_INDEX.METRICS_OR_TAGS].match(new RegExp(`${DELIMITERS.TAG}([^,\\s]+)`, 'g')) || [])
                .map(tag => tag.replace(DELIMITERS.TAG, ''));

            // Construire et valider l'objet
            const task: Task = {
                id: fields[FIELD_INDEX.ID].trim(),
                title,
                status,
                goalId: fields[FIELD_INDEX.CATEGORY_OR_GOAL_ID].trim() || undefined,
                priority: fields[FIELD_INDEX.PRIORITY].trim() as any,
                startDate: fields[FIELD_INDEX.START_DATE].trim(),
                dueDate: fields[FIELD_INDEX.DUE_DATE].trim(),
                description: fields[FIELD_INDEX.PROGRESS_OR_DESCRIPTION].trim(),
                notes: fields[FIELD_INDEX.DESCRIPTION_OR_NOTES].trim(),
                tags,
                createdAt: this.dateService.getTodayISO(),
                updatedAt: this.dateService.getTodayISO()
            };

            return this.validationService.validateTask(task);
        } catch (error) {
            if (error instanceof ParsingError) throw error;
            throw new ParsingError('Erreur lors du parsing de la tâche', line);
        }
    }

    /**
     * Parse une section d'humeur
     */
    parseMoodSection(content: string): DailyMood | null {
        const moodSectionRegex = /## 😊 Humeur\n([\s\S]*?)(?=##|$)/;
        const match = content.match(moodSectionRegex);
        
        if (!match) return null;

        const section = match[1];
        const moodMatch = section.match(/Niveau d'humeur : (\d+)\/5/);
        const energyMatch = section.match(/Niveau d'énergie : (\d+)\/5/);
        const notesMatch = section.match(/Notes : (.*)/);
        const timestampMatch = section.match(/Timestamp : (.*)/);

        if (!moodMatch || !energyMatch || !timestampMatch) {
            throw new ParsingError('Format de section d\'humeur invalide');
        }

        return {
            mood: parseInt(moodMatch[1]),
            energyLevel: parseInt(energyMatch[1]),
            notes: notesMatch ? notesMatch[1] : undefined,
            timestamp: timestampMatch[1]
        };
    }

    /**
     * Parse une note quotidienne complète
     */
    parseDailyNote(content: string, date: string): DailyNote & { mood?: DailyMood } {
        const sections = this.parseSections(content);
        return {
            date,
            goals: sections.goals,
            diary: sections.diary,
            review: sections.review
        };
    }

    /**
     * Parse les différentes sections d'une note
     */
    private parseSections(content: string): { goals: string[], diary: string[], review: string[] } {
        const sections = {
            goals: [] as string[],
            diary: [] as string[],
            review: [] as string[]
        };

        const currentSections = this.language === 'fr' ? SECTIONS.FR : SECTIONS.EN;

        // Parser les objectifs atteints
        const goalsMatch = content.match(new RegExp(`${DELIMITERS.SECTION} ${currentSections.GOALS}\\n([\\s\\S]*?)(?=${DELIMITERS.SECTION}|$)`));
        if (goalsMatch) {
            sections.goals = goalsMatch[1].trim().split('\n').filter(Boolean);
        }

        // Parser le journal/diary
        const diaryMatch = content.match(new RegExp(`${DELIMITERS.SECTION} ${currentSections.DIARY}\\n([\\s\\S]*?)(?=${DELIMITERS.SECTION}|$)`));
        if (diaryMatch) {
            sections.diary = diaryMatch[1].trim().split('\n').filter(Boolean);
        }

        // Parser le bilan/review
        const reviewMatch = content.match(new RegExp(`${DELIMITERS.SECTION} ${currentSections.REVIEW}\\n([\\s\\S]*?)(?=${DELIMITERS.SECTION}|$)`));
        if (reviewMatch) {
            sections.review = reviewMatch[1].trim().split('\n').filter(Boolean);
        }

        return sections;
    }
} 