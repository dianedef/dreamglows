import assert from 'node:assert/strict';
import test from 'node:test';
import { flattenJourney, journeyDetail } from '../src/domain/path/journey-view-model.ts';

const NOW = '2026-09-02T08:00:00.000Z';
const entity = (id, type = 'goal', extra = {}) => ({ id, type, title: id, description: '', status: 'todo', createdAt: NOW, updatedAt: NOW, tags: [], extensions: { kept: id }, ...extra });
const node = (value, children = [], contextOnly = false) => ({ id: value.id, entity: value, children, ...(contextOnly ? { contextOnly: true } : {}) });
const projection = (roots, extra = {}) => ({ range: { start: '2026-09-01', end: '2026-09-07' }, entities: [], unscheduled: [], invalidTemporal: [], roots, ...extra });

test('flattening preserves preorder, canonical entities and unique path keys', () => {
  const root = entity('same', 'dream');
  const first = entity('same', 'goal', { parentId: 'same' });
  const second = entity('same', 'action', { parentId: 'same' });
  const rows = flattenJourney(projection([node(root, [node(first), node(second)])]));
  assert.deepEqual(rows.map(row => [row.id, row.depth, row.parentKey]), [
    ['same', 0, undefined],
    ['same', 1, rows[0].key],
    ['same', 1, rows[0].key],
  ]);
  assert.equal(new Set(rows.map(row => row.key)).size, 3);
  assert.equal(rows[1].entity, first);
  assert.equal(rows[2].entity, second);
});

test('context ancestors, orphan roots and selected outside-range state remain explicit', () => {
  const ancestor = entity('ancestor', 'dream');
  const selected = entity('selected', 'action', { parentId: 'ancestor' });
  const orphan = entity('orphan', 'goal', { parentId: 'missing' });
  const rows = flattenJourney(projection(
    [node(ancestor, [node(selected)], true), node(orphan)],
    { selected, selectionVisibility: 'outside-range' },
  ));
  assert.equal(rows[0].contextOnly, true);
  assert.equal(rows[1].contextOnly, false);
  assert.equal(rows[1].outsideRange, true);
  assert.equal(rows[2].orphan, true);
});

test('cycles are emitted once as terminal references and never recurse forever', () => {
  const a = entity('a', 'goal', { parentId: 'b' });
  const b = entity('b', 'goal', { parentId: 'a' });
  const aNode = node(a);
  const bNode = node(b, [aNode]);
  aNode.children = [bNode];
  const rows = flattenJourney(projection([aNode]));
  assert.deepEqual(rows.map(row => row.id), ['a', 'b', 'a']);
  assert.deepEqual(rows.map(row => row.cycleReference), [false, false, true]);
  assert.equal(rows[2].depth, 2);
});

test('a 12000-level corpus is flattened iteratively without stack overflow', () => {
  const count = 12_000;
  let root = node(entity(`n-${count - 1}`, 'action', { parentId: `n-${count - 2}` }));
  for (let index = count - 2; index >= 0; index -= 1) {
    root = node(entity(`n-${index}`, index === 0 ? 'dream' : 'goal', index ? { parentId: `n-${index - 1}` } : {}), [root]);
  }
  const rows = flattenJourney(projection([root]));
  assert.equal(rows.length, count);
  assert.equal(rows.at(-1).depth, count - 1);
  assert.equal(new Set(rows.map(row => row.key)).size, count);
});

test('canonical detail derives relations, history and state-based capabilities without mutation', () => {
  const parent = entity('parent', 'goal');
  const selected = entity('selected', 'action', { parentId: 'parent', planned: { start: '2026-09-02' }, extensions: { future: true } });
  const child = entity('child', 'habit', { parentId: 'selected' });
  const event = { id: 'event', type: 'planned-period-changed', entityId: 'selected', occurredAt: NOW, recordedAt: NOW, extensions: { audit: true } };
  const related = { id: 'related', type: 'evidence-recorded', entityId: 'parent', relatedEntityId: 'selected', occurredAt: NOW, recordedAt: NOW, extensions: {} };
  const envelope = { schemaVersion: 1, revision: 1, entities: [parent, selected, child], events: [event, related], extensions: { root: true } };
  const before = JSON.stringify(envelope);
  const detail = journeyDetail(envelope, 'selected');
  assert.equal(detail.entity, selected);
  assert.equal(detail.parent, parent);
  assert.deepEqual(detail.children, [child]);
  assert.deepEqual(detail.events, [event, related]);
  assert.deepEqual(detail.capabilities, { schedule: false, reschedule: true, resize: true, complete: true, reopen: false, reparent: true, addEvidence: true, addReflection: true });
  assert.equal(JSON.stringify(envelope), before);
  assert.equal(journeyDetail(envelope, 'missing'), undefined);
});

test('completed and factual entities expose only compatible commands', () => {
  const done = entity('done', 'milestone', { status: 'done' });
  const proof = entity('proof', 'evidence', { status: 'done', parentId: 'done' });
  const envelope = { schemaVersion: 1, revision: 0, entities: [done, proof], events: [], extensions: {} };
  assert.deepEqual(journeyDetail(envelope, 'done').capabilities, { schedule: true, reschedule: false, resize: false, complete: false, reopen: true, reparent: true, addEvidence: true, addReflection: true });
  assert.deepEqual(journeyDetail(envelope, 'proof').capabilities, { schedule: false, reschedule: false, resize: false, complete: false, reopen: false, reparent: false, addEvidence: false, addReflection: false });
});
