import { defineStore } from 'pinia';
import type { Goal } from '@/types/goals';
import type { App } from 'obsidian';

interface ModalState {
    isGoalModalOpen: boolean;
    editingGoal: Goal | null;
}

export const useModalStore = defineStore('modal', {
    state: (): ModalState => ({
        isGoalModalOpen: false,
        editingGoal: null
    }),

    actions: {
        initialize(app: App) {
            console.log('ModalStore: Initialized');
        },

        openGoalModal(goal?: Goal) {
            console.log('ModalStore: Opening modal');
            this.isGoalModalOpen = true;
            this.editingGoal = goal || null;
        },

        closeGoalModal() {
            console.log('ModalStore: Closing modal');
            this.isGoalModalOpen = false;
            this.editingGoal = null;
        }
    }
}); 