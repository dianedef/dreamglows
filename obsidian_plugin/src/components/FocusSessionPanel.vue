<template>
  <section class="dreamglows-focus-panel">
    <template v-if="activeSession && activeTask">
      <p class="dreamglows-focus-kicker">Focus en cours · {{ modeLabel(activeMode) }}</p>
      <h2>{{ activeTask.title }}</h2>
      <p v-if="activeGoal" class="dreamglows-focus-context">🎯 {{ activeGoal.title }}</p>
      <p class="dreamglows-focus-duration">{{ elapsedLabel }}</p>
      <div class="dreamglows-focus-actions">
        <button :disabled="submitting" @click="finishSession('completed')">Terminer la session</button>
        <button :disabled="submitting" @click="isSwitching = !isSwitching">Changer de tâche</button>
        <button class="mod-cta" :disabled="submitting" @click="finishSession('interrupted')">Faire une pause</button>
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
          <button class="mod-cta" :disabled="submitting" @click="switchSession(task)">Basculer</button>
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
          <button class="mod-cta" :disabled="submitting" @click="startSession(task)">Commencer</button>
        </li>
        <li v-if="!availableTasks.length">Aucune tâche à faire pour le moment.</li>
      </ul>
    </template>
    <p v-if="feedback" class="dreamglows-focus-feedback" :class="{ 'is-error': feedback.error }" role="alert">{{ feedback.text }}</p>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { v4 as uuidv4 } from 'uuid';
import { usePathCommandPort } from '@/application/path-command-port';
import type { PathEntity } from '@/domain/path/model';
import { usePathStore } from '@/stores/pathStore';

type FocusMode = 'focus' | 'creation' | 'administration';
type FocusAction = PathEntity & { type: 'action' };

const pathStore = usePathStore();
const pathCommands = usePathCommandPort();
const selectedMode = ref<FocusMode>('focus');
const handoffNote = ref('');
const nextAction = ref('');
const isSwitching = ref(false);
const submitting = ref(false);
const feedback = ref<{ error: boolean; text: string }>();
const startOperation = ref<{ commandId: string; sessionId: string; taskId: string; mode: FocusMode }>();
const endOperation = ref<{ commandId: string; sessionId: string; outcome: 'completed' | 'interrupted'; handoffNote: string; nextAction: string }>();
const tick = ref(Date.now());
let intervalId: number | undefined;

const modes: Array<{ value: FocusMode; label: string }> = [
  { value: 'focus', label: 'Focus' },
  { value: 'creation', label: 'Création' },
  { value: 'administration', label: 'Administration' }
];

const entities = computed(() => pathStore.document?.envelope.entities ?? []);
const activeSession = computed(() => entities.value.find((entity) =>
  entity.type === 'focus-session' && entity.status === 'in-progress' && !entity.deletedAt));
const activeTask = computed(() => activeSession.value?.parentId
  ? entities.value.find((entity) => entity.id === activeSession.value?.parentId && entity.type === 'action' && !entity.deletedAt)
  : undefined);
const activeGoal = computed(() => activeTask.value?.parentId
  ? entities.value.find((entity) => entity.id === activeTask.value?.parentId
      && (entity.type === 'goal' || entity.type === 'milestone') && !entity.deletedAt)
  : undefined);
const availableTasks = computed(() => entities.value.filter((entity): entity is FocusAction =>
  entity.type === 'action' && entity.status !== 'done' && entity.status !== 'cancelled' && !entity.deletedAt).slice(0, 6));
const activeMode = computed<FocusMode>(() => {
  const mode = activeSession.value?.extensions.mode;
  return mode === 'creation' || mode === 'administration' ? mode : 'focus';
});
const elapsedLabel = computed(() => {
  if (!activeSession.value) return '';
  const minutes = Math.max(0, Math.floor((tick.value - Date.parse(activeSession.value.occurredAt ?? activeSession.value.createdAt)) / 60000));
  const hours = Math.floor(minutes / 60);
  return hours ? `${hours} h ${minutes % 60} min` : `${minutes} min`;
});

const modeLabel = (mode: FocusMode) => modes.find((item) => item.value === mode)?.label || 'Focus';

const startSession = async (task: FocusAction): Promise<boolean> => {
  const operation = startOperation.value?.taskId === task.id && startOperation.value.mode === selectedMode.value
    ? startOperation.value
    : { commandId: uuidv4(), sessionId: uuidv4(), taskId: task.id, mode: selectedMode.value };
  startOperation.value = operation;
  submitting.value = true;
  feedback.value = undefined;
  try {
    const result = await pathCommands.execute({
      type: 'start-focus-session',
      commandId: operation.commandId,
      input: { id: operation.sessionId, actionId: task.id, mode: operation.mode }
    });
    if (!result.accepted) {
      startOperation.value = undefined;
      feedback.value = { error: true, text: `Démarrage refusé : ${result.reason}.` };
      return false;
    }
    startOperation.value = undefined;
    feedback.value = { error: false, text: 'Session de focus démarrée.' };
    return true;
  } catch {
    feedback.value = { error: true, text: 'La sauvegarde a échoué ; aucune nouvelle session n’a été démarrée.' };
    return false;
  } finally {
    submitting.value = false;
  }
};

const switchSession = async (task: FocusAction) => {
  if (activeSession.value) {
    const ended = await finishSession('interrupted', false);
    if (!ended) return;
  }
  if (await startSession(task)) {
    handoffNote.value = '';
    nextAction.value = '';
    isSwitching.value = false;
  }
};

const finishSession = async (outcome: 'completed' | 'interrupted', reset = true): Promise<boolean> => {
  const session = activeSession.value;
  if (!session) return false;
  const operation = endOperation.value?.sessionId === session.id
      && endOperation.value.outcome === outcome
      && endOperation.value.handoffNote === handoffNote.value
      && endOperation.value.nextAction === nextAction.value
    ? endOperation.value
    : { commandId: uuidv4(), sessionId: session.id, outcome, handoffNote: handoffNote.value, nextAction: nextAction.value };
  endOperation.value = operation;
  submitting.value = true;
  feedback.value = undefined;
  try {
    const result = await pathCommands.execute({
      type: 'end-focus-session',
      commandId: operation.commandId,
      entityId: session.id,
      input: { outcome, handoffNote: operation.handoffNote, nextAction: operation.nextAction }
    });
    if (!result.accepted) {
      endOperation.value = undefined;
      feedback.value = { error: true, text: `Fin de session refusée : ${result.reason}.` };
      return false;
    }
    endOperation.value = undefined;
    if (reset) {
      handoffNote.value = '';
      nextAction.value = '';
      isSwitching.value = false;
      feedback.value = { error: false, text: outcome === 'completed' ? 'Session terminée.' : 'Session mise en pause.' };
    }
    return true;
  } catch {
    feedback.value = { error: true, text: 'La sauvegarde a échoué ; la session en cours est conservée.' };
    return false;
  } finally {
    submitting.value = false;
  }
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
.dreamglows-focus-feedback { margin: .75rem 0 0; color: var(--text-success); }
.dreamglows-focus-feedback.is-error { color: var(--text-error); }
</style>
