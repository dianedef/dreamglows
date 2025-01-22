import { App } from 'obsidian';
import { Article, ArticleData, QueueItem } from '../../../../types/article.types';
import { useQueueStore } from '../../../../stores/queueStore';

export class ObsidianQueue {
    private app: App;
    private maxConcurrent: number = 2;
    private activeJobs: Set<string> = new Set();
    private progressCallbacks: Map<string, (progress: number) => void> = new Map();
    private queueStore = useQueueStore();

    constructor(app: App) {
        this.app = app;
    }

    async add(data: ArticleData): Promise<string> {
        const id = crypto.randomUUID();
        const item: QueueItem = {
            id,
            status: 'waiting',
            progress: 0,
            data,
            createdAt: new Date()
        };

        this.queueStore.addToQueue(item);
        return id;
    }

    async updateProgress(id: string, progress: number): Promise<void> {
        this.queueStore.updateJobProgress(id, progress);
        
        // Notifier les listeners
        const callback = this.progressCallbacks.get(id);
        if (callback) callback(progress);
    }

    async complete(id: string, result: Article): Promise<void> {
        this.queueStore.completeJob(id, result);
        this.activeJobs.delete(id);
    }

    async fail(id: string, error: string): Promise<void> {
        this.queueStore.failJob(id, error);
        this.activeJobs.delete(id);
    }

    onProgress(id: string, callback: (progress: number) => void): void {
        this.progressCallbacks.set(id, callback);
    }

    async getStatus(id: string): Promise<QueueItem | undefined> {
        return this.queueStore.getJobById(id);
    }

    async process(processor: (data: ArticleData, updateProgress: (progress: number) => Promise<void>) => Promise<Article>): Promise<void> {
        const waitingItems = this.queueStore.activeQueue.filter(i => i.status === 'waiting');

        for (const item of waitingItems) {
            if (this.activeJobs.size >= this.maxConcurrent) break;

            this.activeJobs.add(item.id);
            item.status = 'active';
            item.startedAt = new Date();

            // Process en asynchrone
            this.processItem(item, processor).catch(console.error);
        }
    }

    private async processItem(
        item: QueueItem, 
        processor: (data: ArticleData, updateProgress: (progress: number) => Promise<void>) => Promise<Article>
    ): Promise<void> {
        try {
            const updateProgress = async (progress: number) => {
                await this.updateProgress(item.id, progress);
            };

            const result = await processor(item.data, updateProgress);
            await this.complete(item.id, result);
        } catch (error) {
            await this.fail(item.id, error.message);
        }
    }
}
