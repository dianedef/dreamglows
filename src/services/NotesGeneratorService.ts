import { App, Notice } from 'obsidian';
import type { GoalFlowzSettings } from '../types/settings';
import { DateService } from './DateService';
import { ValidationService } from './ValidationService';
import { StorageService } from './StorageService';
import { DateError, NotesGenerationError, NotesErrorCode } from '../types/errors';
import { DateTime } from 'luxon';
import { ProgressTracker } from '../types/progress';
import { ValidationError } from '../types/errors';
import { getDefaultTemplate } from '../constants/templates';
import { GoalFlowzSettingsTab } from './SettingsTabService';

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
            // Fermer la modale des paramètres si elle est ouverte
            this.app.workspace.iterateAllLeaves(leaf => {
                if (leaf.getViewState().type === 'plugin-settings') {
                    leaf.detach();
                }
            });

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

            const now = this.dateService.today();
            const totalNotes = this.calculateTotalNotes(now);
            progress?.setTotal(totalNotes, 'Préparation de la génération des notes...');

            // Créer d'abord tous les dossiers mensuels si nécessaire
            if (this.settings.folderStructure === 'monthly') {
                for (let month = 0; month < 12; month++) {
                    const monthDate = now.set({ month });
                    const monthName = monthDate.setLocale(this.settings.monthLanguage || 'fr')
                        .toFormat('MMMM').toLowerCase();
                    const monthNumber = monthDate.toFormat('MM');
                    const monthPath = `${this.settings.notesPath}/${monthNumber}_${monthName}`;
                    await this.ensureDirectoryExists(monthPath);
                }
            }

            // Ensuite générer les notes pour chaque mois
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

            // Message de succès dans le progress tracker
            progress?.increment('✨ Notes générées avec succès !');

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
            console.log('Tentative de création de note :', {
                basePath,
                fileName,
                filePath,
                date: date.toISO(),
                format: this.settings.notesFormat,
                language: this.settings.monthLanguage
            });

            const content = this.generateNoteContent(date);
            
            // Valider le contenu avant la création
            try {
                this.validationService.validateNoteContent(content);
                this.validationService.validateLatexAndCode(content);
            } catch (error) {
                console.error('Erreur de validation :', {
                    error,
                    content: content.slice(0, 200) + '...',  // Log juste le début du contenu
                    sections: content.match(/^##\s.+$/gm)    // Log les sections trouvées
                });
                if (error instanceof ValidationError) {
                    throw new NotesGenerationError(
                        `Validation échouée : ${error.message}`,
                        NotesErrorCode.TEMPLATE_ERROR,
                        { details: error.details }
                    );
                }
                throw error;
            }

            try {
                await this.app.vault.create(filePath, content);
            } catch (error) {
                console.error('Erreur lors de la création du fichier :', {
                    error,
                    filePath,
                    fileExists: await this.fileExists(filePath),
                    parentExists: await this.fileExists(basePath)
                });
                throw error;
            }
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
        const monthName = date.setLocale(this.settings.monthLanguage || 'fr').toFormat('MMMM');
        // Format de date selon la langue, en utilisant - au lieu de /
        const shortDate = this.settings.monthLanguage === 'fr' ? 
            date.toFormat('dd-MM') :  // Format français : 01-12
            date.toFormat('MM-dd');   // Format anglais : 12-01
        const suffix = this.settings.monthLanguage === 'en' ? 
            (day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th') : 
            (day === 1 ? 'er' : '');
        const dayWithSuffix = `${day}${suffix}`;

        switch (this.settings.notesFormat) {
            case 'full-date-emoji':
                return `📓 ${dayWithSuffix} ${monthName} ${shortDate}`;
            case 'name-emoji':
                return `📓 ${dayWithSuffix} ${monthName}`;
            case 'short-emoji':
                return `📓 ${shortDate}`;
            case 'full-write':
                return `✍️ ${dayWithSuffix} ${monthName}`;
            case 'short-write':
                return `✍️ ${shortDate}`;
            case 'name-only':
                return `${dayWithSuffix} ${monthName}`;
            case 'short-only':
                return shortDate;
            default:
                return `📓 ${dayWithSuffix} ${monthName} ${shortDate}`;
        }
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
            
        const template = this.settings.noteTemplate || getDefaultTemplate(this.settings.monthLanguage);
        return template
            .replace('{day}', date.day.toString())
            .replace('{suffix}', suffix)
            .replace('{month}', monthName)
            .replace('{MM}', localizedDate.toFormat('MM'))
            .replace('{DD}', localizedDate.toFormat('dd'))
            .replace('{year}', localizedDate.toFormat('yyyy'));
    }

    private async fileExists(path: string): Promise<boolean> {
        return await this.app.vault.adapter.exists(path);
    }

    async generateSingleNote(date: DateTime): Promise<void> {
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

            // Déterminer le chemin de base
            let basePath = this.settings.notesPath;
            if (this.settings.folderStructure === 'monthly') {
                const monthName = date.setLocale(this.settings.monthLanguage || 'fr').toFormat('MMMM');
                const monthNumber = date.toFormat('MM');
                basePath = `${this.settings.notesPath}/${monthNumber}_${monthName.toLowerCase()}`;
                await this.ensureDirectoryExists(basePath);
            }

            // Générer la note
            await this.generateDayNote(date, basePath);
            new Notice('Note générée avec succès !');
        } catch (error) {
            console.error('Erreur lors de la génération de la note:', error);
            if (error instanceof NotesGenerationError) {
                new Notice(`Erreur : ${error.message} (${error.code})`);
            } else {
                new Notice('Erreur inattendue lors de la génération de la note.');
            }
            throw error;
        }
    }

    getNotePath(date: DateTime): string {
        let basePath = this.settings.notesPath;
        if (this.settings.folderStructure === 'monthly') {
            const monthName = date.setLocale(this.settings.monthLanguage || 'fr').toFormat('MMMM');
            const monthNumber = date.toFormat('MM');
            basePath = `${this.settings.notesPath}/${monthNumber}_${monthName.toLowerCase()}`;
        }
        const fileName = this.formatNoteFileName(date);
        return `${basePath}/${fileName}.md`;
    }
} 