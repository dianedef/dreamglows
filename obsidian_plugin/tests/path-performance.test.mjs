import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import test from 'node:test';
import { decodeLegacyV0 } from '../src/domain/path/legacy-v0.ts';
import { migrateLegacyV0 } from '../src/domain/path/migration-v0.ts';
import { projectHistory, projectJourney, projectToday, projectWeek } from '../src/domain/path/projections.ts';

const options = { referenceDate: '2026-09-02', timeZone: 'Europe/Paris' };

function legacyFixture(entityCount) {
  const taskIds = Array.from({ length: entityCount - 1 }, (_, index) => `task-${index}`);
  return {
    goals: [{
      id: 'goal-root', title: 'Cap', status: 'in_progress', tasks: taskIds,
      startDate: '2026-09-02', dueDate: '2026-09-02',
      createdAt: '2026-09-01T08:00:00.000Z', updatedAt: '2026-09-01T08:00:00.000Z',
    }],
    tasks: taskIds.map((id, index) => ({
      id, title: `Action ${index}`, status: index % 2 === 0 ? 'todo' : 'completed', goalId: 'goal-root',
      startDate: '2026-09-02', dueDate: '2026-09-02',
      createdAt: '2026-09-01T08:00:00.000Z', updatedAt: '2026-09-01T08:00:00.000Z',
    })),
    timelineStartHour: 7,
  };
}

function exercise(entityCount, budgetMs) {
  const source = legacyFixture(entityCount);
  const sourceBefore = JSON.stringify(source);
  const startedAt = performance.now();
  const decoded = decodeLegacyV0(source);
  assert.ok(decoded.value);
  const migrated = migrateLegacyV0(decoded.value);
  const envelopeBefore = JSON.stringify(migrated.value);
  const today = projectToday(migrated.value, options);
  const week = projectWeek(migrated.value, options);
  const journey = projectJourney(migrated.value, options);
  const history = projectHistory(migrated.value, options);
  const elapsedMs = performance.now() - startedAt;

  assert.equal(migrated.value.entities.length, entityCount);
  assert.equal(new Set(migrated.value.entities.map(entity => entity.id)).size, entityCount);
  assert.equal(today.items.length, entityCount);
  assert.equal(week.items.length, entityCount);
  assert.equal(journey.entities.length, entityCount);
  assert.equal(journey.roots.length, 1);
  assert.equal(journey.roots[0].id, 'goal-root');
  assert.equal(journey.roots[0].children.length, entityCount - 1);
  assert.equal(history.items.length, 0);
  assert.equal(history.entities.length, entityCount);
  assert.equal(JSON.stringify(source), sourceBefore, 'migration must not mutate legacy input');
  assert.equal(JSON.stringify(migrated.value), envelopeBefore, 'projections must not mutate the canonical envelope');
  assert.ok(elapsedMs < budgetMs, `${entityCount} entities took ${elapsedMs.toFixed(0)}ms (CI budget ${budgetMs}ms)`);
}

test('migration and all projections preserve 1,000 entities within a broad CI guardrail', () => {
  exercise(1_000, 15_000);
});

test('migration and all projections preserve 10,000 entities within a broad CI guardrail', () => {
  exercise(10_000, 60_000);
});
