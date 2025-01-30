import { App, Notice } from 'obsidian';
import type { GoalFlowzSettings } from '../types';
import { DateService } from './DateService';
import { ValidationService } from './ValidationService';
import { StorageService } from './StorageService';
import { DateError } from '../types/errors';

export class NotesGeneratorService {
    constructor(
        private app: App,
        private settings: GoalFlowzSettings,
        private dateService: DateService,
        private validationService: ValidationService,
        private storageService: StorageService
    ) {}

    async generateNotes(): Promise<void> {
        try {
            // Vérifier si un chemin est défini
            if (!this.settings.notesPath) {
                throw new Error('Chemin des notes non défini');
            }

            // Créer le dossier principal s'il n'existe pas
            await this.ensureDirectoryExists(this.settings.notesPath);

            // Générer les notes pour chaque mois
            const now = this.dateService.today();
            for (let month = 0; month < 12; month++) {
                const monthDate = now.set({ month });
                await this.generateMonthNotes(monthDate);
            }

            new Notice('Notes générées avec succès !');
        } catch (error) {
            console.error('Erreur lors de la génération des notes:', error);
            if (error instanceof DateError) {
                new Notice('Erreur de date lors de la génération des notes.');
            } else {
                new Notice('Erreur lors de la génération des notes. Vérifiez le chemin du dossier.');
            }
        }
    }

    private async generateMonthNotes(monthDate: DateTime): Promise<void> {
        try {
            const monthName = monthDate.toFormat('MMMM');
            const daysInMonth = monthDate.daysInMonth;

            let basePath = this.settings.notesPath;
            if (this.settings.folderStructure === 'monthly') {
                basePath = `${this.settings.notesPath}/${monthName}`;
                await this.ensureDirectoryExists(basePath);
            }

            // Générer les notes pour chaque jour du mois
            for (let day = 1; day <= daysInMonth; day++) {
                const dayDate = monthDate.set({ day });
                await this.generateDayNote(dayDate, basePath);
            }
        } catch (error) {
            console.error(`Erreur lors de la génération des notes pour ${monthDate.toFormat('MMMM')}:`, error);
            throw error;
        }
    }

    private async generateDayNote(date: DateTime, basePath: string): Promise<void> {
        try {
            // Formater le nom du fichier
            const fileName = this.formatNoteFileName(date);
            const filePath = `${basePath}/${fileName}.md`;

            // Vérifier si le fichier existe déjà
            if (!await this.fileExists(filePath)) {
                const content = this.generateNoteContent(date);
                await this.createNote(filePath, content);
            }
        } catch (error) {
            console.error(`Erreur lors de la création de la note pour ${date.toFormat('dd/MM')}:`, error);
            throw error;
        }
    }

    private formatNoteFileName(date: DateTime): string {
        const day = date.day;
        const monthName = date.toFormat('MMMM');
        return `📓 ${day}${day === 1 ? 'er' : ''} ${monthName}`;
    }

    private generateNoteContent(date: DateTime): string {
        return this.settings.noteTemplate
            .replace('{day}', date.day.toString())
            .replace('{suffix}', date.day === 1 ? 'er' : '')
            .replace('{month}', date.toFormat('MMMM'))
            .replace('{MM}', date.toFormat('MM'))
            .replace('{DD}', date.toFormat('dd'));
    }

    private async ensureDirectoryExists(path: string): Promise<void> {
        if (!await this.app.vault.adapter.exists(path)) {
            await this.app.vault.createFolder(path);
        }
    }

    private async fileExists(path: string): Promise<boolean> {
        return await this.app.vault.adapter.exists(path);
    }

    private async createNote(path: string, content: string): Promise<void> {
        await this.app.vault.create(path, content);
    }
} 