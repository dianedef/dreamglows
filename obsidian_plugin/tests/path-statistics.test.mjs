import assert from 'node:assert/strict';
import test from 'node:test';
import { computePathStatistics } from '../src/domain/path/statistics.ts';

const NOW = '2026-09-02T08:00:00.000Z';
const entity = (id, type = 'action', status = 'todo', extra = {}) => ({ id, type, title: id, description: '', status, createdAt: NOW, updatedAt: NOW, tags: [], extensions: { kept: id }, ...extra });
const event = (id, type, occurredAt, entityId = 'action') => ({ id, type, entityId, occurredAt, recordedAt: occurredAt, extensions: { kept: id } });
const envelope = (entities = [], events = []) => ({ schemaVersion: 1, revision: 0, entities, events, extensions: { kept: true } });

test('7, 30, 90 and 365 day inclusive ranges emit every civil day', () => {
  for (const [days, start, end] of [[7, '2026-01-01', '2026-01-07'], [30, '2026-04-01', '2026-04-30'], [90, '2026-01-01', '2026-03-31'], [365, '2026-01-01', '2026-12-31']]) {
    const result = computePathStatistics(envelope(), { start, endInclusive: end });
    assert.equal(result.daily.length, days);
    assert.equal(result.daily[0].date, start);
    assert.equal(result.daily.at(-1).date, end);
  }
});

test('range boundaries are inclusive in Europe/Paris and adjacent days are excluded', () => {
  const events = [
    event('start', 'entity-created', '2026-08-31T22:00:00.000Z'),
    event('end', 'entity-completed', '2026-09-02T21:59:59.999Z'),
    event('after', 'entity-completed', '2026-09-02T22:00:00.000Z'),
  ];
  const result = computePathStatistics(envelope([entity('action')], events), { start: '2026-09-01', endInclusive: '2026-09-02' });
  assert.deepEqual(result.totals, { created: 1, completed: 1, reopened: 0, evidence: 0, reflection: 0 });
  assert.equal(result.daily[0].created, 1);
  assert.equal(result.daily[1].completed, 1);
});

test('completion and reopen remain separate durable facts while reschedule is not accomplishment', () => {
  const events = [
    event('planned', 'planned-period-changed', '2026-09-02T07:00:00+02:00'),
    event('done', 'entity-completed', '2026-09-02T08:00:00+02:00'),
    event('open', 'entity-reopened', '2026-09-02T09:00:00+02:00'),
    event('proof', 'evidence-recorded', '2026-09-02T10:00:00+02:00'),
    event('thought', 'reflection-recorded', '2026-09-02T11:00:00+02:00'),
  ];
  const result = computePathStatistics(envelope([entity('action', 'action', 'in-progress')], events), { start: '2026-09-02', endInclusive: '2026-09-02' });
  assert.deepEqual(result.totals, { created: 0, completed: 1, reopened: 1, evidence: 1, reflection: 1 });
  assert.deepEqual(result.currentActions, { total: 1, todo: 0, inProgress: 1, done: 0, cancelled: 0, completionPercent: 0 });
});

test('current goal and action state ignores unrelated canonical entity types', () => {
  const entities = [entity('g1', 'goal', 'done'), entity('g2', 'goal', 'cancelled'), entity('a1', 'action', 'todo'), entity('a2', 'action', 'in-progress'), entity('proof', 'evidence', 'done')];
  const result = computePathStatistics(envelope(entities), { start: '2026-09-02', endInclusive: '2026-09-02' });
  assert.deepEqual(result.currentGoals, { total: 2, todo: 0, inProgress: 0, done: 1, cancelled: 1, completionPercent: 50 });
  assert.deepEqual(result.currentActions, { total: 2, todo: 1, inProgress: 1, done: 0, cancelled: 0, completionPercent: 0 });
});

test('parent depth is finite and cycles and orphans are explicit', () => {
  const entities = [
    entity('root', 'goal'), entity('child', 'goal', 'todo', { parentId: 'root' }), entity('leaf', 'action', 'todo', { parentId: 'child' }),
    entity('cycle-a', 'goal', 'todo', { parentId: 'cycle-b' }), entity('cycle-b', 'goal', 'todo', { parentId: 'cycle-a' }),
    entity('orphan', 'action', 'todo', { parentId: 'missing' }),
  ];
  const result = computePathStatistics(envelope(entities), { start: '2026-09-02', endInclusive: '2026-09-02' });
  assert.deepEqual(result.hierarchy, { maxDepth: 2, cyclicEntities: 2, orphanEntities: 1 });
  assert.ok(Number.isFinite(result.hierarchy.maxDepth));
});

test('zero state is finite, immutable and invalid ranges are rejected', () => {
  const source = envelope();
  const before = JSON.stringify(source);
  const result = computePathStatistics(source, { start: '2026-09-02', endInclusive: '2026-09-02' });
  assert.deepEqual(result.totals, { created: 0, completed: 0, reopened: 0, evidence: 0, reflection: 0 });
  assert.equal(result.currentGoals.completionPercent, null);
  assert.equal(result.currentActions.completionPercent, null);
  assert.equal(JSON.stringify(result).includes('NaN'), false);
  assert.equal(JSON.stringify(source), before);
  assert.throws(() => computePathStatistics(source, { start: '2026-09-03', endInclusive: '2026-09-02' }), /must not follow/);
  assert.throws(() => computePathStatistics(source, { start: '2026-02-30', endInclusive: '2026-03-01' }), /Invalid civil date/);
});
