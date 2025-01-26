import { App, Modal } from 'obsidian';
import { createApp, type App as VueApp } from 'vue';
import { pinia } from '@/stores';
import GoalModalContent from './GoalModalContent.vue';
import { useModalStore } from '@/stores/modalStore';

export class GoalModal extends Modal {
    private vueApp: VueApp | null = null;

    constructor(app: App) {
        super(app);
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
            onSubmit: () => {
                console.log('GoalModal: Submit callback called');
                this.close();
            },
            onCancel: () => {
                console.log('GoalModal: Cancel callback called');
                this.close();
            }
        });

        // Configurer l'application Vue
        this.vueApp.use(pinia);

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

            // Réinitialiser le store modal
            const modalStore = useModalStore();
            modalStore.closeGoalModal();
            console.log('GoalModal: Modal store reset');
        } catch (error) {
            console.error('GoalModal: Error during cleanup:', error);
        } finally {
            // Laisser Obsidian nettoyer la modale
            super.onClose();
            console.log('GoalModal: Native modal cleanup complete');
        }
    }
} 