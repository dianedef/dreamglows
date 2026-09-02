<template>
  <form class="dreamglows-goal-modal" aria-labelledby="dreamglows-goal-modal-title" @submit.prevent="handleSubmit">
    <header class="dreamglows-goal-modal__header">
      <p class="dreamglows-goal-modal__eyebrow">DreamGlows · Objectif</p>
      <h2 id="dreamglows-goal-modal-title">{{ isEditing ? 'Modifier l’objectif' : 'Nouvel objectif' }}</h2>
      <p>Définissez une direction claire, puis rendez sa progression mesurable.</p>
    </header>

    <div class="dreamglows-goal-modal__body">
      <section class="dreamglows-goal-modal__section" aria-labelledby="goal-vision-title">
        <div class="dreamglows-goal-modal__section-heading">
          <h3 id="goal-vision-title">Vision</h3>
          <p>Le résultat que vous voulez atteindre.</p>
        </div>
        <div class="dreamglows-goal-field">
          <label for="goal-title">Titre <span aria-hidden="true">*</span></label>
          <input id="goal-title" v-model="formData.title" type="text" placeholder="Ex. Courir mon premier semi-marathon" required autofocus />
        </div>
        <div class="dreamglows-goal-field">
          <label for="goal-description">Description</label>
          <textarea id="goal-description" v-model="formData.description" rows="3" placeholder="Pourquoi cet objectif compte-t-il pour vous ?"></textarea>
        </div>
      </section>

      <section class="dreamglows-goal-modal__section" aria-labelledby="goal-frame-title">
        <div class="dreamglows-goal-modal__section-heading">
          <h3 id="goal-frame-title">Cadre</h3>
          <p>Les dates et l’état de votre engagement.</p>
        </div>
        <div class="dreamglows-goal-modal__grid dreamglows-goal-modal__grid--dates">
          <div class="dreamglows-goal-field"><label for="goal-start-date">Date de début <span aria-hidden="true">*</span></label><input id="goal-start-date" v-model="formData.startDate" type="date" required /></div>
          <div class="dreamglows-goal-field"><label for="goal-due-date">Échéance <span>(optionnelle)</span></label><input id="goal-due-date" v-model="formData.dueDate" type="date" /></div>
        </div>
        <div class="dreamglows-goal-modal__grid">
          <div class="dreamglows-goal-field"><label for="goal-priority">Priorité</label><select id="goal-priority" v-model="formData.priority" required><option value="high">Haute</option><option value="medium">Moyenne</option><option value="low">Basse</option></select></div>
          <div class="dreamglows-goal-field"><label for="goal-status">Statut</label><select id="goal-status" v-model="formData.status" required><option value="todo">À faire</option><option value="in-progress">En cours</option><option value="done">Terminé</option></select></div>
        </div>
      </section>

      <section class="dreamglows-goal-modal__section" aria-labelledby="goal-organization-title">
        <div class="dreamglows-goal-modal__section-heading">
          <h3 id="goal-organization-title">Organisation</h3>
          <p>Retrouvez et regroupez facilement cet objectif.</p>
        </div>
        <div class="dreamglows-goal-field">
          <label for="goal-category">Catégorie</label>
          <select id="goal-category" v-model="formData.category" @change="handleCategoryChange"><option value="">Aucune catégorie</option><option v-for="category in categories" :key="category" :value="category">{{ category }}</option><option value="new">+ Nouvelle catégorie</option></select>
          <input v-if="showNewCategoryInput" v-model="newCategory" type="text" aria-label="Nom de la nouvelle catégorie" placeholder="Nom de la nouvelle catégorie" @keydown.enter.prevent="addNewCategory" @blur="addNewCategory" />
        </div>
        <div class="dreamglows-goal-field">
          <label for="goal-tag">Tags</label>
          <input id="goal-tag" v-model="tagInput" type="text" list="existing-tags" placeholder="Saisir un tag puis Entrée" @keydown.enter.prevent="addTag" />
          <datalist id="existing-tags"><option v-for="tag in existingTags" :key="tag" :value="tag" /></datalist>
          <div v-if="formData.tags?.length" class="dreamglows-goal-tags" aria-label="Tags ajoutés"><span v-for="tag in formData.tags" :key="tag" class="dreamglows-goal-tag">#{{ tag }}<button type="button" :aria-label="`Retirer le tag ${tag}`" @click="removeTag(tag)">×</button></span></div>
        </div>
      </section>

      <section class="dreamglows-goal-modal__section" aria-labelledby="goal-progress-title">
        <div class="dreamglows-goal-modal__section-heading">
          <h3 id="goal-progress-title">Mesure et rythme</h3>
          <p>Facultatif — ajoutez un repère concret ou une récurrence.</p>
        </div>
        <div class="dreamglows-goal-modal__grid">
          <div class="dreamglows-goal-field"><label for="goal-target">Valeur cible</label><input id="goal-target" v-model="formData.metrics.target" type="number" placeholder="Ex. 21" /></div>
          <div class="dreamglows-goal-field"><label for="goal-unit">Unité</label><input id="goal-unit" v-model="formData.metrics.unit" type="text" placeholder="Ex. kilomètres" /></div>
        </div>
        <div class="dreamglows-goal-modal__grid">
          <div class="dreamglows-goal-field"><label for="goal-frequency">Récurrence</label><select id="goal-frequency" v-model="formData.recurring.frequency"><option value="">Non récurrent</option><option value="daily">Quotidienne</option><option value="weekly">Hebdomadaire</option><option value="monthly">Mensuelle</option><option value="yearly">Annuelle</option></select></div>
          <div v-if="formData.recurring.frequency" class="dreamglows-goal-field"><label for="goal-recurring-end">Fin de la récurrence</label><input id="goal-recurring-end" v-model="formData.recurring.endDate" type="date" /></div>
        </div>
      </section>
    </div>

    <footer class="dreamglows-goal-modal__actions">
      <button v-if="isEditing" type="button" class="dreamglows-goal-modal__delete" @click="handleDelete">Supprimer</button>
      <button type="button" @click="cancel">Annuler</button>
      <button type="submit" class="mod-cta">{{ isEditing ? 'Enregistrer les modifications' : 'Créer l’objectif' }}</button>
    </footer>
  </form>
</template>

<script setup lang="ts">
import { ref, computed, inject } from 'vue';
import { useGoalsStore } from '@/stores/goalsStore';
import type { Goal, GoalStatus, GoalPriority, GoalFrequency } from '@/types/goals';
import { Notice } from 'obsidian';
import { v4 as uuidv4 } from 'uuid';

const props = defineProps<{ editingGoal?: Goal }>();
const goalsStore = useGoalsStore();
const closeModal = inject('closeModal') as () => void;
const isEditing = computed(() => !!props.editingGoal);
const showNewCategoryInput = ref(false);
const newCategory = ref('');
const tagInput = ref('');
const defaultFormData: Goal = {
  id: uuidv4(), title: '', description: '', category: '', startDate: new Date().toISOString().split('T')[0], status: 'todo' as GoalStatus, priority: 'medium' as GoalPriority, tasks: [], subGoalIds: [], progress: 0, tags: [],
  metrics: { target: 0, current: 0, unit: '' }, recurring: { frequency: '' as GoalFrequency, endDate: undefined }
};
const formData = ref<Goal>(props.editingGoal ? { ...props.editingGoal } : { ...defaultFormData });
const categories = computed(() => [...new Set(goalsStore.goals.map(goal => goal.category).filter(Boolean))]);
const existingTags = computed(() => [...new Set(goalsStore.goals.flatMap(goal => goal.tags || []))]);
const handleCategoryChange = () => { if (formData.value.category === 'new') { showNewCategoryInput.value = true; formData.value.category = ''; } };
const addNewCategory = () => { if (newCategory.value.trim()) { formData.value.category = newCategory.value.trim(); newCategory.value = ''; } showNewCategoryInput.value = false; };
const addTag = () => { const tag = tagInput.value.trim(); if (tag && !formData.value.tags?.includes(tag)) { if (!formData.value.tags) formData.value.tags = []; formData.value.tags.push(tag); } tagInput.value = ''; };
const removeTag = (tag: string) => { if (formData.value.tags) formData.value.tags = formData.value.tags.filter(item => item !== tag); };
const handleSubmit = async () => {
  try { if (isEditing.value) { await goalsStore.updateGoal(formData.value); new Notice('Objectif mis à jour avec succès'); } else { await goalsStore.createGoal(formData.value); new Notice('Objectif créé avec succès'); } closeModal(); }
  catch (error) { console.error('Erreur lors de la sauvegarde de l’objectif:', error); new Notice('Erreur lors de la sauvegarde de l’objectif'); }
};
const handleDelete = async () => { if (!formData.value.id) return; try { await goalsStore.deleteGoal(formData.value.id); new Notice('Objectif supprimé avec succès'); closeModal(); } catch (error) { console.error('Erreur lors de la suppression de l’objectif:', error); new Notice('Erreur lors de la suppression de l’objectif'); } };
const cancel = () => closeModal();
</script>
