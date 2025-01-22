<template>
    <div class="goalflowz-planning-view">
        <div class="goalflowz-planning-filters">
            <div class="goalflowz-search-row">
                <input 
                    type="text" 
                    v-model="searchQuery" 
                    placeholder="Rechercher une note..."
                >
            </div>
            <div class="goalflowz-filters-row">
                <div class="goalflowz-filter-group">
                    <label>Statut</label>
                    <select v-model="statusFilter">
                        <option value="">Tous les statuts</option>
                        <option value="todo">À faire</option>
                        <option value="in-progress">En cours</option>
                        <option value="done">Terminé</option>
                    </select>
                </div>
                <div class="goalflowz-filter-group">
                    <label>Trier par</label>
                    <div class="goalflowz-sort-controls">
                        <select v-model="sortBy">
                            <option value="title">Titre</option>
                            <option value="created">Date de création</option>
                            <option value="lastUpdated">Dernière modification</option>
                            <option value="wordCount">Nombre de mots</option>
                            <option value="progress">Progression</option>
                        </select>
                        <button 
                            class="goalflowz-sort-direction" 
                            @click.stop="sortDirection = sortDirection === 'asc' ? 'desc' : 'asc'"
                            :title="sortDirection === 'asc' ? 'Ordre croissant' : 'Ordre décroissant'"
                        >
                            {{ sortDirection === 'asc' ? '↑' : '↓' }}
                        </button>
                    </div>
                </div>
                <div class="goalflowz-filter-group">
                    <label>Dossier</label>
                    <select v-model="folderFilter">
                        <option value="">Tous les dossiers</option>
                        <option v-for="folder in availableFolders" 
                            :key="folder" 
                            :value="folder"
                        >
                            {{ formatFolderPath(folder) }}
                        </option>
                    </select>
                </div>
                <div class="goalflowz-filter-group">
                    <label>Vue</label>
                    <select v-model="viewType">
                        <option value="list">Liste</option>
                        <option value="week">Semaine</option>
                    </select>
                </div>
            </div>
        </div>

        <div class="week-navigation" v-if="currentWeek">
            <button @click="previousWeek">←</button>
            <span>Semaine {{ currentWeek.weekNumber }}</span>
            <button @click="nextWeek">→</button>
            <button 
                class="view-toggle"
                @click="toggleWeekView"
                :title="weekViewRef?.isCompactView ? 'Vue détaillée' : 'Vue compacte'"
            >
                {{ weekViewRef?.isCompactView ? '7j' : '3j' }}
            </button>
        </div>

        <ListViewNotes 
            v-if="viewType === 'list'"
            :notes="filteredNotes"
            :expanded-notes="expandedNotes"
            @toggle-note="toggleNote"
            @toggle-task="toggleTask"
            @delete-task="deleteTask"
            @add-task="addNewTask"
        />
        <WeekViewNotes 
            v-else-if="viewType === 'week' && currentWeek"
            ref="weekViewRef"
            :week-data="currentWeek"
            :expanded-notes="expandedNotes"
            :app="app"
            @toggle-note="toggleNote"
            @toggle-task="toggleTask"
            @delete-task="deleteTask"
            @add-task="addNewTask"
        />
        <div v-else class="loading">
            Chargement...
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, onUnmounted } from 'vue';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { TFile } from 'obsidian';
import { useSettingsStore } from '../stores/settingsStore';
import ListViewNotes from './planning/ListViewNotes.vue';
import WeekViewNotes from './planning/WeekViewNotes.vue';
import { DateTime } from 'luxon';
import type { WeekNotes } from '../services/TimeManagementService';
import type { Note } from '../../types';

const props = defineProps<{
    contentFiles: TFile[],
    app: any
}>();

const searchQuery = ref('');
const statusFilter = ref('');
const notes = ref<Note[]>([]);
const expandedNotes = ref<string[]>([]);
const settingsStore = useSettingsStore();
const sortBy = ref('title');
const folderFilter = ref('');
const sortDirection = ref<'asc' | 'desc'>('asc');
const newTaskLabels = ref<{ [key: string]: string }>({});
const viewType = ref('list');
const currentDate = ref(DateTime.now());
const currentWeek = ref<WeekNotes | null>(null);
const weekViewRef = ref<InstanceType<typeof WeekViewNotes> | null>(null);

// Ajout du computed pour les tâches par défaut
const defaultTasks = computed(() => settingsStore.getDefaultTasks);

// Computed properties
const filteredNotes = computed(() => {
    let filtered = notes.value.filter(note => {
        const matchesSearch = note.title.toLowerCase().includes(searchQuery.value.toLowerCase());
        const matchesStatus = !statusFilter.value || note.status === statusFilter.value;
        const matchesFolder = !folderFilter.value || note.path.startsWith(folderFilter.value + '/');
        return matchesSearch && matchesStatus && matchesFolder;
    });

    // Tri des articles
    return filtered.sort((a, b) => {
        let comparison = 0;
        switch (sortBy.value) {
            case 'title':
                comparison = a.title.localeCompare(b.title);
                break;
            case 'created':
                comparison = new Date(a.created).getTime() - new Date(b.created).getTime();
                break;
            case 'lastUpdated':
                comparison = new Date(a.lastUpdated).getTime() - new Date(b.lastUpdated).getTime();
                break;
            case 'wordCount':
                comparison = a.wordCount - b.wordCount;
                break;
            case 'progress':
                const progressA = getProgressPercentage.value(a.tasks);
                const progressB = getProgressPercentage.value(b.tasks);
                comparison = progressA - progressB;
                break;
        }
        return sortDirection.value === 'asc' ? comparison : -comparison;
    });
});

const getProgressPercentage = computed(() => (tasks: Task[]): number => {
    if (!tasks || tasks.length === 0) return 0;
    const completedTasks = tasks.filter(task => task.done).length;
    return Math.round((completedTasks / tasks.length) * 100);
});

const statusLabels = computed(() => ({
    todo: 'À faire',
    'in-progress': 'En cours',
    done: 'Terminé'
}));

const getStatusLabel = computed(() => (status: string): string => {
    return statusLabels.value[status as keyof typeof statusLabels.value] || status;
});

const formatDate = computed(() => (date: string): string => {
    return format(new Date(date), 'dd MMM yyyy', { locale: fr });
});

const availableFolders = computed(() => {
    const folders = new Set<string>();
    notes.value.forEach(note => {
        const path = note.path.split('/');
        path.pop(); // Retire le nom du fichier
        folders.add(path.join('/'));
    });
    return Array.from(folders).sort();
});

const formatFolderPath = (path: string) => {
    return path.split('/').pop() || path;
};

// Watchers
watch([notes], async () => {
    // Mettre à jour automatiquement le statut des notes en fonction des tâches
    for (const note of notes.value) {
        const allTasksCompleted = note.tasks.every(t => t.done);
        const noTasksCompleted = note.tasks.every(t => !t.done);

        if (allTasksCompleted && note.status !== 'done') {
            await updateNoteStatus(note, 'done');
        } else if (noTasksCompleted && note.status !== 'todo') {
            await updateNoteStatus(note, 'todo');
        } else if (!allTasksCompleted && !noTasksCompleted && note.status !== 'in-progress') {
            await updateNoteStatus(note, 'in-progress');
        }
    }
}, { deep: true });

// Methods
const updateNoteStatus = async (note: Note, newStatus: 'todo' | 'in-progress' | 'done') => {
    try {
        const file = props.app.vault.getAbstractFileByPath(note.path);
        const cache = props.app.metadataCache.getFileCache(file);
        let frontmatter = cache?.frontmatter || {};
        
        if (!frontmatter.goalflowz) {
            frontmatter.goalflowz = {
                tasks: note.tasks,
                status: newStatus
            };
        } else {
            frontmatter.goalflowz.status = newStatus;
        }

        await props.app.fileManager.processFrontMatter(file, (fm) => {
            fm.goalflowz = frontmatter.goalflowz;
        });

        note.status = newStatus;
    } catch (error) {
        console.error(`Erreur lors de la mise à jour du statut dans ${note.path}:`, error);
    }
};

const toggleNote = (path: string, event: Event) => {
    const index = expandedNotes.value.indexOf(path);
    if (index === -1) {
        expandedNotes.value.push(path);
    } else {
        expandedNotes.value.splice(index, 1);
    }
};

const toggleTask = async (note: Note, task: Task) => {
    const oldDone = task.done;
    task.done = !task.done;
    
    try {
        const file = props.app.vault.getAbstractFileByPath(note.path);
        const cache = props.app.metadataCache.getFileCache(file);
        let frontmatter = cache?.frontmatter || {};
        
        if (!frontmatter.goalflowz) {
            frontmatter.goalflowz = {
                tasks: note.tasks,
                status: note.status
            };
        } else {
            const taskIndex = frontmatter.goalflowz.tasks?.findIndex((t: Task) => t.id === task.id);
            if (taskIndex >= 0) {
                frontmatter.goalflowz.tasks[taskIndex].done = task.done;
            } else {
                frontmatter.goalflowz.tasks = frontmatter.goalflowz.tasks || [];
                frontmatter.goalflowz.tasks.push(task);
            }
        }

        await props.app.fileManager.processFrontMatter(file, (fm) => {
            fm.goalflowz = frontmatter.goalflowz;
        });
    } catch (error) {
        console.error(`Erreur lors de la mise à jour des métadonnées dans ${note.path}:`, error);
        task.done = oldDone;
    }
};

const updateStatus = async (note: Note, event: Event) => {
    const newStatus = (event.target as HTMLSelectElement).value as 'todo' | 'in-progress' | 'done';
    await updateNoteStatus(note, newStatus);
};

const loadNotes = async () => {
    const files = props.contentFiles;
    const loadedNotes: Note[] = [];

    for (const file of files) {
        try {
            // Vérifier si le fichier existe toujours
            if (!props.app.vault.getAbstractFileByPath(file.path)) {
                continue;
            }

            const cache = props.app.metadataCache.getFileCache(file);
            const frontmatter = cache?.frontmatter || {};
            const goalflowz = frontmatter.goalflowz || {};
            const content = await props.app.vault.read(file);

            let tasks: Task[] = [];
            if (goalflowz.tasks && Array.isArray(goalflowz.tasks)) {
                tasks = goalflowz.tasks;
            } else {
                // Utiliser les tâches par défaut du store
                tasks = defaultTasks.value.map(defaultTask => ({
                    id: Math.random().toString(36).substr(2, 9),
                    label: defaultTask.label,
                    done: false,
                    linkToOptimizer: defaultTask.linkToOptimizer,
                    linkToGenerator: defaultTask.linkToGenerator
                }));
                
                // Sauvegarder les tâches par défaut dans le frontmatter
                await props.app.fileManager.processFrontMatter(file, (fm) => {
                    fm.goalflowz = {
                        tasks: tasks,
                        status: 'todo'
                    };
                });
            }

            loadedNotes.push({
                path: file.path,
                title: file.basename,
                status: goalflowz.status || 'todo',
                created: file.stat.ctime ? new Date(file.stat.ctime).toISOString() : new Date().toISOString(),
                lastUpdated: file.stat.mtime ? new Date(file.stat.mtime).toISOString() : new Date().toISOString(),
                wordCount: content.split(/\s+/).length,
                tasks
            });
        } catch (error) {
            if (!(error instanceof Error) || !error.message.includes('ENOENT')) {
                console.error(`Erreur lors du chargement de ${file.path}:`, error);
            }
        }
    }

    notes.value = loadedNotes;
};

async function openFile(path: string) {
    const file = props.app.vault.getAbstractFileByPath(path);
    if (file) {
        await props.app.workspace.getLeaf('tab').openFile(file);
    }
}

const addNewTask = async (note: Note, label: string) => {
    if (!label.trim()) return;

    const newTask: Task = {
        id: Math.random().toString(36).substr(2, 9),
        label: label,
        done: false,
        linkToOptimizer: false,
        linkToGenerator: false
    };

    try {
        const file = props.app.vault.getAbstractFileByPath(note.path);
        const cache = props.app.metadataCache.getFileCache(file);
        let frontmatter = cache?.frontmatter || {};
        
        // S'assurer que la structure est correcte
        if (!frontmatter.goalflowz) {
            frontmatter.goalflowz = {
                tasks: [newTask],
                status: note.status
            };
        } else {
            frontmatter.goalflowz.tasks = Array.isArray(frontmatter.goalflowz.tasks) 
                ? [...frontmatter.goalflowz.tasks, newTask]
                : [newTask];
        }

        // Mettre à jour le frontmatter
        await props.app.fileManager.processFrontMatter(file, (fm) => {
            fm.goalflowz = frontmatter.goalflowz;
        });

        // Mettre à jour l'article localement
        note.tasks = frontmatter.goalflowz.tasks;
        
        // Réinitialiser le champ de saisie
        newTaskLabels.value[note.path] = '';
    } catch (error) {
        console.error(`Erreur lors de l'ajout de la tâche dans ${note.path}:`, error);
    }
};

const deleteTask = async (note: Note, task: Task) => {
    try {
        const file = props.app.vault.getAbstractFileByPath(note.path);
        const cache = props.app.metadataCache.getFileCache(file);
        let frontmatter = cache?.frontmatter || {};
        
        if (!frontmatter.goalflowz) {
            return;
        }

        // Filtrer la tâche à supprimer
        frontmatter.goalflowz.tasks = frontmatter.goalflowz.tasks.filter((t: Task) => t.id !== task.id);
        
        // Mettre à jour le frontmatter
        await props.app.fileManager.processFrontMatter(file, (fm) => {
            fm.goalflowz = frontmatter.goalflowz;
        });

        // Mettre à jour l'article localement
        note.tasks = note.tasks.filter(t => t.id !== task.id);
    } catch (error) {
        console.error(`Erreur lors de la suppression de la tâche dans ${note.path}:`, error);
    }
};

const openOptimizer = (note: Note) => {
    // Émettre un événement pour changer la vue
    window.dispatchEvent(new CustomEvent('view-change', { detail: 'seo' }));
    
    // Attendre un peu que la vue soit chargée
    setTimeout(() => {
        // Sélectionner le fichier dans la vue SEO
        const selectEvent = new CustomEvent('select-file', { 
            detail: { path: note.path }
        });
        window.dispatchEvent(selectEvent);
    }, 100);
};

const addToGenerator = (note: Note) => {
    // TODO: Implémenter l'ajout au générateur
    console.log('Ajouter au générateur:', note.title);
};

const loadCurrentWeek = async () => {
    try {
        currentWeek.value = await props.app.plugins.plugins.goalflowz.timeManager.getWeekNotes(currentDate.value);
    } catch (error) {
        console.error('Erreur lors du chargement de la semaine:', error);
        currentWeek.value = null;
    }
};

const previousWeek = async () => {
    currentDate.value = currentDate.value.minus({ weeks: 1 });
    await loadCurrentWeek();
};

const nextWeek = async () => {
    currentDate.value = currentDate.value.plus({ weeks: 1 });
    await loadCurrentWeek();
};

// S'assurer que le timeManager est disponible
watch(() => props.app.plugins.plugins.goalflowz?.timeManager, async (newVal) => {
    if (newVal && viewType.value === 'week') {
        await loadCurrentWeek();
    }
}, { immediate: true });

// Charger la semaine quand on change de vue
watch(viewType, async (newType) => {
    if (newType === 'week') {
        await loadCurrentWeek();
    }
});

const toggleWeekView = () => {
    if (weekViewRef.value) {
        weekViewRef.value.isCompactView = !weekViewRef.value.isCompactView;
    }
};

onMounted(() => {
    loadNotes();
    loadCurrentWeek();
});

onUnmounted(() => {
    // styleEl.remove();
});
</script>

