import assert from 'node:assert/strict';
import test from 'node:test';
import {
  PathRepository,
  PathRepositoryConflictError,
  PathRepositoryReadError,
  PathRepositoryWriteError,
} from '../src/domain/path/repository.ts';

const entity = {
  id: 'action-1', type: 'action', title: 'Commencer', description: '', status: 'todo',
  createdAt: '2026-09-02T08:00:00.000Z', updatedAt: '2026-09-02T08:00:00.000Z', tags: [], extensions: {},
};

const canonical = () => ({
  repositoryVersion: 1,
  envelope: { schemaVersion: 1, revision: 4, entities: [structuredClone(entity)], events: [], extensions: { envelopeFuture: true } },
  settings: { timelineStartHour: 7, nested: { retained: true } },
  extensions: { repositoryFuture: ['retained'] },
});

class MemoryAdapter {
  constructor(value, faults = {}) { this.value = value; this.faults = faults; this.writes = []; }
  async load() { if (this.faults.read) throw this.faults.read; return structuredClone(this.value); }
  async save(value) {
    this.writes.push(structuredClone(value));
    if (this.faults.write) throw this.faults.write;
    this.value = structuredClone(value);
  }
}

test('canonical documents round-trip all envelope, business settings and extension data as detached JSON', async () => {
  const adapter = new MemoryAdapter(canonical());
  const repository = new PathRepository(adapter);
  const loaded = await repository.load();
  assert.equal(loaded.migrated, false);
  loaded.document.settings.nested.retained = false;
  assert.equal(adapter.value.settings.nested.retained, true);
  const saved = await repository.save(loaded.document, 4);
  assert.equal(saved.envelope.revision, 5);
  assert.deepEqual(saved.extensions, { repositoryFuture: ['retained'] });
  assert.deepEqual(saved.envelope.extensions, { envelopeFuture: true });
  const reloaded = await new PathRepository(adapter).load();
  assert.deepEqual(reloaded.document, saved);
});

test('legacy input is decoded and migrated without losing settings', async () => {
  const adapter = new MemoryAdapter({ goals: [{ id: 'g1', title: 'Rêve', status: 'in_progress' }], tasks: [], timelineStartHour: 6, futureRoot: { keep: true } });
  const result = await new PathRepository(adapter).load();
  assert.equal(result.migrated, true);
  assert.equal(result.document.envelope.entities[0].status, 'in-progress');
  assert.equal(result.document.settings.timelineStartHour, 6);
  assert.deepEqual(result.document.envelope.extensions.legacy.envelope.futureRoot, { keep: true });
  assert.ok(result.diagnostics.length > 0);
});

test('read failures and corrupt payloads are explicit and never become empty state', async () => {
  const ioFailure = new Error('disk unavailable');
  await assert.rejects(() => new PathRepository(new MemoryAdapter(null, { read: ioFailure })).load(), error => {
    assert.ok(error instanceof PathRepositoryReadError);
    assert.equal(error.cause, ioFailure);
    return true;
  });
  await assert.rejects(() => new PathRepository(new MemoryAdapter({ repositoryVersion: 1, envelope: { schemaVersion: 1 } })).load(), PathRepositoryReadError);
  await assert.rejects(() => new PathRepository(new MemoryAdapter(null)).load(), PathRepositoryReadError);
});

test('writes execute FIFO and stale concurrent revisions conflict explicitly', async () => {
  const gates = [];
  const adapter = new MemoryAdapter(canonical());
  adapter.save = async value => {
    adapter.writes.push(structuredClone(value));
    await new Promise(resolve => gates.push(resolve));
    adapter.value = structuredClone(value);
  };
  const repository = new PathRepository(adapter);
  const { document } = await repository.load();
  const first = repository.save({ ...document, settings: { order: 'first' } }, 4);
  const stale = repository.save({ ...document, settings: { order: 'second' } }, 4);
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(adapter.writes.length, 1);
  gates.shift()();
  const saved = await first;
  assert.equal(saved.envelope.revision, 5);
  await assert.rejects(stale, error => {
    assert.ok(error instanceof PathRepositoryConflictError);
    assert.equal(error.expectedRevision, 4);
    assert.equal(error.actualRevision, 5);
    return true;
  });
  assert.equal(adapter.writes.length, 1);
});

test('write failure preserves the revision and does not poison the FIFO queue', async () => {
  const adapter = new MemoryAdapter(canonical(), { write: new Error('quota exceeded') });
  const repository = new PathRepository(adapter);
  const { document } = await repository.load();
  await assert.rejects(() => repository.save(document, 4), error => {
    assert.ok(error instanceof PathRepositoryWriteError);
    assert.equal(error.cause.message, 'quota exceeded');
    return true;
  });
  adapter.faults.write = undefined;
  const saved = await repository.save(document, 4);
  assert.equal(saved.envelope.revision, 5);
});

test('save rejects non-JSON and malformed values before reaching the adapter', async () => {
  const adapter = new MemoryAdapter(canonical());
  const repository = new PathRepository(adapter);
  const { document } = await repository.load();
  document.settings.bad = undefined;
  await assert.rejects(() => repository.save(document, 4), TypeError);
  assert.equal(adapter.writes.length, 0);
});
