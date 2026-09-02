import assert from 'node:assert/strict';
import test from 'node:test';
import { createPathCommandPort } from '../src/domain/path/command-port.ts';
import { projectToday, projectWeek } from '../src/domain/path/projections.ts';

const entity = () => ({
  id: 'action-1', type: 'action', title: 'Écrire', description: '', status: 'todo',
  createdAt: '2026-03-20T10:00:00.000Z', updatedAt: '2026-03-20T10:00:00.000Z',
  tags: [], extensions: {},
});
const canonical = () => ({
  repositoryVersion: 1,
  envelope: { schemaVersion: 1, revision: 2, entities: [entity()], events: [], extensions: {} },
  settings: {}, extensions: {},
});

function harness(initial = canonical()) {
  let document = structuredClone(initial);
  let writes = 0;
  let after = 0;
  let writeError;
  let id = 0;
  const port = createPathCommandPort({
    async updateDocument(updater) {
      const candidate = await updater(structuredClone(document));
      if (candidate === undefined) return structuredClone(document);
      if (writeError) throw writeError;
      candidate.envelope.revision = document.envelope.revision + 1;
      document = structuredClone(candidate);
      writes += 1;
      return structuredClone(document);
    },
    async afterPersist(saved) {
      after += 1;
      assert.deepEqual(saved, document);
    },
    now: () => '2026-03-29T08:00:00.000Z',
    createId: () => `event-${++id}`,
  });
  return {
    port,
    snapshot: () => structuredClone(document),
    counts: () => ({ writes, after }),
    failWritesWith: error => { writeError = error; },
  };
}

test('schedule persists one event and survives Today, Week and reload projections', async () => {
  const run = harness();
  const result = await run.port.execute({
    type: 'schedule', commandId: 'command-1', entityId: 'action-1', planned: { start: '2026-03-29' },
  });
  assert.deepEqual(result, { accepted: true, revision: 3, entityId: 'action-1', eventId: 'event-1', replayed: false });
  assert.deepEqual(run.counts(), { writes: 1, after: 1 });
  const reloaded = run.snapshot();
  assert.equal(reloaded.envelope.events.length, 1);
  const options = { referenceDate: '2026-03-29', timeZone: 'Europe/Paris' };
  assert.deepEqual(projectToday(reloaded.envelope, options).items.map(item => item.id), ['action-1']);
  assert.deepEqual(projectWeek(reloaded.envelope, options).items.map(item => item.id), ['action-1']);
});

test('domain rejection performs no save and no post-persist synchronization', async () => {
  const run = harness();
  const result = await run.port.execute({ type: 'complete', commandId: 'command-missing', entityId: 'missing' });
  assert.deepEqual(result, { accepted: false, reason: 'entity-not-found' });
  assert.deepEqual(run.counts(), { writes: 0, after: 0 });
  assert.equal(run.snapshot().envelope.events.length, 0);
});

test('a durable matching command id replays as success without save', async () => {
  const initial = canonical();
  initial.envelope.events.push({
    id: 'event-durable', type: 'entity-completed', entityId: 'action-1',
    occurredAt: '2026-03-28T08:00:00.000Z', recordedAt: '2026-03-28T08:00:00.000Z',
    extensions: { commandId: 'command-durable' },
  });
  initial.envelope.entities[0].status = 'done';
  const run = harness(initial);
  const result = await run.port.execute({ type: 'complete', commandId: 'command-durable', entityId: 'action-1' });
  assert.deepEqual(result, { accepted: true, revision: 2, entityId: 'action-1', eventId: 'event-durable', replayed: true });
  assert.deepEqual(run.counts(), { writes: 0, after: 0 });
});

test('reusing a command id for another intent is rejected without save', async () => {
  const initial = canonical();
  initial.envelope.events.push({
    id: 'event-durable', type: 'entity-completed', entityId: 'other',
    occurredAt: '2026-03-28T08:00:00.000Z', recordedAt: '2026-03-28T08:00:00.000Z',
    extensions: { commandId: 'command-durable' },
  });
  const run = harness(initial);
  assert.deepEqual(
    await run.port.execute({ type: 'complete', commandId: 'command-durable', entityId: 'action-1' }),
    { accepted: false, reason: 'invalid-command' },
  );
  assert.deepEqual(run.counts(), { writes: 0, after: 0 });
});

test('write failure propagates and never invokes afterPersist', async () => {
  const run = harness();
  run.failWritesWith(new Error('disk full'));
  await assert.rejects(
    () => run.port.execute({ type: 'complete', commandId: 'command-1', entityId: 'action-1' }),
    /disk full/,
  );
  assert.deepEqual(run.counts(), { writes: 0, after: 0 });
  assert.equal(run.snapshot().envelope.entities[0].status, 'todo');
  assert.equal(run.snapshot().envelope.events.length, 0);
});

test('complete and reopen each append exactly one event', async () => {
  const run = harness();
  const completed = await run.port.execute({ type: 'complete', commandId: 'complete-1', entityId: 'action-1' });
  const reopened = await run.port.execute({ type: 'reopen', commandId: 'reopen-1', entityId: 'action-1' });
  assert.equal(completed.accepted, true);
  assert.equal(reopened.accepted, true);
  assert.deepEqual(run.snapshot().envelope.events.map(item => item.type), ['entity-completed', 'entity-reopened']);
  assert.equal(run.snapshot().envelope.entities[0].status, 'in-progress');
  assert.deepEqual(run.counts(), { writes: 2, after: 2 });
});

test('reschedule dispatches through the same transaction contract', async () => {
  const initial = canonical();
  initial.envelope.entities[0].planned = { start: '2026-03-28' };
  const run = harness(initial);
  const result = await run.port.execute({
    type: 'reschedule', commandId: 'move-1', entityId: 'action-1', planned: { start: '2026-03-29' },
  });
  assert.equal(result.accepted, true);
  assert.deepEqual(run.snapshot().envelope.entities[0].planned, { start: '2026-03-29' });
  assert.equal(run.snapshot().envelope.events.length, 1);
});

test('reparent persists one hierarchy event and supports detaching to the root', async () => {
  const initial = canonical();
  initial.envelope.entities.unshift({
    ...entity(), id: 'goal-1', type: 'goal', title: 'Goal',
  });
  const run = harness(initial);
  const attached = await run.port.execute({
    type: 'reparent', commandId: 'parent-1', entityId: 'action-1', nextParentId: 'goal-1',
  });
  assert.equal(attached.accepted, true);
  assert.equal(run.snapshot().envelope.entities.find(item => item.id === 'action-1').parentId, 'goal-1');
  assert.equal(run.snapshot().envelope.events.at(-1).nextParentId, 'goal-1');

  const detached = await run.port.execute({
    type: 'reparent', commandId: 'parent-2', entityId: 'action-1',
  });
  assert.equal(detached.accepted, true);
  assert.equal(run.snapshot().envelope.entities.find(item => item.id === 'action-1').parentId, undefined);
  assert.equal(run.snapshot().envelope.events.at(-1).nextParentId, undefined);
  assert.deepEqual(run.counts(), { writes: 2, after: 2 });
});

test('invalid reparent operations are domain rejections with no persistence', async () => {
  const initial = canonical();
  initial.envelope.entities.unshift({ ...entity(), id: 'habit-1', type: 'habit' });
  const run = harness(initial);
  assert.deepEqual(
    await run.port.execute({ type: 'reparent', commandId: 'bad-parent', entityId: 'action-1', nextParentId: 'habit-1' }),
    { accepted: false, reason: 'incompatible-type' },
  );
  assert.deepEqual(run.counts(), { writes: 0, after: 0 });
});

test('resize changes exactly one requested bound and appends one event', async () => {
  const initial = canonical();
  initial.envelope.entities[0].planned = { start: '2026-03-27', end: '2026-03-29' };
  const run = harness(initial);
  const result = await run.port.execute({
    type: 'resize', commandId: 'resize-1', entityId: 'action-1', patch: { end: '2026-03-30' },
  });
  assert.equal(result.accepted, true);
  assert.deepEqual(run.snapshot().envelope.entities[0].planned, { start: '2026-03-27', end: '2026-03-30' });
  assert.equal(run.snapshot().envelope.events.length, 1);
  assert.equal(run.snapshot().envelope.events[0].extensions.command, 'resize');
  assert.deepEqual(run.counts(), { writes: 1, after: 1 });
});

test('resize rejects an invalid two-bound patch without persistence', async () => {
  const initial = canonical();
  initial.envelope.entities[0].planned = { start: '2026-03-27', end: '2026-03-29' };
  const run = harness(initial);
  assert.deepEqual(
    await run.port.execute({
      type: 'resize', commandId: 'resize-invalid', entityId: 'action-1',
      patch: { start: '2026-03-28', end: '2026-03-30' },
    }),
    { accepted: false, reason: 'invalid-command' },
  );
  assert.deepEqual(run.counts(), { writes: 0, after: 0 });
});

test('planned-command replay matches the requested next period and rejects another intention', async () => {
  const initial = canonical();
  initial.envelope.entities[0].planned = { start: '2026-03-29' };
  initial.envelope.events.push({
    id: 'event-scheduled', type: 'planned-period-changed', entityId: 'action-1',
    occurredAt: '2026-03-28T08:00:00.000Z', recordedAt: '2026-03-28T08:00:00.000Z',
    nextPlanned: { start: '2026-03-29' }, extensions: { commandId: 'schedule-durable', command: 'schedule' },
  });
  const run = harness(initial);
  assert.deepEqual(
    await run.port.execute({ type: 'schedule', commandId: 'schedule-durable', entityId: 'action-1', planned: { start: '2026-03-29' } }),
    { accepted: true, revision: 2, entityId: 'action-1', eventId: 'event-scheduled', replayed: true },
  );
  assert.deepEqual(
    await run.port.execute({ type: 'schedule', commandId: 'schedule-durable', entityId: 'action-1', planned: { start: '2026-03-30' } }),
    { accepted: false, reason: 'invalid-command' },
  );
  assert.deepEqual(run.counts(), { writes: 0, after: 0 });
});

test('reparent and resize replay require the exact persisted intention', async () => {
  const initial = canonical();
  initial.envelope.entities[0].planned = { start: '2026-03-27', end: '2026-03-30' };
  initial.envelope.events.push(
    {
      id: 'event-parent', type: 'entity-reparented', entityId: 'action-1',
      nextParentId: 'goal-1', occurredAt: '2026-03-28T08:00:00.000Z', recordedAt: '2026-03-28T08:00:00.000Z',
      extensions: { commandId: 'parent-durable' },
    },
    {
      id: 'event-resize', type: 'planned-period-changed', entityId: 'action-1',
      nextPlanned: { start: '2026-03-27', end: '2026-03-30' },
      occurredAt: '2026-03-28T08:00:00.000Z', recordedAt: '2026-03-28T08:00:00.000Z',
      extensions: { commandId: 'resize-durable', command: 'resize' },
    },
  );
  const run = harness(initial);
  assert.equal((await run.port.execute({ type: 'reparent', commandId: 'parent-durable', entityId: 'action-1', nextParentId: 'goal-1' })).accepted, true);
  assert.deepEqual(
    await run.port.execute({ type: 'reparent', commandId: 'parent-durable', entityId: 'action-1', nextParentId: 'goal-2' }),
    { accepted: false, reason: 'invalid-command' },
  );
  assert.equal((await run.port.execute({ type: 'resize', commandId: 'resize-durable', entityId: 'action-1', patch: { end: '2026-03-30' } })).accepted, true);
  assert.deepEqual(
    await run.port.execute({ type: 'resize', commandId: 'resize-durable', entityId: 'action-1', patch: { end: '2026-03-31' } }),
    { accepted: false, reason: 'invalid-command' },
  );
  assert.deepEqual(run.counts(), { writes: 0, after: 0 });
});
