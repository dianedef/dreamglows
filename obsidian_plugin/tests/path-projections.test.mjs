import assert from 'node:assert/strict';
import test from 'node:test';
import { projectHistory, projectJourney, projectToday, projectWeek } from '../src/domain/path/projections.ts';

const instant = '2026-03-20T10:00:00.000Z';
const entity = (id, type, planned, extra = {}) => ({
  id, type, title: id, description: '', status: 'todo',
  ...(planned ? { planned } : {}), createdAt: instant, updatedAt: instant,
  tags: [], extensions: {}, ...extra,
});
const event = (id, entityId, occurredAt, recordedAt = occurredAt) => ({
  id, type: 'entity-created', entityId, occurredAt, recordedAt, extensions: {},
});
const options = (referenceDate, extra = {}) => ({ referenceDate, timeZone: 'Europe/Paris', ...extra });

test('today distinguishes civil dates from Paris instants across the spring DST boundary', () => {
  const envelope = {
    schemaVersion: 1, revision: 0, events: [], extensions: {},
    entities: [
      entity('civil', 'action', { start: '2026-03-29' }),
      entity('before-midnight-utc', 'action', { start: '2026-03-28T23:30:00.000Z' }),
      entity('late-local', 'action', { start: '2026-03-29T22:30:00.000Z' }),
    ],
  };
  assert.deepEqual(projectToday(envelope, options('2026-03-29')).items.map(item => item.id), ['civil', 'before-midnight-utc']);
  assert.deepEqual(projectToday(envelope, options('2026-03-30')).items.map(item => item.id), ['late-local']);
});

test('week is Monday through Sunday and crosses month and year boundaries safely', () => {
  const envelope = {
    schemaVersion: 1, revision: 0, events: [], extensions: {},
    entities: [
      entity('monday', 'goal', { start: '2025-12-29' }),
      entity('sunday', 'action', { start: '2026-01-04' }),
      entity('outside', 'action', { start: '2026-01-05' }),
      entity('spanning', 'goal', { start: '2025-12-20', end: '2025-12-30' }),
    ],
  };
  const projected = projectWeek(envelope, options('2026-01-01'));
  assert.deepEqual(projected.range, { start: '2025-12-29', end: '2026-01-04' });
  assert.deepEqual(projected.items.map(item => item.id), ['monday', 'sunday', 'spanning']);
});

test('all projections share status, type, parent, query, selection and unscheduled filtering', () => {
  const entities = [
    entity('root', 'goal', undefined, { title: 'Projet Phare' }),
    entity('match', 'action', undefined, { parentId: 'root', status: 'done', title: 'Écrire Phare' }),
    entity('wrong-status', 'action', undefined, { parentId: 'root', title: 'Phare secondaire' }),
    entity('wrong-parent', 'action', undefined, { parentId: 'other', status: 'done', title: 'Phare annexe' }),
  ];
  const envelope = { schemaVersion: 1, revision: 0, entities, events: [], extensions: {} };
  const filtered = options('2026-04-08', {
    selectedId: 'match',
    filters: { statuses: ['done'], types: ['action'], parentId: 'root', query: 'ÉCRIRE' },
  });
  for (const projection of [projectToday, projectWeek, projectJourney, projectHistory]) {
    const result = projection(envelope, filtered);
    assert.deepEqual(result.entities.map(item => item.id), ['match']);
    assert.deepEqual(result.unscheduled.map(item => item.id), ['match']);
    assert.equal(result.selected?.id, 'match');
  }
});

test('journey builds stable parent-owned hierarchy and keeps orphans as roots', () => {
  const root = entity('root', 'goal');
  const child = entity('child', 'milestone', undefined, { parentId: 'root' });
  const action = entity('action', 'action', undefined, { parentId: 'child' });
  const orphan = entity('orphan', 'action', undefined, { parentId: 'missing' });
  const envelope = { schemaVersion: 1, revision: 0, entities: [root, child, action, orphan], events: [], extensions: {} };
  const result = projectJourney(envelope, options('2026-05-06'));
  assert.deepEqual(result.roots.map(node => node.id), ['root', 'orphan']);
  assert.equal(result.roots[0].children[0].children[0].id, 'action');
  assert.equal(result.roots[0].entity, root);
  assert.equal(result.roots[0].children[0].entity, child);
});

test('journey keeps a malformed parent cycle visible and bounded', () => {
  const first = entity('first', 'goal', undefined, { parentId: 'second' });
  const second = entity('second', 'goal', undefined, { parentId: 'first' });
  const envelope = { schemaVersion: 1, revision: 0, entities: [first, second], events: [], extensions: {} };
  const result = projectJourney(envelope, options('2026-05-06'));
  assert.deepEqual(result.roots.map(node => node.id), ['first']);
  assert.equal(result.roots[0].children[0].id, 'second');
  assert.equal(result.roots[0].children[0].children[0].id, 'first');
  assert.deepEqual(result.roots[0].children[0].children[0].children, []);
});

test('history is chronological by instant and includes the linked filtered entity', () => {
  const kept = entity('kept', 'action', { start: '2026-10-25' }, { status: 'done' });
  const hidden = entity('hidden', 'action', { start: '2026-10-25' });
  const envelope = {
    schemaVersion: 1, revision: 0, entities: [kept, hidden], extensions: {},
    events: [
      event('later', 'kept', '2026-10-25T02:15:00+01:00'),
      event('earlier', 'kept', '2026-10-25T02:30:00+02:00'),
      event('filtered', 'hidden', '2026-10-25T01:00:00Z'),
      event('outside-week', 'kept', '2026-11-02T00:00:00Z'),
    ],
  };
  const result = projectHistory(envelope, options('2026-10-25', { filters: { statuses: ['done'] } }));
  assert.deepEqual(result.items.map(item => item.id), ['earlier', 'later']);
  assert.ok(result.items.every(item => item.entity === kept));
});

test('projections retain source identity without mutating the envelope', () => {
  const planned = entity('planned', 'action', { start: '2026-06-10', end: '2026-06-09' });
  const unscheduled = entity('tray', 'habit');
  const envelope = { schemaVersion: 1, revision: 0, entities: [planned, unscheduled], events: [], extensions: {} };
  const before = structuredClone(envelope);
  const result = projectWeek(envelope, options('2026-06-10', { selectedId: 'planned' }));
  assert.equal(result.items.length, 0);
  assert.equal(result.invalidTemporal[0], planned);
  assert.equal(result.selectionVisibility, 'invalid-temporal');
  assert.equal(result.selected, planned);
  assert.equal(result.unscheduled[0], unscheduled);
  assert.deepEqual(envelope, before);
});

test('journey retains filtered ancestors as context and selection explains invisibility', () => {
  const root = entity('root', 'goal', { start: '2026-06-10' }, { status: 'todo' });
  const child = entity('child', 'action', { start: '2026-06-10' }, { parentId: 'root', status: 'done' });
  const envelope = { schemaVersion: 1, revision: 0, entities: [root, child], events: [], extensions: {} };
  const result = projectJourney(envelope, options('2026-06-10', { selectedId: 'root', filters: { statuses: ['done'] } }));
  assert.equal(result.roots[0].id, 'root');
  assert.equal(result.roots[0].contextOnly, true);
  assert.equal(result.roots[0].children[0].id, 'child');
  assert.equal(result.selectionVisibility, 'filtered');
  assert.equal(result.selected, root);
});

test('the unscheduled tray excludes non-plannable facts and reports missing selections', () => {
  const action = entity('action', 'action');
  const evidence = entity('evidence', 'evidence');
  const envelope = { schemaVersion: 1, revision: 0, entities: [action, evidence], events: [], extensions: {} };
  const result = projectToday(envelope, options('2026-06-10', { selectedId: 'missing' }));
  assert.deepEqual(result.unscheduled.map(item => item.id), ['action']);
  assert.equal(result.selectionVisibility, 'missing');
});

test('invalid reference dates and implicit time zones are rejected', () => {
  const envelope = { schemaVersion: 1, revision: 0, entities: [], events: [], extensions: {} };
  assert.throws(() => projectToday(envelope, { referenceDate: '2026-02-30', timeZone: 'Europe/Paris' }), /Invalid civil date/);
  assert.throws(() => projectToday(envelope, { referenceDate: '2026-02-20' }), /Europe\/Paris/);
});
