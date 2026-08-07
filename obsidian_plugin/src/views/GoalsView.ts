import { ItemView, WorkspaceLeaf } from 'obsidian';
import { App as VueApp } from 'vue';

export class GoalsView extends ItemView {
    private vueApp: VueApp;

    constructor(leaf: WorkspaceLeaf, vueApp: VueApp) {
        super(leaf);
        this.vueApp = vueApp;
    }

    getViewType(): string {
        return 'dreamglows-goals';
    }

    getDisplayText(): string {
        return 'DreamGlows';
    }

    async onOpen() {
        const container = this.containerEl.children[1];
        container.empty();
        const vueContainer = container.createDiv({ cls: 'dreamglows-vue-container' });
        this.vueApp.mount(vueContainer);
    }

    async onClose() {
        this.vueApp.unmount();
    }
} 
