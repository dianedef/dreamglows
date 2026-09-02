import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import test from 'node:test';

const sourceDirectory = new URL('../src/', import.meta.url);
const forbiddenRuntimeImports = /(?:from\s+|import\s*\()['"](?:convex|obsidian|vue|pinia|@vue|electron|@tauri-apps|node:)/;

test('the canonical domain has no client, framework, provider, or platform runtime dependency', async () => {
  const files = (await readdir(sourceDirectory)).filter(name => name.endsWith('.ts'));
  assert.ok(files.length > 0);

  for (const file of files) {
    const source = await readFile(new URL(file, sourceDirectory), 'utf8');
    assert.doesNotMatch(source, forbiddenRuntimeImports, file);
  }
});

test('the public entrypoint exposes the canonical repository and command boundary', async () => {
  const core = await import('../src/index.ts');
  assert.equal(core.PATH_SCHEMA_VERSION, 1);
  assert.equal(core.PATH_REPOSITORY_VERSION, 1);
  assert.equal(typeof core.PathRepository, 'function');
  assert.equal(typeof core.createPathCommandPort, 'function');
});
