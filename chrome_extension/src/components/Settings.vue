<script setup lang="ts">
import { ref, computed } from 'vue'
import { useSettingsStore } from '../stores/settings.store'

const store = useSettingsStore()

// Catégories disponibles
const categories = [
  { id: 'general', name: 'Général', icon: 'i-heroicons-cog-6-tooth' },
  { id: 'appearance', name: 'Apparence', icon: 'i-heroicons-paint-brush' },
  { id: 'sync', name: 'Synchronisation', icon: 'i-heroicons-cloud' },
  { id: 'advanced', name: 'Avancé', icon: 'i-heroicons-adjustments-horizontal' }
]

// Catégorie active
const activeCategory = ref('general')

// Paramètres de la catégorie active
const categorySettings = computed(() => {
  return store.getSettingsByCategory(activeCategory.value as any)
})

// Gérer le changement de valeur d'un paramètre
const handleSettingChange = (id: string, value: any) => {
  store.updateSetting(id, value)
}
</script>

<template>
  <div class="bg-white rounded-lg shadow-sm p-6 mt-6">
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-2xl font-bold mb-4">Paramètres</h2>
      <button
        class="flex items-center px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
        @click="store.resetAllSettings"
      >
        <i-heroicons-arrow-path class="w-4 h-4 mr-2" />
        Réinitialiser
      </button>
    </div>

    <div class="flex gap-8">
      <!-- Navigation des catégories -->
      <div class="flex flex-col gap-2 w-48">
        <button
          v-for="category in categories"
          :key="category.id"
          class="flex items-center gap-3 px-4 py-2 rounded-md text-gray-600 hover:bg-gray-100 transition-colors text-left"
          :class="{ 'bg-blue-50 text-blue-600': activeCategory === category.id }"
          @click="activeCategory = category.id"
        >
          <component :is="category.icon" class="w-5 h-5" />
          <span>{{ category.name }}</span>
        </button>
      </div>

      <!-- Liste des paramètres -->
      <div class="flex-1 space-y-6">
        <div
          v-for="setting in categorySettings"
          :key="setting.id"
          class="flex justify-between items-center py-4 border-b border-gray-100 last:border-0"
        >
          <div class="flex-1 pr-8">
            <h3 class="font-medium mb-1">{{ setting.name }}</h3>
            <p class="text-sm text-gray-500">{{ setting.description }}</p>
          </div>

          <div class="flex items-center">
            <!-- Switch pour les booléens -->
            <label
              v-if="setting.type === 'boolean'"
              class="relative inline-block w-12 h-6"
            >
              <input
                type="checkbox"
                class="opacity-0 w-0 h-0"
                :checked="setting.value"
                @change="(e: Event) => handleSettingChange(setting.id, (e.target as HTMLInputElement).checked)"
              >
              <span class="absolute cursor-pointer top-0 left-0 right-0 bottom-0 bg-gray-300 transition-all rounded-full before:absolute before:content-[''] before:h-5 before:w-5 before:left-0.5 before:bottom-0.5 before:bg-white before:transition-all before:rounded-full peer-checked:bg-blue-600 peer-checked:before:translate-x-6" />
            </label>

            <!-- Select pour les listes -->
            <select
              v-else-if="setting.type === 'select'"
              :value="setting.value"
              @change="(e: Event) => handleSettingChange(setting.id, (e.target as HTMLSelectElement).value)"
              class="px-3 py-1.5 border border-gray-300 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            >
              <option
                v-for="option in setting.options"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </option>
            </select>

            <!-- Input number -->
            <input
              v-else-if="setting.type === 'number'"
              type="number"
              :value="setting.value"
              @input="(e: Event) => handleSettingChange(setting.id, Number((e.target as HTMLInputElement).value))"
              class="px-3 py-1.5 border border-gray-300 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            >

            <!-- Input color -->
            <input
              v-else-if="setting.type === 'string' && setting.id === 'highlightColor'"
              type="color"
              :value="setting.value"
              @input="(e: Event) => handleSettingChange(setting.id, (e.target as HTMLInputElement).value)"
              class="w-12 h-8 p-0 border-0 rounded cursor-pointer"
            >

            <!-- Input text par défaut -->
            <input
              v-else
              type="text"
              :value="setting.value"
              @input="(e: Event) => handleSettingChange(setting.id, (e.target as HTMLInputElement).value)"
              class="px-3 py-1.5 border border-gray-300 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            >
          </div>
        </div>
      </div>
    </div>
  </div>
</template> 