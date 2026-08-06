import { App, Notice, TFile } from 'obsidian';
import { DateTime, Interval } from 'luxon';
import type { GoalFlowzSettings } from '../types';

export interface WeekNotes {
    weekNumber: number;
    startDate: DateTime;
    endDate: DateTime;
    notes: TFile[];
}

export class TimeManagementService {
    constructor(
        private app: App,
        private settings: GoalFlowzSettings
    ) {}

    async updateNotesForNewYear(year: number): Promise<void> {
        try {
            const files = await this.getDailyNotes();
            let updatedCount = 0;

            for (const file of files) {
                const content = await this.app.vault.read(file);
                const newContent = this.addNewYearSection(content, year);
                
                if (content !== newContent) {
                    await this.app.vault.modify(file, newContent);
                    updatedCount++;
                }
            }

            new Notice(`${updatedCount} notes mises à jour pour l'année ${year}`);
        } catch (error) {
            console.error('Erreur lors de la mise à jour des notes:', error);
            new Notice('Erreur lors de la mise à jour des notes pour la nouvelle année');
        }
    }

    private addNewYearSection(content: string, year: number): string {
        return `[[template pour ${year}]]

## ${year-1}_TERMINEE

${content}`;
    }

    private async getDailyNotes(): Promise<TFile[]> {
        const files = this.app.vault.getMarkdownFiles();
        return files.filter(file => {
            const path = file.path;
            return path.startsWith(this.settings.notesPath) && path.includes('📓');
        });
    }

    getISOWeek(date: Date): number {
        return DateTime.fromJSDate(date).weekNumber;
    }

    async groupNotesByWeek(): Promise<Map<number, TFile[]>> {
        const files = await this.getDailyNotes();
        const weekMap = new Map<number, TFile[]>();

        files.forEach(file => {
            const dateMatch = file.basename.match(/(\d{2})\/(\d{2})/);
            if (dateMatch) {
                const [, month, day] = dateMatch;
                const date = DateTime.fromObject({ 
                    month: parseInt(month), 
                    day: parseInt(day),
                    year: 2024  // On utilise 2024 comme année de référence
                });
                const weekNumber = date.weekNumber;

                if (!weekMap.has(weekNumber)) {
                    weekMap.set(weekNumber, []);
                }
                weekMap.get(weekNumber)?.push(file);
            }
        });

        return weekMap;
    }

    async getCurrentWeekNotes(): Promise<WeekNotes> {
        const now = DateTime.now();
        return this.getWeekNotes(now);
    }

    async getWeekNotes(date: DateTime): Promise<WeekNotes> {
        const startOfWeek = date.startOf('week');
        const endOfWeek = date.endOf('week');
        const weekNumber = date.weekNumber;

        const files = await this.getDailyNotes();
        const weekNotes = files.filter(file => {
            // On utilise la date du fichier plutôt que son nom
            const stat = this.app.vault.getAbstractFileByPath(file.path)?.stat;
            if (!stat) return false;
            
            const fileDate = DateTime.fromMillis(stat.ctime);
            return Interval.fromDateTimes(startOfWeek, endOfWeek).contains(fileDate);
        });

        return {
            weekNumber,
            startDate: startOfWeek,
            endDate: endOfWeek,
            notes: weekNotes
        };
    }

    // Méthode pour obtenir les métadonnées d'une note
    async getNoteMetadata(file: TFile) {
        const cache = this.app.metadataCache.getFileCache(file);
        const stat = file.stat;
        
        return {
            file,
            date: DateTime.fromMillis(stat.ctime),
            metadata: cache?.frontmatter || {},
        };
    }
} 