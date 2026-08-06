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
import { ref, onMounted, onUnmounted, watch, computed } from 'vue';
import { Timeline, DataSet } from 'vis-timeline/standalone';
import type { Goal } from '@/types/goals';
import type { Task } from '@/types/tasks';
import { useGoalsStore } from '@/stores/goalsStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { GoalModal } from '@/components/modals/GoalModal';
import { CategoryModal } from '@/components/modals/CategoryModal';
import TaskList from '@/components/TaskList.vue';
import { useTasksStore } from '@/stores/tasksStore';
import { TaskModal } from '@/components/modals/TaskModal';

const props = defineProps<{
  contentFiles: any[];
  app: any;
}>();

const goalsStore = useGoalsStore();
const settingsStore = useSettingsStore();
console.log('Settings initiaux:', settingsStore.settings);

const timelineContainer = ref<HTMLElement | null>(null);
let timeline: Timeline | null = null;
const tasksStore = useTasksStore();

// Gestion du redimensionnement
const isResizing = ref(false);
const startX = ref(0);
const startWidth = ref(0);
const mainWidth = ref(50);

// Initialiser la taille depuis les settings au montage du composant
onMounted(() => {
    mainWidth.value = settingsStore.settings.lastMainWidth;
});

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
    settingsStore.updateSettings({ lastMainWidth: newWidth });
};

const stopResize = () => {
    isResizing.value = false;
    document.removeEventListener('mousemove', handleResize);
    document.removeEventListener('mouseup', stopResize);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
};

// Créer les groupes pour la timeline
const createTimelineGroups = (goals: Goal[], tasks: Task[]) => {
  console.log('🔍 Création des groupes avec:', goals.length, 'objectifs et', tasks.length, 'tâches');
  
  // Créer un Set pour les catégories uniques
  const categories = new Set<string>();
  
  // Ajouter les catégories des objectifs
  goals.forEach(goal => {
    const category = goal.category || 'Sans catégorie';
    console.log('📂 Ajout catégorie:', category);
    categories.add(category);
  });
  
  // Ajouter un groupe spécial pour les tâches s'il y en a
  if (tasks.length > 0) {
    categories.add('Tâches');
    console.log('📋 Ajout du groupe Tâches');
  }
  
  // Convertir en tableau de groupes
  const groups = Array.from(categories).map(category => ({
    id: category,
    content: category
  }));
  
  console.log('🔍 Groupes créés:', groups);
  return groups;
};

// Conversion des goals et des tâches en items pour la timeline
const createTimelineItems = (goals: Goal[], tasks: Task[]) => {
  console.log('🎯 createTimelineItems appelé avec', goals.length, 'objectifs et', tasks.length, 'tâches');
  const items = [];

  // Ajouter les objectifs
  const goalItems = goals.map(goal => {
    console.log('🎯 Création item pour goal:', goal.title, 'startDate:', goal.startDate);
    return {
      id: `goal-${goal.id}`,
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
      start: goal.startDate ? new Date(goal.startDate) : new Date(),
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
    };
  });
  console.log('🎯 Items des objectifs créés:', goalItems);
  items.push(...goalItems);

  // Ajouter les tâches
  console.log('📝 Ajout des tâches à la timeline:', tasks.length, 'tâches');
  if (tasks.length > 0) {
    const taskItems = tasks.map(task => {
      console.log('📝 Création item pour tâche:', task.title, 'date:', task.date);
      return {
        id: `task-${task.id}`,
        group: 'Tâches',
        content: `
          <div class="goalflowz-timeline-task">
            <div class="goalflowz-timeline-task-title">
              ${task.title}
            </div>
            ${task.tags?.length ? `
              <div class="goalflowz-timeline-item-tags">
                ${task.tags.map(tag => `<span class="goalflowz-tag">#${tag}</span>`).join(' ')}
              </div>
            ` : ''}
          </div>
        `,
        start: task.date ? new Date(task.date) : new Date(),
        type: 'box',
        style: `
          background-color: ${task.status === 'todo' ? 'var(--background-primary)' : 
                            task.status === 'in-progress' ? 'var(--interactive-accent)' : 
                            'var(--interactive-success)'};
          border-color: ${task.priority === 'high' ? 'var(--text-error)' : 
                        task.priority === 'medium' ? 'var(--text-warning)' : 
                        'var(--text-success)'};
          border-width: ${task.priority === 'high' ? '2px' : '1px'};
        `,
        title: `
          <div>
            <strong>Statut:</strong> ${task.status === 'todo' ? '⭕ À faire' : 
                                    task.status === 'in-progress' ? '▶️ En cours' : 
                                    '✅ Terminé'}<br>
            <strong>Priorité:</strong> ${task.priority === 'high' ? '⚡ Haute' : 
                                      task.priority === 'medium' ? '◆ Moyenne' : 
                                      '○ Basse'}<br>
          </div>
        `
      };
    });
    console.log('📝 Items des tâches créés:', taskItems);
    items.push(...taskItems);
  }

  console.log('🎯 Nombre total d\'items créés:', items.length);
  return items;
};

// Initialisation de la timeline
onMounted(() => {
  console.log('🚀 onMounted - Début');
  if (!timelineContainer.value) {
    console.error('❌ Container de timeline non trouvé !');
    return;
  }

  console.log('📊 État initial des goals:', goalsStore.goals);
  console.log('📊 État initial des tâches:', tasksStore.tasks);

  try {
    // 1. Créer les groupes initiaux
    const groups = createTimelineGroups(goalsStore.goals, tasksStore.tasks);
    console.log('🔄 Groupes initiaux créés:', groups);
    
    // 2. Créer les items initiaux
    const items = createTimelineItems(goalsStore.goals, tasksStore.tasks);
    console.log('🔄 Items initiaux créés:', items);

    // 3. Définir les options de la timeline
    const options = {
      orientation: 'top',
      editable: true,
      zoomable: true,
      stack: true,
      height: '100%',
      horizontalScroll: true,
      verticalScroll: true,
      groupOrder: 'content',
      tooltip: {
        followMouse: true,
        overflowMethod: 'cap' as const,
        delay: 100
      },
      hiddenDates: [
        {
          start: `2024-01-01 ${settingsStore.settings.timelineEndHour || '23:00'}:00`,
          end: `2024-01-02 ${settingsStore.settings.timelineStartHour || '08:00'}:00`,
          repeat: 'daily' as const
        }
      ],
      format: {
        minorLabels: {
          minute: settingsStore.settings.timeFormat === '12h' ? 'hh:mm A' : 'HH:mm',
          hour: settingsStore.settings.timeFormat === '12h' ? 'hh:mm A' : 'HH:mm',
          weekday: 'dddd',
          day: 'D',
          month: 'MMM',
          year: 'YYYY'
        }
      },
      template: function (item: any) {
        return item.content;
      },
      groupTemplate: function(group: any) {
        return `<div class="goalflowz-timeline-group">${group?.content || 'Sans nom'}</div>`;
      },
      margin: {
        item: {
          horizontal: 10,
          vertical: 5
        }
      },
      showCurrentTime: true,
      onMove: (item: any, callback: any) => {
        const [type, id] = item.id.split('-');
        
        if (type === 'goal') {
          const goal = goalsStore.goals.find(g => g.id === id);
          if (goal) {
            const updatedGoal = {
              ...goal,
              startDate: item.start.toISOString().split('T')[0],
              dueDate: item.end?.toISOString().split('T')[0]
            };
            goalsStore.updateGoal(updatedGoal);
          }
        } else if (type === 'task') {
          const task = tasksStore.tasks.find(t => t.id === id);
          if (task) {
            const updatedTask = {
              ...task,
              date: item.start.toISOString().split('T')[0]
            };
            tasksStore.updateTask(updatedTask);
          }
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

    // 4. Créer la timeline avec les DataSets
    console.log('⚙️ Création de la timeline avec:', { items, groups });
    timeline = new Timeline(
      timelineContainer.value, 
      new DataSet(items), 
      new DataSet(groups), 
      options
    );
    
    console.log('✅ Timeline créée avec succès');
  } catch (error) {
    console.error('❌ Erreur lors de la création de la timeline:', error);
    return;
  }

  // Watchers pour les mises à jour
  watch(() => goalsStore.goals, (newGoals) => {
    console.log('👀 Watcher Goals - Nouveaux goals:', newGoals);
    if (!timeline) {
      console.error('❌ Timeline non initialisée dans le watcher goals !');
      return;
    }

    try {
      // 1. Créer les nouveaux groupes
      const groups = createTimelineGroups(newGoals, tasksStore.tasks);
      console.log('🔄 Nouveaux groupes créés:', groups);
      
      // 2. Créer les nouveaux items
      const items = createTimelineItems(newGoals, tasksStore.tasks);
      console.log('🔄 Nouveaux items créés:', items);

      // 3. Mettre à jour la timeline avec les nouveaux DataSets
      timeline.setGroups(new DataSet(groups));
      timeline.setItems(new DataSet(items));

      // 4. Redessiner la timeline pour s'assurer que tout est à jour
      timeline.redraw();
      
      console.log('✅ Timeline mise à jour avec succès');
    } catch (error) {
      console.error('❌ Erreur lors de la mise à jour de la timeline:', error);
    }
  }, { deep: true });

  // Mise à jour quand les tâches changent
  watch(() => tasksStore.tasks, (newTasks) => {
    console.log('📝 Mise à jour des tâches:', newTasks.length, 'tâches');
    if (!timeline) {
      console.error('❌ Timeline non initialisée dans le watcher tasks !');
      return;
    }

    try {
      // 1. Créer les nouveaux groupes
      const groups = createTimelineGroups(goalsStore.goals, newTasks);
      console.log('🔄 Nouveaux groupes créés:', groups);
      
      // 2. Créer les nouveaux items
      const items = createTimelineItems(goalsStore.goals, newTasks);
      console.log('🔄 Nouveaux items créés:', items);

      // 3. Mettre à jour la timeline avec les nouveaux DataSets
      timeline.setGroups(new DataSet(groups));
      timeline.setItems(new DataSet(items));

      // 4. Redessiner la timeline pour s'assurer que tout est à jour
      timeline.redraw();
      
      console.log('✅ Timeline mise à jour avec succès');
    } catch (error) {
      console.error('❌ Erreur lors de la mise à jour de la timeline:', error);
    }
  }, { deep: true });

  // Mise à jour quand les paramètres de la timeline changent
  watch(
    () => [
      settingsStore.settings.timelineStartHour,
      settingsStore.settings.timelineEndHour,
      settingsStore.settings.timeFormat
    ],
    () => {
      if (!timeline) return;
      
      // Mettre à jour les options de la timeline
      timeline.setOptions({
        hiddenDates: [
          {
            start: `2024-01-01 ${settingsStore.settings.timelineEndHour}:00`,
            end: `2024-01-02 ${settingsStore.settings.timelineStartHour}:00`,
            repeat: 'daily' as const
          }
        ],
        format: {
          minorLabels: {
            minute: settingsStore.settings.timeFormat === '12h' ? 'hh:mm A' : 'HH:mm',
            hour: settingsStore.settings.timeFormat === '12h' ? 'hh:mm A' : 'HH:mm',
            weekday: 'dddd',
            day: 'D',
            month: 'MMM',
            year: 'YYYY'
          }
        }
      });
    },
    { deep: true }
  );

  // Gérer les événements de la timeline
  timeline.on('doubleClick', (properties: any) => {
    console.log('Timeline double-click properties:', properties);
    if (properties.item) {
      // Extraire le type et l'ID
      const [type, id] = properties.item.split('-');
      console.log('Type:', type, 'ID:', id);

      if (type === 'goal') {
        // Double-clic sur un objectif existant
        const goal = goalsStore.goals.find(g => g.id === id);
        if (goal) {
          const modal = new GoalModal(props.app, goal);
          modal.open();
        }
      } else if (type === 'task') {
        // Double-clic sur une tâche existante
        const task = tasksStore.tasks.find(t => t.id === id);
        if (task) {
          const modal = new TaskModal(props.app, task);
          modal.open();
        }
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
      goalsStore.setInitialGoalData({
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

  console.log('🚀 onMounted - Fin');
});

// Nettoyage de la timeline
onUnmounted(() => {
    if (timeline) {
        // Vider les groupes avant la destruction pour éviter l'erreur
        try {
            timeline.setGroups(new DataSet([]));
            timeline.setItems(new DataSet([]));
            timeline.destroy();
        } catch (error) {
            console.warn('Erreur lors de la destruction de la timeline:', error);
        }
        timeline = null;
    }
});

const openNewGoalModal = () => {
  const modal = new GoalModal(props.app);
  modal.open();
};
</script>