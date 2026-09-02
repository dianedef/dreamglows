import { Plugin, WorkspaceLeaf, TFile, Notice, ItemView, App } from 'obsidian';
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { registerStyles, unregisterStyles } from './styles/RegisterStyles';
import { MetadataService } from './services/MetadataService';
import { useSettingsStore } from './stores/settingsStore';
import { useGoalsStore } from './stores/goalsStore';
import { useTasksStore } from './stores/tasksStore';
import { useProgressionStore } from './stores/progressionStore';
import { useFocusSessionsStore } from './stores/focusSessionsStore';
import { usePathStore } from './stores/pathStore';
import { DreamGlowsSettingsTab } from './services/SettingsTabService';
import { NotesGeneratorService } from './services/NotesGeneratorService';
import { TimeManagementService } from './services/TimeManagementService';
import { GoalModal } from './components/modals/GoalModal';
import { TaskModal } from './components/modals/TaskModal';
import { DreamGlowsView, IDreamGlows } from './views/DreamGlowsView';
import { DateService } from './services/DateService';
import { ValidationService } from './services/ValidationService';
import { FormatterService } from './services/FormatterService';
import { ParserService } from './services/ParserService';
import { EventService } from './services/EventService';
import { StorageService } from './services/StorageService';
import type { Goal } from './types/goals';
import type { Task } from './types/tasks';
import type { DreamGlowsSettings } from './types/settings';
import type { FocusSession } from './types/focusSessions';
import { DEFAULT_SETTINGS } from './types/settings';
import { PathRepository } from './domain/path/repository';
import { ObsidianPathRepositoryAdapter } from './domain/path/obsidian-adapter';
import { PathPersistenceCoordinator } from './domain/path/persistence-coordinator';
import {
    mergeLegacyStoreSnapshot,
    projectLegacyStoreSnapshot,
    type LegacyStoreSnapshot
} from './domain/path/legacy-store-bridge';
import type { JsonObject, ZonedInstant } from './domain/path/model';
import { createPathCommandPort, type PathCommandPort } from './domain/path/command-port';
import { v4 as uuidv4 } from 'uuid';
import './styles/dreamglows-tokens.css';
import './styles/goals/task-modal-content.css';
import './styles/goals/goals-modal.css';

const VIEW_TYPE_DREAMGLOWS = 'dreamglows-view';

export default class DreamGlows extends Plugin implements IDreamGlows {
    // Services
    private dateService!: DateService;
    private validationService!: ValidationService;
    private formatterService!: FormatterService;
    private parserService!: ParserService;
    private eventService!: EventService;
    private storageService!: StorageService;
    private metadataService!: MetadataService;
    private notesGenerator!: NotesGeneratorService;
    private timeManager!: TimeManagementService;

    // Stores
    private _pinia!: ReturnType<typeof createPinia>;
    private settingsStore!: ReturnType<typeof useSettingsStore>;
    private goalsStore!: ReturnType<typeof useGoalsStore>;
    private tasksStore!: ReturnType<typeof useTasksStore>;
    private progressionStore!: ReturnType<typeof useProgressionStore>;
    private focusSessionsStore!: ReturnType<typeof useFocusSessionsStore>;
    private pathStore!: ReturnType<typeof usePathStore>;
    private pathPersistence!: PathPersistenceCoordinator;
    private initialStoreSnapshot!: LegacyStoreSnapshot;
    pathCommands!: PathCommandPort;
    private syncingCanonicalToLegacy = false;

    // Vue
    private view: DreamGlowsView | null = null;

    // Settings
    settings!: DreamGlowsSettings;

    // Getter pour pinia (requis par l'interface IDreamGlows)
    get pinia(): ReturnType<typeof createPinia> {
        return this._pinia;
    }

    async onload() {
        try {
            console.log('Initialisation de DreamGlows...');
            
            // 1. Charger une seule fois la source persistée canonique.
            await this.initializePathPersistence();

            // 2. Initialiser les settings (requis pour tout le reste)
            await this.initializeSettings();
            
            // 3. Initialiser les services de base
            await this.initializeBaseServices();
            
            // 4. Initialiser les services dépendants
            await this.initializeDependentServices();
            
            // 5. Initialiser les stores et la gestion d'état
            await this.initializeStores();
            
            // 6. Initialiser l'interface utilisateur
            await this.initializeUI();
            
            console.log('DreamGlows initialisé avec succès');
        } catch (error) {
            console.error('Erreur fatale lors de l\'initialisation de DreamGlows:', error);
            new Notice('Erreur lors du chargement de DreamGlows. Vérifiez la console pour plus de détails.');
            throw error;
        }
    }

    private async initializePathPersistence() {
        const repository = new PathRepository(new ObsidianPathRepositoryAdapter(this));
        this.pathPersistence = new PathPersistenceCoordinator(repository);
        const loaded = await this.pathPersistence.load();
        this.initialStoreSnapshot = projectLegacyStoreSnapshot(loaded.document);

        // A successful legacy read is checkpointed once as a canonical document.
        // Corrupt or unreadable input throws before this point and is never replaced.
        if (loaded.migrated) {
            await this.pathPersistence.update(current =>
                mergeLegacyStoreSnapshot(current, this.initialStoreSnapshot));
        }
        this.pathCommands = createPathCommandPort({
            updateDocument: updater => this.pathPersistence.update(updater),
            afterPersist: document => this.syncCanonicalState(document),
            now: () => new Date().toISOString() as ZonedInstant,
            createId: () => uuidv4()
        });
    }

    private async initializeSettings() {
        console.log('Initialisation des settings...');
        this.settings = this.validateSettings(this.initialStoreSnapshot.settings);
        console.log('Settings initialisés:', this.settings);
    }

    private async initializeBaseServices() {
        console.log('Initialisation des services de base...');
        try {
            // Services sans dépendances
            this.dateService = new DateService(this.settings.monthLanguage, this.settings.notesPath);
            this.eventService = new EventService();
            this.validationService = new ValidationService(this.dateService, this.settings);
            
            console.log('Services de base initialisés');
        } catch (error) {
            console.error('Erreur lors de l\'initialisation des services de base:', error);
            throw new Error('Échec de l\'initialisation des services de base');
        }
    }

    private async initializeDependentServices() {
        console.log('Initialisation des services dépendants...');
        try {
            // Services avec dépendances
            this.formatterService = new FormatterService(this.validationService);
            this.parserService = new ParserService(this.validationService, this.dateService);
            this.storageService = new StorageService(
                this.app,
                this.dateService,
                this.validationService,
                this.formatterService,
                this.parserService,
                this.eventService
            );
            this.metadataService = new MetadataService(this.app.vault, this.app.metadataCache);
            this.notesGenerator = new NotesGeneratorService(
                this.app,
                this.settings,
                this.dateService,
                this.validationService,
                this.storageService
            );
            this.timeManager = new TimeManagementService(this.app, this.settings);
            
            console.log('Services dépendants initialisés');
        } catch (error) {
            console.error('Erreur lors de l\'initialisation des services dépendants:', error);
            throw new Error('Échec de l\'initialisation des services dépendants');
        }
    }

    private async initializeStores() {
        console.log('Initialisation des stores...');
        try {
            // Créer et configurer Pinia
            this._pinia = createPinia();
        
        // Initialiser les stores
            this.settingsStore = useSettingsStore(this._pinia);
            this.goalsStore = useGoalsStore(this._pinia);
            this.tasksStore = useTasksStore(this._pinia);
            this.progressionStore = useProgressionStore(this._pinia);
            this.focusSessionsStore = useFocusSessionsStore(this._pinia);
            this.pathStore = usePathStore(this._pinia);
        
        // Charger les données initiales
            const data = this.initialStoreSnapshot;
            console.log('Données chargées:', data);
            
            // Mettre à jour les stores en utilisant les actions
            this.settingsStore.$patch({ settings: this.settings });
            await this.goalsStore.setGoals(data.goals as unknown as Goal[]);
            await this.tasksStore.setTasks(data.tasks as unknown as Task[]);
            this.progressionStore.hydrate(this.settings.gameProgression);
            this.focusSessionsStore.hydrate(data.focusSessions);
            const currentPathDocument = this.pathPersistence.document;
            if (currentPathDocument) this.pathStore.hydrate(currentPathDocument);
            
            // Configurer les watchers
            this.setupStoreWatchers();
            
            console.log('Stores initialisés avec', data.tasks.length, 'tâches');
        } catch (error) {
            console.error('Erreur lors de l\'initialisation des stores:', error);
            throw new Error('Échec de l\'initialisation des stores');
        }
    }

    private setupStoreWatchers() {
        // Watcher pour les settings
        this.settingsStore.$subscribe(async (_mutation, state) => {
            if (JSON.stringify(this.settings) !== JSON.stringify(state.settings)) {
                this.settings = { ...state.settings };
                await this.saveSettings();
            }
        });

        // Watcher pour les goals et les tâches
        this.goalsStore.$subscribe(async () => {
            if (this.syncingCanonicalToLegacy) return;
            console.log('🎯 Sauvegarde automatique des données');
            await this.savePluginData(this.goalsStore.goals, this.tasksStore.tasks);
        });

        this.tasksStore.$subscribe(async () => {
            if (this.syncingCanonicalToLegacy) return;
            console.log('📝 Sauvegarde automatique des données');
            await this.savePluginData(this.goalsStore.goals, this.tasksStore.tasks);
        });

        this.focusSessionsStore.$subscribe(async () => {
            if (this.syncingCanonicalToLegacy) return;
            await this.savePluginData(this.goalsStore.goals, this.tasksStore.tasks);
        });
    }

    private async initializeUI() {
        console.log('Initialisation de l\'interface...');
        try {
            // Enregistrer la vue
            this.registerView(VIEW_TYPE_DREAMGLOWS, (leaf) => {
                this.view = new DreamGlowsView(leaf, this);
                return this.view;
            });

        // Ajouter les commandes
        this.addCommand({
            id: 'open-dreamglows',
            name: 'Ouvrir DreamGlows',
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
        this.addRibbonIcon('target', 'DreamGlows', () => {
            this.activateView();
        });

        // Ajouter l'onglet de paramètres
        this.addSettingTab(new DreamGlowsSettingsTab(this.app, this));

            console.log('Interface initialisée');
        } catch (error) {
            console.error('Erreur lors de l\'initialisation de l\'interface:', error);
            throw new Error('Échec de l\'initialisation de l\'interface');
        }
    }

    onunload() {
        console.log('Déchargement de DreamGlows...');
        try {
        unregisterStyles();
        this.app.workspace.detachLeavesOfType(VIEW_TYPE_DREAMGLOWS);
            console.log('DreamGlows déchargé avec succès');
        } catch (error) {
            console.error('Erreur lors du déchargement de DreamGlows:', error);
        }
    }

    // Méthodes utilitaires existantes
    async loadPluginData() {
        const current = this.pathPersistence.document;
        if (!current) throw new Error('Chemin repository has not been loaded');
        return projectLegacyStoreSnapshot(current);
    }

    private currentStoreSnapshot(): LegacyStoreSnapshot {
        const json = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
        return {
            goals: json(this.goalsStore.goals) as unknown as JsonObject[],
            tasks: json(this.tasksStore.tasks) as unknown as JsonObject[],
            focusSessions: json(this.focusSessionsStore.sessions) as unknown as JsonObject[],
            settings: json(this.settings) as unknown as JsonObject
        };
    }

    private async persistCurrentState() {
        const saved = await this.pathPersistence.update(current =>
            mergeLegacyStoreSnapshot(current, this.currentStoreSnapshot()));
        this.pathStore.hydrate(saved);
    }

    private async syncCanonicalState(document: import('./domain/path/repository').PathRepositoryDocument) {
        const snapshot = projectLegacyStoreSnapshot(document);
        this.pathStore.hydrate(document);
        this.syncingCanonicalToLegacy = true;
        try {
            await this.goalsStore.setGoals(snapshot.goals as unknown as Goal[]);
            await this.tasksStore.setTasks(snapshot.tasks as unknown as Task[]);
            this.focusSessionsStore.hydrate(snapshot.focusSessions);
        } finally {
            this.syncingCanonicalToLegacy = false;
        }
    }

    async savePluginData(_goals: Goal[], _tasks: Task[]) {
        try {
            await this.persistCurrentState();
        } catch (error) {
            console.error('Erreur lors de la sauvegarde des données:', error);
            new Notice('Erreur lors de la sauvegarde des données');
        }
    }

    async saveSettings() {
        console.log('Sauvegarde des settings:', this.settings);
        try {
            const validatedSettings = this.validateSettings(this.settings);
            this.settings = validatedSettings;
            await this.persistCurrentState();
            console.log('Settings sauvegardés avec succès');
        } catch (error) {
            console.error('Erreur lors de la sauvegarde des settings:', error);
            new Notice('Erreur lors de la sauvegarde des paramètres');
        }
    }

    async activateView() {
        const { workspace } = this.app;
        let leaf = workspace.getLeavesOfType(VIEW_TYPE_DREAMGLOWS)[0];
        
        if (!leaf) {
            leaf = workspace.getLeaf('tab');
            await leaf.setViewState({
                    type: VIEW_TYPE_DREAMGLOWS,
                    active: true,
                });
        }
        
        workspace.revealLeaf(leaf);
    }

    private validateSettings(loadedData: any): DreamGlowsSettings {
        const settings = { ...DEFAULT_SETTINGS };

        if (loadedData) {
            // Valider lastActiveTab
            if (loadedData.lastActiveTab && ['day', 'goals', 'planning', 'history', 'stats', 'profile'].includes(loadedData.lastActiveTab)) {
                settings.lastActiveTab = loadedData.lastActiveTab;
            }

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

            // Charger la progression gamifiée
            if (loadedData.gameProgression) {
                settings.gameProgression = {
                    ...settings.gameProgression,
                    ...loadedData.gameProgression,
                    rewardedByDate: {
                        ...(settings.gameProgression.rewardedByDate || {}),
                        ...(loadedData.gameProgression.rewardedByDate || {})
                    },
                    rewardHistory: [
                        ...(settings.gameProgression.rewardHistory || []),
                        ...(loadedData.gameProgression.rewardHistory || [])
                    ]
                };
            }

            // Valider les dossiers de projets
            if (Array.isArray(loadedData.projectFolders)) {
                settings.projectFolders = loadedData.projectFolders.filter((folder: any) => typeof folder === 'string');
            }
        }

        return settings;
    }

    async generateNotes(): Promise<void> {
        try {
            await this.notesGenerator.generateNotes();
        } catch (error) {
            console.error('Erreur lors de la génération des notes:', error);
            new Notice('Erreur lors de la génération des notes. Vérifiez la console pour plus de détails.');
        }
    }

    getNotesGenerator(): NotesGeneratorService {
        return this.notesGenerator;
    }
}
