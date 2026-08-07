import { ItemView, WorkspaceLeaf, Plugin } from 'obsidian';
import { createApp, watch } from 'vue';
import { createPinia } from 'pinia';
import MainView from './MainView.vue';
import { useTasksStore } from '@/stores/tasksStore';
import { useGoalsStore } from '@/stores/goalsStore';
import { registerStyles } from '@/styles/RegisterStyles';
import type { Goal } from '@/types/goals';
import type { Task } from '@/types/tasks';

export interface IDreamGlows extends Plugin {
    savePluginData(goals: Goal[], tasks: Task[]): Promise<void>;
    generateNotes(): Promise<void>;
    readonly pinia: ReturnType<typeof createPinia>;
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
        
        // Initialiser les stores
        const tasksStore = useTasksStore(this.plugin.pinia);
        const goalsStore = useGoalsStore(this.plugin.pinia);
        
        console.log('Vue: Goals actuels:', goalsStore.goals);
        console.log('Vue: Tasks actuels:', tasksStore.getTasks);
        
        // Configurer les watchers pour la sauvegarde automatique
        watch(() => goalsStore.goals, async (newGoals) => {
            console.log('Goals changed, saving...', newGoals.length, 'goals');
            await this.plugin.savePluginData(goalsStore.goals, tasksStore.tasks);
        }, { deep: true });
        
        watch(() => tasksStore.tasks, async (newTasks) => {
            console.log('Tasks changed, saving...', newTasks.length, 'tasks');
            await this.plugin.savePluginData(goalsStore.goals, tasksStore.tasks);
        }, { deep: true });
        
        // Monter l'application
        this.vueApp.mount(container.children[0]);
    }

    async onClose() {
        if (this.vueApp) {
            this.vueApp.unmount();
        }
    }
} 
