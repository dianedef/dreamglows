<template>
  <div class="goalflowz-goals-view">
    <div class="goalflowz-goals-header">
      <h2>Objectifs</h2>
      <div class="goalflowz-goals-controls">
        <button @click="addNewGoal" class="goalflowz-add-goal-btn">
          <i class="fas fa-plus"></i> Nouvel objectif
        </button>
      </div>
    </div>
    
    <div ref="timelineContainer" class="goalflowz-timeline-container"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { Timeline, DataSet } from 'vis-timeline/standalone';
import type { Goal } from '@/types/goals';
import { useGoalsStore } from '@/stores/goalsStore';

const props = defineProps<{
  contentFiles: any[];
  app: any;
}>();

const goalsStore = useGoalsStore();
const timelineContainer = ref<HTMLElement | null>(null);
let timeline: Timeline | null = null;

// Conversion des goals en items pour la timeline
const createTimelineItems = (goals: Goal[]) => {
  return goals.map(goal => ({
    id: goal.id,
    content: `
      <div class="goalflowz-timeline-item">
        <div class="goalflowz-timeline-item-title">${goal.title}</div>
        <div class="goalflowz-timeline-item-progress">
          <div class="goalflowz-progress-bar" style="width: ${goal.progress}%"></div>
        </div>
      </div>
    `,
    start: new Date(goal.startDate),
    end: goal.dueDate ? new Date(goal.dueDate) : undefined,
    className: `goalflowz-priority-${goal.priority} goalflowz-status-${goal.status}`
  }));
};

// Initialisation de la timeline
onMounted(() => {
  if (!timelineContainer.value) return;

  const items = new DataSet(createTimelineItems(goalsStore.goals));
  
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
      overflowMethod: 'cap'
    }
  };

  timeline = new Timeline(timelineContainer.value, items, options);
});

// Mise à jour quand les goals changent
watch(() => goalsStore.goals, (newGoals) => {
  if (!timeline) return;
  const items = new DataSet(createTimelineItems(newGoals));
  timeline.setItems(items);
}, { deep: true });

const addNewGoal = () => {
  const newGoal: Goal = {
    id: crypto.randomUUID(),
    title: "Nouvel objectif",
    description: "",
    startDate: new Date().toISOString(),
    status: 'todo',
    tasks: [],
    priority: 'medium',
    subGoalIds: [],
    progress: 0
  };
  
  goalsStore.addGoal(newGoal);
};
</script> 