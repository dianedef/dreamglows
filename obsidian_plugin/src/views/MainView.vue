<template>
    <div class="dreamglows-page">
        <header class="dreamglows-hero">
            <div class="dreamglows-hero-copy">
                <p class="dreamglows-kicker">DreamGlows</p>
                <h1 class="dreamglows-title">Tableau de bord</h1>
                <p class="dreamglows-subtitle">Pilote ta progression quotidienne, tes objectifs et ton rythme de travail.</p>
            </div>
            <div class="dreamglows-time-badge">
                <span>{{ currentDate.toFormat('EEEE, d MMMM yyyy') }}</span>
            </div>
        </header>

        <CheminShell :scope="currentScope" @update:scope="setPathScope">
            <template #tools>
                <button type="button" class="dreamglows-switch" :class="{ active: activeTab === 'stats' }" @click="setActiveTab('stats')">Statistiques</button>
                <button type="button" class="dreamglows-switch" :class="{ active: activeTab === 'profile' }" @click="setActiveTab('profile')">Profil</button>
            </template>
        </CheminShell>

        <div class="dreamglows-header" v-if="activeTab === 'day'">

            <TimeNavigation
                v-if="['day', 'planning'].includes(activeTab)"
                :view="activeTab as 'day' | 'planning'"
                v-model:date="currentDate"
                class="dreamglows-time-nav"
            />
        </div>

        <section v-if="activeTab === 'day'" class="dreamglows-glass-panel">
            <div class="dreamglows-panel-title">
                <span>{{ activeTab === 'day' ? 'Mode journalier' : activeTab === 'planning' ? 'Mode planning' : activeTab === 'goals' ? 'Vue objectifs' : activeTab === 'stats' ? 'Vue progression' : 'Vue profil' }}</span>
                <span class="dreamglows-pill">{{ activeTabLabel }}</span>
            </div>
        </section>

        <section v-if="activeTab === 'day'" class="dreamglows-command-center">
            <article class="dreamglows-command-card">
                <p class="dreamglows-card-kicker">Statut opérationnel</p>
                <h2 class="dreamglows-card-title">Centre de contrôle</h2>
                <p class="dreamglows-card-text">Sélection active : <strong>{{ activeTab }}</strong> · vue courante : <strong>{{ activeTabLabel }}</strong></p>
            </article>

            <article class="dreamglows-command-card">
                <p class="dreamglows-card-kicker">Pilotage</p>
                <p class="dreamglows-card-text">Raccourcis</p>
                <div class="dreamglows-command-actions">
                    <button class="dreamglows-command-btn" :class="{ 'is-active': ['day', 'planning'].includes(activeTab) }" @click="setActiveTab('day')">Aujourd'hui</button>
                    <button class="dreamglows-command-btn" :class="{ 'is-active': ['goals', 'stats', 'profile'].includes(activeTab) }" @click="setActiveTab('goals')">Objectifs</button>
                    <button class="dreamglows-command-btn" :class="{ 'is-active': activeTab === 'planning' }" @click="setActiveTab('planning')">Planning</button>
                </div>
            </article>
        </section>

        <section v-if="activeTab === 'day'" class="dreamglows-command-grid">
            <article
                v-for="metric in commandMetrics"
                :key="metric.label"
                class="dreamglows-command-card dreamglows-kpi-card"
            >
                <p class="dreamglows-card-kicker">{{ metric.label }}</p>
                <p class="dreamglows-kpi-value">{{ metric.value }}</p>
                <p class="dreamglows-card-text">{{ metric.subtitle }}</p>
                <div v-if="metric.progress !== undefined" class="dreamglows-kpi-progress">
                    <span class="dreamglows-progress-track">
                        <span class="dreamglows-progress-fill" :style="{ width: `${Math.min(100, Math.max(0, (metric.progress / (metric.max || 1)) * 100))}%` }"></span>
                    </span>
                </div>
            </article>

            <article class="dreamglows-command-card dreamglows-timeline-card">
                <p class="dreamglows-card-kicker">Flux opérationnel</p>
                <p class="dreamglows-card-title">Timeline rapide</p>
                <ul class="dreamglows-timeline-list">
                    <li v-for="item in liveTimeline" :key="item.time" class="dreamglows-timeline-item">
                        <span class="dreamglows-timeline-time">{{ item.time }}</span>
                        <span :class="['dreamglows-dot', `dreamglows-dot-${item.state}`]"></span>
                        <span class="dreamglows-timeline-text">{{ item.text }}</span>
                    </li>
                </ul>
            </article>
        </section>

        <section
            v-if="currentScope"
            :id="`dreamglows-chemin-panel-${currentScope}`"
            role="tabpanel"
            tabindex="0"
            :aria-labelledby="`dreamglows-chemin-tab-${currentScope}`"
            :data-dg-view="currentScope"
        >
            <component
                :is="currentComponent"
                :contentFiles="contentFiles"
                :app="app"
                :currentDate="currentDate"
                @update:currentDate="currentDate = $event"
            />
        </section>
        <component v-else :is="currentComponent" :contentFiles="contentFiles" :app="app" />
        <p class="sr-only" aria-live="polite">Vue {{ activeTabLabel }} ouverte.</p>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, provide, onMounted, onUnmounted, watch } from 'vue';
import { App, TFile } from 'obsidian';
import { DateTime } from 'luxon';
import JourneyView from './JourneyView.vue';
import StatsView from './StatsView.vue';
import DayView from './DayView.vue';
import PlanningView from './PlanningView.vue';
import ProfileView from './ProfileView.vue';
import HistoryView from './HistoryView.vue';
import CheminShell from '../components/CheminShell.vue';
import TimeNavigation from '../components/TimeNavigation.vue';
import { useSettingsStore } from '../stores/settingsStore';
import { useGoalsStore } from '../stores/goalsStore';
import { useTasksStore } from '../stores/tasksStore';
import { usePathStore, type PathScope } from '../stores/pathStore';

const props = defineProps<{
    contentFiles: TFile[],
    app: App
}>();

provide('app', props.app);

const settingsStore = useSettingsStore();
const goalsStore = useGoalsStore();
const tasksStore = useTasksStore();
const pathStore = usePathStore();
const validTabs = ['day', 'goals', 'planning', 'history', 'stats', 'profile'] as const;
const initialTab = validTabs.includes(settingsStore.settings.lastActiveTab as typeof validTabs[number])
    ? settingsStore.settings.lastActiveTab
    : 'day';
const activeTab = ref(initialTab);

const currentDate = ref(DateTime.now());
provide('currentDate', currentDate);

const scopeToTab: Record<PathScope, string> = { today: 'day', week: 'planning', journey: 'goals', history: 'history' };
const tabToScope: Partial<Record<string, PathScope>> = { day: 'today', planning: 'week', goals: 'journey', history: 'history' };
const currentScope = computed(() => tabToScope[activeTab.value] ?? null);
pathStore.setScope(tabToScope[activeTab.value] ?? 'today');
pathStore.setReferenceDate(currentDate.value.toFormat('yyyy-LL-dd') as any);

watch(currentDate, (value) => pathStore.setReferenceDate(value.toFormat('yyyy-LL-dd') as any));

const setPathScope = (scope: PathScope) => {
    pathStore.setScope(scope);
    setActiveTab(scopeToTab[scope]);
};

const setActiveTab = (tab: string) => {
    if (!validTabs.includes(tab as typeof validTabs[number])) {
        console.error('Tab invalide:', tab);
        return;
    }
    activeTab.value = tab;
    const scope = tabToScope[tab];
    if (scope) pathStore.setScope(scope);
    settingsStore.updateSettings({ lastActiveTab: tab });
};

const handleViewChange = ((event: CustomEvent) => {
    const newTab = event.detail;
    if (!validTabs.includes(newTab as typeof validTabs[number])) {
        console.error("Tab invalide dans l'evenement:", newTab);
        return;
    }
    activeTab.value = newTab;
    const scope = tabToScope[newTab];
    if (scope) pathStore.setScope(scope);
}) as EventListener;

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
            return JourneyView;
        case 'planning':
            return PlanningView;
        case 'history':
            return HistoryView;
        case 'stats':
            return StatsView;
        case 'profile':
            return ProfileView;
        default:
            return DayView;
    }
});

const activeTabLabel = computed(() => {
    if (['day', 'planning'].includes(activeTab.value)) {
        return activeTab.value === 'planning' ? 'Planning interactif' : 'Journal du jour';
    }
    if (activeTab.value === 'history') return 'Histoire du chemin';
    if (['goals', 'stats', 'profile'].includes(activeTab.value)) {
        return activeTab.value === 'goals' ? 'Objectifs actifs' : activeTab.value === 'stats' ? 'Rapports visuels' : 'Données personnelles';
    }
    return 'Accueil';
});

type TimelineState = { time: string; text: string; state: 'ok' | 'info' | 'warn'; };
type MetricState = { label: string; value: string; subtitle: string; progress?: number; max?: number; };

const formatDuration = (minutes = 0) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins} min`;
    if (mins === 0) return `${hours} h`;
    return `${hours} h ${mins} min`;
};

const commandMetrics = computed(() => {
    const isPlanning = activeTab.value === 'planning';
    const goals = goalsStore.goals || [];
    const tasks = tasksStore.tasks || [];

    const doneGoals = goals.filter((goal) => goal.status === 'done' || (goal as any).status === 'completed').length;
    const doneTasks = tasks.filter((task) => task.status === 'done').length;
    const inProgressTasks = tasks.filter((task) => task.status === 'in-progress').length;
    const urgentTasks = tasks.filter((task) => task.priority === 'high' && task.status !== 'done').length;
    const highPriorityTasks = tasks.filter((task) => task.priority === 'high').length;

    const completionRate = goals.length > 0 ? Math.round((doneGoals / goals.length) * 100) : 0;

    const today = currentDate.value.toFormat('yyyy-LL-dd');
    const todayTasks = tasks.filter((task) => {
        const taskDate = DateTime.fromISO(task.startDate, { setZone: true });
        if (!taskDate.isValid) return false;
        return taskDate.toFormat('yyyy-LL-dd') === today;
    });

    const todayPlanned = todayTasks.reduce((sum, task) => sum + (task.plannedMinutes || 0), 0);
    const todayActual = todayTasks.reduce((sum, task) => sum + (task.actualMinutes || 0), 0);

    const cadenceGoal = Math.round(goals.length > 0 ? (doneGoals / goals.length) * 100 : 0);
    const priorityGoal = Math.max(0, Math.round((highPriorityTasks > 0 ? (1 - urgentTasks / highPriorityTasks) * 100 : 0)));
    const avgGoalProgress = goals.length > 0 ? goals.reduce((sum, goal) => sum + (typeof goal.progress === 'number' ? goal.progress : 0), 0) / goals.length : 0;
    const chargeValue = todayTasks.length + doneTasks + inProgressTasks;

    const metrics: MetricState[] = [
        {
            label: 'Cadence',
            value: `${todayTasks.length}/${tasks.length}`,
            subtitle: isPlanning ? "Tâches planifiées aujourd'hui sur le total" : 'Convergence quotidienne',
            progress: cadenceGoal,
            max: 100
        },
        {
            label: 'Temps',
            value: `${formatDuration(todayActual)} / ${formatDuration(todayPlanned)}`,
            subtitle: `${todayTasks.length} tâches du jour`
        },
        {
            label: 'Priorité',
            value: `${urgentTasks} urgente${urgentTasks > 1 ? 's' : ''} en attente`,
            subtitle: highPriorityTasks > 0 ? 'Répartition des tâches critiques' : 'Aucune tâche critique',
            progress: priorityGoal,
            max: 100
        },
        {
            label: 'Performance',
            value: `${completionRate}%`,
            subtitle: `${doneGoals} objectif${doneGoals > 1 ? 's' : ''} terminé${doneGoals > 1 ? 's' : ''} / ${goals.length}`,
            progress: avgGoalProgress,
            max: 100
        },
        {
            label: 'Charge',
            value: `${chargeValue} tâche${chargeValue > 1 ? 's' : ''}`,
            subtitle: `${doneTasks} réalisées · ${inProgressTasks} en cours · ${todayTasks.filter((task) => task.status === 'todo').length} en attente`
        }
    ];

    if (isPlanning) {
        metrics.push({
            label: 'Soutenabilité',
            value: `${doneTasks} / ${tasks.length}`,
            subtitle: 'Progression globale de la journée',
            progress: tasks.length > 0 ? (doneTasks / tasks.length) * 100 : 0,
            max: 100
        });
        metrics.splice(0, 1);
    }

    return metrics;
});

const liveTimeline = computed(() => {
    const now = DateTime.now();
    const events = [] as TimelineState[];
    const currentTab = activeTab.value;

    const addEvent = (time: string | Date, text: string, state: TimelineState['state']) => {
        const dt = typeof time === 'string' ? DateTime.fromISO(time, { setZone: true }) : DateTime.fromJSDate(time);
        if (!dt.isValid) return;
        events.push({ time: dt.toFormat('HH:mm'), text, state });
    };

    const inOrderDate = DateTime.now().toFormat('yyyy-LL-dd');
    const todayTasks = tasksStore.tasks
        .filter((task) => task.startDate.startsWith(inOrderDate) || task.createdAt.startsWith(inOrderDate))
        .slice(0, 8);

    todayTasks.forEach((task) => {
        if (task.status === 'done') {
            addEvent(task.updatedAt || task.createdAt, `Tâche terminée : ${task.title}`, 'ok');
            return;
        }
        if (task.status === 'in-progress') {
            addEvent(task.updatedAt || task.createdAt, `Tâche en cours : ${task.title}`, 'warn');
            return;
        }
        addEvent(task.createdAt, `Tâche créée : ${task.title}`, 'info');
    });

    goalsStore.goals.slice(0, 4).forEach((goal) => {
        if (goal.status === 'done' || (goal as any).status === 'completed') {
            addEvent((goal as any).updatedAt || goal.startDate.toISOString(), `Objectif terminé : ${goal.title}`, 'ok');
        }
    });

    events.sort((a, b) => {
        const aTime = DateTime.fromFormat(a.time, 'HH:mm');
        const bTime = DateTime.fromFormat(b.time, 'HH:mm');
        return bTime.toMillis() - aTime.toMillis();
    });

    if (events.length === 0) {
        return [
            { time: now.minus({ minutes: 30 }).toFormat('HH:mm'), text: `Mode actif : ${currentTab}`, state: currentTab === 'stats' ? 'warn' : 'ok' },
            { time: now.toFormat('HH:mm'), text: 'Pilotage en cours', state: 'info' }
        ];
    }

    return events.slice(0, 8);
});
</script>
