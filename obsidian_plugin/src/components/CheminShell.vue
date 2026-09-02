<template>
  <nav class="dreamglows-chemin-shell" data-dg-shell aria-label="Chemin">
    <div class="dreamglows-chemin-tabs" role="tablist" aria-label="Explorer le chemin">
      <button
        v-for="(tab, index) in tabs"
        :id="`dreamglows-chemin-tab-${tab.scope}`"
        :key="tab.scope"
        :ref="element => setTabRef(element, index)"
        type="button"
        role="tab"
        class="dreamglows-chemin-tab"
        :class="{ 'is-active': scope === tab.scope }"
        :aria-selected="scope === tab.scope"
        :aria-controls="`dreamglows-chemin-panel-${tab.scope}`"
        :tabindex="scope === tab.scope ? 0 : -1"
        :data-dg-tab="tab.scope"
        @click="$emit('update:scope', tab.scope)"
        @keydown="handleKeydown($event, index)"
      >
        <span class="dreamglows-chemin-tab__label">{{ tab.label }}</span>
        <span class="dreamglows-chemin-tab__hint">{{ tab.hint }}</span>
      </button>
    </div>
    <div class="dreamglows-chemin-tools" aria-label="Vues complémentaires">
      <slot name="tools" />
    </div>
  </nav>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type { ComponentPublicInstance } from 'vue';
import type { PathScope } from '@/stores/pathStore';

defineProps<{ scope: PathScope | null }>();
const emit = defineEmits<{ (event: 'update:scope', scope: PathScope): void }>();

const tabs: ReadonlyArray<{ scope: PathScope; label: string; hint: string }> = [
  { scope: 'today', label: "Aujourd'hui", hint: 'Agir' },
  { scope: 'week', label: 'Semaine', hint: 'Planifier' },
  { scope: 'journey', label: 'Parcours', hint: 'Comprendre' },
  { scope: 'history', label: 'Histoire', hint: 'Relire' },
];
const tabRefs = ref<Array<HTMLButtonElement | undefined>>([]);

const setTabRef = (element: Element | ComponentPublicInstance | null, index: number) => {
  tabRefs.value[index] = element instanceof HTMLButtonElement ? element : undefined;
};

const activate = (index: number) => {
  const normalized = (index + tabs.length) % tabs.length;
  emit('update:scope', tabs[normalized].scope);
  tabRefs.value[normalized]?.focus();
};

const handleKeydown = (event: KeyboardEvent, index: number) => {
  if (event.key === 'ArrowRight') { event.preventDefault(); activate(index + 1); }
  if (event.key === 'ArrowLeft') { event.preventDefault(); activate(index - 1); }
  if (event.key === 'Home') { event.preventDefault(); activate(0); }
  if (event.key === 'End') { event.preventDefault(); activate(tabs.length - 1); }
};
</script>

<style scoped>
.dreamglows-chemin-shell { display: flex; align-items: stretch; justify-content: space-between; gap: .75rem; margin-bottom: 1rem; }
.dreamglows-chemin-tabs { display: flex; flex: 1; gap: .45rem; overflow-x: auto; padding: .2rem; scrollbar-gutter: stable; }
.dreamglows-chemin-tab { min-height: 48px; min-width: 118px; display: grid; gap: .1rem; justify-items: start; padding: .55rem .8rem; border: 1px solid var(--background-modifier-border); border-radius: 10px; background: var(--background-secondary); color: var(--text-muted); }
.dreamglows-chemin-tab:hover, .dreamglows-chemin-tab:focus-visible { color: var(--text-normal); border-color: var(--interactive-accent); }
.dreamglows-chemin-tab.is-active { color: var(--text-normal); background: var(--background-primary-alt); border-bottom: 3px solid var(--interactive-accent); }
.dreamglows-chemin-tab__label { font-weight: 650; }
.dreamglows-chemin-tab__hint { font-size: .72rem; }
.dreamglows-chemin-tools { display: flex; align-items: center; gap: .4rem; }
@media (max-width: 700px) { .dreamglows-chemin-shell { flex-direction: column; } .dreamglows-chemin-tools { justify-content: flex-end; } }
@media (prefers-reduced-motion: reduce) { .dreamglows-chemin-tab { transition: none; } }
</style>
