import { Plugin, WorkspaceLeaf, TFile, Notice, ItemView, App, Modal } from 'obsidian';
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import MainView from './views/MainView.vue';
import { registerStyles, unregisterStyles } from './styles/RegisterStyles';
import { MetadataService } from './services/MetadataService';
import { pinia } from './stores';
import { useSettingsStore } from './stores/settingsStore';
import { useGoalsStore } from './stores/goalsStore';
import type { Goal } from './types/goals';
import type { GoalFlowzSettings } from './types/settings';
import { DEFAULT_SETTINGS } from './types/settings';
import { GoalFlowzSettingsTab } from './services/SettingsTabService';
import { NotesGeneratorService } from './services/NotesGeneratorService';
import { TimeManagementService } from './services/TimeManagementService';
import { useModalStore } from './stores/modalStore';
import { GoalsView } from './views/GoalsView';
import GoalModalContent from './components/modals/GoalModalContent.vue';
import CategoryModalContent from './components/modals/CategoryModalContent.vue';
import { useTasksStore } from './stores/tasksStore';
import { StorageService } from './services/StorageService';
import { watch } from 'vue';
import TaskModalContent from './components/modals/TaskModalContent.vue';
import type { Task } from './types/tasks';

const VIEW_TYPE_GOALFLOWZ = 'goalflowz-view';

class GoalFlowzView extends ItemView {
    private vueApp: any;
    private plugin: GoalFlowz;

    constructor(leaf: WorkspaceLeaf, plugin: GoalFlowz) {
        super(leaf);
        this.plugin = plugin;
    }

    getViewType(): string {
        return VIEW_TYPE_GOALFLOWZ;
    }

    getDisplayText(): string {
        return 'GoalFlowz';
    }

    getIcon(): string {
        return 'target';
    }

    async onOpen() {
        const container = this.containerEl.children[1];
        container.empty();
        container.createEl("div", { cls: "goalflowz-container" });

        // Créer une nouvelle instance Vue pour cette vue
        this.vueApp = createApp(MainView, {
            contentFiles: this.app.vault.getMarkdownFiles(),
            app: this.app
        });
        
        // Utiliser Pinia
        this.vueApp.use(pinia);
        
        // Monter l'application
        this.vueApp.mount(container.children[0]);
    }

    async onClose() {
        if (this.vueApp) {
            this.vueApp.unmount();
        }
    }
}

class GoalModal extends Modal {
    app: App;
    goal: Goal | undefined;
    vueApp: any = null;

    constructor(app: App, goal?: Goal) {
        super(app);
        this.app = app;
        this.goal = goal;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.createEl('h2', { text: this.goal ? 'Modifier l\'objectif' : 'Nouvel objectif' });
        const modalContent = contentEl.createDiv('goalflowz-modal-content');
        this.vueApp = createApp(GoalModalContent, {
            goal: this.goal,
            closeModal: () => this.close()
        }).mount(modalContent);
    }

    onClose() {
        if (this.vueApp) {
            this.vueApp.$.appContext.app.unmount();
            this.vueApp = null;
        }
        super.onClose();
    }
}

export class CategoryModal extends Modal {
    private app: App;
    private category: string;
    private vueApp: any = null;

    constructor(app: App, category: string) {
        super(app);
        this.app = app;
        this.category = category;
        console.log('CategoryModal: Constructor called', { category });
    }

    onOpen() {
        console.log('CategoryModal: Opening modal');
        const { contentEl } = this;

        // Titre de la modale
        contentEl.createEl('h2', { text: 'Gérer la catégorie' });

        // Créer un conteneur pour l'app Vue
        const modalContent = contentEl.createDiv('goalflowz-modal-content');

        // Monter l'app Vue
        this.vueApp = createApp(CategoryModalContent, {
            category: this.category,
            closeModal: () => this.close()
        }).mount(modalContent);

        console.log('CategoryModal: Vue app mounted');
    }

    onClose() {
        try {
            if (this.vueApp) {
                this.vueApp.$.appContext.app.unmount();
                this.vueApp = null;
            }
        } catch (error) {
            console.error('CategoryModal: Error during cleanup:', error);
        } finally {
            super.onClose();
        }
    }
}

class TaskModal extends Modal {
    app: App;
    task: Task | undefined;
    vueApp: any = null;

    constructor(app: App, task?: Task) {
        super(app);
        this.app = app;
        this.task = task;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.createEl('h2', { text: this.task ? 'Modifier la tâche' : 'Nouvelle tâche' });
        const modalContent = contentEl.createDiv('goalflowz-modal-content');
        this.vueApp = createApp(TaskModalContent, {
            task: this.task,
            closeModal: () => this.close()
        }).mount(modalContent);
    }

    onClose() {
        if (this.vueApp) {
            this.vueApp.$.appContext.app.unmount();
            this.vueApp = null;
        }
        super.onClose();
    }
}

export default class GoalFlowz extends Plugin {
    settings!: GoalFlowzSettings;
    metadataService!: MetadataService;
    settingsStore!: ReturnType<typeof useSettingsStore>;
    goalsStore!: ReturnType<typeof useGoalsStore>;
    modalStore!: ReturnType<typeof useModalStore>;
    private notesGenerator!: NotesGeneratorService;
    private timeManager!: TimeManagementService;
    private tasksStore!: ReturnType<typeof useTasksStore>;
    private pinia!: ReturnType<typeof createPinia>;

    async onload() {
        await this.loadSettings();
        
        // Initialiser Pinia et les stores
        this.pinia = createPinia();
        this.goalsStore = useGoalsStore(this.pinia);
        this.tasksStore = useTasksStore(this.pinia);
        
        this.settingsStore = useSettingsStore();
        this.settingsStore.updateSettings(this.settings);
        
        this.modalStore = useModalStore();
        this.modalStore.initialize(this.app);
        
        // Initialise les services
        this.metadataService = new MetadataService(
            this.app.vault,
            this.app.metadataCache
        );
        this.notesGenerator = new NotesGeneratorService(this.app, this.settings);
        this.timeManager = new TimeManagementService(this.app, this.settings);

        // Enregistre la vue principale
        this.registerView(
            VIEW_TYPE_GOALFLOWZ,
            (leaf) => new GoalFlowzView(leaf, this)
        );

        // Ajouter les commandes
        this.addCommand({
            id: 'open-goalflowz',
            name: 'Ouvrir GoalFlowz',
            callback: () => this.openGoalFlowz(),
            hotkeys: [{ modifiers: ["Ctrl", "Shift"], key: "O" }]
        });

        this.addCommand({
            id: 'new-goal',
            name: 'Nouvel objectif',
            callback: () => {
                console.log('Command: Opening goal modal');
                const modal = new GoalModal(this.app);
                modal.open();
            },
            hotkeys: [{ modifiers: ["Ctrl", "Shift"], key: "G" }]
        });

        // Ajouter le ruban
        this.addRibbonIcon('target', 'GoalFlowz', () => this.openGoalFlowz());

        // Ajouter l'onglet de paramètres
        this.addSettingTab(new GoalFlowzSettingsTab(this.app, this));

        // Enregistrer les styles
        registerStyles('all');

        // Sauvegarder les settings quand ils changent
        this.register(
            this.settingsStore.$subscribe((mutation, state) => {
                this.settings = state.settings;
                this.saveSettings();
            })
        );

        // Chargement des données
        const storageService = new StorageService(this.app);
        const data = await storageService.loadData();
        this.goalsStore.$patch({ goals: data.goals });
        this.tasksStore.$patch({ tasks: data.tasks });

        // Sauvegarde automatique des données
        watch(
            [() => this.goalsStore.goals, () => this.tasksStore.tasks],
            async ([goals, tasks]) => {
                await storageService.saveData(goals, tasks);
            },
            { deep: true }
        );
    }

    onunload() {
        unregisterStyles();
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    private async openGoalFlowz() {
        const workspace = this.app.workspace;
        let leaf = workspace.getLeavesOfType(VIEW_TYPE_GOALFLOWZ)[0];
        
        if (!leaf) {
            const newLeaf = workspace.getRightLeaf(false);
            if (newLeaf) {
                await newLeaf.setViewState({
                    type: VIEW_TYPE_GOALFLOWZ,
                    active: true
                });
                leaf = newLeaf;
            }
        }
        
        if (leaf) {
            workspace.revealLeaf(leaf);
        }
    }

    async generateNotes(): Promise<void> {
        await this.notesGenerator.generateNotes();
    }
}

// Export des classes modales
export { GoalModal, TaskModal };