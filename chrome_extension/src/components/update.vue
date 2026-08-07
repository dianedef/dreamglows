<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, toRaw, watch, nextTick } from 'vue'
import VueTreeDnd from './vue-tree-dnd-main/VueTreeDnd.vue'
import type { TreeItem, MoveMutation } from './vue-tree-dnd-main/env'
import Changelog from './Changelog.vue'
import TreeNodeContent from './TreeNodeContent.vue'
import { useTreeStore } from '../stores/treeStore'
import type { TreeView } from '../stores/treeStore'
import { useHighlight } from '../composables/useHighlight'
import Settings from './Settings.vue'

const displayName = __DISPLAY_NAME__
const version = __VERSION__

const store = useTreeStore()
const VIEW_ID = 'update-view'

// État de la vue actuelle
const currentView = ref<TreeView | undefined>(undefined)

// État des modes
const isHighlightMode = ref(false)
const isReferenceMode = ref(false)
const isContentMode = ref(false)

const { createHighlight } = useHighlight()

// Gestionnaire de sélection de texte
const handleTextSelection = () => {
  if (!isHighlightMode.value) return
  
  const selection = window.getSelection()
  if (selection) {
    const highlight = createHighlight(selection)
    if (highlight) {
      selection.removeAllRanges()
    }
  }
}

// Toggle des différents modes
const toggleHighlightMode = () => {
  isHighlightMode.value = !isHighlightMode.value
  if (isHighlightMode.value) {
    isReferenceMode.value = false
    isContentMode.value = false
  }
}

const toggleReferenceMode = () => {
  isReferenceMode.value = !isReferenceMode.value
  if (isReferenceMode.value) {
    isHighlightMode.value = false
    isContentMode.value = false
  }
}

const toggleContentMode = () => {
  isContentMode.value = !isContentMode.value
  if (isContentMode.value) {
    isHighlightMode.value = false
    isReferenceMode.value = false
  }
}

// Gestion des événements globaux
onMounted(() => {
  document.addEventListener('mouseup', handleTextSelection)
})

onUnmounted(() => {
  document.removeEventListener('mouseup', handleTextSelection)
})

// S'assurer que la vue est toujours synchronisée
watch(() => store.getTreeView(VIEW_ID), (newView) => {
  if (newView) {
    currentView.value = {
      ...newView,
      expandedNodes: newView.expandedNodes,
      selectedNodes: newView.selectedNodes
    }
  }
}, { deep: true, immediate: true })

// Chemin actuel pour les breadcrumbs
const currentPath = computed(() => {
  const view = currentView.value
  if (!view) {
    return store.treeDataRef.length > 0 ? [store.treeDataRef[0]] : []
  }

  if (!view.zoomedNodeId) {
    return store.treeDataRef.length > 0 ? [store.treeDataRef[0]] : []
  }

  const result = store.findNodeAndPath(store.treeDataRef, view.zoomedNodeId)
  if (!result) {
    return store.treeDataRef.length > 0 ? [store.treeDataRef[0]] : []
  }

  return result.path
})

// Données de l'arbre à afficher (filtrées selon le zoom)
const displayedData = computed({
  get: () => {
    const data = store.getViewData(VIEW_ID)
    // Si on a des données et que le premier nœud est Root, on affiche ses enfants
    if (data.length > 0 && data[0].text === 'Root') {
      return data[0].children || []
    }
    return data
  },
  set: (value) => {
    // Quand on met à jour les données, on les remet sous le nœud Root
    store.initializeStore([{
      id: '1',
      text: 'Root',
      children: value
    }])
  }
})

// Initialiser les données de l'arbre si nécessaire
onMounted(() => {
  new Promise<void>((resolve) => {
    const checkStore = () => {
      const store = useTreeStore()
      let view = store.getTreeView(VIEW_ID)

      if (view) {
        currentView.value = {
          ...view,
          expandedNodes: view.expandedNodes,
          selectedNodes: view.selectedNodes
        }
        resolve()
        return
      }

      view = store.createTreeView(VIEW_ID)
      
      if (!store.treeDataRef || store.treeDataRef.length === 0) {
        const initialData = [{
          id: '1',
          text: 'Root',
          children: [
            {
              id: '1-1',
              text: 'Frontend',
              children: [
                {
                  id: '1-1-1',
                  text: 'Vue',
                  children: []
                }
              ]
            }
          ]
        }]
        store.initializeStore(initialData)
      }
      
      const initialNodes = ['1', '1-1', '1-1-1']
      initialNodes.forEach(id => {
        store.setNodeExpanded(VIEW_ID, id, true)
      })
      
      currentView.value = {
        ...view,
        expandedNodes: view.expandedNodes,
        selectedNodes: view.selectedNodes
      }
      resolve()
    }
    
    checkStore()
  })
})

// Données filtrées selon la vue actuelle
const treeData = computed(() => {
  if (!store.treeDataRef || store.treeDataRef.length === 0) {
    return []
  }
  const data = store.getViewData(VIEW_ID)
  return data
})

// Mettre à jour la vue après chaque action
const updateView = () => {
  const view = store.getTreeView(VIEW_ID)
  if (view) {
    currentView.value = {
      ...view,
      expandedNodes: view.expandedNodes,
      selectedNodes: view.selectedNodes
    }
  }
}

const resetZoom = () => {
  store.resetTreeViewZoom(VIEW_ID)
  nextTick(() => {
    const updatedView = store.getTreeView(VIEW_ID)
    if (updatedView) {
      currentView.value = {
        ...updatedView,
        expandedNodes: updatedView.expandedNodes,
        selectedNodes: updatedView.selectedNodes
      }
    }
  })
}

const handleZoom = (item: TreeItem) => {
  store.zoomTreeView(VIEW_ID, item.id)
  nextTick(() => {
    const updatedView = store.getTreeView(VIEW_ID)
    if (updatedView) {
      currentView.value = {
        ...updatedView,
        expandedNodes: updatedView.expandedNodes,
        selectedNodes: updatedView.selectedNodes
      }
    }
  })
}

const handleExpand = (item: TreeItem) => {
  store.setNodeExpanded(VIEW_ID, item.id, !store.isNodeExpanded(VIEW_ID, item.id))
  nextTick(() => {
    const updatedView = store.getTreeView(VIEW_ID)
    if (updatedView) {
      currentView.value = {
        ...updatedView,
        expandedNodes: updatedView.expandedNodes,
        selectedNodes: updatedView.selectedNodes
      }
    }
  })
}

const handleMove = (moveData: MoveMutation) => {
  store.moveNode(moveData)
}

const handleDuplicate = (item: TreeItem) => {
  const timestamp = Date.now()
  const duplicatedNode = {
    ...item,
    id: `${item.id}-copy-${timestamp}`
  }
  store.duplicateNode(item.id, duplicatedNode)
}

const handleDelete = (item: TreeItem) => {
  store.removeNode(item.id)
  nextTick(() => {
    updateView()
  })
}

const handleReference = () => {
  // Implementation for handleReference
}

const handleAddNode = () => {
  const newNode: TreeItem = {
    id: crypto.randomUUID(),
    text: 'Nouveau nœud',
    children: []
  }
  
  // Si on a un nœud sélectionné, on ajoute comme enfant
  const selectedNodes = Array.from(currentView.value?.selectedNodes || [])
  if (selectedNodes.length === 1) {
    const parentId = selectedNodes[0]
    store.addChildNode(parentId, newNode)
  } else {
    // Sinon on ajoute à la racine
    store.addNode('1', newNode) // '1' est l'ID du nœud racine
  }
}

const handleAdd = (parentId: string) => {
  const newNode: TreeItem = {
    id: crypto.randomUUID(),
    text: '',
    children: []
  }
  store.addNode(parentId, newNode)
}
</script>

<template>
  <div>
    <div
      class="flex flex-col gap-y-4"
      style="grid-area: title"
    >
      <h1 class="text-4xl font-bold text-center">🎉 Updated! 🎉</h1>
      <p class="text-lg">
        {{ displayName }} has been updated to the latest version. 🎉
      </p>
      <p class="text-lg">Version: {{ version }}</p>

      <div class="tree-container">
        <div class="highlight-controls mb-4">
          <div class="flex gap-2">
            <button
              class="control-button"
              :class="{ 'active': isReferenceMode }"
              @click="toggleReferenceMode"
            >
              <i-heroicons-bookmark-20-solid class="w-4 h-4 mr-2" />
              Référence
            </button>

            <button
              class="control-button"
              @click="handleAddNode"
            >
              <i-heroicons-plus-circle-20-solid class="w-4 h-4 mr-2" />
              Ajouter un node
            </button>

            <button
              class="control-button"
              :class="{ 'active': isContentMode }"
              @click="toggleContentMode"
            >
              <i-heroicons-document-text-20-solid class="w-4 h-4 mr-2" />
              Contenu
            </button>

            <button
              class="highlight-button"
              :class="{ 'active': isHighlightMode }"
              @click="toggleHighlightMode"
            >
              <i-heroicons-pencil-20-solid class="w-4 h-4 mr-2" />
              {{ isHighlightMode ? 'Désactiver' : 'Activer' }} le surlignage
            </button>
          </div>
        </div>

        <div class="tree-content">
          <div class="breadcrumbs-container">
            <div class="breadcrumbs">
              <span 
                class="home-icon cursor-pointer" 
                @click.prevent="resetZoom"
              >
                <i-heroicons-home-20-solid class="w-4 h-4" />
              </span>
              <template v-for="(crumb, index) in currentPath.slice(1)" :key="crumb.id">
                <span class="separator">›</span>
                <span 
                  class="crumb"
                  :class="{ 'current': index === currentPath.length - 2 }"
                  @click="handleZoom(crumb)"
                >
                  {{ crumb.text }}
                </span>
              </template>
            </div>
          </div>

          <VueTreeDnd
            v-model="displayedData"
            v-model:view="currentView"
            :component="TreeNodeContent"
            :locked="false"
            @move="handleMove"
            @zoom="handleZoom"
            @duplicate="handleDuplicate"
            @delete="handleDelete"
            @add="handleAdd"
          />
        </div>
      </div>

      <h1 class="text-2xl font-bold">What's new?</h1>
    </div>

    <p>Icons</p>
    <div>
      <i-fa-solid-dice-five />
      <i-heroicons-outline:menu-alt-2 />
      <i-heroicons-outline-menu-alt-2 />
    </div>

    <Changelog />

    <Settings />
  </div>
</template>

<style lang="scss" scoped>
.update-grid {
  grid-template-areas:
    '. . .'
    '. title .'
    '. . .'
    '. content .';
  grid-template-columns: 1fr 4fr 1fr;
  grid-template-rows: 1fr 1fr;
}

.breadcrumbs-container {
  padding: 8px 16px;
  background-color: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  border-radius: 8px 8px 0 0;
  margin: -20px -20px 10px -20px;
}

.breadcrumbs {
  display: flex;
  align-items: center;
  font-size: 0.875rem;
  color: #64748b;
  flex-wrap: wrap;
  gap: 2px;
}

.home-icon {
  color: #3b82f6;
  padding: 2px 6px;
  border-radius: 4px;
  transition: all 0.2s ease;
  
  &:hover {
    background-color: #e3f2fd;
    color: #2563eb;
  }
}

.separator {
  margin: 0 8px;
  color: #94a3b8;
}

.crumb {
  cursor: pointer;
  color: #3b82f6;
  padding: 2px 6px;
  border-radius: 4px;
  transition: all 0.2s ease;
  
  &:hover {
    background-color: #e3f2fd;
    color: #2563eb;
    text-decoration: none;
  }

  &.current {
    color: #64748b;
    cursor: default;
    
    &:hover {
      background-color: transparent;
      color: #64748b;
    }
  }
}

.tree-container {
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 8px;
  background: white;
  margin: 20px 0;
  position: relative;
}

.highlight-controls {
  display: flex;
  justify-content: flex-end;
  padding: 0 16px;
}

.control-button {
  display: flex;
  align-items: center;
  padding: 8px 16px;
  border-radius: 6px;
  background-color: #f8fafc;
  border: 1px solid #e2e8f0;
  color: #64748b;
  transition: all 0.2s ease;
  font-size: 0.875rem;
  
  &:hover {
    background-color: #f1f5f9;
    border-color: #cbd5e1;
    color: #3b82f6;
  }

  &.active {
    background-color: #e3f2fd;
    border-color: #3b82f6;
    color: #2563eb;
  }
}

.highlight-button {
  display: flex;
  align-items: center;
  padding: 8px 16px;
  border-radius: 6px;
  background-color: #f8fafc;
  border: 1px solid #e2e8f0;
  color: #64748b;
  transition: all 0.2s ease;
  font-size: 0.875rem;
  
  &:hover {
    background-color: #f1f5f9;
    border-color: #cbd5e1;
  }
  
  &.active {
    background-color: #e3f2fd;
    border-color: #3b82f6;
    color: #2563eb;
  }
}
</style>
