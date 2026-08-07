<script setup lang="ts">
import { ref } from 'vue'
import type { TreeItem } from './vue-tree-dnd-main/env'

defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  'close': []
  'submit': [node: Partial<TreeItem>]
}>()

const nodeText = ref('')

const handleSubmit = () => {
  if (!nodeText.value.trim()) return
  
  emit('submit', {
    text: nodeText.value.trim()
  })
  
  nodeText.value = ''
  emit('close')
}

const handleClose = () => {
  nodeText.value = ''
  emit('close')
}
</script>

<template>
  <div
    v-if="show"
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    @click="handleClose"
  >
    <div
      class="bg-white rounded-lg shadow-xl w-full max-w-md mx-4"
      @click.stop
    >
      <div class="flex justify-between items-center p-4 border-b border-gray-200">
        <h3 class="text-lg font-medium">
          Ajouter un nœud
        </h3>
        <button
          class="text-gray-400 hover:text-gray-500 transition-colors"
          @click="handleClose"
        >
          <i-heroicons-x-mark-20-solid class="w-5 h-5" />
        </button>
      </div>

      <form
        class="p-4"
        @submit.prevent="handleSubmit"
      >
        <div class="form-group">
          <label
            for="nodeText"
            class="block text-sm font-medium text-gray-700 mb-1"
          >
            Texte du nœud
          </label>
          <input
            id="nodeText"
            v-model="nodeText"
            type="text"
            class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            placeholder="Entrez le texte du nœud"
            autofocus
          >
        </div>

        <div class="flex justify-end gap-3 mt-4">
          <button
            type="button"
            class="px-4 py-2 text-sm text-gray-700 hover:text-gray-900 transition-colors"
            @click="handleClose"
          >
            Annuler
          </button>
          <button
            type="submit"
            class="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="!nodeText.trim()"
          >
            Ajouter
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
