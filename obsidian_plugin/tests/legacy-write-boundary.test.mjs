import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import test from 'node:test';

const source = new URL('../src/', import.meta.url);

test('StorageService cannot write the plugin data document outside the canonical repository', async () => {
  const storage = await readFile(new URL('services/StorageService.ts', source), 'utf8');
  assert.doesNotMatch(storage, /dataFile|loadFromDataJson|saveToDataJson/);
  assert.doesNotMatch(storage, /vault\.adapter\.write/);
});

test('retired parallel timeline and Vue host implementations stay absent', async () => {
  await assert.rejects(access(new URL('services/TimelineService.ts', source)));
  await assert.rejects(access(new URL('views/DreamGlowsView.vue', source)));
});

test('plugin entry point exposes no legacy loadPluginData bypass', async () => {
  const main = await readFile(new URL('main.ts', source), 'utf8');
  assert.doesNotMatch(main, /loadPluginData\s*\(/);
});
