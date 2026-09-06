import { describe, expect, it } from 'vitest'
import { CanonicalStorage, BACKUP_KEY, CANONICAL_KEY, LEGACY_KEY, migrateTree, projectTree, applyTree } from '../storage'
const now = '2026-09-06T12:00:00.000Z'
const legacy = JSON.stringify({ treeDataRef: [{ id: 'root', text: 'Root', children: [{ id: 'dream:1', text: 'Meaning', unknown: { keep: true }, type: 'dream', children: [{ id: 'goal', text: 'Goal', type: 'objective', children: [{ id: 'action', text: 'Action', type: 'task', children: [{ id: 'child', text: 'Nested', type: 'task', children: [] }] }] }] }] }], treeViews: { personal: { future: [1, 2] } } })
function port(seed: Record<string, unknown> = { [LEGACY_KEY]: legacy }) {
  const data = structuredClone(seed)
  const writes: string[] = []
  let fail = ''
  return { data, writes, fail: (key: string) => { fail = key },
    async get(_keys: string[]) { return structuredClone(data) },
    async set(values: Record<string, unknown>) { const key = Object.keys(values)[0]; writes.push(key); if (key === fail) throw new Error('disk failure'); Object.assign(data, structuredClone(values)) }
  }
}
let sequence = 0
const ids = () => `event-${++sequence}`
describe('canonical Chrome storage', () => {
  it('backs up exact legacy bytes first and retains unknown fields, view data, ids and nested actions', async () => {
    const storage = port()
    const document = await new CanonicalStorage(storage, () => now, ids).load()
    expect(storage.writes).toEqual([BACKUP_KEY, CANONICAL_KEY])
    expect((storage.data[BACKUP_KEY] as any).raw).toBe(legacy)
    expect(document.envelope.entities.map(e => [e.id, e.type, e.parentId])).toEqual([['dream:1','dream',undefined],['goal','goal','dream:1'],['action','action','goal'],['child','action','action']])
    expect(document.envelope.events).toEqual([])
    expect((document.extensions.chromeMigration as any).original.treeViews.personal.future).toEqual([1,2])
    expect((document.envelope.entities[0].extensions.chrome as any).original.unknown).toEqual({ keep: true })
  })
  it('failed backup prevents canonical writes; failed commit restarts from immutable backup timestamp', async () => {
    const storage = port(); storage.fail(BACKUP_KEY)
    await expect(new CanonicalStorage(storage, () => now).load()).rejects.toThrow('disk failure')
    expect(storage.data[CANONICAL_KEY]).toBeUndefined()
    storage.fail(CANONICAL_KEY)
    await expect(new CanonicalStorage(storage, () => now).load()).rejects.toThrow('disk failure')
    storage.data[LEGACY_KEY] = 'corrupt subsequent legacy'
    storage.fail('')
    const resumed = await new CanonicalStorage(storage, () => '2026-09-07T00:00:00Z').load()
    expect(resumed.envelope.entities[0].createdAt).toBe(now)
    expect(storage.data[LEGACY_KEY]).toBe('corrupt subsequent legacy')
  })
  it('fails closed on corrupt canonical or duplicate legacy ids; keeps all originals', async () => {
    const storage = port({ [CANONICAL_KEY]: { repositoryVersion: 99 }, [LEGACY_KEY]: legacy })
    await expect(new CanonicalStorage(storage).load()).rejects.toThrow()
    expect(storage.writes).toEqual([])
    expect(() => migrateTree(JSON.stringify({ treeDataRef: [{ id: 'x', text: 'a', children: [{ id: 'x', text: 'b', children: [] }] }] }), now)).toThrow('double')
  })
  it('empty canonical document stays empty and repeat migration is a read only load', async () => {
    const storage = port({}); const repo = new CanonicalStorage(storage, () => now)
    const first = await repo.load(); const count = storage.writes.length
    expect(first.envelope.entities).toEqual([])
    expect(await repo.load()).toEqual(first)
    expect(storage.writes.length).toBe(count)
  })
  it('merges a title edit while preserving unknown top-level/entity fields and hidden entities', () => {
    const doc: any = migrateTree(legacy, now)
    doc.future = { yes: true }; doc.envelope.entities[0].why = 'Freedom'; doc.envelope.entities[0].future = ['unknown']
    doc.envelope.entities.push({ ...doc.envelope.entities[0], id: 'habit', type: 'habit', parentId: 'dream:1' })
    const tree = projectTree(doc); tree[0].children[0].text = 'Changed'
    const next: any = applyTree(doc, tree, now, ids)
    expect(next.future).toEqual(doc.future)
    expect(next.envelope.entities[0]).toMatchObject({ title: 'Changed', why: 'Freedom', future: ['unknown'] })
    expect(next.envelope.entities.find((e: any) => e.id === 'habit')).toEqual(doc.envelope.entities.at(-1))
    expect(next.envelope.revision).toBe(1); expect(next.envelope.events).toHaveLength(1)
    expect(applyTree(next, projectTree(next), now, ids)).toEqual(next)
  })
  it('tombstones removed entities and preserves histories and hidden records', () => {
    const doc = migrateTree(legacy, now); const tree = projectTree(doc); tree[0].children[0].children[0].children = []
    const next = applyTree(doc, tree, now, ids)
    expect(next.envelope.entities.filter(e => e.deletedAt).map(e => e.id)).toEqual(['action','child'])
    expect(next.envelope.events.map(e => e.type)).toEqual(['entity-deleted','entity-deleted'])
    expect(next.envelope.revision).toBe(1)
  })
  it('serializes concurrent windows and rejects stale second write without losing first edit', async () => {
    const storage = port(); const repo = new CanonicalStorage(storage, () => now, ids); const doc = await repo.load()
    const one = projectTree(doc), two = projectTree(doc); one[0].children[0].text = 'One'; two[0].children[0].text = 'Two'
    const outcomes = await Promise.allSettled([repo.commit(0, one), repo.commit(0, two)])
    expect(outcomes.map(o => o.status)).toEqual(['fulfilled','rejected'])
    expect((await repo.load()).envelope.entities[0].title).toBe('One')
  })
  it('does not acknowledge failed writes and accepts retry at unchanged persisted revision', async () => {
    const storage = port(); const repo = new CanonicalStorage(storage, () => now, ids); const doc = await repo.load(); const tree = projectTree(doc); tree[0].children[0].text = 'Retry'
    storage.fail(CANONICAL_KEY); await expect(repo.commit(0, tree)).rejects.toThrow('disk failure')
    expect((await repo.load()).envelope.revision).toBe(0)
    storage.fail(''); expect((await repo.commit(0, tree)).envelope.revision).toBe(1)
  })
  it('retains order after reorder and rejects incompatible new relationships', () => {
    const doc = migrateTree(legacy, now); const tree = projectTree(doc)
    tree[0].children.push({ id: 'new-dream', text: 'Second', type: 'dream', children: [] })
    const created = applyTree(doc, tree, now, ids); const reordered = projectTree(created); reordered[0].children.reverse()
    const next = applyTree(created, reordered, now, ids)
    expect(projectTree(next)[0].children.map(e => e.id)).toEqual(['new-dream','dream:1'])
    expect(applyTree(next, projectTree(next), now, ids)).toEqual(next)
    const invalid = projectTree(next); invalid[0].children[0].children.push({ id: 'bad', text: 'Action under dream', type: 'task', children: [] })
    expect(() => applyTree(next, invalid, now, ids)).toThrow('incompatible-type')
  })
})

describe('shared command adoption', () => {
  it('records completion and reparent using canonical event semantics', () => {
    const doc = migrateTree(legacy, now), tree = projectTree(doc)
    const action = tree[0].children[0].children[0].children[0]
    action.status = 'done'
    const complete = applyTree(doc, tree, now, ids)
    expect(complete.envelope.events.map(e => e.type)).toEqual(['entity-completed'])
    expect(complete.envelope.entities.find(e => e.id === 'action')).toMatchObject({ status: 'done', completedAt: now })
    const moved = projectTree(complete), goal = moved[0].children[0].children[0]
    const child = goal.children[0].children.pop()!
    goal.children.push(child)
    const result = applyTree(complete, moved, now, ids)
    expect(result.envelope.events.find(e => e.type === 'entity-reparented')).toMatchObject({ entityId: 'child', previousParentId: 'action', nextParentId: 'goal' })
  })
  it('refuses deletion with hidden live children and incompatible type edits atomically', () => {
    const doc = migrateTree(legacy, now)
    doc.envelope.entities.push({ ...doc.envelope.entities[0], id: 'hidden', type: 'evidence', parentId: 'action' })
    const tree = projectTree(doc); tree[0].children[0].children[0].children = []
    expect(() => applyTree(doc, tree, now, ids)).toThrow('has-children')
    expect(doc.envelope.entities.every(e => !e.deletedAt)).toBe(true)
    const typed = projectTree(doc); typed[0].children[0].children[0].type = 'task'
    expect(() => applyTree(doc, typed, now, ids)).toThrow('changement de type')
  })
  it('preserves unknown planned fields and produces canonical planned-period-changed events', () => {
    const doc = migrateTree(legacy, now)
    doc.envelope.entities[2].planned = { start: '2026-09-06' as any, end: '2026-09-07' as any, future: 'keep' } as any
    const tree = projectTree(doc); tree[0].children[0].children[0].children[0].dueDate = '2026-09-08'
    const result = applyTree(doc, tree, now, ids)
    expect(result.envelope.events[0]).toMatchObject({ type: 'planned-period-changed', previousPlanned: { end: '2026-09-07', future: 'keep' }, nextPlanned: { end: '2026-09-08', future: 'keep' } })
  })
})
