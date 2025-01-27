import { Plugin, WorkspaceLeaf, TFile, Notice, ItemView, App, Modal } from 'obsidian';
import { createApp, watch } from 'vue';
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

        this.vueApp = createApp(MainView, {
            contentFiles: this.app.vault.getMarkdownFiles(),
            app: this.app
        });
        
        this.vueApp.use(pinia);
        
        // Initialiser les stores
        const tasksStore = useTasksStore();
        const goalsStore = useGoalsStore();
        const storageService = new StorageService(this.app);
        
        // Charger les données initiales
        const { goals, tasks } = await storageService.loadData();
        goalsStore.goals = goals;
        tasksStore.tasks = tasks;
        
        // Configurer les watchers pour la sauvegarde automatique
        watch(() => goalsStore.goals, async () => {
            await storageService.saveData(goalsStore.goals, tasksStore.tasks);
        }, { deep: true });
        
        watch(() => tasksStore.tasks, async () => {
            await storageService.saveData(goalsStore.goals, tasksStore.tasks);
        }, { deep: true });
        
        this.vueApp.mount(container.children[0]);
    }

    async onClose() {
        if (this.vueApp) {
            this.vueApp.unmount();
        }
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
    private view: GoalFlowzView | null = null;

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
            (leaf) => {
                this.view = new GoalFlowzView(leaf, this);
                return this.view;
            }
        );

        // Ajouter les commandes
        this.addCommand({
            id: 'open-goalflowz',
            name: 'Ouvrir GoalFlowz',
            callback: () => this.activateView(),
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
        this.addRibbonIcon('target', 'GoalFlowz', () => {
            this.activateView();
        });

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
        this.app.workspace.detachLeavesOfType(VIEW_TYPE_GOALFLOWZ);
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    async activateView() {
        const { workspace } = this.app;

        let leaf = workspace.getLeavesOfType(VIEW_TYPE_GOALFLOWZ)[0];
        if (!leaf) {
            const newLeaf = workspace.getRightLeaf(false);
            if (newLeaf) {
                await newLeaf.setViewState({
                    type: VIEW_TYPE_GOALFLOWZ,
                    active: true,
                });
                leaf = newLeaf;
            } else {
                throw new Error("Impossible de créer une nouvelle feuille de travail");
            }
        }
        workspace.revealLeaf(leaf);
    }

    async generateNotes(): Promise<void> {
        await this.notesGenerator.generateNotes();
    }
}

// Classes de base pour les modales
class BaseModal extends Modal {
    protected vueApp: any = null;

    onClose() {
        if (this.vueApp) {
            this.vueApp.unmount();
            this.vueApp = null;
        }
        super.onClose();
    }
}

export class GoalModal extends BaseModal {
    private goal?: Goal;

    constructor(app: App, goal?: Goal) {
        super(app);
        this.goal = goal;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        
        const modalContent = contentEl.createDiv('goalflowz-modal-content');
        
        const modalStore = useModalStore();
        if (this.goal) {
            modalStore.openGoalModal(this.goal);
        } else {
            modalStore.openGoalModal();
        }

        this.vueApp = createApp(GoalModalContent, {
            editingGoal: this.goal
        });

        this.vueApp.use(pinia);
        this.vueApp.provide('closeModal', () => this.close());
        this.vueApp.mount(modalContent);
    }

    onClose() {
        super.onClose();
        const modalStore = useModalStore();
        modalStore.closeGoalModal();
    }
}

export class CategoryModal extends BaseModal {
    private category: string;

    constructor(app: App, category: string) {
        super(app);
        this.category = category;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        
        const modalContent = contentEl.createDiv('goalflowz-modal-content');
        
        this.vueApp = createApp(CategoryModalContent, {
            category: this.category,
            closeModal: () => this.close()
        });

        this.vueApp.use(pinia);
        this.vueApp.mount(modalContent);
    }
}

export class TaskModal extends BaseModal {
    private task?: Task;

    constructor(app: App, task?: Task) {
        super(app);
        this.task = task;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        
        const modalContent = contentEl.createDiv('goalflowz-modal-content');
        
        this.vueApp = createApp(TaskModalContent, {
            task: this.task,
            onSave: () => this.close(),
            onClose: () => this.close()
        });

        this.vueApp.use(pinia);
        this.vueApp.mount(modalContent);
    }
}