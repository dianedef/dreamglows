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

        <div class="goalflowz-setting-item">
          <div class="goalflowz-setting-item-info">
            <div class="goalflowz-setting-item-name">Métriques</div>
            <div class="goalflowz-setting-item-description">Définissez des métriques pour suivre votre progression</div>
          </div>
          <div class="goalflowz-setting-item-control">
            <div class="goalflowz-setting-item-control-grid">
              <div>
                <div class="goalflowz-setting-item-name">Objectif</div>
                <input 
                  type="number" 
                  class="text-input-reset"
                  v-model="formData.metrics.target"
                  placeholder="Valeur cible"
                >
              </div>
              <div>
                <div class="goalflowz-setting-item-name">Unité</div>
                <input 
                  type="text" 
                  class="text-input-reset"
                  v-model="formData.metrics.unit"
                  placeholder="ex: heures, km, etc."
                >
              </div>
            </div>
          </div>
        </div>

        <div class="goalflowz-setting-item">
          <div class="goalflowz-setting-item-info">
            <div class="goalflowz-setting-item-name">Récurrence</div>
            <div class="goalflowz-setting-item-description">Définissez si cet objectif est récurrent</div>
          </div>
          <div class="goalflowz-setting-item-control">
            <div class="goalflowz-setting-item-control-grid">
              <div>
                <select v-model="formData.recurring.frequency" class="dropdown">
                  <option value="">Non récurrent</option>
                  <option value="daily">Quotidien</option>
                  <option value="weekly">Hebdomadaire</option>
                  <option value="monthly">Mensuel</option>
                  <option value="yearly">Annuel</option>
                </select>
              </div>
              <div v-if="formData.recurring.frequency">
                <div class="goalflowz-setting-item-name">Date de fin</div>
                <input 
                  type="date" 
                  class="text-input-reset"
                  v-model="formData.recurring.endDate"
                >
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
import { ref, computed, onMounted, inject } from 'vue';
import { useGoalsStore } from '@/stores/goalsStore';
import type { Goal, GoalStatus, GoalPriority, GoalFrequency } from '@/types/goals';
import { Notice } from 'obsidian';
import { v4 as uuidv4 } from 'uuid';

const props = defineProps<{
  editingGoal?: Goal;
}>();

const goalsStore = useGoalsStore();
const closeModal = inject('closeModal') as () => void;

const isEditing = computed(() => !!props.editingGoal);
const showNewCategoryInput = ref(false);
const newCategory = ref('');
const tagInput = ref('');

// État initial du formulaire
const defaultFormData: Goal = {
  id: uuidv4(),
  title: '',
  description: '',
  category: '',
  startDate: new Date().toISOString().split('T')[0],
  status: 'todo' as GoalStatus,
  priority: 'medium' as GoalPriority,
  tasks: [],
  subGoalIds: [],
  progress: 0,
  tags: [],
  metrics: {
    target: 0,
    current: 0,
    unit: ''
  },
  recurring: {
    frequency: '' as GoalFrequency,
    endDate: undefined
  }
};

// Initialiser le formulaire avec les données d'édition ou les valeurs par défaut
const formData = ref<Goal>(props.editingGoal ? { ...props.editingGoal } : { ...defaultFormData });

// Récupérer toutes les catégories existantes
const categories = computed(() => {
  return [...new Set(goalsStore.goals.map(g => g.category).filter(Boolean))];
});

// Récupérer tous les tags existants
const existingTags = computed(() => {
  const allTags = goalsStore.goals.flatMap(g => g.tags || []);
  return [...new Set(allTags)];
});

const handleCategoryChange = () => {
  if (formData.value.category === 'new') {
    showNewCategoryInput.value = true;
    formData.value.category = '';
  }
};

const addNewCategory = () => {
  if (newCategory.value.trim()) {
    formData.value.category = newCategory.value.trim();
    newCategory.value = '';
  }
  showNewCategoryInput.value = false;
};

const addTag = () => {
  const tag = tagInput.value.trim();
  if (tag && !formData.value.tags?.includes(tag)) {
    if (!formData.value.tags) {
      formData.value.tags = [];
    }
    formData.value.tags.push(tag);
  }
  tagInput.value = '';
};

const removeTag = (tag: string) => {
  if (formData.value.tags) {
    formData.value.tags = formData.value.tags.filter(t => t !== tag);
  }
};

const handleSubmit = async () => {
  try {
    if (isEditing.value) {
      await goalsStore.updateGoal(formData.value);
      new Notice('Objectif mis à jour avec succès');
    } else {
      await goalsStore.createGoal(formData.value);
      new Notice('Objectif créé avec succès');
    }
    closeModal();
  } catch (error) {
    console.error('Erreur lors de la sauvegarde de l\'objectif:', error);
    new Notice('Erreur lors de la sauvegarde de l\'objectif');
  }
};

const handleDelete = async () => {
  if (formData.value.id) {
    try {
      await goalsStore.deleteGoal(formData.value.id);
      new Notice('Objectif supprimé avec succès');
      closeModal();
    } catch (error) {
      console.error('Erreur lors de la suppression de l\'objectif:', error);
      new Notice('Erreur lors de la suppression de l\'objectif');
    }
  }
};

const cancel = () => {
  closeModal();
};
</script>

<style scoped>
.goalflowz-modal-container {
  padding: 1rem;
}

.goalflowz-modal-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.goalflowz-setting-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.goalflowz-setting-item-info {
  display: flex;
  flex-direction: column;
}

.goalflowz-setting-item-name {
  font-weight: bold;
  margin-bottom: 0.25rem;
}

.goalflowz-setting-item-description {
  color: var(--text-muted);
  font-size: 0.8rem;
}

.goalflowz-setting-item-control {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.goalflowz-setting-item-control-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.goalflowz-category-input {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.goalflowz-tag-input {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.goalflowz-tag-container {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.goalflowz-tag {
  background-color: var(--background-modifier-hover);
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.clickable-icon {
  cursor: pointer;
  opacity: 0.7;
}

.clickable-icon:hover {
  opacity: 1;
}

.goalflowz-modal-button-container {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 1rem;
}

.text-input-reset {
  width: 100%;
}

.dropdown {
  width: 100%;
}
</style> 