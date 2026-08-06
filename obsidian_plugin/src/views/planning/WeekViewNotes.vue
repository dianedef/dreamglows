<template>
    <div class="goalflowz-notes-week" :class="{ 'compact-view': isCompactView }">
        <div class="week-content">
            <div v-for="day in displayedDays" 
                 :key="day.date" 
                 class="day-content"
                 :class="{ 'is-today': day.isToday }">
                <div v-if="getDayNotes(day.date, day.isWeekend).length > 0" class="day-notes">
                    <div v-for="note in getDayNotes(day.date, day.isWeekend)" 
                         :key="note.path" 
                         class="goalflowz-week-note-item"
                         @click="$emit('toggle-note', note.path)">
                        <div class="goalflowz-week-note-header">
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
    currentDate: DateTime;
}

const props = defineProps<Props>();

const emit = defineEmits<WeekViewEmits>();

const isCompactView = ref(false);

const displayedDays = computed<Day[]>(() => {
    if (!props.weekData) return [];
    
    const days: Day[] = [];
    let currentDate = props.currentDate.startOf('week');
    
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
                created: new Date(file.stat.ctime).toISOString(),
                lastUpdated: new Date(file.stat.mtime).toISOString(),
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
        const noteDate = DateTime.fromISO(note.created);
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
