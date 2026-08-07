import { defineStore } from 'pinia'
import type { PiniaPluginContext } from 'pinia'
import persistedState from 'pinia-plugin-persistedstate'
import type { MoveMutation } from '@/components/vue-tree-dnd-main/env'
import type { StateTree } from 'pinia'
import { TreeValidator, TreeOperations, TreeUtils, TreePersistence } from '@/lib/tree'
import type { TreeItem, TreeView } from '@/lib/tree/types'
import { TreeEventManager } from '@/lib/tree/TreeEvents'
import { TreeHistory } from '@/lib/tree/TreeHistory'
import { TreePerformance } from '@/lib/tree/TreePerformance'
import { TreeInteractions } from '@/lib/tree/TreeInteractions'

interface TreeState extends StateTree {
  treeDataRef: TreeItem[]
  treeViews: Record<string, TreeView>
  nodeIndex: Map<string, { node: TreeItem; parent?: TreeItem }>
  maxDepth: number
  maxChildren: number
  validator: TreeValidator
  eventManager: TreeEventManager
  history: TreeHistory
  performance: TreePerformance
  interactions: TreeInteractions
}

interface TreeStoreActions {
  findNodeById(nodes: TreeItem[], id: string): TreeItem | null
  findNodeAndPath(nodes: TreeItem[], targetId: string, path?: TreeItem[]): { node: TreeItem, path: TreeItem[] } | null
  createTreeView(viewId: string): TreeView
  getTreeView(viewId: string): TreeView | undefined
  deleteTreeView(viewId: string): void
  zoomTreeView(viewId: string, nodeId: string): void
  resetTreeViewZoom(viewId: string): void
  setNodeExpanded(viewId: string, nodeId: string, expanded: boolean): void
  getViewData(viewId: string): TreeItem[]
  isNodeExpanded(viewId: string, nodeId: string): boolean
  addNode(parentId: string, newNode: Partial<TreeItem>): void
  updateNode(nodeId: string, updates: Partial<TreeItem>): void
  removeNodeFromTree(nodes: TreeItem[], id: string): TreeItem | null
  removeNode(id: string): TreeItem | null
  isDescendantOf(targetNode: TreeItem, draggedNode: TreeItem): boolean
  moveNode(mutation: MoveMutation): void
  initializeStore(initialData: TreeItem[], isTestMode: boolean): void
  getNodePath(nodeId: string | null): TreeItem[]
  duplicateNode(sourceId: string, newNode: TreeItem): void
  findParentNode(nodes: TreeItem[], nodeId: string): TreeItem | null
  updateHierarchicalIds(nodes: TreeItem[], parentId: string): void
}

export const useTreeStore = defineStore('tree', {
  state: (): TreeState => ({
    treeDataRef: [],
    treeViews: {},
    nodeIndex: new Map(),
    maxDepth: 10,
    maxChildren: 50,
    validator: new TreeValidator(10, 50),
    eventManager: new TreeEventManager(),
    history: new TreeHistory(),
    performance: new TreePerformance(),
    interactions: new TreeInteractions()
  }),

  getters: {
    treeData(): TreeItem[] {
      return this.treeDataRef
    }
  },

  actions: {
    createTreeView(viewId: string): TreeView {
      const view: TreeView = {
        id: viewId,
        zoomedNodeId: null,
        currentPath: [],
        expandedNodes: new Set<string>(),
        selectedNodes: new Set<string>()
      }
      this.$state.treeViews[viewId] = view
      return view
    },

    findNodeById(nodes: TreeItem[], id: string): TreeItem | null {
      for (const node of nodes) {
        if (node.id === id) return node
        if (node.children?.length) {
          const found = this.findNodeById(node.children, id)
          if (found) return found
        }
      }
      return null
    },

    findNodeAndPath(nodes: TreeItem[], targetId: string, path: TreeItem[] = []): { node: TreeItem, path: TreeItem[] } | null {
      for (const node of nodes) {
        const newPath = [...path, node]
        if (node.id === targetId) {
          return { node, path: newPath }
        }
        
        if (node.children?.length) {
          const found = this.findNodeAndPath(node.children, targetId, newPath)
          if (found) {
            return found
          }
        }
      }
      return null
    },

    getTreeView(viewId: string): TreeView | undefined {
      return this.$state.treeViews[viewId]
    },

    deleteTreeView(viewId: string): void {
      delete this.$state.treeViews[viewId]
    },

    zoomTreeView(viewId: string, nodeId: string): void {
      const view = this.$state.treeViews[viewId]
      if (!view) return

      const result = this.findNodeAndPath(this.$state.treeDataRef, nodeId)
      if (!result) return

      result.path.forEach(node => {
        this.setNodeExpanded(viewId, node.id, true)
      })

      view.currentPath = result.path.map(node => node.id)
      view.zoomedNodeId = nodeId
      this.eventManager.onNodeZoom(nodeId)
    },

    resetTreeViewZoom(viewId: string): void {
      const view = this.$state.treeViews[viewId]
      if (!view) return

      view.zoomedNodeId = null
      view.currentPath = []
    },

    setNodeExpanded(viewId: string, nodeId: string, expanded: boolean): void {
      const view = this.$state.treeViews[viewId]
      if (!view) return

      if (expanded) {
        view.expandedNodes.add(nodeId)
      } else {
        view.expandedNodes.delete(nodeId)
      }
      this.eventManager.onNodeExpand(nodeId, expanded)
    },

    getViewData(viewId: string): TreeItem[] {
      const view = this.$state.treeViews[viewId]
      if (!view) {
        return [...this.$state.treeDataRef]
      }

      if (view.zoomedNodeId) {
        const zoomedNode = this.findNodeById(this.$state.treeDataRef, view.zoomedNodeId)
        if (!zoomedNode) {
          return [...this.$state.treeDataRef]
        }
        return [{ ...zoomedNode }]
      }

      return [...this.$state.treeDataRef]
    },

    isNodeExpanded(viewId: string, nodeId: string): boolean {
      const view = this.$state.treeViews[viewId]
      if (!view) return false
      return view.expandedNodes.has(nodeId)
    },

    addNode(parentId: string, newNode: Partial<TreeItem>): void {
      const startTime = performance.now()
      try {
        const parent = this.findNodeById(this.treeDataRef, parentId)
        if (!parent) {
          console.warn('addNode: Parent non trouvé')
          return
        }

        if (parent.children.length >= this.maxChildren) {
          console.warn(`addNode: Nombre maximum d'enfants atteint (${this.maxChildren})`)
          return
        }

        const node: TreeItem = this.sanitizeNode({
          id: crypto.randomUUID(),
          text: newNode.text || 'Nouveau nœud',
          children: [],
          ...newNode,
        })

        if (!this.validateNodeStructure(node)) {
          console.warn('addNode: Structure du nouveau nœud invalide')
          return
        }

        parent.children.push(node)
        this.updateHierarchicalIds(this.treeDataRef, '')
        this.treeDataRef = [...this.treeDataRef]
        
        this.history.pushState(this.treeDataRef, {
          type: 'add',
          nodeId: parentId,
          data: newNode
        })
        
        this.performance.trackOperation({
          type: 'add',
          nodeId: parentId,
          data: newNode
        }, startTime)
        
        this.eventManager.onNodeAdd(parentId, newNode)
      } catch (error) {
        console.error('addNode: Erreur lors de l\'ajout', error)
      }
    },

    updateNode(nodeId: string, updates: Partial<TreeItem>): void {
      const node = this.findNodeById(this.$state.treeDataRef, nodeId)
      if (node) {
        Object.assign(node, updates)
        this.eventManager.onNodeUpdate(nodeId, updates)
      }
    },

    removeNodeFromTree(nodes: TreeItem[], id: string): TreeItem | null {
      for (let i = 0; i < nodes.length; i++) {
        if (nodes[i].id === id) {
          const [removed] = nodes.splice(i, 1)
          return removed
        }
        if (nodes[i].children?.length) {
          const found = this.removeNodeFromTree(nodes[i].children, id)
          if (found) return found
        }
      }
      return null
    },

    removeNode(id: string): TreeItem | null {
      const startTime = performance.now()
      try {
        const removed = this.removeNodeFromTree(this.$state.treeDataRef, id)
        if (removed) {
          this.history.pushState(this.treeDataRef, {
            type: 'remove',
            nodeId: id
          })
          
          this.performance.trackOperation({
            type: 'remove',
            nodeId: id
          }, startTime)
          
          this.eventManager.onNodeRemove(id)
        }
        return removed
      } catch (error) {
        console.error('removeNode: Erreur lors de la suppression', error)
        return null
      }
    },

    isDescendantOf(targetNode: TreeItem, draggedNode: TreeItem): boolean {
      let current = targetNode
      while (current.parent) {
        if (current.parent.id === draggedNode.id) return true
        current = current.parent
      }
      return false
    },

    moveNode(mutation: MoveMutation): void {
      const startTime = performance.now()
      if (!mutation.id || !mutation.targetId) {
        console.warn('moveNode: IDs manquants')
        return
      }

      const draggedNode = this.findNodeById(this.treeDataRef, mutation.id)
      const targetNode = this.findNodeById(this.treeDataRef, mutation.targetId)

      if (!draggedNode || !targetNode) {
        console.warn('moveNode: Nœuds non trouvés')
        return
      }

      if (!this.validator.validateDragOperation(draggedNode, targetNode, mutation.position, this.isDescendantOf)) {
        console.warn('moveNode: Opération de déplacement invalide')
        return
      }

      const previousState = [...this.treeDataRef]

      try {
        const nodeCopy = { ...draggedNode }

        if (!mutation.targetId) {
          if (mutation.position !== 'LAST_CHILD') {
            console.warn('moveNode: Position invalide pour un déplacement à la racine')
            return
          }

          const movedNode = this.removeNode(mutation.id)
          if (!movedNode) return

          const isAlreadyRoot = this.$state.treeDataRef.some(node => node.id === mutation.id)
          if (isAlreadyRoot) {
            console.warn('moveNode: Le nœud est déjà à la racine')
            return
          }

          movedNode.parent = null
          movedNode.children = nodeCopy.children
          this.reconstructParents([movedNode])
          this.$state.treeDataRef = [...this.$state.treeDataRef, movedNode]
          
          this.updateHierarchicalIds(this.$state.treeDataRef, '')
          this.history.pushState(this.treeDataRef, {
            type: 'move',
            nodeId: mutation.id,
            data: mutation
          })
          this.performance.trackOperation({
            type: 'move',
            nodeId: mutation.id,
            data: mutation
          }, startTime)
          this.eventManager.onNodeMove(mutation)
          return
        }

        const targetNode = this.findNodeById(this.$state.treeDataRef, mutation.targetId)
        if (!targetNode) {
          console.warn(`moveNode: Nœud cible ${mutation.targetId} non trouvé`)
          return
        }

        if (mutation.id === mutation.targetId) {
          console.warn('moveNode: Impossible de déplacer un nœud vers lui-même')
          return
        }

        if (this.isDescendantOf(targetNode, draggedNode)) {
          console.warn('moveNode: Impossible de déplacer un nœud vers un de ses descendants')
          return
        }

        const movedNode = this.removeNode(mutation.id)
        if (!movedNode) {
          console.warn('moveNode: Échec de la suppression du nœud source')
          return
        }

        movedNode.children = nodeCopy.children

        const reconstructParents = (nodes: TreeItem[], parent: TreeItem | null = null): void => {
          nodes.forEach(node => {
            node.parent = parent
            if (node.children?.length > 0) {
              reconstructParents(node.children, node)
            }
          })
        }

        switch (mutation.position) {
          case 'LEFT':
          case 'RIGHT': {
            const parentNode = targetNode.parent || { 
              id: 'root', 
              text: 'root', 
              children: this.$state.treeDataRef,
              parent: null,
              hierarchicalId: ''
            } as TreeItem

            const index = parentNode.children.indexOf(targetNode) + (mutation.position === 'RIGHT' ? 1 : 0)
            
            movedNode.parent = parentNode
            reconstructParents(movedNode.children, movedNode)
            
            parentNode.children.splice(index, 0, movedNode)

            if (parentNode.id === 'root') {
              this.$state.treeDataRef = [...parentNode.children]
            }
            
            this.updateHierarchicalIds(this.$state.treeDataRef, '')
            break
          }
          
          case 'FIRST_CHILD':
          case 'LAST_CHILD': {
            if (!targetNode.children) targetNode.children = []
            
            const getDepth = (node: TreeItem): number => {
              return 1 + Math.max(0, ...(node.children?.map(getDepth) || []))
            }
            const maxDepth = 10
            if (getDepth(draggedNode) + getDepth(targetNode) > maxDepth) {
              console.warn('moveNode: Profondeur maximale dépassée')
              return
            }
            
            movedNode.parent = targetNode
            reconstructParents(movedNode.children, movedNode)
            
            if (mutation.position === 'FIRST_CHILD') {
              targetNode.children.unshift(movedNode)
            } else {
              targetNode.children.push(movedNode)
            }
            
            this.updateHierarchicalIds(this.$state.treeDataRef, '')
            break
          }
          
          default:
            console.warn(`moveNode: Position invalide ${mutation.position}`)
            return
        }

        reconstructParents(this.$state.treeDataRef)

        if (!this.validateTreeStructure(this.$state.treeDataRef)) {
          throw new Error('Structure de l\'arbre invalide après le déplacement')
        }

        this.updateHierarchicalIds(this.$state.treeDataRef, '')
        this.history.pushState(this.treeDataRef, {
          type: 'move',
          nodeId: mutation.id,
          data: mutation
        })
        this.performance.trackOperation({
          type: 'move',
          nodeId: mutation.id,
          data: mutation
        }, startTime)
        this.eventManager.onNodeMove(mutation)
      } catch (error) {
        console.error('moveNode: Erreur lors du déplacement', error)
        this.$state.treeDataRef = previousState
      }
    },

    initializeStore(initialData: TreeItem[], isTestMode: boolean = false): void {
      if (isTestMode) {
        this.validator.setTestMode(true)
      }

      const sanitizedData = initialData.map(node => this.sanitizeNode(node))
      
      if (!this.validateTreeStructure(sanitizedData)) {
        console.error('initializeStore: Structure des données initiales invalide')
        return
      }

      const reconstructParents = (nodes: TreeItem[], parent: TreeItem | null = null): void => {
        nodes.forEach(node => {
          node.parent = parent
          if (node.children) {
            reconstructParents(node.children, node)
          }
        })
      }
      
      reconstructParents(sanitizedData)
      this.updateHierarchicalIds(sanitizedData, '')
      this.$state.treeDataRef = [...sanitizedData]
    },

    getNodePath(nodeId: string | null): TreeItem[] {
      if (!nodeId) {
        return this.$state.treeDataRef.length > 0 ? [this.$state.treeDataRef[0]] : []
      }
      
      const result = this.findNodeAndPath(this.$state.treeDataRef, nodeId)
      if (!result) {
        return this.$state.treeDataRef.length > 0 ? [this.$state.treeDataRef[0]] : []
      }
      
      result.path.forEach(node => {
        this.setNodeExpanded('update-view', node.id, true)
      })
      
      return result.path
    },

    duplicateNode(sourceId: string, newNode: TreeItem): void {
      const parent = this.findParentNode(this.$state.treeDataRef, sourceId)
      if (parent) {
        parent.children.push(newNode)
      } else {
        this.$state.treeDataRef.push(newNode)
      }
      
      this.updateHierarchicalIds(this.$state.treeDataRef)
    },

    findParentNode(nodes: TreeItem[], nodeId: string): TreeItem | null {
      for (const node of nodes) {
        if (node.children?.some(child => child.id === nodeId)) {
          return node
        }
        if (node.children) {
          const found = this.findParentNode(node.children, nodeId)
          if (found) return found
        }
      }
      return null
    },

    updateIndex(node: TreeItem, parent?: TreeItem) {
      this.nodeIndex.set(node.id, { node, parent })
      node.children?.forEach(child => this.updateIndex(child, node))
    },

    validateMutation(mutation: MoveMutation): boolean {
      const node = this.findNodeById(this.treeDataRef, mutation.id);
      const target = mutation.targetId ? this.findNodeById(this.treeDataRef, mutation.targetId) : null;
      
      return !!node && 
             (!target || !this.isDescendantOf(target, node)) &&
             node.id !== mutation.targetId;
    },

    updateHierarchicalIds(nodes: TreeItem[], parentId: string = ''): void {
      nodes.forEach((node, index) => {
        const currentIndex = index + 1
        const newHierarchicalId = parentId ? `${parentId}.${currentIndex}` : `${currentIndex}`
        node.hierarchicalId = newHierarchicalId
        
        if (node.children?.length > 0) {
          this.updateHierarchicalIds(node.children, newHierarchicalId)
        }
      })
    },

    reconstructParents(nodes: TreeItem[], parent: TreeItem | null = null): void {
      nodes.forEach(node => {
        node.parent = parent
        if (node.children?.length > 0) {
          this.reconstructParents(node.children, node)
        }
      })
    },

    validateNodeStructure(node: TreeItem, parentNode: TreeItem | null = null): boolean {
      return this.validator.validateNodeStructure(node, parentNode)
    },

    validateTreeStructure(nodes: TreeItem[]): boolean {
      return this.validator.validateTreeStructure(nodes)
    },

    sanitizeNode(node: TreeItem): TreeItem {
      return {
        id: node.id,
        text: String(node.text || '').slice(0, 1000),
        children: Array.isArray(node.children) ? node.children.map(child => this.sanitizeNode(child)) : [],
        hierarchicalId: node.hierarchicalId,
        isChecked: Boolean(node.isChecked)
      }
    },

    validateDragOperation(draggedNodeId: string, targetNodeId: string, position: string): boolean {
      if (!draggedNodeId || !targetNodeId) {
        console.warn('validateDragOperation: IDs invalides')
        return false
      }

      if (draggedNodeId === targetNodeId) {
        console.warn('validateDragOperation: Impossible de déplacer un nœud vers lui-même')
        return false
      }

      const draggedNode = this.findNodeById(this.treeDataRef, draggedNodeId)
      const targetNode = this.findNodeById(this.treeDataRef, targetNodeId)

      if (!draggedNode || !targetNode) {
        console.warn('validateDragOperation: Nœuds non trouvés')
        return false
      }

      const validPositions = ['LEFT', 'RIGHT', 'FIRST_CHILD', 'LAST_CHILD']
      if (!validPositions.includes(position)) {
        console.warn('validateDragOperation: Position invalide')
        return false
      }

      const getDepth = (node: TreeItem): number => {
        return 1 + Math.max(0, ...(node.children?.map(getDepth) || []))
      }

      const newDepth = position.includes('CHILD') 
        ? getDepth(draggedNode) + getDepth(targetNode)
        : getDepth(draggedNode) + (targetNode.parent ? getDepth(targetNode.parent) : 0)

      if (newDepth > this.maxDepth) {
        console.warn(`validateDragOperation: Profondeur maximale (${this.maxDepth}) dépassée`)
        return false
      }

      if (position.includes('CHILD')) {
        const futureChildrenCount = targetNode.children.length + draggedNode.children.length + 1
        if (futureChildrenCount > this.maxChildren) {
          console.warn(`validateDragOperation: Nombre maximum d'enfants (${this.maxChildren}) dépassé`)
          return false
        }
      }

      if (this.isDescendantOf(targetNode, draggedNode)) {
        console.warn('validateDragOperation: Tentative de création d\'une référence circulaire')
        return false
      }

      if (!targetNode.parent && position !== 'LAST_CHILD') {
        console.warn('validateDragOperation: Position invalide pour un nœud racine')
        return false
      }

      return true
    },

    undo(): void {
      const previousState = this.history.undo()
      if (previousState) {
        this.treeDataRef = previousState.treeData
      }
    },

    redo(): void {
      const nextState = this.history.redo()
      if (nextState) {
        this.treeDataRef = nextState.treeData
      }
    },

    trackTreeMetrics(): void {
      const countNodes = (nodes: TreeItem[]): number => {
        return nodes.reduce((count, node) => {
          return count + 1 + (node.children ? countNodes(node.children) : 0)
        }, 0)
      }

      const getMaxDepth = (nodes: TreeItem[]): number => {
        return nodes.reduce((maxDepth, node) => {
          if (!node.children?.length) return Math.max(maxDepth, 1)
          return Math.max(maxDepth, 1 + getMaxDepth(node.children))
        }, 0)
      }

      const nodeCount = countNodes(this.treeDataRef)
      const maxDepth = getMaxDepth(this.treeDataRef)
      
      this.performance.trackTreeMetrics(nodeCount, maxDepth)
    }
  },

  persist: {
    key: 'tree-store',
    storage: {
      getItem: (key: string): string | null => {
        if ((window as any).__INITIAL_TREE_STORE_DATA__) {
          return (window as any).__INITIAL_TREE_STORE_DATA__
        }
        return null
      },
      setItem: (key: string, value: string): void => {
        chrome.storage.local.set({ [key]: value })
      }
    },
    serializer: {
      deserialize: (value: string) => {
        const state = JSON.parse(value)
        
        if (state.treeViews) {
          Object.entries(state.treeViews).forEach(([key, view]: [string, any]) => {
            state.treeViews[key] = {
              ...view,
              expandedNodes: new Set(view.expandedNodes || []),
              selectedNodes: new Set(view.selectedNodes || [])
            }
          })
        }
        
        return state
      },
      serialize: (state: any) => {
        const serializedState = {
          ...state,
          treeViews: Object.fromEntries(
            Object.entries(state.treeViews).map(([key, view]: [string, any]) => {
              const serializedView = {
                ...view,
                expandedNodes: Array.from(view.expandedNodes),
                selectedNodes: Array.from(view.selectedNodes)
              }
              return [key, serializedView]
            })
          )
        }
        
        return JSON.stringify(serializedState)
      }
    }
  }
}) 