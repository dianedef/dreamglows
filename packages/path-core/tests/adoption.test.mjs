import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { decodeCanonical, PathRepository } from '../src/repository.ts';
import { createPathCommandPort } from '../src/command-port.ts';

const fixture = JSON.parse(await readFile(new URL('../fixtures/adoption-conformance-v1.json', import.meta.url), 'utf8'));
for (const entry of fixture.cases) test(`conformance: ${entry.name}`, () => {
    if (entry.valid) assert.deepEqual(decodeCanonical(entry.document), entry.document);
    else assert.throws(() => { if (!decodeCanonical(entry.document)) throw new Error('unsupported'); });
});

function harness() {
    let stored = { repositoryVersion: 1, envelope: { schemaVersion: 1, revision: 0, entities: [], events: [], extensions: { future: true } }, settings: { unknown: 'retain' }, extensions: { future: [1, 2] } };
    let writes = 0, sequence = 0;
    const repository = new PathRepository({ load: async () => stored, save: async value => { stored = value; writes++; } });
    const ready = repository.load();
    const port = createPathCommandPort({
        async updateDocument(update) { await ready; const next = await update(structuredClone(stored)); return next ? repository.save(next, stored.envelope.revision) : structuredClone(stored); },
        afterPersist() {}, now: () => '2026-09-06T12:00:00Z', createId: () => `event-${++sequence}`,
    });
    return { port, get document() { return stored; }, get writes() { return writes; } };
}

test('every product entity can be created, edited, and retained with its meaning and future fields', async () => {
    const h = harness();
    const types = ['dream', 'goal', 'milestone', 'action', 'habit', 'evidence', 'reflection'];
    const parents = [undefined, 'dream', 'goal', 'milestone', 'goal', 'action', 'dream'];
    for (const [index, type] of types.entries()) {
        const command = { type: 'create-entity', commandId: `create-${type}`, input: { id: type, type, title: type, ...(parents[index] ? { parentId: parents[index] } : {}), extensions: { future: { keep: 42 } }, ...(type === 'dream' ? { why: 'Meaning' } : {}) } };
        assert.equal((await h.port.execute(command)).accepted, true);
        assert.equal((await h.port.execute(command)).replayed, true);
        assert.equal((await h.port.execute({ ...command, input: { ...command.input, title: 'different' } })).accepted, false);
        assert.equal((await h.port.execute({ type: 'update-entity', commandId: `update-${type}`, entityId: type, patch: { description: 'Changed', extensions: { known: true } } })).accepted, true);
    }
    assert.equal(h.writes, 14);
    assert.equal(h.document.envelope.revision, 14);
    assert.equal(h.document.envelope.entities[0].why, 'Meaning');
    for (const entity of h.document.envelope.entities) assert.deepEqual(entity.extensions.future, { keep: 42 });
    assert.deepEqual(h.document.extensions, { future: [1, 2] });
    assert.deepEqual(decodeCanonical(JSON.parse(JSON.stringify(h.document))), h.document);
});

test('nested actions preserve hierarchy, reject cycles and cannot mutate a tombstone', async () => {
    const h = harness();
    for (const [id, parentId] of [['parent', undefined], ['child', 'parent']]) {
        assert.equal((await h.port.execute({ type: 'create-entity', commandId: id, input: { id, type: 'action', title: id, ...(parentId ? { parentId } : {}) } })).accepted, true);
    }
    assert.deepEqual(await h.port.execute({ type: 'reparent', commandId: 'cycle', entityId: 'parent', nextParentId: 'child' }), { accepted: false, reason: 'cycle' });
    assert.equal((await h.port.execute({ type: 'delete-entity', commandId: 'delete-parent', entityId: 'parent' })).reason, 'has-children');
    const remove = { type: 'delete-entity', commandId: 'delete-child', entityId: 'child' };
    assert.equal((await h.port.execute(remove)).accepted, true);
    assert.equal((await h.port.execute(remove)).replayed, true);
    for (const type of ['complete', 'reopen']) assert.equal((await h.port.execute({ type, commandId: type, entityId: 'child' })).accepted, false);
    assert.equal((await h.port.execute({ type: 'create-entity', commandId: 'under-deleted', input: { id: 'orphan', type: 'action', title: 'Orphan', parentId: 'child' } })).accepted, false);
    assert.equal(h.document.envelope.entities.length, 2);
    assert.equal(h.document.envelope.entities[1].parentId, 'parent');
    assert.equal(h.writes, 3);
});

test('planning, completion, reopening and reparenting replay without extra writes', async () => {
    const h = harness();
    await h.port.execute({ type: 'create-entity', commandId: 'create', input: { id: 'a', type: 'action', title: 'A' } });
    const commands = [
        { type: 'schedule', planned: { start: '2026-09-06' } },
        { type: 'reschedule', planned: { start: '2026-09-07' } },
        { type: 'complete' }, { type: 'reopen' },
    ];
    for (const command of commands) {
        const input = { ...command, entityId: 'a', commandId: command.type };
        assert.equal((await h.port.execute(input)).accepted, true);
        const revision = h.document.envelope.revision;
        assert.equal((await h.port.execute(input)).replayed, true);
        assert.equal(h.document.envelope.revision, revision);
    }
    assert.equal((await h.port.execute({ type: 'reschedule', commandId: 'bad-date', entityId: 'a', planned: { start: '2026-02-30' } })).reason, 'invalid-date');
    assert.equal(h.writes, 5);
});

test('legacy inverted/mixed periods remain recoverable and can be checkpointed', async () => {
    for (const end of ['2026-09-01', '2026-09-03T12:00:00Z']) {
        let stored = { goals: [{ id: 'legacy', title: 'Legacy', startDate: '2026-09-02', dueDate: end }] };
        const repository = new PathRepository({ load: async () => stored, save: async value => { stored = value; } });
        const loaded = await repository.load();
        assert.equal(loaded.migrated, true);
        assert.equal(loaded.document.envelope.entities[0].planned, undefined);
        assert.equal(loaded.document.envelope.entities[0].extensions.legacy.invalidPlanned.end, end);
        assert.equal(loaded.document.envelope.entities[0].extensions.legacy.fields.dueDate, end);
        assert.ok(loaded.diagnostics.some(item => item.code === 'invalid-period-preserved'));
        await repository.save(loaded.document, loaded.document.envelope.revision);
        assert.deepEqual((await repository.load()).document, stored);
    }
});

test('old v1 migration periods recover once with originals, other corruption fails closed', async () => {
    let stored = structuredClone(fixture.cases[0].document);
    const entity = stored.envelope.entities[0];
    entity.planned = { start: '2026-09-07', end: '2026-09-06', future: 42 };
    entity.extensions.legacy = { kind: 'goal', fields: { startDate: '2026-09-07', dueDate: '2026-09-06' } };
    const original = structuredClone(entity.planned);
    const repository = new PathRepository({ load: async () => stored, save: async value => { stored = value; } });
    const loaded = await repository.load();
    assert.equal(loaded.migrated, true);
    assert.deepEqual(loaded.document.envelope.entities[0].extensions.legacy.invalidPlanned, original);
    await repository.save(loaded.document, loaded.document.envelope.revision);
    assert.equal((await repository.load()).migrated, false);
    stored.envelope.entities[0].planned = original;
    delete stored.envelope.entities[0].extensions.legacy;
    await assert.rejects(repository.load());
});

test('switching planned date kinds retains extensions, removes obsolete bounds and journals exact new period', async () => {
    const h = harness();
    await h.port.execute({ type: 'create-entity', commandId: 'create', input: { id: 'a', type: 'action', title: 'A', planned: { start: '2026-09-01', end: '2026-09-02', future: { keep: true } } } });
    assert.equal((await h.port.execute({ type: 'reschedule', commandId: 'move', entityId: 'a', planned: { start: '2026-09-06T12:00:00Z' } })).accepted, true);
    assert.deepEqual(h.document.envelope.entities[0].planned, { start: '2026-09-06T12:00:00Z', future: { keep: true } });
    assert.deepEqual(h.document.envelope.events.at(-1).nextPlanned, h.document.envelope.entities[0].planned);
});

test('reopening an old Focus session cannot create two active sessions', async () => {
    const h = harness();
    const commands = [
        { type: 'create-entity', input: { id: 'a', type: 'action', title: '  Keep title spacing  ' } },
        { type: 'start-focus-session', input: { id: 'f1', actionId: 'a', mode: 'focus' } },
        { type: 'end-focus-session', entityId: 'f1', input: { outcome: 'completed' } },
        { type: 'start-focus-session', input: { id: 'f2', actionId: 'a', mode: 'focus' } },
    ];
    for (const [index, command] of commands.entries()) assert.equal((await h.port.execute({ ...command, commandId: `focus-${index}` })).accepted, true);
    assert.equal((await h.port.execute({ type: 'reopen', entityId: 'f1', commandId: 'reopen' })).reason, 'active-session-exists');
    assert.equal(h.document.envelope.entities[0].title, '  Keep title spacing  ');
    assert.equal(h.document.envelope.entities.filter(e => e.type === 'focus-session' && e.status === 'in-progress').length, 1);
});
