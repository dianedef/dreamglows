import { defineStore } from 'pinia';
import { QueueItem, Article } from '../types/article.types';
import { useSettingsStore } from './settingsStore';

interface QueueState {
    activeQueue: QueueItem[];
    recentArticles: Article[];
}

export const useQueueStore = defineStore('queue', {
    state: (): QueueState => {
        const settingsStore = useSettingsStore();
        return {
            activeQueue: [],
            recentArticles: settingsStore.settings.recentArticles.map(article => ({
                ...article,
                date: new Date(article.date)
            }))
        };
    },

    getters: {
        getActiveJobs: (state) => state.activeQueue.filter(item => item.status === 'active'),
        getRecentArticles: (state) => state.recentArticles,
        getJobById: (state) => (id: string) => state.activeQueue.find(item => item.id === id)
    },

    actions: {
        addToQueue(item: QueueItem) {
            this.activeQueue.push(item);
        },

        updateJobProgress(id: string, progress: number) {
            const item = this.activeQueue.find(i => i.id === id);
            if (item) {
                item.progress = progress;
            }
        },

        completeJob(id: string, article: Article) {
            const item = this.activeQueue.find(i => i.id === id);
            if (item) {
                item.status = 'completed';
                item.result = article;
                item.completedAt = new Date();
                item.progress = 100;

                // Ajouter l'article à l'historique
                this.recentArticles.unshift(article);
                // Garder seulement les 10 derniers articles
                if (this.recentArticles.length > 10) {
                    this.recentArticles.pop();
                }

                // Sauvegarder dans les settings
                const settingsStore = useSettingsStore();
                settingsStore.updateSettings({
                    recentArticles: this.recentArticles.map(article => ({
                        ...article,
                        date: article.date.toISOString()
                    }))
                });
            }
        },

        failJob(id: string, error: string) {
            const item = this.activeQueue.find(i => i.id === id);
            if (item) {
                item.status = 'failed';
                item.error = error;
                item.completedAt = new Date();
            }
        },

        clearCompletedJobs() {
            this.activeQueue = this.activeQueue.filter(
                item => item.status === 'waiting' || item.status === 'active'
            );
        }
    }
}); 