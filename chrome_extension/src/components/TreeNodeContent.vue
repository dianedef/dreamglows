<template>
  <div 
    :data-node-id="item.id"
    class="p-3 my-0.5 bg-white border border-gray-200 rounded-lg flex items-center cursor-pointer transition-all duration-200 text-gray-900 w-[calc(100%-40px)] box-border group"
    :class="nodeClasses"
    :style="{ marginLeft: depth * 20 + 'px' }"
    draggable="true"
    @click="handleClick"
    @dragstart="handleDragStart"
    @dragend="handleDragEnd"
    @dragover.prevent="handleDragOver"
    @drop.prevent="handleDrop"
  >
    <span 
      v-if="item.children?.length" 
      class="tree-toggle flex items-center justify-center w-6 h-6 mr-2 rounded cursor-pointer select-none text-gray-500 flex-shrink-0 bg-transparent hover:bg-gray-200"
      @click.stop="toggleExpanded"
    >
      <svg 
        class="toggle-icon transition-transform duration-200 bg-none"
        :class="{ 'rotate-90': expanded }"
        viewBox="0 0 24 24" 
        width="16" 
        height="16"
      >
        <path 
          fill="currentColor" 
          d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"
        />
      </svg>
    </span>

    <!-- Text ou Input selon l'état d'édition -->
    <input
      v-if="editingNodeId === item.id"
      v-model="editingNodeText"
      type="text"
      class="flex-grow bg-transparent border-none outline-none text-sm font-medium focus:ring-0"
      placeholder="Nom du nœud..."
      @keyup.enter="handleNodeTextSubmit"
      @keyup.esc="editingNodeId = null"
      autofocus
      @click.stop
    >
    <span 
      v-else 
      class="node-text select-none text-sm font-medium flex-grow"
    >
      {{ item.text }}
    </span>

    <span 
      v-if="item.children"
      class="flex items-center justify-center w-6 h-6 ml-2 rounded cursor-pointer opacity-0 transition-all duration-200 text-gray-500 hover:bg-gray-200 hover:text-gray-700 group-hover:opacity-100"
      @click.stop="handleZoom"
      title="Zoom sur ce nœud"
    >
      <svg 
        viewBox="0 0 24 24" 
        width="16" 
        height="16"
      >
        <path 
          fill="currentColor" 
          d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"
        />
      </svg>
    </span>
    <span 
      class="flex items-center justify-center w-6 h-6 ml-2 rounded cursor-pointer opacity-0 transition-all duration-200 text-gray-500 hover:bg-gray-200 hover:text-gray-700 group-hover:opacity-100"
      @click.stop="$emit('duplicate', item)"
      title="Dupliquer ce nœud"
    >
      <svg 
        viewBox="0 0 24 24" 
        width="16" 
        height="16"
      >
        <path 
          fill="currentColor" 
          d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"
        />
      </svg>
    </span>
    <span 
      class="flex items-center justify-center w-6 h-6 ml-2 rounded cursor-pointer opacity-0 transition-all duration-200 text-gray-500 hover:bg-gray-200 hover:text-gray-700 group-hover:opacity-100"
      @click.stop="$emit('delete', item)"
      title="Supprimer ce nœud"
    >
      <svg 
        viewBox="0 0 24 24" 
        width="16" 
        height="16"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6" />
      </svg>
    </span>
    <span 
      class="flex items-center justify-center w-6 h-6 ml-2 rounded cursor-pointer opacity-0 transition-all duration-200 text-gray-500 hover:bg-gray-200 hover:text-gray-700 group-hover:opacity-100"
      @click.stop="handleAddNode"
      title="Ajouter un nœud"
    >
      <svg 
        viewBox="0 0 24 24" 
        width="16" 
        height="16"
      >
        <path 
          fill="currentColor" 
          d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"
        />
      </svg>
    </span>
  </div>
</template>

<script setup lang="ts">
import { ref, inject, onMounted, onUnmounted, computed } from 'vue'
import type { TreeItem } from './vue-tree-dnd-main/env'
import { useTreeStore } from '@/stores/treeStore'
import { filter, withLatestFrom, takeUntil, map } from 'rxjs/operators'
import { Subject } from 'rxjs'

const props = defineProps<{
  item: TreeItem
  depth: number
  expanded: boolean
  viewId: string
}>()

const store = useTreeStore()
const isDragging = ref(false)
const isDropTarget = ref(false)
const isSelected = ref(false)
const destroy$ = new Subject<void>()
const editingNodeId = inject<Ref<string | null>>('editingNodeId')
const editingNodeText = inject<Ref<string>>('editingNodeText')
const handleNodeTextSubmit = inject<() => void>('handleNodeTextSubmit')
const handleAdd = inject<(parentId: string) => void>('handleAdd')

// Computed pour les classes dynamiques
const nodeClasses = computed(() => ({
  'is-dragging': isDragging.value,
  'is-drop-target': isDropTarget.value,
  'is-selected': isSelected.value,
  'hover:bg-gray-100 hover:border-gray-300': !isDragging.value
}))

const emit = defineEmits<{
  'set-expanded': [value: boolean]
  'zoom': [item: TreeItem]
  'duplicate': [item: TreeItem]
  'delete': [item: TreeItem]
  'add': [parentId: string]
}>()

onMounted(() => {
  // Souscription aux événements de drag & drop
  store.interactions.drag$.pipe(
    takeUntil(destroy$),
    filter(event => event.sourceId === props.item.id || event.targetId === props.item.id)
  ).subscribe(event => {
    switch (event.type) {
      case 'dragstart':
        isDragging.value = event.sourceId === props.item.id
        break
      case 'dragend':
        isDragging.value = false
        break
      case 'dragover':
        isDropTarget.value = event.targetId === props.item.id
        break
      case 'drop':
        isDropTarget.value = false
        break
    }
  })

  // Souscription aux événements de sélection
  store.interactions.selection$.pipe(
    takeUntil(destroy$),
    filter(event => event.viewId === props.viewId),
    map(event => event.nodeIds.includes(props.item.id))
  ).subscribe(selected => {
    isSelected.value = selected
  })

  // Souscription aux événements de vue (expand/collapse)
  store.interactions.view$.pipe(
    takeUntil(destroy$),
    filter(event => 
      event.viewId === props.viewId && 
      event.nodeId === props.item.id
    )
  ).subscribe(event => {
    if (event.type === 'expand' || event.type === 'collapse') {
      emit('set-expanded', event.type === 'expand')
    }
  })
})

onUnmounted(() => {
  destroy$.next()
  destroy$.complete()
})

// Gestionnaires d'événements
const handleDragStart = (event: DragEvent) => {
  if (!event.dataTransfer) return
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/plain', props.item.id)
  isDragging.value = true
  store.interactions.handleDragStart(props.item.id)
}

const handleDragEnd = () => {
  isDragging.value = false
  store.interactions.emitDragEvent({
    type: 'dragend',
    sourceId: props.item.id
  })
}

const handleDragOver = (event: DragEvent) => {
  event.preventDefault()
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  const position = determineDropPosition(event, rect)
  store.interactions.handleDragOver(props.item.id, position)
}

const handleDrop = (event: DragEvent) => {
  event.preventDefault()
  const sourceId = event.dataTransfer?.getData('text/plain')
  if (sourceId) {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
    const position = determineDropPosition(event, rect)
    store.interactions.handleDrop(sourceId, props.item.id, position)
  }
}

const handleClick = (event: MouseEvent) => {
  const isMultiSelect = event.ctrlKey || event.metaKey
  store.interactions.selectNode(props.viewId, props.item.id, isMultiSelect)
}

const toggleExpanded = () => {
  store.interactions.toggleNodeExpansion(props.viewId, props.item.id, !props.expanded)
}

const handleZoom = () => {
  store.interactions.zoomToNode(props.viewId, props.item.id)
}

const handleAddNode = () => {
  if (handleAdd) {
    handleAdd(props.item.id)
  }
}

// Utilitaire pour déterminer la position de drop
const determineDropPosition = (event: DragEvent, rect: DOMRect) => {
  const mouseY = event.clientY
  const thirdHeight = rect.height / 3

  if (mouseY < rect.top + thirdHeight) {
    return 'FIRST_CHILD'
  } else if (mouseY > rect.bottom - thirdHeight) {
    return 'LAST_CHILD'
  } else {
    return event.clientX < rect.left + rect.width / 2 ? 'LEFT' : 'RIGHT'
  }
}
</script>

<style scoped>
.is-dragging {
  opacity: 0.5;
  border-style: dashed;
}

.is-drop-target {
  border-color: #4299e1;
  background-color: #ebf8ff;
}

.is-selected {
  background-color: #e5e7eb;
  border-color: #9ca3af;
}

:deep(.ghost) {
  @apply opacity-50 bg-gray-100 border border-dashed border-gray-400;
}

:deep(.ghost .tree-node) {
  @apply bg-gray-100 border border-dashed border-gray-400;
}

/* Style pour masquer le ghost par défaut du drag */
:deep([draggable="true"]) {
  -webkit-user-drag: none;
}
</style> 