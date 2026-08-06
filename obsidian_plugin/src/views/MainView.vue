<template>
    <div class="goalflowz-container">
        <div class="goalflowz-header">
            <div class="goalflowz-view-switch">
                <div class="goalflowz-view-switch-buttons">
                    <button 
                        :class="{ active: ['day', 'planning'].includes(activeTab) }"
                        @click="setActiveTab(['day', 'planning'].includes(activeTab) ? (activeTab === 'day' ? 'planning' : 'day') : 'day')"
                    >
                        {{ activeTab === 'planning' ? '📋 Planning' : '📅 Aujourd\'hui' }}
                    </button>
                    <button 
                        :class="{ active: ['goals', 'stats', 'profile'].includes(activeTab) }"
                        @click="setActiveTab(['goals', 'stats', 'profile'].includes(activeTab) ? (activeTab === 'goals' ? 'stats' : activeTab === 'stats' ? 'profile' : 'goals') : 'goals')"
                    >
                        {{ activeTab === 'profile' ? '👤 Profil' : activeTab === 'stats' ? '📊 Statistiques' : '🎯 Objectifs' }}
                    </button>
                </div>
            </div>
            <TimeNavigation 
                v-if="['day', 'planning'].includes(activeTab)"
                :view="activeTab as 'day' | 'planning'"
                v-model:date="currentDate"
                class="goalflowz-time-nav"
            />
        </div>

        <component 
            :is="currentComponent" 
            :contentFiles="contentFiles"
            :app="app"
            :currentDate="currentDate"
        />
    </div>
</template>

<script setup lang="ts">
import { ref, computed, provide, onMounted, onUnmounted } from 'vue';
import { App, TFile } from 'obsidian';
import { DateTime } from 'luxon';
import GoalsView from './GoalsView.vue';
import StatsView from './StatsView.vue';
import DayView from './DayView.vue';
import PlanningView from './PlanningView.vue';
import ProfileView from './ProfileView.vue';
import TimeNavigation from '../components/TimeNavigation.vue';
import { useSettingsStore } from '../stores/settingsStore';

const props = defineProps<{
    contentFiles: TFile[],
    app: App
}>();

provide('app', props.app);

const settingsStore = useSettingsStore();
const activeTab = ref(settingsStore.settings.lastActiveTab);

// Ajout de l'état global de la date
const currentDate = ref(DateTime.now());
provide('currentDate', currentDate);

const setActiveTab = (tab: string) => {
    try {
        if (!['day', 'goals', 'planning', 'stats', 'profile'].includes(tab)) {
            console.error('Tab invalide:', tab);
            return;
        }

        console.log('Changement d\'onglet:', {
            ancien: activeTab.value,
            nouveau: tab,
            settings: settingsStore.settings
        });

        activeTab.value = tab;
        settingsStore.updateSettings({ lastActiveTab: tab });
    } catch (error) {
        console.error('Erreur lors du changement d\'onglet:', error);
    }
};

const handleViewChange = ((event: CustomEvent) => {
    try {
        const newTab = event.detail;
        if (!['day', 'goals', 'planning', 'stats', 'profile'].includes(newTab)) {
            console.error('Tab invalide dans l\'événement:', newTab);
            return;
        }

        console.log('Changement de vue:', {
            ancien: activeTab.value,
            nouveau: newTab,
            settings: settingsStore.settings
        });

        activeTab.value = newTab;
    } catch (error) {
        console.error('Erreur lors du changement de vue:', error);
    }
}) as EventListener;

// Écouter l'événement de changement de vue
onMounted(() => {
    try {
        window.addEventListener('view-change', handleViewChange);
        console.log('MainView monté avec:', {
            tab: activeTab.value,
            settings: settingsStore.settings
        });
    } catch (error) {
        console.error('Erreur lors du montage:', error);
    }
});

onUnmounted(() => {
    window.removeEventListener('view-change', handleViewChange);
});

const currentComponent = computed(() => {
    switch (activeTab.value) {
        case 'day':
            return DayView;
        case 'goals':
            return GoalsView;
        case 'planning':
            return PlanningView;
        case 'stats':
            return StatsView;
        case 'profile':
            return ProfileView;
        default:
            return DayView;
    }
});
</script>
