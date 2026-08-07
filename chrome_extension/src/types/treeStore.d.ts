import type { TreeItem, MoveMutation } from '@/components/vue-tree-dnd-main/env'

export interface TreeView {
  zoomedNodeId: string | null;
  currentPath: string[];
  expandedNodes: Set<string>;
  selectedNodes: Set<string>;
}

export interface TreeStore {
  treeData: TreeItem[];
  treeViews: Map<string, TreeView>;
  
  // Méthodes
  createTreeView: (viewId: string) => TreeView;
  getTreeView: (viewId: string) => TreeView | undefined;
  deleteTreeView: (viewId: string) => void;
  zoomTreeView: (viewId: string, nodeId: string) => void;
  resetTreeViewZoom: (viewId: string) => void;
  setNodeExpanded: (viewId: string, nodeId: string, expanded: boolean) => void;
  findNodeById: (nodes: TreeItem[], id: string) => TreeItem | null;
  addNode: (parentId: string, newNode: Partial<TreeItem>) => void;
  removeNode: (id: string) => TreeItem | null;
  updateNode: (nodeId: string, updates: Partial<TreeItem>) => void;
  moveNode: (mutation: MoveMutation) => void;
  getViewData: (viewId: string) => TreeItem[];
  isNodeExpanded: (viewId: string, nodeId: string) => boolean;
  saveToLocalStorage: () => void;
  loadFromLocalStorage: () => void;
  initializeStore: (initialData: TreeItem[]) => void;
} 