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
            <div class="goalflowz-card-subtitle">
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
            <div class="goalflowz-card-subtitle">
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
        <h3>Habitudes du jour</h3>
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
    </div>

    <!-- Humeur et énergie -->
    <div class="goalflowz-mood-section">
      <div class="goalflowz-mood-row">
        <div class="goalflowz-mood-item">
          <label>Humeur</label>
          <div class="goalflowz-mood-buttons">
            <button 
              v-for="level in 5" 
              :key="'mood-'+level"
              @click="setMood(level)"
              :class="{ active: dayStats.mood === level }"
              class="goalflowz-mood-btn"
            >
              {{ getMoodEmoji(level) }}
            </button>
          </div>
        </div>

        <div class="goalflowz-mood-item">
          <label>Niveau d'énergie</label>
          <div class="goalflowz-mood-buttons">
            <button 
              v-for="level in 5" 
              :key="'energy-'+level"
              @click="setEnergyLevel(level)"
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

const props = defineProps<{
  app: any;
}>();

const habitsStore = useHabitsStore();
const goalsStore = useGoalsStore();
const tasksStore = useTasksStore();

const currentDate = ref(DateTime.now());
const dayNotes = ref('');

// Computed properties
const formattedDate = computed(() => {
  return currentDate.value.setLocale('fr').toLocaleString({
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
});

const isToday = computed(() => {
  const today = DateTime.now();
  return currentDate.value.hasSame(today, 'day');
});

const activeHabits = computed(() => habitsStore.activeHabits);

const dayStats = computed(() => 
  habitsStore.getDayStats(currentDate.value.toISOString().split('T')[0])
);

const nextGoal = computed(() => {
  const goals = goalsStore.goals
    .filter(g => g.status !== 'done' && g.dueDate)
    .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime());
  return goals[0];
});

const lastCompletedGoal = computed(() => {
  const goals = goalsStore.goals
    .filter(g => g.status === 'done')
    .sort((a, b) => new Date(b.completedDate!).getTime() - new Date(a.completedDate!).getTime());
  return goals[0];
});

const nextTask = computed(() => {
  const tasks = tasksStore.getTasks
    .filter(t => !t.done && t.date)
    .sort((a, b) => new Date(a.date!).getTime() - new Date(b.date!).getTime());
  return tasks[0];
});

// Methods
const previousDay = () => {
  currentDate.value = currentDate.value.minus({ days: 1 });
};

const nextDay = () => {
  currentDate.value = currentDate.value.plus({ days: 1 });
};

const goToToday = () => {
  currentDate.value = DateTime.now();
};

const formatDate = (date: string) => {
  return DateTime.fromISO(date).setLocale('fr').toLocaleString({
    day: 'numeric',
    month: 'long'
  });
};

const isHabitCompleted = (habitId: string) => {
  const date = currentDate.value.toISOString().split('T')[0];
  const log = habitsStore.getDayLogs(date).find(l => l.habitId === habitId);
  return log?.completed || false;
};

const getHabitValue = (habitId: string) => {
  const date = currentDate.value.toISOString().split('T')[0];
  const log = habitsStore.getDayLogs(date).find(l => l.habitId === habitId);
  return log?.value;
};

const getHabitStreak = (habitId: string) => {
  return habitsStore.getHabitStreak(habitId);
};

const toggleHabit = (habitId: string) => {
  const date = currentDate.value.toISOString().split('T')[0];
  habitsStore.toggleHabit(habitId, date);
};

const openValueInput = async (habit: Habit) => {
  const value = await props.app.plugins.plugins.goalflowz.modalStore.prompt(
    `Combien de ${habit.unit} aujourd'hui ?`,
    getHabitValue(habit.id)?.toString() || '0'
  );
  
  if (value !== null) {
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      const date = currentDate.value.toISOString().split('T')[0];
      habitsStore.toggleHabit(habit.id, date, numValue);
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
  const date = currentDate.value.toISOString().split('T')[0];
  habitsStore.setDayMood(date, level);
};

const setEnergyLevel = (level: 1 | 2 | 3 | 4 | 5) => {
  const date = currentDate.value.toISOString().split('T')[0];
  habitsStore.setDayEnergyLevel(date, level);
};

const updateNotes = () => {
  const date = currentDate.value.toISOString().split('T')[0];
  habitsStore.setDayNotes(date, dayNotes.value);
};

// Watchers
watch(currentDate, () => {
  const date = currentDate.value.toISOString().split('T')[0];
  dayNotes.value = habitsStore.getDayStats(date).notes || '';
});

// Initialisation
onMounted(() => {
  habitsStore.initializeDefaultHabits();
  const date = currentDate.value.toISOString().split('T')[0];
  dayNotes.value = habitsStore.getDayStats(date).notes || '';
});
</script>
