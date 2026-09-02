<template>
  <form class="dreamglows-task-modal" aria-labelledby="dreamglows-task-modal-title" :aria-busy="submitting" @submit.prevent="save">
    <header class="dreamglows-task-modal__header">
      <p class="dreamglows-task-modal__eyebrow">DreamGlows · Tâche</p>
      <h2 id="dreamglows-task-modal-title">{{ isEditing ? 'Modifier la tâche' : 'Nouvelle tâche' }}</h2>
      <p>Transformez une intention en prochaine étape concrète.</p>
    </header>

    <section class="dreamglows-task-modal__section" aria-labelledby="task-essential-title">
      <h3 id="task-essential-title">Essentiel</h3>
      <div class="dreamglows-modal-field">
        <label for="task-title">Titre <span aria-hidden="true">*</span></label>
        <input
          id="task-title"
          v-model="taskData.title"
          type="text"
          placeholder="Ex. Préparer la prochaine publication"
          required
          autofocus
        />
      </div>
      <div class="dreamglows-modal-field">
        <label for="task-description">Description</label>
        <textarea
          id="task-description"
          v-model="taskData.description"
          rows="3"
          placeholder="Quel résultat souhaitez-vous obtenir ?"
        ></textarea>
      </div>
    </section>

    <section class="dreamglows-task-modal__section" aria-labelledby="task-planning-title">
      <h3 id="task-planning-title">Planification</h3>
      <div class="dreamglows-task-modal__date-grid">
        <div class="dreamglows-modal-field"><label for="task-start-date">Date de début</label><input id="task-start-date" v-model="taskData.startDate" type="date" /></div>
        <div class="dreamglows-modal-field"><label for="task-due-date">Date de fin (optionnelle)</label><input id="task-due-date" v-model="taskData.dueDate" type="date" /></div>
      </div>
      <div class="dreamglows-task-modal__date-grid">
        <div class="dreamglows-modal-field"><label for="task-start-time">Heure de début</label><input id="task-start-time" v-model="taskData.startTime" type="time" /></div>
        <div class="dreamglows-modal-field"><label for="task-due-time">Heure de fin (optionnelle)</label><input id="task-due-time" v-model="taskData.dueTime" type="time" /></div>
      </div>
      <div class="dreamglows-task-modal__date-grid">
        <div class="dreamglows-modal-field"><label for="task-planned-minutes">Durée prévue (minutes)</label><input id="task-planned-minutes" v-model.number="taskData.plannedMinutes" type="number" min="0" step="5" /></div>
        <div class="dreamglows-modal-field"><label for="task-actual-minutes">Durée réelle (minutes)</label><input id="task-actual-minutes" v-model.number="taskData.actualMinutes" type="number" min="0" step="5" /></div>
      </div>
      <div class="dreamglows-task-modal__meta-grid">
        <div class="dreamglows-modal-field">
          <label for="task-goal">Objectif lié (optionnel)</label>
          <select id="task-goal" v-model="taskData.goalId">
            <option value="">Aucun objectif</option>
            <option v-for="goal in goalsStore.goals" :key="goal.id" :value="goal.id">{{ goal.title }}</option>
          </select>
        </div>
        <div class="dreamglows-modal-field">
          <label for="task-priority">Priorité</label>
          <select id="task-priority" v-model="taskData.priority">
            <option value="high">Haute</option>
            <option value="medium">Moyenne</option>
            <option value="low">Basse</option>
          </select>
        </div>
        <div class="dreamglows-modal-field">
          <label for="task-status">Statut</label>
          <select id="task-status" v-model="taskData.status">
            <option value="todo">À faire</option>
            <option value="in-progress">En cours</option>
            <option value="done">Terminée</option>
          </select>
        </div>
      </div>
    </section>

    <section class="dreamglows-task-modal__section" aria-labelledby="task-context-title">
      <h3 id="task-context-title">Contexte</h3>
      <div class="dreamglows-modal-field">
        <label for="task-notes">Notes</label>
        <textarea id="task-notes" v-model="taskData.notes" rows="3" placeholder="Liens, idées ou détails utiles"></textarea>
      </div>
      <div class="dreamglows-modal-field">
        <label for="task-tag">Tags</label>
        <div class="dreamglows-tags-input">
          <input id="task-tag" v-model="newTag" type="text" placeholder="Saisir un tag puis Entrée" @keydown.enter.prevent="addTag" />
          <div v-if="taskData.tags?.length" class="dreamglows-tags-container" aria-label="Tags ajoutés">
            <span v-for="tag in taskData.tags" :key="tag" class="dreamglows-tag">
              #{{ tag }}
              <button type="button" class="dreamglows-tag-remove" :aria-label="`Retirer le tag ${tag}`" @click="removeTag(tag)">×</button>
            </span>
          </div>
        </div>
      </div>
    </section>

    <footer class="dreamglows-modal-actions">
      <p v-if="feedback" :role="feedback.error ? 'alert' : 'status'">{{ feedback.text }}</p>
      <button v-if="isEditing" type="button" class="dreamglows-modal-delete" :disabled="submitting" @click="deleteTask">Archiver</button>
      <button type="submit" class="dreamglows-modal-save" :disabled="submitting">{{ isEditing ? 'Enregistrer les modifications' : 'Créer la tâche' }}</button>
    </footer>
  </form>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, inject } from 'vue';
import { useGoalsStore } from '@/stores/goalsStore';
import type { Task } from '@/types/tasks';
import { useDreamGlowsUiContext } from '@/application/ui-context';
import { usePathStore } from '@/stores/pathStore';
import { v4 as uuidv4 } from 'uuid';

const props = defineProps<{ editingTask?: Task; initialGoalId?: string }>();

const goalsStore = useGoalsStore();
const { entityEditor }=useDreamGlowsUiContext(); const pathStore=usePathStore();
const submitting=ref(false);const feedback=ref<{error:boolean;text:string}>();const operationId=ref<string>();const entityId=ref(props.editingTask?.id??uuidv4());
const closeModal = inject('closeModal') as () => void;
const isEditing = !!props.editingTask;
const newTag = ref('');

const taskData = reactive<Partial<Task>>({
  title: '',
  description: '',
  startDate: '',
  dueDate: '',
  startTime: '',
  dueTime: '',
  plannedMinutes: undefined,
  actualMinutes: undefined,
  priority: 'medium',
  status: 'todo',
  goalId: props.initialGoalId || '',
  notes: '',
  tags: []
});

onMounted(() => {
  if (props.editingTask) {
    Object.assign(taskData, props.editingTask);
  }
});

const addTag = () => {
  const tag = newTag.value.trim();
  if (tag && !taskData.tags?.includes(tag)) {
    if (!taskData.tags) taskData.tags = [];
    taskData.tags.push(tag);
    newTag.value = '';
  }
};

const removeTag = (tag: string) => {
  if (taskData.tags) taskData.tags = taskData.tags.filter((item) => item !== tag);
};

const save = async () => {
  const completeTaskData = {
    ...taskData,
    title: taskData.title || '',
    description: taskData.description || '',
    startDate: taskData.startDate || '',
    dueDate: taskData.dueDate || undefined,
    startTime: taskData.startTime || undefined,
    dueTime: taskData.dueTime || undefined,
    plannedMinutes: taskData.plannedMinutes !== undefined ? Number(taskData.plannedMinutes) : undefined,
    actualMinutes: taskData.actualMinutes !== undefined ? Number(taskData.actualMinutes) : undefined,
    priority: taskData.priority || 'medium',
    status: taskData.status || 'todo',
    goalId: taskData.goalId || undefined,
    notes: taskData.notes || '',
    tags: taskData.tags || [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    linkToOptimizer: taskData.linkToOptimizer || false,
    linkToGenerator: taskData.linkToGenerator || false
  };

  try {
    submitting.value=true;feedback.value=undefined;const commandId=operationId.value??uuidv4();operationId.value=commandId;const existing=pathStore.document?.envelope.entities.find(entity=>entity.id===entityId.value);const result=await entityEditor.saveAction({id:entityId.value,title:completeTaskData.title,description:completeTaskData.description,priority:completeTaskData.priority,tags:completeTaskData.tags,parentId:completeTaskData.goalId,planned:completeTaskData.startDate||completeTaskData.dueDate?{...(completeTaskData.startDate?{start:completeTaskData.startDate}:{}),...(completeTaskData.dueDate?{end:completeTaskData.dueDate}:{})}:undefined,status:completeTaskData.status,extensions:{...(existing?.extensions??{}),legacyStore:{startTime:completeTaskData.startTime??null,dueTime:completeTaskData.dueTime??null,plannedMinutes:completeTaskData.plannedMinutes??null,actualMinutes:completeTaskData.actualMinutes??null,notes:completeTaskData.notes,linkToOptimizer:completeTaskData.linkToOptimizer,linkToGenerator:completeTaskData.linkToGenerator}}},commandId);if(!result.accepted){operationId.value=undefined;feedback.value={error:true,text:`Enregistrement refusé : ${result.reason}.`};return}closeModal();
  } catch { feedback.value={error:true,text:'La sauvegarde a échoué; aucun changement n’a été enregistré.'}; }
  finally{submitting.value=false}
};

const deleteTask = async () => {
  if (!isEditing) return;
  submitting.value=true;feedback.value=undefined;try{const result=await entityEditor.archive(props.editingTask!.id,uuidv4());if(!result.accepted){feedback.value={error:true,text:`Archivage refusé : ${result.reason}.`};return}closeModal()}catch{feedback.value={error:true,text:'L’archivage a échoué; la tâche reste disponible.'}}finally{submitting.value=false}
};
</script>
