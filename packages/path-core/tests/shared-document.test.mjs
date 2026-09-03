import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { PathRepository } from '../src/repository.ts';

test('TypeScript charge sans conversion le document partagé avec Flutter', async () => {
  const source = JSON.parse(await readFile(new URL('../fixtures/path-repository-v1.json', import.meta.url), 'utf8'));
  const repository = new PathRepository({load: async () => source, save: async () => {}});
  const result = await repository.load();
  assert.equal(result.document.envelope.entities[1].id, 'action-shared');
  assert.equal(result.document.envelope.entities[1].parentId, 'goal-shared');
  assert.deepEqual(result.document.envelope.entities[1].planned, {start: '2026-09-04'});
  assert.equal(result.document.extensions.futureRepositoryField, 42);
});
