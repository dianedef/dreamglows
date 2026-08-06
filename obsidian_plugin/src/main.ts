import { Plugin, WorkspaceLeaf, TFile, Notice, ItemView, App } from 'obsidian';
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { registerStyles, unregisterStyles } from './styles/RegisterStyles';
import { MetadataService } from './services/MetadataService';
import { useSettingsStore } from './stores/settingsStore';
import { useGoalsStore } from './stores/goalsStore';
import { useTasksStore } from './stores/tasksStore';
import { GoalFlowzSettingsTab } from './services/SettingsTabService';
import { NotesGeneratorService } from './services/NotesGeneratorService';
import { TimeManagementService } from './services/TimeManagementService';
import { GoalModal } from './components/modals/GoalModal';
import { TaskModal } from './components/modals/TaskModal';
import { GoalFlowzView, IGoalFlowz } from './views/GoalFlowzView';
import { DateService } from './services/DateService';
import { ValidationService } from './services/ValidationService';
import { FormatterService } from './services/FormatterService';
import { ParserService } from './services/ParserService';
import { EventService } from './services/EventService';
import { StorageService } from './services/StorageService';
import type { Goal } from './types/goals';
import type { Task } from './types/tasks';
import type { GoalFlowzSettings } from './types/settings';
import { DEFAULT_SETTINGS } from './types/settings';
import { v4 as uuidv4 } from 'uuid';

const VIEW_TYPE_GOALFLOWZ = 'goalflowz-view';

interface DefaultTask {
    label: string;
    isCompleted: boolean;
    linkToOptimizer: boolean;
    linkToGenerator: boolean;
}

export default class GoalFlowz extends Plugin implements IGoalFlowz {
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

    // Vue
    private view: GoalFlowzView | null = null;

    // Settings
    settings!: GoalFlowzSettings;

    // Getter pour pinia (requis par l'interface IGoalFlowz)
    get pinia(): ReturnType<typeof createPinia> {
        return this._pinia;
    }

    async onload() {
        try {
            console.log('Initialisation de GoalFlowz...');
            
            // 1. Initialiser les settings (requis pour tout le reste)
            await this.initializeSettings();
            
            // 2. Initialiser le fichier de données
            await this.initializeDataFile();
            
            // 3. Initialiser les services de base
            await this.initializeBaseServices();
            
            // 4. Initialiser les services dépendants
            await this.initializeDependentServices();
            
            // 5. Initialiser les stores et la gestion d'état
            await this.initializeStores();
            
            // 6. Initialiser l'interface utilisateur
            await this.initializeUI();
            
            console.log('GoalFlowz initialisé avec succès');
        } catch (error) {
            console.error('Erreur fatale lors de l\'initialisation de GoalFlowz:', error);
            new Notice('Erreur lors du chargement de GoalFlowz. Vérifiez la console pour plus de détails.');
            throw error;
        }
    }

    private async initializeSettings() {
        console.log('Initialisation des settings...');
        try {
            const loadedData = await this.loadData();
            this.settings = this.validateSettings(loadedData);
            console.log('Settings initialisés:', this.settings);
        } catch (error) {
            console.error('Erreur lors de l\'initialisation des settings:', error);
            this.settings = { ...DEFAULT_SETTINGS };
            console.log('Utilisation des settings par défaut');
        }
    }

    private async initializeDataFile() {
        try {
            const dataPath = '.obsidian/plugins/obs-GoalFlowz/data.json';
            const exists = await this.app.vault.adapter.exists(dataPath);
            
            if (!exists) {
                console.log('Création du fichier de données initial');
                await this.saveData({
                    goals: [],
                    tasks: [],
                    ...DEFAULT_SETTINGS
                });
            } else {
                // Charger les données existantes
                const existingData = await this.loadData();
                console.log('Données existantes:', existingData);
                
                // S'assurer que la structure est complète
                const updatedData = {
                    ...existingData,
                    goals: existingData.goals || [],
                    tasks: existingData.tasks || [],
                    // Convertir les defaultTasks en tâches réelles si nécessaire
                    ...(existingData.defaultTasks && !existingData.tasks ? {
                        tasks: (existingData.defaultTasks as DefaultTask[]).map(dt => ({
                            id: uuidv4(),
                            title: dt.label,
                            description: '',
                            startDate: new Date().toISOString(),
                            priority: 'medium',
                            status: dt.isCompleted ? 'done' : 'todo',
                            tags: [],
                            createdAt: new Date().toISOString(),
                            updatedAt: new Date().toISOString(),
                            linkToOptimizer: dt.linkToOptimizer,
                            linkToGenerator: dt.linkToGenerator
                        }))
                    } : {})
                };
                
                console.log('Structure mise à jour:', updatedData);
                await this.saveData(updatedData);
            }
        } catch (error) {
            console.error('Erreur lors de l\'initialisation du fichier de données:', error);
            throw new Error('Échec de l\'initialisation du fichier de données');
        }
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
        
        // Charger les données initiales
            const data = await this.loadPluginData();
            console.log('Données chargées:', data);
            
            // Mettre à jour les stores en utilisant les actions
            this.settingsStore.$patch({ settings: this.settings });
            await this.goalsStore.setGoals(data.goals);
            await this.tasksStore.setTasks(data.tasks);
            
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
            console.log('🎯 Sauvegarde automatique des données');
            await this.savePluginData(this.goalsStore.goals, this.tasksStore.tasks);
        });

        this.tasksStore.$subscribe(async () => {
            console.log('📝 Sauvegarde automatique des données');
            await this.savePluginData(this.goalsStore.goals, this.tasksStore.tasks);
        });
    }

    private async initializeUI() {
        console.log('Initialisation de l\'interface...');
        try {
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

            console.log('Interface initialisée');
        } catch (error) {
            console.error('Erreur lors de l\'initialisation de l\'interface:', error);
            throw new Error('Échec de l\'initialisation de l\'interface');
        }
    }

    onunload() {
        console.log('Déchargement de GoalFlowz...');
        try {
        unregisterStyles();
        this.app.workspace.detachLeavesOfType(VIEW_TYPE_GOALFLOWZ);
            console.log('GoalFlowz déchargé avec succès');
        } catch (error) {
            console.error('Erreur lors du déchargement de GoalFlowz:', error);
        }
    }

    // Méthodes utilitaires existantes
    async loadPluginData() {
        try {
            const data = await this.loadData();
            return {
                goals: data?.goals || [],
                tasks: data?.tasks || []
            };
        } catch (error) {
            console.error('Erreur lors du chargement des données:', error);
            return { goals: [], tasks: [] };
        }
    }

    async savePluginData(goals: Goal[], tasks: Task[]) {
        try {
            await this.saveData({ goals, tasks });
        } catch (error) {
            console.error('Erreur lors de la sauvegarde des données:', error);
            new Notice('Erreur lors de la sauvegarde des données');
        }
    }

    async saveSettings() {
        console.log('Sauvegarde des settings:', this.settings);
        try {
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
            leaf = workspace.getLeaf('tab');
            await leaf.setViewState({
                    type: VIEW_TYPE_GOALFLOWZ,
                    active: true,
                });
        }
        
        workspace.revealLeaf(leaf);
    }

    private validateSettings(loadedData: any): GoalFlowzSettings {
        const settings = { ...DEFAULT_SETTINGS };

        if (loadedData) {
            // Valider lastActiveTab
            if (loadedData.lastActiveTab && ['day', 'goals', 'planning', 'stats'].includes(loadedData.lastActiveTab)) {
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