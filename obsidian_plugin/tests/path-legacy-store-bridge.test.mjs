import assert from 'node:assert/strict';
import test from 'node:test';
import { mergeLegacyStoreSnapshot, projectLegacyStoreSnapshot } from '../src/domain/path/legacy-store-bridge.ts';

const entity = (overrides) => ({
  id: 'goal-1', type: 'goal', title: 'Cap', description: 'Pourquoi', status: 'in-progress', priority: 'high',
  parentId: 'dream-1', planned: { start: '2026-09-02', end: '2026-09-30' },
  createdAt: '2026-09-01T08:00:00.000Z', updatedAt: '2026-09-02T08:00:00.000Z', tags: ['important'],
  extensions: { legacy: { fields: { progress: 35, timeframe: 'monthly', category: 'Vie' } }, future: true }, ...overrides,
});

const document = () => ({
  repositoryVersion: 1,
  envelope: {
    schemaVersion: 1, revision: 7,
    entities: [
      entity({ id: 'dream-1', type: 'dream', parentId: undefined, title: 'Rêve' }),
      entity({}),
      entity({ id: 'task-1', type: 'action', parentId: 'goal-1', title: 'Agir', status: 'todo', planned: { start: '2026-09-03' }, extensions: { legacyStore: { plannedMinutes: 45, startTime: '09:00' } } }),
      entity({ id: 'focus-1', type: 'focus-session', parentId: 'task-1', title: 'Session', status: 'in-progress', occurredAt: '2026-09-03T07:00:00.000Z', extensions: { legacyStore: { mode: 'focus', goalId: 'goal-1' } } }),
      entity({ id: 'evidence-1', type: 'evidence', title: 'Preuve', status: 'done' }),
    ],
    events: [{ id: 'event-1', type: 'entity-created', entityId: 'goal-1', occurredAt: '2026-09-01T08:00:00.000Z', recordedAt: '2026-09-01T08:00:00.000Z', extensions: { keep: true } }],
    extensions: { futureEnvelope: { keep: true } },
  },
  settings: { timelineStartHour: 7, unknownSetting: true },
  extensions: { futureRepository: ['keep'] },
});

test('projects canonical entities into the complete legacy store dialect', () => {
  const snapshot = projectLegacyStoreSnapshot(document());
  assert.equal(snapshot.goals.length, 1);
  assert.equal(snapshot.goals[0].status, 'in_progress');
  assert.equal(snapshot.goals[0].progress, 35);
  assert.deepEqual(snapshot.goals[0].tasks, ['task-1']);
  assert.equal(snapshot.tasks[0].goalId, 'goal-1');
  assert.equal(snapshot.tasks[0].plannedMinutes, 45);
  assert.equal(snapshot.focusSessions[0].status, 'active');
  assert.equal(snapshot.focusSessions[0].taskId, 'task-1');
  assert.deepEqual(snapshot.settings, { timelineStartHour: 7, unknownSetting: true });
});

test('merges a complete snapshot without losing history, extensions or unmanaged entities', () => {
  const original = document();
  const snapshot = projectLegacyStoreSnapshot(original);
  snapshot.goals[0].title = 'Cap ajusté';
  snapshot.goals[0].status = 'done';
  snapshot.tasks[0].actualMinutes = 38;
  snapshot.focusSessions[0].status = 'completed';
  snapshot.focusSessions[0].endedAt = '2026-09-03T07:38:00.000Z';
  snapshot.settings.timelineStartHour = 6;
  const merged = mergeLegacyStoreSnapshot(original, snapshot);

  assert.deepEqual(merged.envelope.events, original.envelope.events);
  assert.deepEqual(merged.envelope.extensions, original.envelope.extensions);
  assert.deepEqual(merged.extensions, original.extensions);
  assert.ok(merged.envelope.entities.some(item => item.id === 'dream-1'));
  assert.ok(merged.envelope.entities.some(item => item.id === 'evidence-1'));
  const goal = merged.envelope.entities.find(item => item.id === 'goal-1');
  assert.equal(goal.title, 'Cap ajusté');
  assert.equal(goal.status, 'done');
  assert.equal(goal.extensions.future, true);
  assert.equal(goal.extensions.legacy.fields.timeframe, 'monthly');
  const task = merged.envelope.entities.find(item => item.id === 'task-1');
  assert.equal(task.extensions.legacyStore.actualMinutes, 38);
  const focus = merged.envelope.entities.find(item => item.id === 'focus-1');
  assert.equal(focus.status, 'done');
  assert.equal(focus.completedAt, '2026-09-03T07:38:00.000Z');
  assert.equal(merged.settings.timelineStartHour, 6);
  assert.deepEqual(original, document(), 'bridge is pure');
});

test('a complete snapshot replaces only managed entity families', () => {
  const original = document();
  const snapshot = projectLegacyStoreSnapshot(original);
  snapshot.tasks = [];
  const merged = mergeLegacyStoreSnapshot(original, snapshot);
  assert.equal(merged.envelope.entities.some(item => item.id === 'task-1'), false);
  assert.equal(merged.envelope.entities.some(item => item.id === 'evidence-1'), true);
});
