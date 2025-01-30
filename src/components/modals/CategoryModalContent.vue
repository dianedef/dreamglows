<template>
  <form @submit.prevent="handleSubmit">
    <div class="goalflowz-modal-container">
      <div class="goalflowz-modal-content">
        <div class="goalflowz-setting-item">
          <div class="goalflowz-setting-item-info">
            <div class="goalflowz-setting-item-name">Nom de la catégorie</div>
            <div class="goalflowz-setting-item-description">Modifiez le nom de la catégorie</div>
          </div>
          <div class="goalflowz-setting-item-control">
            <input 
              type="text" 
              class="text-input-reset"
              v-model="categoryName" 
              required
              placeholder="Nom de la catégorie"
            >
          </div>
        </div>

        <div class="goalflowz-setting-item">
          <div class="goalflowz-setting-item-info">
            <div class="goalflowz-setting-item-name">Description</div>
            <div class="goalflowz-setting-item-description">Une description optionnelle pour la catégorie</div>
          </div>
          <div class="goalflowz-setting-item-control">
            <textarea 
              class="text-input-reset"
              v-model="description" 
              placeholder="Description de la catégorie"
              rows="3"
            ></textarea>
          </div>
        </div>

        <div class="goalflowz-setting-item">
          <div class="goalflowz-setting-item-info">
            <div class="goalflowz-setting-item-name">Couleur</div>
            <div class="goalflowz-setting-item-description">Choisissez une couleur pour identifier la catégorie</div>
          </div>
          <div class="goalflowz-setting-item-control">
            <input 
              type="color" 
              v-model="color"
              class="color-input-reset"
            >
          </div>
        </div>
      </div>

      <div class="goalflowz-modal-button-container">
        <button class="mod-warning" type="button" @click="cancel">
          Annuler
        </button>
        <button 
          v-if="isEditing" 
          type="button" 
          class="mod-error" 
          @click="handleDelete"
        >
          Supprimer
        </button>
        <button type="submit" class="mod-cta">
          {{ isEditing ? 'Mettre à jour' : 'Créer' }}
        </button>
      </div>
    </div>
  </form>
</template>

<script setup lang="ts">
import { ref, computed, inject } from 'vue';
import { useGoalsStore } from '@/stores/goalsStore';

const props = defineProps<{
  category: string;
}>();

const goalsStore = useGoalsStore();
const closeModal = inject('closeModal') as () => void;

const categoryName = ref(props.category);
const description = ref('');
const color = ref('#3498db');

const isEditing = computed(() => props.category !== '');

const handleSubmit = () => {
  if (isEditing.value) {
    // Mettre à jour la catégorie dans tous les objectifs
    goalsStore.updateCategory(props.category, categoryName.value);
  }
  closeModal();
};

const cancel = () => {
  closeModal();
};

const handleDelete = () => {
  if (confirm('Êtes-vous sûr de vouloir supprimer cette catégorie ? Les objectifs associés ne seront pas supprimés mais n\'auront plus de catégorie.')) {
    goalsStore.deleteCategory(props.category);
    closeModal();
  }
};
</script>