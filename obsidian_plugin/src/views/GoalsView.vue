<template>
  <div class="dreamglows-goals-view">
    <div class="dreamglows-goals-header">
      <div>
        <h2>Objectifs</h2>
        <p class="dreamglows-goals-subtitle">Planification, pilotage visuel et actions associées</p>
      </div>
      <div class="dreamglows-goals-controls">
        <button @click="openNewGoalModal" class="dreamglows-add-goal-btn">
          <i class="fas fa-plus"></i> Nouvel objectif
        </button>
      </div>
    </div>

    <section class="dreamglows-goals-overview">
      <article
        v-for="metric in goalMetrics"
        :key="metric.label"
        class="dreamglows-goals-metric"
      >
        <span class="dreamglows-goals-metric-label">{{ metric.label }}</span>
        <strong class="dreamglows-goals-metric-value">{{ metric.value }}</strong>
        <span class="dreamglows-goals-metric-subtitle">{{ metric.subtitle }}</span>
      </article>
    </section>

    <div class="dreamglows-goals-layout">
      <div
        ref="timelineContainer"
        class="dreamglows-timeline-container"
        :style="{ width: `${mainWidth}%` }"
        role="region"
        aria-label="Timeline des objectifs et tâches"
      ></div>
      <div
        class="dreamglows-resize-handle"
        @mousedown="startResize"
        role="separator"
        aria-orientation="vertical"
      ></div>
      <div
        class="dreamglows-task-container"
        :style="{ width: `${100 - mainWidth}%` }"
      >
        <TaskList :app="props.app" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { Timeline, DataSet } from 'vis-timeline/standalone';
import type { Goal } from '@/types/goals';
import type { Task } from '@/types/tasks';
import { useGoalsStore } from '@/stores/goalsStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { GoalModal } from '@/components/modals/GoalModal';
import { CategoryModal } from '@/components/modals/CategoryModal';
import TaskList from '@/components/TaskList.vue';
import { useTasksStore } from '@/stores/tasksStore';
import { TaskModal } from '@/components/modals/TaskModal';

const props = defineProps<{
  contentFiles: any[];
  app: any;
}>();

const goalsStore = useGoalsStore();
const settingsStore = useSettingsStore();
const tasksStore = useTasksStore();

const timelineContainer = ref<HTMLElement | null>(null);
let timeline: Timeline | null = null;

const isResizing = ref(false);
const startX = ref(0);
const startWidth = ref(0);
const mainWidth = ref(50);
const MIN_PANEL_WIDTH = 35;
const MAX_PANEL_WIDTH = 70;
let keydownListener: ((event: KeyboardEvent) => void) | null = null;

type Metric = {
  label: string;
  value: string;
  subtitle: string;
};

const goalMetrics = computed<Metric[]>(() => {
  const goals = goalsStore.goals || [];
  const tasks = tasksStore.tasks || [];

  const doneGoals = goals.filter((goal) => normalizeGoalStatus(goal.status) === 'done').length;
  const activeGoals = goals.length - doneGoals;
  const doneTasks = tasks.filter((task) => task.status === 'done').length;
  const inProgressTasks = tasks.filter((task) => task.status === 'in-progress').length;
  const avgProgress = goals.length > 0
    ? goals.reduce((sum, goal) => sum + readProgress(goal), 0) / goals.length
    : 0;

  return [
    {
      label: 'Objectifs actifs',
      value: `${Math.max(0, activeGoals)}`,
      subtitle: `${goals.length} total`
    },
    {
      label: 'Objectifs terminés',
      value: `${doneGoals}`,
      subtitle: goals.length > 0 ? `${Math.round((doneGoals / goals.length) * 100)}% taux de réussite` : '0% taux de réussite'
    },
    {
      label: 'Tâches en cours',
      value: `${inProgressTasks}`,
      subtitle: `${doneTasks} déjà terminées`
    },
    {
      label: 'Progression globale',
      value: `${Math.round(avgProgress)}%`,
      subtitle: 'moyenne sur les objectifs'
    }
  ];
});

// Initialiser la taille depuis les settings
onMounted(() => {
  mainWidth.value = settingsStore.settings.lastMainWidth || 50;
});

const parseDate = (value: unknown): Date | null => {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
};

const readGoalCategory = (goal: Goal) => {
  return (goal as { category?: string }).category || 'Sans catégorie';
};

const readGoalTags = (goal: Goal) => {
  const tags = (goal as { tags?: unknown }).tags;
  return Array.isArray(tags) ? tags.map(String) : [];
};

const readGoalPriority = (goal: Goal) => {
  const priority = String((goal as { priority?: string }).priority || 'medium');
  return priority;
};

const readProgress = (goal: Goal) => {
  const progress = Number((goal as { progress?: number }).progress || 0);
  return Number.isFinite(progress) ? Math.min(100, Math.max(0, progress)) : 0;
};

const normalizeGoalStatus = (status: Goal['status'] | string) => {
  if (status === 'done' || status === 'completed' || status === 'COMPLETED') return 'done';
  if (status === 'in_progress' || status === 'in-progress') return 'in-progress';
  if (status === 'cancelled') return 'cancelled';
  return 'todo';
};

const goalStatusToLabel = (status: Goal['status'] | string) => {
  const normalized = normalizeGoalStatus(status);
  if (normalized === 'in-progress') return '▶️ En cours';
  if (normalized === 'done') return '✅ Terminé';
  if (normalized === 'cancelled') return '⛔ Annulé';
  return '⭕ À faire';
};

const createTimelineGroups = (goals: Goal[], tasks: Task[]) => {
  const categories = new Set<string>(['Sans catégorie']);
  goals.forEach((goal) => categories.add(readGoalCategory(goal)));
  if (tasks.length > 0) categories.add('Tâches');

  return Array.from(categories).map((category) => ({
    id: category,
    content: category
  }));
};

const createTimelineItems = (goals: Goal[], tasks: Task[]) => {
  const items: any[] = [];

  const goalItems = goals.map((goal) => {
    const goalStatus = normalizeGoalStatus(goal.status);
    const start = parseDate((goal as { startDate?: Date | string }).startDate) || new Date();
    const due = parseDate((goal as { dueDate?: Date | string | null }).dueDate);
    const progress = readProgress(goal);
    const category = readGoalCategory(goal);
    const priority = readGoalPriority(goal);
    const tags = readGoalTags(goal);

    return {
      id: `goal-${goal.id}`,
      group: category,
      content: `
        <div class="dreamglows-timeline-item-title">
          ${goal.title}
          <span class="dreamglows-timeline-item-progress">${Math.round(progress)}%</span>
        </div>
        ${tags.length ? `
          <div class="dreamglows-timeline-item-tags">
            ${tags.map((tag) => `<span class="dreamglows-tag">#${tag}</span>`).join(' ')}
          </div>
        ` : ''}
      `,
      start,
      end: due || undefined,
      type: due ? 'range' : 'box',
      style: `
        background-color: ${goalStatus === 'todo' ? 'var(--background-primary)' :
                          goalStatus === 'in-progress' ? 'var(--interactive-accent)' :
                          'var(--interactive-success)'};
        border-color: ${priority === 'high' ? 'var(--text-error)' :
                      priority === 'medium' ? 'var(--text-warning)' :
                      'var(--text-success)'};
        border-width: ${priority === 'high' ? '2px' : '1px'};
      `,
      title: `
        <div>
          <strong>Statut:</strong> ${goalStatusToLabel(goal.status)}<br />
          <strong>Priorité:</strong> ${priority === 'high' ? '⚡ Haute' : priority === 'medium' ? '◆ Moyenne' : '○ Basse'}<br />
          <strong>Progression:</strong> ${Math.round(progress)}%
        </div>
      `
    };
  });

  const taskItems = tasks.map((task) => ({
    id: `task-${task.id}`,
    group: 'Tâches',
    content: `
      <div class="dreamglows-timeline-task">
        <div class="dreamglows-timeline-task-title">${task.title}</div>
        ${Array.isArray(task.tags) && task.tags.length ? `
          <div class="dreamglows-timeline-item-tags">
            ${task.tags.map((tag) => `<span class="dreamglows-tag">#${tag}</span>`).join(' ')}
          </div>
        ` : ''}
      </div>
    `,
    start: getTaskStartDate(task),
    type: 'box',
    style: `
      background-color: ${task.status === 'todo' ? 'var(--background-primary)' :
                        task.status === 'in-progress' ? 'var(--interactive-accent)' :
                        'var(--interactive-success)'};
      border-color: ${task.priority === 'high' ? 'var(--text-error)' :
                    task.priority === 'medium' ? 'var(--text-warning)' :
                    'var(--text-success)'};
      border-width: ${task.priority === 'high' ? '2px' : '1px'};
    `,
    title: `
      <div>
        <strong>Statut:</strong> ${task.status === 'todo' ? '⭕ À faire' : task.status === 'in-progress' ? '▶️ En cours' : '✅ Terminé'}<br />
        <strong>Priorité:</strong> ${task.priority === 'high' ? '⚡ Haute' : task.priority === 'medium' ? '◆ Moyenne' : '○ Basse'}
      </div>
    `
  }));

  return [...goalItems, ...taskItems];
};

const getTaskStartDate = (task: Task): Date => {
  return parseDate(task.startDate) || parseDate(task.createdAt) || new Date();
};

const timelineOptions = () => {
  const startHour = settingsStore.settings.timelineStartHour || '08:00';
  const endHour = settingsStore.settings.timelineEndHour || '23:00';
  const timeFormat = settingsStore.settings.timeFormat || '24h';

  return {
    orientation: 'top',
    editable: true,
    zoomable: true,
    stack: true,
    height: '100%',
    horizontalScroll: true,
    verticalScroll: true,
    groupOrder: 'content',
    tooltip: {
      followMouse: true,
      overflowMethod: 'cap' as const,
      delay: 100
    },
    hiddenDates: [
      {
        start: `2024-01-01 ${endHour}:00`,
        end: `2024-01-02 ${startHour}:00`,
        repeat: 'daily' as const
      }
    ],
    format: {
      minorLabels: {
        minute: timeFormat === '12h' ? 'hh:mm A' : 'HH:mm',
        hour: timeFormat === '12h' ? 'hh:mm A' : 'HH:mm',
        weekday: 'dddd',
        day: 'D',
        month: 'MMM',
        year: 'YYYY'
      }
    },
    onMove: (item: any, callback: any) => {
      const [type, id] = String(item?.id || '').split('-');
      if (!type || !id) {
        callback(item);
        return;
      }

      if (type === 'goal') {
        const goal = goalsStore.goals.find((g) => g.id === id);
        if (goal) {
          goalsStore.updateGoal({
            ...goal,
            startDate: parseDate(item?.start) || goal.startDate,
            dueDate: parseDate(item?.end) || (goal as { dueDate?: Date | string }).dueDate
          } as Goal);
        }
      }

      if (type === 'task') {
        const task = tasksStore.tasks.find((t) => t.id === id);
        if (task) {
          tasksStore.updateTask({
            ...task,
            startDate: parseDate(item?.start)?.toISOString() || task.startDate
          } as Task);
        }
      }

      callback(item);
    },
    template(item: any) {
      return item.content;
    },
    groupTemplate(group: any) {
      return `<div class="dreamglows-timeline-group">${group?.content || 'Sans nom'}</div>`;
    },
    margin: {
      item: {
        horizontal: 10,
        vertical: 5
      }
    },
    showCurrentTime: true
  };
};

const refreshTimeline = () => {
  if (!timeline) return;

  const groups = createTimelineGroups(goalsStore.goals, tasksStore.tasks);
  const items = createTimelineItems(goalsStore.goals, tasksStore.tasks);

  timeline.setGroups(new DataSet(groups));
  timeline.setItems(new DataSet(items));
  timeline.redraw();
};

onMounted(() => {
  if (!timelineContainer.value) return;

  timeline = new Timeline(
    timelineContainer.value,
    new DataSet(createTimelineItems(goalsStore.goals, tasksStore.tasks)),
    new DataSet(createTimelineGroups(goalsStore.goals, tasksStore.tasks)),
    timelineOptions()
  );

  timeline.on('doubleClick', (properties: any) => {
    if (properties.item) {
      const [type, id] = properties.item.split('-');
      if (type === 'goal') {
        const goal = goalsStore.goals.find((g) => g.id === id);
        if (goal) {
          new GoalModal(props.app, goal).open();
        }
      } else if (type === 'task') {
        const task = tasksStore.tasks.find((t) => t.id === id);
        if (task) {
          new TaskModal(props.app, task).open();
        }
      }
      return;
    }

    if (properties.what === 'group-axis') {
      new CategoryModal(props.app, '').open();
      return;
    }

    if (properties.group) {
      new CategoryModal(props.app, properties.group).open();
      return;
    }

    if (properties.time || properties.snappedTime) {
      const clickedDate = properties.snappedTime || properties.time;
      goalsStore.setInitialGoalData({
        startDate: new Date(clickedDate).toISOString().split('T')[0]
      });
      new GoalModal(props.app).open();
    }
  });

  timeline.on('select', () => {
    // Réserve pour futures actions de sélection
  });

  timeline.on('rangechanged', () => {
    // Hook possible pour persister la plage visuelle
  });

  keydownListener = (event: KeyboardEvent) => {
    if (!timeline) return;
    if (event.ctrlKey && event.key === '+') timeline.zoomIn(0.5);
    if (event.ctrlKey && event.key === '-') timeline.zoomOut(0.5);
    if (event.ctrlKey && event.key === 'ArrowLeft') {
      const currentWindow = timeline.getWindow();
      const interval = currentWindow.end.getTime() - currentWindow.start.getTime();
      timeline.moveTo(new Date(currentWindow.start.getTime() - interval * 0.3));
    }
    if (event.ctrlKey && event.key === 'ArrowRight') {
      const currentWindow = timeline.getWindow();
      const interval = currentWindow.end.getTime() - currentWindow.start.getTime();
      timeline.moveTo(new Date(currentWindow.start.getTime() + interval * 0.3));
    }
  };

  document.addEventListener('keydown', keydownListener);
});

watch(() => goalsStore.goals, () => refreshTimeline(), { deep: true });
watch(() => tasksStore.tasks, () => refreshTimeline(), { deep: true });

onUnmounted(() => {
  if (keydownListener) {
    document.removeEventListener('keydown', keydownListener);
  }

  if (timeline) {
    try {
      timeline.setGroups(new DataSet([]));
      timeline.setItems(new DataSet([]));
      timeline.destroy();
    } catch {
      // ignore
    }
    timeline = null;
  }
});

watch(
  () => [
    settingsStore.settings.timelineStartHour,
    settingsStore.settings.timelineEndHour,
    settingsStore.settings.timeFormat
  ],
  () => {
    if (!timeline) return;
    timeline.setOptions({
      hiddenDates: [{
        start: `2024-01-01 ${settingsStore.settings.timelineStartHour || '23:00'}:00`,
        end: `2024-01-02 ${settingsStore.settings.timelineEndHour || '08:00'}:00`,
        repeat: 'daily' as const
      }],
      format: {
        minorLabels: {
          minute: settingsStore.settings.timeFormat === '12h' ? 'hh:mm A' : 'HH:mm',
          hour: settingsStore.settings.timeFormat === '12h' ? 'hh:mm A' : 'HH:mm',
          weekday: 'dddd',
          day: 'D',
          month: 'MMM',
          year: 'YYYY'
        }
      }
    });
  },
  { deep: true }
);

const startResize = (event: MouseEvent) => {
  isResizing.value = true;
  startX.value = event.clientX;
  startWidth.value = mainWidth.value;
  document.addEventListener('mousemove', handleResize);
  document.addEventListener('mouseup', stopResize);
  document.body.style.cursor = 'ew-resize';
  document.body.style.userSelect = 'none';
};

const handleResize = (event: MouseEvent) => {
  if (!isResizing.value) return;
  const containerWidth = document.querySelector('.dreamglows-goals-layout')?.clientWidth || 0;
  if (!containerWidth) return;

  const dx = event.clientX - startX.value;
  const percentDelta = (dx / containerWidth) * 100;
  const newWidth = Math.max(MIN_PANEL_WIDTH, Math.min(MAX_PANEL_WIDTH, startWidth.value + percentDelta));

  mainWidth.value = newWidth;
  settingsStore.updateSettings({ lastMainWidth: newWidth });
};

const stopResize = () => {
  isResizing.value = false;
  document.removeEventListener('mousemove', handleResize);
  document.removeEventListener('mouseup', stopResize);
  document.body.style.cursor = '';
  document.body.style.userSelect = '';
};

const openNewGoalModal = () => {
  const modal = new GoalModal(props.app);
  modal.open();
};
</script>

<style scoped>
.dreamglows-goals-view {
  color: var(--text-normal);
}

.dreamglows-goals-header {
  margin-bottom: 0.85rem;
}

.dreamglows-goals-subtitle {
  margin: 0.35rem 0 0.2rem;
  color: var(--text-muted);
  font-size: 0.88rem;
}

.dreamglows-goals-overview {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.7rem;
  margin-bottom: 0.85rem;
}

.dreamglows-goals-metric {
  border: 1px solid color-mix(in oklab, var(--text-faint) 22%, transparent);
  border-radius: 12px;
  padding: 0.75rem 0.8rem;
  background: color-mix(in oklab, var(--background-primary-alt) 82%, transparent);
}

.dreamglows-goals-metric-label {
  display: block;
  color: var(--text-muted);
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.dreamglows-goals-metric-value {
  display: block;
  margin: 0.4rem 0 0.2rem;
  font-size: 1.44rem;
  line-height: 1.1;
}

.dreamglows-goals-metric-subtitle {
  color: var(--text-muted);
  font-size: 0.86rem;
}

.dreamglows-goals-layout {
  display: flex;
  min-height: 540px;
  gap: 0.6rem;
}

.dreamglows-timeline-container {
  min-height: 540px;
  border: 1px solid color-mix(in oklab, var(--text-faint) 25%, transparent);
  border-radius: 14px;
  overflow: hidden;
  background: color-mix(in oklab, var(--background-primary-alt) 80%, transparent);
}

.dreamglows-task-container {
  min-height: 540px;
  border: 1px solid color-mix(in oklab, var(--text-faint) 25%, transparent);
  border-radius: 14px;
  overflow: hidden;
  background: color-mix(in oklab, var(--background-primary-alt) 80%, transparent);
}

.dreamglows-resize-handle {
  width: 0.5rem;
  border-radius: 999px;
  cursor: ew-resize;
  margin: 0.2rem 0;
  transition: background-color 0.2s ease;
}

.dreamglows-resize-handle:hover {
  background: color-mix(in oklab, var(--interactive-accent) 34%, transparent);
}

@media (max-width: 980px) {
  .dreamglows-goals-overview {
    grid-template-columns: 1fr;
  }

  .dreamglows-goals-layout {
    flex-direction: column;
    min-height: auto;
  }

  .dreamglows-timeline-container,
  .dreamglows-task-container {
    width: 100% !important;
    min-height: 420px;
  }

  .dreamglows-resize-handle {
    display: none;
  }
}
</style>
