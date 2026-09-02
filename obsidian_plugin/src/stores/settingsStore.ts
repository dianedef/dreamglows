import { defineStore } from 'pinia';
import type { DefaultTask, DreamGlowsSettings } from '../types/settings';
import { DEFAULT_SETTINGS } from '../types/settings';

interface SettingsState {
        settings: DreamGlowsSettings;
}

export const useSettingsStore = defineStore('settings', {
    state: (): SettingsState => ({
        settings: { ...DEFAULT_SETTINGS }
    }),

    getters: {
        getDefaultTasks: (state) => state.settings.defaultTasks,
        getApiKeys: (state) => ({
            openAIKey: state.settings.openAIKey,
            openRouterKey: state.settings.openRouterKey
        }),
        getProjectFolders: (state) => state.settings.projectFolders,
        getFrequencyColors: (state) => state.settings.frequencyColors
    },

    actions: {
        updateSettings(newSettings: Partial<DreamGlowsSettings>) {
            try {
                console.log('Mise à jour des paramètres:', {
                    ancien: this.settings,
                    nouveau: newSettings
                });
                
                // Valider lastActiveTab
                if (newSettings.lastActiveTab && !['day', 'goals', 'planning', 'history', 'stats', 'profile'].includes(newSettings.lastActiveTab)) {
                    console.error('Tab invalide dans les nouveaux paramètres:', newSettings.lastActiveTab);
                    return;
                }
                
                this.settings = {
                    ...this.settings,
                    ...newSettings
                };
                
                console.log('Paramètres mis à jour:', this.settings);
            } catch (error) {
                console.error('Erreur lors de la mise à jour des paramètres:', error);
            }
        },

        addDefaultTask(task: DefaultTask) {
            this.settings.defaultTasks.push(task);
        },

        removeDefaultTask(index: number) {
            this.settings.defaultTasks.splice(index, 1);
        },

        updateDefaultTask(index: number, newTask: DefaultTask) {
            this.settings.defaultTasks[index] = newTask;
        }
    }
}); 
