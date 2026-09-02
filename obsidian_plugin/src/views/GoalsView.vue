<template>
  <div class="dreamglows-goals-view">
    <header class="dreamglows-goals-header">
      <div>
        <h2>Objectifs</h2>
        <p class="dreamglows-goals-subtitle">Du rêve à l’action, dans une seule arborescence</p>
      </div>
      <button type="button" class="dreamglows-add-goal-btn" @click="openNewGoalModal">+ Nouvel objectif</button>
    </header>

    <section class="dreamglows-goals-overview" aria-label="Vue d’ensemble">
      <article v-for="metric in goalMetrics" :key="metric.label" class="dreamglows-goals-metric">
        <span class="dreamglows-goals-metric-label">{{ metric.label }}</span>
        <strong class="dreamglows-goals-metric-value">{{ metric.value }}</strong>
        <span class="dreamglows-goals-metric-subtitle">{{ metric.subtitle }}</span>
      </article>
    </section>

    <div class="dreamglows-goals-layout">
      <div class="dreamglows-goal-tree-panel" :style="{ width: `${mainWidth}%` }">
        <GoalTree
          :goals="goalsStore.goals"
          :tasks="tasksStore.tasks"
          :selected-key="selectedRow?.key || null"
          @select="selectRow"
          @edit="editRow"
        />
      </div>
      <div
        class="dreamglows-resize-handle"
        role="separator"
        aria-label="Redimensionner les panneaux"
        aria-orientation="vertical"
        :aria-valuenow="Math.round(mainWidth)"
        tabindex="0"
        @mousedown="startResize"
        @keydown.left.prevent="resizeBy(-5)"
        @keydown.right.prevent="resizeBy(5)"
      ></div>
      <aside class="dreamglows-goal-detail" :style="{ width: `${100 - mainWidth}%` }" aria-live="polite">
        <template v-if="selectedRow">
          <div class="dreamglows-goal-detail__eyebrow">{{ selectedRow.type === 'goal' ? 'Objectif' : 'Tâche' }}</div>
          <h3>{{ selectedRow.title }}</h3>
          <div class="dreamglows-goal-detail__badges">
            <span>{{ statusLabel(selectedRow.status) }}</span>
            <span v-if="selectedPriority">Priorité {{ priorityLabel(selectedPriority) }}</span>
          </div>

          <p v-if="selectedDescription" class="dreamglows-goal-detail__description">{{ selectedDescription }}</p>
          <p v-else class="dreamglows-goal-detail__description is-empty">Aucune description pour le moment.</p>

          <section v-if="selectedRow.type === 'goal'" class="dreamglows-goal-detail__section">
            <div class="dreamglows-goal-detail__section-title">
              <span>Progression</span><strong>{{ selectedRow.progress }}%</strong>
            </div>
            <div class="dreamglows-goal-detail__progress" role="progressbar" aria-label="Progression de l’objectif" aria-valuemin="0" aria-valuemax="100" :aria-valuenow="selectedRow.progress">
              <span :style="{ width: `${selectedRow.progress}%` }"></span>
            </div>
          </section>

          <dl class="dreamglows-goal-detail__facts">
            <template v-if="selectedDate('start')"><dt>Début</dt><dd>{{ selectedDate('start') }}</dd></template>
            <template v-if="selectedDate('end')"><dt>Échéance</dt><dd>{{ selectedDate('end') }}</dd></template>
            <template v-if="selectedTags.length"><dt>Tags</dt><dd>{{ selectedTags.map((tag) => `#${tag}`).join(' ') }}</dd></template>
          </dl>

          <div class="dreamglows-goal-detail__actions">
            <button type="button" class="mod-cta" @click="editRow(selectedRow)">Modifier</button>
            <button v-if="selectedRow.type === 'goal'" type="button" @click="createTaskForGoal">+ Ajouter une tâche</button>
          </div>
          <p class="dreamglows-goal-detail__hint">Double-cliquez aussi sur un élément de l’arbre pour le modifier.</p>
        </template>
        <div v-else class="dreamglows-goal-detail__empty">
          <span aria-hidden="true">↖</span>
          <strong>Sélectionnez un élément</strong>
          <p>Son contexte, sa progression et ses actions apparaîtront ici.</p>
        </div>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import GoalTree, { type GoalTreeRow } from '@/components/GoalTree.vue';
import { useGoalsStore } from '@/stores/goalsStore';
import { useTasksStore } from '@/stores/tasksStore';
import { useDreamGlowsUiContext } from '@/application/ui-context';
import { useSettingsStore } from '@/stores/settingsStore';
import { GoalModal } from '@/components/modals/GoalModal';
import { TaskModal } from '@/components/modals/TaskModal';
import type { Goal } from '@/types/goals';
import type { Task } from '@/types/tasks';

const props = defineProps<{ contentFiles: any[]; app: any }>();
const goalsStore = useGoalsStore();
const tasksStore = useTasksStore();
const uiContext = useDreamGlowsUiContext();
const settingsStore = useSettingsStore();
const selectedRow = ref<GoalTreeRow | null>(null);
const mainWidth = ref(55);
const isResizing = ref(false);
const startX = ref(0);
const startWidth = ref(0);
const MIN_PANEL_WIDTH = 35;
const MAX_PANEL_WIDTH = 70;

const normalizeGoalStatus = (status: unknown) => status === 'in_progress' ? 'in-progress' : String(status || 'todo');
const readProgress = (goal: Goal) => Math.min(100, Math.max(0, Number(goal.progress) || 0));
const goalMetrics = computed(() => {
  const goals = goalsStore.goals;
  const tasks = tasksStore.tasks;
  const doneGoals = goals.filter((goal) => normalizeGoalStatus(goal.status) === 'done').length;
  const avg = goals.length ? goals.reduce((sum, goal) => sum + readProgress(goal), 0) / goals.length : 0;
  return [
    { label: 'Objectifs actifs', value: String(goals.length - doneGoals), subtitle: `${goals.length} au total` },
    { label: 'Objectifs terminés', value: String(doneGoals), subtitle: goals.length ? `${Math.round(doneGoals / goals.length * 100)}% de réussite` : '0% de réussite' },
    { label: 'Tâches en cours', value: String(tasks.filter((task) => task.status === 'in-progress').length), subtitle: `${tasks.filter((task) => task.status === 'done').length} terminées` },
    { label: 'Progression globale', value: `${Math.round(avg)}%`, subtitle: 'moyenne des objectifs' }
  ];
});

const selectedDescription = computed(() => String((selectedRow.value?.source as Goal | Task | undefined)?.description || ''));
const selectedPriority = computed(() => String((selectedRow.value?.source as Goal | Task | undefined as any)?.priority || ''));
const selectedTags = computed<string[]>(() => {
  const tags = (selectedRow.value?.source as Task | undefined)?.tags;
  return Array.isArray(tags) ? tags.map(String) : [];
});
const statusLabel = (status: string) => ({ todo: 'À faire', in_progress: 'En cours', 'in-progress': 'En cours', done: 'Terminé', cancelled: 'En pause' }[status] || status);
const priorityLabel = (priority: string) => ({ high: 'haute', medium: 'moyenne', low: 'basse' }[priority] || priority);
const selectedDate = (kind: 'start' | 'end') => {
  if (!selectedRow.value) return '';
  const source = selectedRow.value.source as any;
  const value = kind === 'start' ? source.startDate : source.dueDate || source.endDate;
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('fr-FR');
};

const selectRow = (row: GoalTreeRow) => {
  selectedRow.value = row;
  goalsStore.setSelectedGoal(row.type === 'goal' ? row.id : null);
};
const editRow = (row: GoalTreeRow) => {
  row.type === 'goal'
    ? new GoalModal(props.app, uiContext, row.source as Goal).open()
    : new TaskModal(props.app, uiContext, row.source as Task).open();
};
const openNewGoalModal = () => new GoalModal(props.app, uiContext).open();
const createTaskForGoal = () => {
  if (!selectedRow.value || selectedRow.value.type !== 'goal') return;
  new TaskModal(props.app, uiContext, undefined, selectedRow.value.id).open();
};

const resizeBy = (delta: number) => {
  mainWidth.value = Math.max(MIN_PANEL_WIDTH, Math.min(MAX_PANEL_WIDTH, mainWidth.value + delta));
  settingsStore.updateSettings({ lastMainWidth: mainWidth.value });
};
const startResize = (event: MouseEvent) => {
  isResizing.value = true; startX.value = event.clientX; startWidth.value = mainWidth.value;
  document.addEventListener('mousemove', handleResize); document.addEventListener('mouseup', stopResize);
  document.body.style.cursor = 'ew-resize'; document.body.style.userSelect = 'none';
};
const handleResize = (event: MouseEvent) => {
  if (!isResizing.value) return;
  const width = document.querySelector('.dreamglows-goals-layout')?.clientWidth || 0;
  if (!width) return;
  mainWidth.value = Math.max(MIN_PANEL_WIDTH, Math.min(MAX_PANEL_WIDTH, startWidth.value + ((event.clientX - startX.value) / width * 100)));
};
const stopResize = () => {
  if (isResizing.value) settingsStore.updateSettings({ lastMainWidth: mainWidth.value });
  isResizing.value = false; document.removeEventListener('mousemove', handleResize); document.removeEventListener('mouseup', stopResize);
  document.body.style.cursor = ''; document.body.style.userSelect = '';
};
onMounted(() => { mainWidth.value = settingsStore.settings.lastMainWidth || 55; });
onUnmounted(stopResize);
</script>

<style scoped>
.dreamglows-goals-view { height: calc(100vh - 80px); display: flex; flex-direction: column; padding: 20px; box-sizing: border-box; color: var(--text-normal); }
.dreamglows-goals-header { display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-bottom: .85rem; }
.dreamglows-goals-header h2 { margin: 0; }
.dreamglows-goals-subtitle { margin: .3rem 0 0; color: var(--text-muted); font-size: .88rem; }
.dreamglows-goals-overview { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: .7rem; margin-bottom: .85rem; }
.dreamglows-goals-metric { border: 1px solid var(--background-modifier-border); border-radius: 12px; padding: .75rem .8rem; background: var(--background-primary-alt); }
.dreamglows-goals-metric-label { display: block; color: var(--text-muted); font-size: .7rem; text-transform: uppercase; letter-spacing: .06em; }
.dreamglows-goals-metric-value { display: block; margin: .35rem 0 .15rem; font-size: 1.4rem; }
.dreamglows-goals-metric-subtitle { color: var(--text-muted); font-size: .78rem; }
.dreamglows-goals-layout { display: flex; flex: 1; min-height: 420px; overflow: hidden; }
.dreamglows-goal-tree-panel, .dreamglows-goal-detail { min-width: 0; overflow: hidden; border: 1px solid var(--background-modifier-border); border-radius: 14px; background: var(--background-primary-alt); }
.dreamglows-resize-handle { flex: 0 0 .7rem; margin: .5rem .15rem; border-radius: 999px; cursor: ew-resize; }
.dreamglows-resize-handle:hover, .dreamglows-resize-handle:focus-visible { background: color-mix(in srgb, var(--interactive-accent) 35%, transparent); outline: none; }
.dreamglows-goal-detail { padding: 1.3rem; overflow-y: auto; box-sizing: border-box; }
.dreamglows-goal-detail__eyebrow { color: var(--text-accent); font-size: .72rem; font-weight: 650; text-transform: uppercase; letter-spacing: .08em; }
.dreamglows-goal-detail h3 { margin: .35rem 0 .75rem; font-size: 1.3rem; }
.dreamglows-goal-detail__badges { display: flex; flex-wrap: wrap; gap: .4rem; }
.dreamglows-goal-detail__badges span { padding: .22rem .55rem; border-radius: 999px; background: var(--background-modifier-hover); color: var(--text-muted); font-size: .72rem; }
.dreamglows-goal-detail__description { margin: 1.1rem 0; line-height: 1.55; white-space: pre-wrap; }
.dreamglows-goal-detail__description.is-empty, .dreamglows-goal-detail__hint { color: var(--text-faint); font-style: italic; }
.dreamglows-goal-detail__section { margin: 1.2rem 0; }
.dreamglows-goal-detail__section-title { display: flex; justify-content: space-between; margin-bottom: .45rem; font-size: .82rem; }
.dreamglows-goal-detail__progress { height: 8px; overflow: hidden; border-radius: 999px; background: var(--background-modifier-border); }
.dreamglows-goal-detail__progress span { display: block; height: 100%; border-radius: inherit; background: var(--interactive-accent); }
.dreamglows-goal-detail__facts { display: grid; grid-template-columns: auto 1fr; gap: .45rem 1rem; margin: 1.2rem 0; font-size: .82rem; }
.dreamglows-goal-detail__facts dt { color: var(--text-muted); }.dreamglows-goal-detail__facts dd { margin: 0; }
.dreamglows-goal-detail__actions { display: flex; flex-wrap: wrap; gap: .55rem; margin-top: 1.3rem; }
.dreamglows-goal-detail__hint { font-size: .72rem; }
.dreamglows-goal-detail__empty { display: grid; place-items: center; align-content: center; height: 100%; text-align: center; color: var(--text-muted); }
.dreamglows-goal-detail__empty span { color: var(--text-accent); font-size: 2rem; }.dreamglows-goal-detail__empty strong { color: var(--text-normal); }.dreamglows-goal-detail__empty p { max-width: 17rem; font-size: .82rem; }
@media (max-width: 980px) { .dreamglows-goals-overview { grid-template-columns: repeat(2, 1fr); } .dreamglows-goals-layout { flex-direction: column; overflow: visible; } .dreamglows-goal-tree-panel, .dreamglows-goal-detail { width: 100% !important; min-height: 350px; } .dreamglows-resize-handle { display: none; } .dreamglows-goals-view { height: auto; } }
@media (max-width: 560px) { .dreamglows-goals-overview { grid-template-columns: 1fr 1fr; } .dreamglows-goals-header { align-items: flex-start; } }
</style>
