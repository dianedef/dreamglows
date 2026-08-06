<template>
  <div class="goalflowz-day-view">
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

      <div class="goalflowz-summary-card progression-card">
        <h3>Progression</h3>
        <div class="goalflowz-card-content">
          <i class="fas fa-star"></i>
          <div class="goalflowz-card-text">
            <div class="goalflowz-card-title">Niveau {{ progression.level }} (+{{ progression.gold }} 🪙)</div>
            <div class="goalflowz-card-subtitle">
              {{ progression.xp }} / {{ progression.xpToNext }} XP
              (meilleur streak {{ progression.bestStreak }})
            </div>
            <div class="goalflowz-progress-bar-wrap">
              <div class="goalflowz-progress-bar" :style="{ width: `${progression.levelProgressPercent}%` }"></div>
            </div>
            <div class="goalflowz-card-subtitle">
              Série actuelle : {{ progression.streak }} jour(s)
            </div>
            <div class="goalflowz-reward-list" v-if="recentRewards.length">
              <div class="goalflowz-card-subtitle">Derniers gains</div>
              <ul class="goalflowz-reward-list-inner">
                <li v-for="reward in recentRewards" :key="`${reward.source}-${reward.sourceId}-${reward.date}`">
                  <span>{{ reward.message }}</span>
                  <span class="goalflowz-reward-date">{{ formatRewardDate(reward.date) }}</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Trackers d'habitudes -->
    <div class="goalflowz-habits-section">
      <div class="goalflowz-habits-background">
        <div 
          class="progress-background" 
          :style="{ width: `${dayStats.completionRate}%` }"
          @vue:mounted="() => console.log('Progress width:', dayStats.completionRate + '%')"
        ></div>
      </div>

      <!-- Calendrier des flammes -->
      <div class="goalflowz-flames-calendar" :class="{ 'mobile': isMobile }">
        <div class="goalflowz-flames-row">
          <div 
            v-for="month in months" 
            :key="month.name"
            class="goalflowz-month-flames"
            :data-month="month.name"
          >
            <div 
              v-for="day in month.days" 
              :key="day.date"
              class="goalflowz-flame-day"
              :class="{
                'completed': isDateCompleted(day.date),
                'future': isFutureDate(day.date)
              }"
            >
              <span class="flame-emoji">🔥</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Grille des habitudes -->
      <div class="goalflowz-habits-grid">
        <div 
          v-for="habit in activeHabits" 
          :key="habit.id"
          class="goalflowz-habit-card"
          :class="{ 'completed': isHabitCompleted(habit.id) }"
          @click="toggleHabit(habit.id)"
        >
          <div class="goalflowz-habit-icon">{{ habit.icon }}</div>
          <div class="goalflowz-habit-week">
            <div 
              v-for="(day, index) in currentWeekDays" 
              :key="index"
              class="goalflowz-habit-day"
              :class="{
                'completed': isHabitCompleted(habit.id, dateUtils.formatDate(day)),
                'future': isFutureDate(day)
              }"
              :data-day="day.setLocale('fr').toFormat('cccc')"
              @click.stop="toggleHabit(habit.id, dateUtils.formatDate(day))"
            >
              {{ habit.icon }}
            </div>
          </div>
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

      <!-- Humeur, amour et énergie -->
      <div class="goalflowz-mood-row">
        <div class="goalflowz-mood-line">
          <div class="goalflowz-mood-item">
            <div class="goalflowz-mood-buttons">
              <button 
                v-for="level in [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13] as MoodLevel[]" 
                :key="'mood-'+level"
                class="goalflowz-mood-btn"
                :class="{ active: dayStats.mood === level }"
                @click="setDayMood(level)"
              >
                {{ getMoodEmoji(level) }}
              </button>
            </div>
          </div>
        </div>
        <div class="goalflowz-mood-line">
          <div class="goalflowz-mood-item">
            <div class="goalflowz-mood-buttons">
              <button 
                v-for="level in [1, 2, 3, 4, 5, 6, 7] as LoveLevel[]" 
                :key="'love-'+level"
                class="goalflowz-mood-btn"
                :class="{ active: dayStats.love === level }"
                @click="setDayLove(level)"
              >
                {{ getLoveEmoji(level) }}
              </button>
            </div>
          </div>
          <div class="goalflowz-mood-item">
            <div class="goalflowz-mood-buttons">
              <button 
                v-for="level in [1, 2, 3, 4, 5] as EnergyLevel[]" 
                :key="'energy-'+level"
                class="goalflowz-energy-btn"
                :class="{ active: dayStats.energyLevel === level }"
                @click="setDayEnergyLevel(level)"
              >
                {{ getEnergyEmoji(level) }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Notes du jour -->
    <div 
      v-if="currentNote"
      class="goalflowz-notes-section"
    >
      <div
        class="goalflowz-note-viewer"
        ref="noteContentRef"
      >
        <div class="goalflowz-note-content">
          <!-- Le contenu de la note sera injecté ici -->
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, onUnmounted } from 'vue';
import { DateTime } from 'luxon';
import { useHabitsStore } from '@/stores/habitsStore';
import { useGoalsStore } from '@/stores/goalsStore';
import { useTasksStore } from '@/stores/tasksStore';
import { useProgressionStore } from '@/stores/progressionStore';
import { getMoodEmoji, getLoveEmoji, getEnergyEmoji, type MoodLevel, type LoveLevel, type EnergyLevel } from '@/stores/habitsStore';
import type { Habit } from '@/types/habits';
import type { Task, TaskStatus } from '@/types/tasks';
import type { Note } from '@/types/notes';
import { WorkspaceLeaf, MarkdownView, TFile, Notice } from 'obsidian';
import Goalflowz from '@/main';
import { DateService } from '@/services/DateService';

interface DayNote {
  path: string;
  content: string;
}

// Services
const dateService = new DateService();

// Utilitaire de gestion des dates
const dateUtils = {
  formatDate: (date: DateTime): string => {
    return date.toFormat('yyyy-MM-dd');
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
  currentDate: DateTime;
}>();

const habitsStore = useHabitsStore();
const goalsStore = useGoalsStore();
const tasksStore = useTasksStore();
const progressionStore = useProgressionStore();

const dayNotes = ref('');
const currentNote = ref<DayNote | null>(null);

// Computed properties avec gestion d'erreurs
const formattedDate = computed(() => {
  try {
    return props.currentDate.setLocale('fr').toLocaleString({
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
    return props.currentDate.hasSame(today, 'day');
  } catch (error) {
    console.warn('Erreur de comparaison de dates:', error);
    return false;
  }
});

const activeHabits = computed(() => habitsStore.activeHabits);

const dayStats = computed(() => {
  try {
    return habitsStore.getDayStats(dateUtils.formatDate(props.currentDate));
  } catch (error) {
    console.warn('Erreur de récupération des stats:', error);
    return { completionRate: 0, mood: 0, energyLevel: 0, notes: '' };
  }
});

const progression = computed(() => ({
  level: progressionStore.level,
  xp: progressionStore.xp,
  xpToNext: progressionStore.xpToNext,
  gold: progressionStore.gold,
  streak: progressionStore.streak,
  bestStreak: progressionStore.bestStreak,
  levelProgressPercent: progressionStore.levelProgressPercent
}));

const recentRewards = computed(() => progressionStore.recentRewardHistory);

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
    .filter((t: Task) => t.status !== 'done' && t.startDate)
    .sort((a: Task, b: Task) => {
      if (!a.startDate || !b.startDate) return 0;
      return DateTime.fromISO(a.startDate).toMillis() - DateTime.fromISO(b.startDate).toMillis();
    });
  return tasks[0];
});

// Computed properties pour la semaine courante
const currentWeekDays = computed(() => {
  return dateService.getCurrentWeekDays(props.currentDate);
});

const emit = defineEmits<{
    'update:currentDate': [date: DateTime]
}>();

// Methods avec gestion d'erreurs
const previousDay = () => {
    try {
        emit('update:currentDate', props.currentDate.minus({ days: 1 }));
    } catch (error) {
        console.warn('Erreur de navigation jour précédent:', error);
    }
};

const nextDay = () => {
    try {
        emit('update:currentDate', props.currentDate.plus({ days: 1 }));
    } catch (error) {
        console.warn('Erreur de navigation jour suivant:', error);
    }
};

const goToToday = () => {
    try {
        emit('update:currentDate', DateTime.now());
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

const isHabitCompleted = (habitId: string, date?: string): boolean => {
  try {
    const targetDate = date || dateUtils.formatDate(props.currentDate);
    const log = habitsStore.getDayLogs(targetDate).find(l => l.habitId === habitId);
    return log?.completed || false;
  } catch (error) {
    console.warn('Erreur de vérification d\'habitude:', error);
    return false;
  }
};

const getHabitValue = (habitId: string): number => {
  try {
    const date = dateUtils.formatDate(props.currentDate);
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

const toggleHabit = (habitId: string, date?: string) => {
  try {
    const targetDate = date || dateUtils.formatDate(props.currentDate);
    habitsStore.toggleHabit(habitId, targetDate, undefined, props.app);
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
      const date = dateUtils.formatDate(props.currentDate);
      habitsStore.toggleHabit(habit.id, date, numValue, props.app);
    }
  }
};

const setDayMood = (level: MoodLevel) => {
  try {
    const date = dateUtils.formatDate(props.currentDate);
    habitsStore.setDayMood(date, level);
    habitsStore.syncWithDailyNote(date, props.app);
  } catch (error) {
    console.warn('Erreur lors de la définition de l\'humeur:', error);
  }
};

const setDayLove = (level: LoveLevel) => {
  try {
    const date = dateUtils.formatDate(props.currentDate);
    habitsStore.setDayLove(date, level);
    habitsStore.syncWithDailyNote(date, props.app);
  } catch (error) {
    console.warn('Erreur lors de la définition du niveau d\'amour:', error);
  }
};

const setDayEnergyLevel = (level: EnergyLevel) => {
  try {
    const date = dateUtils.formatDate(props.currentDate);
    habitsStore.setDayEnergyLevel(date, level);
    habitsStore.syncWithDailyNote(date, props.app);
  } catch (error) {
    console.warn('Erreur lors de la définition du niveau d\'énergie:', error);
  }
};

const updateNotes = () => {
  try {
    const date = dateUtils.formatDate(props.currentDate);
    habitsStore.setDayNotes(date, dayNotes.value);
    habitsStore.syncWithDailyNote(date, props.app);
  } catch (error) {
    console.warn('Erreur lors de la mise à jour des notes:', error);
  }
};

// Fonction de chargement de la note
const loadDayNote = async (date: DateTime) => {
  try {
    const notePath = await props.app.plugins.plugins.goalflowz.notesGenerator.getNotePath(date);
    console.log('Chargement de la note:', notePath);
    
    const file = props.app.vault.getAbstractFileByPath(notePath);
    
    if (file && file instanceof TFile) {
      const content = await props.app.vault.read(file);
      currentNote.value = {
        path: notePath,
        content: content
      };
      console.log('Note chargée avec succès:', currentNote.value);
    } else {
      // Même si le fichier n'existe pas, on crée quand même une note vide
      currentNote.value = {
        path: notePath,
        content: ''
      };
      console.log('Création d\'une nouvelle note:', notePath);
    }
  } catch (error: any) {
    console.error('Erreur lors du chargement de la note:', error);
    // En cas d'erreur, on crée quand même une note vide
    currentNote.value = {
      path: `${date.toFormat('yyyy-MM-dd')}.md`,
      content: ''
    };
    new Notice('Erreur lors du chargement de la note: ' + (error.message || 'Erreur inconnue'));
  }
};

// Fonction d'initialisation de la vue de note
const initializeNoteView = async (element: HTMLElement, app: any) => {
    try {
        if (!currentNote.value?.path) return;
        
        console.log('Initialisation de la vue de note pour:', currentNote.value.path);
        
        // Nettoyer l'élément existant
        element.innerHTML = '';
        
        // Obtenir le fichier
        const file = app.vault.getAbstractFileByPath(currentNote.value.path);
        if (!(file instanceof TFile)) {
            throw new Error('Fichier non trouvé ou invalide');
        }

        // Créer un conteneur pour la note
        const noteContainer = element.createDiv('markdown-source-view');
        
        // Charger le contenu
        const content = await app.vault.read(file);
        
        // Créer un élément textarea pour l'édition
        const textarea = noteContainer.createEl('textarea', {
            cls: 'markdown-source-textarea'
        });
        textarea.value = content;
        
        // Style de base pour le textarea
        textarea.style.width = '100%';
        textarea.style.height = '100%';
        textarea.style.resize = 'none';
        textarea.style.border = 'none';
        textarea.style.padding = '1rem';
        textarea.style.fontFamily = 'monospace';
        
        // Configurer la sauvegarde automatique
        textarea.addEventListener('input', async () => {
            await app.vault.modify(file, textarea.value);
        });

        console.log('Vue de note initialisée avec succès');

    } catch (error: any) {
        console.error('Erreur lors de l\'initialisation de la vue de note:', error);
        new Notice('Erreur lors du chargement de la note: ' + (error.message || 'Erreur inconnue'));
        element.innerHTML = 'Erreur lors du chargement de la note: ' + (error.message || 'Erreur inconnue');
    }
};

// Refs
const noteContentRef = ref<HTMLElement | null>(null);

// Watcher pour initialiser la vue quand la note change
watch([noteContentRef, () => currentNote.value?.path], async ([el, path]) => {
  if (el && path) {
    await initializeNoteView(el, props.app);
  }
});

// Watchers et lifecycle hooks
watch(() => props.currentDate, async (newDate) => {
  await loadDayNote(newDate);
});

onMounted(async () => {
    try {
        console.log('DayView mounted');
        habitsStore.initializeDefaultHabits();
        
        // Retourner à la date du jour si on ouvre une nouvelle leaf
        if (!props.app.workspace.activeLeaf || props.app.workspace.activeLeaf.getViewState().type === 'empty') {
            emit('update:currentDate', DateTime.now());
        }
        
        await loadDayNote(props.currentDate);
        const date = dateUtils.formatDate(props.currentDate);
        dayNotes.value = habitsStore.getDayStats(date).notes || '';
        console.log('DayView initialized with date:', date);
    } catch (error) {
        console.error('Erreur d\'initialisation DayView:', error);
    }
});

onUnmounted(() => {
    try {
        console.log('DayView unmounted');
    } catch (error) {
        console.error('Erreur lors du démontage de DayView:', error);
    }
});

// Ajouter un watcher pour la largeur de la fenêtre
const isMobile = ref(window.innerWidth <= 768);

onMounted(() => {
  const handleResize = () => {
    isMobile.value = window.innerWidth <= 768;
    console.log('Mobile mode:', isMobile.value, 'Width:', window.innerWidth);
  };
  window.addEventListener('resize', handleResize);
  handleResize(); // Call it once on mount
});

onUnmounted(() => {
  const handleResize = () => {
    isMobile.value = window.innerWidth <= 768;
  };
  window.removeEventListener('resize', handleResize);
});

const months = computed(() => {
  console.log('Computing months, isMobile:', isMobile.value);
  const now = DateTime.now();
  const months = [];
  
  if (isMobile.value) {
    // Version mobile : 3 derniers mois
    for (let i = 2; i >= 0; i--) {
      const monthDate = now.minus({ months: i });
      console.log('Adding month:', monthDate.toFormat('MMMM'));
      const daysInMonth = monthDate.daysInMonth || 31;
      
      const days = Array.from({ length: daysInMonth }, (_, i) => ({
        date: monthDate.set({ day: i + 1 }).toFormat('yyyy-MM-dd'),
        day: i + 1
      }));
      
      months.push({
        name: monthDate.setLocale('fr').toFormat('MMMM'),
        days
      });
    }
  } else {
    // Version desktop : tous les mois de l'année
    for (let month = 0; month < 12; month++) {
      const monthDate = DateTime.fromObject({ year: now.year, month: month + 1 });
      const daysInMonth = monthDate.daysInMonth || 31;
      
      const days = Array.from({ length: daysInMonth }, (_, i) => ({
        date: monthDate.set({ day: i + 1 }).toFormat('yyyy-MM-dd'),
        day: i + 1
      }));
      
      months.push({
        name: monthDate.setLocale('fr').toFormat('MMMM'),
        days
      });
    }
  }
  
  console.log('Final months array:', months.map(m => m.name));
  return months;
});

const isDateCompleted = (date: string | DateTime) => {
  try {
    const formattedDate = dateUtils.formatDate(dateUtils.toDateTime(date));
    const stats = habitsStore.getDayStats(formattedDate);
    return stats.completionRate >= 100;
  } catch (error) {
    console.warn('Erreur de vérification de date complétée:', error);
    return false;
  }
};

const isFutureDate = (date: string | DateTime) => {
  try {
    const dt = dateUtils.toDateTime(date);
    return dt > DateTime.now().endOf('day');
  } catch (error) {
    console.warn('Erreur de vérification de date future:', error);
    return false;
  }
};

const formatRewardDate = (date: string) => {
  try {
    return DateTime.fromISO(date).setLocale('fr').toLocaleString({
      day: 'numeric',
      month: 'short'
    });
  } catch (error) {
    console.warn('Erreur de formatage date gain:', error);
    return date;
  }
};
</script>
