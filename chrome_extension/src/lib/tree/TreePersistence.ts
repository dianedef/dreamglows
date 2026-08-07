import type { TreeItem, TreeView } from './types'

export class TreePersistence {
  private key: string

  constructor(key: string = 'tree-store') {
    this.key = key
  }

  getStorage() {
    return {
      getItem: (key: string): string | null => {
        if ((window as any).__INITIAL_TREE_STORE_DATA__) {
          return (window as any).__INITIAL_TREE_STORE_DATA__
        }
        return null
      },
      setItem: (key: string, value: string): void => {
        chrome.storage.local.set({ [key]: value })
      }
    }
  }

  getSerializer() {
    return {
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

  getPersistOptions() {
    return {
      key: this.key,
      storage: this.getStorage(),
      serializer: this.getSerializer()
    }
  }
} 