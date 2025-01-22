<template>
    <div class="goalflowz-notes-list">
        <div v-if="notes.length === 0" class="goalflowz-no-content">
            <p>Aucune note ne correspond aux critères de recherche</p>
            <small>Essayez de modifier vos filtres</small>
        </div>
        <div v-else v-for="note in notes" 
            :key="note.path" 
            class="goalflowz-note-item"
            :class="{ 'expanded': expandedNotes.includes(note.path) }"
            @click="$emit('toggle-note', note.path, $event)">
            <div class="goalflowz-note-header">
                <h3 class="goalflowz-note-title" @click.stop="openFile(note.path)" style="cursor: pointer;">
                    {{ note.title }}
                </h3>
                <div class="goalflowz-header-right">
                    <div class="goalflowz-progress-bar-container">
                        <div 
                            class="goalflowz-progress-bar" 
                            :style="{ width: getProgressPercentage(note.tasks) + '%' }"
                        ></div>
                        <span class="goalflowz-progress-text">{{ getProgressPercentage(note.tasks) }}%</span>
                    </div>
                    <select 
                        class="goalflowz-note-status" 
                        :class="'goalflowz-status-' + note.status"
                        v-model="note.status"
                        @change="updateStatus(note, $event)"
                        @click.stop
                    >
                        <option value="todo">À faire</option>
                        <option value="in-progress">En cours</option>
                        <option value="done">Terminé</option>
                    </select>
                </div>
            </div>
            <div class="goalflowz-note-meta">
                <span>Créé le: {{ formatDate(note.created) }}</span>
                <span>Dernière modification: {{ formatDate(note.lastUpdated) }}</span>
                <span>Mots: {{ note.wordCount }}</span>
            </div>
            <div v-show="expandedNotes.includes(note.path)" class="goalflowz-tasks-list" v-if="note.tasks">
                <div v-for="task in note.tasks" :key="task.id" class="goalflowz-task-item">
                    <div 
                        class="goalflowz-task-item-content"
                        @click.stop="toggleTask(note, task)"
                    >
                        <div 
                            class="goalflowz-task-checkbox" 
                            :class="{ checked: task.done }"
                        ></div>
                        <span class="goalflowz-task-label" :class="{ done: task.done }">
                            {{ task.label }}
                        </span>
                        <div class="goalflowz-task-actions">
                            <button 
                                v-if="task.linkToOptimizer" 
                                class="goalflowz-task-action-button optimizer"
                                @click.stop="openOptimizer(note)"
                                title="Ouvrir l'optimiseur SEO"
                            >
                                🎯 Optimiser
                            </button>
                            <button 
                                v-if="task.linkToGenerator" 
                                class="goalflowz-task-action-button generator"
                                @click.stop="addToGenerator(note)"
                                title="Ajouter au générateur d'articles"
                            >
                                ✍️ Générer
                            </button>
                            <div 
                                class="goalflowz-task-delete"
                                @click.stop="deleteTask(note, task)"
                                title="Supprimer la tâche"
                            >
                                🗑️
                            </div>
                        </div>
                    </div>
                </div>
                <div class="goalflowz-task-item">
                    <div class="goalflowz-task-item-content">
                        <div class="goalflowz-task-checkbox"></div>
                        <input 
                            type="text" 
                            placeholder="Nouvelle tâche... (Entrée pour ajouter)"
                            v-model="newTaskLabels[note.path]"
                            @keyup.enter="addNewTask(note)"
                            @click.stop
                            style="flex: 1; margin: 0; padding: 4px 8px;"
                        >
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { Note, Task } from '../../types';

const props = defineProps<{
    notes: Note[];
    expandedNotes: string[];
    app: any;
}>();

const emit = defineEmits<{
    'toggle-note': [path: string, event: Event];
    'toggle-task': [note: Note, task: Task];
    'delete-task': [note: Note, task: Task];
    'add-task': [note: Note, label: string];
    'update-status': [note: Note, status: string];
}>();

const newTaskLabels = ref<{ [key: string]: string }>({});

// Fonctions nécessaires
const formatDate = (date: string) => {
    return format(new Date(date), 'dd MMM yyyy', { locale: fr });
};

const getProgressPercentage = (tasks: Task[]) => {
    if (!tasks || tasks.length === 0) return 0;
    const completed = tasks.filter(t => t.done).length;
    return Math.round((completed / tasks.length) * 100);
};

const openFile = (path: string) => {
    const file = props.app.vault.getAbstractFileByPath(path);
    if (file) {
        props.app.workspace.getLeaf().openFile(file);
    }
};

const toggleTask = (note: Note, task: Task) => {
    emit('toggle-task', note, task);
};

const deleteTask = (note: Note, task: Task) => {
    emit('delete-task', note, task);
};

const addNewTask = (note: Note) => {
    const label = newTaskLabels.value[note.path];
    if (label?.trim()) {
        emit('add-task', note, label);
        newTaskLabels.value[note.path] = '';
    }
};

const updateStatus = (note: Note, event: Event) => {
    const status = (event.target as HTMLSelectElement).value;
    emit('update-status', note, status);
};

const openOptimizer = (note: Note) => {
    window.dispatchEvent(new CustomEvent('view-change', { detail: 'seo' }));
    setTimeout(() => {
        window.dispatchEvent(new CustomEvent('select-file', { 
            detail: { path: note.path }
        }));
    }, 100);
};

const addToGenerator = (note: Note) => {
    window.dispatchEvent(new CustomEvent('view-change', { detail: 'generator' }));
    setTimeout(() => {
        window.dispatchEvent(new CustomEvent('select-file', { 
            detail: { path: note.path }
        }));
    }, 100);
};
</script> 