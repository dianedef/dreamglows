import { defineStore } from 'pinia';

interface GenerationState {
    isGenerating: boolean;
    currentJobId: string | null;
    progress: number;
    currentStep: 'outline' | 'paragraph' | null;
    currentArticle: {
        keyword: string;
        niche: string;
        folder: string;
    } | null;
}

export const useGeneratorStore = defineStore('generator', {
    state: (): GenerationState => ({
        isGenerating: false,
        currentJobId: null,
        progress: 0,
        currentStep: null,
        currentArticle: null
    }),

    actions: {
        startGeneration(jobId: string, article: { keyword: string; niche: string; folder: string }) {
            this.isGenerating = true;
            this.currentJobId = jobId;
            this.progress = 0;
            this.currentStep = 'outline';
            this.currentArticle = article;
        },

        updateProgress(step: 'outline' | 'paragraph', current: number, total: number) {
            this.currentStep = step;
            this.progress = Math.round((current / total) * 100);
        },

        completeGeneration() {
            this.isGenerating = false;
            this.currentJobId = null;
            this.progress = 0;
            this.currentStep = null;
            this.currentArticle = null;
        },

        failGeneration() {
            this.isGenerating = false;
            this.currentJobId = null;
            this.progress = 0;
            this.currentStep = null;
            this.currentArticle = null;
        }
    }
}); 