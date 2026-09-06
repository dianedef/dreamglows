<script setup lang="ts">
import { persistenceState, downloadRecovery, reloadCanonical } from '../lib/canonical/client'
import { useUrlSearchParams } from '@vueuse/core'
import { computed, defineAsyncComponent, onMounted, ref } from 'vue'

const params = useUrlSearchParams('history')
const setupType = ref<'install' | 'update'>('install')

onMounted(() => {
  const type = params.type as string
  if (type === 'install' || type === 'update') {
    setupType.value = type
  }
  updateTitle()
})

function updateTitle() {
  if (setupType.value === 'install') {
    document.title = `${__DISPLAY_NAME__} | Installed!`
  } else if (setupType.value === 'update') {
    document.title = `${__DISPLAY_NAME__} | Updated!`
  } else {
    document.title = __DISPLAY_NAME__
  }
}

const InstallComponent = defineAsyncComponent(
  () => import('@/components/install.vue')
)
const UpdateComponent = defineAsyncComponent(
  () => import('@/components/update.vue')
)

const ComponentToRender = computed(() => {
  if (setupType.value === 'update') {
    return UpdateComponent
  }
  return InstallComponent
})
</script>

<template>
  <aside class="px-6 py-3 text-sm" aria-live="polite">
    <span v-if="persistenceState.state === 'saving'">Enregistrement en cours…</span>
    <span v-else-if="persistenceState.state === 'saved'">Enregistré sur cet appareil</span>
    <div v-else-if="persistenceState.state === 'error'" role="alert">
      <p>Modifications non enregistrées. {{ persistenceState.error }}</p>
      <div class="mt-2 flex flex-wrap gap-3">
      <button class="rounded-lg border border-slate-300 bg-white px-3 py-2 focus-visible:outline-violet-600" type="button" @click="downloadRecovery">Télécharger mes modifications</button>
      <button class="rounded-lg border border-slate-300 bg-white px-3 py-2 focus-visible:outline-violet-600" type="button" @click="reloadCanonical">Recharger les données enregistrées</button>
      </div>
    </div>
  </aside>
  <div class="p-10 flex flex-col flex-1 justify-center">
    <div class="flex flex-col items-center">
      <component :is="ComponentToRender" />
    </div>
  </div>
</template>

<style lang="scss"></style>
