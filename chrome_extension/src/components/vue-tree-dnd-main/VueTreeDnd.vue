<script setup lang="ts">
/* eslint-disable ts/no-use-before-define */
import {
  computed,
  markRaw,
  onMounted,
  onUnmounted,
  provide,
  ref,
  watch
} from 'vue'
import {
  getFlatTreeWithAncestors
} from './utils'
import type {
  DragEndEventHandler,
  DragOverEventHandler,
  DragStartEventHandler,
  DropProposalSetterHandler,
  FlatTreeItem,
  MoveMutation,
  MoveMutationProposal,
  TreeItem,
  TreeItemId,
  VueTreeDndProps
} from './env'
import TreeNode from './TreeNode.vue'
import RawTreeNodeContent from '@/components/TreeNodeContent.vue'

const props = defineProps<VueTreeDndProps>()

const emit = defineEmits<{
  'move': [move: MoveMutation]
  'update:modelValue': [tree: TreeItem[]]
  'zoom': [item: TreeItem]
  'update:view': [view: any]
  'add': [parentId: string]
  'delete': [item: TreeItem]
  'duplicate': [item: TreeItem]
  'dragstart': [event: DragStartEventHandler, itemId: TreeItemId, depth: number]
  'dragover': [event: DragOverEventHandler, itemId: TreeItemId]
  'dragend': [event: DragEndEventHandler]
}>()

markRaw(RawTreeNodeContent)

const LEFT_OF_ROOT_ID: TreeItemId = '__vue-dnd-tree-root__'

const flatTreeNodes = ref<FlatTreeItem[]>([])
const flatTreeIds = ref<TreeItemId[]>([])
const getNodeById: (id: TreeItemId) => FlatTreeItem | undefined = (id: TreeItemId) => {
  return flatTreeNodes.value.find((node: FlatTreeItem) => node.id === id)
}

const convertViewDataToSets = (view: any) => {
  if (!view) return null
  return {
    ...view,
    expandedNodes: view.expandedNodes instanceof Set ? view.expandedNodes : new Set<string>(),
    selectedNodes: view.selectedNodes instanceof Set ? view.selectedNodes : new Set<string>()
  }
}

watch(() => props.modelValue, () => {
  flatTreeNodes.value = getFlatTreeWithAncestors(props.modelValue)
  flatTreeIds.value = flatTreeNodes.value.map(({ id }) => id)
}, { immediate: true })

provide('setExpanded', (expanded: boolean, treeItemId: TreeItemId) => {
  const view = convertViewDataToSets(props.view)
  if (!view) return
  
  if (expanded) {
    view.expandedNodes.add(treeItemId)
  } else {
    view.expandedNodes.delete(treeItemId)
  }
  
  emit('update:view', view)
})

const getPreviousNodeId: (nodeId: TreeItemId) => TreeItemId = (nodeId: TreeItemId) => {
  const index = flatTreeIds.value.findIndex(id => id === nodeId)
  return index === 0
    ? LEFT_OF_ROOT_ID
    : flatTreeIds.value[index - 1]
}

type DragEventData = {
  initialX: number
  initialDepth: number
} | null
const dragdata = ref<DragEventData>(null)

const deltaX = ref(0)

const INDENT_WIDTH = 20 // Largeur d'un niveau d'indentation
const MAX_INDENT = 2 // Nombre maximum de niveaux d'indentation

const dragOverDeltaXCalculator: (event: DragEvent) => void = (event: DragEvent) => {
  event.preventDefault()
  if (dragdata.value === null) return
  
  const { initialX } = dragdata.value
  const deltaFromStart = event.clientX - initialX
  
  // Calculer le niveau d'indentation de manière plus directe
  const indentLevel = Math.max(
    0,
    Math.min(
      Math.round(deltaFromStart / INDENT_WIDTH),
      MAX_INDENT
    )
  )
  
  // Si on est à l'indentation 0 et qu'on est en bas de l'arbre, 
  // on considère que c'est un déplacement à la racine
  if (indentLevel === 0 && treeRoot.value && event.clientY > treeRoot.value.getBoundingClientRect().bottom - 50) {
    deltaX.value = -1 // Valeur spéciale pour indiquer un déplacement à la racine
  } else {
    deltaX.value = indentLevel
  }
}

onMounted(() => {
  document.addEventListener('dragover', dragOverDeltaXCalculator)
})

onUnmounted(() => {
  document.removeEventListener('dragover', dragOverDeltaXCalculator)
})

const dragItemId = ref<TreeItemId | null>(null)
const dragItem = computed(() => flatTreeNodes.value.find((node: FlatTreeItem) => node.id === dragItemId.value))
provide('dragItem', dragItem)

const dragItemDescendantIdSet = computed(() => {
  if (dragItem.value === undefined) {
    return new Set()
  }
  return new Set(getFlatTreeWithAncestors([dragItem.value]).map((node: FlatTreeItem) => node.id))
})

const dropTarget = ref<TreeItemId | undefined>(undefined)
const setDropTarget: (targetId: TreeItemId) => void = (targetId: TreeItemId) => {
  if (dragItemDescendantIdSet.value.has(targetId)) {
    setDropTarget(getPreviousNodeId(targetId))
    return
  }
  dropTarget.value = targetId
}
provide('dropTarget', dropTarget)
provide('setDropTarget', setDropTarget)

const dropProposal = ref<MoveMutationProposal | null>(null)
const setDropProposal: DropProposalSetterHandler = (proposal: MoveMutationProposal) => {
  dropProposal.value = proposal
}
provide('setDropProposal', setDropProposal)

watch(dropTarget, () => {
  if (dropTarget.value === LEFT_OF_ROOT_ID) {
    if (dragItemId.value === null) {
      throw new Error('dragItemId.value is null')
    }
    setDropProposal({
      id: dragItemId.value,
      targetId: props.modelValue[0].id,
      position: 'FIRST_CHILD',
      ghostIndent: 0
    })
  }
})

// --------------------------------- DRAG EVENTS ---------------------------------

const cleanNodeForJSON = (node: TreeItem): TreeItem => {
  const { parent, __vue_dnd_tree_ancestors, ...cleanNode } = node as TreeItem & { __vue_dnd_tree_ancestors?: TreeItemId[] }
  return {
    ...cleanNode,
    children: node.children?.map(child => cleanNodeForJSON(child)) || []
  }
}

const dragend: DragEndEventHandler = () => {
  console.log('dragend', { dropProposal: dropProposal.value, dragItemId: dragItemId.value })
  
  if (dropProposal.value == null || dragItemId.value == null) {
    console.log('Réinitialisation sans changements - pas de proposition ou pas d\'item')
    // Reset state without making changes
    dropTarget.value = undefined
    dragItemId.value = null
    dropProposal.value = null
    dragdata.value = null
    deltaX.value = 0
    return
  }
  
  const { ghostIndent, ...proposalData } = dropProposal.value
  let proposal = proposalData
  console.log('Proposition de déplacement:', proposal)
  
  // Vérifications de sécurité
  if (proposal.id === proposal.targetId || !proposal.targetId) {
    console.log('Réinitialisation - ID source égal à la cible ou pas de cible')
    // Reset state without making changes
    dropTarget.value = undefined
    dragItemId.value = null
    dropProposal.value = null
    dragdata.value = null
    deltaX.value = 0
    return
  }
  
  // Vérifier que le nœud source et cible existent toujours
  const sourceNode = getNodeById(proposal.id)
  const targetNode = getNodeById(proposal.targetId)
  
  if (!sourceNode || !targetNode) {
    console.log('Nœuds non trouvés:', { sourceNode, targetNode })
    // Reset state without making changes
    dropTarget.value = undefined
    dragItemId.value = null
    dropProposal.value = null
    dragdata.value = null
    deltaX.value = 0
    return
  }
  
  // Si on déplace vers la racine, modifier la proposition
  if (deltaX.value === -1) {
    proposal = {
      id: dragItemId.value,
      targetId: '1', // ID du nœud racine
      position: 'LAST_CHILD'
    }
  }
  
  console.log('Émission de l\'événement move avec:', proposal)
  emit('move', proposal)
  
  // Mettre à jour la structure de l'arbre
  const newTree = props.modelValue.map(node => cleanNodeForJSON(node))
  const sourceParent = findParentNode(newTree, proposal.id)
  const targetParent = findParentNode(newTree, proposal.targetId)
  
  // Retirer le nœud source de son parent actuel
  if (sourceParent) {
    sourceParent.children = sourceParent.children.filter((child: TreeItem) => child.id !== proposal.id)
  } else {
    const index = newTree.findIndex((node: TreeItem) => node.id === proposal.id)
    if (index !== -1) {
      newTree.splice(index, 1)
    }
  }
  
  // Créer le nœud source
  const sourceNodeToMove = cleanNodeForJSON(sourceNode)

  // Si on déplace à la racine (deltaX === -1)
  if (deltaX.value === -1) {
    const rootNode = findNode(newTree, '1') // Trouver le nœud racine
    if (rootNode) {
      if (!rootNode.children) rootNode.children = []
      rootNode.children.push(sourceNodeToMove)
    }
  } else if (proposal.position === 'LAST_CHILD' || proposal.position === 'FIRST_CHILD') {
    const targetNode = findNode(newTree, proposal.targetId)
    if (targetNode) {
      if (!targetNode.children) targetNode.children = []
      if (proposal.position === 'LAST_CHILD') {
        targetNode.children.push(sourceNodeToMove)
      } else {
        targetNode.children.unshift(sourceNodeToMove)
      }
    }
  } else {
    if (targetParent) {
      const index = targetParent.children.findIndex((child: TreeItem) => child.id === proposal.targetId)
      if (proposal.position === 'LEFT') {
        targetParent.children.splice(index, 0, sourceNodeToMove)
      } else {
        targetParent.children.splice(index + 1, 0, sourceNodeToMove)
      }
    } else {
      // Si on déplace à la racine
      if (proposal.position === 'LEFT') {
        newTree.unshift(sourceNodeToMove)
      } else {
        newTree.push(sourceNodeToMove)
      }
    }
  }

  emit('update:modelValue', newTree)
  
  // Reset state after move
  dropTarget.value = undefined
  dragItemId.value = null
  dropProposal.value = null
  dragdata.value = null
  deltaX.value = 0
}

const dragstart: DragStartEventHandler = (event: DragEvent, itemId: TreeItemId, depth: number) => {
  if (!event.dataTransfer) return
  
  event.dataTransfer.dropEffect = 'move'
  event.dataTransfer.effectAllowed = 'move'
  const emptyImage = new Image()
  emptyImage.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
  if (event.dataTransfer.setDragImage) {
    event.dataTransfer.setDragImage(emptyImage, 0, 0)
  }
  
  // Reset any existing drag state
  dropTarget.value = undefined
  dragItemId.value = null
  dropProposal.value = null
  dragdata.value = null
  deltaX.value = 0
  
  // Putting this in a timeout is necessary for Chrome.
  setTimeout(() => {
    dragItemId.value = itemId
    dragdata.value = {
      initialX: event.clientX,
      initialDepth: depth
    }
    const previousId = getPreviousNodeId(itemId)
    if (previousId) {
      setDropTarget(previousId)
    }
  }, 0)
}
provide<DragStartEventHandler>('dragstart', dragstart)

const treeRoot = ref<HTMLElement | null>(null)

const handleDragLeave = (event: DragEvent) => {
  // Vérifier si on quitte réellement l'arbre
  if (treeRoot.value && !treeRoot.value.contains(event.relatedTarget as Node)) {
    // Réinitialiser le placeholder à la dernière position valide dans l'arbre
    if (dragItemId.value) {
      const lastValidNode = flatTreeNodes.value[flatTreeNodes.value.length - 1]
      if (lastValidNode) {
        setDropTarget(lastValidNode.id)
      }
    }
  }
}

const dragover: DragOverEventHandler = (event: DragEvent, itemId: TreeItemId) => {
  event.preventDefault()
  if (!dragItemId.value) return
  
  const target = event.target as HTMLElement
  if (!target) return

  // Vérifier si on est toujours dans l'arbre
  if (treeRoot.value && !treeRoot.value.contains(target)) {
    return
  }

  // Si on est en mode "déplacement à la racine"
  if (deltaX.value === -1) {
    setDropTarget('1') // ID du nœud racine
    setDropProposal({
      id: dragItemId.value,
      targetId: '1', // ID du nœud racine
      position: 'LAST_CHILD',
      ghostIndent: 0
    })
    return
  }
  
  const isAbove = event.offsetY < target.clientHeight / 2
  
  // Si on survole l'élément en cours de déplacement
  if (dragItemId.value === itemId) {
    const previousId = getPreviousNodeId(itemId)
    if (previousId) {
      setDropTarget(previousId)
      // Forcer la position LAST_CHILD si deltaX est positif
      if (deltaX.value > 0) {
        setDropProposal({
          id: dragItemId.value,
          targetId: previousId,
          position: 'LAST_CHILD',
          ghostIndent: deltaX.value
        })
      } else {
        setDropProposal({
          id: dragItemId.value,
          targetId: previousId,
          position: isAbove ? 'LEFT' : 'RIGHT',
          ghostIndent: deltaX.value
        })
      }
    }
    return
  }

  // Mettre à jour la cible du drop
  const targetId = isAbove ? getPreviousNodeId(itemId) : itemId
  setDropTarget(targetId)
  
  // Déterminer la position en fonction de deltaX
  if (deltaX.value > 0) {
    setDropProposal({
      id: dragItemId.value,
      targetId,
      position: 'LAST_CHILD',
      ghostIndent: deltaX.value
    })
  } else {
    setDropProposal({
      id: dragItemId.value,
      targetId,
      position: isAbove ? 'LEFT' : 'RIGHT',
      ghostIndent: deltaX.value
    })
  }
}

provide<DragOverEventHandler>('dragover', dragover)

provide('handleZoom', (item: TreeItem) => {
  emit('zoom', item)
})

const isNodeExpanded = (nodeId: TreeItemId): boolean => {
  if (!props.view) return false
  const view = convertViewDataToSets(props.view)
  if (!view) return false
  return view.expandedNodes.has(nodeId)
}

provide('isExpanded', isNodeExpanded)

const editingNodeId = ref<string | null>(null)
const editingNodeText = ref('')

const findNode = (tree: TreeItem[], id: TreeItemId): TreeItem | undefined => {
  for (const node of tree) {
    if (node.id === id) return node
    if (node.children.length) {
      const found = findNode(node.children, id)
      if (found) return found
    }
  }
  return undefined
}

const findParentNode = (tree: TreeItem[], childId: TreeItemId): TreeItem | undefined => {
  for (const node of tree) {
    if (node.children.some(child => child.id === childId)) return node
    if (node.children.length) {
      const found = findParentNode(node.children, childId)
      if (found) return found
    }
  }
  return undefined
}

const handleAdd = (parentId: string) => {
  const newNode: TreeItem = {
    id: crypto.randomUUID(),
    text: '',
    children: []
  }
  
  // Trouver le parent et ajouter le nouveau nœud
  const addNodeToTree = (items: TreeItem[]): boolean => {
    for (const item of items) {
      if (item.id === parentId) {
        item.children.push(newNode)
        return true
      }
      if (item.children.length && addNodeToTree(item.children)) {
        return true
      }
    }
    return false
  }

  const newTree = [...props.modelValue]
  if (addNodeToTree(newTree)) {
    emit('update:modelValue', newTree)
  }
  
  // Activer l'édition du nouveau nœud
  editingNodeId.value = newNode.id
  editingNodeText.value = ''
}

const handleNodeTextSubmit = () => {
  if (!editingNodeId.value || !editingNodeText.value.trim()) {
    return
  }

  const updateNodeText = (items: TreeItem[]): boolean => {
    for (const item of items) {
      if (item.id === editingNodeId.value) {
        item.text = editingNodeText.value.trim()
        return true
      }
      if (item.children.length && updateNodeText(item.children)) {
        return true
      }
    }
    return false
  }

  const newTree = [...props.modelValue]
  updateNodeText(newTree)
  emit('update:modelValue', newTree)
  
  editingNodeId.value = null
  editingNodeText.value = ''
}

provide('editingNodeId', editingNodeId)
provide('editingNodeText', editingNodeText)
provide('handleNodeTextSubmit', handleNodeTextSubmit)

provide('handleAdd', (parentId: string) => {
  emit('add', parentId)
})

provide('handleDelete', (item: TreeItem) => {
  emit('delete', item)
})

provide('handleDuplicate', (item: TreeItem) => {
  emit('duplicate', item)
})

</script>

<template>
  <div 
    ref="treeRoot"
    @dragend="dragend"
    @dragleave="handleDragLeave"
  >
    <!-- Root placeholder -->
    <div
      v-if="dropTarget === LEFT_OF_ROOT_ID && dragItem !== undefined"
      class="root-placeholder"
    >
      <!-- Line placeholder -->
      <div class="placeholder-line" />
      
      <!-- Ghost placeholder -->
      <div class="ghost-placeholder">
        <TreeNode
          :item="dragItem"
          :component="component"
          :ancestors="[]"
          :drop-target="dropTarget"
          :depth="0"
          :delta-x="0"
          :is-ghost="true"
          :locked="locked"
        />
      </div>
    </div>

    <template
      v-for="node in modelValue || []"
      :key="node.id"
    >
      <TreeNode
        :item="node"
        :component="component"
        :ancestors="[]"
        :depth="0"
        :drop-target="dropTarget"
        :delta-x="deltaX"
        :is-ghost="false"
        :locked="locked"
        :draggable="!locked"
        :handle-add="handleAdd"
        @dragstart.stop="dragstart($event, node.id, 0)"
      />
    </template>
  </div>
</template>

<style scoped>
.root-placeholder {
  position: relative;
  margin: 4px 0;
  pointer-events: none;
  width: 100%;
  box-sizing: border-box;
}

.placeholder-line {
  position: absolute;
  left: 0;
  right: 0;
  height: 2px;
  background-color: #3b82f6;
  border-radius: 1px;
  width: 100%;
}

.placeholder-line::before {
  content: '';
  position: absolute;
  left: 0;
  top: -4px;
  width: 10px;
  height: 10px;
  background-color: #3b82f6;
  border-radius: 50%;
}

.ghost-placeholder {
  padding-top: 6px;
  opacity: 0.5;
}

:deep(.ghost-placeholder .tree-node) {
  background: #f3f4f6;
  border: 1px dashed #9ca3af;
}
</style>
