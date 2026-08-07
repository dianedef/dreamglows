<script setup lang="ts">
import { computed, inject, onMounted, onUnmounted, ref, type Ref } from 'vue'
import { filter, map, takeUntil } from 'rxjs/operators'
import { Subject } from 'rxjs'
import type { TreeItem } from './vue-tree-dnd-main/env'
import { useTreeStore } from '@/stores/treeStore'
import { clampProgress, getChildType, getNodeType, NODE_TYPE_LABELS } from '@/lib/tree/semantics'

const props = defineProps<{ item: TreeItem; depth: number; expanded: boolean; viewId: string }>()
const emit = defineEmits<{
  setExpanded: [value: boolean]
  'zoom': [item: TreeItem]
  'duplicate': [item: TreeItem]
  'delete': [item: TreeItem]
  'add': [parentId: string]
}>()

const store = useTreeStore()
const isDragging = ref(false)
const isDropTarget = ref(false)
const isSelected = ref(false)
const destroy$ = new Subject<void>()
const editingNodeId = inject<Ref<string | null>>('editingNodeId')!
const editingNodeText = inject<Ref<string>>('editingNodeText')!
const handleNodeTextSubmit = inject<() => void>('handleNodeTextSubmit')!
const handleAdd = inject<(parentId: string) => void>('handleAdd')

const nodeType = computed(() => getNodeType(props.item, props.depth))
const typeLabel = computed(() => NODE_TYPE_LABELS[nodeType.value])
const childTypeLabel = computed(() => NODE_TYPE_LABELS[getChildType(props.item, props.depth)])
const progress = computed(() => props.item.status === 'done' ? 100 : clampProgress(props.item.progress))
const formattedDueDate = computed(() => {
  if (!props.item.dueDate) return ''
  const date = new Date(`${props.item.dueDate}T00:00:00`)
  return Number.isNaN(date.getTime()) ? props.item.dueDate : new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(date)
})
const nodeClasses = computed(() => ({
  'is-dragging': isDragging.value,
  'is-drop-target': isDropTarget.value,
  'is-selected': isSelected.value,
  'is-done': props.item.status === 'done' || props.item.isChecked
}))

function determineDropPosition(event: DragEvent, rect: DOMRect) {
  if (event.clientY < rect.top + rect.height / 3) return 'FIRST_CHILD'
  if (event.clientY > rect.bottom - rect.height / 3) return 'LAST_CHILD'
  return event.clientX < rect.left + rect.width / 2 ? 'LEFT' : 'RIGHT'
}

onMounted(() => {
  store.interactions.drag$.pipe(takeUntil(destroy$), filter(event => event.sourceId === props.item.id || event.targetId === props.item.id)).subscribe(event => {
    if (event.type === 'dragstart') isDragging.value = event.sourceId === props.item.id
    if (event.type === 'dragend') isDragging.value = false
    if (event.type === 'dragover') isDropTarget.value = event.targetId === props.item.id
    if (event.type === 'drop') isDropTarget.value = false
  })
  store.interactions.selection$.pipe(
    takeUntil(destroy$), filter(event => event.viewId === props.viewId), map(event => event.nodeIds.includes(props.item.id))
  ).subscribe(selected => { isSelected.value = selected })
  store.interactions.view$.pipe(
    takeUntil(destroy$), filter(event => event.viewId === props.viewId && event.nodeId === props.item.id)
  ).subscribe(event => {
    if (event.type === 'expand' || event.type === 'collapse') emit('setExpanded', event.type === 'expand')
  })
})

onUnmounted(() => { destroy$.next(); destroy$.complete() })

const handleDragStart = (event: DragEvent) => {
  if (!event.dataTransfer) return
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/plain', props.item.id)
  isDragging.value = true
  store.interactions.handleDragStart(props.item.id)
}
const handleDragEnd = () => {
  isDragging.value = false
  store.interactions.emitDragEvent({ type: 'dragend', sourceId: props.item.id })
}
const handleDragOver = (event: DragEvent) => {
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  store.interactions.handleDragOver(props.item.id, determineDropPosition(event, rect))
}
const handleDrop = (event: DragEvent) => {
  const sourceId = event.dataTransfer?.getData('text/plain')
  if (sourceId) store.interactions.handleDrop(sourceId, props.item.id, determineDropPosition(event, (event.currentTarget as HTMLElement).getBoundingClientRect()))
}
const handleClick = (event: MouseEvent | KeyboardEvent) => store.interactions.selectNode(props.viewId, props.item.id, 'ctrlKey' in event && (event.ctrlKey || event.metaKey))
const toggleExpanded = () => store.interactions.toggleNodeExpansion(props.viewId, props.item.id, !props.expanded)
const handleZoom = () => store.interactions.zoomToNode(props.viewId, props.item.id)
const handleAddNode = () => handleAdd?.(props.item.id)
</script>

<template>
  <article
    :data-node-id="item.id"
    class="dream-node"
    :class="nodeClasses"
    :style="{ '--node-depth': depth }"
    draggable="true"
    tabindex="0"
    :aria-label="`${typeLabel} : ${item.text}`"
    @click="handleClick"
    @keydown.enter.prevent="handleClick"
    @dragstart="handleDragStart"
    @dragend="handleDragEnd"
    @dragover.prevent="handleDragOver"
    @drop.prevent="handleDrop"
  >
    <button
      class="tree-toggle"
      :class="{ invisible: !item.children?.length }"
      type="button"
      :aria-label="expanded ? 'Replier' : 'Déplier'"
      :aria-expanded="expanded"
      @click.stop="toggleExpanded"
    >
      <span class="toggle-icon" aria-hidden="true" :class="{ expanded }">›</span>
    </button>

    <span class="type-mark" :data-type="nodeType" aria-hidden="true" />

    <div class="node-main">
      <input
        v-if="editingNodeId === item.id"
        v-model="editingNodeText"
        class="node-input"
        placeholder="Nom de l’élément…"
        autofocus
        @keyup.enter="handleNodeTextSubmit"
        @keyup.esc="editingNodeId = null"
        @click.stop
      >
      <template v-else>
        <span class="node-text">{{ item.text || `Nouvelle ${typeLabel.toLowerCase()}` }}</span>
        <span class="node-meta">
          <span class="type-label">{{ typeLabel }}</span>
          <span v-if="item.dueDate" class="due-date">{{ formattedDueDate }}</span>
          <span v-if="progress > 0" class="progress-label">{{ progress }} %</span>
        </span>
      </template>
    </div>

    <div v-if="progress > 0" class="progress-track" aria-hidden="true">
      <span :style="{ width: `${progress}%` }" />
    </div>

    <div class="node-actions" @click.stop>
      <button type="button" title="Se concentrer sur cette branche" aria-label="Se concentrer sur cette branche" @click="handleZoom">
        ⌕
      </button>
      <button type="button" :title="`Ajouter : ${childTypeLabel}`" :aria-label="`Ajouter : ${childTypeLabel}`" @click="handleAddNode">
        ＋
      </button>
      <button type="button" title="Dupliquer" aria-label="Dupliquer" @click="$emit('duplicate', item)">
        ⧉
      </button>
      <button class="danger" type="button" title="Supprimer" aria-label="Supprimer" @click="$emit('delete', item)">
        ×
      </button>
    </div>
  </article>
</template>

<style scoped>
.dream-node { --accent: #7c3aed; position: relative; display: flex; align-items: center; gap: .5rem; width: calc(100% - (var(--node-depth) * 1.25rem)); min-height: 3.25rem; margin: .2rem 0 .2rem calc(var(--node-depth) * 1.25rem); padding: .45rem .5rem; box-sizing: border-box; border: 1px solid transparent; border-radius: .75rem; color: #172033; background: transparent; cursor: grab; transition: background-color .16s ease, border-color .16s ease, box-shadow .16s ease; }
.dream-node:hover, .dream-node:focus-visible { background: #f8fafc; border-color: #e2e8f0; outline: none; }
.dream-node.is-selected { background: #f5f3ff; border-color: #c4b5fd; box-shadow: inset 3px 0 var(--accent); }
.dream-node.is-dragging { opacity: .45; cursor: grabbing; }
.dream-node.is-drop-target { border-color: #8b5cf6; background: #f5f3ff; }
.dream-node.is-done .node-text { color: #64748b; text-decoration: line-through; }
.tree-toggle, .node-actions button { display: inline-grid; place-items: center; border: 0; background: transparent; color: #64748b; border-radius: .45rem; cursor: pointer; }
.tree-toggle { width: 1.8rem; height: 1.8rem; flex: 0 0 auto; font-size: 1.35rem; }
.tree-toggle:hover, .node-actions button:hover { color: #5b21b6; background: #ede9fe; }
.tree-toggle span { transition: transform .16s ease; }
.tree-toggle span.expanded { transform: rotate(90deg); }
.invisible { visibility: hidden; }
.type-mark { width: .68rem; height: .68rem; flex: 0 0 auto; border: 2px solid var(--accent); border-radius: 50%; }
.type-mark[data-type="objective"] { --accent: #2563eb; border-radius: .2rem; transform: rotate(45deg); }
.type-mark[data-type="milestone"] { --accent: #d97706; border-radius: .15rem; }
.type-mark[data-type="task"] { --accent: #059669; border-radius: .18rem; border-width: 1px; }
.node-main { min-width: 0; flex: 1; display: flex; flex-direction: column; gap: .15rem; }
.node-text { overflow: hidden; color: #172033; font-size: .9rem; font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
.node-meta { display: flex; align-items: center; gap: .45rem; color: #788397; font-size: .68rem; }
.type-label { color: #6d28d9; font-weight: 650; text-transform: uppercase; letter-spacing: .055em; }
.due-date::before { content: '·'; margin-right: .45rem; }
.progress-label { margin-left: auto; }
.progress-track { position: absolute; right: .65rem; bottom: .22rem; left: 4.35rem; height: 2px; overflow: hidden; border-radius: 1rem; background: #e2e8f0; }
.progress-track span { display: block; height: 100%; background: linear-gradient(90deg, #8b5cf6, #22c55e); }
.node-actions { display: flex; gap: .1rem; opacity: 0; transition: opacity .16s ease; }
.dream-node:hover .node-actions, .dream-node:focus-within .node-actions, .is-selected .node-actions { opacity: 1; }
.node-actions button { width: 1.8rem; height: 1.8rem; font-size: 1rem; }
.node-actions .danger:hover { color: #b91c1c; background: #fee2e2; }
.node-input { width: 100%; border: 0; border-bottom: 1px solid #8b5cf6; outline: none; background: transparent; font: inherit; }
@media (max-width: 640px) { .node-actions { opacity: 1; } .node-actions button:nth-child(3) { display: none; } .dream-node { gap: .3rem; } }
@media (prefers-reduced-motion: reduce) { .dream-node, .tree-toggle span, .node-actions { transition: none; } }
</style>
