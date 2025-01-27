import { App } from 'obsidian';
import { createApp } from 'vue';

export class BaseModal {
    protected app: App;
    protected modalEl: HTMLElement;
    protected vueApp: any;

    constructor(app: App) {
        this.app = app;
        this.modalEl = document.createElement('div');
        this.modalEl.addClass('goalflowz-modal');
    }

    protected createContainer() {
        const modalContainer = document.createElement('div');
        modalContainer.addClass('goalflowz-modal-container');
        this.modalEl.appendChild(modalContainer);
        document.body.appendChild(this.modalEl);
        return modalContainer;
    }

    close() {
        if (this.vueApp) {
            this.vueApp.unmount();
        }
        this.modalEl.remove();
    }

    protected setupCloseOnClickOutside() {
        this.modalEl.addEventListener('click', (e) => {
            if (e.target === this.modalEl) {
                this.close();
            }
        });
    }
} 