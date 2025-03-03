# Vue 3 Template
<template>
  <div class="goalflowz-statistics-view">
    <div class="goalflowz-statistics-header">
    <h2>Statistiques</h2>
      <div class="goalflowz-period-selector">
        <button 
          v-for="period in periods" 
          :key="period.days"
          :class="{ active: selectedPeriod === period.days }"
          @click="selectedPeriod = period.days"
        >
          {{ period.label }}
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

      <!-- Nouvelle section pour le Goal-Chaining -->
      <div class="goalflowz-statistics-section">
        <h3>🎯 Planification Stratégique</h3>
        
        <!-- Distribution par période -->
        <div class="goalflowz-chart-container">
          <h4>📊 Distribution par période</h4>
          <canvas ref="timeframeChart"></canvas>
        </div>

        <!-- Taux de complétion -->
        <div class="goalflowz-chart-container">
          <h4>✅ Taux de complétion par période</h4>
          <canvas ref="completionRateChart"></canvas>
        </div>

        <!-- Profondeur de décomposition -->
        <div class="goalflowz-metrics-card">
          <h4>🌳 Profondeur moyenne de décomposition</h4>
          <div class="metric-value">{{ averageDepth.toFixed(1) }}</div>
          <div class="metric-description">niveaux de sous-objectifs en moyenne</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, onUnmounted } from 'vue';
import { Chart, registerables } from 'chart.js';
import { DateTime } from 'luxon';
import { MetricsService } from '@/services/MetricsService';
import { DateService } from '@/services/DateService';
import { StorageService } from '@/services/StorageService';
import { EventService } from '@/services/EventService';
import { Subscription } from 'rxjs';

// Enregistrer les composants Chart.js
Chart.register(...registerables);

// Services
const dateService = new DateService();
const storageService = new StorageService();
const metricsService = new MetricsService(dateService, storageService);
const eventService = new EventService();

// Périodes disponibles
const periods = [
  { label: '7j', days: 7 },
  { label: '30j', days: 30 },
  { label: '90j', days: 90 },
  { label: '365j', days: 365 }
];

// Refs pour les canvas
const moodChart = ref<HTMLCanvasElement | null>(null);
const energyChart = ref<HTMLCanvasElement | null>(null);
const habitsChart = ref<HTMLCanvasElement | null>(null);
const goalsChart = ref<HTMLCanvasElement | null>(null);
const tasksChart = ref<HTMLCanvasElement | null>(null);
const categoriesChart = ref<HTMLCanvasElement | null>(null);
const timeframeChart = ref<HTMLCanvasElement | null>(null);
const completionRateChart = ref<HTMLCanvasElement | null>(null);
const averageDepth = ref(0);

// État local
const selectedPeriod = ref(30);
const charts = ref<{ [key: string]: Chart | null }>({
  mood: null,
  energy: null,
  habits: null,
  goals: null,
  tasks: null,
  categories: null,
  timeframe: null,
  completionRate: null
});

// Souscriptions aux événements
let subscriptions: Subscription[] = [];

// Mise à jour des graphiques
const updateCharts = async () => {
  const stats = await metricsService.calculatePeriodStats(selectedPeriod.value);
  
  // Mettre à jour chaque graphique
  if (charts.value.mood && moodChart.value) {
    const labels = Object.keys(stats.dailyStats).map(date => 
      DateTime.fromISO(date).toFormat('dd/MM')
    );
    const data = Object.values(stats.dailyStats).map(day => day.mood || 0);
    
    charts.value.mood.data.labels = labels;
    charts.value.mood.data.datasets[0].data = data;
    charts.value.mood.update();
  }

  if (charts.value.energy && energyChart.value) {
    const labels = Object.keys(stats.dailyStats).map(date => 
      DateTime.fromISO(date).toFormat('dd/MM')
    );
    const data = Object.values(stats.dailyStats).map(day => day.energyLevel || 0);
    
    charts.value.energy.data.labels = labels;
    charts.value.energy.data.datasets[0].data = data;
    charts.value.energy.update();
  }

  if (charts.value.habits && habitsChart.value) {
    const labels = Object.keys(stats.dailyStats).map(date => 
      DateTime.fromISO(date).toFormat('dd/MM')
    );
    const data = Object.values(stats.dailyStats).map(day => day.completionRate || 0);
    
    charts.value.habits.data.labels = labels;
    charts.value.habits.data.datasets[0].data = data;
    charts.value.habits.update();
  }

  if (charts.value.goals && goalsChart.value) {
    charts.value.goals.data.labels = ['Terminés', 'En cours', 'À faire'];
    charts.value.goals.data.datasets[0].data = [
      stats.goals.completed,
      stats.goals.inProgress,
      stats.goals.todo
    ];
    charts.value.goals.update();
  }

  if (charts.value.tasks && tasksChart.value) {
    const labels = Object.keys(stats.dailyStats).map(date => 
      DateTime.fromISO(date).toFormat('dd/MM')
    );
    const data = Object.values(stats.dailyStats).map(day => day.completedTasks);
    
    charts.value.tasks.data.labels = labels;
    charts.value.tasks.data.datasets[0].data = data;
    charts.value.tasks.update();
  }

  if (charts.value.categories && categoriesChart.value) {
    const categoryData = Object.entries(stats.categories).map(([category, data]) => ({
      category,
      completed: data.completed
    }));
    
    charts.value.categories.data.labels = categoryData.map(d => d.category);
    charts.value.categories.data.datasets[0].data = categoryData.map(d => d.completed);
    charts.value.categories.update();
  }

  // Mise à jour des graphiques de goal-chaining
  if (charts.value.timeframe && timeframeChart.value) {
    const timeframeData = stats.goalChains.timeframeDistribution;
    charts.value.timeframe.data.labels = Object.keys(timeframeData).map(formatTimeframe);
    charts.value.timeframe.data.datasets[0].data = Object.values(timeframeData);
    charts.value.timeframe.update();
  }

  if (charts.value.completionRate && completionRateChart.value) {
    const completionData = stats.goalChains.completionRateByTimeframe;
    charts.value.completionRate.data.labels = Object.keys(completionData).map(formatTimeframe);
    charts.value.completionRate.data.datasets[0].data = Object.values(completionData);
    charts.value.completionRate.update();
  }

  averageDepth.value = stats.goalChains.averageDecompositionDepth;

  // S'abonner aux événements
  subscriptions = [
    eventService.on('goal:created').subscribe(() => updateCharts()),
    eventService.on('goal:updated').subscribe(() => updateCharts()),
    eventService.on('goal:deleted').subscribe(() => updateCharts()),
    eventService.on('task:created').subscribe(() => updateCharts()),
    eventService.on('task:updated').subscribe(() => updateCharts()),
    eventService.on('task:deleted').subscribe(() => updateCharts()),
    eventService.on('mood:updated').subscribe(() => updateCharts()),
    eventService.on('data:synced').subscribe(() => updateCharts())
  ];

  // Mettre à jour les graphiques initialement
  await updateCharts();
};

// Initialisation des graphiques
onMounted(async () => {
  const stats = await metricsService.calculatePeriodStats(selectedPeriod.value);
  
  // Créer chaque graphique avec sa configuration spécifique
  if (moodChart.value) {
    charts.value.mood = new Chart(moodChart.value, {
      type: 'line',
      data: {
        labels: [],
        datasets: [{
          label: 'Humeur',
          data: [],
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
        labels: [],
        datasets: [{
          label: 'Énergie',
          data: [],
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
        labels: [],
        datasets: [{
          label: 'Complétion (%)',
          data: [],
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
        labels: ['Terminés', 'En cours', 'À faire'],
        datasets: [{
          data: [
            stats.goals.completed,
            stats.goals.inProgress,
            stats.goals.todo
          ],
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
        labels: [],
        datasets: [{
          label: 'Tâches complétées',
          data: [],
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
    const categoryData = Object.entries(stats.categories).map(([category, data]) => ({
      category,
      completed: data.completed
    }));

    charts.value.categories = new Chart(categoriesChart.value, {
      type: 'pie',
      data: {
        labels: categoryData.map(d => d.category),
        datasets: [{
          data: categoryData.map(d => d.completed),
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

  if (timeframeChart.value) {
    charts.value.timeframe = new Chart(timeframeChart.value, {
      type: 'bar',
      data: {
        labels: [],
        datasets: [{
          label: 'Nombre d\'objectifs',
          data: [],
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

  if (completionRateChart.value) {
    charts.value.completionRate = new Chart(completionRateChart.value, {
      type: 'line',
      data: {
        labels: [],
        datasets: [{
          label: 'Taux de complétion (%)',
          data: [],
          borderColor: '#28C76F',
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

  // S'abonner aux événements
  subscriptions = [
    eventService.on('goal:created').subscribe(() => updateCharts()),
    eventService.on('goal:updated').subscribe(() => updateCharts()),
    eventService.on('goal:deleted').subscribe(() => updateCharts()),
    eventService.on('task:created').subscribe(() => updateCharts()),
    eventService.on('task:updated').subscribe(() => updateCharts()),
    eventService.on('task:deleted').subscribe(() => updateCharts()),
    eventService.on('mood:updated').subscribe(() => updateCharts()),
    eventService.on('data:synced').subscribe(() => updateCharts())
  ];

  // Mettre à jour les graphiques initialement
  await updateCharts();
});

// Se désabonner des événements lors du démontage
onUnmounted(() => {
  subscriptions.forEach(sub => sub.unsubscribe());
});

// Mettre à jour les graphiques quand la période change
watch(selectedPeriod, updateCharts);

// Helper function pour formater les timeframes
function formatTimeframe(timeframe: string): string {
  const formats: Record<string, string> = {
    'DAILY': 'Jour',
    'WEEKLY': 'Semaine',
    'MONTHLY': 'Mois',
    'QUARTERLY': 'Trimestre',
    'YEARLY': 'Année',
    'FIVE_YEAR': '5 Ans',
    'TEN_YEAR': '10 Ans'
  };
  return formats[timeframe] || timeframe;
}
</script> 

<style scoped>
.goalflowz-statistics-view {
  padding: 20px;
}

.goalflowz-statistics-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
}

.goalflowz-period-selector {
  display: flex;
  gap: 10px;
}

.goalflowz-period-selector button {
  padding: 8px 16px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  transition: all 0.3s ease;
}

.goalflowz-period-selector button.active {
  background: #7367F0;
  color: white;
  border-color: #7367F0;
}

.goalflowz-statistics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 30px;
}

.goalflowz-statistics-section {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.goalflowz-chart-container {
  margin-top: 20px;
  padding: 15px;
  background: #f8f8f8;
  border-radius: 6px;
}

h2 {
  margin: 0;
  color: #5e5873;
}

h3 {
  margin: 0 0 20px;
  color: #5e5873;
}

h4 {
  margin: 0 0 15px;
  color: #6e6b7b;
  font-size: 1em;
}

.goalflowz-metrics-card {
  background: #f8f8f8;
  border-radius: 6px;
  padding: 20px;
  margin-top: 20px;
  text-align: center;
}

.metric-value {
  font-size: 2.5em;
  font-weight: bold;
  color: #7367F0;
  margin: 10px 0;
}

.metric-description {
  color: #6e6b7b;
  font-size: 0.9em;
}
</style> 