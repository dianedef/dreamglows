import type { TreeItem } from './types'

export class TreeUtils {
  findNodeById(nodes: TreeItem[], id: string): TreeItem | null {
    for (const node of nodes) {
      if (node.id === id) return node
      if (node.children?.length) {
        const found = this.findNodeById(node.children, id)
        if (found) return found
      }
    }
    return null
  }

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
  }

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
  }

  sanitizeNode(node: TreeItem): TreeItem {
    return {
      id: node.id,
      text: String(node.text || '').slice(0, 1000),
      children: Array.isArray(node.children) ? node.children.map(child => this.sanitizeNode(child)) : [],
      hierarchicalId: node.hierarchicalId,
      isChecked: Boolean(node.isChecked)
    }
  }

  getNodePath(nodes: TreeItem[], nodeId: string | null): TreeItem[] {
    if (!nodeId) {
      return nodes.length > 0 ? [nodes[0]] : []
    }
    
    const result = this.findNodeAndPath(nodes, nodeId)
    if (!result) {
      return nodes.length > 0 ? [nodes[0]] : []
    }
    
    return result.path
  }
} 