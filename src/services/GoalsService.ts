import { App, TFile } from 'obsidian';
import type { Goal } from '@/types/goals';

export class GoalsService {
    private app: App;
    private goalsFolder: string;

    constructor(app: App) {
        this.app = app;
        // Utiliser le dossier de configuration d'Obsidian
        this.goalsFolder = `${this.app.vault.configDir}/goals`;
        console.log('GoalsService: Initialized with folder:', this.goalsFolder);
        // Ne pas appeler ensureGoalsFolderExists ici, il sera appelé lors de la première opération
    }

    private async ensureGoalsFolderExists() {
        try {
            const exists = await this.app.vault.adapter.exists(this.goalsFolder);
            console.log('GoalsService: Folder exists?', exists);
            
            if (!exists) {
                console.log('GoalsService: Creating goals folder at', this.goalsFolder);
                await this.app.vault.adapter.mkdir(this.goalsFolder);
                console.log('GoalsService: Folder created successfully');
            } else {
                console.log('GoalsService: Goals folder exists at', this.goalsFolder);
            }
        } catch (error) {
            console.error('GoalsService: Error ensuring folder exists:', error);
            throw error;
        }
    }

    async saveGoal(goal: Goal): Promise<void> {
        console.log('GoalsService: Saving goal:', goal);
        await this.ensureGoalsFolderExists();

        const fileName = `${this.goalsFolder}/${goal.id}.md`;
        console.log('GoalsService: Target file path:', fileName);
        const content = this.generateGoalContent(goal);

        try {
            const exists = await this.app.vault.adapter.exists(fileName);
            console.log('GoalsService: File exists?', exists);

            if (exists) {
                console.log('GoalsService: Updating existing goal file');
                await this.app.vault.adapter.write(fileName, content);
            } else {
                console.log('GoalsService: Creating new goal file');
                await this.app.vault.adapter.write(fileName, content);
            }
            console.log('GoalsService: Goal saved successfully');
        } catch (error) {
            console.error('GoalsService: Error saving goal:', error);
            throw new Error('Failed to save goal');
        }
    }

    async loadGoals(): Promise<Goal[]> {
        console.log('GoalsService: Loading goals from', this.goalsFolder);
        await this.ensureGoalsFolderExists();

        try {
            const files = await this.app.vault.adapter.list(this.goalsFolder);
            console.log('GoalsService: Files in folder:', files);

            const goals: Goal[] = [];
            for (const file of files.files) {
                if (!file.endsWith('.md')) continue;
                
                try {
                    console.log('GoalsService: Reading file:', file);
                    const content = await this.app.vault.adapter.read(file);
                    const goal = this.parseGoalContent(content);
                    if (goal) {
                        console.log('GoalsService: Parsed goal:', goal.id);
                        goals.push(goal);
                    }
                } catch (error) {
                    console.error(`GoalsService: Error loading goal from ${file}:`, error);
                }
            }

            console.log('GoalsService: All goals loaded:', goals.length);
            return goals;
        } catch (error) {
            console.error('GoalsService: Error loading goals:', error);
            throw new Error('Failed to load goals');
        }
    }

    async deleteGoal(goalId: string): Promise<void> {
        const fileName = `${this.goalsFolder}/${goalId}.md`;
        try {
            const exists = await this.app.vault.adapter.exists(fileName);
            if (exists) {
                await this.app.vault.adapter.remove(fileName);
            }
        } catch (error) {
            console.error('GoalsService: Error deleting goal:', error);
            throw new Error('Failed to delete goal');
        }
    }

    private generateGoalContent(goal: Goal): string {
        // Formatter les métadonnées dans le frontmatter
        const frontmatter = [
            '---',
            `id: "${goal.id}"`,
            `title: "${goal.title}"`,
            `startDate: "${goal.startDate}"`,
            `dueDate: "${goal.dueDate || ''}"`,
            `status: "${goal.status}"`,
            `priority: "${goal.priority}"`,
            `category: "${goal.category || ''}"`,
            `progress: ${goal.progress}`,
            '---\n'
        ].join('\n');

        // Formatter le contenu principal
        const sections = [
            `# ${goal.title}\n`,
            '## Description',
            goal.description?.trim() || '_Aucune description_',
            '\n## Tags',
            goal.tags?.length 
                ? goal.tags.map(tag => `- #${tag}`).join('\n')
                : '_Aucun tag_',
            '\n## Tâches',
            goal.tasks?.length 
                ? goal.tasks.map(task => `- [${task.done ? 'x' : ' '}] ${task.label}`).join('\n')
                : '_Aucune tâche_',
            '\n## Sous-objectifs',
            goal.subGoalIds?.length 
                ? goal.subGoalIds.map(id => `- [[${id}]]`).join('\n')
                : '_Aucun sous-objectif_',
            '\n'
        ].join('\n');

        return frontmatter + sections;
    }

    private parseGoalContent(content: string): Goal | null {
        try {
            // Extraire le frontmatter
            const frontMatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
            if (!frontMatterMatch) {
                console.error('GoalsService: No frontmatter found in goal file');
                return null;
            }

            // Parser les métadonnées de base
            const metadata = frontMatterMatch[1].split('\n').reduce((acc, line) => {
                const [key, ...values] = line.split(':').map(s => s.trim());
                if (!key) return acc;
                
                const value = values.join(':').replace(/^"(.*)"$/, '$1'); // Enlever les guillemets
                if (key === 'progress') {
                    acc[key] = parseInt(value, 10) || 0;
                } else {
                    acc[key] = value || '';
                }
                return acc;
            }, {} as any);

            // Parser la description
            const descriptionMatch = content.match(/## Description\n([\s\S]*?)(?=\n##|$)/);
            metadata.description = descriptionMatch 
                ? descriptionMatch[1].trim().replace('_Aucune description_', '')
                : '';

            // Parser les tags (maintenant avec #)
            const tagsMatch = content.match(/## Tags\n([\s\S]*?)(?=\n##|$)/);
            metadata.tags = tagsMatch 
                ? tagsMatch[1]
                    .split('\n')
                    .filter(line => line.trim().startsWith('- #'))
                    .map(line => line.replace('- #', '').trim())
                : [];

            // Parser les tâches
            const tasksMatch = content.match(/## Tâches\n([\s\S]*?)(?=\n##|$)/);
            metadata.tasks = tasksMatch 
                ? tasksMatch[1]
                    .split('\n')
                    .filter(line => line.trim().startsWith('- ['))
                    .map(line => ({
                        id: crypto.randomUUID(),
                        label: line.replace(/- \[[x ]\] /, '').trim(),
                        done: line.includes('[x]')
                    }))
                : [];

            // Parser les sous-objectifs
            const subGoalsMatch = content.match(/## Sous-objectifs\n([\s\S]*?)(?=\n##|$)/);
            metadata.subGoalIds = subGoalsMatch
                ? subGoalsMatch[1]
                    .split('\n')
                    .filter(line => line.trim().startsWith('- [['))
                    .map(line => line.replace(/- \[\[(.*?)\]\]/, '$1').trim())
                : [];

            return metadata as Goal;
        } catch (error) {
            console.error('GoalsService: Error parsing goal content:', error);
            return null;
        }
    }
} 