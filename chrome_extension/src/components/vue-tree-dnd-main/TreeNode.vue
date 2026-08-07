<script setup lang="ts">
import {
  computed,
  type ComputedRef,
  inject,
  watch
} from 'vue'
import type {
  DragOverEventHandler,
  DragStartEventHandler,
  DropProposalSetterHandler,
  MoveMutationProposal,
  TreeItem,
  TreeItemId,
  TreeItemProps
} from './env'
import { clamp } from './utils'

const props = withDefaults(defineProps<TreeItemProps & {
  handleAdd?: (parentId: string) => void
}>(), {
  item: () => ({
    id: '',
    text: '',
    children: []
  }) as TreeItem,
  handleAdd: undefined
})

const viewId = inject<string>('viewId', 'default')

// Validation immédiate des props
if (!props.item || typeof props.item.id !== 'string' || props.item.id === '') {
  throw new Error('item.id is required and must be a non-empty string')
}
if (!Array.isArray(props.item.children)) {
  throw new TypeError('item.children array is required')
}
if (!props.component) {
  throw new Error('component is required')
}

const isExpanded = inject<(nodeId: TreeItemId) => boolean>('isExpanded', () => false)
const expanded = computed(() => isExpanded(props.item.id))

const setExpanded = inject<(expanded: boolean, treeItemId: TreeItemId) => void>('setExpanded', () => {
  throw new Error('setExpanded has not been provided')
})
const handleZoom = inject<(item: TreeItem) => void>('handleZoom', () => {
  throw new Error('handleZoom has not been provided')
})
const handleDelete = inject<(item: TreeItem) => void>('handleDelete', () => {
  throw new Error('handleDelete has not been provided')
})
const handleDuplicate = inject<(item: TreeItem) => void>('handleDuplicate', () => {
  throw new Error('handleDuplicate has not been provided')
})
const scopedSetExpanded: (expanded: boolean) => void = (expanded: boolean) => {
  setExpanded(expanded, props.item.id)
}

const dropTarget = inject<ComputedRef<TreeItemId>>('dropTarget')
const dragItem = inject<ComputedRef<TreeItem | undefined>>('dragItem')
const injectedDragstart = inject<DragStartEventHandler>('dragstart')
const dragstart: DragStartEventHandler = (event: DragEvent, id: TreeItemId, depth: number) => {
  if (injectedDragstart === undefined) {
    throw new Error('VueTreeDnd has not been provided')
  }
  injectedDragstart(event, id, depth)
}
const injectedDragover = inject<DragOverEventHandler>('dragover')
const dragover: DragOverEventHandler = (event: DragEvent, id: TreeItemId) => {
  if (injectedDragover === undefined) {
    throw new Error('VueTreeDnd has not been provided')
  }
  injectedDragover(event, id)
}

const possibleMoveMutations = computed<MoveMutationProposal[]>(() => {
  if ((dragItem?.value) == null) {
    return []
  }
  const dragItemId = dragItem.value.id

  // If we have expanded children, node must be first child (no other options)
  // If we are a leaf/collapsed, node can be sibling or child (must be last if collapsed)
  // If we are the last child, node can also move up to ancestors
  if (props.item.children.filter(node => node.id !== dragItemId).length > 0 && expanded.value) {
    return [{ id: dragItemId, targetId: props.item.id, position: 'FIRST_CHILD', ghostIndent: props.depth + 1 }]
  }
  const getOffsetIndent: (index: number) => number = (index: number) => props.depth - (props.ancestors.length - index)
  return [
    ...props.ancestors.map<MoveMutationProposal>((targetId, index) => ({
      id: dragItemId, targetId, position: 'RIGHT', ghostIndent: getOffsetIndent(index)
    })),
    { id: dragItemId, targetId: props.item.id, position: 'RIGHT', ghostIndent: props.depth },
    { id: dragItemId, targetId: props.item.id, position: 'LAST_CHILD', ghostIndent: props.depth + 1 }
  ]
})
const ghostIndent = computed(() => {
  const minOffset = Math.min(...possibleMoveMutations.value.map(m => m.ghostIndent))
  const maxOffset = Math.max(...possibleMoveMutations.value.map(m => m.ghostIndent))
  return clamp(props.deltaX, minOffset, maxOffset)
})

const injectedSetDropProposal = inject<DropProposalSetterHandler>('setDropProposal')
const setDropProposal: DropProposalSetterHandler = (proposal: MoveMutationProposal) => {
  if (injectedSetDropProposal === undefined) {
    throw new Error('VueTreeDnd has not been provided')
  }
  injectedSetDropProposal(proposal)
}
watch([dropTarget, possibleMoveMutations, ghostIndent], () => {
  if (dropTarget === undefined || dropTarget?.value === null) {
    return
  }
  if (dropTarget.value === props.item.id) {
    const impliedMoveMutation = possibleMoveMutations.value.find(m => m.ghostIndent === ghostIndent.value)
    if (impliedMoveMutation == null) {
      throw new Error(`Could not find impliedMoveMutation for ghostIndent ${ghostIndent.value}`)
    }
    setDropProposal(impliedMoveMutation)
  }
})

const dragStyle = {
  position: 'absolute',
  opacity: 0,
  pointerEvents: 'none',
  visibility: 'hidden'
}
const isBeingDraggedStyle = computed(() => dragItem?.value?.id === props.item.id && !props.isGhost ? dragStyle : {})
</script>

<template>
  <a
    href="#"
    class="text-inherit no-underline group"
    :style="isBeingDraggedStyle"
    data-test="tree-node"
    @click.prevent
  >
    <!-- Display actual node -->
    <div
      class="flex flex-row items-center"
      data-test="tree-node-content"
      @dragover="dragover($event, item.id)"
    >
      <component
        :is="component"
        :item="item"
        :depth="depth"
        :expanded="expanded"
        :view-id="viewId"
        data-test="tree-node-component"
        @set-expanded="scopedSetExpanded"
        @zoom="handleZoom"
        @delete="handleDelete"
        @duplicate="handleDuplicate"
        @add="handleAdd"
      />
    </div>

    <!-- Display both placeholders -->
    <div
      v-if="dropTarget === item.id && !isGhost && dragItem !== undefined"
      class="relative my-1 pointer-events-none w-[calc(100%-40px)] box-border"
      :style="{ marginLeft: `${ghostIndent * 20 }px`, width: `calc(100% - ${ghostIndent * 20}px)` }"
      data-test="tree-node-placeholder"
    >
      <!-- Line placeholder -->
      <div 
        class="absolute left-0 right-0 h-0.5 bg-blue-500 rounded-sm w-full before:content-[''] before:absolute before:left-0 before:-top-1 before:w-2.5 before:h-2.5 before:bg-blue-500 before:rounded-full" 
        data-test="tree-node-placeholder-line"
      />
      
      <!-- Ghost placeholder -->
      <div 
        class="pt-1.5 opacity-50" 
        data-test="tree-node-ghost"
      >
        <TreeNode
          :item="dragItem"
          :component="component"
          :ancestors="[]"
          :drop-target="dropTarget"
          :depth="0"
          :delta-x="deltaX"
          :is-ghost="true"
          :locked="locked"
        />
      </div>
    </div>

    <!-- Display children if expanded -->
    <TreeNode
      v-for="(node, index) in item?.children || []"
      v-show="expanded"
      :key="node.id"
      :item="node"
      :component="component"
      :ancestors="index === (item.children.length - 1) || (index === (item.children.length - 2) && dragItem?.id === item?.children[item.children.length - 1]?.id) ? [...ancestors, item.id] : []"
      :drop-target="dropTarget"
      :depth="depth + 1"
      :delta-x="deltaX"
      :is-ghost="isGhost"
      :locked="locked"
      :draggable="!locked"
      :handle-add="handleAdd"
      @dragstart.stop="dragstart($event, node.id, depth + 1)"
    />
  </a>
</template>

<style scoped>
:deep(.ghost) {
  opacity: 0.5;
  background-color: rgb(243 244 246);
  border: 1px dashed rgb(156 163 175);
}

:deep(.ghost .tree-node) {
  background-color: rgb(243 244 246);
  border: 1px dashed rgb(156 163 175);
}

/* Style pour masquer le ghost par défaut du drag */
:deep([draggable="true"]) {
  -webkit-user-drag: none;
}
</style>
