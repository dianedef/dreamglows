<template>
  <form @submit.prevent="handleSubmit">
    <div class="goalflowz-modal-container">
      <div class="goalflowz-modal-content">
        <div class="goalflowz-setting-item">
          <div class="goalflowz-setting-item-info">
            <div class="goalflowz-setting-item-name">Titre</div>
            <div class="goalflowz-setting-item-description">Le titre de votre objectif</div>
          </div>
          <div class="goalflowz-setting-item-control">
            <input 
              type="text" 
              class="text-input-reset"
              v-model="formData.title" 
              required
              placeholder="Titre de l'objectif"
            >
          </div>
        </div>

        <div class="goalflowz-setting-item">
          <div class="goalflowz-setting-item-info">
            <div class="goalflowz-setting-item-name">Description</div>
            <div class="goalflowz-setting-item-description">Une description détaillée de votre objectif</div>
          </div>
          <div class="goalflowz-setting-item-control">
            <textarea 
              class="text-input-reset"
              v-model="formData.description" 
              placeholder="Description détaillée"
              rows="3"
            ></textarea>
          </div>
        </div>

        <div class="goalflowz-setting-item">
          <div class="goalflowz-setting-item-info">
            <div class="goalflowz-setting-item-name">Dates</div>
            <div class="goalflowz-setting-item-description">Définissez la période de votre objectif</div>
          </div>
          <div class="goalflowz-setting-item-control">
            <div class="goalflowz-setting-item-control-grid">
              <div>
                <div class="goalflowz-setting-item-name">Début</div>
                <input 
                  type="date" 
                  class="text-input-reset"
                  v-model="formData.startDate" 
                  required
                >
              </div>
              <div>
                <div class="goalflowz-setting-item-name">Échéance</div>
                <input 
                  type="date" 
                  class="text-input-reset"
                  v-model="formData.dueDate"
                >
              </div>
            </div>
          </div>
        </div>

        <div class="goalflowz-setting-item">
          <div class="goalflowz-setting-item-info">
            <div class="goalflowz-setting-item-name">Priorité et Statut</div>
            <div class="goalflowz-setting-item-description">Définissez l'importance et l'état de votre objectif</div>
          </div>
          <div class="goalflowz-setting-item-control">
            <div class="goalflowz-setting-item-control-grid">
              <div>
                <select v-model="formData.priority" required class="dropdown">
                  <option value="high">Haute</option>
                  <option value="medium">Moyenne</option>
                  <option value="low">Basse</option>
                </select>
              </div>
              <div>
                <select v-model="formData.status" required class="dropdown">
                  <option value="todo">À faire</option>
                  <option value="in-progress">En cours</option>
                  <option value="done">Terminé</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div class="goalflowz-setting-item">
          <div class="goalflowz-setting-item-info">
            <div class="goalflowz-setting-item-name">Catégorie</div>
            <div class="goalflowz-setting-item-description">Groupez vos objectifs par catégorie</div>
          </div>
          <div class="goalflowz-setting-item-control">
            <div class="goalflowz-category-input">
              <select 
                v-model="formData.category" 
                class="dropdown"
                @change="handleCategoryChange"
              >
                <option value="">-- Sélectionner une catégorie --</option>
                <option v-for="category in categories" :key="category" :value="category">
                  {{ category }}
                </option>
                <option value="new">+ Nouvelle catégorie</option>
              </select>
              <input 
                v-if="showNewCategoryInput"
                type="text" 
                class="text-input-reset"
                v-model="newCategory"
                placeholder="Nom de la nouvelle catégorie"
                @keydown.enter.prevent="addNewCategory"
                @blur="addNewCategory"
              >
            </div>
          </div>
        </div>

        <div class="goalflowz-setting-item">
          <div class="goalflowz-setting-item-info">
            <div class="goalflowz-setting-item-name">Tags</div>
            <div class="goalflowz-setting-item-description">Ajoutez des tags pour mieux organiser vos objectifs</div>
          </div>
          <div class="goalflowz-setting-item-control">
            <div class="goalflowz-tag-input">
              <div class="search-input-container">
                <input 
                  type="text" 
                  class="text-input-reset"
                  v-model="tagInput"
                  @keydown.enter.prevent="addTag"
                  placeholder="Ajouter un tag (Entrée pour valider)"
                  list="existing-tags"
                >
                <datalist id="existing-tags">
                  <option v-for="tag in existingTags" :key="tag" :value="tag" />
                </datalist>
              </div>
              <div class="goalflowz-tag-container">
                <div 
                  v-for="tag in formData.tags" 
                  :key="tag" 
                  class="goalflowz-tag"
                >
                  {{ tag }}
                  <span @click="removeTag(tag)" class="clickable-icon">×</span>
                </div>
              </div>
            </div>
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
import { ref, computed, inject, onMounted } from 'vue';
import { useGoalsStore } from '@/stores/goalsStore';
import type { Goal } from '@/types/goals';

const props = defineProps<{
  editingGoal?: Goal;
}>();

const goalsStore = useGoalsStore();
const closeModal = inject('closeModal') as () => void;

const isEditing = computed(() => !!props.editingGoal);
const showNewCategoryInput = ref(false);
const newCategory = ref('');

// Récupérer toutes les catégories existantes
const categories = computed(() => {
  const allCategories = new Set(goalsStore.goals.map(g => g.category).filter(Boolean));
  return Array.from(allCategories);
});

// Récupérer tous les tags existants
const existingTags = computed(() => {
  const allTags = new Set(goalsStore.goals.flatMap(g => g.tags || []));
  return Array.from(allTags);
});

const handleCategoryChange = (event: Event) => {
  const value = (event.target as HTMLSelectElement).value;
  if (value === 'new') {
    showNewCategoryInput.value = true;
    formData.value.category = '';
  }
};

const addNewCategory = () => {
  if (newCategory.value.trim()) {
    formData.value.category = newCategory.value.trim();
    newCategory.value = '';
    showNewCategoryInput.value = false;
  }
};

const formData = ref<Partial<Goal>>({
  title: '',
  description: '',
  startDate: new Date().toISOString().split('T')[0],
  dueDate: '',
  priority: 'medium',
  status: 'todo',
  category: '',
  tags: [],
  tasks: [],
  progress: 0,
  subGoalIds: []
});

// Initialiser le formulaire avec les valeurs de l'objectif à modifier
onMounted(() => {
  if (props.editingGoal) {
    formData.value = { ...props.editingGoal };
  }
});

const tagInput = ref('');

const addTag = () => {
  if (tagInput.value.trim() && !formData.value.tags?.includes(tagInput.value.trim())) {
    formData.value.tags = [...(formData.value.tags || []), tagInput.value.trim()];
    tagInput.value = '';
  }
};

const removeTag = (tag: string) => {
  formData.value.tags = formData.value.tags?.filter(t => t !== tag) || [];
};

const cancel = () => {
  closeModal();
};

const handleSubmit = async () => {
  try {
    console.log('GoalModalContent: Starting submit');
    if (isEditing.value) {
      await goalsStore.updateGoal({
        ...props.editingGoal,
        ...formData.value
      } as Goal);
    } else {
      await goalsStore.addGoal({
        ...formData.value,
        id: crypto.randomUUID()
      } as Goal);
    }
    console.log('GoalModalContent: Store operation complete');

    // Fermer la modale immédiatement
    closeModal();
  } catch (error) {
    console.error('GoalModalContent: Error during submit:', error);
  }
};

const handleDelete = async () => {
  try {
    if (props.editingGoal?.id) {
      const confirmDelete = confirm('Êtes-vous sûr de vouloir supprimer cet objectif ?');
      if (confirmDelete) {
        await goalsStore.deleteGoal(props.editingGoal.id);
        closeModal();
      }
    }
  } catch (error) {
    console.error('GoalModalContent: Error during delete:', error);
  }
};
</script> 