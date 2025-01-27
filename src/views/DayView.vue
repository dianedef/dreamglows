<template>
  <div class="goalflowz-day-view">
    <!-- En-tête avec navigation -->
    <div class="goalflowz-day-header">
      <div class="goalflowz-day-navigation">
        <button @click="previousDay" class="goalflowz-nav-btn">
          <i class="fas fa-chevron-left"></i>
        </button>
        <h2>{{ formattedDate }}</h2>
        <button @click="nextDay" class="goalflowz-nav-btn">
          <i class="fas fa-chevron-right"></i>
        </button>
      </div>
      <button @click="goToToday" class="goalflowz-today-btn" v-if="!isToday">
        Aujourd'hui
      </button>
    </div>

    <!-- Résumé du jour -->
    <div class="goalflowz-day-summary">
      <div class="goalflowz-summary-card next-goal" v-if="nextGoal">
        <h3>Prochain objectif</h3>
        <div class="goalflowz-card-content">
          <i class="fas fa-bullseye"></i>
          <div class="goalflowz-card-text">
            <div class="goalflowz-card-title">{{ nextGoal.title }}</div>
            <div class="goalflowz-card-subtitle" v-if="nextGoal.dueDate">
              Échéance : {{ formatDate(nextGoal.dueDate) }}
            </div>
          </div>
        </div>
      </div>

      <div class="goalflowz-summary-card last-goal" v-if="lastCompletedGoal">
        <h3>Dernier objectif atteint</h3>
        <div class="goalflowz-card-content">
          <i class="fas fa-trophy"></i>
          <div class="goalflowz-card-text">
            <div class="goalflowz-card-title">{{ lastCompletedGoal.title }}</div>
            <div class="goalflowz-card-subtitle" v-if="lastCompletedGoal.completedDate">
              Complété le {{ formatDate(lastCompletedGoal.completedDate) }}
            </div>
          </div>
        </div>
      </div>

      <div class="goalflowz-summary-card next-task" v-if="nextTask">
        <h3>Prochaine tâche</h3>
        <div class="goalflowz-card-content">
          <i class="fas fa-tasks"></i>
          <div class="goalflowz-card-text">
            <div class="goalflowz-card-title">{{ nextTask.title }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Trackers d'habitudes -->
    <div class="goalflowz-habits-section">
      <div class="goalflowz-section-header">
        <div class="goalflowz-completion-rate">
          {{ dayStats.completionRate.toFixed(0) }}% complété
        </div>
      </div>

      <div class="goalflowz-habits-grid">
        <div 
          v-for="habit in activeHabits" 
          :key="habit.id"
          class="goalflowz-habit-card"
          :class="{ 'completed': isHabitCompleted(habit.id) }"
          @click="toggleHabit(habit.id)"
        >
          <div class="goalflowz-habit-icon">{{ habit.icon }}</div>
          <div class="goalflowz-habit-info">
            <div class="goalflowz-habit-name">{{ habit.name }}</div>
            <div class="goalflowz-habit-streak" v-if="getHabitStreak(habit.id)">
              🔥 {{ getHabitStreak(habit.id) }} jours
            </div>
          </div>
          <div 
            v-if="habit.target" 
            class="goalflowz-habit-target"
            @click.stop="openValueInput(habit)"
          >
            {{ getHabitValue(habit.id) || 0 }}/{{ habit.target }} {{ habit.unit }}
          </div>
        </div>
      </div>

    <!-- Humeur et énergie -->
      <div class="goalflowz-mood-row">
        <div class="goalflowz-mood-item">
          <div class="goalflowz-mood-buttons">
            <button 
              v-for="level in [1,2,3,4,5]" 
              :key="'mood-'+level"
              @click="setMood(level as 1 | 2 | 3 | 4 | 5)"
              :class="{ active: dayStats.mood === level }"
              class="goalflowz-mood-btn"
            >
              {{ getMoodEmoji(level) }}
            </button>
          </div>
        </div>

        <div class="goalflowz-mood-item">
          <div class="goalflowz-mood-buttons">
            <button 
              v-for="level in [1,2,3,4,5]" 
              :key="'energy-'+level"
              @click="setEnergyLevel(level as 1 | 2 | 3 | 4 | 5)"
              :class="{ active: dayStats.energyLevel === level }"
              class="goalflowz-energy-btn"
            >
              {{ getEnergyEmoji(level) }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Notes du jour -->
    <div class="goalflowz-notes-section">
      <h3>Notes du jour</h3>
      <textarea 
        v-model="dayNotes" 
        placeholder="Écrivez vos réflexions du jour..."
        @input="updateNotes"
      ></textarea>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { DateTime } from 'luxon';
import { useHabitsStore } from '@/stores/habitsStore';
import { useGoalsStore } from '@/stores/goalsStore';
import { useTasksStore } from '@/stores/tasksStore';
import type { Habit } from '@/types/habits';

// Utilitaire de gestion des dates
const dateUtils = {
  formatDate: (date: string | DateTime | null): string => {
    try {
      if (!date) return '';
      if (date instanceof DateTime) {
        return date.toFormat('yyyy-MM-dd');
      }
      return DateTime.fromISO(date).toFormat('yyyy-MM-dd');
    } catch (error) {
      console.warn('Erreur de formatage de date:', error);
      return '';
    }
  },
  
  formatDisplayDate: (date: string | DateTime | null): string => {
    try {
      if (!date) return '';
      if (date instanceof DateTime) {
        return date.setLocale('fr').toLocaleString({
          day: 'numeric',
          month: 'long'
        });
      }
      return DateTime.fromISO(date).setLocale('fr').toLocaleString({
        day: 'numeric',
        month: 'long'
      });
    } catch (error) {
      console.warn('Erreur de formatage de date d\'affichage:', error);
      return '';
    }
  },

  toDateTime: (date: string | DateTime | null): DateTime => {
    try {
      if (!date) return DateTime.now();
      if (date instanceof DateTime) return date;
      return DateTime.fromISO(date);
    } catch (error) {
      console.warn('Erreur de conversion de date:', error);
      return DateTime.now();
    }
  }
};

// Configuration du composant
const props = defineProps<{
  app: any;
  contentFiles?: any[];
}>();

const habitsStore = useHabitsStore();
const goalsStore = useGoalsStore();
const tasksStore = useTasksStore();

const currentDate = ref(DateTime.now());
const dayNotes = ref('');

// Computed properties avec gestion d'erreurs
const formattedDate = computed(() => {
  try {
    return currentDate.value.setLocale('fr').toLocaleString({
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  } catch (error) {
    console.warn('Erreur de formatage de la date courante:', error);
    return '';
  }
});

const isToday = computed(() => {
  try {
    const today = DateTime.now();
    return currentDate.value.hasSame(today, 'day');
  } catch (error) {
    console.warn('Erreur de comparaison de dates:', error);
    return false;
  }
});

const activeHabits = computed(() => habitsStore.activeHabits);

const dayStats = computed(() => {
  try {
    return habitsStore.getDayStats(dateUtils.formatDate(currentDate.value));
  } catch (error) {
    console.warn('Erreur de récupération des stats:', error);
    return { completionRate: 0, mood: 0, energyLevel: 0, notes: '' };
  }
});

const nextGoal = computed(() => {
  const goals = goalsStore.goals
    .filter(g => g.status !== 'done' && g.dueDate)
    .sort((a, b) => DateTime.fromISO(a.dueDate || '').toMillis() - DateTime.fromISO(b.dueDate || '').toMillis());
  return goals[0];
});

const lastCompletedGoal = computed(() => {
  const goals = goalsStore.goals
    .filter(g => g.status === 'done')
    .sort((a, b) => DateTime.fromISO(b.completedDate || '').toMillis() - DateTime.fromISO(a.completedDate || '').toMillis());
  return goals[0];
});

const nextTask = computed(() => {
  const tasks = tasksStore.getTasks
    .filter(t => !t.status.toLowerCase().includes('done') && t.date)
    .sort((a, b) => DateTime.fromISO(a.date || '').toMillis() - DateTime.fromISO(b.date || '').toMillis());
  return tasks[0];
});

// Methods avec gestion d'erreurs
const previousDay = () => {
  try {
    currentDate.value = currentDate.value.minus({ days: 1 });
  } catch (error) {
    console.warn('Erreur de navigation jour précédent:', error);
  }
};

const nextDay = () => {
  try {
    currentDate.value = currentDate.value.plus({ days: 1 });
  } catch (error) {
    console.warn('Erreur de navigation jour suivant:', error);
  }
};

const goToToday = () => {
  try {
    currentDate.value = DateTime.now();
  } catch (error) {
    console.warn('Erreur de navigation aujourd\'hui:', error);
  }
};

const formatDate = (date: string) => {
  return DateTime.fromISO(date).setLocale('fr').toLocaleString({
    day: 'numeric',
    month: 'long'
  });
};

const isHabitCompleted = (habitId: string): boolean => {
  try {
    const date = dateUtils.formatDate(currentDate.value);
    const log = habitsStore.getDayLogs(date).find(l => l.habitId === habitId);
    return log?.completed || false;
  } catch (error) {
    console.warn('Erreur de vérification d\'habitude:', error);
    return false;
  }
};

const getHabitValue = (habitId: string): number => {
  try {
    const date = dateUtils.formatDate(currentDate.value);
    const log = habitsStore.getDayLogs(date).find(l => l.habitId === habitId);
    return log?.value || 0;
  } catch (error) {
    console.warn('Erreur de récupération de valeur d\'habitude:', error);
    return 0;
  }
};

const getHabitStreak = (habitId: string): number => {
  try {
    return habitsStore.getHabitStreak(habitId) || 0;
  } catch (error) {
    console.warn('Erreur de récupération du streak:', error);
    return 0;
  }
};

const toggleHabit = (habitId: string) => {
  try {
    const date = dateUtils.formatDate(currentDate.value);
    habitsStore.toggleHabit(habitId, date, undefined, props.app);
  } catch (error) {
    console.warn('Erreur de basculement d\'habitude:', error);
  }
};

const openValueInput = async (habit: Habit) => {
  const value = await props.app.plugins.plugins.goalflowz.modalStore.prompt(
    `Combien de ${habit.unit} aujourd'hui ?`,
    getHabitValue(habit.id)?.toString() || '0'
  );
  
  if (value !== null) {
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      const date = dateUtils.formatDate(currentDate.value);
      habitsStore.toggleHabit(habit.id, date, numValue, props.app);
    }
  }
};

const getMoodEmoji = (level: number) => {
  const emojis = ['😢', '😕', '😐', '😊', '😄'];
  return emojis[level - 1];
};

const getEnergyEmoji = (level: number) => {
  const emojis = ['🔋', '🔋', '🔋', '🔋', '🔋'];
  return emojis[level - 1];
};

const setMood = (level: 1 | 2 | 3 | 4 | 5) => {
  try {
    const date = dateUtils.formatDate(currentDate.value);
    habitsStore.setDayMood(date, level);
    habitsStore.syncWithDailyNote(date, props.app);
  } catch (error) {
    console.warn('Erreur lors de la définition de l\'humeur:', error);
  }
};

const setEnergyLevel = (level: 1 | 2 | 3 | 4 | 5) => {
  try {
    const date = dateUtils.formatDate(currentDate.value);
    habitsStore.setDayEnergyLevel(date, level);
    habitsStore.syncWithDailyNote(date, props.app);
  } catch (error) {
    console.warn('Erreur lors de la définition du niveau d\'énergie:', error);
  }
};

const updateNotes = () => {
  try {
    const date = dateUtils.formatDate(currentDate.value);
    habitsStore.setDayNotes(date, dayNotes.value);
    habitsStore.syncWithDailyNote(date, props.app);
  } catch (error) {
    console.warn('Erreur lors de la mise à jour des notes:', error);
  }
};

// Watchers avec gestion d'erreurs
watch(currentDate, () => {
  try {
    const date = dateUtils.formatDate(currentDate.value);
    dayNotes.value = habitsStore.getDayStats(date).notes || '';
  } catch (error) {
    console.warn('Erreur de mise à jour des notes:', error);
  }
});

// Initialisation avec gestion d'erreurs
onMounted(() => {
  try {
    habitsStore.initializeDefaultHabits();
    const date = dateUtils.formatDate(currentDate.value);
    dayNotes.value = habitsStore.getDayStats(date).notes || '';
  } catch (error) {
    console.warn('Erreur d\'initialisation:', error);
  }
});
</script>
