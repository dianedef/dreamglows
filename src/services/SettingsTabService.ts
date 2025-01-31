import { App, PluginSettingTab, Setting } from 'obsidian';
import type GoalFlowz from '../main';
import NotesGenerator from '../components/notes/NotesGenerator.vue';
import { createApp } from 'vue';
import type { NoteFormat } from '../types/settings';

export class GoalFlowzSettingsTab extends PluginSettingTab {
    plugin: GoalFlowz;
    private notesGeneratorApp: any = null;
    private notesGeneratorContainer: HTMLElement | null = null;

    constructor(app: App, plugin: GoalFlowz) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        
        // Sauvegarder le conteneur du NotesGenerator s'il existe
        if (this.notesGeneratorContainer) {
            this.notesGeneratorContainer.remove();
        }
        
        containerEl.empty();

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
                this.display();
            }));

        new Setting(containerEl)
                .setName('Langue des notes' )
                .setDesc('Choisissez la langue pour les noms des mois et le template des notes')
                .addDropdown(dropdown => dropdown
                    .addOption('fr', 'Français')
                    .addOption('en', 'Anglais')
                    .setValue(this.plugin.settings.monthLanguage || 'fr')
                    .onChange(async (value) => {
                        this.plugin.settings.monthLanguage = value as 'fr' | 'en';
                        await this.plugin.saveSettings();
                        this.display();
                    }));

        // Structure des notes
        new Setting(containerEl)
        .setName('Structure des notes')
        .setDesc('Choisissez le format d\'affichage des notes')
        .addDropdown(dropdown => {
            if (this.plugin.settings.monthLanguage === 'fr') {
                dropdown
                    .addOption('full-date-emoji', '📓 1er Janvier 01-01')
                    .addOption('name-emoji', '📓 1er Janvier')
                    .addOption('short-emoji', '📓 01-01')
                    .addOption('full-write', '✍️ 1er Janvier')
                    .addOption('short-write', '✍️ 01-01')
                    .addOption('name-only', '1er Janvier')
                    .addOption('short-only', '01-01');
            } else {
                dropdown
                    .addOption('full-date-emoji', '📓 1st January 01-01')
                    .addOption('name-emoji', '📓 1st January')
                    .addOption('short-emoji', '📓 01-01')
                    .addOption('full-write', '✍️ 1st January')
                    .addOption('short-write', '✍️ 01-01')
                    .addOption('name-only', '1st January')
                    .addOption('short-only', '01-01');
            }
            
            dropdown.setValue(this.plugin.settings.notesFormat)
                .onChange(async (value) => {
                    this.plugin.settings.notesFormat = value as NoteFormat;
                    await this.plugin.saveSettings();
                });
            return dropdown;
        });

        // Description des bonnes pratiques
        new Setting(containerEl)
        .setName('Le plugin va générer 365 notes pour chacun des 365 jours de l\'année')
            .setDesc(createFragment(fragment => {
                fragment.createSpan({ text: '⚠️ Instructions importantes :', cls: 'setting-warning' });
                fragment.createEl('br');
                fragment.createEl('ul', { cls: 'instructions-list' }, (el: HTMLUListElement) => {
                    el.createEl('li', { text: 'Ne modifiez pas la structure des sections (## année, ### 🎯 Objectifs, etc.)' });
                    el.createEl('li', { text: 'Évitez les caractères spéciaux dans les titres de vos notes' });
                    el.createEl('li', { text: 'Ne déplacez pas les notes générées hors de leur dossier' });
                    el.createEl('li', { text: 'Ne modifiez pas les métadonnées YAML en haut de la note' });
                });
                fragment.createEl('br');
                fragment.createSpan({ text: '💡 Conseils d\'utilisation :', cls: 'setting-tips' });
                fragment.createEl('ul', { cls: 'tips-list' }, (el: HTMLUListElement) => {
                    el.createEl('li', { text: 'Utilisez les sections par année pour suivre votre évolution' });
                    el.createEl('li', { text: 'Comparez vos objectifs et bilans d\'une année à l\'autre' });
                    el.createEl('li', { text: 'Les notes sont organisées pour faciliter la réflexion à long terme' });
                    el.createEl('li', { text: 'Utilisez la vue Planning pour comparer les mêmes jours sur différentes années' });
                    el.createEl('li', { text: 'Profitez des bilans annuels pour définir vos objectifs de l\'année suivante' });
                });
            }));
            
            // Bouton de génération
        this.notesGeneratorContainer = containerEl.createEl('div');
        
        // Si l'app existe déjà, on la démonte proprement
        if (this.notesGeneratorApp) {
            this.notesGeneratorApp.unmount();
        }
        
        this.plugin.app.workspace.onLayoutReady(() => {
            this.notesGeneratorApp = createApp(NotesGenerator, {
                notesGenerator: this.plugin.getNotesGenerator()
            });
            this.notesGeneratorApp.mount(this.notesGeneratorContainer!);
        });
        
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