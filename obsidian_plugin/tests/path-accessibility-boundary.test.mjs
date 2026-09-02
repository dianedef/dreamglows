import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = new URL('../src/components/', import.meta.url);

const readComponent = (name) => readFile(new URL(name, source), 'utf8');

test('Chemin tabs expose the tab pattern and complete keyboard navigation', async () => {
  const shell = await readComponent('CheminShell.vue');

  assert.match(shell, /role="tablist"/);
  assert.match(shell, /role="tab"/);
  assert.match(shell, /:aria-selected=/);
  assert.match(shell, /:aria-controls=/);
  assert.match(shell, /:tabindex="scope === tab\.scope \? 0 : -1"/);
  assert.match(shell, /@keydown="handleKeydown/);
  for (const key of ['ArrowRight', 'ArrowLeft', 'Home', 'End']) {
    assert.match(shell, new RegExp(`event\\.key === '${key}'`));
  }
});

test('journey remains a semantic keyboard-operated tree without vis-timeline', async () => {
  const journey = await readComponent('PathJourneyTree.vue');

  assert.match(journey, /role="tree"/);
  assert.match(journey, /role="treeitem"/);
  assert.match(journey, /:aria-level=/);
  assert.match(journey, /:aria-expanded=/);
  assert.match(journey, /:aria-selected=/);
  assert.match(journey, /:tabindex="focusedIndex === index \? 0 : -1"/);
  for (const key of ['ArrowDown', 'ArrowUp', 'ArrowRight', 'ArrowLeft', 'Home', 'End', 'Enter']) {
    assert.match(journey, new RegExp(`event\\.key === '${key}'`));
  }
  assert.match(journey, /event\.key === 'Enter' \|\| event\.key === ' '/);
  assert.doesNotMatch(journey, /vis-timeline|Timeline\s*from/i);
});

test('action planning and detail editing use native labelled forms and announced outcomes', async () => {
  const [actions, detail] = await Promise.all([
    readComponent('PathActionsPanel.vue'),
    readComponent('PathDetailPanel.vue'),
  ]);

  assert.match(actions, /h\('form'/);
  assert.match(actions, /onSubmit: \(event: Event\)/);
  assert.match(actions, /h\('label'/);
  assert.match(actions, /type: 'date'/);
  assert.match(actions, /type: 'submit'/);
  assert.match(actions, /role="alert"/);
  assert.match(actions, /:role="feedback\.kind === 'error' \? 'alert' : 'status'"/);
  assert.match(actions, /<ul v-if="scheduled\.length"/);
  assert.match(actions, /<ul v-if="unscheduled\.length"/);

  assert.match(detail, /<form[^>]+@submit\.prevent="submitParent"/);
  assert.match(detail, /<label for="path-parent">/);
  assert.match(detail, /<select id="path-parent"/);
  assert.match(detail, /<button type="submit"/);
  assert.match(detail, /:role="feedback\.error \? 'alert' : 'status'"/);
});

test('focus controls use native controls, labelled groups and live feedback', async () => {
  const focus = await readComponent('FocusSessionPanel.vue');

  assert.match(focus, /role="group" aria-label="Mode de focus"/);
  assert.match(focus, /<label>[\s\S]*?<input v-model="handoffNote"/);
  assert.match(focus, /<label>[\s\S]*?<input v-model="nextAction"/);
  assert.match(focus, /<ul v-if="isSwitching"/);
  assert.match(focus, /<ul class="dreamglows-focus-task-list">/);
  assert.match(focus, /role="alert"/);
  assert.match(focus, /<button[^>]+@click=/);
});

test('the accessible path surface is independent from vis-timeline and honors reduced motion where animation is declared', async () => {
  const names = [
    'CheminShell.vue',
    'PathJourneyTree.vue',
    'PathActionsPanel.vue',
    'PathDetailPanel.vue',
    'FocusSessionPanel.vue',
  ];
  const components = await Promise.all(names.map(readComponent));

  for (const [index, component] of components.entries()) {
    assert.doesNotMatch(component, /(?:from|import\()\s*['"]vis-timeline|new\s+Timeline\b/i, `${names[index]} must not depend on vis-timeline`);
  }

  const shell = components[0];
  assert.match(shell, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(shell, /transition:\s*none/);
});
