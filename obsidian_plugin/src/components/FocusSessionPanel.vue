<template>
  <section class="dreamglows-focus-panel">
    <template v-if="activeSession && activeTask">
      <p class="dreamglows-focus-kicker">Focus en cours · {{ modeLabel(activeSession.mode) }}</p>
      <h2>{{ activeTask.title }}</h2>
      <p v-if="activeGoal" class="dreamglows-focus-context">🎯 {{ activeGoal.title }}</p>
      <p class="dreamglows-focus-duration">{{ elapsedLabel }}</p>
      <div class="dreamglows-focus-actions">
        <button @click="finishSession('completed')">Terminer la session</button>
        <button @click="isSwitching = !isSwitching">Changer de tâche</button>
        <button class="mod-cta" @click="finishSession('interrupted')">Faire une pause</button>
      </div>
      <label>
        Où j'en étais (facultatif)
        <input v-model="handoffNote" placeholder="Le contexte à retrouver" />
      </label>
      <label>
        Prochaine action (facultatif)
        <input v-model="nextAction" placeholder="La toute prochaine action" />
      </label>
      <ul v-if="isSwitching" class="dreamglows-focus-task-list">
        <li v-for="task in availableTasks" :key="task.id">
          <span>{{ task.title }}</span>
          <button class="mod-cta" @click="switchSession(task)">Basculer</button>
        </li>
      </ul>
    </template>

    <template v-else>
      <p class="dreamglows-focus-kicker">Mode Focus</p>
      <h2>Choisis une action à faire maintenant</h2>
      <p class="dreamglows-focus-empty">La session conserve le contexte de reprise, sans verrouiller ton temps.</p>
      <div class="dreamglows-focus-mode" role="group" aria-label="Mode de focus">
        <button v-for="mode in modes" :key="mode.value" :class="{ active: selectedMode === mode.value }" @click="selectedMode = mode.value">{{ mode.label }}</button>
      </div>
      <ul class="dreamglows-focus-task-list">
        <li v-for="task in availableTasks" :key="task.id">
          <span>{{ task.title }}</span>
          <button class="mod-cta" @click="startSession(task)">Commencer</button>
        </li>
        <li v-if="!availableTasks.length">Aucune tâche à faire pour le moment.</li>
      </ul>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useFocusSessionsStore } from '@/stores/focusSessionsStore';
import { useGoalsStore } from '@/stores/goalsStore';
import { useTasksStore } from '@/stores/tasksStore';
import type { FocusMode } from '@/types/focusSessions';
import type { Task } from '@/types/tasks';

const focusSessionsStore = useFocusSessionsStore();
const tasksStore = useTasksStore();
const goalsStore = useGoalsStore();
const selectedMode = ref<FocusMode>('focus');
const handoffNote = ref('');
const nextAction = ref('');
const isSwitching = ref(false);
const tick = ref(Date.now());
let intervalId: number | undefined;

const modes: Array<{ value: FocusMode; label: string }> = [
  { value: 'focus', label: 'Focus' },
  { value: 'creation', label: 'Création' },
  { value: 'administration', label: 'Administration' }
];

const activeSession = computed(() => focusSessionsStore.activeSession);
const activeTask = computed(() => activeSession.value ? tasksStore.getTaskById(activeSession.value.taskId) : undefined);
const activeGoal = computed(() => activeSession.value?.goalId ? goalsStore.getGoalById(activeSession.value.goalId) : undefined);
const availableTasks = computed(() => tasksStore.getTasks.filter((task) => task.status !== 'done').slice(0, 6));
const elapsedLabel = computed(() => {
  if (!activeSession.value) return '';
  const minutes = Math.max(0, Math.floor((tick.value - Date.parse(activeSession.value.startedAt)) / 60000));
  const hours = Math.floor(minutes / 60);
  return hours ? `${hours} h ${minutes % 60} min` : `${minutes} min`;
});

const modeLabel = (mode: FocusMode) => modes.find((item) => item.value === mode)?.label || 'Focus';

const startSession = async (task: Task) => {
  focusSessionsStore.start(task.id, task.goalId, selectedMode.value);
  if (task.status === 'todo') await tasksStore.updateTask({ ...task, status: 'in-progress' });
};

const switchSession = async (task: Task) => {
  if (activeSession.value) {
    focusSessionsStore.interrupt(activeSession.value.id, handoffNote.value, nextAction.value);
  }
  handoffNote.value = '';
  nextAction.value = '';
  isSwitching.value = false;
  await startSession(task);
};

const finishSession = (status: 'completed' | 'interrupted') => {
  if (!activeSession.value) return;
  focusSessionsStore.finish(activeSession.value.id, status, handoffNote.value, nextAction.value);
  handoffNote.value = '';
  nextAction.value = '';
  isSwitching.value = false;
};

onMounted(() => { intervalId = window.setInterval(() => { tick.value = Date.now(); }, 30_000); });
onUnmounted(() => { if (intervalId !== undefined) window.clearInterval(intervalId); });
</script>

<style scoped>
.dreamglows-focus-panel { margin: 1rem 0; padding: 1rem; border: 1px solid var(--interactive-accent); border-radius: 12px; background: var(--background-primary-alt); }
.dreamglows-focus-kicker { margin: 0; color: var(--text-accent); font-size: .85rem; font-weight: 700; text-transform: uppercase; }
.dreamglows-focus-panel h2 { margin: .35rem 0; }
.dreamglows-focus-context, .dreamglows-focus-empty, .dreamglows-focus-duration { color: var(--text-muted); }
.dreamglows-focus-actions, .dreamglows-focus-mode { display: flex; flex-wrap: wrap; gap: .5rem; margin: .75rem 0; }
.dreamglows-focus-mode button.active { border-color: var(--interactive-accent); color: var(--text-on-accent); background: var(--interactive-accent); }
.dreamglows-focus-task-list { list-style: none; padding: 0; margin: .75rem 0 0; }
.dreamglows-focus-task-list li { display: flex; align-items: center; justify-content: space-between; gap: .75rem; padding: .5rem 0; border-top: 1px solid var(--background-modifier-border); }
.dreamglows-focus-panel label { display: grid; gap: .35rem; color: var(--text-muted); font-size: .9rem; }
</style>
