// Built extension proof using a disposable synthetic profile; no personal browser state.
import { chromium, expect } from '@playwright/test'
import { mkdtemp, writeFile, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
const extension = resolve(fileURLToPath(new URL('../dist/chrome', import.meta.url)))
const profile = await mkdtemp(join(tmpdir(), 'dreamglows-canonical-proof-'))
const context = await chromium.launchPersistentContext(profile, {
  channel: 'chromium', headless: true,
  args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`]
})
const errors = []
context.on('page', page => page.on('pageerror', error => errors.push(error.message)))
try {
  const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker')
  const id = new URL(worker.url()).host
  // Wait for installation-created setup to settle, then close it before injecting synthetic legacy.
  const installed = context.pages().find(page => page.url().includes(id)) || await context.waitForEvent('page')
  await installed.waitForTimeout(1200)
  for (const page of context.pages()) await page.close()
  const legacy = JSON.stringify({ treeDataRef: [{ id: 'root', text: 'Root', children: [{ id: 'dream:proof', text: 'Synthetic dream', type: 'dream', future: { keep: true }, children: [{ id: 'goal-proof', text: 'Synthetic goal', type: 'objective', children: [{ id: 'action-proof', text: 'Synthetic action', type: 'task', children: [{ id: 'nested-proof', text: 'Synthetic nested action', type: 'task', children: [] }] }] }] }] }], treeViews: {} })
  await worker.evaluate(async legacy => {
    await chrome.storage.local.remove(['dreamglows-path-v1', 'dreamglows-tree-backup-v1'])
    await chrome.storage.local.set({ 'tree-store': legacy })
  }, legacy)
  const page = await context.newPage()
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(`chrome-extension://${id}/src/setup/index.html?type=update`)
  await expect(page.getByText('Synthetic dream', { exact: true })).toBeVisible()
  await expect(page.getByText('Enregistré sur cet appareil', { exact: true })).toBeVisible()
  await page.getByText('Synthetic dream', { exact: true }).dblclick()
  await page.locator('input.node-input').fill('Synthetic dream edited')
  await page.locator('input.node-input').press('Enter')
  await expect.poll(async () => worker.evaluate(async () => (await chrome.storage.local.get('dreamglows-path-v1'))['dreamglows-path-v1']?.envelope.entities.find(e => e.id === 'dream:proof').title)).toBe('Synthetic dream edited')
  await expect(page.getByText('Enregistré sur cet appareil', { exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByText('Synthetic dream edited', { exact: true })).toBeVisible()
  const persisted = await worker.evaluate(async () => chrome.storage.local.get(['dreamglows-path-v1', 'dreamglows-tree-backup-v1']))
  const document = persisted['dreamglows-path-v1']
  expect(persisted['dreamglows-tree-backup-v1'].raw).toBe(legacy)
  expect(document.envelope.entities.find(e => e.id === 'nested-proof').parentId).toBe('action-proof')
  expect(document.envelope.entities.find(e => e.id === 'dream:proof').extensions.chrome.original.future).toEqual({ keep: true })
  expect(document.envelope.events.some(e => e.type === 'entity-updated' && e.entityId === 'dream:proof')).toBe(true)
  // A second mounted editor must display a failure instead of overwriting newer data.
  const second = await context.newPage()
  await second.goto(`chrome-extension://${id}/src/setup/index.html?type=update`)
  await expect(second.getByText('Synthetic dream edited', { exact: true })).toBeVisible()
  await page.getByText('Synthetic dream edited', { exact: true }).dblclick()
  await page.locator('input.node-input').fill('First window wins')
  await page.locator('input.node-input').press('Enter')
  await expect.poll(async () => worker.evaluate(async () => (await chrome.storage.local.get('dreamglows-path-v1'))['dreamglows-path-v1']?.envelope.entities[0].title)).toBe('First window wins')
  await second.getByText('Synthetic dream edited', { exact: true }).dblclick()
  await second.locator('input.node-input').fill('Second window pending')
  await second.locator('input.node-input').press('Enter')
  await expect(second.getByRole('alert')).toContainText('Modifications non enregistrées')
  await expect(second.getByRole('button', { name: 'Télécharger mes modifications' })).toBeVisible()
  const downloadPromise = second.waitForEvent('download')
  await second.getByRole('button', { name: 'Télécharger mes modifications' }).click()
  const recovery = await downloadPromise
  await recovery.saveAs(join(profile, 'pending-recovery.json'))
  const recovered = JSON.parse(await readFile(join(profile, 'pending-recovery.json'), 'utf8'))
  expect(recovered.pendingTree[0].children[0].text).toBe('Second window pending')
  expect(recovered.document.repositoryVersion).toBe(1)
  expect(await worker.evaluate(async () => (await chrome.storage.local.get('dreamglows-path-v1'))['dreamglows-path-v1'].envelope.entities[0].title)).toBe('First window wins')
  await second.screenshot({ path: join(profile, 'stale-window-recovery.png'), fullPage: true })
  expect(errors).toEqual([])
  const screenshot = join(profile, 'canonical-editor.png')
  await page.screenshot({ path: screenshot, fullPage: true })
  const result = { passed: true, personalProfile: 'not-read', syntheticProfile: profile, screenshot, assertions: ['migration backup', 'rendered canonical hydration', 'UI title edit', 'awaited persistence', 'reload', 'nested action relation', 'unknown-field conservation', 'canonical journal', 'no page errors', 'stale window refused visibly', 'pending recovery download'] }
  await writeFile(join(profile, 'result.json'), JSON.stringify(result, null, 2))
  console.log(JSON.stringify(result, null, 2))
} finally {
  await context.close()
}
