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
  // Create each ordinary type through the actual capture form, then edit details and a compatible relation.
  for (const type of ['dream', 'objective', 'milestone', 'task', 'habit', 'evidence', 'reflection']) {
    await page.getByRole('button', { name: 'Ajouter', exact: true }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await dialog.getByLabel('Type', { exact: true }).selectOption(type)
    await dialog.getByLabel('Titre', { exact: true }).fill(`Capture ${type}`)
    await dialog.getByLabel('Pourquoi', { exact: true }).fill(`Pourquoi ${type}`)
    await dialog.getByLabel('Description', { exact: true }).fill(`Description ${type}`)
    if (type === 'reflection') await dialog.screenshot({ path: join(profile, 'capture-details.png') })
    await dialog.getByRole('button', { name: 'Enregistrer', exact: true }).click()
    await expect(page.getByText('Enregistré sur cet appareil', { exact: true })).toBeVisible()
    await expect.poll(async () => worker.evaluate(async title => (await chrome.storage.local.get('dreamglows-path-v1'))['dreamglows-path-v1'].envelope.entities.find(e => e.title === title)?.why, `Capture ${type}`)).toBe(`Pourquoi ${type}`)
  }
  const habitRow = page.locator('article').filter({ has: page.getByText('Capture habit', { exact: true }) })
  const editDetailsButton = habitRow.getByRole('button', { name: 'Modifier les détails', exact: true })
  await editDetailsButton.focus()
  await editDetailsButton.press('Enter')
  const details = page.getByRole('dialog')
  await expect(details).toBeVisible()
  await details.press('Escape')
  await expect(details).not.toBeVisible()
  await expect(editDetailsButton).toBeFocused()
  await editDetailsButton.press('Enter')
  await details.getByLabel('Pourquoi', { exact: true }).fill('Updated habit why')
  await details.getByLabel('Description', { exact: true }).fill('Updated habit description')
  await details.getByLabel('Rattacher à', { exact: true }).selectOption('goal-proof')
  await details.getByRole('button', { name: 'Enregistrer', exact: true }).click()
  await expect.poll(async () => worker.evaluate(async () => (await chrome.storage.local.get('dreamglows-path-v1'))['dreamglows-path-v1'].envelope.entities.find(e => e.title === 'Capture habit')?.parentId)).toBe('goal-proof')
  await page.reload()
  await expect(page.getByText('Capture reflection', { exact: true })).toBeVisible()
  const captures = await worker.evaluate(async () => (await chrome.storage.local.get('dreamglows-path-v1'))['dreamglows-path-v1'].envelope.entities.filter(e => e.title.startsWith('Capture ')))
  expect(captures).toHaveLength(7)
  expect(captures.find(e => e.type === 'habit')).toMatchObject({ why: 'Updated habit why', description: 'Updated habit description', parentId: 'goal-proof' })
  for (const item of captures.filter(e => e.type !== 'habit')) expect(item.description).toBe(`Description ${item.title.slice(8)}`)
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
  const result = { passed: true, personalProfile: 'not-read', syntheticProfile: profile, screenshot, assertions: ['migration backup', 'rendered canonical hydration', 'UI title edit', 'seven-type capture', 'why and description edit', 'details button keyboard activation', 'Escape restores focus', 'compatible parent selection', 'detail reload persistence', 'awaited persistence', 'reload', 'nested action relation', 'unknown-field conservation', 'canonical journal', 'no page errors', 'stale window refused visibly', 'pending recovery download'] }
  await writeFile(join(profile, 'result.json'), JSON.stringify(result, null, 2))
  console.log(JSON.stringify(result, null, 2))
} catch (error) {
  const active = context.pages().at(-1)
  if (active) await active.screenshot({ path: join(profile, 'failure.png'), fullPage: true }).catch(() => {})
  console.error(`Proof failed; evidence: ${profile}`)
  throw error
} finally {
  await context.close()
}
