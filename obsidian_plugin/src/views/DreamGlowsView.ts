import { ItemView, WorkspaceLeaf, Plugin } from 'obsidian';
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import MainView from './MainView.vue';
import { registerStyles } from '@/styles/RegisterStyles';
import type { Goal } from '@/types/goals';
import type { Task } from '@/types/tasks';
import type { PathCommandPort } from '@/domain/path/command-port';
import { PATH_COMMAND_PORT_KEY } from '@/application/path-command-port';
import { DREAMGLOWS_UI_CONTEXT_KEY } from '@/application/ui-context';

export interface IDreamGlows extends Plugin {
    savePluginData(goals: Goal[], tasks: Task[]): Promise<void>;
    generateNotes(): Promise<void>;
    readonly pinia: ReturnType<typeof createPinia>;
    readonly pathCommands: PathCommandPort;
}

export class DreamGlowsView extends ItemView {
    private vueApp: any;
    private plugin: IDreamGlows;

    constructor(leaf: WorkspaceLeaf, plugin: IDreamGlows) {
        super(leaf);
        this.plugin = plugin;
    }

    getViewType(): string {
        return 'dreamglows-view';
    }

    getDisplayText(): string {
        return 'DreamGlows';
    }

    getIcon(): string {
        return 'target';
    }

    async onOpen() {
        const container = this.containerEl.children[1];
        container.empty();
        container.createEl("div", { cls: "dreamglows-container" });

        // Enregistrer les styles
        registerStyles('all');

        // Créer l'application Vue avec Pinia
        this.vueApp = createApp(MainView, {
            contentFiles: this.app.vault.getMarkdownFiles(),
            app: this.app
        });
        
        // Utiliser l'instance Pinia existante du plugin
        this.vueApp.use(this.plugin.pinia);
        this.vueApp.provide(PATH_COMMAND_PORT_KEY, this.plugin.pathCommands);
        this.vueApp.provide(DREAMGLOWS_UI_CONTEXT_KEY, { pinia: this.plugin.pinia, pathCommands: this.plugin.pathCommands });
        
        // Monter l'application
        this.vueApp.mount(container.children[0]);
    }

    async onClose() {
        if (this.vueApp) {
            this.vueApp.unmount();
        }
    }
} 
