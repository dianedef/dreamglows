<template>
    <div class="goalflowz-notes-week" :class="{ 'compact-view': isCompactView }">
        <div class="week-header">
            <div v-for="day in displayedDays" :key="day.date" class="day-header">
                {{ formatDay(day.date) }}
                <span v-if="isCompactView && day.isWeekend" class="weekend-label">
                    & {{ formatDay(day.date.plus({ days: 1 })) }}
                </span>
            </div>
        </div>
        <div class="week-content">
            <div v-for="day in displayedDays" :key="day.date" class="day-content">
                <div v-if="getDayNotes(day.date, day.isWeekend).length > 0" class="day-notes">
                    <div v-for="note in getDayNotes(day.date, day.isWeekend)" 
                         :key="note.path" 
                         class="note-card"
                         @click="$emit('toggle-note', note.path)">
                        <div class="note-title">{{ note.title }}</div>
                        <div v-if="isExpanded(note.path)" class="note-details">
                            <div class="note-tasks">
                                <div v-for="task in note.tasks" 
                                     :key="task.id" 
                                     class="task-item">
                                    <input type="checkbox" 
                                           :checked="task.done"
                                           @change="$emit('toggle-task', note, task)">
                                    <span>{{ task.label }}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div v-else class="no-notes">
                    Pas de notes
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { DateTime } from 'luxon';
import type { WeekNotes } from '../../services/TimeManagementService';
import type { Note } from '../../types';
import type { Day, WeekViewProps, WeekViewEmits } from '../../types/weekView';
import type { TFile } from 'obsidian';

interface Props {
    weekData: WeekNotes | null;
    expandedNotes: string[];
    app: any;
}

const props = defineProps<Props>();

const emit = defineEmits<WeekViewEmits>();

const isCompactView = ref(false);

const displayedDays = computed<Day[]>(() => {
    if (!props.weekData) return [];
    
    const days: Day[] = [];
    let currentDate = props.weekData.startDate;
    
    if (isCompactView.value) {
        // Vue compacte : Lun-Mar-Mer / Jeu-Ven / Week-end
        while (currentDate <= props.weekData.endDate) {
            if (currentDate.weekday <= 3) {
                // Lundi à Mercredi
                days.push({
                    date: currentDate,
                    isToday: currentDate.hasSame(DateTime.now(), 'day'),
                    isWeekend: false
                });
            } else if (currentDate.weekday <= 5) {
                // Jeudi et Vendredi
                days.push({
                    date: currentDate,
                    isToday: currentDate.hasSame(DateTime.now(), 'day'),
                    isWeekend: false
                });
            } else if (currentDate.weekday === 6) {
                // Samedi (représente le week-end)
                days.push({
                    date: currentDate,
                    isToday: currentDate.hasSame(DateTime.now(), 'day') || 
                            currentDate.plus({ days: 1 }).hasSame(DateTime.now(), 'day'),
                    isWeekend: true
                });
            }
            currentDate = currentDate.plus({ days: 1 });
        }
    } else {
        // Vue normale : 7 jours
        while (currentDate <= props.weekData.endDate) {
            days.push({
                date: currentDate,
                isToday: currentDate.hasSame(DateTime.now(), 'day'),
                isWeekend: false
            });
            currentDate = currentDate.plus({ days: 1 });
        }
    }
    
    return days;
});

const formatDay = (date: DateTime) => {
    return date.setLocale('fr').toFormat('cccc d');
};

const getDayNotes = (date: DateTime, isWeekend = false) => {
    if (!props.weekData) return [];
    
    return props.weekData.notes.map((file: TFile) => {
        try {
            const cache = props.app.metadataCache.getFileCache(file);
            const frontmatter = cache?.frontmatter || {};
            const goalflowz = frontmatter.goalflowz || {};
            
            return {
                path: file.path,
                title: file.basename,
                status: goalflowz.status || 'todo',
                created: file.stat.ctime,
                lastUpdated: file.stat.mtime,
                wordCount: 0,
                tasks: goalflowz.tasks || []
            } as Note;
        } catch (error) {
            console.error('Erreur lors de la conversion du fichier en note:', error);
            return null;
        }
    })
    .filter((note): note is Note => {
        if (!note) return false;
        const noteDate = DateTime.fromMillis(note.created);
        if (isWeekend) {
            // Pour le week-end, inclure samedi et dimanche
            return noteDate.hasSame(date, 'day') || 
                   noteDate.hasSame(date.plus({ days: 1 }), 'day');
        }
        return noteDate.hasSame(date, 'day');
    });
};

const isExpanded = (path: string) => {
    return props.expandedNotes.includes(path);
};

defineExpose({ isCompactView });
</script>

<style>
.goalflowz-notes-week {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 1rem;
}

.week-header {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 0.5rem;
}

.day-header {
    padding: 0.5rem;
    text-align: center;
    font-weight: bold;
    background: var(--background-secondary);
    border-radius: 4px;
}

.week-content {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 0.5rem;
    min-height: 200px;
}

.day-content {
    padding: 0.5rem;
    background: var(--background-primary-alt);
    border-radius: 4px;
    min-height: 100%;
}

.note-card {
    margin-bottom: 0.5rem;
    padding: 0.5rem;
    background: var(--background-secondary);
    border-radius: 4px;
    cursor: pointer;
}

.note-card:hover {
    background: var(--background-modifier-hover);
}

.no-notes {
    text-align: center;
    color: var(--text-muted);
    padding: 1rem;
}

.note-tasks {
    margin-top: 0.5rem;
}

.task-item {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    padding: 0.25rem 0;
}

.day-header.is-today {
    background: var(--interactive-accent);
    color: var(--text-on-accent);
}

.day-content.is-today {
    border: 2px solid var(--interactive-accent);
}

.goalflowz-notes-week.compact-view .week-header,
.goalflowz-notes-week.compact-view .week-content {
    grid-template-columns: repeat(3, 1fr);
}

.weekend-label {
    display: block;
    font-size: 0.9em;
    opacity: 0.8;
}
</style> 