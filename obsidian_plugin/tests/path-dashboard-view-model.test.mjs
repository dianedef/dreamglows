import assert from 'node:assert/strict';
import test from 'node:test';
import { dashboardViewModel } from '../src/domain/path/dashboard-view-model.ts';

const entity = (id, type = 'action', status = 'todo', extra = {}) => ({ id, type, title: id, description: '', status, createdAt: '2026-09-01T08:00:00.000Z', updatedAt: '2026-09-01T08:00:00.000Z', tags: [], extensions: { kept: id }, ...extra });
const event = (id, type, entityId, occurredAt, recordedAt = occurredAt) => ({ id, type, entityId, occurredAt, recordedAt, extensions: { kept: id } });
const temporal = (items = []) => ({ range: { start: '2026-09-02', end: '2026-09-02' }, entities: items.map(item => item.entity), unscheduled: [], invalidTemporal: [], items });
const history = (items = []) => ({ range: { start: '2026-08-31', end: '2026-09-06' }, entities: [], unscheduled: [], invalidTemporal: [], items });

test('today counts use inherited projection overlap while current counts use canonical status', () => {
  const spanning = entity('spanning', 'action', 'in-progress', { planned: { start: '2026-09-01', end: '2026-09-03' } });
  const done = entity('done', 'action', 'done');
  const outside = entity('outside', 'action', 'todo', { priority: 'high' });
  const goal = entity('goal', 'goal', 'in-progress', { priority: 'high' });
  const cancelledGoal = entity('cancelled-goal', 'goal', 'cancelled', { priority: 'high' });
  const envelope = { schemaVersion: 1, revision: 0, entities: [spanning, done, outside, goal, cancelledGoal], events: [], extensions: {} };
  const today = temporal([{ id: spanning.id, entity: spanning, start: '2026-09-01', end: '2026-09-03' }, { id: done.id, entity: done, start: '2026-09-02', end: '2026-09-02' }]);
  const result = dashboardViewModel(envelope, today, history(), '2026-09-02');
  assert.deepEqual(result.todayActions, { total: 2, todo: 0, inProgress: 1, done: 1, cancelled: 0, completionPercent: 50 });
  assert.deepEqual(result.currentActions, { total: 3, todo: 1, inProgress: 1, done: 1, cancelled: 0 });
  assert.deepEqual(result.currentGoals, { total: 2, todo: 0, inProgress: 1, done: 0, cancelled: 1 });
  assert.equal(result.activeHighPriority, 2);
});

test('durable completion and reopen facts are both retained newest first', () => {
  const action = entity('action', 'action', 'in-progress');
  const completed = event('completed', 'entity-completed', action.id, '2026-09-02T08:00:00+02:00');
  const reopened = event('reopened', 'entity-reopened', action.id, '2026-09-02T09:00:00+02:00');
  const result = dashboardViewModel(
    { schemaVersion: 1, revision: 2, entities: [action], events: [completed, reopened], extensions: {} },
    temporal(),
    history([{ id: completed.id, event: completed, entity: action }, { id: reopened.id, event: reopened, entity: action }]),
    '2026-09-02',
  );
  assert.deepEqual(result.timeline.map(item => item.id), ['reopened', 'completed']);
  assert.equal(result.timeline[0].entity, action);
});

test('Paris civil boundary includes local today and excludes adjacent local days', () => {
  const action = entity('action');
  const previousUtcDay = event('local-today-start', 'entity-created', action.id, '2026-09-01T22:30:00.000Z');
  const utcToday = event('local-today-end', 'planned-period-changed', action.id, '2026-09-02T21:59:59.000Z');
  const nextLocalDay = event('local-tomorrow', 'entity-completed', action.id, '2026-09-02T22:00:00.000Z');
  const items = [previousUtcDay, utcToday, nextLocalDay].map(value => ({ id: value.id, event: value, entity: action }));
  const result = dashboardViewModel({ schemaVersion: 1, revision: 0, entities: [action], events: [], extensions: {} }, temporal(), history(items), '2026-09-02');
  assert.deepEqual(result.timeline.map(item => item.id), ['local-today-end', 'local-today-start']);
});

test('zero state is honest, finite and contains no synthetic fallback timeline', () => {
  const result = dashboardViewModel({ schemaVersion: 1, revision: 0, entities: [], events: [], extensions: {} }, temporal(), history(), '2026-09-02');
  assert.deepEqual(result.todayActions, { total: 0, todo: 0, inProgress: 0, done: 0, cancelled: 0, completionPercent: null });
  assert.deepEqual(result.currentGoals, { total: 0, todo: 0, inProgress: 0, done: 0, cancelled: 0 });
  assert.deepEqual(result.currentActions, result.currentGoals);
  assert.equal(result.activeHighPriority, 0);
  assert.deepEqual(result.timeline, []);
  assert.equal(JSON.stringify(result).includes('NaN'), false);
});

test('derivation preserves all source objects and rejects invalid civil dates', () => {
  const action = entity('action', 'action', 'todo', { priority: 'high', legacyTime: 999 });
  const durable = event('event', 'entity-created', action.id, '2026-09-02T08:00:00+02:00');
  const envelope = { schemaVersion: 1, revision: 0, entities: [action], events: [durable], extensions: { kept: true } };
  const today = temporal([{ id: action.id, entity: action, start: '2026-09-02', end: '2026-09-02' }]);
  const historyProjection = history([{ id: durable.id, event: durable, entity: action }]);
  const before = JSON.stringify({ envelope, today, historyProjection });
  dashboardViewModel(envelope, today, historyProjection, '2026-09-02');
  assert.equal(JSON.stringify({ envelope, today, historyProjection }), before);
  assert.throws(() => dashboardViewModel(envelope, today, historyProjection, '2026-02-30'), /Invalid dashboard reference date/);
});
