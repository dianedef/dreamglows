import { defineStore } from 'pinia';
import type { GoalFlowzSettings } from '../types/settings';
import { DEFAULT_SETTINGS } from '../types/settings';

interface SettingsState {
    settings: GoalFlowzSettings;
}

export const useSettingsStore = defineStore('settings', {
    state: (): SettingsState => ({
        settings: { ...DEFAULT_SETTINGS }
    }),

    getters: {
        getDefaultTasks: (state) => state.settings.defaultTasks,
        getApiKeys: (state) => ({
            googleApiKey: state.settings.googleApiKey,
            searchEngineId: state.settings.searchEngineId,
            serpApiKey: state.settings.serpApiKey,
            openAIKey: state.settings.openAIKey,
            openRouterKey: state.settings.openRouterKey
        }),
        getProjectFolders: (state) => state.settings.projectFolders,
        getFrequencyColors: (state) => state.settings.frequencyColors
    },

    actions: {
        updateSettings(newSettings: Partial<GoalFlowzSettings>) {
            this.settings = {
                ...this.settings,
                ...newSettings
            };
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