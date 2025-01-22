import { App, Notice } from 'obsidian';
import type { GoalFlowzSettings } from '../types';

export class NotesGeneratorService {
    constructor(
        private app: App,
        private settings: GoalFlowzSettings
    ) {}

    async generateNotes(): Promise<void> {
        try {
            // Vérifier si un chemin est défini
            if (!this.settings.notesPath) {
                new Notice('Veuillez d\'abord définir un dossier pour les notes dans les paramètres');
                return;
            }

            // Créer le dossier principal s'il n'existe pas
            if (!await this.app.vault.adapter.exists(this.settings.notesPath)) {
                await this.app.vault.createFolder(this.settings.notesPath);
            }

            const months = [
                'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
                'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
            ];
            
            const daysInMonth = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
            
            for (let month = 0; month < 12; month++) {
                await this.generateMonthNotes(month, months[month], daysInMonth[month]);
            }
            new Notice('Notes générées avec succès !');
        } catch (error) {
            console.error('Erreur lors de la génération des notes:', error);
            new Notice('Erreur lors de la génération des notes. Vérifiez le chemin du dossier.');
        }
    }

    private async generateMonthNotes(month: number, monthName: string, days: number): Promise<void> {
        let basePath = this.settings.notesPath;
        if (this.settings.folderStructure === 'monthly') {
            basePath = `${this.settings.notesPath}/${monthName}`;
            if (!await this.app.vault.adapter.exists(basePath)) {
                await this.app.vault.createFolder(basePath);
            }
        }

        // Ne générer que le premier jour du mois pour les tests
        await this.generateDayNote(1, month + 1, monthName, basePath);
    }

    private async generateDayNote(day: number, monthNum: number, monthName: string, basePath: string): Promise<void> {
        try {
            const paddedMonth = String(monthNum).padStart(2, '0');
            const paddedDay = String(day).padStart(2, '0');
            
            // Créer un nom de fichier sans caractères spéciaux ni slashes
            let fileName = `${day}${day === 1 ? 'er' : ''} ${monthName}`;
            const filePath = `${basePath}/📓 ${fileName}.md`;
            
            // Vérifier si le fichier existe déjà
            if (!await this.app.vault.adapter.exists(filePath)) {
                const template = this.getDefaultTemplate(day, monthName, paddedMonth, paddedDay);
                await this.app.vault.create(filePath, template);
            }
        } catch (error) {
            console.error(`Erreur lors de la création de la note pour le ${day}/${monthNum}:`, error);
            throw error;
        }
    }

    private getDefaultTemplate(day: number, month: string, paddedMonth: string, paddedDay: string): string {
        return this.settings.noteTemplate
            .replace('{day}', day.toString())
            .replace('{suffix}', day === 1 ? 'er' : '')
            .replace('{month}', month)
            .replace('{MM}', paddedMonth)
            .replace('{DD}', paddedDay);
    }
} 