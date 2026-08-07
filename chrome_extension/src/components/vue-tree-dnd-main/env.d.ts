import { type Component } from 'vue'

export type Position = 'LEFT' | 'RIGHT' | 'FIRST_CHILD' | 'LAST_CHILD'

export type TreeItemId = string

export interface TreeItem {
  id: TreeItemId
  text: string
  children: TreeItem[]
  parent?: TreeItem | null
  isChecked?: boolean
  hierarchicalId?: string
}

export interface FlatTreeItem extends TreeItem {
  __vue_dnd_tree_ancestors: TreeItemId[]
}

export interface MoveMutation {
  id: TreeItemId
  targetId: TreeItemId
  position: Position
}

export interface MoveMutationProposal extends MoveMutation {
  ghostIndent: number
}

export interface TreeItemProps {
  item?: TreeItem
  component?: any
  ancestors: TreeItemId[]
  depth: number
  dropTarget?: TreeItemId
  deltaX: number
  isGhost: boolean
  locked: boolean
  draggable?: boolean
  isDropTarget?: boolean
  isDropTargetChild?: boolean
  isDropTargetBefore?: boolean
  isDropTargetAfter?: boolean
  isDragging?: boolean
  handleDragStart?: (event: DragEvent) => void
  handleDragEnd?: () => void
  handleDragOver?: (event: DragEvent) => void
  handleDrop?: () => void
}

export type DragStartEventHandler = (event: DragEvent, itemId: TreeItemId, depth: number) => void
export type DragOverEventHandler = (event: DragEvent, itemId: TreeItemId) => void
export type DragEndEventHandler = () => void
export type DropProposalSetterHandler = (proposal: MoveMutationProposal) => void

export interface VueTreeDndProps {
  modelValue: TreeItem[]
  component: any
  locked: boolean
  view?: {
    id: string
    zoomedNodeId: string | null
    currentPath: string[]
    expandedNodes: Set<string>
    selectedNodes: Set<string>
  }
}

// Unused, but for reference:
// export interface VueTreeDndEmits {
//   'move-node': [move: MoveMutation]
//   'update:modelValue': [tree: TreeItem[]]
// }
