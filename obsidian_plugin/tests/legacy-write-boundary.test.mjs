import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import test from 'node:test';

const source = new URL('../src/', import.meta.url);

test('StorageService cannot write the plugin data document outside the canonical repository', async () => {
  const storage = await readFile(new URL('services/StorageService.ts', source), 'utf8');
  assert.doesNotMatch(storage, /dataFile|loadFromDataJson|saveToDataJson/);
  assert.doesNotMatch(storage, /vault\.adapter\.write/);
});

test('retired parallel timeline and Vue host implementations stay absent', async () => {
  await assert.rejects(access(new URL('services/TimelineService.ts', source)));
  await assert.rejects(access(new URL('views/DreamGlowsView.vue', source)));
});

test('plugin entry point exposes no legacy loadPluginData bypass', async () => {
  const main = await readFile(new URL('main.ts', source), 'utf8');
  assert.doesNotMatch(main, /loadPluginData\s*\(/);
});

test('modal hosts receive the shared Pinia and canonical command context', async () => {
  for (const name of ['GoalModal.ts', 'TaskModal.ts']) {
    const modal = await readFile(new URL(`components/modals/${name}`, source), 'utf8');
    assert.doesNotMatch(modal, /from ['"]\.\.\/\.\.\/stores['"]/);
    assert.match(modal, /this\.vueApp\.use\(this\.context\.pinia\)/);
    assert.match(modal, /provide\(PATH_COMMAND_PORT_KEY, this\.context\.pathCommands\)/);
    assert.match(modal, /provide\(DREAMGLOWS_UI_CONTEXT_KEY, this\.context\)/);
  }
});

test('goal and task forms do not mutate legacy stores', async () => {
  for (const name of ['GoalModalContent.vue', 'TaskModalContent.vue']) {
    const modal = await readFile(new URL(`components/modals/${name}`, source), 'utf8');
    assert.doesNotMatch(modal, /\.(?:createGoal|updateGoal|deleteGoal|addTask|updateTask|deleteTask|addTaskToGoal|removeTaskFromGoal)\s*\(/);
    assert.match(modal, /entityEditor\.(?:saveGoal|saveAction)/);
  }
});

test('goal and task forms read suggestions from canonical path entities', async () => {
  for (const name of ['GoalModalContent.vue', 'TaskModalContent.vue']) {
    const modal = await readFile(new URL(`components/modals/${name}`, source), 'utf8');
    assert.doesNotMatch(modal, /useGoalsStore|goalsStore\./);
    assert.match(modal, /pathStore\.document\?\.envelope\.entities\.filter/);
    assert.match(modal, /entity\.type === 'goal'.*entity\.type === 'milestone'/s);
    assert.match(modal, /!entity\.deletedAt/);
  }
});

test('runtime components cannot mutate legacy path stores', async () => {
  const components = [
    'components/FocusSessionPanel.vue',
    'components/modals/GoalModalContent.vue',
    'components/modals/TaskModalContent.vue',
    'views/DayView.vue',
    'views/GoalsView.vue',
    'views/JourneyView.vue',
  ];
  const forbidden = /\.(?:addGoal|createGoal|updateGoal|deleteGoal|addTask|updateTask|deleteTask|addTaskToGoal|removeTaskFromGoal|start|finish|interrupt)\s*\(/;
  for (const name of components) {
    const component = await readFile(new URL(name, source), 'utf8');
    assert.doesNotMatch(component, forbidden, `${name} must use canonical path commands`);
  }
});

test('plugin entry point has no legacy path-store persistence subscriptions', async () => {
  const main = await readFile(new URL('main.ts', source), 'utf8');
  assert.doesNotMatch(main, /(?:goalsStore|tasksStore|focusSessionsStore)\.\$subscribe/);
  assert.doesNotMatch(main, /savePluginData|currentStoreSnapshot|persistCurrentState/);
});

test('legacy Goal, Task and Focus stores stay retired', async () => {
  for (const name of ['goalsStore.ts', 'tasksStore.ts', 'focusSessionsStore.ts']) {
    await assert.rejects(access(new URL(`stores/${name}`, source)));
  }
});

test('runtime compatibility bridge stays retired while legacy decoding remains available', async () => {
  await assert.rejects(access(new URL('domain/path/legacy-store-bridge.ts', source)));
  await access(new URL('domain/path/legacy-v0.ts', source));
  await access(new URL('domain/path/migration-v0.ts', source));
  const main = await readFile(new URL('main.ts', source), 'utf8');
  assert.match(main, /if \(loaded\.migrated\)[\s\S]*update\(current => current\)/);
});
