import assert from 'node:assert/strict';
import test from 'node:test';
import { historyViewRows } from '../src/domain/path/history-view-model.ts';

const NOW = '2026-09-02T08:00:00.000Z';
const entity = (id, type = 'action', extra = {}) => ({ id, type, title: id, description: '', status: 'todo', createdAt: NOW, updatedAt: NOW, tags: [], extensions: { kept: id }, ...extra });
const event = (id, type, extra = {}) => ({ id, type, entityId: 'action', occurredAt: NOW, recordedAt: NOW, extensions: { commandId: id }, ...extra });

function fixture(selected) {
  const root = entity('root', 'goal', { title: 'Objectif racine' });
  const parent = entity('parent', 'goal', { title: 'Nouveau parent' });
  const action = entity('action', 'action', { title: '<b>Action texte</b>', parentId: 'parent' });
  const evidence = entity('proof', 'evidence', { title: 'Capture validée', parentId: 'action' });
  const reflection = entity('thought', 'reflection', { title: 'Leçon retenue', parentId: 'action' });
  const events = [
    event('created', 'entity-created'),
    event('planned', 'planned-period-changed', { previousPlanned: { start: '2026-09-01' }, nextPlanned: { start: '2026-09-03', end: '2026-09-05' } }),
    event('completed', 'entity-completed'),
    event('reopened', 'entity-reopened'),
    event('reparented', 'entity-reparented', { previousParentId: 'root', nextParentId: 'parent' }),
    event('evidence', 'evidence-recorded', { relatedEntityId: 'proof' }),
    event('reflection', 'reflection-recorded', { relatedEntityId: 'thought' }),
  ];
  const items = events.map(value => ({ id: value.id, event: value, entity: action }));
  const projection = { range: { start: '2026-09-01', end: '2026-09-07' }, entities: [action], unscheduled: [], invalidTemporal: [], items, ...(selected ? { selected } : {}) };
  return { envelope: { schemaVersion: 1, revision: 7, entities: [root, parent, action, evidence, reflection], events, extensions: { retained: true } }, projection, action, evidence, reflection };
}

test('rows preserve projection order, canonical references and localized labels', () => {
  const source = fixture();
  const before = JSON.stringify(source);
  const rows = historyViewRows(source.projection, source.envelope);
  assert.deepEqual(rows.map(row => row.id), ['created', 'planned', 'completed', 'reopened', 'reparented', 'evidence', 'reflection']);
  assert.deepEqual(rows.map(row => row.label), ['Création', 'Planification ajustée', 'Étape accomplie', 'Étape rouverte', 'Chemin réorganisé', 'Preuve ajoutée', 'Réflexion ajoutée']);
  assert.ok(rows.every(row => row.target === source.action));
  assert.equal(rows[0].changes[0].after, '<b>Action texte</b>');
  assert.equal(JSON.stringify(source), before);
});

test('planned and hierarchy changes expose explicit before to after details', () => {
  const source = fixture();
  const rows = historyViewRows(source.projection, source.envelope);
  assert.deepEqual(rows[1].changes, [{ field: 'planned', label: 'Période prévue', before: 'À partir du 2026-09-01', after: '2026-09-03 → 2026-09-05' }]);
  assert.deepEqual(rows[3].changes, [{ field: 'status', label: 'État', before: 'Terminé', after: 'Rouvert' }]);
  assert.deepEqual(rows[4].changes, [{ field: 'parent', label: 'Parent', before: 'Objectif racine', after: 'Nouveau parent' }]);
});

test('evidence and reflection expose their canonical related entities', () => {
  const source = fixture();
  const rows = historyViewRows(source.projection, source.envelope);
  assert.equal(rows[5].relatedEntity, source.evidence);
  assert.deepEqual(rows[5].changes, [{ field: 'evidence', label: 'Preuve', after: 'Capture validée' }]);
  assert.equal(rows[6].relatedEntity, source.reflection);
  assert.deepEqual(rows[6].changes, [{ field: 'reflection', label: 'Réflexion', after: 'Leçon retenue' }]);
});

test('selection follows either the target or the related entity', () => {
  const target = fixture();
  target.projection.selected = target.action;
  assert.ok(historyViewRows(target.projection, target.envelope).every(row => row.selected));
  const related = fixture();
  related.projection.selected = related.evidence;
  assert.deepEqual(historyViewRows(related.projection, related.envelope).filter(row => row.selected).map(row => row.id), ['evidence']);
});

test('missing related and parent entities remain explicit rather than disappearing', () => {
  const action = entity('action');
  const missingProof = event('missing-proof', 'evidence-recorded', { relatedEntityId: 'gone' });
  const detached = event('detached', 'entity-reparented', { previousParentId: 'gone' });
  const projection = { range: { start: '2026-09-01', end: '2026-09-07' }, entities: [action], unscheduled: [], invalidTemporal: [], items: [{ id: missingProof.id, event: missingProof, entity: action }, { id: detached.id, event: detached, entity: action }] };
  const envelope = { schemaVersion: 1, revision: 0, entities: [action], events: [missingProof, detached], extensions: {} };
  const rows = historyViewRows(projection, envelope);
  assert.equal(rows[0].relatedEntity, undefined);
  assert.equal(rows[0].changes[0].after, 'Entité indisponible (gone)');
  assert.deepEqual(rows[1].changes, [{ field: 'parent', label: 'Parent', before: 'Entité indisponible (gone)', after: 'Racine du chemin' }]);
});
