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
    
    <div ref="timelineContainer" class="goalflowz-timeline-container"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { Timeline, DataSet } from 'vis-timeline/standalone';
import type { Goal } from '@/types/goals';
import { useGoalsStore } from '@/stores/goalsStore';
import { useModalStore } from '@/stores/modalStore';
import { GoalModal } from '@/main';

const props = defineProps<{
  contentFiles: any[];
  app: any;
}>();

const goalsStore = useGoalsStore();
const modalStore = useModalStore();
const timelineContainer = ref<HTMLElement | null>(null);
let timeline: Timeline | null = null;

// Conversion des goals en items pour la timeline
const createTimelineItems = (goals: Goal[]) => {
  return goals.map(goal => ({
    id: goal.id,
    group: goal.category || 'Sans catégorie',
    content: `
      <div class="goalflowz-timeline-item">
        <div class="goalflowz-timeline-item-header">
          <div class="goalflowz-timeline-item-status goalflowz-status-${goal.status}">
            ${goal.status === 'todo' ? 'À faire' : goal.status === 'in-progress' ? 'En cours' : 'Terminé'}
          </div>
          <div class="goalflowz-timeline-item-priority goalflowz-priority-${goal.priority}">
            ${goal.priority === 'high' ? '⚡ Haute' : goal.priority === 'medium' ? '◆ Moyenne' : '○ Basse'}
          </div>
        </div>
        <div class="goalflowz-timeline-item-title">${goal.title}</div>
        <div class="goalflowz-timeline-item-progress-container">
          <div class="goalflowz-timeline-item-progress">
            <div class="goalflowz-progress-bar" style="width: ${goal.progress}%"></div>
          </div>
          <span class="goalflowz-progress-text">${goal.progress}%</span>
        </div>
        ${goal.tags?.length ? `
          <div class="goalflowz-timeline-item-tags">
            ${goal.tags.map(tag => `<span class="goalflowz-tag">#${tag}</span>`).join(' ')}
          </div>
        ` : ''}
      </div>
    `,
    start: new Date(goal.startDate),
    end: goal.dueDate ? new Date(goal.dueDate) : undefined,
    className: `goalflowz-priority-${goal.priority} goalflowz-status-${goal.status}`
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
      overflowMethod: 'cap' as const
    },
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
    } else {
      // Double-clic sur la timeline ou une catégorie
      const modal = new GoalModal(props.app);
      
      // Préremplir les valeurs via le store
      if (properties.time || properties.snappedTime) {
        const clickedDate = properties.snappedTime || properties.time.getTime();
        console.log('Double-click sur timeline, date cliquée:', new Date(clickedDate));
        modalStore.setInitialGoalData({
          startDate: new Date(clickedDate).toISOString().split('T')[0]
        });
      } else if (properties.group) {
        console.log('Double-click sur groupe:', properties.group);
        modalStore.setInitialGoalData({
          category: properties.group,
          startDate: new Date().toISOString().split('T')[0]
        });
      }
      
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