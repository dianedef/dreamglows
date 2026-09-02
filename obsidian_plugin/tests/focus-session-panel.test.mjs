import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = new URL('../src/components/FocusSessionPanel.vue', import.meta.url);

test('FocusSessionPanel writes its lifecycle only through canonical commands', async () => {
  const panel = await readFile(source, 'utf8');
  assert.match(panel, /usePathCommandPort\(\)/);
  assert.match(panel, /type: 'start-focus-session'/);
  assert.match(panel, /type: 'end-focus-session'/);
  assert.doesNotMatch(panel, /focusSessionsStore\.(?:start|finish|interrupt)\(/);
  assert.doesNotMatch(panel, /tasksStore\.updateTask\(/);
});

test('FocusSessionPanel keeps retry identities and user context across persistence errors', async () => {
  const panel = await readFile(source, 'utf8');
  assert.match(panel, /startOperation\.value\?\.taskId === task\.id/);
  assert.match(panel, /endOperation\.value\?\.sessionId === session\.id/);
  assert.match(panel, /role="alert"/);
  assert.match(panel, /:disabled="submitting"/);
  assert.match(panel, /if \(await startSession\(task\)\) \{\s*handoffNote\.value = '';/);
  assert.match(panel, /catch \{\s*feedback\.value = \{ error: true, text: 'La sauvegarde a échoué ; la session en cours est conservée\.'/);
});
