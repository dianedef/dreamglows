import { reactive, watch } from 'vue'
import type { PathRepositoryDocument } from '@dreamglows/path-core'
import { projectTree, requireDocument } from './storage'
import type { TreeItem } from '../tree/types'
import type { useTreeStore } from '../../stores/treeStore'

export const persistenceState = reactive({ state: 'loading' as 'loading' | 'saved' | 'saving' | 'error', error: '' })
let document: PathRepositoryDocument | undefined
let pending: TreeItem[] | undefined
let pendingViews: unknown
let queue: Promise<void> = Promise.resolve()
const cleanTree = (tree: TreeItem[]): TreeItem[] => tree.map(({ parent, ...node }) => ({ ...node, children: cleanTree(node.children) }))

async function request(action: string, extra = {}): Promise<PathRepositoryDocument> {
  const reply = await chrome.runtime.sendMessage({ namespace: 'dreamglows-path-v1', action, ...extra })
  if (!reply?.ok) throw new Error(reply?.error || 'Enregistrement non confirmé. Vos modifications locales sont conservées.')
  return requireDocument(reply.document)
}
export async function loadCanonicalTree(): Promise<TreeItem[]> {
  document = await request('load')
  persistenceState.state = 'saved'
  return projectTree(document)
}
export function connectCanonicalTree(store: ReturnType<typeof useTreeStore>) {
  const savedViews = document?.settings.chromeViews || (document?.extensions.chromeMigration as any)?.original?.treeViews
  if (savedViews && typeof savedViews === 'object') {
    for (const [id, view] of Object.entries(savedViews as Record<string, any>)) {
      store.treeViews[id] = { ...view, id, currentPath: view.currentPath || [], zoomedNodeId: view.zoomedNodeId || null, expandedNodes: new Set(view.expandedNodes || []), selectedNodes: new Set(view.selectedNodes || []) }
    }
  }
  const viewsSnapshot = () => Object.fromEntries(Object.entries(store.treeViews).map(([id, view]) => [id, { ...view, expandedNodes: Array.from(view.expandedNodes), selectedNodes: Array.from(view.selectedNodes) }]))
  let previous = JSON.stringify([cleanTree(store.treeDataRef), viewsSnapshot()])
  watch(() => [store.treeDataRef, store.treeViews], () => {
    const snapshot = cleanTree(store.treeDataRef)
    const views = viewsSnapshot()
    const serialized = JSON.stringify([snapshot, views])
    if (serialized === previous) return
    previous = serialized
    pending = snapshot
    pendingViews = views
    if (persistenceState.state === 'error') return
    persistenceState.state = 'saving'
    queue = queue.then(async () => {
      if (persistenceState.state === 'error' || !document) return
      try {
        document = await request('commit', { expectedRevision: document.envelope.revision, tree: snapshot, views })
        if (pending === snapshot) {
          pending = undefined
          pendingViews = undefined
          persistenceState.state = 'saved'
        }
      } catch (error) {
        persistenceState.state = 'error'
        persistenceState.error = error instanceof Error ? error.message : String(error)
      }
    })
  }, { deep: true, flush: 'post' })
  window.addEventListener('beforeunload', event => {
    if (pending) { event.preventDefault(); event.returnValue = '' }
  })
}
export function downloadRecovery() {
  const blob = new Blob([JSON.stringify({ format: 'dreamglows-chrome-recovery-v1', document, pendingTree: pending, pendingViews }, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = documentElement('a')
  link.href = url
  link.download = 'dreamglows-modifications-non-enregistrees.json'
  link.click()
  URL.revokeObjectURL(url)
}
function documentElement(tag: 'a') { return window.document.createElement(tag) }
export function reloadCanonical() { window.location.reload() }
