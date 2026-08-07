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
        <span class="dreamglows-stat-label">À faire</span>
        <span class="dreamglows-stat-value">{{ todoCount }}</span>
      </div>
      <div class="dreamglows-stat-item">
        <span class="dreamglows-stat-label">En cours</span>
        <span class="dreamglows-stat-value">{{ inProgressCount }}</span>
      </div>
      <div class="dreamglows-stat-item">
        <span class="dreamglows-stat-label">Terminé</span>
        <span class="dreamglows-stat-value">{{ doneCount }}</span>
      </div>
    </div>

    <div class="dreamglows-task-search">
      <input 
        v-model="searchQuery" 
        type="text" 
        placeholder="Rechercher une tâche..." 
        class="dreamglows-search-input"
      />
    </div>

    <div class="dreamglows-task-filters">
      <select v-model="filterStatus" class="dreamglows-filter">
        <option value="">Tous les statuts</option>
        <option value="todo">À faire</option>
        <option value="in-progress">En cours</option>
        <option value="done">Terminé</option>
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

    <div 
      class="dreamglows-tasks-container"
      @dblclick.self="openNewTaskModal"
    >
      <div v-for="task in sortedAndFilteredTasks" 
           :key="task.id" 
           class="dreamglows-task-item"
           :class="[
             'dreamglows-priority-' + task.priority,
             'dreamglows-status-' + task.status
           ]"
           @dblclick="editTask(task)">
        <div class="dreamglows-task-header">
          <div class="dreamglows-task-controls">
            <button 
              class="dreamglows-task-status-btn" 
              @click="cycleStatus(task)"
              :title="getNextStatusLabel(task.status)">
              {{ getStatusEmoji(task.status) }}
            </button>
            <button 
              class="dreamglows-task-edit-btn"
              @click="editTask(task)"
              title="Modifier la tâche">
              ✍️
            </button>
          </div>
          <div class="dreamglows-task-priority">
            <button 
              class="dreamglows-task-priority-btn"
              @click="cyclePriority(task)"
              :title="getNextPriorityLabel(task.priority)">
              {{ getPriorityLabel(task.priority) }}
            </button>
          </div>
        </div>
        <div class="dreamglows-task-title">{{ task.title }}</div>
        <div v-if="task.startDate" class="dreamglows-task-date">
          {{ formatDate(task.startDate) }}
          <span v-if="task.dueDate" class="dreamglows-task-due-date">
            → {{ formatDate(task.dueDate) }}
          </span>
        </div>
        <div v-if="task.tags?.length" class="dreamglows-task-tags">
          <span v-for="tag in task.tags" 
                :key="tag" 
                class="dreamglows-tag">
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
import { TaskModal } from '@/components/modals/TaskModal';
import { storeToRefs } from 'pinia';
import { useApp } from '@/composables/useApp';

const { app } = useApp();
const tasksStore = useTasksStore();

// Statistiques avec storeToRefs pour la réactivité
const { tasks } = storeToRefs(tasksStore);

const filterStatus = ref('');
const filterPriority = ref('');
const searchQuery = ref('');
const sortBy = ref('date');

const todoCount = computed(() => {
  console.log('📊 Calcul todoCount avec', tasks.value.length, 'tâches');
  return tasks.value.filter(t => t.status === 'todo').length;
});

const inProgressCount = computed(() => {
  console.log('📊 Calcul inProgressCount avec', tasks.value.length, 'tâches');
  return tasks.value.filter(t => t.status === 'in-progress').length;
});

const doneCount = computed(() => {
  console.log('📊 Calcul doneCount avec', tasks.value.length, 'tâches');
  return tasks.value.filter(t => t.status === 'done').length;
});

// Filtrage et tri
const filteredTasks = computed(() => {
  console.log('🔍 Filtrage des tâches:', tasks.value.length, 'tâches');
  return tasks.value.filter(task => {
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
  console.log('📋 Tri des tâches filtrées:', tasks.length, 'tâches');
  const priorityOrder = { high: 0, medium: 1, low: 2 };

  switch (sortBy.value) {
    case 'date':
      return tasks.sort((a, b) => {
        if (!a.startDate) return 1;
        if (!b.startDate) return -1;
        return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
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
  const modal = new TaskModal(app);
  modal.open();
};

const editTask = (task: Task) => {
  const modal = new TaskModal(app, task);
  modal.open();
};
</script>
