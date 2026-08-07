<template>
    <div class="dreamglows-planning-view">
        <div class="dreamglows-toolbar">
            <div class="dreamglows-toolbar-left">
                <NotesGenerator :notesGenerator="getDreamGlowsPlugin(props.app)?.notesGenerator" />
            </div>
            <div class="dreamglows-toolbar-right">
                <button 
                    class="dreamglows-button"
                    :class="{ active: viewType === 'list' }"
                    @click="viewType = 'list'"
                >
                    📋 Liste
                </button>
                <button 
                    class="dreamglows-button"
                    :class="{ active: viewType === 'week' }"
                    @click="viewType = 'week'"
                >
                    📅 Semaine
                </button>
            </div>
        </div>
        <div class="dreamglows-planning-controls">
            <button @click="previousWeek">◀</button>
            <span>{{ weekLabel }}</span>
            <button @click="nextWeek">▶</button>
        </div>
        <div class="dreamglows-planning-filters">
            <div class="dreamglows-search-row">
                <input 
                    type="text" 
                    v-model="searchQuery" 
                    placeholder="Rechercher une note..."
                >
            </div>
            <div class="dreamglows-filters-row">
                <div class="dreamglows-filter-group">
                    <label>Statut</label>
                    <select v-model="statusFilter">
                        <option value="">Tous les statuts</option>
                        <option value="todo">À faire</option>
                        <option value="in-progress">En cours</option>
                        <option value="done">Terminé</option>
                    </select>
                </div>
                <div class="dreamglows-filter-group">
                    <label>Trier par</label>
                    <div class="dreamglows-sort-controls">
                        <select v-model="sortBy">
                            <option value="title">Titre</option>
                            <option value="created">Date de création</option>
                            <option value="lastUpdated">Dernière modification</option>
                            <option value="wordCount">Nombre de mots</option>
                            <option value="progress">Progression</option>
                        </select>
                        <button 
                            class="dreamglows-sort-direction" 
                            @click.stop="sortDirection = sortDirection === 'asc' ? 'desc' : 'asc'"
                            :title="sortDirection === 'asc' ? 'Ordre croissant' : 'Ordre décroissant'"
                        >
                            {{ sortDirection === 'asc' ? '↑' : '↓' }}
                        </button>
                    </div>
                </div>
                <div class="dreamglows-filter-group">
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
                <div class="dreamglows-filter-group">
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
            :app="app"
            @toggle-note="toggleNote"
            @toggle-task="toggleTask"
            @delete-task="deleteTask"
            @add-task="addNewTask"
            @update-status="updateStatus"
            @open-file="openFile"
        />
        <WeekViewNotes 
            v-else-if="viewType === 'week' && currentWeek"
            :week-data="weekViewData"
            :expanded-notes="expandedNotes"
            :app="app"
            @toggle-note="toggleNote"
            @toggle-task="toggleTask"
            @delete-task="deleteTask"
            @add-task="addNewTask"
            @update-status="updateStatus"
            @open-file="openFile"
            ref="weekViewRef"
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
import NotesGenerator from '../components/notes/NotesGenerator.vue';
import { DateTime } from 'luxon';
import type { WeekNotes } from '../services/TimeManagementService';
import type { Note, Task, TaskPriority, TaskStatus } from '../types';
import { registerStyles, unregisterStyles } from '../styles/RegisterStyles';

type DreamGlowsFrontmatter = Record<string, any>;

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
const currentWeek = ref<WeekViewData | null>(null);
const weekViewData = ref<WeekNotes | null>(null);
const weekViewRef = ref<InstanceType<typeof WeekViewNotes> | null>(null);
const getDreamGlowsPlugin = (app: any) => app?.plugins?.plugins?.dreamglows;

const getDreamGlowsFrontmatter = (frontmatter: DreamGlowsFrontmatter): Record<string, any> => {
    return frontmatter.dreamglows ?? {};
};

const setDreamGlowsFrontmatter = (frontmatter: DreamGlowsFrontmatter, value: Record<string, any>): Record<string, any> => {
    frontmatter.dreamglows = value;
    return frontmatter;
};

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
        const allTasksCompleted = note.tasks.every((t: Task) => t.done);
        const noTasksCompleted = note.tasks.every((t: Task) => !t.done);

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
        
        const goalGlowsData = getDreamGlowsFrontmatter(frontmatter as DreamGlowsFrontmatter);
        const updatedGoalData = { ...goalGlowsData, tasks: goalGlowsData.tasks || note.tasks, status: newStatus };
        const normalizedFrontmatter = setDreamGlowsFrontmatter(frontmatter as DreamGlowsFrontmatter, updatedGoalData);

        await props.app.fileManager.processFrontMatter(file, (fm: any) => {
            setDreamGlowsFrontmatter(fm, normalizedFrontmatter);
        });

        note.status = newStatus;
    } catch (error) {
        console.error(`Erreur lors de la mise à jour du statut dans ${note.path}:`, error);
    }
};

const toggleNote = (path: string, event?: Event) => {
    if (expandedNotes.value.includes(path)) {
        expandedNotes.value = expandedNotes.value.filter(p => p !== path);
    } else {
        expandedNotes.value.push(path);
    }
};

const toggleTask = async (note: Note, task: { id: string; done: boolean } | Task) => {
    const fullTask = 'label' in task ? task : note.tasks.find(t => t.id === task.id);
    if (!fullTask) return;

    const updatedTask = { ...fullTask, done: !task.done };
    try {
    const file = props.app.vault.getAbstractFileByPath(note.path);
    const cache = props.app.metadataCache.getFileCache(file);
    let frontmatter = cache?.frontmatter || {};
    
    const goalData = getDreamGlowsFrontmatter(frontmatter as DreamGlowsFrontmatter);
    const updatedGoalData = {
        ...goalData,
        status: goalData.status || note.status,
        tasks: Array.isArray(goalData.tasks)
            ? [...goalData.tasks]
            : [updatedTask]
    };
    const taskIndex = updatedGoalData.tasks.findIndex((t: Task) => t.id === task.id);
    if (taskIndex >= 0) {
        updatedGoalData.tasks[taskIndex] = updatedTask;
    }

    await props.app.fileManager.processFrontMatter(file, (fm: any) => {
        setDreamGlowsFrontmatter(fm, updatedGoalData);
    });

        // Mettre à jour la tâche dans la note
        const noteTaskIndex = note.tasks.findIndex(t => t.id === task.id);
        if (noteTaskIndex >= 0) {
            note.tasks[noteTaskIndex] = updatedTask;
        }
    } catch (error) {
        console.error(`Erreur lors de la mise à jour de la tâche dans ${note.path}:`, error);
    }
};

const updateStatus = async (note: Note, newStatus: 'todo' | 'in-progress' | 'done') => {
    try {
        const file = props.app.vault.getAbstractFileByPath(note.path);
        const cache = props.app.metadataCache.getFileCache(file);
        let frontmatter = cache?.frontmatter || {};
        
        const goalData = getDreamGlowsFrontmatter(frontmatter as DreamGlowsFrontmatter);
        const updatedGoalData = {
            ...goalData,
            tasks: goalData.tasks || note.tasks,
            status: newStatus
        };

        await props.app.fileManager.processFrontMatter(file, (fm: any) => {
            setDreamGlowsFrontmatter(fm, updatedGoalData);
        });

        note.status = newStatus;
    } catch (error) {
        console.error(`Erreur lors de la mise à jour du statut dans ${note.path}:`, error);
    }
};

const loadNotes = async () => {
    const files = props.contentFiles;
    const loadedNotes: Note[] = [];

    console.log('Chargement des notes - fichiers disponibles:', files.length);

    for (const file of files) {
        try {
            // Vérifier si le fichier existe toujours
            if (!props.app.vault.getAbstractFileByPath(file.path)) {
                console.warn(`Le fichier ${file.path} n'existe plus`);
                continue;
            }

            const cache = props.app.metadataCache.getFileCache(file);
            const frontmatter = cache?.frontmatter || {};
            const dreamglows = getDreamGlowsFrontmatter(frontmatter as DreamGlowsFrontmatter);
            const content = await props.app.vault.read(file);

            console.log(`Chargement du fichier ${file.path}:`, { 
                frontmatter, 
                dreamglows,
                contentLength: content.length 
            });

            let tasks: Task[] = [];
            if (dreamglows.tasks && Array.isArray(dreamglows.tasks)) {
                tasks = dreamglows.tasks;
            } else {
                // Utiliser les tâches par défaut du store
                tasks = defaultTasks.value.map(defaultTask => ({
                    id: Math.random().toString(36).substr(2, 9),
                    title: defaultTask.label,
                    label: defaultTask.label,
                    description: '',
                    priority: 'medium' as TaskPriority,
                    status: 'todo' as TaskStatus,
                    done: false,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    linkToOptimizer: defaultTask.linkToOptimizer,
                    linkToGenerator: defaultTask.linkToGenerator
                }));
                
                console.log(`Ajout des tâches par défaut pour ${file.path}:`, tasks);
                
                // Sauvegarder les tâches par défaut dans le frontmatter
                await props.app.fileManager.processFrontMatter(file, (fm: any) => {
                    setDreamGlowsFrontmatter(fm, {
                        tasks: tasks,
                        status: 'todo'
                    });
                });
            }

            loadedNotes.push({
                path: file.path,
                title: file.basename,
                status: dreamglows.status || 'todo',
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

    console.log('Notes chargées:', loadedNotes);
    notes.value = loadedNotes;
};

const openFile = (path: string, event?: Event) => {
    const file = props.app.vault.getAbstractFileByPath(path);
    if (file) {
        props.app.workspace.getLeaf('tab').openFile(file);
    }
};

const addNewTask = async (note: Note, label: string) => {
    if (!label.trim()) return;

    const newTask: Task = {
        id: Math.random().toString(36).substr(2, 9),
        title: label,
        label: label,
        description: '',
        priority: 'medium',
        status: 'todo',
        done: false,
        tags: [],
        createdAt: DateTime.now().toISO(),
        updatedAt: DateTime.now().toISO(),
        linkToOptimizer: false,
        linkToGenerator: false
    };

    try {
        const file = props.app.vault.getAbstractFileByPath(note.path);
        const cache = props.app.metadataCache.getFileCache(file);
        let frontmatter = cache?.frontmatter || {};

        const goalData = getDreamGlowsFrontmatter(frontmatter as DreamGlowsFrontmatter);
        const updatedGoalData = {
            ...goalData,
            status: goalData.status || note.status,
            tasks: Array.isArray(goalData.tasks) ? [...goalData.tasks, newTask] : [newTask]
        };

        await props.app.fileManager.processFrontMatter(file, (fm: any) => {
            setDreamGlowsFrontmatter(fm, updatedGoalData);
        });

        note.tasks = updatedGoalData.tasks;
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
        const goalData = getDreamGlowsFrontmatter(frontmatter as DreamGlowsFrontmatter);
        const updatedTasks = Array.isArray(goalData.tasks)
            ? goalData.tasks.filter((t: Task) => t.id !== task.id)
            : [];
        const updatedGoalData = {
            ...goalData,
            tasks: updatedTasks
        };

        if (Array.isArray(updatedTasks)) {
            note.tasks = updatedTasks;
            
            await props.app.fileManager.processFrontMatter(file, (fm: any) => {
                setDreamGlowsFrontmatter(fm, updatedGoalData);
            });
        }
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
        console.log('Chargement de la semaine courante:', currentDate.value.toISO());
        const weekData = await getDreamGlowsPlugin(props.app)?.timeManager?.getWeekNotes(currentDate.value);
        console.log('Données de la semaine reçues:', weekData);

        // Transformer les TFile en Notes
        const weekNotes = await Promise.all(weekData.notes.map(async (file: TFile) => {
            const cache = props.app.metadataCache.getFileCache(file);
            const frontmatter = cache?.frontmatter || {};
            const dreamglows = getDreamGlowsFrontmatter(frontmatter as DreamGlowsFrontmatter);
            const content = await props.app.vault.read(file);

            let tasks: Task[] = [];
            if (dreamglows.tasks && Array.isArray(dreamglows.tasks)) {
                tasks = dreamglows.tasks;
            } else {
                tasks = defaultTasks.value.map(defaultTask => ({
                    id: Math.random().toString(36).substr(2, 9),
                    title: defaultTask.label,
                    label: defaultTask.label,
                    description: '',
                    priority: 'medium' as TaskPriority,
                    status: 'todo' as TaskStatus,
                    done: false,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    linkToOptimizer: defaultTask.linkToOptimizer,
                    linkToGenerator: defaultTask.linkToGenerator
                }));
            }

            return {
                path: file.path,
                title: file.basename,
                status: dreamglows.status || 'todo',
                created: file.stat.ctime ? new Date(file.stat.ctime).toISOString() : new Date().toISOString(),
                lastUpdated: file.stat.mtime ? new Date(file.stat.mtime).toISOString() : new Date().toISOString(),
                wordCount: content.split(/\s+/).length,
                tasks
            };
        }));

        // Créer un objet WeekNotes pour la vue semaine
        weekViewData.value = {
            weekNumber: weekData.weekNumber,
            startDate: weekData.startDate,
            endDate: weekData.endDate,
            notes: weekData.notes // On garde les TFile pour la vue semaine
        };

        // Stocker les notes transformées pour la vue liste
        currentWeek.value = {
            startDate: weekData.startDate.toISO(),
            endDate: weekData.endDate.toISO(),
            notes: weekNotes,
            weekNumber: weekData.weekNumber
        };

        console.log('Semaine chargée avec notes transformées:', currentWeek.value);
    } catch (error) {
        console.error('Erreur lors du chargement de la semaine:', error);
        currentWeek.value = null;
        weekViewData.value = null;
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
watch(() => getDreamGlowsPlugin(props.app)?.timeManager, async (newVal) => {
    console.log('TimeManager disponible:', !!newVal);
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

const weekLabel = computed(() => {
    if (!currentWeek.value) return '';
    const startDate = DateTime.fromISO(currentWeek.value.startDate);
    const endDate = DateTime.fromISO(currentWeek.value.endDate);
    return `${startDate.toFormat('dd/MM')} - ${endDate.toFormat('dd/MM')}`;
});

const weekNotes = computed(() => {
    console.log('Calcul des weekNotes:', currentWeek.value?.notes || []);
    return currentWeek.value?.notes || [];
});

const generateNotes = async () => {
    try {
        await getDreamGlowsPlugin(props.app)?.generateNotes();
        await loadNotes(); // Recharger les notes après la génération
    } catch (error) {
        console.error('Erreur lors de la génération des notes:', error);
    }
};

onMounted(() => {
    registerStyles('list');
    loadNotes();
    loadCurrentWeek();
});

onUnmounted(() => {
    unregisterStyles();
});

interface WeekViewData {
    startDate: string;
    endDate: string;
    notes: Note[];
    weekNumber: number;
}
</script>

<style>
.dreamglows-toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    background: var(--background-secondary);
    border-bottom: 1px solid var(--background-modifier-border);
}

.dreamglows-toolbar-left,
.dreamglows-toolbar-right {
    display: flex;
    gap: 0.5rem;
}

.dreamglows-button {
    padding: 0.5rem 1rem;
    border: 1px solid var(--background-modifier-border);
    border-radius: 4px;
    background: var(--background-primary);
    color: var(--text-normal);
    cursor: pointer;
    transition: all 0.2s ease;
}

.dreamglows-button:hover {
    background: var(--background-primary-alt);
    border-color: var(--text-accent);
}

.dreamglows-button.active {
    background: var(--text-accent);
    color: var(--text-on-accent);
    border-color: var(--text-accent);
}
</style>
