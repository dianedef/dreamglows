import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useTreeStore } from '../tree'
import type { TreeItem } from '@/components/vue-tree-dnd-main/env'

describe('Tree Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('initializes with empty tree data', () => {
    const store = useTreeStore()
    expect(store.treeData.value).toEqual([])
  })

  it('can initialize store with data', () => {
    const store = useTreeStore()
    const initialData: TreeItem[] = [{
      id: '1',
      text: 'Root',
      expanded: true,
      children: []
    }]
    store.initializeStore(initialData)
    expect(store.treeData.value).toEqual(initialData)
  })

  it('can add a node', () => {
    const store = useTreeStore()
    const initialData: TreeItem[] = [{
      id: '1',
      text: 'Root',
      expanded: true,
      children: []
    }]
    store.initializeStore(initialData)

    const newNode: TreeItem = {
      id: '2',
      text: 'New Node',
      expanded: false,
      children: []
    }
    store.addNode('1', newNode)
    expect(store.treeData.value[0].children).toContainEqual(newNode)
  })

  it('can remove a node', () => {
    const store = useTreeStore()
    const initialData: TreeItem[] = [{
      id: '1',
      text: 'Root',
      expanded: true,
      children: [{
        id: '2',
        text: 'Child',
        expanded: false,
        children: []
      }]
    }]
    store.initializeStore(initialData)
    store.removeNode('2')
    expect(store.treeData.value[0].children).toEqual([])
  })

  it('can toggle node expansion', () => {
    const store = useTreeStore()
    const initialData: TreeItem[] = [{
      id: '1',
      text: 'Root',
      expanded: false,
      children: []
    }]
    store.initializeStore(initialData)
    store.toggleNode('1')
    expect(store.treeData.value[0].expanded).toBe(true)
  })
}) 