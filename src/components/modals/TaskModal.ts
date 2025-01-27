import { App, MarkdownView } from 'obsidian';
import { createApp } from 'vue';
import TaskModalContent from './TaskModalContent.vue';
import type { Task } from '@/types/tasks';

export class TaskModal {
    private app: App;
    private task?: Task;
    private modalEl: HTMLElement;
    private vueApp: any;

    constructor(app: App, task?: Task) {
        this.app = app;
        this.task = task;
        this.modalEl = document.createElement('div');
        this.modalEl.addClass('goalflowz-modal');
    }

    open() {
        const modalContainer = document.createElement('div');
        modalContainer.addClass('goalflowz-modal-container');
        
        this.modalEl.appendChild(modalContainer);
        document.body.appendChild(this.modalEl);

        this.vueApp = createApp(TaskModalContent, {
            task: this.task,
            onSave: () => {
                this.close();
            },
            onClose: () => {
                this.close();
            }
        });

        this.vueApp.mount(modalContainer);

        // Fermeture au clic en dehors du modal
        this.modalEl.addEventListener('click', (e) => {
            if (e.target === this.modalEl) {
                this.close();
            }
        });
    }

    close() {
        if (this.vueApp) {
            this.vueApp.unmount();
        }
        this.modalEl.remove();
    }
} 