import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useTreeStore } from '../treeStore'
import type { TreeItem } from '@/lib/tree/types'

describe('tree Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('initializes with empty tree data', () => {
    const store = useTreeStore()
    expect(store.treeData).toEqual([])
  })

  it('can initialize store with data', () => {
    const store = useTreeStore()
    const initialData: TreeItem[] = [{
      id: '1',
      text: 'Root',
      children: []
    }]
    store.initializeStore(initialData, true)
    expect(store.treeData).toEqual(initialData)
  })

  it('can add a node', () => {
    const store = useTreeStore()
    const initialData: TreeItem[] = [{
      id: '1',
      text: 'Root',
      children: []
    }]
    store.initializeStore(initialData, true)

    const newNode: TreeItem = {
      id: '2',
      text: 'New Node',
      children: []
    }
    store.addNode('1', newNode)
    expect(store.treeData[0].children[0]).toMatchObject({ text: newNode.text })
  })

  it('can remove a node', () => {
    const store = useTreeStore()
    const initialData: TreeItem[] = [{
      id: '1',
      text: 'Root',
      children: [{
        id: '2',
        text: 'Child',
        children: []
      }]
    }]
    store.initializeStore(initialData, true)
    store.removeNode('2')
    expect(store.treeData[0].children).toEqual([])
  })

  it('can toggle node expansion in a view', () => {
    const store = useTreeStore()
    const initialData: TreeItem[] = [{
      id: '1',
      text: 'Root',
      children: []
    }]
    store.initializeStore(initialData, true)
    store.createTreeView('test-view')
    store.setNodeExpanded('test-view', '1', true)
    expect(store.isNodeExpanded('test-view', '1')).toBe(true)
  })
})
