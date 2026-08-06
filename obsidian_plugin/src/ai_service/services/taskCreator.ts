import * as crypto from "crypto";
import { ArticleData } from '../../../../types/article.types';
import { ObsidianQueue } from '../queue/queue';

export class TaskCreator {
    private queue: ObsidianQueue;

    constructor(queue: ObsidianQueue) {
        this.queue = queue;
    }

    async createWritingTask(folder: string, keyword: string, niche: string): Promise<string> {
        const taskId = crypto.randomUUID();

        const data: ArticleData = {
            taskId,
            folder,
            niche,
            keyword,
        };

        console.log("Creating task! ", folder, keyword, niche);
        return await this.queue.add(data);
    }
}
