import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { PathRepository, PathRepositoryReadError } from '@dreamglows/path-core/repository';
import { NodePathFileAdapter } from '../src/backend/node-path-file-adapter.ts';

const entity = {
  id: 'action-1',
  type: 'action',
  title: 'Commencer',
  description: '',
  status: 'todo',
  createdAt: '2026-09-03T08:00:00.000Z',
  updatedAt: '2026-09-03T08:00:00.000Z',
  tags: [],
  extensions: {},
};

const canonical = revision => ({
  repositoryVersion: 1,
  envelope: { schemaVersion: 1, revision, entities: [structuredClone(entity)], events: [], extensions: {} },
  settings: {},
  extensions: {},
});

async function withTemporaryDocument(run) {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'dreamglows-path-'));
  try {
    await run(path.join(directory, 'path.json'));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

test('a new installation loads as an empty migratable document', async () => {
  await withTemporaryDocument(async primaryPath => {
    const adapter = new NodePathFileAdapter(primaryPath);
    const result = await new PathRepository(adapter).load();
    assert.equal(result.migrated, true);
    assert.equal(result.document.envelope.entities.length, 0);
    assert.equal(adapter.recoveryState.source, 'empty');
  });
});

test('canonical state survives a new repository instance and keeps its revision', async () => {
  await withTemporaryDocument(async primaryPath => {
    const adapter = new NodePathFileAdapter(primaryPath);
    const repository = new PathRepository(adapter);
    await repository.load();
    const saved = await repository.save(canonical(0), 0);

    const reloaded = await new PathRepository(new NodePathFileAdapter(primaryPath)).load();
    assert.deepEqual(reloaded.document, saved);
    assert.equal(reloaded.document.envelope.revision, 1);
  });
});

test('a second save preserves the previous primary bytes as a valid backup', async () => {
  await withTemporaryDocument(async primaryPath => {
    const adapter = new NodePathFileAdapter(primaryPath);
    const repository = new PathRepository(adapter);
    await repository.load();
    const first = await repository.save(canonical(0), 0);
    const second = await repository.save({ ...first, settings: { changed: true } }, 1);

    assert.equal(second.envelope.revision, 2);
    assert.deepEqual(JSON.parse(await readFile(adapter.backupPath, 'utf8')), first);
  });
});

test('a missing primary loads the backup visibly without rewriting either file', async () => {
  await withTemporaryDocument(async primaryPath => {
    const adapter = new NodePathFileAdapter(primaryPath);
    await writeFile(adapter.backupPath, JSON.stringify(canonical(4)), 'utf8');

    const loaded = await new PathRepository(adapter).load();
    assert.equal(loaded.document.envelope.revision, 4);
    assert.equal(adapter.recoveryState.source, 'backup');
  });
});

test('corrupt primary data fails closed and reports whether recovery is available', async () => {
  await withTemporaryDocument(async primaryPath => {
    const adapter = new NodePathFileAdapter(primaryPath);
    await writeFile(primaryPath, '{broken', 'utf8');
    await writeFile(adapter.backupPath, JSON.stringify(canonical(7)), 'utf8');

    await assert.rejects(() => new PathRepository(adapter).load(), error => {
      assert.ok(error instanceof PathRepositoryReadError);
      assert.equal(error.cause.backupAvailable, true);
      return true;
    });
    assert.equal(await readFile(primaryPath, 'utf8'), '{broken');
  });
});

test('explicit recovery restores a valid backup after primary corruption', async () => {
  await withTemporaryDocument(async primaryPath => {
    const adapter = new NodePathFileAdapter(primaryPath);
    await writeFile(primaryPath, '{broken', 'utf8');
    await writeFile(adapter.backupPath, JSON.stringify(canonical(9)), 'utf8');

    await adapter.restoreBackup();
    const loaded = await new PathRepository(new NodePathFileAdapter(primaryPath)).load();
    assert.equal(loaded.document.envelope.revision, 9);
  });
});

test('an interrupted replacement can recover from the durable backup', async () => {
  await withTemporaryDocument(async primaryPath => {
    const adapter = new NodePathFileAdapter(primaryPath);
    await writeFile(primaryPath, JSON.stringify(canonical(2)), 'utf8');
    await rename(primaryPath, adapter.backupPath);

    const loaded = await new PathRepository(adapter).load();
    assert.equal(loaded.document.envelope.revision, 2);
    assert.equal(adapter.recoveryState.source, 'backup');
  });
});

test('a failed temporary write leaves the last primary bytes unchanged', async () => {
  await withTemporaryDocument(async primaryPath => {
    const adapter = new NodePathFileAdapter(primaryPath);
    const original = JSON.stringify(canonical(3));
    await writeFile(primaryPath, original, 'utf8');
    await mkdir(`${primaryPath}.tmp`);

    await assert.rejects(() => adapter.save(canonical(4)));
    assert.equal(await readFile(primaryPath, 'utf8'), original);
  });
});
