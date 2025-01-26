import { ItemView, WorkspaceLeaf } from 'obsidian';
import { App as VueApp } from 'vue';

export class GoalsView extends ItemView {
    private vueApp: VueApp;

    constructor(leaf: WorkspaceLeaf, vueApp: VueApp) {
        super(leaf);
        this.vueApp = vueApp;
    }

    getViewType(): string {
        return 'goalflowz-goals';
    }

    getDisplayText(): string {
        return 'GoalFlowz';
    }

    async onOpen() {
        const container = this.containerEl.children[1];
        container.empty();
        const vueContainer = container.createDiv({ cls: 'goalflowz-vue-container' });
        this.vueApp.mount(vueContainer);
    }

    async onClose() {
        this.vueApp.unmount();
    }
} 