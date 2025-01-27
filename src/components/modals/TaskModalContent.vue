<template>
  <div class="goalflowz-task-modal">
    <div class="goalflowz-modal-field">
      <label>Titre</label>
      <input v-model="taskData.title" type="text" placeholder="Titre de la tâche" />
    </div>

    <div class="goalflowz-modal-field">
      <label>Description</label>
      <textarea v-model="taskData.description" placeholder="Description de la tâche"></textarea>
    </div>

    <div class="goalflowz-modal-field">
      <label>Date</label>
      <input v-model="taskData.date" type="date" />
    </div>

    <div class="goalflowz-modal-field">
      <label>Priorité</label>
      <select v-model="taskData.priority">
        <option value="high">Haute</option>
        <option value="medium">Moyenne</option>
        <option value="low">Basse</option>
      </select>
    </div>

    <div class="goalflowz-modal-field">
      <label>Statut</label>
      <select v-model="taskData.status">
        <option value="todo">À faire</option>
        <option value="in-progress">En cours</option>
        <option value="done">Terminé</option>
      </select>
    </div>

    <div class="goalflowz-modal-field">
      <label>Tags</label>
      <div class="goalflowz-tags-input">
        <input v-model="newTag" 
               @keydown.enter.prevent="addTag"
               type="text" 
               placeholder="Ajouter un tag" />
        <div class="goalflowz-tags-container">
          <span v-for="tag in taskData.tags" 
                :key="tag" 
                class="goalflowz-tag">
            #{{ tag }}
            <button @click="removeTag(tag)" class="goalflowz-tag-remove">×</button>
          </span>
        </div>
      </div>
    </div>

    <div class="goalflowz-modal-actions">
      <button @click="save" class="goalflowz-modal-save">Enregistrer</button>
      <button v-if="isEditing" @click="deleteTask" class="goalflowz-modal-delete">Supprimer</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useTasksStore } from '@/stores/tasksStore';
import type { Task } from '@/types/tasks';

const props = defineProps<{
  task?: Task;
  onSave: () => void;
  onClose: () => void;
}>();

const tasksStore = useTasksStore();
const isEditing = !!props.task;
const newTag = ref('');

const taskData = reactive<Partial<Task>>({
  title: '',
  description: '',
  date: '',
  priority: 'medium',
  status: 'todo',
  tags: []
});

onMounted(() => {
  if (props.task) {
    Object.assign(taskData, props.task);
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

const save = () => {
  if (isEditing) {
    tasksStore.updateTask({ ...taskData, id: props.task!.id });
  } else {
    tasksStore.addTask(taskData);
  }
  props.onSave();
  props.onClose();
};

const deleteTask = () => {
  if (isEditing) {
    tasksStore.deleteTask(props.task!.id);
    props.onClose();
  }
};
</script>
