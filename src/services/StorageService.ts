import type { Goal } from '@/types/goals';
import type { Task } from '@/types/tasks';

export class StorageService {
    private app: any;
    private readonly DATA_FILE_NAME = 'goalflowz-data.md';
    private readonly TASKS_FILE_NAME = 'goalflowz-tasks.md';
    private readonly GOALS_FILE_NAME = 'goalflowz-goals.md';
    private readonly CHUNK_SIZE = 100; // Nombre d'éléments par fichier

    constructor(app: any) {
        this.app = app;
    }

    private async getFile(fileName: string) {
        const files = this.app.vault.getFiles();
        return files.find((file: any) => file.name === fileName);
    }

    private async createFile(fileName: string, initialContent: string) {
        return await this.app.vault.create(fileName, initialContent);
    }

    private async parseDataFile(content: string) {
        const goalsMatch = content.match(/\`\`\`json:goals\n([\s\S]*?)\n\`\`\`/);
        const tasksMatch = content.match(/\`\`\`json:tasks\n([\s\S]*?)\n\`\`\`/);

        return {
            goals: goalsMatch ? JSON.parse(goalsMatch[1]) : [],
            tasks: tasksMatch ? JSON.parse(tasksMatch[1]) : []
        };
    }

    private createInitialContent(type: 'data' | 'tasks' | 'goals', index?: number) {
        const now = new Date().toISOString();
        const metadata = {
            version: '1.0',
            lastUpdated: now,
            type: type,
            index: index
        };

        return `---
${Object.entries(metadata).map(([key, value]) => `${key}: ${value}`).join('\n')}
---

${type === 'data' ? `\`\`\`json:goals
[]
\`\`\`

\`\`\`json:tasks
[]
\`\`\`` : `\`\`\`json:${type}
[]
\`\`\``}`;
    }

    private async saveToFile(fileName: string, content: string) {
        let file = await this.getFile(fileName);
        if (!file) {
            file = await this.createFile(fileName, content);
        } else {
            await this.app.vault.modify(file, content);
        }
    }

    private shouldSplitFiles(goals: Goal[], tasks: Task[]) {
        return goals.length > this.CHUNK_SIZE || tasks.length > this.CHUNK_SIZE;
    }

    private async saveDataToSingleFile(goals: Goal[], tasks: Task[]) {
        const content = `---
version: 1.0
lastUpdated: ${new Date().toISOString()}
storage: single
---

\`\`\`json:goals
${JSON.stringify(goals, null, 2)}
\`\`\`

\`\`\`json:tasks
${JSON.stringify(tasks, null, 2)}
\`\`\``;

        await this.saveToFile(this.DATA_FILE_NAME, content);
    }

    private async saveDataToMultipleFiles(goals: Goal[], tasks: Task[]) {
        // Sauvegarder les objectifs
        const goalsChunks = this.chunkArray(goals, this.CHUNK_SIZE);
        for (let i = 0; i < goalsChunks.length; i++) {
            const content = `---
version: 1.0
lastUpdated: ${new Date().toISOString()}
type: goals
index: ${i}
total: ${goalsChunks.length}
---

\`\`\`json:goals
${JSON.stringify(goalsChunks[i], null, 2)}
\`\`\``;
            await this.saveToFile(`goalflowz-goals-${i}.md`, content);
        }

        // Sauvegarder les tâches
        const tasksChunks = this.chunkArray(tasks, this.CHUNK_SIZE);
        for (let i = 0; i < tasksChunks.length; i++) {
            const content = `---
version: 1.0
lastUpdated: ${new Date().toISOString()}
type: tasks
index: ${i}
total: ${tasksChunks.length}
---

\`\`\`json:tasks
${JSON.stringify(tasksChunks[i], null, 2)}
\`\`\``;
            await this.saveToFile(`goalflowz-tasks-${i}.md`, content);
        }

        // Mettre à jour le fichier principal avec les métadonnées
        const indexContent = `---
version: 1.0
lastUpdated: ${new Date().toISOString()}
storage: split
goalsFiles: ${goalsChunks.length}
tasksFiles: ${tasksChunks.length}
---`;
        await this.saveToFile(this.DATA_FILE_NAME, indexContent);
    }

    private chunkArray<T>(array: T[], size: number): T[][] {
        const chunks: T[][] = [];
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }
        return chunks;
    }

    async loadData() {
        const mainFile = await this.getFile(this.DATA_FILE_NAME);
        if (!mainFile) {
            return { goals: [], tasks: [] };
        }

        const content = await this.app.vault.read(mainFile);
        const storageMatch = content.match(/storage: (\w+)/);
        const storage = storageMatch ? storageMatch[1] : 'single';

        if (storage === 'single') {
            return this.parseDataFile(content);
        } else {
            // Charger depuis plusieurs fichiers
            const goalsFilesMatch = content.match(/goalsFiles: (\d+)/);
            const tasksFilesMatch = content.match(/tasksFiles: (\d+)/);
            
            const goals: Goal[] = [];
            const tasks: Task[] = [];

            if (goalsFilesMatch) {
                const numGoalsFiles = parseInt(goalsFilesMatch[1]);
                for (let i = 0; i < numGoalsFiles; i++) {
                    const file = await this.getFile(`goalflowz-goals-${i}.md`);
                    if (file) {
                        const content = await this.app.vault.read(file);
                        const match = content.match(/\`\`\`json:goals\n([\s\S]*?)\n\`\`\`/);
                        if (match) {
                            goals.push(...JSON.parse(match[1]));
                        }
                    }
                }
            }

            if (tasksFilesMatch) {
                const numTasksFiles = parseInt(tasksFilesMatch[1]);
                for (let i = 0; i < numTasksFiles; i++) {
                    const file = await this.getFile(`goalflowz-tasks-${i}.md`);
                    if (file) {
                        const content = await this.app.vault.read(file);
                        const match = content.match(/\`\`\`json:tasks\n([\s\S]*?)\n\`\`\`/);
                        if (match) {
                            tasks.push(...JSON.parse(match[1]));
                        }
                    }
                }
            }

            return { goals, tasks };
        }
    }

    async saveData(goals: Goal[], tasks: Task[]) {
        if (this.shouldSplitFiles(goals, tasks)) {
            await this.saveDataToMultipleFiles(goals, tasks);
        } else {
            await this.saveDataToSingleFile(goals, tasks);
        }
    }
} 