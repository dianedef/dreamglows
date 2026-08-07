<template>
  <!-- No changes to template section -->
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { useTasksStore, useGoalsStore } from '../stores/tasks';

const props = defineProps({
  // No changes to props section
});

const containerEl = ref(null);
const vueApp = ref(null);

async function onOpen() {
  const container = containerEl.value.children[1];
  container.empty();
  container.createEl("div", { cls: "dreamglows-container" });

  // Enregistrer les styles
  registerStyles('all');

  // Créer l'application Vue avec Pinia
  vueApp.value = createApp(MainView, {
    contentFiles: props.app.vault.getMarkdownFiles(),
    app: props.app
  });
  
  // S'assurer que Pinia est initialisé avant de l'utiliser
  const pinia = createPinia();
  vueApp.value.use(pinia);
  
  // Initialiser les stores après Pinia
  const tasksStore = useTasksStore();
  const goalsStore = useGoalsStore();
  
  // Configurer les watchers pour la sauvegarde automatique
  watch(() => goalsStore.goals, async () => {
    console.log('Goals changed, saving...', goalsStore.goals.length);
    await props.plugin.savePluginData(goalsStore.goals, tasksStore.tasks);
  }, { deep: true });
  
  watch(() => tasksStore.tasks, async () => {
    console.log('Tasks changed, saving...', tasksStore.tasks.length);
    await props.plugin.savePluginData(goalsStore.goals, tasksStore.tasks);
  }, { deep: true });
  
  // Monter l'application
  vueApp.value.mount(container.children[0]);
}

onMounted(() => {
  onOpen();
});
</script>

<style>
  /* No changes to style section */
</style> 