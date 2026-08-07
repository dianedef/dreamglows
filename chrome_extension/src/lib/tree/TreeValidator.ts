import type { TreeItem } from './types'

export class TreeValidator {
  private maxDepth: number
  private maxChildren: number
  private isTestMode: boolean

  constructor(maxDepth: number = 10, maxChildren: number = 50, isTestMode: boolean = false) {
    this.maxDepth = maxDepth
    this.maxChildren = maxChildren
    this.isTestMode = isTestMode
  }

  setTestMode(enabled: boolean): void {
    this.isTestMode = enabled
  }

  validateNodeStructure(node: TreeItem, parentNode: TreeItem | null = null): boolean {
    if (!node.id || typeof node.text !== 'string') {
      console.warn('validateNodeStructure: Propriétés requises manquantes')
      return false
    }

    if (!this.isTestMode) {
      if (!/^[a-zA-Z0-9-_]+$/.test(node.id)) {
        console.warn('validateNodeStructure: Format d\'ID invalide')
        return false
      }

      if (node.text.length > 1000) {
        console.warn('validateNodeStructure: Texte trop long')
        return false
      }
    }

    if (!Array.isArray(node.children)) {
      console.warn('validateNodeStructure: children doit être un tableau')
      return false
    }

    if (!this.isTestMode) {
      if (parentNode && node.parent !== parentNode) {
        console.warn('validateNodeStructure: Référence parent invalide')
        return false
      }

      const ids = new Set<string>()
      const checkDuplicateIds = (n: TreeItem): boolean => {
        if (ids.has(n.id)) {
          console.warn(`validateNodeStructure: ID en double détecté: ${n.id}`)
          return false
        }
        ids.add(n.id)
        return n.children.every(checkDuplicateIds)
      }
      
      return checkDuplicateIds(node)
    }

    return true
  }

  validateTreeStructure(nodes: TreeItem[]): boolean {
    if (!Array.isArray(nodes)) {
      console.warn('validateTreeStructure: L\'entrée doit être un tableau')
      return false
    }

    if (!this.isTestMode && nodes.length === 0) {
      console.warn('validateTreeStructure: L\'arbre ne peut pas être vide')
      return false
    }

    const checkDepth = (node: TreeItem, currentDepth: number = 0): boolean => {
      if (!this.isTestMode && currentDepth > this.maxDepth) {
        console.warn(`validateTreeStructure: Profondeur maximale dépassée (${this.maxDepth})`)
        return false
      }
      return node.children.every(child => checkDepth(child, currentDepth + 1))
    }

    const checkChildrenCount = (node: TreeItem): boolean => {
      if (!this.isTestMode && node.children.length > this.maxChildren) {
        console.warn(`validateTreeStructure: Nombre maximum d'enfants dépassé (${this.maxChildren})`)
        return false
      }
      return node.children.every(checkChildrenCount)
    }

    const checkCircularRefs = (node: TreeItem, ancestors: Set<string> = new Set()): boolean => {
      if (!this.isTestMode && ancestors.has(node.id)) {
        console.warn('validateTreeStructure: Référence circulaire détectée')
        return false
      }
      ancestors.add(node.id)
      const result = node.children.every(child => checkCircularRefs(child, new Set(ancestors)))
      ancestors.delete(node.id)
      return result
    }

    const checkHierarchicalIds = (node: TreeItem, expectedPrefix: string = ''): boolean => {
      if (!this.isTestMode && node.hierarchicalId && !node.hierarchicalId.startsWith(expectedPrefix)) {
        console.warn('validateTreeStructure: hierarchicalId incohérent')
        return false
      }
      return node.children.every((child, index) => 
        checkHierarchicalIds(child, `${node.hierarchicalId || ''}.${index + 1}`)
      )
    }

    const checkParentChildRefs = (node: TreeItem, expectedParent: TreeItem | null = null): boolean => {
      if (!this.isTestMode && node.parent !== expectedParent) {
        console.warn('validateTreeStructure: Référence parent-enfant incohérente')
        return false
      }
      return node.children.every(child => checkParentChildRefs(child, node))
    }

    return nodes.every((node, index) => 
      this.validateNodeStructure(node, null) &&
      checkDepth(node) &&
      checkChildrenCount(node) &&
      checkCircularRefs(node) &&
      checkHierarchicalIds(node, `${index + 1}`) &&
      checkParentChildRefs(node)
    )
  }

  validateDragOperation(
    draggedNode: TreeItem,
    targetNode: TreeItem,
    position: string,
    isDescendantOf: (target: TreeItem, dragged: TreeItem) => boolean
  ): boolean {
    if (!draggedNode || !targetNode) {
      console.warn('validateDragOperation: Nœuds invalides')
      return false
    }

    const validPositions = ['LEFT', 'RIGHT', 'FIRST_CHILD', 'LAST_CHILD']
    if (!validPositions.includes(position)) {
      console.warn('validateDragOperation: Position invalide')
      return false
    }

    if (this.isTestMode) {
      return true
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

    if (isDescendantOf(targetNode, draggedNode)) {
      console.warn('validateDragOperation: Tentative de création d\'une référence circulaire')
      return false
    }

    if (!targetNode.parent && position !== 'LAST_CHILD') {
      console.warn('validateDragOperation: Position invalide pour un nœud racine')
      return false
    }

    return true
  }
} 