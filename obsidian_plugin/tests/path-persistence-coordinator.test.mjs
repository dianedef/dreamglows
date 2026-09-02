import assert from 'node:assert/strict';
import test from 'node:test';
import { ObsidianPathRepositoryAdapter } from '../src/domain/path/obsidian-adapter.ts';
import { PathPersistenceCoordinator } from '../src/domain/path/persistence-coordinator.ts';
import { PathRepository, PathRepositoryReadError, PathRepositoryWriteError } from '../src/domain/path/repository.ts';

const canonical = () => ({
  repositoryVersion: 1,
  envelope: { schemaVersion: 1, revision: 2, entities: [], events: [], extensions: {} },
  settings: { retained: true },
  extensions: {},
});

class Host {
  constructor(value) { this.value = value; this.loads = 0; this.writes = []; this.writeError = undefined; }
  async loadData() { this.loads += 1; return structuredClone(this.value); }
  async saveData(value) {
    this.writes.push(structuredClone(value));
    if (this.writeError) throw this.writeError;
    this.value = structuredClone(value);
  }
}

test('adapter normalizes only absent plugin data', async () => {
  for (const absent of [null, undefined]) {
    const adapter = new ObsidianPathRepositoryAdapter(new Host(absent));
    assert.deepEqual(await adapter.load(), {});
  }
  for (const present of [false, 0, '', [], { goals: [] }]) {
    const adapter = new ObsidianPathRepositoryAdapter(new Host(present));
    assert.deepEqual(await adapter.load(), present);
  }
});

test('coordinator loads once and exposes detached current documents', async () => {
  const host = new Host(canonical());
  const coordinator = new PathPersistenceCoordinator(new PathRepository(new ObsidianPathRepositoryAdapter(host)));
  const [first, second] = await Promise.all([coordinator.load(), coordinator.load()]);
  assert.equal(host.loads, 1);
  first.document.settings.retained = false;
  assert.equal(second.document.settings.retained, true);
  const exposed = coordinator.document;
  exposed.settings.retained = false;
  assert.equal(coordinator.document.settings.retained, true);
});

test('queued full-document updates use the latest revision without losing changes', async () => {
  const host = new Host(canonical());
  const coordinator = new PathPersistenceCoordinator(new PathRepository(new ObsidianPathRepositoryAdapter(host)));
  const first = coordinator.update(async document => {
    await new Promise(resolve => setTimeout(resolve, 5));
    document.settings.first = true;
    return document;
  });
  const second = coordinator.update(document => {
    document.settings.second = true;
    return document;
  });
  const [savedFirst, savedSecond] = await Promise.all([first, second]);
  assert.equal(savedFirst.envelope.revision, 3);
  assert.equal(savedSecond.envelope.revision, 4);
  assert.deepEqual(savedSecond.settings, { retained: true, first: true, second: true });
  assert.equal(host.loads, 1);
  assert.equal(host.writes.length, 2);
});

test('read corruption and host errors propagate without creating writable empty state', async () => {
  const corrupt = new Host({ repositoryVersion: 1, envelope: { schemaVersion: 1 } });
  const corruptCoordinator = new PathPersistenceCoordinator(new PathRepository(new ObsidianPathRepositoryAdapter(corrupt)));
  await assert.rejects(() => corruptCoordinator.load(), PathRepositoryReadError);
  await assert.rejects(() => corruptCoordinator.update(document => document), PathRepositoryReadError);
  assert.equal(corrupt.writes.length, 0);

  const failing = new Host(canonical());
  failing.loadData = async () => { throw new Error('disk unavailable'); };
  await assert.rejects(
    () => new PathPersistenceCoordinator(new PathRepository(new ObsidianPathRepositoryAdapter(failing))).load(),
    error => error instanceof PathRepositoryReadError && error.cause?.message === 'disk unavailable',
  );
});

test('a write failure keeps current state and a later queued update can retry', async () => {
  const host = new Host(canonical());
  host.writeError = new Error('quota exceeded');
  const coordinator = new PathPersistenceCoordinator(new PathRepository(new ObsidianPathRepositoryAdapter(host)));
  await coordinator.load();
  await assert.rejects(
    () => coordinator.update(document => {
      document.settings.failed = true;
      return document;
    }),
    PathRepositoryWriteError,
  );
  assert.deepEqual(coordinator.document.settings, { retained: true });

  host.writeError = undefined;
  const saved = await coordinator.update(document => {
    document.settings.recovered = true;
    return document;
  });
  assert.equal(saved.envelope.revision, 3);
  assert.deepEqual(saved.settings, { retained: true, recovered: true });
});

test('an updater failure does not poison the queue or mutate current state', async () => {
  const host = new Host(canonical());
  const coordinator = new PathPersistenceCoordinator(new PathRepository(new ObsidianPathRepositoryAdapter(host)));
  await assert.rejects(() => coordinator.update(document => {
    document.settings.transient = true;
    throw new Error('mapping failed');
  }), /mapping failed/);
  const saved = await coordinator.update(document => {
    document.settings.safe = true;
    return document;
  });
  assert.deepEqual(saved.settings, { retained: true, safe: true });
  assert.equal(host.writes.length, 1);
});

test('an explicit no-op updater does not write or advance the revision', async () => {
  const host = new Host(canonical());
  const coordinator = new PathPersistenceCoordinator(new PathRepository(new ObsidianPathRepositoryAdapter(host)));
  await coordinator.load();
  const unchanged = await coordinator.update(() => undefined);
  assert.equal(host.writes.length, 0);
  assert.equal(unchanged.envelope.revision, 2);
  assert.equal(coordinator.document.envelope.revision, 2);
});
