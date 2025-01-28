# Vue 3 Template
<template>
  <div class="goalflowz-statistics-view">
    <div class="goalflowz-statistics-header">
    <h2>Statistiques</h2>
      <div class="goalflowz-period-selector">
        <button 
          v-for="period in ['7j', '30j', '90j', '365j']" 
          :key="period"
          :class="{ active: selectedPeriod === period }"
          @click="selectedPeriod = period"
        >
          {{ period }}
        </button>
      </div>
    </div>

    <div class="goalflowz-statistics-grid">
      <!-- Santé -->
      <div class="goalflowz-statistics-section">
        <h3>🏥 Santé & Bien-être</h3>
        
        <!-- Humeur -->
        <div class="goalflowz-chart-container">
          <h4>😊 Humeur</h4>
          <canvas ref="moodChart"></canvas>
        </div>

        <!-- Énergie -->
        <div class="goalflowz-chart-container">
          <h4>⚡ Niveau d'énergie</h4>
          <canvas ref="energyChart"></canvas>
        </div>

        <!-- Habitudes -->
        <div class="goalflowz-chart-container">
          <h4>🎯 Habitudes</h4>
          <canvas ref="habitsChart"></canvas>
        </div>
      </div>

      <!-- Productivité -->
      <div class="goalflowz-statistics-section">
        <h3>📈 Productivité</h3>
        
        <!-- Objectifs -->
        <div class="goalflowz-chart-container">
          <h4>🎯 Objectifs</h4>
          <canvas ref="goalsChart"></canvas>
        </div>

        <!-- Tâches -->
        <div class="goalflowz-chart-container">
          <h4>✓ Tâches</h4>
          <canvas ref="tasksChart"></canvas>
        </div>

        <!-- Catégories -->
        <div class="goalflowz-chart-container">
          <h4>📊 Répartition par catégorie</h4>
          <canvas ref="categoriesChart"></canvas>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { Chart, registerables } from 'chart.js';
import { DateTime } from 'luxon';
import { useHabitsStore } from '@/stores/habitsStore';
import { useGoalsStore } from '@/stores/goalsStore';
import { useTasksStore } from '@/stores/tasksStore';

// Enregistrer les composants Chart.js
Chart.register(...registerables);

// Stores
const habitsStore = useHabitsStore();
const goalsStore = useGoalsStore();
const tasksStore = useTasksStore();

// Refs pour les canvas
const moodChart = ref<HTMLCanvasElement | null>(null);
const energyChart = ref<HTMLCanvasElement | null>(null);
const habitsChart = ref<HTMLCanvasElement | null>(null);
const goalsChart = ref<HTMLCanvasElement | null>(null);
const tasksChart = ref<HTMLCanvasElement | null>(null);
const categoriesChart = ref<HTMLCanvasElement | null>(null);

// État local
const selectedPeriod = ref('30j');
const charts = ref<{ [key: string]: Chart | null }>({
  mood: null,
  energy: null,
  habits: null,
  goals: null,
  tasks: null,
  categories: null
});

// Calcul des données
const calculateData = () => {
  const endDate = DateTime.now();
  const days = parseInt(selectedPeriod.value);
  const startDate = endDate.minus({ days });

  return {
    mood: calculateMoodData(startDate, endDate),
    energy: calculateEnergyData(startDate, endDate),
    habits: calculateHabitsData(startDate, endDate),
    goals: calculateGoalsData(startDate, endDate),
    tasks: calculateTasksData(startDate, endDate),
    categories: calculateCategoriesData(startDate, endDate)
  };
};

// Fonctions de calcul spécifiques
const calculateMoodData = (startDate: DateTime, endDate: DateTime) => {
  const data: number[] = [];
  const labels: string[] = [];
  let current = startDate;

  while (current <= endDate) {
    const dateStr = current.toFormat('yyyy-MM-dd');
    const stats = habitsStore.getDayStats(dateStr);
    data.push(stats.mood || 0);
    labels.push(current.toFormat('dd/MM'));
    current = current.plus({ days: 1 });
  }

  return { data, labels };
};

const calculateEnergyData = (startDate: DateTime, endDate: DateTime) => {
  const data: number[] = [];
  const labels: string[] = [];
  let current = startDate;

  while (current <= endDate) {
    const dateStr = current.toFormat('yyyy-MM-dd');
    const stats = habitsStore.getDayStats(dateStr);
    data.push(stats.energyLevel || 0);
    labels.push(current.toFormat('dd/MM'));
    current = current.plus({ days: 1 });
  }

  return { data, labels };
};

const calculateHabitsData = (startDate: DateTime, endDate: DateTime) => {
  const data: number[] = [];
  const labels: string[] = [];
  let current = startDate;

  while (current <= endDate) {
    const dateStr = current.toFormat('yyyy-MM-dd');
    const stats = habitsStore.getDayStats(dateStr);
    data.push(stats.completionRate || 0);
    labels.push(current.toFormat('dd/MM'));
    current = current.plus({ days: 1 });
  }

  return { data, labels };
};

const calculateGoalsData = (startDate: DateTime, endDate: DateTime) => {
  const completed = goalsStore.goals.filter(g => 
    g.status === 'done' && 
    DateTime.fromISO(g.completedDate || '').valueOf() >= startDate.valueOf() &&
    DateTime.fromISO(g.completedDate || '').valueOf() <= endDate.valueOf()
  ).length;

  const inProgress = goalsStore.goals.filter(g => 
    g.status === 'in-progress'
  ).length;

  const todo = goalsStore.goals.filter(g => 
    g.status === 'todo'
  ).length;

  return {
    data: [completed, inProgress, todo],
    labels: ['Terminés', 'En cours', 'À faire']
  };
};

const calculateTasksData = (startDate: DateTime, endDate: DateTime) => {
  const data: number[] = [];
  const labels: string[] = [];
  let current = startDate;

  while (current <= endDate) {
    const dateStr = current.toFormat('yyyy-MM-dd');
    const completedTasks = tasksStore.getTasks.filter(t => 
      t.status === 'done' && 
      t.date === dateStr
    ).length;
    data.push(completedTasks);
    labels.push(current.toFormat('dd/MM'));
    current = current.plus({ days: 1 });
  }

  return { data, labels };
};

const calculateCategoriesData = (startDate: DateTime, endDate: DateTime) => {
  const categories = new Map<string, number>();
  
  goalsStore.goals.forEach(goal => {
    if (!goal.category) return;
    const count = categories.get(goal.category) || 0;
    categories.set(goal.category, count + 1);
  });

  return {
    data: Array.from(categories.values()),
    labels: Array.from(categories.keys())
  };
};

// Mise à jour des graphiques
const updateCharts = () => {
  const data = calculateData();
  
  // Mettre à jour chaque graphique
  if (charts.value.mood && moodChart.value) {
    charts.value.mood.data.labels = data.mood.labels;
    charts.value.mood.data.datasets[0].data = data.mood.data;
    charts.value.mood.update();
  }

  if (charts.value.energy && energyChart.value) {
    charts.value.energy.data.labels = data.energy.labels;
    charts.value.energy.data.datasets[0].data = data.energy.data;
    charts.value.energy.update();
  }

  if (charts.value.habits && habitsChart.value) {
    charts.value.habits.data.labels = data.habits.labels;
    charts.value.habits.data.datasets[0].data = data.habits.data;
    charts.value.habits.update();
  }

  if (charts.value.goals && goalsChart.value) {
    charts.value.goals.data.labels = data.goals.labels;
    charts.value.goals.data.datasets[0].data = data.goals.data;
    charts.value.goals.update();
  }

  if (charts.value.tasks && tasksChart.value) {
    charts.value.tasks.data.labels = data.tasks.labels;
    charts.value.tasks.data.datasets[0].data = data.tasks.data;
    charts.value.tasks.update();
  }

  if (charts.value.categories && categoriesChart.value) {
    charts.value.categories.data.labels = data.categories.labels;
    charts.value.categories.data.datasets[0].data = data.categories.data;
    charts.value.categories.update();
  }
};

// Initialisation des graphiques
onMounted(() => {
  const data = calculateData();
  
  // Créer chaque graphique avec sa configuration spécifique
  if (moodChart.value) {
    charts.value.mood = new Chart(moodChart.value, {
      type: 'line',
      data: {
        labels: data.mood.labels,
        datasets: [{
          label: 'Humeur',
          data: data.mood.data,
          borderColor: '#FF9F43',
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        scales: {
          y: {
            min: 0,
            max: 5,
            ticks: {
              stepSize: 1
            }
          }
        }
      }
    });
  }

  if (energyChart.value) {
    charts.value.energy = new Chart(energyChart.value, {
      type: 'line',
      data: {
        labels: data.energy.labels,
        datasets: [{
          label: 'Énergie',
          data: data.energy.data,
          borderColor: '#28C76F',
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        scales: {
          y: {
            min: 0,
            max: 5,
            ticks: {
              stepSize: 1
            }
          }
        }
      }
    });
  }

  if (habitsChart.value) {
    charts.value.habits = new Chart(habitsChart.value, {
      type: 'line',
      data: {
        labels: data.habits.labels,
        datasets: [{
          label: 'Complétion (%)',
          data: data.habits.data,
          borderColor: '#7367F0',
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        scales: {
          y: {
            min: 0,
            max: 100,
            ticks: {
              stepSize: 20
            }
          }
        }
      }
    });
  }

  if (goalsChart.value) {
    charts.value.goals = new Chart(goalsChart.value, {
      type: 'doughnut',
      data: {
        labels: data.goals.labels,
        datasets: [{
          data: data.goals.data,
          backgroundColor: [
            '#28C76F',
            '#FF9F43',
            '#EA5455'
          ]
        }]
      },
      options: {
        responsive: true
      }
    });
  }

  if (tasksChart.value) {
    charts.value.tasks = new Chart(tasksChart.value, {
      type: 'bar',
      data: {
        labels: data.tasks.labels,
        datasets: [{
          label: 'Tâches complétées',
          data: data.tasks.data,
          backgroundColor: '#7367F0'
        }]
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1
            }
          }
        }
      }
    });
  }

  if (categoriesChart.value) {
    charts.value.categories = new Chart(categoriesChart.value, {
      type: 'pie',
      data: {
        labels: data.categories.labels,
        datasets: [{
          data: data.categories.data,
          backgroundColor: [
            '#7367F0',
            '#28C76F',
            '#FF9F43',
            '#EA5455',
            '#00CFE8'
          ]
        }]
      },
      options: {
        responsive: true
      }
    });
  }
});

// Mettre à jour les graphiques quand la période change
watch(selectedPeriod, updateCharts);

// Mettre à jour les graphiques quand les données changent
watch(() => [
  habitsStore.logs,
  habitsStore.dayStats,
  goalsStore.goals,
  tasksStore.tasks
], updateCharts, { deep: true });
</script> 