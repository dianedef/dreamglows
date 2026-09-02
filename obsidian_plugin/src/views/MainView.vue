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
                <button type="button" class="dreamglows-switch" data-dg-tab="stats" :class="{ active: activeTab === 'stats' }" @click="setActiveTab('stats')">Statistiques</button>
                <button type="button" class="dreamglows-switch" data-dg-tab="profile" :class="{ active: activeTab === 'profile' }" @click="setActiveTab('profile')">Profil</button>
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

        <section v-if="activeTab === 'day' && dashboard" class="dreamglows-command-grid" data-dg-dashboard-canonical>
            <article
                v-for="metric in commandMetrics"
                :key="metric.label"
                class="dreamglows-command-card dreamglows-kpi-card"
            >
                <p class="dreamglows-card-kicker">{{ metric.label }}</p>
                <p class="dreamglows-kpi-value">{{ metric.value }}</p>
                <p class="dreamglows-card-text">{{ metric.subtitle }}</p>
                <div v-if="metric.progress !== undefined" class="dreamglows-kpi-progress">
                    <span class="dreamglows-progress-track" role="progressbar" :aria-label="metric.label" aria-valuemin="0" :aria-valuemax="metric.max || 100" :aria-valuenow="Math.round(metric.progress)">
                        <span class="dreamglows-progress-fill" :style="{ width: `${Math.min(100, Math.max(0, (metric.progress / (metric.max || 1)) * 100))}%` }"></span>
                    </span>
                </div>
            </article>

            <article class="dreamglows-command-card dreamglows-timeline-card">
                <p class="dreamglows-card-kicker">Faits du jour</p>
                <h2 id="dreamglows-dashboard-history" class="dreamglows-card-title">Histoire récente</h2>
                <ul v-if="liveTimeline.length" class="dreamglows-timeline-list" aria-labelledby="dreamglows-dashboard-history">
                    <li v-for="item in liveTimeline" :key="item.id" class="dreamglows-timeline-item">
                        <time class="dreamglows-timeline-time" :datetime="item.occurredAt">{{ item.time }}</time>
                        <span :class="['dreamglows-dot', `dreamglows-dot-${item.state}`]" aria-hidden="true"></span>
                        <span class="dreamglows-timeline-text">{{ item.text }}</span>
                    </li>
                </ul>
                <div v-else class="dreamglows-timeline-empty" role="status"><strong>Aucun fait enregistré pour cette journée.</strong><p>Les réalisations, preuves et réflexions apparaîtront ici.</p><button type="button" @click="setPathScope('history')">Ouvrir l'Histoire</button></div>
            </article>
        </section>
        <p v-else-if="activeTab === 'day'" role="status">Chargement du chemin…</p>

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
import { usePathStore, type PathScope } from '../stores/pathStore';
import { dashboardViewModel } from '../domain/path/dashboard-view-model';
import type { PathEventType } from '../domain/path/model';

const props = defineProps<{
    contentFiles: TFile[],
    app: App
}>();

provide('app', props.app);

const settingsStore = useSettingsStore();
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

type MetricState = { label: string; value: string; subtitle: string; progress?: number; max?: number; };

const dashboard = computed(() => pathStore.document && pathStore.todayProjection && pathStore.historyProjection
    ? dashboardViewModel(pathStore.document.envelope, pathStore.todayProjection, pathStore.historyProjection, pathStore.referenceDate)
    : undefined);

const commandMetrics = computed(() => {
    const value = dashboard.value;
    if (!value) return [];
    return [
        { label:'Actions du jour', value:String(value.todayActions.total), subtitle:`${value.todayActions.done} terminées · ${value.todayActions.inProgress} en cours · ${value.todayActions.todo} à faire`, ...(value.todayActions.completionPercent === null ? {} : { progress:value.todayActions.completionPercent,max:100 }) },
        { label:'Actions actives', value:String(value.currentActions.todo + value.currentActions.inProgress), subtitle:`${value.currentActions.done} accomplies sur ${value.currentActions.total}` },
        { label:'Priorités', value:`${value.activeHighPriority} haute${value.activeHighPriority === 1 ? '' : 's'}`, subtitle:value.activeHighPriority ? 'Objectifs et actions prioritaires encore actifs' : 'Aucune priorité haute en attente' },
        { label:'Objectifs', value:`${value.currentGoals.done}/${value.currentGoals.total}`, subtitle:'Objectifs accomplis', progress:value.currentGoals.total ? value.currentGoals.done/value.currentGoals.total*100 : 0, max:100 },
    ] satisfies MetricState[];
});

const eventLabels:Record<PathEventType,string>={'entity-created':'Création','planned-period-changed':'Planification ajustée','entity-completed':'Terminée','entity-reopened':'Rouverte','entity-reparented':'Déplacée dans le parcours','evidence-recorded':'Preuve ajoutée','reflection-recorded':'Réflexion ajoutée'};
const liveTimeline=computed(()=>(dashboard.value?.timeline??[]).slice(0,8).map(item=>({id:item.id,occurredAt:item.event.occurredAt,time:new Intl.DateTimeFormat('fr-FR',{timeZone:'Europe/Paris',hour:'2-digit',minute:'2-digit'}).format(new Date(item.event.occurredAt)),text:`${eventLabels[item.event.type]} : ${item.entity.title}`,state:(item.event.type==='entity-completed'||item.event.type==='evidence-recorded'?'ok':item.event.type==='entity-reopened'?'warn':'info') as 'ok'|'warn'|'info'})));
</script>
