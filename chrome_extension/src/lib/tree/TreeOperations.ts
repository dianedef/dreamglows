import type { TreeItem } from './types'
import type { MoveMutation } from '@/components/vue-tree-dnd-main/env'
import type { TreeValidator } from './TreeValidator'

export class TreeOperations {
  private validator: TreeValidator

  constructor(validator: TreeValidator) {
    this.validator = validator
  }

  cloneNode(node: TreeItem): TreeItem {
    return {
      ...node,
      children: node.children?.map(child => this.cloneNode(child)) || []
    }
  }

  reconstructParents(nodes: TreeItem[], parent: TreeItem | null = null): void {
    nodes.forEach(node => {
      node.parent = parent
      if (node.children?.length > 0) {
        this.reconstructParents(node.children, node)
      }
    })
  }

  updateHierarchicalIds(nodes: TreeItem[], parentId: string = ''): void {
    nodes.forEach((node, index) => {
      const currentIndex = index + 1
      const newHierarchicalId = parentId ? `${parentId}.${currentIndex}` : `${currentIndex}`
      node.hierarchicalId = newHierarchicalId
      
      if (node.children?.length > 0) {
        this.updateHierarchicalIds(node.children, newHierarchicalId)
      }
    })
  }

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
  }

  isDescendantOf(targetNode: TreeItem, draggedNode: TreeItem): boolean {
    let current = targetNode
    while (current.parent) {
      if (current.parent.id === draggedNode.id) return true
      current = current.parent
    }
    return false
  }

  moveNode(
    treeData: TreeItem[],
    { id, targetId, position }: MoveMutation,
    findNodeById: (nodes: TreeItem[], id: string) => TreeItem | null
  ): { success: boolean; newTreeData: TreeItem[] } {
    if (!id || !targetId) {
      console.warn('moveNode: IDs manquants')
      return { success: false, newTreeData: treeData }
    }

    const draggedNode = findNodeById(treeData, id)
    const targetNode = findNodeById(treeData, targetId)

    if (!draggedNode || !targetNode) {
      console.warn('moveNode: Nœuds non trouvés')
      return { success: false, newTreeData: treeData }
    }

    if (!this.validator.validateDragOperation(draggedNode, targetNode, position, this.isDescendantOf)) {
      console.warn('moveNode: Opération de déplacement invalide')
      return { success: false, newTreeData: treeData }
    }

    try {
      const newTreeData = [...treeData]
      const nodeCopy = this.cloneNode(draggedNode)
      const movedNode = this.removeNodeFromTree(newTreeData, id)

      if (!movedNode) {
        console.warn('moveNode: Échec de la suppression du nœud source')
        return { success: false, newTreeData: treeData }
      }

      movedNode.children = nodeCopy.children

      switch (position) {
        case 'LEFT':
        case 'RIGHT': {
          const parentNode = targetNode.parent || { 
            id: 'root', 
            text: 'root', 
            children: newTreeData,
            parent: null,
            hierarchicalId: ''
          } as TreeItem

          const index = parentNode.children.indexOf(targetNode) + (position === 'RIGHT' ? 1 : 0)
          
          movedNode.parent = parentNode
          this.reconstructParents(movedNode.children, movedNode)
          
          parentNode.children.splice(index, 0, movedNode)

          if (parentNode.id === 'root') {
            newTreeData.splice(0, newTreeData.length, ...parentNode.children)
          }
          break
        }
        
        case 'FIRST_CHILD':
        case 'LAST_CHILD': {
          if (!targetNode.children) targetNode.children = []
          
          movedNode.parent = targetNode
          this.reconstructParents(movedNode.children, movedNode)
          
          if (position === 'FIRST_CHILD') {
            targetNode.children.unshift(movedNode)
          } else {
            targetNode.children.push(movedNode)
          }
          break
        }
        
        default:
          console.warn(`moveNode: Position invalide ${position}`)
          return { success: false, newTreeData: treeData }
      }

      this.reconstructParents(newTreeData)
      this.updateHierarchicalIds(newTreeData, '')

      if (!this.validator.validateTreeStructure(newTreeData)) {
        throw new Error('Structure de l\'arbre invalide après le déplacement')
      }

      return { success: true, newTreeData }
    } catch (error) {
      console.error('moveNode: Erreur lors du déplacement', error)
      return { success: false, newTreeData: treeData }
    }
  }
} 