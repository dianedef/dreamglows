import { App, Modal } from 'obsidian';
import { createApp, type App as VueApp } from 'vue';
import { pinia } from '../../stores';
import CategoryModalContent from './CategoryModalContent.vue';

export class CategoryModal extends Modal {
    private vueApp: VueApp | null = null;
    private category: string;

    constructor(app: App, category: string) {
        super(app);
        this.category = category;
        console.log('CategoryModal: Constructor called');
    }

    onOpen() {
        console.log('CategoryModal: Opening modal');
        const { contentEl } = this;
        contentEl.empty();
        
        const container = contentEl.createDiv('dreamglows-modal-content');
        console.log('CategoryModal: Container created');

        this.vueApp = createApp(CategoryModalContent, {
            category: this.category
        });
        
        this.vueApp.use(pinia);
        
        // Fournir la fonction closeModal via provide/inject
        this.vueApp.provide('closeModal', () => this.close());

        this.vueApp.mount(container);
        console.log('CategoryModal: Vue app mounted');

        this.scope.register([], 'Escape', () => {
            this.close();
            return false;
        });
    }

    onClose() {
        console.log('CategoryModal: Closing modal');
        
        try {
            if (this.vueApp) {
                console.log('CategoryModal: Unmounting Vue app');
                this.vueApp.unmount();
                this.vueApp = null;
            }
        } catch (error) {
            console.error('CategoryModal: Error during cleanup:', error);
        } finally {
            super.onClose();
            console.log('CategoryModal: Native modal cleanup complete');
        }
    }
} 