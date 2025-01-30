import { App, Notice } from 'obsidian';
import type { GoalFlowzSettings } from '../types/settings';
import { DateService } from './DateService';
import { ValidationService } from './ValidationService';
import { StorageService } from './StorageService';
import { DateError, NotesGenerationError, NotesErrorCode } from '../types/errors';
import { DateTime } from 'luxon';
import { ProgressTracker } from '../types/progress';
import { ValidationError } from '../types/errors';
import { DEFAULT_NOTE_TEMPLATE } from '../constants/templates';

export class NotesGeneratorService {
    constructor(
        private app: App,
        private settings: GoalFlowzSettings,
        private dateService: DateService,
        private validationService: ValidationService,
        private storageService: StorageService
    ) {}

    async generateNotes(progress?: ProgressTracker): Promise<void> {
        try {
            // Vérifier si un chemin est défini
            if (!this.settings.notesPath) {
                throw new NotesGenerationError(
                    'Chemin des notes non défini',
                    NotesErrorCode.PATH_NOT_DEFINED
                );
            }

            // Valider le chemin
            this.validatePath(this.settings.notesPath);

            // Créer le dossier principal s'il n'existe pas
            await this.ensureDirectoryExists(this.settings.notesPath);

            // Calculer le nombre total de notes à générer
            const now = this.dateService.today();
            const totalNotes = this.calculateTotalNotes(now);
            progress?.setTotal(totalNotes, 'Préparation de la génération des notes...');

            // Générer les notes pour chaque mois
            for (let month = 0; month < 12; month++) {
                if (progress?.signal.aborted) {
                    throw new NotesGenerationError(
                        'Génération annulée par l\'utilisateur',
                        NotesErrorCode.USER_CANCELLED
                    );
                }

                const monthDate = now.set({ month });
                const monthName = monthDate.setLocale(this.settings.monthLanguage || 'fr')
                    .toFormat('MMMM');
                progress?.increment(`Génération des notes pour ${monthName}...`);
                await this.generateMonthNotes(monthDate, progress);
            }

            new Notice('Notes générées avec succès !');
        } catch (error) {
            console.error('Erreur lors de la génération des notes:', error);
            if (error instanceof NotesGenerationError) {
                new Notice(`Erreur : ${error.message} (${error.code})`);
                console.error('Détails:', error.details);
            } else if (error instanceof DateError) {
                new Notice(`Erreur de date : ${error.message}`);
            } else {
                new Notice('Erreur inattendue lors de la génération des notes.');
            }
        }
    }

    private calculateTotalNotes(date: DateTime): number {
        let total = 0;
        for (let month = 0; month < 12; month++) {
            const monthDate = date.set({ month });
            total += monthDate.daysInMonth || 0;
        }
        return total;
    }

    private validatePath(path: string): boolean {
        // Éviter les caractères spéciaux dangereux
        const invalidChars = /[<>:"|?*]/g;
        if (invalidChars.test(path)) {
            throw new NotesGenerationError(
                'Le chemin contient des caractères non autorisés',
                NotesErrorCode.PATH_INVALID,
                { path, invalidChars: path.match(invalidChars) }
            );
        }
        
        // Éviter les chemins trop longs
        if (path.length > 255) {
            throw new NotesGenerationError(
                'Le chemin est trop long',
                NotesErrorCode.PATH_TOO_LONG,
                { path, length: path.length }
            );
        }
        
        return true;
    }

    private async ensureDirectoryExists(path: string): Promise<void> {
        try {
            if (!await this.app.vault.adapter.exists(path)) {
                await this.app.vault.createFolder(path);
            }
        } catch (error) {
            throw new NotesGenerationError(
                `Impossible de créer le dossier : ${path}`,
                NotesErrorCode.FOLDER_CREATION_FAILED,
                { path, originalError: error }
            );
        }
    }

    private async generateMonthNotes(monthDate: DateTime, progress?: ProgressTracker): Promise<void> {
        try {
            let monthName = monthDate.setLocale(this.settings.monthLanguage || 'fr').toFormat('MMMM');
            if (this.settings.monthLanguage !== 'en') {
                monthName = monthName.toLowerCase();
            }
            const monthNumber = monthDate.toFormat('MM');
            const daysInMonth = monthDate.daysInMonth || 0;
            const dateStr = monthDate.toISO() || monthDate.toFormat('yyyy-MM-dd');

            if (daysInMonth === 0) {
                throw new NotesGenerationError(
                    'Nombre de jours dans le mois invalide',
                    NotesErrorCode.INVALID_DATE,
                    { date: dateStr }
                );
            }

            let basePath = this.settings.notesPath;
            if (this.settings.folderStructure === 'monthly') {
                basePath = `${this.settings.notesPath}/${monthNumber}_${monthName}`;
                await this.ensureDirectoryExists(basePath);
            }

            // Générer les notes pour chaque jour du mois
            for (let day = 1; day <= daysInMonth; day++) {
                if (progress?.signal.aborted) {
                    throw new NotesGenerationError(
                        'Génération annulée par l\'utilisateur',
                        NotesErrorCode.USER_CANCELLED
                    );
                }

                const dayDate = monthDate.set({ day });
                await this.generateDayNote(dayDate, basePath);
                progress?.increment(`Génération de la note du ${day} ${monthName}...`);
            }
        } catch (error) {
            if (error instanceof NotesGenerationError) {
                throw error;
            }
            throw new NotesGenerationError(
                `Erreur lors de la génération des notes pour ${monthDate.toFormat('MMMM')}`,
                NotesErrorCode.FILE_CREATION_FAILED,
                { month: monthDate.toFormat('MM'), error }
            );
        }
    }

    private async generateDayNote(date: DateTime, basePath: string): Promise<void> {
        try {
            const fileName = this.formatNoteFileName(date);
            const filePath = `${basePath}/${fileName}.md`;

            if (await this.fileExists(filePath)) {
                throw new NotesGenerationError(
                    `La note existe déjà : ${fileName}`,
                    NotesErrorCode.FILE_ALREADY_EXISTS,
                    { path: filePath }
                );
            }

            const content = this.generateNoteContent(date);
            
            // Valider le contenu avant la création
            try {
                this.validationService.validateNoteContent(content);
                this.validationService.validateLatexAndCode(content);
            } catch (error) {
                if (error instanceof ValidationError) {
                    throw new NotesGenerationError(
                        `Validation échouée : ${error.message}`,
                        NotesErrorCode.TEMPLATE_ERROR,
                        { details: error.details }
                    );
                }
                throw error;
            }

            await this.createNote(filePath, content);
        } catch (error) {
            if (error instanceof NotesGenerationError) {
                throw error;
            }
            throw new NotesGenerationError(
                `Erreur lors de la création de la note pour ${date.toFormat('dd/MM')}`,
                NotesErrorCode.FILE_CREATION_FAILED,
                { date: date.toISO(), error }
            );
        }
    }

    private formatNoteFileName(date: DateTime): string {
        const day = date.day;
        let monthName = date.setLocale(this.settings.monthLanguage || 'fr').toFormat('MMMM');
        // En français, pas de majuscule pour les mois
        if (this.settings.monthLanguage !== 'en') {
            monthName = monthName.toLowerCase();
        }
        const suffix = this.settings.monthLanguage === 'en' ? 
            (day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th') : 
            (day === 1 ? 'er' : '');
        return `📓 ${day}${suffix} ${monthName}`;
    }

    private generateNoteContent(date: DateTime): string {
        const localizedDate = date.setLocale(this.settings.monthLanguage || 'fr');
        let monthName = localizedDate.toFormat('MMMM');
        if (this.settings.monthLanguage !== 'en') {
            monthName = monthName.toLowerCase();
        }
        const suffix = this.settings.monthLanguage === 'en' ? 
            (date.day === 1 ? 'st' : date.day === 2 ? 'nd' : date.day === 3 ? 'rd' : 'th') : 
            (date.day === 1 ? 'er' : '');
            
        return DEFAULT_NOTE_TEMPLATE
            .replace('{day}', date.day.toString())
            .replace('{suffix}', suffix)
            .replace('{month}', monthName)
            .replace('{MM}', localizedDate.toFormat('MM'))
            .replace('{DD}', localizedDate.toFormat('dd'));
    }

    private async fileExists(path: string): Promise<boolean> {
        return await this.app.vault.adapter.exists(path);
    }

    private async createNote(path: string, content: string): Promise<void> {
        await this.app.vault.create(path, content);
    }
} 