import assert from 'node:assert/strict';
import test from 'node:test';
import { parentCandidates } from '../src/application/parent-candidates.ts';
const now = '2026-01-01T00:00:00.000Z';
const entity = (id, type, parentId, extra = {}) => ({ id, type, title: id, description: '', status: 'todo', createdAt: now, updatedAt: now, tags: [], extensions: {}, ...(parentId ? {parentId} : {}), ...extra });
test('parent choices use canonical nesting, cycle, tombstone and evidence rules without mutation', () => {
    const envelope = {schemaVersion: 1, revision: 0, entities: [entity('g','goal'), entity('a','action','g'), entity('child','action','a'), entity('gone','action',undefined,{deletedAt:now}), entity('focus','focus-session','a'), entity('ev','evidence','a')], events:[], extensions:{}};
    const before=structuredClone(envelope);
    assert.deepEqual(parentCandidates(envelope,'action','a').map(e=>e.id),['g']);
    assert.deepEqual(parentCandidates(envelope,'action','new').map(e=>e.id),['g','a','child']);
    assert.deepEqual(parentCandidates(envelope,'reflection','new').map(e=>e.id),['g','a','child','focus']);
    assert.deepEqual(parentCandidates(envelope,'evidence','ev').map(e=>e.id),['g','a','child','focus']);
    assert.deepEqual(envelope,before);
});
