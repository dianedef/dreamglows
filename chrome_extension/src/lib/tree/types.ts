export interface TreeItem {
  id: string
  text: string
  children: TreeItem[]
  parent?: TreeItem | null
  hierarchicalId?: string
  isChecked?: boolean
}

export interface TreeView {
  id: string
  zoomedNodeId: string | null
  currentPath: string[]
  expandedNodes: Set<string>
  selectedNodes: Set<string>
} 