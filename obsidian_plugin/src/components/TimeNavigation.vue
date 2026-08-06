<template>
    <div class="goalflowz-time-navigation">
        <div class="goalflowz-nav-controls">
            <button @click="navigate('previous')" class="goalflowz-nav-btn" ref="prevButton">
            </button>
            <h2>{{ currentPeriodLabel }}</h2>
            <button @click="navigate('next')" class="goalflowz-nav-btn" ref="nextButton">
            </button>
        </div>
        <button @click="goToToday" class="goalflowz-today-btn" v-if="!isCurrentPeriod">
            Aujourd'hui
        </button>
    </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue';
import { DateTime } from 'luxon';
import { setIcon } from 'obsidian';

const props = defineProps<{
    view: 'day' | 'planning'  // Le type de vue actif
}>();

const emit = defineEmits<{
    'update:date': [date: DateTime]  // Pour mettre à jour la date dans le composant parent
}>();

const prevButton = ref<HTMLElement | null>(null);
const nextButton = ref<HTMLElement | null>(null);

onMounted(() => {
    if (prevButton.value) setIcon(prevButton.value, 'chevron-left');
    if (nextButton.value) setIcon(nextButton.value, 'chevron-right');
});

// État local
const currentDate = ref(DateTime.now());

// Computed properties
const isCurrentPeriod = computed(() => {
    if (props.view === 'day') {
        return currentDate.value.hasSame(DateTime.now(), 'day');
    } else {
        // Pour la vue semaine
        const startOfWeek = currentDate.value.startOf('week');
        const endOfWeek = currentDate.value.endOf('week');
        const now = DateTime.now();
        return now >= startOfWeek && now <= endOfWeek;
    }
});

const currentPeriodLabel = computed(() => {
    if (props.view === 'day') {
        return currentDate.value.setLocale('fr').toLocaleString({
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    } else {
        const startOfWeek = currentDate.value.startOf('week');
        const endOfWeek = currentDate.value.endOf('week');
        return `Semaine du ${startOfWeek.setLocale('fr').toFormat('d MMMM')} au ${endOfWeek.setLocale('fr').toFormat('d MMMM yyyy')}`;
    }
});

// Méthodes
const navigate = (direction: 'previous' | 'next') => {
    const duration = props.view === 'day' ? { days: 1 } : { weeks: 1 };
    currentDate.value = direction === 'next' 
        ? currentDate.value.plus(duration)
        : currentDate.value.minus(duration);
    emit('update:date', currentDate.value);
};

const goToToday = () => {
    currentDate.value = DateTime.now();
    emit('update:date', currentDate.value);
};

// Watch pour synchroniser avec le parent si la date change de l'extérieur
watch(() => props.view, () => {
    // Réinitialiser à aujourd'hui lors du changement de vue
    currentDate.value = DateTime.now();
    emit('update:date', currentDate.value);
});
</script>