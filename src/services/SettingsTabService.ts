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
        containerEl.createEl('h3', { text: 'Organisation des notes' });

        new Setting(containerEl)
            .setName('Organisation des notes')
            .setDesc('Choisissez comment organiser vos notes')
            .addDropdown(dropdown => dropdown
                .addOption('monthly', 'Par mois (ex: Janvier/notes)')
                .addOption('flat', 'Structure plate (toutes les notes dans le même dossier)')
                .setValue(this.plugin.settings.folderStructure === 'flat' ? 'flat' : 'monthly')
                .onChange(async (value) => {
                    this.plugin.settings.folderStructure = value as 'monthly' | 'flat';
                    await this.plugin.saveSettings();
                    this.display(); // Rafraîchir pour afficher/masquer les options de langue
                }));

        // Option de langue pour les mois (uniquement si monthly est sélectionné)
        if (this.plugin.settings.folderStructure === 'monthly') {
            new Setting(containerEl)
                .setName('Langue des mois')
                .setDesc('Choisissez la langue pour les noms des mois')
                .addDropdown(dropdown => dropdown
                    .addOption('fr', 'Français (ex: Janvier)')
                    .addOption('en', 'Anglais (ex: January)')
                    .setValue(this.plugin.settings.monthLanguage || 'fr')
                    .onChange(async (value) => {
                        this.plugin.settings.monthLanguage = value as 'fr' | 'en';
                        await this.plugin.saveSettings();
                    }));
        }

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

        // Le template par défaut qu'on peut définir comme constante
        const defaultTemplate = `# 📓 {day}{suffix} {month}

*{MM}/{DD}*

## 🎯 Objectifs du jour

## 📝 Notes

## 📊 Bilan de la journée

`;

        new Setting(containerEl)
            .setName('Structure des notes')
            .setDesc('Choisissez comment organiser vos notes')
            .addDropdown(dropdown => dropdown
                .addOption('1', '📓 1er Janvier 01/01')
                .addOption('2', '📓 1er Février 02/01')
                .setValue(this.plugin.settings.notesFormat || '1')
                .onChange(async (value) => {
                    this.plugin.settings.notesFormat = value as '1' | '2';
                    await this.plugin.saveSettings();
                    this.display();
                }));

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

        // Timeline settings
        containerEl.createEl('h4', { text: 'Timeline' });
        
        new Setting(containerEl)
            .setName('Heure de début')
            .setDesc('Heure de début de la journée dans la timeline')
            .addText(text => text
                .setPlaceholder('08:00')
                .setValue(this.plugin.settings.timelineStartHour || '08:00')
                .onChange(async (value) => {
                    this.plugin.settings.timelineStartHour = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Heure de fin')
            .setDesc('Heure de fin de la journée dans la timeline')
            .addText(text => text
                .setPlaceholder('23:00')
                .setValue(this.plugin.settings.timelineEndHour || '23:00')
                .onChange(async (value) => {
                    this.plugin.settings.timelineEndHour = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Format horaire')
            .setDesc('Format d\'affichage des heures dans la timeline')
            .addDropdown(dropdown => dropdown
                .addOption('24h', '24h (ex: 14:30)')
                .addOption('12h', '12h (ex: 2:30 PM)')
                .setValue(this.plugin.settings.timeFormat)
                .onChange(async (value) => {
                    this.plugin.settings.timeFormat = value as '12h' | '24h';
                    await this.plugin.saveSettings();
                }));

        // Couleurs de fréquence
        containerEl.createEl('h4', { text: 'Couleurs de fréquence' });

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

        // Rituels
        containerEl.createEl('h3', { text: '🕯️ Rituels' });
        
        new Setting(containerEl)
            .setName('Rituels')
            .setDesc('Gérez vos rituels quotidiens')
            .addButton(button => button
                .setButtonText('Ajouter un rituel')
                .onClick(async () => {
                    this.plugin.settings.rituals.push({
                        label: 'Nouveau rituel',
                        isCompleted: false,
                        linkToOptimizer: false,
                        linkToGenerator: false
                    });
                    await this.plugin.saveSettings();
                    this.display();
                }));

        // Liste des rituels existants
        const ritualsContainer = containerEl.createDiv('goalflowz-rituals-container');
        this.plugin.settings.rituals.forEach((ritual, index) => {
            const ritualSetting = new Setting(ritualsContainer)
                .setName('Rituel')
                .addText(text => text
                    .setValue(ritual.label)
                    .onChange(async (value) => {
                        this.plugin.settings.rituals[index].label = value;
                        await this.plugin.saveSettings();
                    }))
                .addToggle(toggle => toggle
                    .setValue(ritual.linkToOptimizer || false)
                    .setTooltip('Lier à l\'optimiseur')
                    .onChange(async (value) => {
                        this.plugin.settings.rituals[index].linkToOptimizer = value;
                        await this.plugin.saveSettings();
                    }))
                .addToggle(toggle => toggle
                    .setValue(ritual.linkToGenerator || false)
                    .setTooltip('Lier au générateur')
                    .onChange(async (value) => {
                        this.plugin.settings.rituals[index].linkToGenerator = value;
                        await this.plugin.saveSettings();
                    }))
                .addButton(button => button
                    .setIcon('trash')
                    .onClick(async () => {
                        this.plugin.settings.rituals.splice(index, 1);
                        await this.plugin.saveSettings();
                        this.display();
                    }));
        });
    }
}