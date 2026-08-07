<template>
  <section class="goal-tree" aria-label="Arbre des objectifs et tâches">
    <header class="goal-tree__header">
      <div>
        <h3>Arborescence</h3>
        <p>{{ goals.length }} objectifs · {{ tasks.length }} tâches</p>
      </div>
      <button type="button" class="goal-tree__quiet-button" @click="toggleAll">
        {{ allExpanded ? 'Tout replier' : 'Tout déplier' }}
      </button>
    </header>

    <div v-if="rows.length" ref="treeElement" class="goal-tree__scroll" role="tree" @keydown="onTreeKeydown">
      <button
        v-for="(row, index) in rows"
        :key="`${row.type}-${row.id}`"
        :ref="(element) => setRowElement(element, index)"
        type="button"
        role="treeitem"
        :aria-level="row.depth + 1"
        :aria-expanded="row.expandable ? expanded.has(row.key) : undefined"
        :aria-selected="selectedKey === row.key"
        :tabindex="focusedIndex === index ? 0 : -1"
        class="goal-tree__row"
        :class="[`goal-tree__row--${row.type}`, { 'is-selected': selectedKey === row.key }]"
        :style="{ '--tree-depth': row.depth }"
        @click="selectRow(row, index)"
        @dblclick="emit('edit', row)"
        @focus="focusedIndex = index"
      >
        <span
          class="goal-tree__toggle"
          :class="{ 'is-hidden': !row.expandable }"
          aria-hidden="true"
          @click.stop="toggle(row)"
        >{{ expanded.has(row.key) ? '⌄' : '›' }}</span>
        <span class="goal-tree__kind" aria-hidden="true">{{ row.type === 'goal' ? '◎' : statusIcon(row.status) }}</span>
        <span class="goal-tree__label">{{ row.title }}</span>
        <span class="goal-tree__status">{{ statusLabel(row.status) }}</span>
        <span v-if="row.type === 'goal'" class="goal-tree__progress" :aria-label="`Progression ${row.progress}%`">
          <span><span :style="{ width: `${row.progress}%` }"></span></span>
          {{ row.progress }}%
        </span>
      </button>
    </div>

    <div v-else class="goal-tree__empty">
      <span aria-hidden="true">◎</span>
      <strong>Votre premier objectif commence ici</strong>
      <p>Créez un objectif, puis organisez ses sous-objectifs et ses tâches.</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch, type ComponentPublicInstance } from 'vue';
import type { Goal } from '@/types/goals';
import type { Task } from '@/types/tasks';

export type GoalTreeRow = {
  key: string;
  id: string;
  type: 'goal' | 'task';
  title: string;
  status: string;
  progress: number;
  depth: number;
  parentKey?: string;
  expandable: boolean;
  source: Goal | Task;
};

const props = defineProps<{ goals: Goal[]; tasks: Task[]; selectedKey: string | null }>();
const emit = defineEmits<{
  (event: 'select', row: GoalTreeRow): void;
  (event: 'edit', row: GoalTreeRow): void;
}>();

const expanded = ref(new Set<string>());
const focusedIndex = ref(0);
const rowElements = ref<Array<HTMLButtonElement | null>>([]);

const taskIdsForGoal = (goal: Goal) => {
  const legacyIds = Array.isArray((goal as Goal & { tasks?: string[] }).tasks)
    ? (goal as Goal & { tasks?: string[] }).tasks || []
    : [];
  return new Set(legacyIds);
};

const childrenForGoal = (goalId: string) => props.goals.filter((goal) => goal.parentGoalId === goalId);
const tasksForGoal = (goal: Goal) => {
  const legacyIds = taskIdsForGoal(goal);
  return props.tasks.filter((task) => task.goalId === goal.id || legacyIds.has(task.id));
};

const rows = computed<GoalTreeRow[]>(() => {
  const result: GoalTreeRow[] = [];
  const visited = new Set<string>();

  const appendGoal = (goal: Goal, depth: number, parentKey?: string) => {
    if (visited.has(goal.id)) return;
    visited.add(goal.id);
    const key = `goal-${goal.id}`;
    const children = childrenForGoal(goal.id);
    const tasks = tasksForGoal(goal);
    result.push({
      key, id: goal.id, type: 'goal', title: goal.title, status: String(goal.status),
      progress: Math.round(Math.min(100, Math.max(0, Number(goal.progress) || 0))),
      depth, parentKey, expandable: children.length + tasks.length > 0, source: goal
    });
    if (!expanded.value.has(key)) return;
    children.forEach((child) => appendGoal(child, depth + 1, key));
    tasks.forEach((task) => result.push({
      key: `task-${task.id}`, id: task.id, type: 'task', title: task.title,
      status: task.status, progress: task.status === 'done' ? 100 : 0,
      depth: depth + 1, parentKey: key, expandable: false, source: task
    }));
  };

  props.goals.filter((goal) => !goal.parentGoalId || !props.goals.some((candidate) => candidate.id === goal.parentGoalId))
    .forEach((goal) => appendGoal(goal, 0));
  props.goals.filter((goal) => !visited.has(goal.id)).forEach((goal) => appendGoal(goal, 0));

  const assignedTaskIds = new Set(result.filter((row) => row.type === 'task').map((row) => row.id));
  props.tasks.filter((task) => !assignedTaskIds.has(task.id)).forEach((task) => result.push({
    key: `task-${task.id}`, id: task.id, type: 'task', title: task.title,
    status: task.status, progress: task.status === 'done' ? 100 : 0,
    depth: 0, expandable: false, source: task
  }));
  return result;
});

const allExpanded = computed(() => {
  const expandableGoals = props.goals.filter((goal) => childrenForGoal(goal.id).length || tasksForGoal(goal).length);
  return expandableGoals.length > 0 && expandableGoals.every((goal) => expanded.value.has(`goal-${goal.id}`));
});

watch(() => props.goals.map((goal) => goal.id).join('|'), () => {
  if (!expanded.value.size) {
    expanded.value = new Set(props.goals.filter((goal) => !goal.parentGoalId).map((goal) => `goal-${goal.id}`));
  }
}, { immediate: true });

watch(rows, (value) => {
  focusedIndex.value = Math.min(focusedIndex.value, Math.max(0, value.length - 1));
  rowElements.value.length = value.length;
});

const setRowElement = (element: Element | ComponentPublicInstance | null, index: number) => {
  rowElements.value[index] = element instanceof HTMLButtonElement ? element : null;
};
const toggle = (row: GoalTreeRow) => {
  if (!row.expandable) return;
  const next = new Set(expanded.value);
  next.has(row.key) ? next.delete(row.key) : next.add(row.key);
  expanded.value = next;
};
const toggleAll = () => {
  expanded.value = allExpanded.value
    ? new Set()
    : new Set(props.goals.filter((goal) => childrenForGoal(goal.id).length || tasksForGoal(goal).length).map((goal) => `goal-${goal.id}`));
};
const selectRow = (row: GoalTreeRow, index: number) => {
  focusedIndex.value = index;
  emit('select', row);
};
const focusIndex = async (index: number) => {
  focusedIndex.value = Math.max(0, Math.min(rows.value.length - 1, index));
  await nextTick();
  rowElements.value[focusedIndex.value]?.focus();
};
const onTreeKeydown = (event: KeyboardEvent) => {
  const row = rows.value[focusedIndex.value];
  if (!row) return;
  if (event.key === 'ArrowDown') { event.preventDefault(); void focusIndex(focusedIndex.value + 1); }
  if (event.key === 'ArrowUp') { event.preventDefault(); void focusIndex(focusedIndex.value - 1); }
  if (event.key === 'Home') { event.preventDefault(); void focusIndex(0); }
  if (event.key === 'End') { event.preventDefault(); void focusIndex(rows.value.length - 1); }
  if (event.key === 'ArrowRight') {
    event.preventDefault();
    if (row.expandable && !expanded.value.has(row.key)) toggle(row);
    else if (row.expandable) void focusIndex(focusedIndex.value + 1);
  }
  if (event.key === 'ArrowLeft') {
    event.preventDefault();
    if (row.expandable && expanded.value.has(row.key)) toggle(row);
    else if (row.parentKey) void focusIndex(rows.value.findIndex((candidate) => candidate.key === row.parentKey));
  }
  if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); selectRow(row, focusedIndex.value); }
};

const statusLabel = (status: string) => ({
  todo: 'À faire', in_progress: 'En cours', 'in-progress': 'En cours', done: 'Terminé', cancelled: 'En pause'
}[status] || status);
const statusIcon = (status: string) => status === 'done' ? '●' : status === 'in-progress' || status === 'in_progress' ? '◐' : '○';
</script>

<style scoped>
.goal-tree { height: 100%; display: flex; flex-direction: column; min-height: 0; }
.goal-tree__header { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 1rem 1.1rem; border-bottom: 1px solid var(--background-modifier-border); }
.goal-tree__header h3 { margin: 0; font-size: 1rem; }
.goal-tree__header p { margin: .25rem 0 0; color: var(--text-muted); font-size: .78rem; }
.goal-tree__quiet-button { background: transparent; box-shadow: none; color: var(--text-accent); font-size: .78rem; }
.goal-tree__scroll { overflow: auto; padding: .55rem; }
.goal-tree__row { --tree-depth: 0; display: grid; grid-template-columns: 1rem 1.2rem minmax(8rem, 1fr) auto auto; align-items: center; gap: .4rem; width: calc(100% - (var(--tree-depth) * 1.05rem)); margin-left: calc(var(--tree-depth) * 1.05rem); padding: .55rem .65rem; border: 0; border-radius: 8px; background: transparent; color: var(--text-normal); box-shadow: none; text-align: left; }
.goal-tree__row:hover, .goal-tree__row:focus-visible { background: var(--background-modifier-hover); }
.goal-tree__row.is-selected { background: color-mix(in srgb, var(--interactive-accent) 17%, transparent); color: var(--text-normal); }
.goal-tree__row--task { color: var(--text-muted); }
.goal-tree__toggle { font-size: 1.15rem; color: var(--text-muted); text-align: center; }
.goal-tree__toggle.is-hidden { visibility: hidden; }
.goal-tree__kind { color: var(--text-accent); text-align: center; }
.goal-tree__label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 550; }
.goal-tree__row--task .goal-tree__label { font-weight: 400; }
.goal-tree__status { color: var(--text-muted); font-size: .72rem; }
.goal-tree__progress { display: flex; align-items: center; gap: .35rem; min-width: 5.5rem; color: var(--text-muted); font-size: .7rem; }
.goal-tree__progress > span { width: 3rem; height: 4px; overflow: hidden; border-radius: 999px; background: var(--background-modifier-border); }
.goal-tree__progress > span > span { display: block; height: 100%; background: var(--interactive-accent); }
.goal-tree__empty { margin: auto; padding: 2rem; max-width: 22rem; text-align: center; color: var(--text-muted); }
.goal-tree__empty > span { display: block; margin-bottom: .6rem; color: var(--text-accent); font-size: 2rem; }
.goal-tree__empty strong { display: block; color: var(--text-normal); }
.goal-tree__empty p { font-size: .84rem; }
@media (max-width: 700px) { .goal-tree__status, .goal-tree__progress { display: none; } .goal-tree__row { grid-template-columns: 1rem 1.2rem minmax(0, 1fr); } }
</style>
