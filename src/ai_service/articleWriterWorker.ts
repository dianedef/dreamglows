import { App } from 'obsidian';
import { ObsidianQueue } from './queue/queue';
import { ObsidianArticleWriter } from './services/articleWriter';
import { Article, ArticleData } from '../../../types/article.types';

export class ArticleWorker {
    private queue: ObsidianQueue;
    private writer: ObsidianArticleWriter;
    private isProcessing: boolean = false;

    constructor(app: App, openAIKey: string) {
        this.queue = new ObsidianQueue(app);
        this.writer = new ObsidianArticleWriter(app, openAIKey);
    }

    async startProcessing(): Promise<void> {
        if (this.isProcessing) return;
        this.isProcessing = true;

        const processArticle = async (data: ArticleData, updateProgress: (progress: number) => Promise<void>): Promise<Article> => {
            // Outline = 10%
            await updateProgress(10);
            
            // Chaque paragraphe = 80% réparti
            const estimatedParagraphs = 10; // On estime environ 10 paragraphes
            const progressPerParagraph = 80 / estimatedParagraphs;
            
            const article = await this.writer.writeArticle(data, async (step: 'outline' | 'paragraph', current: number, total: number) => {
                if (step === 'outline') {
                    await updateProgress(10);
                } else {
                    const progress = 10 + (current * progressPerParagraph);
                    await updateProgress(Math.min(90, progress));
                }
            });

            // Finalisation = 100%
            await updateProgress(100);
            return article;
        };

        // Boucle de traitement
        while (this.isProcessing) {
            await this.queue.process(processArticle);
            // Attendre 1 seconde avant de vérifier à nouveau
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }

    stopProcessing(): void {
        this.isProcessing = false;
    }

    async addArticle(data: ArticleData): Promise<string> {
        return await this.queue.add(data);
    }

    onProgress(id: string, callback: (progress: number) => void): void {
        this.queue.onProgress(id, callback);
    }

    async getStatus(id: string) {
        return await this.queue.getStatus(id);
    }
}
