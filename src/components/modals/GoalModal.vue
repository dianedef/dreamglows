<template>
  <div v-if="isOpen" class="goalflowz-modal-overlay">
    <div class="goalflowz-modal">
      <div class="goalflowz-modal-header">
        <h3>{{ isEditing ? 'Modifier l\'objectif' : 'Nouvel objectif' }}</h3>
        <button @click="close" class="goalflowz-modal-close">
          <i class="fas fa-times"></i>
        </button>
      </div>

      <div class="goalflowz-modal-content">
        <form @submit.prevent="handleSubmit">
          <div class="goalflowz-form-group">
            <label for="title">Titre</label>
            <input 
              type="text" 
              id="title" 
              v-model="formData.title" 
              required
              placeholder="Titre de l'objectif"
            >
          </div>

          <div class="goalflowz-form-group">
            <label for="description">Description</label>
            <textarea 
              id="description" 
              v-model="formData.description" 
              placeholder="Description détaillée"
              rows="3"
            ></textarea>
          </div>

          <div class="goalflowz-form-row">
            <div class="goalflowz-form-group">
              <label for="startDate">Date de début</label>
              <input 
                type="date" 
                id="startDate" 
                v-model="formData.startDate" 
                required
              >
            </div>

            <div class="goalflowz-form-group">
              <label for="dueDate">Date d'échéance</label>
              <input 
                type="date" 
                id="dueDate" 
                v-model="formData.dueDate"
              >
            </div>
          </div>

          <div class="goalflowz-form-row">
            <div class="goalflowz-form-group">
              <label for="priority">Priorité</label>
              <select id="priority" v-model="formData.priority" required>
                <option value="high">Haute</option>
                <option value="medium">Moyenne</option>
                <option value="low">Basse</option>
              </select>
            </div>

            <div class="goalflowz-form-group">
              <label for="status">Statut</label>
              <select id="status" v-model="formData.status" required>
                <option value="todo">À faire</option>
                <option value="in-progress">En cours</option>
                <option value="done">Terminé</option>
              </select>
            </div>
          </div>

          <div class="goalflowz-form-group">
            <label for="category">Catégorie</label>
            <input 
              type="text" 
              id="category" 
              v-model="formData.category" 
              placeholder="Catégorie de l'objectif"
            >
          </div>

          <div class="goalflowz-form-group">
            <label>Tags</label>
            <div class="goalflowz-tags-input">
              <input 
                type="text" 
                v-model="tagInput"
                @keydown.enter.prevent="addTag"
                placeholder="Ajouter un tag (Entrée pour valider)"
              >
              <div class="goalflowz-tags-list">
                <span 
                  v-for="tag in formData.tags" 
                  :key="tag" 
                  class="goalflowz-tag"
                >
                  {{ tag }}
                  <button @click="removeTag(tag)" type="button">×</button>
                </span>
              </div>
            </div>
          </div>

          <div class="goalflowz-modal-footer">
            <button type="button" @click="close" class="goalflowz-btn-secondary">
              Annuler
            </button>
            <button type="submit" class="goalflowz-btn-primary">
              {{ isEditing ? 'Mettre à jour' : 'Créer' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useModalStore } from '@/stores/modalStore';
import { useGoalsStore } from '@/stores/goalsStore';
import type { Goal } from '@/types/goals';

const modalStore = useModalStore();
const goalsStore = useGoalsStore();

const isOpen = computed(() => modalStore.isGoalModalOpen);
const isEditing = computed(() => !!modalStore.editingGoal);

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

const tagInput = ref('');

// Réinitialiser le formulaire quand la modale s'ouvre
watch(isOpen, (newValue) => {
  if (newValue && modalStore.editingGoal) {
    formData.value = { ...modalStore.editingGoal };
  } else if (newValue) {
    formData.value = {
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
    };
  }
});

const addTag = () => {
  if (tagInput.value.trim() && !formData.value.tags?.includes(tagInput.value.trim())) {
    formData.value.tags = [...(formData.value.tags || []), tagInput.value.trim()];
    tagInput.value = '';
  }
};

const removeTag = (tag: string) => {
  formData.value.tags = formData.value.tags?.filter(t => t !== tag) || [];
};

const handleSubmit = async () => {
  try {
    console.log('GoalModal: Starting submit');
    if (isEditing.value) {
      await goalsStore.updateGoal({
        ...modalStore.editingGoal,
        ...formData.value
      } as Goal);
    } else {
      await goalsStore.addGoal({
        ...formData.value,
        id: crypto.randomUUID()
      } as Goal);
    }
    console.log('GoalModal: Store operation complete');
    modalStore.closeGoalModal();
    console.log('GoalModal: Modal closed');
    
    // Reset form data
    formData.value = {
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
    };
    console.log('GoalModal: Form data reset');
  } catch (error) {
    console.error('GoalModal: Error during submit:', error);
  }
};

// Séparation de la logique de fermeture
const close = () => {
  try {
    console.log('GoalModal: Starting close');
    modalStore.closeGoalModal();
    // Reset form data
    formData.value = {
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
    };
    console.log('GoalModal: Close complete');
  } catch (error) {
    console.error('GoalModal: Error during close:', error);
  }
};
</script> 