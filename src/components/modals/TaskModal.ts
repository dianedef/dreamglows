import { App } from 'obsidian';
import { createApp } from 'vue';
import TaskModalContent from './TaskModalContent.vue';
import type { Task } from '@/types/tasks';
import { BaseModal } from './BaseModal';

export class TaskModal extends BaseModal {
    private task?: Task;

    constructor(app: App, task?: Task) {
        super(app);
        this.task = task;
    }

    open() {
        const modalContainer = this.createContainer();

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
        this.setupCloseOnClickOutside();
    }
} 