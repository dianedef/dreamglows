<template>
  <div class="goalflowz-task-list">
    <div class="goalflowz-task-list-header">
      <h3>Liste des tâches</h3>
      <button @click="openNewTaskModal" class="goalflowz-add-task-btn">
        <i class="fas fa-plus"></i> Nouvelle tâche
      </button>
    </div>

    <div class="goalflowz-task-stats">
      <div class="goalflowz-stat-item">
        <span class="goalflowz-stat-label">À faire</span>
        <span class="goalflowz-stat-value">{{ todoCount }}</span>
      </div>
      <div class="goalflowz-stat-item">
        <span class="goalflowz-stat-label">En cours</span>
        <span class="goalflowz-stat-value">{{ inProgressCount }}</span>
      </div>
      <div class="goalflowz-stat-item">
        <span class="goalflowz-stat-label">Terminé</span>
        <span class="goalflowz-stat-value">{{ doneCount }}</span>
      </div>
    </div>

    <div class="goalflowz-task-search">
      <input 
        v-model="searchQuery" 
        type="text" 
        placeholder="Rechercher une tâche..." 
        class="goalflowz-search-input"
      />
    </div>

    <div class="goalflowz-task-filters">
      <select v-model="filterStatus" class="goalflowz-filter">
        <option value="">Tous les statuts</option>
        <option value="todo">À faire</option>
        <option value="in-progress">En cours</option>
        <option value="done">Terminé</option>
      </select>
      <select v-model="filterPriority" class="goalflowz-filter">
        <option value="">Toutes les priorités</option>
        <option value="high">Haute</option>
        <option value="medium">Moyenne</option>
        <option value="low">Basse</option>
      </select>
      <select v-model="sortBy" class="goalflowz-filter">
        <option value="date">Date</option>
        <option value="priority">Priorité</option>
        <option value="title">Titre</option>
      </select>
    </div>

    <div 
      class="goalflowz-tasks-container"
      @dblclick.self="openNewTaskModal"
    >
      <div v-for="task in sortedAndFilteredTasks" 
           :key="task.id" 
           class="goalflowz-task-item"
           :class="[
             'goalflowz-priority-' + task.priority,
             'goalflowz-status-' + task.status
           ]"
           @dblclick="editTask(task)">
        <div class="goalflowz-task-header">
          <div class="goalflowz-task-controls">
            <button 
              class="goalflowz-task-status-btn" 
              @click="cycleStatus(task)"
              :title="getNextStatusLabel(task.status)">
              {{ getStatusEmoji(task.status) }}
            </button>
            <button 
              class="goalflowz-task-edit-btn"
              @click="editTask(task)"
              title="Modifier la tâche">
              ✍️
            </button>
          </div>
          <div class="goalflowz-task-priority">
            <button 
              class="goalflowz-task-priority-btn"
              @click="cyclePriority(task)"
              :title="getNextPriorityLabel(task.priority)">
              {{ getPriorityLabel(task.priority) }}
            </button>
          </div>
        </div>
        <div class="goalflowz-task-title">{{ task.title }}</div>
        <div v-if="task.date" class="goalflowz-task-date">
          {{ formatDate(task.date) }}
        </div>
        <div v-if="task.tags?.length" class="goalflowz-task-tags">
          <span v-for="tag in task.tags" 
                :key="tag" 
                class="goalflowz-tag">
            #{{ tag }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useTasksStore } from '@/stores/tasksStore';
import type { Task, TaskStatus, TaskPriority } from '@/types/tasks';
import { TaskModal } from '@/main';

const props = defineProps<{
  app: any;
}>();

const tasksStore = useTasksStore();
const filterStatus = ref('');
const filterPriority = ref('');
const searchQuery = ref('');
const sortBy = ref('date');

// Statistiques
const todoCount = computed(() => 
  tasksStore.getTasks.filter(t => t.status === 'todo').length
);
const inProgressCount = computed(() => 
  tasksStore.getTasks.filter(t => t.status === 'in-progress').length
);
const doneCount = computed(() => 
  tasksStore.getTasks.filter(t => t.status === 'done').length
);

// Filtrage et tri
const filteredTasks = computed(() => {
  return tasksStore.getTasks.filter(task => {
    if (filterStatus.value && task.status !== filterStatus.value) return false;
    if (filterPriority.value && task.priority !== filterPriority.value) return false;
    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase();
      const titleMatch = task.title.toLowerCase().includes(query);
      const tagsMatch = task.tags?.some(tag => tag.toLowerCase().includes(query));
      if (!titleMatch && !tagsMatch) return false;
    }
    return true;
  });
});

const sortedAndFilteredTasks = computed(() => {
  const tasks = [...filteredTasks.value];
  const priorityOrder = { high: 0, medium: 1, low: 2 };

  switch (sortBy.value) {
    case 'date':
      return tasks.sort((a, b) => {
        if (!a.date) return 1;
        if (!b.date) return -1;
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });
    case 'priority':
      return tasks.sort((a, b) => 
        priorityOrder[a.priority] - priorityOrder[b.priority]
      );
    case 'title':
      return tasks.sort((a, b) => 
        a.title.localeCompare(b.title)
      );
    default:
      return tasks;
  }
});

const getStatusLabel = (status: TaskStatus) => {
  const labels = {
    'todo': 'À faire',
    'in-progress': 'En cours',
    'done': 'Terminé'
  };
  return labels[status];
};

const getStatusEmoji = (status: TaskStatus) => {
  const emojis = {
    'todo': '💤',
    'in-progress': '🔥',
    'done': '✅'
  };
  return emojis[status];
};

const getNextStatus = (status: TaskStatus): TaskStatus => {
  const statusOrder = {
    'todo': 'in-progress',
    'in-progress': 'done',
    'done': 'todo'
  } as const;
  return statusOrder[status];
};

const getNextStatusLabel = (status: TaskStatus) => {
  return `Marquer comme ${getStatusLabel(getNextStatus(status))}`;
};

const cycleStatus = (task: Task) => {
  tasksStore.updateTask({
    ...task,
    status: getNextStatus(task.status)
  });
};

const getPriorityLabel = (priority: TaskPriority) => {
  const labels = {
    'high': '⚡ Haute',
    'medium': '◆ Moyenne',
    'low': '○ Basse'
  };
  return labels[priority];
};

const getNextPriority = (priority: TaskPriority): TaskPriority => {
  const priorityOrder = {
    'high': 'medium',
    'medium': 'low',
    'low': 'high'
  } as const;
  return priorityOrder[priority];
};

const getNextPriorityLabel = (priority: TaskPriority) => {
  return `Changer en priorité ${getPriorityLabel(getNextPriority(priority)).toLowerCase()}`;
};

const cyclePriority = (task: Task) => {
  tasksStore.updateTask({
    ...task,
    priority: getNextPriority(task.priority)
  });
};

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('fr-FR');
};

const openNewTaskModal = () => {
  const modal = new TaskModal(props.app);
  modal.open();
};

const editTask = (task: Task) => {
  const modal = new TaskModal(props.app, task);
  modal.open();
};
</script>
