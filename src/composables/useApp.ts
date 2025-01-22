import { inject } from 'vue';
import { App } from 'obsidian';
import { useSettingsStore } from '../stores/settingsStore';

export function useApp() {
    const app = inject<App>('app');
    const settingsStore = useSettingsStore();

    if (!app) {
        throw new Error('useApp() doit être utilisé dans un composant avec l\'app injectée');
    }

    return {
        app,
        settings: settingsStore.settings
    };
} 