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

export class GoalModal extends Modal {
    private vueApp: any;
    private editingGoal: Goal | null;

    constructor(app: App, goal?: Goal) {
        super(app);
        this.editingGoal = goal || null;
        console.log('GoalModal: Constructor called', { editingGoal: this.editingGoal });
    }

    onOpen() {
        console.log('GoalModal: Opening modal');
        const { contentEl } = this;
        contentEl.empty();
        
        // Ajouter le titre
        contentEl.createEl('h2', { text: this.editingGoal ? 'Modifier l\'objectif' : 'Nouvel objectif', cls: 'goalflowz-modal-title' });
        
        // Ajouter le contenu
        const contentContainer = contentEl.createDiv({ cls: 'goalflowz-modal-container' });
        
        // Créer et monter l'app Vue
        this.vueApp = createApp(GoalModalContent, {
            editingGoal: this.editingGoal
        });
        this.vueApp.use(pinia);
        
        // Injecter la méthode de fermeture
        this.vueApp.provide('closeModal', () => {
            console.log('GoalModal: Closing from Vue app');
            this.close();
        });
        
        // Monter l'app Vue
        this.vueApp.mount(contentContainer);
        console.log('GoalModal: Vue app mounted');
    }

    onClose() {
        try {
            console.log('GoalModal: Starting cleanup');
            if (this.vueApp) {
                this.vueApp.unmount();
                console.log('GoalModal: Vue app unmounted');
            }
            const { contentEl } = this;
            contentEl.empty();
            console.log('GoalModal: Content cleared');
        } catch (error) {
            console.error('GoalModal: Error during cleanup:', error);
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

    async onload() {
        await this.loadSettings();
        
        // Initialiser Pinia et les stores
        const tempApp = createApp({});
        tempApp.use(pinia);
        
        this.settingsStore = useSettingsStore();
        this.settingsStore.updateSettings(this.settings);
        
        this.goalsStore = useGoalsStore();
        await this.goalsStore.initializeService(this.app);
        
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