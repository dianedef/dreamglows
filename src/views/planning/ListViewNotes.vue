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
            @click="toggleNote(note.path, $event)">
            <div class="goalflowz-note-header">
                <h3 class="goalflowz-note-title" @click.stop="openFile(note.path, $event)" style="cursor: pointer;">
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
                    <div class="goalflowz-note-status">
                        <select :value="note.status" @change="updateStatus(note, $event)">
                            <option value="todo">À faire</option>
                            <option value="in-progress">En cours</option>
                            <option value="done">Terminé</option>
                        </select>
                    </div>
                </div>
            </div>
            <div class="goalflowz-note-meta">
                <span>Créé le: {{ formatDate(note.created) }}</span>
                <span>Dernière modification: {{ formatDate(note.lastUpdated) }}</span>
                <span>Mots: {{ note.wordCount }}</span>
            </div>
            <div v-if="expandedNotes.includes(note.path)" class="goalflowz-note-content">
                <div class="goalflowz-note-tasks">
                    <div class="goalflowz-tasks-header">
                        <h4>Tâches ({{ getProgressPercentage(note.tasks) }}%)</h4>
                    </div>
                    
                    <div class="goalflowz-tasks-list">
                        <div v-for="task in note.tasks" 
                             :key="task.id" 
                             class="goalflowz-task-item">
                            <div class="goalflowz-task-controls">
                                <input type="checkbox" 
                                       :checked="task.done"
                                       @change="toggleTask(note, task)">
                                <button @click="deleteTask(note, task)" 
                                        class="goalflowz-delete-task">×</button>
                            </div>
                            <span class="goalflowz-task-label">{{ task.label }}</span>
                        </div>
                    </div>

                    <div class="goalflowz-new-task">
                        <input type="text" 
                               v-model="newTaskLabels[note.path]" 
                               placeholder="Nouvelle tâche..."
                               @keyup.enter="addNewTask(note)">
                        <button @click="addNewTask(note)">+</button>
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
    (e: 'toggle-task', note: Note, task: Task): void;
    (e: 'delete-task', note: Note, task: Task): void;
    (e: 'add-task', note: Note, label: string): void;
    (e: 'update-status', note: Note, newStatus: 'todo' | 'in-progress' | 'done'): void;
    (e: 'open-file', path: string, event: Event): void;
    (e: 'toggle-note', path: string, event: Event): void;
}>();

const newTaskLabels = ref<Record<string, string>>({});

// Fonctions nécessaires
const formatDate = (date: string) => {
    return format(new Date(date), 'dd MMM yyyy', { locale: fr });
};

const getProgressPercentage = (tasks: Task[]) => {
    if (!tasks.length) return 0;
    const completed = tasks.filter(t => t.done).length;
    return Math.round((completed / tasks.length) * 100);
};

const openFile = (path: string, event: Event) => {
    emit('open-file', path, event);
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
    const status = (event.target as HTMLSelectElement).value as 'todo' | 'in-progress' | 'done';
    emit('update-status', note, status);
};

const toggleNote = (path: string, event: Event) => {
    emit('toggle-note', path, event);
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