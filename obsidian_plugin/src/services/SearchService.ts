import { Goal, Task, DataStore } from '../types/models';
import { StorageService } from './StorageService';

export interface SearchResult {
    type: 'goal' | 'task';
    item: Goal | Task;
    score: number;
    matches: {
        field: string;
        value: string;
        positions: [number, number][];
    }[];
}

export interface SearchOptions {
    categories?: string[];
    status?: ('todo' | 'in-progress' | 'done')[];
    startDate?: Date;
    endDate?: Date;
    tags?: string[];
    includeDescription?: boolean;
    includeNotes?: boolean;
}

export class SearchService {
    private storageService: StorageService;

    constructor(storageService: StorageService) {
        this.storageService = storageService;
    }

    /**
     * Recherche dans les goals et tasks
     */
    async search(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
        const results: SearchResult[] = [];
        const searchTerms = this.prepareSearchTerms(query);

        // Charger les données
        const data = await this.loadSearchData(options);

        // Rechercher dans les goals
        for (const goal of data.goals) {
            const score = this.calculateScore(goal, searchTerms, options);
            if (score > 0) {
                results.push({
                    type: 'goal',
                    item: goal,
                    score,
                    matches: this.findMatches(goal, searchTerms, options)
                });
            }
        }

        // Rechercher dans les tasks
        for (const task of data.tasks) {
            const score = this.calculateScore(task, searchTerms, options);
            if (score > 0) {
                results.push({
                    type: 'task',
                    item: task,
                    score,
                    matches: this.findMatches(task, searchTerms, options)
                });
            }
        }

        // Trier par score décroissant
        return results.sort((a, b) => b.score - a.score);
    }

    /**
     * Recherche par tags
     */
    async searchByTags(tags: string[]): Promise<SearchResult[]> {
        return this.search('', { tags });
    }

    /**
     * Recherche par catégorie
     */
    async searchByCategory(category: string): Promise<SearchResult[]> {
        return this.search('', { categories: [category] });
    }

    /**
     * Recherche par statut
     */
    async searchByStatus(status: ('todo' | 'in-progress' | 'done')[]): Promise<SearchResult[]> {
        return this.search('', { status });
    }

    private async loadSearchData(options: SearchOptions): Promise<DataStore> {
        if (options.startDate && options.endDate) {
            return this.storageService.loadDataForRange(options.startDate, options.endDate);
        }
        // Par défaut, charger toutes les données
        const now = new Date();
        const start = new Date(now.getFullYear() - 1, 0, 1);
        const end = new Date(now.getFullYear() + 1, 11, 31);
        return this.storageService.loadDataForRange(start, end);
    }

    private prepareSearchTerms(query: string): string[] {
        return query.toLowerCase()
            .split(/\s+/)
            .filter(term => term.length > 1);
    }

    private calculateScore(item: Goal | Task, terms: string[], options: SearchOptions): number {
        let score = 0;

        // Score pour le titre (plus important)
        const titleLower = item.title.toLowerCase();
        for (const term of terms) {
            if (titleLower.includes(term)) score += 10;
        }

        // Score pour la description
        if (options.includeDescription) {
            const descLower = item.description.toLowerCase();
            for (const term of terms) {
                if (descLower.includes(term)) score += 5;
            }
        }

        // Score pour les notes (tasks seulement)
        if (options.includeNotes && 'notes' in item) {
            const notesLower = item.notes.toLowerCase();
            for (const term of terms) {
                if (notesLower.includes(term)) score += 3;
            }
        }

        // Score pour les tags
        if (options.tags) {
            const matchingTags = item.tags.filter(tag => 
                options.tags!.includes(tag)
            );
            score += matchingTags.length * 8;
        }

        // Score pour la catégorie (goals seulement)
        if (options.categories && 'category' in item) {
            if (options.categories.includes(item.category)) {
                score += 8;
            }
        }

        return score;
    }

    private findMatches(item: Goal | Task, terms: string[], options: SearchOptions): {
        field: string;
        value: string;
        positions: [number, number][];
    }[] {
        const matches: {
            field: string;
            value: string;
            positions: [number, number][];
        }[] = [];

        // Chercher dans le titre
        const titleMatches = this.findTermPositions(item.title, terms);
        if (titleMatches.length > 0) {
            matches.push({
                field: 'title',
                value: item.title,
                positions: titleMatches
            });
        }

        // Chercher dans la description
        if (options.includeDescription) {
            const descMatches = this.findTermPositions(item.description, terms);
            if (descMatches.length > 0) {
                matches.push({
                    field: 'description',
                    value: item.description,
                    positions: descMatches
                });
            }
        }

        // Chercher dans les notes (tasks seulement)
        if (options.includeNotes && 'notes' in item) {
            const notesMatches = this.findTermPositions(item.notes, terms);
            if (notesMatches.length > 0) {
                matches.push({
                    field: 'notes',
                    value: item.notes,
                    positions: notesMatches
                });
            }
        }

        return matches;
    }

    private findTermPositions(text: string, terms: string[]): [number, number][] {
        const positions: [number, number][] = [];
        const lowerText = text.toLowerCase();

        for (const term of terms) {
            let pos = 0;
            while ((pos = lowerText.indexOf(term, pos)) !== -1) {
                positions.push([pos, pos + term.length]);
                pos += 1;
            }
        }

        return positions.sort((a, b) => a[0] - b[0]);
    }
} 