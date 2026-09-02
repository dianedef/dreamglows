<template>
  <section class="journey-tree" data-dg-journey>
    <header><div><h3>Parcours</h3><p>{{ items.length }} éléments reliés</p></div><button type="button" @click="toggleAll">{{ allExpanded ? 'Tout replier' : 'Tout déplier' }}</button></header>
    <div v-if="visibleRows.length" class="journey-tree__rows" data-dg-journey-fallback role="tree" aria-label="Parcours du rêve à l’action" @keydown="onKeydown">
      <button v-for="(row, index) in visibleRows" :key="row.key" :ref="element => setRowRef(element, index)" type="button" role="treeitem"
        class="journey-tree__row" :class="{ 'is-selected': selectedId === row.id, 'is-context': row.contextOnly }"
        :style="{ '--journey-depth': row.depth }" :aria-level="row.depth + 1" :aria-expanded="expandable(row) ? expanded.has(row.key) : undefined"
        :aria-selected="selectedId === row.id" :tabindex="focusedIndex === index ? 0 : -1" :data-dg-entity-id="row.id"
        :data-dg-context-only="row.contextOnly || undefined" @click="select(row, index)" @focus="focusedIndex = index">
        <span aria-hidden="true" class="journey-tree__toggle" @click.stop="toggle(row)">{{ expandable(row) ? (expanded.has(row.key) ? '⌄' : '›') : '' }}</span>
        <span aria-hidden="true">{{ icon(row.entity.type) }}</span><span class="journey-tree__title">{{ row.entity.title }}</span>
        <span>{{ statusLabel(row.entity.status) }}</span>
        <span class="journey-tree__flags"><span v-if="row.contextOnly">Contexte</span><span v-if="row.orphan">Parent manquant</span><span v-if="row.cycleReference">Cycle</span></span>
      </button>
    </div>
    <div v-else class="journey-tree__empty"><strong>Votre premier chemin commence ici.</strong><p>Créez un objectif puis reliez-y des actions.</p></div>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch, type ComponentPublicInstance } from 'vue';
import type { JourneyRow } from '@/domain/path/journey-view-model';
import type { PathEntityType, PathStatus } from '@/domain/path/model';
const props = defineProps<{ items: readonly JourneyRow[]; selectedId?: string }>();
const emit = defineEmits<{ select: [row: JourneyRow] }>();
const expanded = ref(new Set<string>()); const focusedIndex = ref(0); const rowRefs = ref<Array<HTMLButtonElement | null>>([]);
const children = computed(() => { const result = new Map<string, JourneyRow[]>(); for (const row of props.items) if (row.parentKey) result.set(row.parentKey, [...(result.get(row.parentKey) ?? []), row]); return result; });
const expandable = (row: JourneyRow) => !row.cycleReference && (children.value.get(row.key)?.length ?? 0) > 0;
const visibleRows = computed(() => props.items.filter(row => { let parent = row.parentKey; while (parent) { if (!expanded.value.has(parent)) return false; parent = props.items.find(item => item.key === parent)?.parentKey; } return true; }));
const allExpanded = computed(() => props.items.some(expandable) && props.items.filter(expandable).every(row => expanded.value.has(row.key)));
watch(() => props.items.map(row => row.key).join('|'), () => { if (!expanded.value.size) expanded.value = new Set(props.items.filter(row => row.depth === 0).map(row => row.key)); }, { immediate: true });
watch(visibleRows, rows => { focusedIndex.value = Math.min(focusedIndex.value, Math.max(0, rows.length - 1)); rowRefs.value.length = rows.length; });
const setRowRef = (element: Element | ComponentPublicInstance | null, index: number) => { rowRefs.value[index] = element instanceof HTMLButtonElement ? element : null; };
const toggle = (row: JourneyRow) => { if (!expandable(row)) return; const next = new Set(expanded.value); next.has(row.key) ? next.delete(row.key) : next.add(row.key); expanded.value = next; };
const toggleAll = () => { expanded.value = allExpanded.value ? new Set() : new Set(props.items.filter(expandable).map(row => row.key)); };
const select = (row: JourneyRow, index: number) => { focusedIndex.value = index; emit('select', row); };
const focus = async (index: number) => { focusedIndex.value = Math.max(0, Math.min(visibleRows.value.length - 1, index)); await nextTick(); rowRefs.value[focusedIndex.value]?.focus(); };
const onKeydown = (event: KeyboardEvent) => { const row = visibleRows.value[focusedIndex.value]; if (!row) return; if (event.key === 'ArrowDown') { event.preventDefault(); void focus(focusedIndex.value + 1); } if (event.key === 'ArrowUp') { event.preventDefault(); void focus(focusedIndex.value - 1); } if (event.key === 'Home') { event.preventDefault(); void focus(0); } if (event.key === 'End') { event.preventDefault(); void focus(visibleRows.value.length - 1); } if (event.key === 'ArrowRight') { event.preventDefault(); expandable(row) && !expanded.value.has(row.key) ? toggle(row) : void focus(focusedIndex.value + 1); } if (event.key === 'ArrowLeft') { event.preventDefault(); if (expanded.value.has(row.key)) toggle(row); else if (row.parentKey) void focus(visibleRows.value.findIndex(item => item.key === row.parentKey)); } if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); select(row, focusedIndex.value); } };
const icon = (type: PathEntityType) => ({ dream: '✦', goal: '◎', milestone: '◆', action: '○', habit: '↻', 'focus-session': '◐', evidence: '✓', reflection: '◇' }[type]);
const statusLabel = (status: PathStatus) => ({ todo: 'À faire', 'in-progress': 'En cours', done: 'Terminé', cancelled: 'Annulé' }[status]);
</script>

<style scoped>
.journey-tree { height: 100%; display: flex; flex-direction: column; min-height: 0; }
.journey-tree header { display: flex; justify-content: space-between; align-items: center; gap: 1rem; padding: 1rem; border-bottom: 1px solid var(--background-modifier-border); }.journey-tree h3,.journey-tree p { margin: 0; }.journey-tree header p { color: var(--text-muted); font-size: .78rem; }
.journey-tree__rows { overflow: auto; padding: .55rem; }.journey-tree__row { --journey-depth: 0; display: grid; grid-template-columns: 1rem 1.2rem minmax(7rem,1fr) auto auto; align-items: center; gap: .4rem; width: calc(100% - (var(--journey-depth) * 1rem)); margin-left: calc(var(--journey-depth) * 1rem); padding: .55rem; border: 0; border-radius: 8px; background: transparent; color: var(--text-normal); box-shadow: none; text-align: left; }.journey-tree__row:hover,.journey-tree__row:focus-visible { background: var(--background-modifier-hover); }.journey-tree__row.is-selected { background: color-mix(in srgb,var(--interactive-accent) 17%,transparent); }.journey-tree__row.is-context { opacity: .72; }.journey-tree__title { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 550; }.journey-tree__flags { display: flex; gap: .25rem; color: var(--text-muted); font-size: .68rem; }.journey-tree__empty { margin: auto; padding: 2rem; text-align: center; color: var(--text-muted); }
@media(max-width:700px){.journey-tree__row{grid-template-columns:1rem 1.2rem minmax(0,1fr)}.journey-tree__row>span:nth-last-child(-n+2){display:none}}
</style>
