<template>
    <div class="dreamglows-notes-list">
        <div v-if="notes.length === 0" class="dreamglows-no-content">
            <p>Aucune note ne correspond aux critères de recherche</p>
            <small>Essayez de modifier vos filtres</small>
        </div>
        <div v-else v-for="note in notes" 
            :key="note.path" 
            class="dreamglows-note-item"
            :class="{ 'expanded': expandedNotes.includes(note.path) }"
            @click="toggleNote(note.path, $event)">
            <div class="dreamglows-note-header">
                <h3 class="dreamglows-note-title" @click.stop="openFile(note.path, $event)" style="cursor: pointer;">
                    {{ note.title }}
                </h3>
                <div class="dreamglows-header-right">
                    <div class="dreamglows-progress-bar-container">
                        <div 
                            class="dreamglows-progress-bar" 
                            :style="{ width: getProgressPercentage(note.tasks) + '%' }"
                        ></div>
                        <span class="dreamglows-progress-text">{{ getProgressPercentage(note.tasks) }}%</span>
                    </div>
                    <div class="dreamglows-note-status">
                        <select :value="note.status" @change="updateStatus(note, $event)">
                            <option value="todo">À faire</option>
                            <option value="in-progress">En cours</option>
                            <option value="done">Terminé</option>
                        </select>
                    </div>
                </div>
            </div>
            <div class="dreamglows-note-meta">
                <span>Créé le: {{ formatDate(note.created) }}</span>
                <span>Dernière modification: {{ formatDate(note.lastUpdated) }}</span>
                <span>Mots: {{ note.wordCount }}</span>
            </div>
            <div v-if="expandedNotes.includes(note.path)" class="dreamglows-note-content">
                <div class="dreamglows-note-tasks">
                    <div class="dreamglows-tasks-header">
                        <h4>Tâches ({{ getProgressPercentage(note.tasks) }}%)</h4>
                    </div>
                    
                    <div class="dreamglows-tasks-list">
                        <div v-for="task in note.tasks" 
                             :key="task.id" 
                             class="dreamglows-task-item">
                            <div class="dreamglows-task-controls">
                                <input type="checkbox" 
                                       :checked="task.done"
                                       @change="toggleTask(note, task)">
                                <button @click="deleteTask(note, task)" 
                                        class="dreamglows-delete-task">×</button>
                            </div>
                            <span class="dreamglows-task-label">{{ task.label }}</span>
                        </div>
                    </div>

                    <div class="dreamglows-new-task">
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
    try {
        if (!date) return 'Date inconnue';
        const parsedDate = new Date(date);
        if (isNaN(parsedDate.getTime())) return 'Date invalide';
        return format(parsedDate, 'dd MMM yyyy', { locale: fr });
    } catch (error) {
        console.warn('Erreur de formatage de date:', error);
        return 'Date invalide';
    }
};

const getProgressPercentage = (tasks: Task[]): number => {
    if (!tasks || tasks.length === 0) return 0;
    const completedTasks = tasks.filter(task => task.done).length;
    return Math.round((completedTasks / tasks.length) * 100);
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