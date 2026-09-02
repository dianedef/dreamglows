<template>
  <form class="dreamglows-task-modal" aria-labelledby="dreamglows-task-modal-title" @submit.prevent="save">
    <header class="dreamglows-task-modal__header">
      <p class="dreamglows-task-modal__eyebrow">DreamGlows · Tâche</p>
      <h2 id="dreamglows-task-modal-title">{{ isEditing ? 'Modifier la tâche' : 'Nouvelle tâche' }}</h2>
      <p>Transformez une intention en prochaine étape concrète.</p>
    </header>
    <section class="dreamglows-task-modal__section" aria-labelledby="task-essential-title">
      <h3 id="task-essential-title">Essentiel</h3>
      <div class="dreamglows-modal-field"><label for="task-title">Titre <span aria-hidden="true">*</span></label><input id="task-title" v-model="taskData.title" type="text" placeholder="Ex. Préparer la prochaine publication" required autofocus /></div>
      <div class="dreamglows-modal-field"><label for="task-description">Description</label><textarea id="task-description" v-model="taskData.description" rows="3" placeholder="Quel résultat souhaitez-vous obtenir ?"></textarea></div>
    </section>
    <section class="dreamglows-task-modal__section" aria-labelledby="task-planning-title">
      <h3 id="task-planning-title">Planification</h3>
      <div class="dreamglows-task-modal__date-grid">
        <div class="dreamglows-modal-field"><label for="task-start-date">Date de début</label><input id="task-start-date" v-model="taskData.startDate" type="date" /></div>
        <div class="dreamglows-modal-field"><label for="task-due-date">Date de fin <span>(optionnelle)</span></label><input id="task-due-date" v-model="taskData.dueDate" type="date" /></div>
      </div>
      <div class="dreamglows-task-modal__meta-grid">
        <div class="dreamglows-modal-field"><label for="task-goal">Objectif lié <span>(optionnel)</span></label><select id="task-goal" v-model="taskData.goalId"><option value="">Aucun objectif</option><option v-for="goal in goalsStore.getGoals" :key="goal.id" :value="goal.id">{{ goal.title }}</option></select></div>
        <div class="dreamglows-modal-field"><label for="task-priority">Priorité</label><select id="task-priority" v-model="taskData.priority"><option value="high">Haute</option><option value="medium">Moyenne</option><option value="low">Basse</option></select></div>
        <div class="dreamglows-modal-field"><label for="task-status">Statut</label><select id="task-status" v-model="taskData.status"><option value="todo">À faire</option><option value="in-progress">En cours</option><option value="done">Terminée</option></select></div>
      </div>
    </section>
    <section class="dreamglows-task-modal__section" aria-labelledby="task-context-title">
      <h3 id="task-context-title">Contexte</h3>
      <div class="dreamglows-modal-field"><label for="task-notes">Notes</label><textarea id="task-notes" v-model="taskData.notes" rows="3" placeholder="Liens, idées ou détails utiles"></textarea></div>
      <div class="dreamglows-modal-field">
        <label for="task-tag">Tags</label>
        <div class="dreamglows-tags-input"><input id="task-tag" v-model="newTag" type="text" placeholder="Saisir un tag puis Entrée" @keydown.enter.prevent="addTag" /><div v-if="taskData.tags?.length" class="dreamglows-tags-container" aria-label="Tags ajoutés"><span v-for="tag in taskData.tags" :key="tag" class="dreamglows-tag">#{{ tag }}<button type="button" class="dreamglows-tag-remove" :aria-label="`Retirer le tag ${tag}`" @click="removeTag(tag)">×</button></span></div></div>
      </div>
    </section>
    <footer class="dreamglows-modal-actions"><button v-if="isEditing" type="button" class="dreamglows-modal-delete" @click="deleteTask">Supprimer</button><button type="submit" class="dreamglows-modal-save">{{ isEditing ? 'Enregistrer les modifications' : 'Créer la tâche' }}</button></footer>
  </form>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, inject } from 'vue';
import { useTasksStore } from '@/stores/tasksStore';
import { useGoalsStore } from '@/stores/goalsStore';
import type { Task } from '@/types/tasks';
const props = defineProps<{ editingTask?: Task; initialGoalId?: string }>();
const tasksStore = useTasksStore(); const goalsStore = useGoalsStore(); const closeModal = inject('closeModal') as () => void;
const isEditing = !!props.editingTask; const newTag = ref('');
const taskData = reactive<Partial<Task>>({ title: '', description: '', startDate: '', dueDate: '', priority: 'medium', status: 'todo', goalId: props.initialGoalId || '', notes: '', tags: [] });
onMounted(() => { if (props.editingTask) Object.assign(taskData, props.editingTask); });
const addTag = () => { const tag = newTag.value.trim(); if (tag && !taskData.tags?.includes(tag)) { if (!taskData.tags) taskData.tags = []; taskData.tags.push(tag); newTag.value = ''; } };
const removeTag = (tag: string) => { if (taskData.tags) taskData.tags = taskData.tags.filter(item => item !== tag); };
const save = async () => {
  const completeTaskData = { ...taskData, title: taskData.title || '', description: taskData.description || '', startDate: taskData.startDate || new Date().toISOString().split('T')[0], dueDate: taskData.dueDate || undefined, priority: taskData.priority || 'medium', status: taskData.status || 'todo', goalId: taskData.goalId || undefined, notes: taskData.notes || '', tags: taskData.tags || [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), linkToOptimizer: taskData.linkToOptimizer || false, linkToGenerator: taskData.linkToGenerator || false };
  try { const savedTask = isEditing ? await tasksStore.updateTask({ ...completeTaskData, id: props.editingTask!.id }) : await tasksStore.addTask(completeTaskData); if (savedTask?.goalId) await goalsStore.addTaskToGoal(savedTask.goalId, savedTask.id); closeModal(); } catch (error) { console.error('Erreur lors de la sauvegarde de la tâche:', error); }
};
const deleteTask = async () => { if (!isEditing) return; const deletedTask = await tasksStore.deleteTask(props.editingTask!.id); if (deletedTask?.goalId) await goalsStore.removeTaskFromGoal(deletedTask.goalId, deletedTask.id); closeModal(); };
</script>
