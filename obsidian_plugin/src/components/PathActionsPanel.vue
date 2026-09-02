<template>
  <section class="dreamglows-path-actions" :data-dg-actions="scope" :aria-labelledby="titleId">
    <header class="dreamglows-path-actions__header">
      <div>
        <p class="dreamglows-kicker">Actions Chemin</p>
        <h2 :id="titleId">{{ scope === 'today' ? "Actions du jour" : 'Actions de la semaine' }}</h2>
      </div>
      <span>{{ scheduled.length }} planifiée{{ scheduled.length > 1 ? 's' : '' }}</span>
    </header>

    <ul v-if="scheduled.length" class="dreamglows-path-actions__list">
      <li v-for="item in scheduled" :key="item.id" :data-dg-entity-id="item.id" :aria-selected="pathStore.selectedId === item.id">
        <button type="button" class="dreamglows-path-actions__select" @click="pathStore.select(item.id)">
          <strong>{{ item.entity.title }}</strong>
          <span><time :datetime="item.start">{{ item.start }}</time><template v-if="item.end !== item.start"> → <time :datetime="item.end">{{ item.end }}</time></template></span>
          <span>{{ statusLabel(item.entity.status) }}</span>
        </button>
        <div class="dreamglows-path-actions__commands">
          <button type="button" data-dg-command="reschedule" :aria-label="`Replanifier ${item.entity.title}`" @click="edit(item.id, item.start, item.end)">Replanifier</button>
          <button v-if="item.entity.status === 'done'" type="button" :aria-label="`Rouvrir ${item.entity.title}`" @click="changeCompletion(item.id, 'reopen')">Rouvrir</button>
          <button v-else type="button" :aria-label="`Terminer ${item.entity.title}`" @click="changeCompletion(item.id, 'complete')">Terminer</button>
        </div>
        <PlanningForm v-if="editingId === item.id" :entity-id="item.id" :start="draftStart" :end="draftEnd" command="reschedule" @cancel="editingId = undefined" @submit="submitPlanning" />
      </li>
    </ul>
    <p v-else>Aucune action planifiée dans cette période.</p>

    <section class="dreamglows-path-actions__tray" data-dg-unscheduled aria-labelledby="dreamglows-unscheduled-title">
      <h3 id="dreamglows-unscheduled-title">À planifier</h3>
      <ul v-if="unscheduled.length">
        <li v-for="entity in unscheduled" :key="entity.id" :data-dg-entity-id="entity.id">
          <span>{{ entity.title }}</span>
          <button type="button" data-dg-command="schedule" :aria-label="`Planifier ${entity.title}`" @click="edit(entity.id, pathStore.referenceDate)">Planifier</button>
          <PlanningForm v-if="editingId === entity.id" :entity-id="entity.id" :start="draftStart" :end="draftEnd" command="schedule" @cancel="editingId = undefined" @submit="submitPlanning" />
        </li>
      </ul>
      <p v-else>Aucune action en attente de planification.</p>
    </section>

    <aside v-if="invalid.length" class="dreamglows-path-actions__invalid" role="alert">
      <strong>{{ invalid.length }} action{{ invalid.length > 1 ? 's' : '' }} avec une période invalide.</strong>
      <span>Elles restent conservées dans Chemin et doivent être replanifiées.</span>
    </aside>
    <p v-if="feedback" :role="feedback.kind === 'error' ? 'alert' : 'status'" :data-dg-feedback="feedback.kind === 'error' ? 'rollback' : 'saved'">{{ feedback.text }}</p>
  </section>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, ref } from 'vue';
import { usePathStore } from '@/stores/pathStore';
import { usePathCommandPort } from '@/application/path-command-port';
import type { PathStatus } from '@/domain/path/model';

const props = defineProps<{ scope: 'today' | 'week' }>();
const pathStore = usePathStore();
const commands = usePathCommandPort();
const titleId = `dreamglows-${props.scope}-actions-title`;
const projection = computed(() => props.scope === 'today' ? pathStore.todayProjection : pathStore.weekProjection);
const scheduled = computed(() => projection.value?.items.filter(item => item.entity.type === 'action') ?? []);
const unscheduled = computed(() => projection.value?.unscheduled.filter(entity => entity.type === 'action') ?? []);
const invalid = computed(() => projection.value?.invalidTemporal.filter(entity => entity.type === 'action') ?? []);
const editingId = ref<string>();
const draftStart = ref('');
const draftEnd = ref('');
const feedback = ref<{ kind: 'saved' | 'error'; text: string }>();
const retryIds = new Map<string, string>();

const statusLabel = (status: PathStatus) => ({ todo: 'À faire', 'in-progress': 'En cours', done: 'Terminé', cancelled: 'Annulé' }[status]);
const newCommandId = (entityId: string, command: string) => globalThis.crypto?.randomUUID?.() ?? `${command}-${entityId}-${Date.now()}`;
const edit = (id: string, start: string, end = '') => { editingId.value = id; draftStart.value = start; draftEnd.value = end === start ? '' : end; feedback.value = undefined; };

const execute = async (command: Parameters<typeof commands.execute>[0]) => {
  try {
    const result = await commands.execute(command);
    if (!result.accepted) {
      retryIds.delete(command.entityId);
      feedback.value = { kind: 'error', text: `Modification refusée : ${result.reason}.` };
      return false;
    }
    retryIds.delete(command.entityId);
    feedback.value = { kind: 'saved', text: 'Chemin mis à jour.' };
    return true;
  } catch {
    feedback.value = { kind: 'error', text: 'La sauvegarde a échoué. La position précédente est conservée; vous pouvez réessayer.' };
    return false;
  }
};

const submitPlanning = async (payload: { entityId: string; start: string; end?: string; command: 'schedule' | 'reschedule' }) => {
  const commandId = retryIds.get(payload.entityId) ?? newCommandId(payload.entityId, payload.command);
  retryIds.set(payload.entityId, commandId);
  const accepted = await execute({ type: payload.command, commandId, entityId: payload.entityId, planned: { start: payload.start as any, ...(payload.end ? { end: payload.end as any } : {}) } });
  if (accepted) editingId.value = undefined;
};

const changeCompletion = async (entityId: string, type: 'complete' | 'reopen') => {
  const commandId = retryIds.get(entityId) ?? newCommandId(entityId, type);
  retryIds.set(entityId, commandId);
  await execute({ type, commandId, entityId });
};

const PlanningForm = defineComponent({
  props: { entityId: { type: String, required: true }, start: { type: String, required: true }, end: String, command: { type: String as () => 'schedule' | 'reschedule', required: true } },
  emits: ['cancel', 'submit'],
  setup(formProps, { emit }) {
    const start = ref(formProps.start); const end = ref(formProps.end ?? '');
    return () => h('form', { 'data-dg-planning-form': '', onSubmit: (event: Event) => { event.preventDefault(); emit('submit', { entityId: formProps.entityId, start: start.value, end: end.value || undefined, command: formProps.command }); } }, [
      h('label', ['Début', h('input', { type: 'date', required: true, value: start.value, 'data-dg-field': 'start', onInput: (event: Event) => { start.value = (event.target as HTMLInputElement).value; } })]),
      h('label', ['Fin facultative', h('input', { type: 'date', value: end.value, 'data-dg-field': 'end', onInput: (event: Event) => { end.value = (event.target as HTMLInputElement).value; } })]),
      h('button', { type: 'button', onClick: () => emit('cancel') }, 'Annuler'),
      h('button', { type: 'submit', 'data-dg-submit': formProps.command }, 'Enregistrer'),
    ]);
  },
});
</script>

<style scoped>
.dreamglows-path-actions { margin: 1rem 0; padding: 1rem; border: 1px solid var(--background-modifier-border); border-radius: 12px; background: var(--background-primary-alt); }
.dreamglows-path-actions__header, .dreamglows-path-actions__list > li, .dreamglows-path-actions__tray li { display: flex; justify-content: space-between; align-items: center; gap: .75rem; }
.dreamglows-path-actions__header h2 { margin: .15rem 0; }
.dreamglows-path-actions__list, .dreamglows-path-actions__tray ul { display: grid; gap: .55rem; padding: 0; list-style: none; }
.dreamglows-path-actions__list > li, .dreamglows-path-actions__tray li { flex-wrap: wrap; padding: .65rem; border: 1px solid var(--background-modifier-border); border-radius: 9px; }
.dreamglows-path-actions__select { display: grid; flex: 1; min-width: 180px; justify-items: start; background: transparent; box-shadow: none; }
.dreamglows-path-actions__commands { display: flex; flex-wrap: wrap; gap: .4rem; }
[data-dg-planning-form] { flex-basis: 100%; display: flex; flex-wrap: wrap; align-items: end; gap: .6rem; padding-top: .5rem; }
[data-dg-planning-form] label { display: grid; gap: .25rem; }
.dreamglows-path-actions__tray { margin-top: 1rem; }
.dreamglows-path-actions__invalid { display: flex; gap: .5rem; margin-top: .75rem; padding: .75rem; border: 1px solid var(--text-error); border-radius: 8px; }
@media (max-width: 600px) { .dreamglows-path-actions__header, .dreamglows-path-actions__list > li, .dreamglows-path-actions__tray li { align-items: stretch; flex-direction: column; } }
</style>
