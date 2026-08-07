import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { markRaw } from 'vue'
import VueTreeDnd from '../VueTreeDnd.vue'
import TreeNode from '../TreeNode.vue'
import type { TreeItem } from '../env'
import TreeNodeContent from '@/components/TreeNodeContent.vue'

const defaultProps = {
  modelValue: [] as TreeItem[],
  component: markRaw(TreeNodeContent),
  locked: false,
  view: {
    id: 'test-view',
    zoomedNodeId: null,
    currentPath: [],
    expandedNodes: new Set<string>(),
    selectedNodes: new Set<string>()
  }
}

// Mock du store avec des espions (spies)
const mockHandleDragStart = vi.fn()
const mockHandleDrop = vi.fn()
const mockSelectNode = vi.fn()
const mockToggleNodeExpansion = vi.fn()

vi.mock('@/stores/treeStore', () => ({
  useTreeStore: () => ({
    interactions: {
      drag$: { pipe: () => ({ subscribe: vi.fn() }) },
      selection$: { pipe: () => ({ subscribe: vi.fn() }) },
      view$: { pipe: () => ({ subscribe: vi.fn() }) },
      handleDragStart: mockHandleDragStart,
      handleDragOver: vi.fn(),
      handleDrop: mockHandleDrop,
      selectNode: mockSelectNode,
      toggleNodeExpansion: mockToggleNodeExpansion,
      zoomToNode: vi.fn()
    }
  })
}))

describe('vueTreeDnd', () => {
  let wrapper: ReturnType<typeof mount>

  beforeEach(() => {
    setActivePinia(createPinia())
    wrapper = mount(VueTreeDnd, {
      props: defaultProps,
      global: {
        components: {
          TreeNode,
          TreeNodeContent
        },
        provide: {
          viewId: 'test-view'
        }
      }
    })
  })

  it('monte correctement avec les props par défaut', () => {
    expect(wrapper.exists()).toBe(true)
    expect(wrapper.props()).toEqual(defaultProps)
  })

  it('affiche correctement une liste vide', () => {
    expect(wrapper.find('div').exists()).toBe(true)
    expect(wrapper.findAll('[data-test="tree-node"]')).toHaveLength(0)
  })

  describe('affichage des nœuds', () => {
    const sampleData: TreeItem[] = [{
      id: '1',
      text: 'Node 1',
      children: [{
        id: '2',
        text: 'Child 1',
        children: []
      }]
    }]

    it('affiche correctement la hiérarchie des nœuds', async () => {
      await wrapper.setProps({
        modelValue: sampleData,
        view: {
          id: 'test-view',
          zoomedNodeId: null,
          currentPath: [],
          expandedNodes: new Set(['1']),
          selectedNodes: new Set()
        }
      })

      // Attendre que le DOM soit mis à jour
      await wrapper.vm.$nextTick()

      // Trouver les nœuds de texte
      const nodes = wrapper.findAll('.node-text')
      expect(nodes).toHaveLength(2)
      expect(nodes[0].text()).toBe('Node 1')
      expect(nodes[1].text()).toBe('Child 1')

      // Vérifier que le deuxième nœud est bien un enfant du premier
      const firstNode = wrapper.findComponent(TreeNode)
      expect(firstNode.props('item')).toMatchObject({
        id: '1',
        text: 'Node 1',
        children: [{
          id: '2',
          text: 'Child 1',
          children: []
        }]
      })
    })

    it('gère correctement l\'état expanded', async () => {
      await wrapper.setProps({
        modelValue: sampleData,
        view: {
          id: 'test-view',
          zoomedNodeId: null,
          currentPath: [],
          expandedNodes: new Set(['1']),
          selectedNodes: new Set()
        }
      })

      // Attendre que le DOM soit mis à jour
      await wrapper.vm.$nextTick()

      // Trouver le composant TreeNodeContent
      const treeNodeContent = wrapper.findComponent(TreeNodeContent)
      expect(treeNodeContent.exists()).toBe(true)
      expect(treeNodeContent.props('expanded')).toBe(true)

      // Vérifier que les enfants sont visibles
      const childNodes = wrapper.findAll('.node-text')
      expect(childNodes).toHaveLength(2)
      expect(childNodes[1].text()).toBe('Child 1')
    })

    it('affiche le bouton toggle pour les nœuds avec enfants', async () => {
      // Créer un nœud avec des enfants
      const nodeWithChildren = {
        id: '1',
        text: 'Parent',
        children: [{
          id: '2',
          text: 'Child',
          children: []
        }]
      }

      await wrapper.setProps({
        modelValue: [nodeWithChildren],
        component: TreeNodeContent,
        view: {
          id: 'test-view',
          zoomedNodeId: null,
          currentPath: [],
          expandedNodes: new Set(),
          selectedNodes: new Set()
        }
      })

      // Attendre que le DOM soit mis à jour
      await wrapper.vm.$nextTick()

      // Trouver le toggle span dans le TreeNodeContent
      const toggleSpan = wrapper.find('.tree-toggle')
      expect(toggleSpan.exists()).toBe(true)

      // Vérifier que l'icône de toggle est présente
      const toggleIcon = toggleSpan.find('.toggle-icon')
      expect(toggleIcon.exists()).toBe(true)
    })
  })

  describe('interactions', () => {
    it('émet update:modelValue lors d\'une opération de drag & drop', async () => {
      const nodes = [
        {
          id: '1',
          text: 'Node 1',
          children: []
        },
        {
          id: '2',
          text: 'Node 2',
          children: []
        }
      ]

      await wrapper.setProps({
        modelValue: nodes,
        component: TreeNodeContent,
        view: {
          id: 'test-view',
          zoomedNodeId: null,
          currentPath: [],
          expandedNodes: new Set(),
          selectedNodes: new Set()
        }
      })

      // Attendre que le DOM soit mis à jour
      await wrapper.vm.$nextTick()

      // Trouver les nœuds
      const firstNode = wrapper.find('[data-node-id="1"]')
      const secondNode = wrapper.find('[data-node-id="2"]')

      expect(firstNode.exists()).toBe(true)
      expect(secondNode.exists()).toBe(true)

      // Simuler le dragstart sur le premier nœud
      await firstNode.trigger('dragstart', {
        dataTransfer: {
          setData: () => {},
          effectAllowed: 'move',
          dropEffect: 'move',
          setDragImage: () => {}
        },
        clientX: 0,
        preventDefault: () => {}
      })

      // Attendre que le dragstart soit traité
      await new Promise(resolve => setTimeout(resolve, 0))

      // Simuler le dragover global
      const dragOverEvent = new Event('dragover')
      Object.defineProperty(dragOverEvent, 'clientX', { value: 40 })
      Object.defineProperty(dragOverEvent, 'preventDefault', { value: () => {} })
      document.dispatchEvent(dragOverEvent)

      // Simuler le dragover sur le nœud
      await secondNode.trigger('dragover', {
        clientX: 40,
        offsetY: 10,
        preventDefault: () => {}
      })

      await wrapper.vm.$nextTick()

      // Simuler le drop
      await wrapper.trigger('dragend')

      // Attendre que Vue mette à jour le DOM
      await wrapper.vm.$nextTick()

      // Vérifier que l'événement a été émis
      const updateEvents = wrapper.emitted('update:modelValue')
      console.log('Événements émis:', wrapper.emitted())
      expect(updateEvents).toBeTruthy()
      if (updateEvents) {
        expect(updateEvents[0][0]).toEqual([
          { id: '2', text: 'Node 2', children: [{ id: '1', text: 'Node 1', children: [] }] }
        ])
      }
    })

    it('désactive le drag & drop quand locked est true', async () => {
      const node = {
        id: '1',
        text: 'Node 1',
        children: []
      }

      await wrapper.setProps({
        modelValue: [node],
        locked: true,
        view: {
          id: 'test-view',
          zoomedNodeId: null,
          currentPath: [],
          expandedNodes: new Set<string>(),
          selectedNodes: new Set<string>()
        }
      })

      const treeNode = wrapper.find('[data-test="tree-node"]')
      expect(treeNode.attributes('draggable')).toBeFalsy()
    })
  })

  describe('rendu personnalisé', () => {
    it('utilise le composant spécifié dans les props', async () => {
      const node = {
        id: '1',
        text: 'Test Node',
        children: []
      }

      await wrapper.setProps({
        component: 'section',
        modelValue: [node]
      })

      const treeNode = wrapper.findComponent(TreeNode)
      expect(treeNode.props('component')).toBe('section')
    })
  })

  describe('interactions avec le store', () => {
    it('appelle handleDragStart du store lors du début du drag', async () => {
      const node = {
        id: '1',
        text: 'Test Node',
        children: []
      }

      await wrapper.setProps({
        modelValue: [node]
      })

      const treeNode = wrapper.find('[data-node-id="1"]')
      await treeNode.trigger('dragstart')

      expect(mockHandleDragStart).toHaveBeenCalledWith('1')
    })

    it('appelle selectNode du store lors du clic sur un nœud', async () => {
      const node = {
        id: '1',
        text: 'Test Node',
        children: []
      }

      await wrapper.setProps({
        modelValue: [node],
        view: {
          id: 'test-view',
          zoomedNodeId: null,
          currentPath: [],
          expandedNodes: new Set(),
          selectedNodes: new Set()
        }
      })

      const treeNode = wrapper.find('[data-node-id="1"]')
      await treeNode.trigger('click')

      expect(mockSelectNode).toHaveBeenCalledWith('test-view', '1', false)
    })

    it('appelle toggleNodeExpansion du store lors du clic sur le toggle', async () => {
      const node = {
        id: '1',
        text: 'Parent Node',
        children: [{
          id: '2',
          text: 'Child Node',
          children: []
        }]
      }

      await wrapper.setProps({
        modelValue: [node]
      })

      const toggleButton = wrapper.find('.tree-toggle')
      await toggleButton.trigger('click')

      expect(mockToggleNodeExpansion).toHaveBeenCalledWith('test-view', '1', true)
    })
  })
}) 