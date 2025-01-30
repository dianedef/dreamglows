import { Goal, Task } from '../types/models';
import { STATUS_EMOJI } from '../constants/emojis';
import { DELIMITERS, SECTIONS } from '../constants/formats';
import { ValidationService } from './ValidationService';
import { DailyMood } from './StorageService';

export class FormatterService {
    private validationService: ValidationService;

    constructor(validationService: ValidationService) {
        this.validationService = validationService;
    }

    /**
     * Formate un goal en texte pour une note
     */
    formatGoal(goal: Goal): string {
        // Valider le goal avant formatage
        this.validationService.validateGoal(goal);

        const fields = [
            `${STATUS_EMOJI[goal.status]} ${goal.title}`,
            goal.id,
            goal.category,
            goal.priority,
            goal.startDate,
            goal.dueDate,
            `${goal.progress}%`,
            goal.description,
            goal.metrics ? `${goal.metrics.current}/${goal.metrics.target} ${goal.metrics.unit}` : '',
            goal.tasks.map(id => `${DELIMITERS.TASK_REF}${id}`).join(','),
            goal.tags.map(tag => `${DELIMITERS.TAG}${tag}`).join(',')
        ];

        return fields.join(DELIMITERS.ITEM);
    }

    /**
     * Formate une tâche en texte pour une note
     */
    formatTask(task: Task): string {
        // Valider la tâche avant formatage
        this.validationService.validateTask(task);

        const fields = [
            `${STATUS_EMOJI[task.status]} ${task.title}`,
            task.id,
            task.goalId || '',
            task.priority,
            task.startDate,
            task.dueDate,
            task.description,
            task.notes,
            task.tags.map(tag => `${DELIMITERS.TAG}${tag}`).join(',')
        ];

        return fields.join(DELIMITERS.ITEM);
    }

    /**
     * Formate une section complète de goals
     */
    formatGoalsSection(goals: Goal[]): string {
        if (goals.length === 0) return '';

        return [
            `${DELIMITERS.SUBSECTION} ${SECTIONS.GOALS}`,
            ...goals.map(goal => this.formatGoal(goal)),
            ''
        ].join('\n');
    }

    /**
     * Formate une section de tâches à commencer
     */
    formatTasksToStartSection(tasks: Task[]): string {
        if (tasks.length === 0) return '';

        return [
            `${DELIMITERS.SUBSECTION} ${SECTIONS.TASKS_START}`,
            ...tasks.map(task => this.formatTask(task)),
            ''
        ].join('\n');
    }

    /**
     * Formate une section de tâches à terminer
     */
    formatTasksToEndSection(tasks: Task[]): string {
        if (tasks.length === 0) return '';

        return [
            `${DELIMITERS.SUBSECTION} ${SECTIONS.TASKS_END}`,
            ...tasks.map(task => this.formatTask(task)),
            ''
        ].join('\n');
    }

    /**
     * Formate une section d'humeur
     */
    formatMoodSection(mood: DailyMood): string {
        return `## 😊 Humeur
- Niveau d'humeur : ${this.formatMoodLevel(mood.mood)}
- Niveau d'énergie : ${this.formatEnergyLevel(mood.energyLevel)}
${mood.notes ? `- Notes : ${mood.notes}` : ''}
- Timestamp : ${mood.timestamp}
`;
    }

    /**
     * Formate une note quotidienne complète
     */
    formatDailyNote(
        date: string,
        goals: Goal[],
        tasksToStart: Task[],
        tasksToEnd: Task[],
        mood?: DailyMood
    ): string {
        let content = `# Journal du ${date}\n\n`;

        // Section humeur si présente
        if (mood) {
            content += this.formatMoodSection(mood);
        }

        // Section objectifs
        if (goals.length > 0) {
            content += this.formatGoalsSection(goals);
        }

        // Section tâches à démarrer
        if (tasksToStart.length > 0) {
            content += this.formatTasksToStartSection(tasksToStart);
        }

        // Section tâches à terminer
        if (tasksToEnd.length > 0) {
            content += this.formatTasksToEndSection(tasksToEnd);
        }

        return content;
    }

    private formatMoodLevel(level: number): string {
        const emojis = ['😢', '😕', '😐', '🙂', '😊'];
        return `${level}/5 ${emojis[level - 1] || ''}`;
    }

    private formatEnergyLevel(level: number): string {
        const emojis = ['🔴', '🟡', '🟡', '🟢', '⚡'];
        return `${level}/5 ${emojis[level - 1] || ''}`;
    }

    /**
     * Formate un goal pour l'affichage dans l'interface
     */
    formatGoalForDisplay(goal: Goal): string {
        return [
            `${STATUS_EMOJI[goal.status]} ${goal.title} (${goal.progress}%)`,
            `📂 ${goal.category}`,
            `🎯 ${goal.priority}`,
            `📅 ${goal.startDate} → ${goal.dueDate}`,
            goal.description ? `📝 ${goal.description}` : null,
            goal.metrics ? `📊 ${goal.metrics.current}/${goal.metrics.target} ${goal.metrics.unit}` : null,
            goal.tasks.length > 0 ? `📋 ${goal.tasks.length} tâches` : null,
            goal.tags.length > 0 ? `🏷️ ${goal.tags.join(', ')}` : null
        ].filter(Boolean).join('\n');
    }

    /**
     * Formate une tâche pour l'affichage dans l'interface
     */
    formatTaskForDisplay(task: Task): string {
        return [
            `${STATUS_EMOJI[task.status]} ${task.title}`,
            task.goalId ? `🎯 Objectif lié` : null,
            `📊 ${task.priority}`,
            `📅 ${task.startDate} → ${task.dueDate}`,
            task.description ? `📝 ${task.description}` : null,
            task.notes ? `📋 ${task.notes}` : null,
            task.tags.length > 0 ? `🏷️ ${task.tags.join(', ')}` : null
        ].filter(Boolean).join('\n');
    }
} 