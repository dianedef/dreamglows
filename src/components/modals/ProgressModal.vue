<template>
  <div class="progress-modal">
    <div class="progress-content">
      <h3>{{ title }}</h3>
      
      <div class="progress-info">
        <div class="progress-message">{{ progress.message }}</div>
        <div class="progress-numbers">{{ progress.current }}/{{ progress.total }}</div>
      </div>

      <div class="progress-bar-container">
        <div 
          class="progress-bar" 
          :style="{ width: progress.percentage + '%' }"
        ></div>
      </div>

      <div class="progress-percentage">{{ progress.percentage }}%</div>

      <button 
        class="progress-cancel-btn" 
        @click="$emit('cancel')"
      >
        Annuler
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ProgressInfo } from '@/types/progress';

defineProps<{
  title: string;
  progress: ProgressInfo;
}>();

defineEmits<{
  (e: 'cancel'): void;
}>();
</script>

<style scoped>
.progress-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.progress-content {
  background: var(--background-primary);
  padding: 2rem;
  border-radius: 8px;
  width: 400px;
  max-width: 90%;
}

.progress-info {
  margin: 1rem 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.progress-message {
  color: var(--text-muted);
  font-size: 0.9em;
}

.progress-numbers {
  font-size: 0.9em;
  font-weight: 500;
}

.progress-bar-container {
  width: 100%;
  height: 8px;
  background: var(--background-modifier-border);
  border-radius: 4px;
  overflow: hidden;
  margin: 1rem 0;
}

.progress-bar {
  height: 100%;
  background: var(--interactive-accent);
  transition: width 0.3s ease;
}

.progress-percentage {
  text-align: center;
  font-weight: 600;
  margin-bottom: 1rem;
}

.progress-cancel-btn {
  width: 100%;
  padding: 0.5rem;
  background: var(--background-modifier-error);
  color: var(--text-on-accent);
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s ease;
}

.progress-cancel-btn:hover {
  background: var(--background-modifier-error-hover);
}
</style> 