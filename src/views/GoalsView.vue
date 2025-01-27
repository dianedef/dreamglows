<template>
  <div class="goalflowz-goals-view">
    <div class="goalflowz-goals-header">
      <h2>Objectifs</h2>
      <div class="goalflowz-goals-controls">
        <button @click="openNewGoalModal" class="goalflowz-add-goal-btn">
          <i class="fas fa-plus"></i> Nouvel objectif
        </button>
      </div>
    </div>
    
    <div class="goalflowz-content">
      <div 
        ref="timelineContainer" 
        class="goalflowz-timeline-container"
        :style="{ width: `${mainWidth}%` }"
      ></div>
      <div 
        class="goalflowz-resize-handle"
        @mousedown="startResize"
      ></div>
      <div 
        class="goalflowz-task-container"
        :style="{ width: `${100 - mainWidth}%` }"
      >
        <TaskList :app="props.app" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { Timeline, DataSet } from 'vis-timeline/standalone';
import type { Goal } from '@/types/goals';
import { useGoalsStore } from '@/stores/goalsStore';
import { useModalStore } from '@/stores/modalStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { GoalModal, CategoryModal } from '@/main';
import TaskList from '@/components/TaskList.vue';

const props = defineProps<{
  contentFiles: any[];
  app: any;
}>();

const goalsStore = useGoalsStore();
const modalStore = useModalStore();
const settingsStore = useSettingsStore();
const timelineContainer = ref<HTMLElement | null>(null);
let timeline: Timeline | null = null;

// Gestion du redimensionnement
const isResizing = ref(false);
const startX = ref(0);
const startWidth = ref(0);
const mainWidth = ref(settingsStore.settings.lastMainWidth);

const startResize = (e: MouseEvent) => {
    isResizing.value = true;
    startX.value = e.clientX;
    startWidth.value = mainWidth.value;
    document.addEventListener('mousemove', handleResize);
    document.addEventListener('mouseup', stopResize);
    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';
};

const handleResize = (e: MouseEvent) => {
    if (!isResizing.value) return;
    
    const dx = e.clientX - startX.value;
    const containerWidth = document.querySelector('.goalflowz-content')?.clientWidth || 0;
    const percentageDelta = (dx / containerWidth) * 100;
    
    let newWidth = startWidth.value + percentageDelta;
    // Limiter la largeur entre 30% et 70%
    newWidth = Math.max(30, Math.min(70, newWidth));
    
    mainWidth.value = newWidth;
    // Sauvegarder la nouvelle largeur dans les settings
    settingsStore.updateSettings({ lastMainWidth: newWidth });
};

const stopResize = () => {
    isResizing.value = false;
    document.removeEventListener('mousemove', handleResize);
    document.removeEventListener('mouseup', stopResize);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
};

// Conversion des goals en items pour la timeline
const createTimelineItems = (goals: Goal[]) => {
  return goals.map(goal => ({
    id: goal.id,
    group: goal.category || 'Sans catégorie',
    content: `
      <div class="goalflowz-timeline-item-title">
        ${goal.title}
        <span class="goalflowz-timeline-item-progress">${goal.progress}%</span>
      </div>
      ${goal.tags?.length ? `
        <div class="goalflowz-timeline-item-tags">
          ${goal.tags.map(tag => `<span class="goalflowz-tag">#${tag}</span>`).join(' ')}
        </div>
      ` : ''}
    `,
    start: new Date(goal.startDate),
    end: goal.dueDate ? new Date(goal.dueDate) : undefined,
    type: goal.dueDate ? 'range' : 'box',
    style: `
      background-color: ${goal.status === 'todo' ? 'var(--background-primary)' : 
                         goal.status === 'in-progress' ? 'var(--interactive-accent)' : 
                         'var(--interactive-success)'};
      border-color: ${goal.priority === 'high' ? 'var(--text-error)' : 
                     goal.priority === 'medium' ? 'var(--text-warning)' : 
                     'var(--text-success)'};
      border-width: ${goal.priority === 'high' ? '2px' : '1px'};
    `,
    title: `
      <div>
        <strong>Statut:</strong> ${goal.status === 'todo' ? '⭕ À faire' : 
                                 goal.status === 'in-progress' ? '▶️ En cours' : 
                                 '✅ Terminé'}<br>
        <strong>Priorité:</strong> ${goal.priority === 'high' ? '⚡ Haute' : 
                                   goal.priority === 'medium' ? '◆ Moyenne' : 
                                   '○ Basse'}<br>
        <strong>Progression:</strong> ${goal.progress}%
      </div>
    `
  }));
};

// Créer les groupes pour la timeline
const createTimelineGroups = (goals: Goal[]) => {
  const categories = new Set(goals.map(goal => goal.category || 'Sans catégorie'));
  return Array.from(categories).map(category => ({
    id: category,
    content: category
  }));
};

// Initialisation de la timeline
onMounted(() => {
  if (!timelineContainer.value) return;

  const items = new DataSet(createTimelineItems(goalsStore.goals));
  const groups = new DataSet(createTimelineGroups(goalsStore.goals));
  
  const options = {
    orientation: 'top',
    zoomable: true,
    stack: true,
    height: '600px',
    horizontalScroll: true,
    verticalScroll: true,
    groupOrder: 'content',
    tooltip: {
      followMouse: true,
      overflowMethod: 'cap' as const,
      delay: 100
    },
    template: function (item: any) {
      return item.content;
    },
    groupTemplate: function(group: any) {
      return `<div class="goalflowz-timeline-group">${group.content}</div>`;
    },
    margin: {
      item: {
        horizontal: 10,
        vertical: 5
      }
    },
    showCurrentTime: true,
    onMove: (item: any, callback: any) => {
      const goal = goalsStore.goals.find(g => g.id === item.id);
      if (goal) {
        const updatedGoal = {
          ...goal,
          startDate: item.start.toISOString().split('T')[0],
          dueDate: item.end?.toISOString().split('T')[0]
        };
        goalsStore.updateGoal(updatedGoal);
      }
      callback(item);
    },
    onMoving: (item: any, callback: any) => {
      callback(item);
    },
    snap: (date: Date) => {
      const hour = 60 * 60 * 1000;
      return Math.round(date.getTime() / hour) * hour;
    }
  };

  timeline = new Timeline(timelineContainer.value, items, groups, options);

  // Gérer les événements de la timeline
  timeline.on('doubleClick', (properties: any) => {
    console.log('Timeline double-click properties:', properties);
    if (properties.item) {
      // Double-clic sur un objectif existant
      const goalId = properties.item;
      const goal = goalsStore.goals.find(g => g.id === goalId);
      if (goal) {
        const modal = new GoalModal(props.app, goal);
        modal.open();
      }
    } else if (properties.what === 'group-axis') {
      // Double-clic sur la zone des catégories (mais pas sur une catégorie)
      console.log('Double-click sur la zone des catégories');
      const modal = new CategoryModal(props.app, '');  // Catégorie vide = nouvelle catégorie
      modal.open();
    } else if (properties.group) {
      // Double-clic sur une catégorie existante
      console.log('Double-click sur groupe:', properties.group);
      const modal = new CategoryModal(props.app, properties.group);
      modal.open();
    } else if (properties.time || properties.snappedTime) {
      // Double-clic sur la timeline
      const modal = new GoalModal(props.app);
      const clickedDate = properties.snappedTime || properties.time.getTime();
      console.log('Double-click sur timeline, date cliquée:', new Date(clickedDate));
      modalStore.setInitialGoalData({
        startDate: new Date(clickedDate).toISOString().split('T')[0]
      });
      modal.open();
    }
  });

  timeline.on('select', (properties: any) => {
    // On peut utiliser cet événement pour d'autres interactions si nécessaire
  });

  timeline.on('rangechanged', () => {
    // Sauvegarder la plage de dates visible si nécessaire
  });

  // Ajouter des contrôles de zoom
  const zoomIn = () => timeline?.zoomIn(0.5);
  const zoomOut = () => timeline?.zoomOut(0.5);
  const moveLeft = () => {
    const currentWindow = timeline?.getWindow();
    if (currentWindow) {
      const interval = currentWindow.end.getTime() - currentWindow.start.getTime();
      timeline?.moveTo(new Date(currentWindow.start.getTime() - interval * 0.3));
    }
  };
  const moveRight = () => {
    const currentWindow = timeline?.getWindow();
    if (currentWindow) {
      const interval = currentWindow.end.getTime() - currentWindow.start.getTime();
      timeline?.moveTo(new Date(currentWindow.start.getTime() + interval * 0.3));
    }
  };

  // Ajouter des raccourcis clavier
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === '+') zoomIn();
    if (e.ctrlKey && e.key === '-') zoomOut();
    if (e.ctrlKey && e.key === 'ArrowLeft') moveLeft();
    if (e.ctrlKey && e.key === 'ArrowRight') moveRight();
  });
});

// Mise à jour quand les goals changent
watch(() => goalsStore.goals, (newGoals) => {
  if (!timeline) return;
  const items = new DataSet(createTimelineItems(newGoals));
  const groups = new DataSet(createTimelineGroups(newGoals));
  timeline.setItems(items);
  timeline.setGroups(groups);
}, { deep: true });

// Nettoyage de la timeline
onUnmounted(() => {
    if (timeline) {
        timeline.destroy();
        timeline = null;
    }
});

const openNewGoalModal = () => {
  const modal = new GoalModal(props.app);
  modal.open();
};
</script>

<style>
.goalflowz-content {
  display: flex;
  position: relative;
  height: 100%;
}

.goalflowz-timeline-container {
  height: 100%;
  overflow: hidden;
}

.goalflowz-task-container {
  height: 100%;
  overflow-y: auto;
}

.goalflowz-resize-handle {
  width: 4px;
  background-color: var(--background-modifier-border);
  cursor: ew-resize;
  position: relative;
}

.goalflowz-resize-handle:hover {
  background-color: var(--interactive-accent);
}

.goalflowz-resize-handle::after {
  content: "";
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 2px;
  height: 20px;
  background-color: var(--text-muted);
}
</style>
