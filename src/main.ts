import { Plugin, WorkspaceLeaf, TFile, Notice, ItemView } from 'obsidian';
import { createApp } from 'vue';
import MainView from './views/MainView.vue';
import { registerStyles, unregisterStyles } from './styles/RegisterStyles';
import { MetadataService } from './services/MetadataService';
import { pinia } from './stores';
import { useSettingsStore } from './stores/settingsStore';
import { useGoalsStore } from './stores/goalsStore';
import type { GoalFlowzSettings } from './types/settings';
import { DEFAULT_SETTINGS } from './types/settings';
import { GoalFlowzSettingsTab } from './services/SettingsTabService';
import { NotesGeneratorService } from './services/NotesGeneratorService';
import { TimeManagementService } from './services/TimeManagementService';

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
        this.vueApp.use(pinia);
        this.vueApp.mount(container.children[0]);
    }

    async onClose() {
        if (this.vueApp) {
            this.vueApp.unmount();
        }
    }
}

export default class GoalFlowz extends Plugin {
    settings: GoalFlowzSettings;
    metadataService: MetadataService;
    settingsStore: ReturnType<typeof useSettingsStore>;
    goalsStore: ReturnType<typeof useGoalsStore>;
    private notesGenerator: NotesGeneratorService;
    private timeManager: TimeManagementService;

    async onload() {
        await this.loadSettings();
        
        // Initialiser Pinia et les stores
        const tempApp = createApp({});
        tempApp.use(pinia);
        
        this.settingsStore = useSettingsStore();
        this.settingsStore.updateSettings(this.settings);
        
        this.goalsStore = useGoalsStore();
        
        // Initialise le service avec MetadataCache
        this.metadataService = new MetadataService(
            this.app.vault,
            this.app.metadataCache
        );

        this.notesGenerator = new NotesGeneratorService(this.app, this.settings);
        this.timeManager = new TimeManagementService(this.app, this.settings);

        // Enregistre la vue personnalisée
        this.registerView(
            VIEW_TYPE_GOALFLOWZ,
            (leaf) => new GoalFlowzView(leaf, this)
        );

        this.addSettingTab(new GoalFlowzSettingsTab(this.app, this));

        this.addCommand({
            id: 'open-goalflowz',
            name: 'Ouvrir GoalFlowz',
            callback: () => this.openGoalFlowz(),
            hotkeys: [{ modifiers: ["Ctrl", "Shift"], key: "O" }]
        });

        this.addCommand({
            id: 'update-notes-new-year',
            name: 'Mettre à jour les notes pour la nouvelle année',
            callback: async () => {
                const currentYear = new Date().getFullYear();
                await this.timeManager.updateNotesForNewYear(currentYear);
            }
        });

        registerStyles('list');

        // Sauvegarder les settings quand ils changent dans le store
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
        
        // Vérifie si la vue est déjà ouverte
        let leaf = workspace.getLeavesOfType(VIEW_TYPE_GOALFLOWZ)[0];
        
        if (!leaf) {
            // Crée une nouvelle feuille dans la zone droite
            const newLeaf = workspace.getRightLeaf(false);
            if (newLeaf) {
                await newLeaf.setViewState({
                    type: VIEW_TYPE_GOALFLOWZ,
                    active: true
                });
                leaf = newLeaf;
            }
        }
        
        // Active la feuille
        if (leaf) {
            workspace.revealLeaf(leaf);
        }
    }

    private async updateSEOMetadata() {
        const activeFile = this.app.workspace.getActiveFile();
        if (!activeFile) {
            new Notice('Aucun fichier actif');
            return;
        }

        try {
            const seoMetadata = await this.metadataService.generateSEOMetadata(activeFile);
            await this.metadataService.updateMetadata(activeFile, seoMetadata);
            new Notice('Métadonnées SEO mises à jour avec succès');
        } catch (error) {
            console.error('Erreur lors de la mise à jour des métadonnées:', error);
            new Notice('Erreur lors de la mise à jour des métadonnées');
        }
    }

    async generateNotes(): Promise<void> {
        await this.notesGenerator.generateNotes();
    }
}