<template>
    <div class="goalflowz-container">
        <div class="goalflowz-view-switch">
            <button 
                :class="{ active: activeTab === 'day' }"
                @click="setActiveTab('day')"
            >
                📅 Aujourd'hui
            </button>
            <button 
                :class="{ active: activeTab === 'goals' }"
                @click="setActiveTab('goals')"
            >
                🎯 Objectifs
            </button>
            <button 
                :class="{ active: activeTab === 'planning' }"
                @click="setActiveTab('planning')"
            >
                📋 Planning
            </button>
            <button 
                :class="{ active: activeTab === 'stats' }"
                @click="setActiveTab('stats')"
            >
                📊 Statistiques
            </button>
        </div>

        <component 
            :is="currentComponent" 
            :contentFiles="contentFiles"
            :app="app"
        />
        <GoalModal />
    </div>
</template>

<script setup lang="ts">
import { ref, computed, provide, onMounted, onUnmounted } from 'vue';
import { App, TFile } from 'obsidian';
import GoalsView from './GoalsView.vue';
import StatsView from './StatsView.vue';
import DayView from './DayView.vue';
import PlanningView from './PlanningView.vue';
import GoalModal from '@/components/modals/GoalModal.vue';
import { useSettingsStore } from '../stores/settingsStore';

const props = defineProps<{
    contentFiles: TFile[],
    app: App
}>();

provide('app', props.app);

const settingsStore = useSettingsStore();
const activeTab = ref(settingsStore.settings.lastActiveTab);

const setActiveTab = (tab: string) => {
    try {
        if (!['day', 'goals', 'planning', 'stats'].includes(tab)) {
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
        if (!['day', 'goals', 'planning', 'stats'].includes(newTab)) {
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
        default:
            return DayView;
    }
});
</script>