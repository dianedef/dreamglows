import { createEntity, updateEntity, complete, reopen, reparent, deleteEntity, type PathCommandResult, decodeCanonical, isCivilDate, isZonedInstant, type PathRepositoryDocument, type PathEntity, type PathEntityType, type PathStatus, type ZonedInstant, type JsonObject } from '@dreamglows/path-core'
import type { TreeItem } from '../tree/types'

export const CANONICAL_KEY = 'dreamglows-path-v1'
export const BACKUP_KEY = 'dreamglows-tree-backup-v1'
export const LEGACY_KEY = 'tree-store'
const visibleTypes = new Set(['dream', 'goal', 'milestone', 'action'])
const aliases: Record<string, PathEntityType> = { dream: 'dream', objective: 'goal', goal: 'goal', milestone: 'milestone', task: 'action', action: 'action' }
const uiTypes = { dream: 'dream', goal: 'objective', milestone: 'milestone', action: 'task' } as const
const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value))
const object = (value: unknown): value is Record<string, any> => !!value && typeof value === 'object' && !Array.isArray(value)
export function requireDocument(value: unknown): PathRepositoryDocument {
  const document = decodeCanonical(value)
  if (!document) throw new Error('Document DreamGlows incompatible ; données conservées.')
  return document
}

/** A migration records provenance, never fictitious historical business events. */
export function migrateTree(raw: unknown, migratedAt: string): PathRepositoryDocument {
  const source = raw === null ? { treeDataRef: [] } : typeof raw === 'string' ? JSON.parse(raw) : raw
  if (!object(source) || !Array.isArray(source.treeDataRef)) throw new Error('Arbre historique invalide ; migration interrompue.')
  const entities: PathEntity[] = []
  const seen = new Set<string>()
  const visit = (node: unknown, parentId: string | undefined, depth: number) => {
    if (!object(node) || typeof node.id !== 'string' || !node.id.trim() || typeof node.text !== 'string' || !Array.isArray(node.children)) throw new Error('Nœud historique invalide.')
    if (seen.has(node.id)) throw new Error(`Identifiant historique en double : ${node.id}`)
    seen.add(node.id)
    const type = aliases[node.type || ['dream', 'objective', 'milestone', 'task'][Math.min(depth, 3)]]
    if (!type) throw new Error(`Type historique inconnu : ${node.type}`)
    const status: PathStatus = ['todo', 'in-progress', 'done', 'cancelled'].includes(node.status) ? node.status : node.isChecked ? 'done' : node.progress > 0 ? 'in-progress' : 'todo'
    const { children, parent, ...original } = node
    const entity: PathEntity = { id: node.id, type, title: node.text, description: typeof node.description === 'string' ? node.description : '', status,
      createdAt: isZonedInstant(node.createdAt) ? node.createdAt : migratedAt as ZonedInstant, updatedAt: isZonedInstant(node.updatedAt) ? node.updatedAt : migratedAt as ZonedInstant, tags: [],
      extensions: { chrome: { original: copy(original), migratedAt, timestamps: 'migration-time-not-historical', ...(typeof node.progress === 'number' ? { progress: node.progress } : {}) } } }
    if (parentId !== undefined) entity.parentId = parentId
    if (typeof node.why === 'string') entity.why = node.why
    if (isZonedInstant(node.completedAt)) entity.completedAt = node.completedAt
    if (isCivilDate(node.dueDate)) entity.planned = { end: node.dueDate }
    entities.push(entity)
    children.forEach((child: unknown) => visit(child, node.id, depth + 1))
  }
  for (const node of source.treeDataRef) {
    if (object(node) && node.text === 'Root' && !node.type && Array.isArray(node.children)) node.children.forEach((child: unknown) => visit(child, undefined, 0))
    else visit(node, undefined, 0)
  }
  return requireDocument({ repositoryVersion: 1, envelope: { schemaVersion: 1, revision: 0, entities, events: [], extensions: {} }, settings: {}, extensions: { chromeMigration: { migratedAt, original: copy(source) } } })
}

export function projectTree(document: PathRepositoryDocument): TreeItem[] {
  const entities = document.envelope.entities.filter(entity => visibleTypes.has(entity.type) && !entity.deletedAt)
  const nodes = new Map<string, TreeItem>()
  const ids = new Set(document.envelope.entities.map(entity => entity.id))
  let rootId = '__dreamglows_root__'
  while (ids.has(rootId)) rootId += '_'
  const root: TreeItem = { id: rootId, text: 'Root', children: [] }
  for (const entity of entities) {
    const chrome = entity.extensions.chrome as JsonObject | undefined
    const node: TreeItem = { id: entity.id, text: entity.title, type: uiTypes[entity.type as keyof typeof uiTypes], children: [], status: entity.status, isChecked: entity.status === 'done' }
    if (typeof chrome?.progress === 'number') node.progress = chrome.progress
    if (entity.status === 'done') node.progress = 100
    if (isCivilDate(entity.planned?.end)) node.dueDate = entity.planned.end
    nodes.set(entity.id, node)
  }
  for (const entity of entities) {
    const node = nodes.get(entity.id)!
    const ancestors = new Set([entity.id])
    let cursor = entity.parentId
    while (cursor && nodes.has(cursor)) {
      if (ancestors.has(cursor)) throw new Error('Cycle dans le document ; édition interrompue.')
      ancestors.add(cursor)
      cursor = document.envelope.entities.find(item => item.id === cursor)?.parentId
    }
    const parent = entity.parentId ? nodes.get(entity.parentId) : undefined
    ;(parent || root).children.push(node)
  }
  const sort = (node: TreeItem) => {
    const originalOrder = new Map(node.children.map((child, index) => [child.id, index]))
    const order = (id: string) => Number((document.envelope.entities.find(e => e.id === id)?.extensions.chrome as JsonObject)?.order ?? originalOrder.get(id))
    node.children.sort((a, b) => order(a.id) - order(b.id))
    node.children.forEach(sort)
  }
  sort(root)
  return [root]
}

function flatten(tree: TreeItem[]) {
  const nodes = new Map<string, { node: TreeItem; parentId?: string; order: number }>()
  const visit = (node: TreeItem, parentId: string | undefined, order: number) => {
    if (!node || typeof node.id !== 'string' || !node.id.trim() || typeof node.text !== 'string' || !Array.isArray(node.children) || nodes.has(node.id)) throw new Error('Arbre modifié invalide ou identifiant en double.')
    nodes.set(node.id, { node, parentId, order })
    node.children.forEach((child, index) => visit(child, node.id, index))
  }
  if (tree.length !== 1 || tree[0]?.text !== 'Root') throw new Error('Racine de projection invalide.')
  tree[0].children.forEach((node, index) => visit(node, undefined, index))
  return nodes
}

/** Merge only editable projection differences; hidden entities and unknown fields survive. */
export function applyTree(document: PathRepositoryDocument, tree: TreeItem[], now: string, eventId: () => string): PathRepositoryDocument {
  const next = copy(document)
  const before = flatten(projectTree(document))
  const after = flatten(tree)
  const timestamp = now as ZonedInstant
  const dependencies = () => ({ commandId: `chrome:${eventId()}`, now: () => timestamp, createId: eventId })
  const accept = (result: PathCommandResult) => {
    if (!result.accepted) {
      if (result.reason === 'no-op') return
      throw new Error(`Modification refusée : ${result.reason}`)
    }
    next.envelope = result.envelope
  }
  const current = (id: string) => next.envelope.entities.find(entity => entity.id === id)!
  for (const [id, { node, parentId, order }] of after) {
    const prior = before.get(id)
    const existing = current(id)
    if (existing && !prior) throw new Error('Identifiant déjà utilisé par une entité masquée ou supprimée.')
    const type = aliases[node.type || 'dream']
    if (!type || !visibleTypes.has(type)) throw new Error('Type de nœud invalide.')
    if (prior && node.type !== prior.node.type) throw new Error('Le changement de type exige une migration explicite.')
    if (!existing) {
      accept(createEntity(next.envelope, { id, type: type as 'dream' | 'goal' | 'milestone' | 'action', title: node.text,
        ...(parentId === undefined ? {} : { parentId }), extensions: { chrome: { order } } }, dependencies()))
    } else if (parentId !== prior!.parentId) {
      accept(reparent(next.envelope, id, parentId, dependencies()))
    }
    const patch: { title?: string; extensions?: JsonObject } = {}
    if (prior && node.text !== prior.node.text) patch.title = node.text
    const chrome = { ...((current(id).extensions.chrome as JsonObject) || {}) }
    let chromeChanged = false
    if (prior && (prior.order !== order || prior.parentId !== parentId)) { chrome.order = order; chromeChanged = true }
    if ((!prior && node.progress !== undefined) || (prior && node.progress !== prior.node.progress)) {
      if (node.progress !== undefined && (!Number.isFinite(node.progress) || node.progress < 0 || node.progress > 100)) throw new Error('Progression invalide.')
      if (node.progress === undefined) delete chrome.progress
      else chrome.progress = node.progress
      chromeChanged = true
    }
    if (chromeChanged) patch.extensions = { chrome }
    if (Object.keys(patch).length) accept(updateEntity(next.envelope, id, patch, dependencies()))
    if (!prior || node.status !== prior.node.status || node.isChecked !== prior.node.isChecked) {
      const status = prior && node.status === prior.node.status && node.isChecked !== prior.node.isChecked
        ? node.isChecked ? 'done' : 'in-progress'
        : node.status || (node.isChecked ? 'done' : 'todo')
      if (status !== current(id).status) {
        if (status === 'done') accept(complete(next.envelope, id, dependencies()))
        else {
          if (current(id).status === 'done') accept(reopen(next.envelope, id, dependencies()))
          if (status !== current(id).status) {
            if (!['todo', 'in-progress', 'cancelled'].includes(status)) throw new Error('Statut invalide.')
            const entity = current(id), previousStatus = entity.status
            entity.status = status
            entity.updatedAt = timestamp
            const deps = dependencies()
            next.envelope.events.push({ id: deps.createId(), type: 'entity-updated', entityId: id, occurredAt: timestamp, recordedAt: timestamp,
              previousValues: { status: previousStatus }, nextValues: { status }, extensions: { commandId: deps.commandId, command: 'chrome-set-status' } })
          }
        }
      }
    }
    if ((!prior && node.dueDate !== undefined) || (prior && node.dueDate !== prior.node.dueDate)) {
      if (node.dueDate && !isCivilDate(node.dueDate)) throw new Error('Date civile invalide.')
      const entity = current(id), previousPlanned = entity.planned && copy(entity.planned)
      entity.planned = { ...entity.planned }
      if (node.dueDate) entity.planned.end = node.dueDate as any
      else delete entity.planned.end
      entity.updatedAt = timestamp
      const deps = dependencies()
      next.envelope.events.push({ id: deps.createId(), type: 'planned-period-changed', entityId: id, occurredAt: timestamp, recordedAt: timestamp,
        ...(previousPlanned ? { previousPlanned } : {}), nextPlanned: copy(entity.planned), extensions: { commandId: deps.commandId, command: 'chrome-set-due-date' } })
    }
  }
  // Shared delete refuses hidden live children; all changes remain in this detached candidate.
  for (const id of [...before.keys()].reverse()) if (!after.has(id)) accept(deleteEntity(next.envelope, id, dependencies()))
  if (next.envelope.events.length !== document.envelope.events.length) next.envelope.revision++
  return requireDocument(next)
}

export interface LocalStoragePort { get(keys: string[]): Promise<Record<string, unknown>>; set(values: Record<string, unknown>): Promise<void> }
export class CanonicalStorage {
  private queue: Promise<unknown> = Promise.resolve()
  constructor(private storage: LocalStoragePort, private clock = () => new Date().toISOString(), private id: () => string = () => crypto.randomUUID()) {}
  private serialized<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.queue.then(operation)
    this.queue = result.catch(() => undefined)
    return result
  }
  private async read(): Promise<PathRepositoryDocument> {
    const data = await this.storage.get([CANONICAL_KEY, BACKUP_KEY, LEGACY_KEY])
    if (data[CANONICAL_KEY] !== undefined) return requireDocument(data[CANONICAL_KEY])
    let backup = data[BACKUP_KEY] as { raw: unknown; migratedAt: string } | undefined
    if (backup === undefined) {
      backup = { raw: data[LEGACY_KEY] ?? null, migratedAt: this.clock() }
      await this.storage.set({ [BACKUP_KEY]: backup })
    }
    if (!object(backup) || !('raw' in backup) || typeof backup.migratedAt !== 'string') throw new Error('Sauvegarde de migration invalide.')
    const document = migrateTree(backup.raw, backup.migratedAt)
    await this.storage.set({ [CANONICAL_KEY]: document })
    return document
  }
  load() { return this.serialized(() => this.read()) }
  commit(expectedRevision: number, tree: TreeItem[], views?: JsonObject) {
    return this.serialized(async () => {
      const current = await this.read()
      if (expectedRevision !== current.envelope.revision) throw new Error('Une autre fenêtre a modifié les données. Téléchargez vos modifications avant de recharger.')
      const next = applyTree(current, tree, this.clock(), this.id)
      if (views !== undefined && JSON.stringify(views) !== JSON.stringify(current.settings.chromeViews)) {
        next.settings.chromeViews = copy(views)
        if (next.envelope.revision === current.envelope.revision) next.envelope.revision++
        requireDocument(next)
      }
      if (next.envelope.revision !== current.envelope.revision) await this.storage.set({ [CANONICAL_KEY]: next })
      return next
    })
  }
}
