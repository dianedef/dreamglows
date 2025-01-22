import { App, PluginSettingTab, Setting } from 'obsidian';
import type GoalFlowz from '../main';

export class GoalFlowzSettingsTab extends PluginSettingTab {
    plugin: GoalFlowz;

    constructor(app: App, plugin: GoalFlowz) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        containerEl.createEl('h2', { text: 'Paramètres GoalFlowz' });

        // Section NOTES
        containerEl.createEl('h3', { text: '📝 Notes' });

        // Dossier des notes
        new Setting(containerEl)
            .setName('Dossier des notes')
            .setDesc('Choisissez le dossier principal pour vos notes journalières')
            .addText(text => text
                .setPlaceholder('Journal/Notes quotidiennes')
                .setValue(this.plugin.settings.notesPath)
                .onChange(async (value) => {
                    this.plugin.settings.notesPath = value;
                    await this.plugin.saveSettings();
                }));

        // Structure des dossiers
        new Setting(containerEl)
            .setName('Organisation des notes')
            .setDesc('Choisissez comment organiser vos notes')
            .addDropdown(dropdown => dropdown
                .addOption('flat', 'Structure plate (toutes les notes dans le même dossier)')
                .addOption('monthly', 'Par mois (ex: Janvier/notes)')
                .setValue(this.plugin.settings.folderStructure || 'flat')
                .onChange(async (value) => {
                    this.plugin.settings.folderStructure = value;
                    await this.plugin.saveSettings();
                }));

        // Bouton de génération
        new Setting(containerEl)
            .setName('Générer les notes')
            .setDesc('Créer les notes pour le mois en cours')
            .addButton(button => button
                .setButtonText('Générer')
                .setCta() // Met en évidence le bouton
                .onClick(async () => {
                    await this.plugin.generateNotes();
                }));

        // Template des notes
        new Setting(containerEl)
            .setName('Template des notes')
            .setDesc('Personnalisez le template de vos notes journalières')
            .addTextArea(text => text
                .setValue(this.plugin.settings.noteTemplate || defaultTemplate)
                .onChange(async (value) => {
                    this.plugin.settings.noteTemplate = value;
                    await this.plugin.saveSettings();
                }))
            .setClass('template-setting');

        // Le template par défaut qu'on peut définir comme constante
        const defaultTemplate = `# 📓 {day}{suffix} {month}

*{MM}/{DD}*

## 🎯 Objectifs du jour

## 📝 Notes

## 📊 Bilan de la journée

`;

        // Ajout du format des notes
        containerEl.createEl('h3', { text: 'Format des noms de fichiers' });

        new Setting(containerEl)
            .setName('Structure des notes')
            .setDesc('Choisissez comment organiser vos notes')
            .addDropdown(dropdown => dropdown
                .addOption('1', '📓 1er Janvier 01/01')
                .addOption('2', '📓 1er Février 02/01')
                .addOption('custom', 'Format personnalisé')
                .setValue(this.plugin.settings.notesFormat || 'daily')
                .onChange(async (value) => {
                    this.plugin.settings.notesFormat = value;
                    await this.plugin.saveSettings();
                    this.display();
                }));

        // Afficher le champ de format personnalisé si nécessaire
        if (this.plugin.settings.notesFormat === 'custom') {
            new Setting(containerEl)
                .setName('Format personnalisé')
                .setDesc('Utilisez les variables : YYYY (année), MM (mois), DD (jour), WW (semaine)')
                .addText(text => text
                    .setPlaceholder('YYYY/MM/DD')
                    .setValue(this.plugin.settings.customNotesFormat)
                    .onChange(async (value) => {
                        this.plugin.settings.customNotesFormat = value;
                        await this.plugin.saveSettings();
                    }));
        }

        
        // Section IA
        containerEl.createEl('h3', { text: '🤖 Intelligence Artificielle' });

        // API Keys
        new Setting(containerEl)
            .setName('Clé API OpenAI')
            .setDesc('Votre clé API OpenAI')
            .addText(text => text
                .setPlaceholder('sk-...')
                .setValue(this.plugin.settings.openAIKey)
                .onChange(async (value) => {
                    this.plugin.settings.openAIKey = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Clé API OpenRouter')
            .setDesc('Votre clé API OpenRouter (optionnel)')
            .addText(text => text
                .setPlaceholder('sk-...')
                .setValue(this.plugin.settings.openRouterKey)
                .onChange(async (value) => {
                    this.plugin.settings.openRouterKey = value;
                    await this.plugin.saveSettings();
                }));

        // Section Goals
        containerEl.createEl('h3', { text: '🎯 Objectifs' });

        // Couleurs de fréquence
        containerEl.createEl('h3', { text: 'Couleurs de fréquence' });

        new Setting(containerEl)
            .setName('Haute fréquence')
            .addColorPicker(color => color
                .setValue(this.plugin.settings.frequencyColors.high)
                .onChange(async (value) => {
                    this.plugin.settings.frequencyColors.high = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Fréquence moyenne')
            .addColorPicker(color => color
                .setValue(this.plugin.settings.frequencyColors.medium)
                .onChange(async (value) => {
                    this.plugin.settings.frequencyColors.medium = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Basse fréquence')
            .addColorPicker(color => color
                .setValue(this.plugin.settings.frequencyColors.low)
                .onChange(async (value) => {
                    this.plugin.settings.frequencyColors.low = value;
                    await this.plugin.saveSettings();
                }));

        // Tâches par défaut
        containerEl.createEl('h3', { text: 'Tâches par défaut' });
        
        new Setting(containerEl)
            .setName('Tâches par défaut')
            .setDesc('Gérez les tâches par défaut pour les nouveaux objectifs')
            .addButton(button => button
                .setButtonText('Ajouter une tâche')
                .onClick(async () => {
                    this.plugin.settings.defaultTasks.push({
                        label: 'Nouvelle tâche',
                        isCompleted: false,
                        linkToOptimizer: false,
                        linkToGenerator: false
                    });
                    await this.plugin.saveSettings();
                    this.display();
                }));

        // Liste des tâches existantes
        const tasksContainer = containerEl.createDiv('goalflowz-tasks-container');
        this.plugin.settings.defaultTasks.forEach((task, index) => {
            const taskSetting = new Setting(tasksContainer)
                .setName('Tâche')
                .addText(text => text
                    .setValue(task.label)
                    .onChange(async (value) => {
                        this.plugin.settings.defaultTasks[index].label = value;
                        await this.plugin.saveSettings();
                    }))
                .addToggle(toggle => toggle
                    .setValue(task.linkToOptimizer || false)
                    .setTooltip('Lier à l\'optimiseur')
                    .onChange(async (value) => {
                        this.plugin.settings.defaultTasks[index].linkToOptimizer = value;
                        await this.plugin.saveSettings();
                    }))
                .addToggle(toggle => toggle
                    .setValue(task.linkToGenerator || false)
                    .setTooltip('Lier au générateur')
                    .onChange(async (value) => {
                        this.plugin.settings.defaultTasks[index].linkToGenerator = value;
                        await this.plugin.saveSettings();
                    }))
                .addButton(button => button
                    .setIcon('trash')
                    .onClick(async () => {
                        this.plugin.settings.defaultTasks.splice(index, 1);
                        await this.plugin.saveSettings();
                        this.display();
                    }));
        });
    }
}