import assert from 'node:assert/strict';
import test from 'node:test';
import { addEvidence, addReflection, complete, createEntity, deleteEntity, endFocusSession, reopen, reparent, resize, reschedule, schedule, startFocusSession, updateEntity } from '../src/domain/path/commands.ts';

const NOW = '2026-09-02T12:00:00.000Z';
let commandSequence = 0;
const deps = (commandId = `command-${++commandSequence}`, ids) => { let id = 0; return { commandId, now: () => NOW, createId: () => { const generated = ids?.[id] ?? `${commandId}-id-${id + 1}`; id += 1; return generated; } }; };
const entity = (id, type = 'action', extra = {}) => ({ id, type, title: id, description: '', status: 'todo', createdAt: NOW, updatedAt: NOW, tags: [], extensions: { kept: true }, ...extra });
const envelope = (entities = [entity('a')]) => ({ schemaVersion: 1, revision: 3, entities, events: [], extensions: { root: true } });

function acceptedOnce(result, original, eventType) {
  assert.equal(result.accepted, true);
  assert.notEqual(result.envelope, original);
  assert.equal(result.envelope.events.length, original.events.length + 1);
  assert.equal(result.event.type, eventType);
  assert.ok(result.event.extensions.commandId);
  assert.deepEqual(original.events, []);
  assert.deepEqual(result.envelope.extensions, original.extensions);
  assert.deepEqual(result.entity.extensions, { kept: true });
}

function rejectedWithoutChange(result, original, reason) {
  assert.deepEqual(result, { accepted: false, envelope: original, reason });
  assert.equal(result.envelope, original);
  assert.equal(original.events.length, 0);
}

test('schedule, reschedule and resize change only planned and append one durable transition', () => {
  const base = envelope();
  const scheduled = schedule(base, 'a', { start: '2026-09-03', end: '2026-09-05' }, deps());
  acceptedOnce(scheduled, base, 'planned-period-changed');
  assert.deepEqual(scheduled.entity.planned, { start: '2026-09-03', end: '2026-09-05' });
  assert.equal(scheduled.entity.completedAt, undefined);
  const moved = reschedule(scheduled.envelope, 'a', { start: '2026-09-04', end: '2026-09-06' }, deps());
  assert.equal(moved.accepted, true);
  assert.deepEqual(moved.event.previousPlanned, scheduled.entity.planned);
  const resized = resize(moved.envelope, 'a', { end: '2026-09-08' }, deps());
  assert.equal(resized.accepted, true);
  assert.deepEqual(resized.entity.planned, { start: '2026-09-04', end: '2026-09-08' });
});

test('reschedule with a new start preserves duration for civil dates and zoned instants', () => {
  const civil = envelope([entity('a', 'action', { planned: { start: '2026-09-03', end: '2026-09-05' } })]);
  const movedCivil = reschedule(civil, 'a', { start: '2026-09-10' }, deps());
  assert.equal(movedCivil.accepted, true);
  assert.deepEqual(movedCivil.entity.planned, { start: '2026-09-10', end: '2026-09-12' });

  const instant = envelope([entity('a', 'action', { planned: { start: '2026-09-03T08:00:00+02:00', end: '2026-09-03T09:30:00+02:00' } })]);
  const movedInstant = reschedule(instant, 'a', { start: '2026-09-04T10:00:00+02:00' }, deps());
  assert.equal(movedInstant.accepted, true);
  assert.equal(Date.parse(movedInstant.entity.planned.end) - Date.parse(movedInstant.entity.planned.start), 90 * 60 * 1000);
});

test('complete and reopen keep planned history separate from actual completion', () => {
  const base = envelope([entity('a', 'action', { planned: { start: '2026-09-03' } })]);
  const done = complete(base, 'a', deps());
  acceptedOnce(done, base, 'entity-completed');
  assert.equal(done.entity.completedAt, NOW);
  assert.deepEqual(done.entity.planned, { start: '2026-09-03' });
  const open = reopen(done.envelope, 'a', deps());
  assert.equal(open.accepted, true);
  assert.equal(open.event.type, 'entity-reopened');
  assert.equal(open.entity.completedAt, undefined);
  assert.deepEqual(open.entity.planned, { start: '2026-09-03' });
});

test('reparent records previous and next parent and prevents cycles', () => {
  const base = envelope([entity('root', 'dream'), entity('g1', 'goal', { parentId: 'root' }), entity('g2', 'goal', { parentId: 'g1' })]);
  const moved = reparent(base, 'g2', 'root', deps());
  acceptedOnce(moved, base, 'entity-reparented');
  assert.equal(moved.event.previousParentId, 'g1');
  assert.equal(moved.event.nextParentId, 'root');
  rejectedWithoutChange(reparent(base, 'root', 'g2', deps()), base, 'incompatible-type');
  rejectedWithoutChange(reparent(base, 'g1', 'g2', deps()), base, 'cycle');
});

test('evidence and reflection create one immutable child and exactly one record event', () => {
  for (const [command, kind, eventType] of [[addEvidence, 'evidence', 'evidence-recorded'], [addReflection, 'reflection', 'reflection-recorded']]) {
    const base = envelope();
    const result = command(base, 'a', { title: 'Trace', occurredAt: NOW, tags: ['x'], extensions: { source: 'synthetic' } }, deps());
    assert.equal(result.accepted, true);
    assert.equal(result.envelope.entities.length, 2);
    assert.equal(result.entity.type, kind);
    assert.equal(result.entity.parentId, 'a');
    assert.equal(result.event.type, eventType);
    assert.equal(result.event.relatedEntityId, result.entity.id);
    assert.equal(result.envelope.events.length, 1);
    assert.equal(base.entities.length, 1);
  }
});

test('missing entities, incompatible types, invalid/inverted dates and no-ops are inert', () => {
  const base = envelope([entity('a'), entity('proof', 'evidence')]);
  rejectedWithoutChange(schedule(base, 'missing', { start: '2026-09-03' }, deps()), base, 'entity-not-found');
  rejectedWithoutChange(schedule(base, 'proof', { start: '2026-09-03' }, deps()), base, 'incompatible-type');
  rejectedWithoutChange(schedule(base, 'a', { start: '2026-02-30' }, deps()), base, 'invalid-date');
  rejectedWithoutChange(schedule(base, 'a', {}, deps()), base, 'invalid-command');
  rejectedWithoutChange(schedule(base, 'a', { start: '2026-09-05', end: '2026-09-03' }, deps()), base, 'inverted-period');
  rejectedWithoutChange(reschedule(base, 'a', { start: '2026-09-03' }, deps()), base, 'no-op');
  rejectedWithoutChange(resize(base, 'a', { end: '2026-09-03' }, deps()), base, 'no-op');
  rejectedWithoutChange(reopen(base, 'a', deps()), base, 'no-op');
  rejectedWithoutChange(addEvidence(base, 'a', { title: '   ' }, deps()), base, 'no-op');
});

test('resize changes exactly one bound and reparent enforces the hierarchy matrix', () => {
  const base = envelope([
    entity('dream', 'dream'),
    entity('goal', 'goal', { parentId: 'dream' }),
    entity('milestone', 'milestone', { parentId: 'goal' }),
    entity('action', 'action', { parentId: 'goal', planned: { start: '2026-09-03', end: '2026-09-04' } }),
  ]);
  rejectedWithoutChange(resize(base, 'action', { start: '2026-09-04', end: '2026-09-05' }, deps()), base, 'invalid-command');
  rejectedWithoutChange(reparent(base, 'action', 'dream', deps()), base, 'incompatible-type');
  rejectedWithoutChange(reparent(base, 'milestone', 'dream', deps()), base, 'incompatible-type');
  assert.equal(reparent(base, 'action', 'milestone', deps()).accepted, true);
});

test('same planned period, missing parent and mixed date kinds are rejected without consuming ids', () => {
  const base = envelope([entity('a', 'action', { planned: { start: '2026-09-03' } })]);
  const dependency = deps();
  rejectedWithoutChange(reschedule(base, 'a', { start: '2026-09-03' }, dependency), base, 'no-op');
  rejectedWithoutChange(resize(base, 'a', {}, dependency), base, 'no-op');
  rejectedWithoutChange(reparent(base, 'a', 'missing', dependency), base, 'parent-not-found');
  rejectedWithoutChange(reschedule(base, 'a', { start: '2026-09-03', end: NOW }, dependency), base, 'invalid-date');
  assert.equal(dependency.createId(), `${dependency.commandId}-id-1`);
});

test('every command is idempotent by commandId and preserves prior events and extensions', () => {
  const oldEvent = { id: 'old-event', type: 'entity-created', entityId: 'a', occurredAt: NOW, recordedAt: NOW, extensions: { commandId: 'old-command', future: true } };
  const base = { ...envelope(), events: [oldEvent] };
  const first = complete(base, 'a', deps('complete-a'));
  assert.equal(first.accepted, true);
  const replay = complete(first.envelope, 'a', deps('complete-a'));
  assert.equal(replay.accepted, false);
  assert.equal(replay.reason, 'no-op');
  assert.equal(replay.envelope, first.envelope);
  assert.equal(first.envelope.events.length, 2);
  assert.deepEqual(first.envelope.events[0], oldEvent);
  assert.deepEqual(first.envelope.extensions, { root: true });
});

test('all eight command families reject replay of an accepted commandId', () => {
  const cases = [
    [envelope(), (state, dependency) => schedule(state, 'a', { start: '2026-09-03' }, dependency)],
    [envelope([entity('a', 'action', { planned: { start: '2026-09-03' } })]), (state, dependency) => reschedule(state, 'a', { start: '2026-09-04' }, dependency)],
    [envelope([entity('a', 'action', { planned: { start: '2026-09-03' } })]), (state, dependency) => resize(state, 'a', { end: '2026-09-05' }, dependency)],
    [envelope(), (state, dependency) => complete(state, 'a', dependency)],
    [envelope([entity('a', 'action', { status: 'done', completedAt: NOW })]), (state, dependency) => reopen(state, 'a', dependency)],
    [envelope([entity('root', 'dream'), entity('g', 'goal')]), (state, dependency) => reparent(state, 'g', 'root', dependency)],
    [envelope(), (state, dependency) => addEvidence(state, 'a', { title: 'E' }, dependency)],
    [envelope(), (state, dependency) => addReflection(state, 'a', { title: 'R' }, dependency)],
  ];
  cases.forEach(([base, command], index) => {
    const commandId = `replay-${index}`;
    const first = command(base, deps(commandId));
    assert.equal(first.accepted, true);
    const replay = command(first.envelope, deps(commandId));
    assert.equal(replay.accepted, false);
    assert.equal(replay.reason, 'no-op');
    assert.equal(replay.envelope, first.envelope);
  });
});

test('empty command ids and entity/event id collisions are inert', () => {
  const base = envelope();
  rejectedWithoutChange(complete(base, 'a', deps('')), base, 'invalid-command');
  rejectedWithoutChange(complete(base, 'a', deps('collision-event', ['a'])), base, 'id-collision');
  rejectedWithoutChange(addEvidence(base, 'a', { title: 'Trace' }, deps('collision-entity', ['a', 'fresh-event'])), base, 'id-collision');
  const withEvent = { ...base, events: [{ id: 'occupied', type: 'entity-created', entityId: 'a', occurredAt: NOW, recordedAt: NOW, extensions: { legacy: true } }] };
  const result = complete(withEvent, 'a', deps('collision-old-event', ['occupied']));
  assert.equal(result.accepted, false);
  assert.equal(result.reason, 'id-collision');
  assert.equal(result.envelope, withEvent);
  assert.equal(withEvent.events.length, 1);
});

test('canonical create, update and tombstone delete preserve identity and reject cascades', () => {
  const base = envelope([entity('goal', 'goal')]);
  const created = createEntity(base, { id: 'action-new', type: 'action', title: 'Nouvelle', parentId: 'goal', extensions: { custom: true } }, deps('create-new'));
  assert.equal(created.accepted, true); assert.equal(created.event.type, 'entity-created'); assert.equal(created.envelope.events.length, 1);
  assert.equal(created.entity.id, 'action-new');
  const updated = updateEntity(created.envelope, 'action-new', { title: 'Renommée', tags: ['x'] }, deps('update-new'));
  assert.equal(updated.accepted, true);
  assert.deepEqual(updated.event.previousValues, { title: 'Nouvelle', tags: [] });
  assert.deepEqual(updated.event.nextValues, { title: 'Renommée', tags: ['x'] });
  assert.deepEqual(updated.entity.extensions, { custom: true });
  const cascade = deleteEntity(created.envelope, 'goal', deps('delete-parent'));
  assert.equal(cascade.accepted, false); assert.equal(cascade.reason, 'has-children'); assert.equal(cascade.envelope, created.envelope);
  const deleted = deleteEntity(updated.envelope, 'action-new', deps('delete-new'));
  assert.equal(deleted.accepted, true);
  assert.equal(deleted.entity.id, 'action-new');
  assert.equal(deleted.entity.status, 'cancelled');
  assert.equal(deleted.entity.deletedAt, NOW);
});

test('focus start and end are explicit single-event transitions', () => {
  const base = envelope([entity('action')]);
  const started = startFocusSession(base, { id: 'focus-1', actionId: 'action', mode: 'focus' }, deps('focus-start'));
  assert.equal(started.accepted, true); assert.equal(started.event.type, 'focus-session-started'); assert.equal(started.envelope.events.length, 1);
  assert.equal(started.entity.parentId, 'action');
  const second = startFocusSession(started.envelope, { id: 'focus-2', actionId: 'action', mode: 'creation' }, deps('focus-second'));
  assert.equal(second.accepted, false); assert.equal(second.reason, 'active-session-exists'); assert.equal(second.envelope, started.envelope);
  const ended = endFocusSession(started.envelope, 'focus-1', { outcome: 'interrupted', handoffNote: ' Reprendre ', nextAction: 'Étape 2' }, deps('focus-end'));
  assert.equal(ended.accepted, true);
  assert.equal(ended.event.type, 'focus-session-ended');
  assert.equal(ended.entity.status, 'cancelled');
  assert.equal(ended.entity.extensions.handoffNote, 'Reprendre');
});
