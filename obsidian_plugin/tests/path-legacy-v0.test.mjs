import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { decodeLegacyV0, isCivilDate, isZonedInstant } from '../src/domain/path/index.ts';

const load = async name => JSON.parse(await readFile(new URL(`./fixtures/legacy/${name}`, import.meta.url), 'utf8'));

test('civil dates and explicitly zoned instants stay distinct', () => {
  assert.equal(isCivilDate('2026-09-02'), true);
  assert.equal(isCivilDate('2026-02-30'), false);
  assert.equal(isZonedInstant('2026-09-02T08:00:00+02:00'), true);
  assert.equal(isZonedInstant('2026-09-02T08:00:00'), false);
});

test('the three reviewed legacy dialects decode as v0 without migration', async () => {
  for (const name of ['models-dialect.json', 'view-dialect-conflicts.json', 'settings-only.json']) {
    assert.equal(decodeLegacyV0(await load(name)).value?.schemaVersion, 0, name);
  }
});

test('unknown fields survive in namespaced extensions', async () => {
  const models = decodeLegacyV0(await load('models-dialect.json')).value;
  assert.equal(JSON.stringify(models.goals[0].extensions.legacy.legacyExtra), '{"preserve":"opaque-value"}');
  assert.equal(models.tasks[0].extensions.legacy.unknownScalar, 17);
  const conflicts = decodeLegacyV0(await load('view-dialect-conflicts.json')).value;
  assert.deepEqual(conflicts.extensions.legacy.futureEnvelopeField, ['must', 'survive']);
});

test('contradictory aliases, orphans and ambiguous dates are diagnosed', async () => {
  const codes = new Set(decodeLegacyV0(await load('view-dialect-conflicts.json')).diagnostics.map(d => d.code));
  assert.ok(codes.has('contradictory-relation-alias'));
  assert.ok(codes.has('orphan-relation'));
  assert.ok(codes.has('ambiguous-date'));
  assert.ok(codes.has('inverted-date-range'));
});

test('unsafe keys are removed recursively without prototype pollution', () => {
  const input = JSON.parse('{"goals":[{"id":"g","mystery":{"__proto__":{"polluted":true},"constructor":"bad","kept":1}}]}');
  const result = decodeLegacyV0(input);
  const mystery = result.value.goals[0].extensions.legacy.mystery;
  assert.equal(mystery.kept, 1);
  assert.equal(Object.hasOwn(mystery, '__proto__'), false);
  assert.equal({}.polluted, undefined);
  assert.ok(result.diagnostics.filter(d => d.code === 'unsafe-key').length >= 2);
});

test('cycles and conflicting date aliases are reported while raw fields survive', () => {
  const result = decodeLegacyV0({ goals: [
    { id: 'a', parentGoalId: 'b', dueDate: '2026-09-02', endDate: '2026-09-03' },
    { id: 'b', parentGoalId: 'a' }
  ] });
  const codes = new Set(result.diagnostics.map(d => d.code));
  assert.ok(codes.has('relation-cycle'));
  assert.ok(codes.has('contradictory-date-alias'));
  assert.equal(result.value.goals[0].fields.endDate, '2026-09-03');
});

test('unknown statuses are preserved and diagnosed instead of guessed', () => {
  const result = decodeLegacyV0({ tasks: [{ id: 't', status: 'waiting-for-magic' }] });
  assert.equal(result.value.tasks[0].status, 'waiting-for-magic');
  assert.ok(result.diagnostics.some(d => d.code === 'unknown-status'));
});
