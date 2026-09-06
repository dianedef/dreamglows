<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, provide, ref, watch } from 'vue'
import { useTreeStore } from '../stores/treeStore'
import { canContain, getChildType, NODE_TYPE_LABELS } from '../lib/tree/semantics'
import type { DreamNodeType } from '../lib/tree/types'
import type { TreeView } from '../lib/tree/types'
import { useHighlight } from '../composables/useHighlight'
import VueTreeDnd from './vue-tree-dnd-main/VueTreeDnd.vue'
import type { MoveMutation, TreeItem } from './vue-tree-dnd-main/env'
import Changelog from './Changelog.vue'
import TreeNodeContent from './TreeNodeContent.vue'
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
    if (data.length > 0 && data[0].id === store.treeDataRef[0]?.id) {
      return data[0].children || []
    }
    return data
  },
  set: (value) => {
    const zoomedId = currentView.value?.zoomedNodeId
    if (zoomedId) {
      const edited = value.find(node => node.id === zoomedId)
      if (edited) store.updateNode(zoomedId, edited)
    } else {
      store.initializeStore([{ id: store.treeDataRef[0].id, text: 'Root', children: value }])
    }
  }
})

// Initialiser les données de l'arbre si nécessaire
onMounted(() => {
  void new Promise<void>((resolve) => {
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
      
      const initialNodes = ['1', '1-1', '1-1-1', '1-1-1-1']
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

const handleMove = (moveData: MoveMutation) => {
  store.moveNode(moveData)
}

const handleDuplicate = (item: TreeItem) => {
  const clone = (node: TreeItem): TreeItem => {
    const { parent, ...fields } = node
    return { ...fields, id: crypto.randomUUID(), children: node.children.map(clone) }
  }
  const duplicatedNode = clone(item)
  store.duplicateNode(item.id, duplicatedNode)
}

const handleDelete = (item: TreeItem) => {
  store.removeNode(item.id)
  nextTick(() => {
    updateView()
  })
}

const details = ref<{ id?: string; text: string; type: DreamNodeType; description: string; why: string; parentId: string } | null>(null)
const detailsError = ref('')
const detailsDialog = ref<HTMLDialogElement | null>(null)
const closeDetails = () => { detailsDialog.value?.close(); details.value = null }
watch(details, async value => { if (value) { detailsError.value = ''; await nextTick(); detailsDialog.value?.showModal() } })
const allNodes = computed(() => {
  const result: TreeItem[] = []
  const visit = (nodes: TreeItem[]) => nodes.forEach(node => { result.push(node); visit(node.children) })
  visit(store.treeDataRef[0]?.children || [])
  return result
})
const compatibleParents = computed(() => {
  if (!details.value) return []
  const descendantIds = new Set<string>()
  const current = allNodes.value.find(node => node.id === details.value?.id)
  const visit = (node: TreeItem) => { descendantIds.add(node.id); node.children.forEach(visit) }
  if (current) visit(current)
  return allNodes.value.filter(node => !descendantIds.has(node.id) && canContain(node.type || 'dream', details.value!.type))
})
watch(() => details.value?.type, () => {
  if (details.value?.parentId && !details.value.id && !compatibleParents.value.some(node => node.id === details.value?.parentId)) details.value.parentId = ''
})
const handleAdd = (parentId: string) => {
  const parent = allNodes.value.find(node => node.id === parentId)
  details.value = { text: '', type: parent ? getChildType(parent) : 'dream', description: '', why: '', parentId: parent?.id || '' }
}
const handleAddNode = () => handleAdd('')
provide('openNodeDetails', (node: TreeItem) => {
  const parent = allNodes.value.find(parent => parent.children.some(child => child.id === node.id))
  details.value = { id: node.id, text: node.text, type: node.type || 'dream', description: node.description || '', why: node.why || '', parentId: parent?.id || '' }
})
const saveDetails = () => {
  const draft = details.value
  if (!draft?.text.trim()) return
  const original = allNodes.value.find(node => node.id === draft.id)
  const fields = { text: draft.text, type: draft.type, description: draft.description, ...(draft.why || original?.why !== undefined ? { why: draft.why } : {}) }
  // Apply the edit and relation together, so a watcher never saves a half-reparented tree.
  const clone = (node: TreeItem): TreeItem => { const { parent, ...fields } = node; return { ...fields, children: node.children.map(clone) } }
  const tree = store.treeDataRef.map(clone)
  let previousParent: TreeItem | undefined
  let previousIndex = -1
  const take = (nodes: TreeItem[]): TreeItem | undefined => {
    const index = nodes.findIndex(node => node.id === draft.id)
    if (index >= 0) { previousIndex = index; return nodes.splice(index, 1)[0] }
    for (const node of nodes) { const found = take(node.children); if (found) { previousParent ||= node; return found } }
  }
  const node = draft.id ? take(tree[0].children) : { id: crypto.randomUUID(), children: [], text: '' }
  if (!node) return
  Object.assign(node, fields)
  const find = (nodes: TreeItem[]): TreeItem | undefined => {
    for (const node of nodes) { if (node.id === draft.parentId) return node; const found = find(node.children); if (found) return found }
  }
  const parent = draft.parentId ? find(tree) : tree[0]
  if (!parent) return
  if ((previousParent || tree[0]) === parent && previousIndex >= 0) parent.children.splice(previousIndex, 0, node)
  else parent.children.push(node)
  try {
    store.initializeStore(tree)
    closeDetails()
  } catch (error) { detailsError.value = error instanceof Error ? error.message : 'Modification refusée ; votre saisie est conservée.' }
}
</script>

<template>
  <div>
    <dialog v-if="details" ref="detailsDialog" aria-labelledby="details-title" class="bg-base-100 text-base-content rounded-lg shadow-xl p-6 w-full max-w-lg" @cancel.prevent="closeDetails">
      <form class="flex flex-col gap-3" @submit.prevent="saveDetails">
        <h2 id="details-title" class="text-lg font-semibold">{{ details.id ? 'Modifier l’élément' : 'Capturer un élément' }}</h2>
        <label class="flex flex-col gap-1">Type
          <select aria-label="Type" v-model="details.type" class="select select-bordered" :disabled="!!details.id"><option v-for="(label, type) in NODE_TYPE_LABELS" :key="type" :value="type">{{ label }}</option></select>
        </label>
        <label class="flex flex-col gap-1">Titre<input v-model="details.text" class="input input-bordered" required autofocus></label>
        <label class="flex flex-col gap-1">Pourquoi<textarea v-model="details.why" class="textarea textarea-bordered" rows="2" /></label>
        <label class="flex flex-col gap-1">Description<textarea v-model="details.description" class="textarea textarea-bordered" rows="3" /></label>
        <label class="flex flex-col gap-1">Rattacher à
          <select aria-label="Rattacher à" v-model="details.parentId" class="select select-bordered"><option value="">Sans parent visible</option><option v-for="node in compatibleParents" :key="node.id" :value="node.id">{{ NODE_TYPE_LABELS[node.type || 'dream'] }} : {{ node.text }}</option></select>
        </label>
        <p v-if="detailsError" role="alert" class="text-error">{{ detailsError }}</p>
        <div class="flex justify-end gap-2"><button type="button" class="btn btn-ghost" @click="closeDetails">Annuler</button><button type="submit" class="btn btn-primary" :disabled="!details.text.trim()">Enregistrer</button></div>
      </form>
    </dialog>
    <div
      class="flex flex-col gap-y-4"
      style="grid-area: title"
    >
      <div class="workspace-heading">
        <div>
          <p class="eyebrow">
            {{ displayName }} · {{ version }}
          </p>
          <h1>Mon chemin</h1>
          <p>Du rêve à la prochaine action, dans une seule arborescence.</p>
        </div>
        <button class="primary-action" @click="handleAddNode">
          <i-heroicons-plus-circle-20-solid class="w-4 h-4" />
          Ajouter
        </button>
      </div>

      <div class="tree-container">
        <div class="highlight-controls mb-4" aria-label="Outils de capture">
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

      <h2 class="text-2xl font-bold">
        Nouveautés
      </h2>
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
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  background: white;
  margin: 20px 0;
  position: relative;
}

.workspace-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  margin-top: 20px;

  h1 { margin: 2px 0 4px; color: #172033; font-size: 2rem; line-height: 1.15; }
  p { margin: 0; color: #64748b; }
  .eyebrow { color: #7c3aed; font-size: .75rem; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
}

.primary-action {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 9px 14px;
  border: 0;
  border-radius: 10px;
  color: white;
  background: #6d28d9;
  font-size: .875rem;
  font-weight: 650;
  cursor: pointer;

  &:hover { background: #5b21b6; }
  &:focus-visible { outline: 3px solid #ddd6fe; outline-offset: 2px; }
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
