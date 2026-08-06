import { App, Modal } from 'obsidian';
import { createApp, type App as VueApp } from 'vue';
import { pinia } from '../../stores';
import GoalModalContent from './GoalModalContent.vue';
import type { Goal } from '../../types/goals';

export class GoalModal extends Modal {
    private vueApp: VueApp | null = null;
    private goal?: Goal;

    constructor(app: App, goal?: Goal) {
        super(app);
        this.goal = goal;
        console.log('GoalModal: Constructor called');
    }

    onOpen() {
        console.log('GoalModal: Opening modal');
        const { contentEl } = this;
        
        // Nettoyer le contenu existant
        contentEl.empty();
        
        // Créer le conteneur pour le contenu Vue
        const container = contentEl.createDiv('goalflowz-modal-content');
        console.log('GoalModal: Container created');

        // Créer l'application Vue
        this.vueApp = createApp(GoalModalContent, {
            editingGoal: this.goal
        });
        
        // Configurer l'application Vue
        this.vueApp.use(pinia);
        
        // Fournir la fonction closeModal via provide/inject
        this.vueApp.provide('closeModal', () => this.close());

        // Monter l'application Vue
        this.vueApp.mount(container);
        console.log('GoalModal: Vue app mounted');

        // Gérer la fermeture proprement
        this.scope.register([], 'Escape', () => {
            this.close();
            return false;
        });
    }

    onClose() {
        console.log('GoalModal: Closing modal');
        
        try {
            // Démonter l'application Vue
            if (this.vueApp) {
                console.log('GoalModal: Unmounting Vue app');
                this.vueApp.unmount();
                this.vueApp = null;
            }
        } catch (error) {
            console.error('GoalModal: Error during cleanup:', error);
        } finally {
            // Laisser Obsidian nettoyer la modale
            super.onClose();
            console.log('GoalModal: Native modal cleanup complete');
        }
    }
} 