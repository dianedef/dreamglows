<template>
  <form @submit.prevent="save" class="dreamglows-task-modal">
    <div class="dreamglows-modal-field">
      <label>Titre</label>
      <input v-model="taskData.title" type="text" placeholder="Titre de la tâche" required />
    </div>

    <div class="dreamglows-modal-field">
      <label>Description</label>
      <textarea 
        v-model="taskData.description" 
        placeholder="Description de la tâche"
        @keydown.enter.exact.prevent="save"
      ></textarea>
    </div>

    <div class="dreamglows-modal-field">
      <label>Date de début</label>
      <input v-model="taskData.startDate" type="date" />
    </div>

    <div class="dreamglows-modal-field">
      <label>Date de fin (optionnelle)</label>
      <input v-model="taskData.dueDate" type="date" />
    </div>

    <div class="dreamglows-modal-field">
      <label>Notes</label>
      <textarea 
        v-model="taskData.notes" 
        placeholder="Notes additionnelles"
        rows="3"
      ></textarea>
    </div>

    <div class="dreamglows-modal-field">
      <label>Objectif lié (optionnel)</label>
      <select v-model="taskData.goalId">
        <option value="">Aucun objectif</option>
        <option v-for="goal in goalsStore.getGoals" 
                :key="goal.id" 
                :value="goal.id">
          {{ goal.title }}
        </option>
      </select>
    </div>

    <div class="dreamglows-modal-field">
      <label>Priorité</label>
      <select v-model="taskData.priority">
        <option value="high">Haute</option>
        <option value="medium">Moyenne</option>
        <option value="low">Basse</option>
      </select>
    </div>

    <div class="dreamglows-modal-field">
      <label>Statut</label>
      <select v-model="taskData.status">
        <option value="todo">À faire</option>
        <option value="in-progress">En cours</option>
        <option value="done">Terminé</option>
      </select>
    </div>

    <div class="dreamglows-modal-field">
      <label>Tags</label>
      <div class="dreamglows-tags-input">
        <input v-model="newTag" 
               @keydown.enter.prevent="addTag"
               type="text" 
               placeholder="Ajouter un tag" />
        <div class="dreamglows-tags-container">
          <span v-for="tag in taskData.tags" 
                :key="tag" 
                class="dreamglows-tag">
            #{{ tag }}
            <button type="button" @click="removeTag(tag)" class="dreamglows-tag-remove">×</button>
          </span>
        </div>
      </div>
    </div>

    <div class="dreamglows-modal-actions">
      <button type="submit" class="dreamglows-modal-save">Enregistrer</button>
      <button v-if="isEditing" type="button" @click="deleteTask" class="dreamglows-modal-delete">Supprimer</button>
    </div>
  </form>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, inject } from 'vue';
import { useTasksStore } from '@/stores/tasksStore';
import { useGoalsStore } from '@/stores/goalsStore';
import type { Task } from '@/types/tasks';

const props = defineProps<{
  editingTask?: Task;
  initialGoalId?: string;
}>();

const tasksStore = useTasksStore();
const goalsStore = useGoalsStore();
const closeModal = inject('closeModal') as () => void;
const isEditing = !!props.editingTask;
const newTag = ref('');

const taskData = reactive<Partial<Task>>({
  title: '',
  description: '',
  startDate: '',
  dueDate: '',
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
  if (newTag.value && !taskData.tags?.includes(newTag.value)) {
    if (!taskData.tags) taskData.tags = [];
    taskData.tags.push(newTag.value);
    newTag.value = '';
  }
};

const removeTag = (tag: string) => {
  if (taskData.tags) {
    taskData.tags = taskData.tags.filter(t => t !== tag);
  }
};

const save = async () => {
  console.log('💾 Début de la sauvegarde de la tâche');
  
  const completeTaskData = {
    ...taskData,
    title: taskData.title || '',
    description: taskData.description || '',
    startDate: taskData.startDate || new Date().toISOString().split('T')[0],
    dueDate: taskData.dueDate || undefined,
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

  console.log('💾 Données complètes de la tâche:', completeTaskData);

  try {
    let savedTask;
    if (isEditing) {
      console.log('✏️ Mise à jour de la tâche existante');
      savedTask = await tasksStore.updateTask({ ...completeTaskData, id: props.editingTask!.id });
    } else {
      console.log('➕ Ajout d\'une nouvelle tâche');
      savedTask = await tasksStore.addTask(completeTaskData);
    }

    // Si la tâche est liée à un objectif, mettre à jour l'objectif
    if (savedTask && savedTask.goalId) {
      await goalsStore.addTaskToGoal(savedTask.goalId, savedTask.id);
    }

    console.log('✅ Sauvegarde réussie');
    closeModal();
  } catch (error) {
    console.error('❌ Erreur lors de la sauvegarde:', error);
  }
};

const deleteTask = async () => {
  if (isEditing) {
    const deletedTask = await tasksStore.deleteTask(props.editingTask!.id);
    if (deletedTask && deletedTask.goalId) {
      await goalsStore.removeTaskFromGoal(deletedTask.goalId, deletedTask.id);
    }
    closeModal();
  }
};
</script>
