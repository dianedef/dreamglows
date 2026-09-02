<template>
  <div class="dreamglows-task-list">
    <div class="dreamglows-task-list-header">
      <h3>Liste des tâches</h3>
      <button @click="openNewTaskModal" class="dreamglows-add-task-btn">
        <i class="fas fa-plus"></i> Nouvelle tâche
      </button>
    </div>

    <div class="dreamglows-task-stats">
      <div class="dreamglows-stat-item">
        <span class="dreamglows-stat-label">A faire</span>
        <span class="dreamglows-stat-value">{{ todoCount }}</span>
      </div>
      <div class="dreamglows-stat-item">
        <span class="dreamglows-stat-label">En cours</span>
        <span class="dreamglows-stat-value">{{ inProgressCount }}</span>
      </div>
      <div class="dreamglows-stat-item">
        <span class="dreamglows-stat-label">Termine</span>
        <span class="dreamglows-stat-value">{{ doneCount }}</span>
      </div>
    </div>

    <div class="dreamglows-task-search">
      <input v-model="searchQuery" type="text" placeholder="Rechercher une tâche..." class="dreamglows-search-input" />
    </div>

    <div class="dreamglows-task-filters">
      <select v-model="filterStatus" class="dreamglows-filter">
        <option value="">Tous les statuts</option>
        <option value="todo">A faire</option>
        <option value="in-progress">En cours</option>
        <option value="done">Termine</option>
      </select>
      <select v-model="filterPriority" class="dreamglows-filter">
        <option value="">Toutes les priorités</option>
        <option value="high">Haute</option>
        <option value="medium">Moyenne</option>
        <option value="low">Basse</option>
      </select>
      <select v-model="sortBy" class="dreamglows-filter">
        <option value="date">Date</option>
        <option value="priority">Priorité</option>
        <option value="title">Titre</option>
      </select>
    </div>

    <div class="dreamglows-tasks-container" @dblclick.self="openNewTaskModal">
      <div
        v-for="task in sortedAndFilteredTasks"
        :key="task.id"
        class="dreamglows-task-item"
        :class="[
          'dreamglows-priority-' + task.priority,
          'dreamglows-status-' + task.status
        ]"
        @dblclick="editTask(task)"
      >
        <div class="dreamglows-task-header">
          <div class="dreamglows-task-controls">
            <button class="dreamglows-task-status-btn" @click="cycleStatus(task)" :title="getNextStatusLabel(task.status)">
              {{ getStatusEmoji(task.status) }}
            </button>
            <button class="dreamglows-task-edit-btn" @click="editTask(task)" title="Modifier la tâche">
              ✏
            </button>
          </div>
          <div class="dreamglows-task-priority">
            <button class="dreamglows-task-priority-btn" @click="cyclePriority(task)" :title="getNextPriorityLabel(task.priority)">
              {{ getPriorityLabel(task.priority) }}
            </button>
          </div>
        </div>
        <div class="dreamglows-task-title">{{ task.title }}</div>
        <div v-if="task.startDate" class="dreamglows-task-date">
          {{ formatDate(task.startDate) }}
          <span v-if="task.dueDate" class="dreamglows-task-due-date"> -> {{ formatDate(task.dueDate) }}</span>
        </div>
        <div v-if="task.startTime || task.dueTime" class="dreamglows-task-time-range">
          {{ task.startTime || '--:--' }}{{ task.dueTime ? ` -> ${task.dueTime}` : '' }}
        </div>
        <div v-if="task.plannedMinutes || task.actualMinutes" class="dreamglows-task-time-range">
          {{ task.plannedMinutes ? `Prévu: ${formatDuration(task.plannedMinutes)}` : 'Prévu: n/a' }}
          {{ task.actualMinutes ? `· Réel: ${formatDuration(task.actualMinutes)}` : '' }}
        </div>
        <div v-if="task.tags?.length" class="dreamglows-task-tags">
          <span v-for="tag in task.tags" :key="tag" class="dreamglows-tag">#{{ tag }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useTasksStore } from '@/stores/tasksStore';
import type { Task, TaskStatus, TaskPriority } from '@/types/tasks';
import { TaskModal } from '@/components/modals/TaskModal';
import { storeToRefs } from 'pinia';
import { useApp } from '@/composables/useApp';

const { app } = useApp();
const tasksStore = useTasksStore();

const { tasks } = storeToRefs(tasksStore);

const filterStatus = ref('');
const filterPriority = ref('');
const searchQuery = ref('');
const sortBy = ref('date');

const todoCount = computed(() => tasks.value.filter(t => t.status === 'todo').length);
const inProgressCount = computed(() => tasks.value.filter(t => t.status === 'in-progress').length);
const doneCount = computed(() => tasks.value.filter(t => t.status === 'done').length);

const filteredTasks = computed(() => tasks.value.filter(task => {
  if (filterStatus.value && task.status !== filterStatus.value) return false;
  if (filterPriority.value && task.priority !== filterPriority.value) return false;
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    const titleMatch = task.title.toLowerCase().includes(query);
    const tagsMatch = task.tags?.some(tag => tag.toLowerCase().includes(query));
    if (!titleMatch && !tagsMatch) return false;
  }
  return true;
}));

const sortedAndFilteredTasks = computed(() => {
  const list = [...filteredTasks.value];
  const priorityOrder = { high: 0, medium: 1, low: 2 };

  switch (sortBy.value) {
    case 'date':
      return list.sort((a, b) => {
        if (!a.startDate) return 1;
        if (!b.startDate) return -1;
        const dateA = new Date(`${a.startDate}${a.startTime ? `T${a.startTime}` : ''}`).getTime();
        const dateB = new Date(`${b.startDate}${b.startTime ? `T${b.startTime}` : ''}`).getTime();
        return dateB - dateA;
      });
    case 'priority':
      return list.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
    case 'title':
      return list.sort((a, b) => a.title.localeCompare(b.title));
    default:
      return list;
  }
});

const getStatusLabel = (status: TaskStatus) => ({ todo: 'À faire', 'in-progress': 'En cours', done: 'Terminé' }[status]);
const getStatusEmoji = (status: TaskStatus) => ({ todo: '◻', 'in-progress': '🔥', done: '✔' }[status]);

const getNextStatus = (status: TaskStatus): TaskStatus => ({
  todo: 'in-progress',
  in-progress: 'done',
  done: 'todo'
}[status]);

const getNextStatusLabel = (status: TaskStatus) => `Marquer comme ${getStatusLabel(getNextStatus(status)).toLowerCase()}`;
const cycleStatus = (task: Task) => tasksStore.updateTask({ ...task, status: getNextStatus(task.status) });

const getPriorityLabel = (priority: TaskPriority) => ({ high: '! Haute', medium: '- Moyenne', low: '+ Basse' }[priority]);
const getNextPriority = (priority: TaskPriority): TaskPriority => ({ high: 'medium', medium: 'low', low: 'high' }[priority]);
const getNextPriorityLabel = (priority: TaskPriority) => `Changer en priorité ${getPriorityLabel(getNextPriority(priority)).toLowerCase()}`;
const cyclePriority = (task: Task) => tasksStore.updateTask({ ...task, priority: getNextPriority(task.priority) });

const formatDate = (date: string) => new Date(date).toLocaleDateString('fr-FR');
const formatDuration = (minutes?: number) => {
  if (!minutes || minutes <= 0) return '0 min';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins} min`;
  if (mins === 0) return `${hours} h`;
  return `${hours} h ${mins} min`;
};

const openNewTaskModal = () => new TaskModal(app).open();
const editTask = (task: Task) => new TaskModal(app, task).open();
</script>
