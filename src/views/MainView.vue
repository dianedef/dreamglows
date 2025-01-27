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
    activeTab.value = tab;
    settingsStore.updateSettings({ lastActiveTab: tab });
};

const handleViewChange = ((event: CustomEvent) => {
    activeTab.value = event.detail;
}) as EventListener;

// Écouter l'événement de changement de vue
onMounted(() => {
    window.addEventListener('view-change', handleViewChange);
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