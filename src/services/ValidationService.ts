import { z } from 'zod';
import { DateService } from './DateService';
import { ValidationError, ConsistencyError } from '../types/errors';
import {
    Goal, Task, DataStore,
    GoalSchema, TaskSchema, DataStoreSchema,
    MetricsSchema, EventSchema, DayStatsSchema,
    CategoryStatsSchema, PeriodStatsSchema
} from '../types/models';

export class ValidationService {
    constructor(private dateService: DateService) {}

    /**
     * Valide un objectif
     */
    validateGoal(goal: unknown): Goal {
        try {
            const validatedGoal = GoalSchema.parse(goal);
            this.validateDates(validatedGoal.startDate, validatedGoal.dueDate);
            if (validatedGoal.metrics) {
                MetricsSchema.parse(validatedGoal.metrics);
            }
            return validatedGoal;
        } catch (error) {
            if (error instanceof z.ZodError) {
                throw new ValidationError(
                    'Validation du goal échouée',
                    error.errors.map(e => e.message).join(', ')
                );
            }
            throw error;
        }
    }

    /**
     * Valide une tâche
     */
    validateTask(task: unknown): Task {
        try {
            const validatedTask = TaskSchema.parse(task);
            this.validateDates(validatedTask.startDate, validatedTask.dueDate);
            this.validateDates(validatedTask.createdAt, validatedTask.updatedAt);
            return validatedTask;
        } catch (error) {
            if (error instanceof z.ZodError) {
                throw new ValidationError(
                    'Validation de la tâche échouée',
                    error.errors.map(e => e.message).join(', ')
                );
            }
            throw error;
        }
    }

    /**
     * Valide une liste d'objectifs
     */
    validateGoalsList(goals: unknown[]): Goal[] {
        try {
            const validatedGoals = z.array(GoalSchema).parse(goals);
            
            // Vérifier les relations entre objectifs
            const goalIds = new Set(validatedGoals.map(g => g.id));
            for (const goal of validatedGoals) {
                for (const subGoalId of goal.subGoalIds) {
                    if (!goalIds.has(subGoalId)) {
                        throw new ConsistencyError(
                            'Référence à un sous-objectif inexistant',
                            subGoalId
                        );
                    }
                }
            }

            return validatedGoals;
        } catch (error) {
            if (error instanceof z.ZodError) {
                throw new ValidationError(
                    'Validation de la liste des goals échouée',
                    error.errors.map(e => e.message).join(', ')
                );
            }
            throw error;
        }
    }

    /**
     * Valide une liste de tâches
     */
    validateTasksList(tasks: unknown[]): Task[] {
        try {
            const validatedTasks = z.array(TaskSchema).parse(tasks);
            
            // Vérifier les dates de création/mise à jour
            for (const task of validatedTasks) {
                this.validateDates(task.createdAt, task.updatedAt);
            }

            return validatedTasks;
        } catch (error) {
            if (error instanceof z.ZodError) {
                throw new ValidationError(
                    'Validation de la liste des tâches échouée',
                    error.errors.map(e => e.message).join(', ')
                );
            }
            throw error;
        }
    }

    /**
     * Valide la cohérence entre une tâche et son objectif
     */
    validateTaskGoalConsistency(task: Task, goal: Goal): void {
        if (!task.goalId || task.goalId !== goal.id) {
            throw new ConsistencyError(
                'La tâche n\'est pas liée à l\'objectif',
                task.id
            );
        }

        // Vérifier les dates
        if (!this.dateService.isInRange(task.startDate, goal.startDate, goal.dueDate)) {
            throw new ConsistencyError(
                'La date de début de la tâche est en dehors de la période de l\'objectif',
                task.id
            );
        }

        if (!this.dateService.isInRange(task.dueDate, goal.startDate, goal.dueDate)) {
            throw new ConsistencyError(
                'La date de fin de la tâche est en dehors de la période de l\'objectif',
                task.id
            );
        }
    }

    /**
     * Valide le store de données complet
     */
    validateDataStore(data: unknown): DataStore {
        try {
            const validatedStore = DataStoreSchema.parse(data);
            
            // Vérifier la cohérence entre les tâches et les objectifs
            const goalIds = new Set(validatedStore.goals.map(g => g.id));
            for (const task of validatedStore.tasks) {
                if (task.goalId && !goalIds.has(task.goalId)) {
                    throw new ConsistencyError(
                        'Référence à un objectif inexistant',
                        task.goalId
                    );
                }
            }

            // Vérifier que les IDs des tâches dans les objectifs existent
            const taskIds = new Set(validatedStore.tasks.map(t => t.id));
            for (const goal of validatedStore.goals) {
                for (const taskId of goal.tasks) {
                    if (!taskIds.has(taskId)) {
                        throw new ConsistencyError(
                            'Référence à une tâche inexistante',
                            taskId
                        );
                    }
                }
            }

            return validatedStore;
        } catch (error) {
            if (error instanceof z.ZodError) {
                throw new ValidationError(
                    'Validation du store échouée',
                    error.errors.map(e => e.message).join(', ')
                );
            }
            throw error;
        }
    }

    /**
     * Valide les dates
     */
    private validateDates(startDate: string, endDate: string): void {
        if (!this.dateService.validateDate(startDate)) {
            throw new ValidationError(
                'Date invalide',
                `Format de date invalide : ${startDate}`
            );
        }

        if (!this.dateService.validateDate(endDate)) {
            throw new ValidationError(
                'Date invalide',
                `Format de date invalide : ${endDate}`
            );
        }

        if (this.dateService.compare(startDate, endDate) > 0) {
            throw new ValidationError(
                'Dates incohérentes',
                'La date de début doit être antérieure ou égale à la date de fin'
            );
        }
    }

    validateNoteContent(content: string): void {
        // Vérifier la présence des sections requises
        const requiredSections = ['## 🎯 Objectifs du jour', '## 📝 Notes', '## 📊 Bilan de la journée'];
        for (const section of requiredSections) {
            if (!content.includes(section)) {
                throw new ValidationError(
                    'Structure de note invalide',
                    `La section "${section}" est manquante`
                );
            }
        }

        // Vérifier les caractères interdits dans les titres
        const lines = content.split('\n');
        const titleLines = lines.filter(line => line.startsWith('#'));
        const forbiddenChars = /[<>:"|?*]/;
        
        for (const title of titleLines) {
            if (forbiddenChars.test(title)) {
                throw new ValidationError(
                    'Caractères invalides dans le titre',
                    `Le titre "${title}" contient des caractères non autorisés`
                );
            }
        }

        // Vérifier le format des tags
        const tagRegex = /#[a-zA-Z0-9-]+/g;
        const tags = content.match(/#[^\s#]+/g) || [];
        for (const tag of tags) {
            if (!tagRegex.test(tag)) {
                throw new ValidationError(
                    'Format de tag invalide',
                    `Le tag "${tag}" ne respecte pas le format #tag-name`
                );
            }
        }
    }

    validateLatexAndCode(content: string): void {
        // Détecter le LaTeX inline
        if (content.includes('$')) {
            throw new ValidationError(
                'LaTeX non supporté',
                'Le LaTeX inline ($...$) n\'est pas supporté pour éviter les conflits de parsing'
            );
        }

        // Détecter les blocs de code
        if (content.includes('```')) {
            throw new ValidationError(
                'Blocs de code non supportés',
                'Les blocs de code ne sont pas supportés pour éviter les conflits de parsing'
            );
        }
    }
} 