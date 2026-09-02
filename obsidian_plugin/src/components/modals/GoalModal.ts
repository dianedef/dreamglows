import { App, Modal } from 'obsidian';
import { createApp, type App as VueApp } from 'vue';
import { PATH_COMMAND_PORT_KEY } from '../../application/path-command-port';
import { DREAMGLOWS_UI_CONTEXT_KEY, type DreamGlowsUiContext } from '../../application/ui-context';
import GoalModalContent from './GoalModalContent.vue';
import type { Goal } from '../../types/goals';

export class GoalModal extends Modal {
    private vueApp: VueApp | null = null;
    private goal?: Goal;
    private context: DreamGlowsUiContext;

    constructor(app: App, context: DreamGlowsUiContext, goal?: Goal) {
        super(app);
        this.context = context;
        this.goal = goal;
        console.log('GoalModal: Constructor called');
    }

    onOpen() {
        console.log('GoalModal: Opening modal');
        const { contentEl } = this;
        
        // Nettoyer le contenu existant
        contentEl.empty();
        this.modalEl.addClass('dreamglows-goal-modal-shell');
        
        // Créer le conteneur pour le contenu Vue
        const container = contentEl.createDiv('dreamglows-goal-modal-root');
        console.log('GoalModal: Container created');

        // Créer l'application Vue
        this.vueApp = createApp(GoalModalContent, {
            editingGoal: this.goal
        });
        
        // Configurer l'application Vue
        this.vueApp.use(this.context.pinia);
        this.vueApp.provide(PATH_COMMAND_PORT_KEY, this.context.pathCommands);
        this.vueApp.provide(DREAMGLOWS_UI_CONTEXT_KEY, this.context);
        
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
