import assert from 'node:assert/strict';
import test from 'node:test';
import { createPathCommandPort } from '../src/domain/path/command-port.ts';
import { projectHistory, projectJourney, projectToday, projectWeek } from '../src/domain/path/projections.ts';
import { PathRepository } from '../src/domain/path/repository.ts';

class MemoryAdapter {
  constructor(value) { this.value = structuredClone(value); }
  async load() { return structuredClone(this.value); }
  async save(value) { this.value = structuredClone(value); }
}

test('legacy-to-canonical action journey remains one identity and one factual history across reload', async () => {
  const adapter = new MemoryAdapter({
    goals: [{ id: 'goal-1', title: 'Publier', status: 'in_progress' }],
    tasks: [],
    timelineStartHour: 7,
  });
  const repository = new PathRepository(adapter);
  let current = (await repository.load()).document;
  let eventSequence = 0;
  const port = createPathCommandPort({
    async updateDocument(updater) {
      const candidate = await updater(structuredClone(current));
      if (candidate === undefined) return structuredClone(current);
      current = await repository.save(candidate, current.envelope.revision);
      return structuredClone(current);
    },
    async afterPersist(saved) { assert.deepEqual(saved, current); },
    now: () => '2026-09-02T08:30:00.000Z',
    createId: () => `vertical-event-${++eventSequence}`,
  });

  const created = await port.execute({
    type: 'create-entity', commandId: 'vertical-create',
    input: { id: 'action-stable', type: 'action', title: 'Écrire le chapitre', parentId: 'goal-1' },
  });
  assert.equal(created.accepted, true);
  assert.equal(created.entityId, 'action-stable');

  assert.equal((await port.execute({
    type: 'schedule', commandId: 'vertical-schedule', entityId: 'action-stable',
    planned: { start: '2026-09-02', end: '2026-09-03' },
  })).accepted, true);

  const options = { referenceDate: '2026-09-02', timeZone: 'Europe/Paris', selectedId: 'action-stable' };
  assert.deepEqual(projectToday(current.envelope, options).items.map(item => item.id), ['action-stable']);
  assert.deepEqual(projectWeek(current.envelope, options).items.map(item => item.id), ['action-stable']);
  const journey = projectJourney(current.envelope, options);
  assert.equal(journey.selected?.id, 'action-stable');
  assert.equal(journey.roots.find(node => node.id === 'goal-1')?.children[0]?.id, 'action-stable');

  assert.equal((await port.execute({
    type: 'complete', commandId: 'vertical-complete', entityId: 'action-stable',
  })).accepted, true);
  const completedAt = current.envelope.entities.find(entity => entity.id === 'action-stable').completedAt;
  const completionFact = current.envelope.events.find(event => event.extensions.commandId === 'vertical-complete');
  assert.equal(completionFact?.type, 'entity-completed');

  assert.equal((await port.execute({
    type: 'reschedule', commandId: 'vertical-reschedule', entityId: 'action-stable',
    planned: { start: '2026-09-03' },
  })).accepted, true);
  const afterMove = current.envelope.entities.find(entity => entity.id === 'action-stable');
  assert.equal(afterMove.status, 'done');
  assert.equal(afterMove.completedAt, completedAt);
  assert.equal(current.envelope.events.filter(event => event.type === 'entity-completed').length, 1);
  assert.deepEqual(current.envelope.events.find(event => event.id === completionFact.id), completionFact);

  const historyBeforeReload = projectHistory(current.envelope, options);
  assert.deepEqual(historyBeforeReload.items.map(item => item.event.type), [
    'entity-created', 'planned-period-changed', 'entity-completed', 'planned-period-changed',
  ]);
  assert.ok(historyBeforeReload.items.every(item => item.entity.id === 'action-stable'));

  const persisted = structuredClone(current);
  const reloaded = (await new PathRepository(adapter).load()).document;
  assert.deepEqual(reloaded, persisted);
  assert.deepEqual(
    projectHistory(reloaded.envelope, options).items.map(item => ({ id: item.id, entityId: item.entity.id, event: item.event })),
    historyBeforeReload.items.map(item => ({ id: item.id, entityId: item.entity.id, event: item.event })),
  );
  assert.equal(projectToday(reloaded.envelope, { ...options, referenceDate: '2026-09-03' }).items[0].entity.id, 'action-stable');
  assert.equal(projectWeek(reloaded.envelope, options).items[0].entity.id, 'action-stable');
  assert.equal(projectJourney(reloaded.envelope, options).selected?.id, 'action-stable');
});
