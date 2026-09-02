import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { decodeLegacyV0 } from '../src/domain/path/legacy-v0.ts';
import { migrateLegacyV0 } from '../src/domain/path/migration-v0.ts';

const load = async name => JSON.parse(await readFile(new URL(`./fixtures/legacy/${name}`, import.meta.url), 'utf8'));
const expectedUrl = new URL('./fixtures/expected/path-v1-summary.json', import.meta.url);

function migrate(input) {
  const decoded = decodeLegacyV0(input);
  assert.ok(decoded.value);
  return migrateLegacyV0(decoded.value);
}

test('status and date aliases normalize without conflating civil dates and instants', async () => {
  const models = migrate(await load('models-dialect.json'));
  assert.deepEqual(models.value.entities.map(({ status }) => status), ['in-progress', 'done']);
  assert.equal(models.value.entities[0].planned.start, '2026-03-28T23:00:00.000Z');
  const conflicts = migrate(await load('view-dialect-conflicts.json'));
  assert.equal(conflicts.value.entities[2].planned.start, '2026-09-02');
});

test('child-owned relations win and a sole inverse alias fills only a missing parent', () => {
  const result = migrate({ goals: [
    { id: 'g1', tasks: ['t1', 't2'], childGoals: ['g3'] },
    { id: 'g2', tasks: ['t2'], childGoals: ['g4'] },
    { id: 'g3', parentGoalId: 'g2' },
    { id: 'g4' },
  ], tasks: [{ id: 't1' }, { id: 't2' }] });
  const byId = new Map(result.value.entities.map(entity => [entity.id, entity]));
  assert.equal(byId.get('t1').parentId, 'g1');
  assert.equal(byId.get('t2').parentId, undefined);
  assert.equal(byId.get('g3').parentId, 'g2');
  assert.equal(byId.get('g4').parentId, 'g2');
  assert.ok(result.diagnostics.some(({ code }) => code === 'ambiguous-inverse-relation'));
  assert.ok(result.diagnostics.some(({ code }) => code === 'conflicting-relation-preserved'));
});

test('unknown values and unresolved relation evidence remain recoverable', async () => {
  const result = migrate(await load('view-dialect-conflicts.json'));
  const child = result.value.entities[1];
  assert.equal(child.parentId, '10000000-0000-4000-8000-000000000099');
  assert.deepEqual(child.extensions.legacy.relations.inverseParentIds, ['10000000-0000-4000-8000-000000000010']);
  assert.deepEqual(result.value.extensions.legacy.envelope.futureEnvelopeField, ['must', 'survive']);
  assert.ok(result.diagnostics.some(({ code }) => code === 'orphan-relation-preserved'));
});

test('missing and duplicate identifiers receive stable, visible deterministic identities', () => {
  const input = { goals: [{ title: 'same' }, { id: 'taken' }], tasks: [{ id: 'taken' }, { title: 'same' }] };
  const first = migrate(input);
  const second = migrate(input);
  assert.deepEqual(second, first);
  assert.equal(new Set(first.value.entities.map(({ id }) => id)).size, 4);
  assert.match(first.value.entities[0].id, /^legacy-goal-0-[0-9a-f]{8}$/);
  assert.equal(first.value.entities[2].id, 'taken~2');
  assert.ok(first.diagnostics.some(({ code }) => code === 'generated-id'));
  assert.ok(first.diagnostics.some(({ code }) => code === 'duplicate-id'));
});

test('a canonical second run is an exact no-op', async () => {
  const first = migrate(await load('models-dialect.json'));
  const second = migrateLegacyV0(first.value);
  assert.equal(second.value, first.value);
  assert.deepEqual(second.diagnostics, []);
  assert.equal(second.migrated, false);
});

test('migration is pure and preserves source object structure', async () => {
  const source = await load('models-dialect.json');
  const before = structuredClone(source);
  migrate(source);
  assert.deepEqual(source, before);
});

test('reviewed canonical summaries and diagnostic order match the golden fixture', async () => {
  const expectedBytes = await readFile(expectedUrl);
  assert.equal(createHash('sha256').update(expectedBytes).digest('hex'), 'bce3568f841e324ee15b6d0c0f3ec7b968aeac9f43f8b3c551356ac975d26e1a');
  const expected = JSON.parse(expectedBytes.toString('utf8'));
  for (const name of Object.keys(expected)) {
    const result = migrate(await load(name));
    const actual = {
      schemaVersion: result.value.schemaVersion,
      revision: result.value.revision,
      identities: result.value.entities.map(({ id }) => id),
      types: result.value.entities.map(({ type }) => type),
      statuses: result.value.entities.map(({ status }) => status),
      parents: result.value.entities.map(({ parentId }) => parentId ?? null),
      planned: result.value.entities.map(({ planned }) => [planned?.start ?? null, planned?.end ?? null]),
      diagnostics: result.diagnostics.map(({ code }) => code),
    };
    assert.deepEqual(actual, expected[name], name);
  }
});
