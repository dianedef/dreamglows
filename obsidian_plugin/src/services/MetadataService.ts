import { TFile, Vault, MetadataCache, FrontMatterCache } from 'obsidian';

export interface ArticleMetadata {
    // Métadonnées de base
    title: string;
    created: string;
    lastUpdated: string;
    author?: string;
    status: 'draft' | 'published' | 'archived';
    
    // Métadonnées SEO
    seoTitle?: string;
    seoDescription?: string;
    keywords: string[];
    canonicalUrl?: string;
    robots?: string;
    
    // Métadonnées de contrôle
    wordCount?: number;
    readingTime?: number;
    
    // Métadonnées de structure
    sections?: {
        title: string;
        id: string;
    }[];
    
    // Métadonnées de catégorisation
    tags: string[];
    category?: string;
}

export class MetadataService {
    private vault: Vault;
    private metadataCache: MetadataCache;

    constructor(vault: Vault, metadataCache: MetadataCache) {
        this.vault = vault;
        this.metadataCache = metadataCache;
    }

    /**
     * Lit les métadonnées d'un fichier
     */
    async getMetadata(file: TFile): Promise<ArticleMetadata | null> {
        try {
            const cache = this.metadataCache.getFileCache(file);
            if (!cache || !cache.frontmatter) return null;

            const content = await this.vault.read(file);
            
            return {
                ...cache.frontmatter,
                wordCount: this.calculateWordCount(content),
                readingTime: this.calculateReadingTime(content),
                lastUpdated: new Date(file.stat.mtime).toISOString().split('T')[0],
                sections: this.extractSections(cache)
            } as ArticleMetadata;
        } catch (error) {
            console.error('Erreur lors de la lecture des métadonnées:', error);
            return null;
        }
    }

    /**
     * Met à jour les métadonnées d'un fichier
     */
    async updateMetadata(file: TFile, newMetadata: Partial<ArticleMetadata>): Promise<void> {
        try {
            const content = await this.vault.read(file);
            const cache = this.metadataCache.getFileCache(file);
            const currentFrontmatter = cache?.frontmatter || {};
            
            const updatedFrontmatter = {
                ...currentFrontmatter,
                ...newMetadata,
                lastUpdated: new Date().toISOString().split('T')[0]
            };
            
            const newContent = this.updateFrontmatter(content, updatedFrontmatter);
            await this.vault.modify(file, newContent);
        } catch (error) {
            console.error('Erreur lors de la mise à jour des métadonnées:', error);
            throw error;
        }
    }

    /**
     * Génère les métadonnées SEO pour un fichier
     */
    async generateSEOMetadata(file: TFile): Promise<Partial<ArticleMetadata>> {
        const cache = this.metadataCache.getFileCache(file);
        if (!cache) return {};

        const content = await this.vault.read(file);
        const heading = cache.headings?.[0]?.heading || '';

        return {
            seoTitle: heading,
            seoDescription: this.generateDescription(content),
            keywords: this.extractKeywords(cache),
            robots: 'index, follow'
        };
    }

    private extractSections(cache: FrontMatterCache): { title: string; id: string; }[] {
        if (!cache.headings) return [];

        return cache.headings
            .filter(h => h.level === 2) // Uniquement les h2
            .map(h => ({
                title: h.heading,
                id: h.heading.toLowerCase().replace(/[^a-z0-9]+/g, '-')
            }));
    }

    private updateFrontmatter(content: string, metadata: any): string {
        const yamlContent = Object.entries(metadata)
            .filter(([_, value]) => value !== undefined)
            .map(([key, value]) => {
                if (Array.isArray(value)) {
                    return `${key}:\n  - ${value.join('\n  - ')}`;
                }
                return `${key}: ${JSON.stringify(value)}`;
            })
            .join('\n');

        if (content.startsWith('---\n')) {
            return content.replace(/^---([\s\S]*?)---/, `---\n${yamlContent}\n---`);
        }

        return `---\n${yamlContent}\n---\n\n${content}`;
    }

    private calculateWordCount(content: string): number {
        const cleanContent = content
            .replace(/^---[\s\S]*?---/, '')
            .replace(/[#*`_~\[\]()]/g, '');
        return cleanContent.split(/\s+/).filter(word => word.length > 0).length;
    }

    private calculateReadingTime(content: string): number {
        const wordCount = this.calculateWordCount(content);
        return Math.ceil(wordCount / 200); // 200 mots par minute en moyenne
    }

    private generateDescription(content: string): string {
        const cleanContent = content
            .replace(/^---[\s\S]*?---/, '')
            .replace(/[#*`_~\[\]()]/g, '')
            .trim();
        
        const firstParagraph = cleanContent.split('\n\n')[0];
        return firstParagraph.length > 160 
            ? `${firstParagraph.slice(0, 157)}...`
            : firstParagraph;
    }

    private extractKeywords(cache: FrontMatterCache): string[] {
        const tags = cache.tags?.map(tag => tag.tag) || [];
        return [...new Set(tags)].slice(0, 5);
    }
} 