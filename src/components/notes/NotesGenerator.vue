<template>
  <div class="notes-generator">
    <button 
      class="generate-btn"
      @click="startGeneration"
      :disabled="isGenerating"
    >
      {{ isGenerating ? 'Génération en cours...' : 'Générer les notes' }}
    </button>

    <ProgressModal
      v-if="isGenerating"
      title="Génération des notes"
      :progress="progress"
      @cancel="cancelGeneration"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import ProgressModal from '../modals/ProgressModal.vue';
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

let progressTracker: ProgressTracker | null = null;

const startGeneration = async () => {
  isGenerating.value = true;
  progressTracker = new ProgressTracker((info) => {
    progress.value = info;
  });

  try {
    await props.notesGenerator.generateNotes(progressTracker);
  } finally {
    isGenerating.value = false;
  }
};

const cancelGeneration = () => {
  progressTracker?.abort();
};
</script>

<style scoped>
.notes-generator {
  padding: 1rem;
}

.generate-btn {
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