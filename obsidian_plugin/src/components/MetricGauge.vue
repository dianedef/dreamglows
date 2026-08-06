<template>
  <div class="metric-gauge">
    <div class="gauge-label">{{ label }}</div>
    <div class="gauge-container">
      <svg class="gauge" viewBox="0 0 120 120">
        <!-- Fond de la jauge -->
        <circle
          class="gauge-background"
          cx="60"
          cy="60"
          r="54"
          fill="none"
          stroke="var(--background-modifier-border)"
          stroke-width="12"
        />
        <!-- Valeur de la jauge -->
        <circle
          class="gauge-value"
          cx="60"
          cy="60"
          r="54"
          fill="none"
          :stroke="color"
          stroke-width="12"
          :stroke-dasharray="`${circumference * value / 100} ${circumference}`"
          transform="rotate(-90 60 60)"
        />
        <!-- Texte de la valeur -->
        <text
          x="60"
          y="60"
          text-anchor="middle"
          dominant-baseline="middle"
          class="gauge-text"
        >
          {{ Math.round(value) }}
        </text>
      </svg>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  label: string;
  value: number;
  color: string;
}>();

const circumference = computed(() => 2 * Math.PI * 54);
</script>

<style scoped>
.metric-gauge {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.gauge-label {
  font-size: 0.9em;
  color: var(--text-muted);
  text-align: center;
}

.gauge-container {
  width: 80px;
  height: 80px;
}

.gauge {
  width: 100%;
  height: 100%;
  transform: rotate(0.25turn);
}

.gauge-background {
  opacity: 0.2;
}

.gauge-value {
  transition: stroke-dasharray 0.3s ease;
}

.gauge-text {
  font-size: 24px;
  font-weight: bold;
  fill: var(--text-normal);
  transform: rotate(-0.25turn);
}
</style> 