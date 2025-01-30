<template>
  <div class="notes-generator">
    <button 
      class="generate-btn"
      @click="startGeneration"
      :disabled="isGenerating"
    >
      {{ isGenerating ? 'Génération en cours...' : 'Générer les notes' }}
    </button>

    <div v-if="isGenerating" class="progress-container">
      <div class="progress-bar" :style="{ width: progress.percentage + '%' }"></div>
      <div class="progress-text">{{ progress.current }}/{{ progress.total }} ({{ progress.percentage }}%)</div>
      <div class="message-text">{{ progress.message }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type { ProgressInfo } from '@/types/progress';
import { ProgressTracker } from '@/types/progress';
import type { NotesGeneratorService } from '@/services/NotesGeneratorService';

const props = defineProps<{
  notesGenerator: NotesGeneratorService;
}>();

const isGenerating = ref(false);
const progress = ref<ProgressInfo>({
  current: 0,
  total: 0,
  message: '',
  percentage: 0
});

const startGeneration = async () => {
  isGenerating.value = true;
  
  const progressTracker = new ProgressTracker((info) => {
    progress.value = info;
  });

  try {
    await props.notesGenerator.generateNotes(progressTracker);
  } finally {
    isGenerating.value = false;
  }
};
</script>

<style>
.notes-generator {
  padding: 1rem;
}

.progress-container {
  margin-top: 1rem;
  background: var(--background-modifier-border);
  border-radius: 4px;
  overflow: hidden;
}

.progress-bar {
  height: 8px;
  background: var(--interactive-accent);
  width: 0;
  transition: width 0.3s ease;
}

.progress-text {
  text-align: center;
  margin-top: 0.5rem;
  font-size: 0.9em;
  font-weight: 500;
}

.message-text {
  text-align: center;
  margin-top: 0.25rem;
  margin-bottom: 0.5rem;
  color: var(--text-muted);
  font-size: 0.85em;
}

.generate-btn {
  width: 100%;
  padding: 0.5rem 1rem;
  background: var(--interactive-accent);
  color: var(--text-on-accent);
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s ease;
}

.generate-btn:hover:not(:disabled) {
  background: var(--interactive-accent-hover);
}

.generate-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
</style> 