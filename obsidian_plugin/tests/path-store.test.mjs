import assert from 'node:assert/strict';
import test from 'node:test';
import { createPinia } from 'pinia';
import { civilDateInParis, usePathStore } from '../src/stores/pathStore.ts';

const entity = (id, type, planned, extra = {}) => ({
  id, type, title: id, description: '', status: 'todo',
  ...(planned ? { planned } : {}),
  createdAt: '2026-03-29T00:00:00.000Z', updatedAt: '2026-03-29T00:00:00.000Z',
  tags: [], extensions: {}, ...extra,
});

const document = () => ({
  repositoryVersion: 1,
  envelope: {
    schemaVersion: 1,
    revision: 3,
    entities: [
      entity('goal', 'goal', undefined),
      entity('today', 'action', { start: '2026-03-29' }, { parentId: 'goal', title: 'Écrire' }),
      entity('later', 'action', { start: '2026-03-28' }, { parentId: 'goal', status: 'done' }),
      entity('tray', 'habit', undefined),
    ],
    events: [{
      id: 'event-1', type: 'entity-completed', entityId: 'later',
      occurredAt: '2026-03-28T08:00:00.000Z', recordedAt: '2026-03-28T08:00:00.000Z', extensions: {},
    }],
    extensions: {},
  },
  settings: {},
  extensions: {},
});

const store = () => usePathStore(createPinia());

test('empty store has explicit Paris civil state and no projections', () => {
  const path = store();
  assert.equal(path.scope, 'today');
  assert.match(path.referenceDate, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(path.document, null);
  assert.equal(path.todayProjection, undefined);
  assert.equal(path.weekProjection, undefined);
  assert.equal(path.journeyProjection, undefined);
  assert.equal(path.historyProjection, undefined);
  assert.equal(path.activeProjection, undefined);
});

test('Paris date is derived from an explicit instant across UTC midnight and DST', () => {
  assert.equal(civilDateInParis(new Date('2026-03-28T23:30:00.000Z')), '2026-03-29');
  assert.equal(civilDateInParis(new Date('2026-10-25T22:30:00.000Z')), '2026-10-25');
  assert.throws(() => civilDateInParis(new Date('invalid')), /valid instant/);
});

test('hydrate detaches the canonical snapshot and all four getters share UI state', () => {
  const source = document();
  const path = store();
  path.setReferenceDate('2026-03-29');
  path.hydrate(source);

  source.envelope.entities[1].title = 'mutated outside';
  assert.equal(path.document.envelope.entities[1].title, 'Écrire');
  assert.deepEqual(path.todayProjection.items.map(item => item.id), ['today']);
  assert.deepEqual(path.weekProjection.items.map(item => item.id), ['today', 'later']);
  assert.deepEqual(path.journeyProjection.roots.map(item => item.id), ['goal', 'tray']);
  assert.deepEqual(path.historyProjection.items.map(item => item.id), ['event-1']);

  path.select('today');
  path.setFilters({ parentId: 'goal', types: ['action'], query: 'écrire' });
  for (const projected of [path.todayProjection, path.weekProjection, path.journeyProjection, path.historyProjection]) {
    assert.equal(projected.selected?.id, 'today');
    assert.deepEqual(projected.entities.map(item => item.id), ['today']);
  }
});

test('active projection follows scope and hydration replaces the whole snapshot', () => {
  const path = store();
  path.setReferenceDate('2026-03-29');
  path.hydrate(document());
  assert.equal(path.activeProjection, path.todayProjection);
  path.setScope('week');
  assert.equal(path.activeProjection, path.weekProjection);
  path.setScope('journey');
  assert.equal(path.activeProjection, path.journeyProjection);
  path.setScope('history');
  assert.equal(path.activeProjection, path.historyProjection);

  const replacement = document();
  replacement.envelope.revision = 4;
  replacement.envelope.entities = [entity('replacement', 'action', { start: '2026-03-29' })];
  replacement.envelope.events = [];
  path.hydrate(replacement);
  assert.equal(path.document.envelope.revision, 4);
  assert.deepEqual(path.todayProjection.items.map(item => item.id), ['replacement']);
});

test('UI actions do not mutate the canonical document and filters are detached', () => {
  const path = store();
  path.hydrate(document());
  const before = JSON.stringify(path.document);
  const filters = { statuses: ['done'], types: ['action'], query: 'later' };
  path.setScope('week');
  path.setReferenceDate('2026-03-31');
  path.select('later');
  path.setFilters(filters);
  filters.statuses.push('todo');
  filters.query = 'changed';
  assert.deepEqual(path.filters, { statuses: ['done'], types: ['action'], query: 'later' });
  path.clearFilters();
  assert.deepEqual(path.filters, {});
  assert.equal(JSON.stringify(path.document), before);
});
