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
import { GoalModal } from './components/modals/GoalModal';
import { TaskModal } from './components/modals/TaskModal';

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
        try {
            // Charger les settings en premier
            await this.loadSettings();
            
            // Initialiser Pinia
            this.pinia = createPinia();
            
            // Initialiser les stores
            this.settingsStore = useSettingsStore(this.pinia);
            this.goalsStore = useGoalsStore(this.pinia);
            this.tasksStore = useTasksStore(this.pinia);
            this.modalStore = useModalStore();
            
            // Initialiser le store avec les settings actuels
            this.settingsStore.$patch({ settings: this.settings });
            
            // Watcher pour la synchronisation bidirectionnelle
            this.register(
                this.settingsStore.$subscribe(async (_mutation, state) => {
                    // Vérifier si les settings ont réellement changé
                    if (JSON.stringify(this.settings) !== JSON.stringify(state.settings)) {
                        this.settings = { ...state.settings };
                        await this.saveSettings();
                    }
                })
            );

            // Initialiser les services avec les settings à jour
            this.modalStore.initialize(this.app);
            this.metadataService = new MetadataService(this.app.vault, this.app.metadataCache);
            this.notesGenerator = new NotesGeneratorService(this.app, this.settings);
            this.timeManager = new TimeManagementService(this.app, this.settings);

            // Enregistrer la vue
            this.registerView(VIEW_TYPE_GOALFLOWZ, (leaf) => {
                this.view = new GoalFlowzView(leaf, this);
                return this.view;
            });

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

            // Commande pour créer une nouvelle tâche
            this.addCommand({
                id: 'create-new-task',
                name: 'Créer une nouvelle tâche',
                callback: () => {
                    const modal = new TaskModal(this.app);
                    modal.open();
                },
                hotkeys: [{ modifiers: ["Ctrl", "Shift"], key: "T" }]
            });

            // Ajouter le ruban
            this.addRibbonIcon('target', 'GoalFlowz', () => {
                this.activateView();
            });

            // Ajouter l'onglet de paramètres
            this.addSettingTab(new GoalFlowzSettingsTab(this.app, this));

            // Enregistrer les styles
            registerStyles('all');

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
        } catch (error) {
            console.error('Erreur lors du chargement de GoalFlowz:', error);
            new Notice('Erreur lors du chargement de GoalFlowz. Vérifiez la console pour plus de détails.');
        }
    }

    onunload() {
        unregisterStyles();
        this.app.workspace.detachLeavesOfType(VIEW_TYPE_GOALFLOWZ);
    }

    async loadSettings() {
        try {
            const loadedData = await this.loadData();
            console.log('Données chargées:', loadedData);

            // Valider et fusionner avec les paramètres par défaut
            const validatedSettings = this.validateSettings(loadedData);
            this.settings = validatedSettings;
            
            console.log('Settings chargés et validés:', this.settings);
        } catch (error) {
            console.error('Erreur lors du chargement des settings:', error);
            // En cas d'erreur, utiliser les paramètres par défaut
            this.settings = { ...DEFAULT_SETTINGS };
        }
    }

    private validateSettings(loadedData: any): GoalFlowzSettings {
        const settings = { ...DEFAULT_SETTINGS };

        // Valider et fusionner chaque propriété
        if (loadedData) {
            // Valider folderStructure
            if (loadedData.folderStructure && ['flat', 'monthly'].includes(loadedData.folderStructure)) {
                settings.folderStructure = loadedData.folderStructure;
            }

            // Valider monthLanguage
            if (loadedData.monthLanguage && ['fr', 'en'].includes(loadedData.monthLanguage)) {
                settings.monthLanguage = loadedData.monthLanguage;
            }

            // Valider notesFormat
            if (loadedData.notesFormat && ['1', '2', 'custom'].includes(loadedData.notesFormat)) {
                settings.notesFormat = loadedData.notesFormat;
            }

            // Valider timeFormat
            if (loadedData.timeFormat && ['12h', '24h'].includes(loadedData.timeFormat)) {
                settings.timeFormat = loadedData.timeFormat;
            }

            // Copier les autres propriétés simples
            if (loadedData.notesPath) settings.notesPath = loadedData.notesPath;
            if (loadedData.customNotesFormat) settings.customNotesFormat = loadedData.customNotesFormat;
            if (loadedData.noteTemplate) settings.noteTemplate = loadedData.noteTemplate;
            if (loadedData.timelineStartHour) settings.timelineStartHour = loadedData.timelineStartHour;
            if (loadedData.timelineEndHour) settings.timelineEndHour = loadedData.timelineEndHour;
            if (loadedData.openAIKey) settings.openAIKey = loadedData.openAIKey;
            if (loadedData.openRouterKey) settings.openRouterKey = loadedData.openRouterKey;

            // Valider les couleurs de fréquence
            if (loadedData.frequencyColors) {
                settings.frequencyColors = {
                    high: loadedData.frequencyColors.high || DEFAULT_SETTINGS.frequencyColors.high,
                    medium: loadedData.frequencyColors.medium || DEFAULT_SETTINGS.frequencyColors.medium,
                    low: loadedData.frequencyColors.low || DEFAULT_SETTINGS.frequencyColors.low
                };
            }

            // Valider les tâches par défaut
            if (Array.isArray(loadedData.defaultTasks)) {
                settings.defaultTasks = loadedData.defaultTasks.map((task: any) => ({
                    label: task.label || 'Nouvelle tâche',
                    isCompleted: !!task.isCompleted,
                    linkToOptimizer: !!task.linkToOptimizer,
                    linkToGenerator: !!task.linkToGenerator
                }));
            }

            // Valider les dossiers de projets
            if (Array.isArray(loadedData.projectFolders)) {
                settings.projectFolders = loadedData.projectFolders.filter((folder: any) => typeof folder === 'string');
            }
        }

        return settings;
    }

    async saveSettings() {
        console.log('Sauvegarde des settings:', this.settings);
        try {
            // Valider les settings avant la sauvegarde
            const validatedSettings = this.validateSettings(this.settings);
            await this.saveData(validatedSettings);
            console.log('Settings sauvegardés avec succès');
        } catch (error) {
            console.error('Erreur lors de la sauvegarde des settings:', error);
            new Notice('Erreur lors de la sauvegarde des paramètres');
        }
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