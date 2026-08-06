import { App, Modal } from 'obsidian';
import { createApp, type App as VueApp } from 'vue';
import TaskModalContent from './TaskModalContent.vue';
import type { Task } from '../../types/tasks';
import { pinia } from '../../stores';

export class TaskModal extends Modal {
    private vueApp: VueApp | null = null;
    private task?: Task;

    constructor(app: App, task?: Task) {
        super(app);
        this.task = task;
        console.log('TaskModal: Constructor called');
    }

    onOpen() {
        console.log('TaskModal: Opening modal');
        const { contentEl } = this;
        contentEl.empty();
        
        const container = contentEl.createDiv('goalflowz-modal-content');
        console.log('TaskModal: Container created');

        this.vueApp = createApp(TaskModalContent, {
            editingTask: this.task
        });
        
        this.vueApp.use(pinia);
        
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