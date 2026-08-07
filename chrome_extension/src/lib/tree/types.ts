export type DreamNodeType = 'dream' | 'objective' | 'milestone' | 'task'
export type DreamNodeStatus = 'todo' | 'in-progress' | 'done'

export interface TreeItem {
  id: string
  text: string
  children: TreeItem[]
  parent?: TreeItem | null
  hierarchicalId?: string
  isChecked?: boolean
  /** Optional for backwards compatibility; legacy nodes are inferred from depth. */
  type?: DreamNodeType
  status?: DreamNodeStatus
  progress?: number
  dueDate?: string
}

export interface TreeView {
  id: string
  zoomedNodeId: string | null
  currentPath: string[]
  expandedNodes: Set<string>
  selectedNodes: Set<string>
}
