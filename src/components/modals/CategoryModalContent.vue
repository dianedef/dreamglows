<template>
  <form @submit.prevent="handleSubmit">
    <div class="goalflowz-modal-container">
      <div class="goalflowz-modal-content">
        <div class="goalflowz-setting-item">
          <div class="goalflowz-setting-item-info">
            <div class="goalflowz-setting-item-name">{{ isNewCategory ? 'Nouvelle catégorie' : 'Nom de la catégorie' }}</div>
            <div class="goalflowz-setting-item-description">
              {{ isNewCategory ? 'Créer une nouvelle catégorie' : 'Modifier le nom de la catégorie' }}
            </div>
          </div>
          <div class="goalflowz-setting-item-control">
            <input 
              type="text" 
              class="text-input-reset"
              v-model="categoryName" 
              required
              :placeholder="isNewCategory ? 'Nom de la nouvelle catégorie' : 'Nom de la catégorie'"
            >
          </div>
        </div>

        <div v-if="!isNewCategory" class="goalflowz-setting-item">
          <div class="goalflowz-setting-item-info">
            <div class="goalflowz-setting-item-name">Sous-catégories</div>
            <div class="goalflowz-setting-item-description">Gérer les sous-catégories</div>
          </div>
          <div class="goalflowz-setting-item-control">
            <div class="goalflowz-subcategories-list">
              <div v-for="(subcat, index) in subcategories" :key="index" class="goalflowz-subcategory-item">
                <input 
                  type="text" 
                  class="text-input-reset"
                  v-model="subcategories[index]"
                  placeholder="Nom de la sous-catégorie"
                >
                <button 
                  type="button" 
                  class="mod-warning" 
                  @click="removeSubcategory(index)"
                >×</button>
              </div>
              <button 
                type="button" 
                class="mod-cta" 
                @click="addSubcategory"
              >+ Ajouter une sous-catégorie</button>
            </div>
          </div>
        </div>
      </div>

      <div class="goalflowz-modal-button-container">
        <button class="mod-warning" type="button" @click="cancel">
          Annuler
        </button>
        <button 
          v-if="!isNewCategory"
          type="button" 
          class="mod-error" 
          @click="handleDelete"
        >
          Supprimer la catégorie
        </button>
        <button type="submit" class="mod-cta">
          {{ isNewCategory ? 'Créer' : 'Enregistrer' }}
        </button>
      </div>
    </div>
  </form>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useGoalsStore } from '@/stores/goalsStore';

const props = defineProps<{
  category: string;
  closeModal: () => void;
}>();

const goalsStore = useGoalsStore();
const isNewCategory = computed(() => !props.category);

const categoryName = ref(props.category);
const subcategories = ref<string[]>([]);

const addSubcategory = () => {
  subcategories.value.push('');
};

const removeSubcategory = (index: number) => {
  subcategories.value.splice(index, 1);
};

const cancel = () => {
  props.closeModal();
};

const handleSubmit = async () => {
  try {
    if (isNewCategory.value) {
      await goalsStore.addGoal({
        id: crypto.randomUUID(),
        title: 'Premier objectif',
        startDate: new Date().toISOString().split('T')[0],
        category: categoryName.value,
        status: 'todo',
        priority: 'medium',
        progress: 0,
        tags: [],
        tasks: [],
        subGoalIds: []
      });
      new Notice('Catégorie créée avec succès');
    } else if (categoryName.value !== props.category) {
      await goalsStore.updateCategory(props.category, categoryName.value);
    }
    props.closeModal();
  } catch (error) {
    console.error('CategoryModalContent: Error during submit:', error);
  }
};

const handleDelete = async () => {
  try {
    const confirmDelete = confirm('Êtes-vous sûr de vouloir supprimer cette catégorie ? Les objectifs seront déplacés dans "Sans catégorie".');
    if (confirmDelete) {
      await goalsStore.deleteCategory(props.category);
      props.closeModal();
    }
  } catch (error) {
    console.error('CategoryModalContent: Error during delete:', error);
  }
};
</script> 