import { App, Modal } from 'obsidian';
import { createApp, type App as VueApp } from 'vue';
import TaskModalContent from './TaskModalContent.vue';
import type { Task } from '../../types/tasks';
import { PATH_COMMAND_PORT_KEY } from '../../application/path-command-port';
import { DREAMGLOWS_UI_CONTEXT_KEY, type DreamGlowsUiContext } from '../../application/ui-context';

export class TaskModal extends Modal {
    private vueApp: VueApp | null = null;
    private task?: Task;
    private initialGoalId?: string;
    private context: DreamGlowsUiContext;

    constructor(app: App, context: DreamGlowsUiContext, task?: Task, initialGoalId?: string) {
        super(app);
        this.context = context;
        this.task = task;
        this.initialGoalId = initialGoalId;
        console.log('TaskModal: Constructor called');
    }

    onOpen() {
        console.log('TaskModal: Opening modal');
        const { contentEl } = this;
        contentEl.empty();
        this.modalEl.addClass('dreamglows-task-modal-shell');
        
        const container = contentEl.createDiv('dreamglows-modal-content');
        console.log('TaskModal: Container created');

        this.vueApp = createApp(TaskModalContent, {
            editingTask: this.task,
            initialGoalId: this.initialGoalId
        });
        
        this.vueApp.use(this.context.pinia);
        this.vueApp.provide(PATH_COMMAND_PORT_KEY, this.context.pathCommands);
        this.vueApp.provide(DREAMGLOWS_UI_CONTEXT_KEY, this.context);
        
        // Fournir la fonction closeModal via provide/inject
        this.vueApp.provide('closeModal', () => this.close());

        this.vueApp.mount(container);
        console.log('TaskModal: Vue app mounted');

        this.scope.register([], 'Escape', () => {
            this.close();
            return false;
        });
    }

    onClose() {
        console.log('TaskModal: Closing modal');
        
        try {
            if (this.vueApp) {
                console.log('TaskModal: Unmounting Vue app');
                this.vueApp.unmount();
                this.vueApp = null;
            }
        } catch (error) {
            console.error('TaskModal: Error during cleanup:', error);
        } finally {
            super.onClose();
            console.log('TaskModal: Native modal cleanup complete');
        }
    }
}
