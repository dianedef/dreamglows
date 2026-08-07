import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useTreeStore } from '../treeStore'
import type { TreeItem } from '@/lib/tree/types'

describe('tree Store', () => {
  let store: ReturnType<typeof useTreeStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useTreeStore()
  })

  describe('initialisation', () => {
    it('démarre avec un arbre vide', () => {
      expect(store.treeData).toEqual([])
    })

    it('initialise correctement avec des données', () => {
      const initialData = [{
        id: '1',
        text: 'Root',
        children: [],
        parent: null,
        hierarchicalId: '1',
        isChecked: false
      }]
      store.initializeStore(initialData, true)
      expect(store.treeData).toEqual(initialData)
    })
  })

  describe('opérations CRUD', () => {
    const rootNode: TreeItem = {
      id: '1',
      text: 'Root',
      children: []
    }

    beforeEach(() => {
      store.initializeStore([rootNode], true)
    })

    it('ajoute un nœud correctement', () => {
      store.addNode('1', { text: 'Child', children: [] })
      expect(store.treeData[0].children).toHaveLength(1)
      expect(store.treeData[0].children[0].text).toBe('Child')
      expect(store.treeData[0].children[0].type).toBe('dream')
    })

    it('attribue le niveau sémantique suivant aux nouveaux enfants', () => {
      store.addNode('1', { id: 'dream', text: 'Mon rêve', type: 'dream', children: [] })
      store.addNode('dream', { id: 'objective', text: 'Mon objectif', children: [] })
      store.addNode('objective', { id: 'milestone', text: 'Mon jalon', children: [] })
      store.addNode('milestone', { id: 'task', text: 'Ma tâche', children: [] })

      expect(store.findNodeById(store.treeData, 'objective')?.type).toBe('objective')
      expect(store.findNodeById(store.treeData, 'milestone')?.type).toBe('milestone')
      expect(store.findNodeById(store.treeData, 'task')?.type).toBe('task')
    })

    it('ajoute un nœud avec des enfants', () => {
      store.addNode('1', { 
        text: 'Parent',
        children: [{
          id: '2',
          text: 'Child',
          children: []
        }]
      })
      
      const parent = store.findNodeById(store.treeData, store.treeData[0].children[0].id)
      expect(parent).toBeTruthy()
      expect(parent?.text).toBe('Parent')
      
      expect(parent?.children).toHaveLength(1)
      expect(parent?.children[0].text).toBe('Child')
    })

    it('supprime un nœud correctement', () => {
      store.addNode('1', { id: '2', text: 'Child', children: [] })
      const removed = store.removeNode('2')
      expect(removed).toBeTruthy()
      expect(store.findNodeById(store.treeData, '2')).toBeNull()
    })

    it('met à jour un nœud correctement', () => {
      store.addNode('1', { id: '2', text: 'Child', children: [] })
      store.updateNode('2', { text: 'Updated Child' })
      const updatedNode = store.findNodeById(store.treeData, '2')
      expect(updatedNode?.text).toBe('Updated Child')
    })

    it('déplace un nœud correctement', () => {
      store.addNode('1', { id: '2', text: 'Child 1', children: [] })
      store.addNode('1', { id: '3', text: 'Child 2', children: [] })
      store.moveNode({ id: '2', targetId: '1', position: 'LAST_CHILD' })
      const node = store.findNodeById(store.treeData, '2')
      expect(node?.text).toBe('Child 1')
    })
  })

  describe('gestion des vues', () => {
    it('crée une nouvelle vue', () => {
      const view = store.createTreeView('test-view')
      expect(view).toBeTruthy()
      expect(view.expandedNodes).toBeInstanceOf(Set)
    })

    it('gère correctement le zoom', () => {
      store.initializeStore([{
        id: '1',
        text: 'Root',
        children: [{
          id: '2',
          text: 'Child',
          children: []
        }]
      }], true)

      store.createTreeView('test-view')
      store.zoomTreeView('test-view', '2')
      
      const view = store.getTreeView('test-view')
      expect(view?.zoomedNodeId).toBe('2')
      expect(view?.currentPath).toContain('2')
    })

    it('gère correctement l\'expansion des nœuds', () => {
      store.initializeStore([{
        id: '1',
        text: 'Root',
        children: []
      }], true)

      store.createTreeView('test-view')
      store.setNodeExpanded('test-view', '1', true)
      
      const view = store.getTreeView('test-view')
      expect(view?.expandedNodes.has('1')).toBe(true)
    })
  })
})
