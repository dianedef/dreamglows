// Explicit isolated Windows Obsidian proof; never opens a personal profile/vault.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, mkdir, writeFile, readFile, copyFile, readdir, rm, realpath } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { exportPortablePackage, importPortablePackage, PORTABLE_MANIFEST } from '../../packages/path-core/src/portable.ts';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.DREAMGLOWS_PLAYWRIGHT_MODULE);
const executable = process.env.DREAMGLOWS_OBSIDIAN_EXE;
if (!executable || !process.env.DREAMGLOWS_PLAYWRIGHT_MODULE) throw new Error('Explicit Obsidian executable and Playwright module required.');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const lab = await mkdtemp(join(tmpdir(), 'dreamglows-portable-lab-'));
const vault = join(lab, 'vault'), profile = join(lab, 'profile');
const evidence = resolve(process.env.DREAMGLOWS_LAB_EVIDENCE ?? join(tmpdir(), `dreamglows-portable-proof-${Date.now()}`));
await mkdir(join(vault, '.obsidian', 'plugins', 'dreamglows'), { recursive: true });
await mkdir(profile); await mkdir(evidence, { recursive: true });
const pluginPath = join(vault, '.obsidian', 'plugins', 'dreamglows');
for (const name of ['main.js', 'styles.css', 'manifest.json']) await copyFile(join(root, 'obsidian_plugin', name), join(pluginPath, name));
const source = JSON.parse(await readFile(join(root, 'packages/path-core/fixtures/portable-document-v1.json'), 'utf8'));
source.envelope.entities[0].description = '![preuve][p]\n\n[p]: Assets/proof.bin\n\n<img src="Assets/html.bin">\n\n`[[not-a-real-link]]`';
await writeFile(join(pluginPath, 'data.json'), JSON.stringify(source));
await writeFile(join(vault, '.obsidian', 'app.json'), JSON.stringify({ restrictedMode: false }));
await writeFile(join(vault, '.obsidian', 'community-plugins.json'), JSON.stringify(['dreamglows']));
await writeFile(join(vault, '.obsidian', 'core-plugins.json'), JSON.stringify({ 'file-explorer': true, 'command-palette': true }));
await writeFile(join(profile, 'obsidian.json'), JSON.stringify({ vaults: { portabletest: { path: vault, ts: Date.now(), open: true } } }));
await mkdir(join(vault, 'Assets'));
const assets = [{ path: 'Assets/proof.bin', bytes: new Uint8Array([0, 255, 128]) }, { path: 'Assets/html.bin', bytes: new Uint8Array([1, 2, 3]) }];
for (const asset of assets) await writeFile(join(vault, asset.path), asset.bytes);
const report = { profile: 'isolated-temporary', personalVault: 'not-read', hostLoad: 'pending', interaction: 'pending', restart: 'pending', roundTrip: 'pending', cleanup: 'pending', diagnostics: [] };
let child, browser, page;
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
async function launch() {
    await rm(join(profile, 'DevToolsActivePort'), { force: true });
    child = spawn(executable, [`--user-data-dir=${profile}`, '--remote-debugging-port=0', '--no-first-run', '--disable-background-networking'], { cwd: lab, windowsHide: true, stdio: 'ignore' });
    child.on('error', error => report.diagnostics.push(error.message));
    let port;
    for (let attempt = 0; attempt < 100; attempt++) {
        try { port = (await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]; if (port) break; } catch {}
        await delay(300);
    }
    if (!port) throw new Error('Isolated Obsidian debugging endpoint did not start.');
    browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
    page = browser.contexts()[0].pages()[0];
    await page.waitForFunction(() => globalThis.app?.vault?.adapter);
    assert.equal(await page.evaluate(() => app.vault.adapter.getBasePath()), vault);
    page.on('pageerror', error => report.diagnostics.push(error.message));
    page.on('console', message => { if (message.type() === 'error') report.diagnostics.push(message.text().slice(0, 500)); });
    const trust = page.getByRole('button', { name: /Faites confiance.*activez les modules|Trust author and enable plugins/ });
    await Promise.race([trust.waitFor({ state: 'visible', timeout: 10000 }), page.waitForFunction(() => globalThis.app?.plugins?.plugins?.dreamglows?.portable)]).catch(() => {});
    if (await trust.isVisible()) { await trust.click(); console.log('Enabled the authored plugin in the verified disposable vault.'); }
    await page.waitForFunction(() => globalThis.app?.plugins?.plugins?.dreamglows?.portable);
    report.hostLoad = 'passed';
    console.log('Isolated Obsidian loaded the new plugin.');
}
async function stop() {
    if (browser) { try { await browser.close(); } catch {} browser = undefined; }
    if (child?.pid) { try { await promisify(execFile)('taskkill', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true }); } catch {} child = undefined; }
}
async function exportedFolders() {
    try { return (await readdir(join(vault, 'DreamGlows-portable'))).filter(name => name.startsWith('export-')); } catch { return []; }
}
async function exportInHost() {
    const previous = await exportedFolders();
    await page.evaluate(() => app.commands.executeCommandById('dreamglows:export-portable'));
    for (let attempt = 0; attempt < 100; attempt++) {
        const folder = (await exportedFolders()).find(name => !previous.includes(name));
        if (folder) try { await readFile(join(vault, 'DreamGlows-portable', folder, PORTABLE_MANIFEST)); return `DreamGlows-portable/${folder}`; } catch {}
        await delay(200);
    }
    throw new Error(`Export did not finish: ${await page.locator('.notice').allTextContents()}`);
}
async function packageFiles(folder) {
    const manifestBytes = new Uint8Array(await readFile(join(vault, folder, PORTABLE_MANIFEST)));
    const manifest = JSON.parse(new TextDecoder().decode(manifestBytes));
    const files = new Map([[PORTABLE_MANIFEST, manifestBytes]]);
    for (const entry of manifest.files) files.set(entry.path, new Uint8Array(await readFile(join(vault, folder, entry.path))));
    return files;
}
try {
    await launch();
    const firstExport = await exportInHost();
    const first = await importPortablePackage(await packageFiles(firstExport));
    assert.deepEqual(first.document, source);
    assert.deepEqual(first.attachments, [...assets].sort((a, b) => a.path.localeCompare(b.path)));
    console.log('Native export retained reference-style and HTML attachments.');
    // A valid package may include a file with no textual link. Reexport must retain it.
    const incomingAssets = [...assets, { path: 'Assets/unreferenced.bin', bytes: new Uint8Array([9, 0, 254]) }];
    const incoming = await exportPortablePackage(source, incomingAssets);
    for (const [path, bytes] of incoming) { await mkdir(dirname(join(vault, 'Incoming', path)), { recursive: true }); await writeFile(join(vault, 'Incoming', path), bytes); }
    await page.evaluate(async () => {
        const result = await app.plugins.plugins.dreamglows.pathCommands.execute({ type: 'update-entity', commandId: 'lab-change', entityId: 'action-live', patch: { title: 'Destination modifiée' } });
        if (!result.accepted) throw new Error('Lab mutation rejected');
        const opened = app.commands.executeCommandById('dreamglows:import-portable');
        if (!opened) throw new Error('The import command was not executed.');
    });
    // Obsidian can portal a native modal into a separate active window.
    let dialogPage;
    for (let attempt = 0; attempt < 30 && !dialogPage; attempt++) {
        for (const candidate of browser.contexts()[0].pages()) if (await candidate.getByRole('heading', { name: 'Restaurer un paquet DreamGlows' }).count()) dialogPage = candidate;
        if (!dialogPage) await delay(100);
    }
    assert.ok(dialogPage, 'Native import dialog is present in an isolated host window');
    await dialogPage.getByRole('textbox', { name: 'Dossier du paquet' }).focus();
    await dialogPage.keyboard.press('Tab');
    assert.equal(await dialogPage.evaluate(() => document.activeElement?.getAttribute('aria-label')), 'Accepter les titres et descriptions modifiés en Markdown');
    await dialogPage.getByPlaceholder('DreamGlows-portable/export-…').fill('Incoming');
    await dialogPage.getByRole('button', { name: 'Prévisualiser', exact: true }).click();
    await dialogPage.getByRole('button', { name: 'Sauvegarder puis restaurer', exact: true }).waitFor();
    assert.match(await dialogPage.locator('.modal-content').filter({ has: dialogPage.getByRole('heading', { name: 'Restaurer un paquet DreamGlows' }) }).innerText(), /3 sessions Focus/);
    await dialogPage.screenshot({ path: join(evidence, 'import-preview.png') });
    await dialogPage.getByRole('button', { name: 'Sauvegarder puis restaurer', exact: true }).focus();
    await dialogPage.keyboard.press('Enter');
    await dialogPage.getByRole('heading', { name: 'Restaurer un paquet DreamGlows' }).waitFor({ state: 'hidden' });
    assert.deepEqual(JSON.parse(await readFile(join(pluginPath, 'data.json'), 'utf8')), source);
    report.interaction = 'passed';
    await stop(); await launch();
    report.restart = 'passed';
    const secondExport = await exportInHost();
    const second = await packageFiles(secondExport);
    assert.deepEqual(second, incoming);
    report.roundTrip = 'passed';
    await page.evaluate(() => app.commands.executeCommandById('dreamglows:open-dreamglows'));
    await page.waitForTimeout(500);
    await page.screenshot({ path: join(evidence, 'after-restart.png') });
    console.log('Native import, full process restart and byte-identical reexport passed.');
} catch (error) {
    report.error = error.message;
    if (page) try { await page.screenshot({ path: join(evidence, 'failure.png') }); } catch {}
    process.exitCode = 1;
} finally {
    await stop();
    const actual = await realpath(lab);
    const intended = await realpath(tmpdir());
    if (!actual.startsWith(`${intended}\\dreamglows-portable-lab-`)) throw new Error('Unsafe lab cleanup target.');
    // Keep failed fixtures for diagnosis; successful disposable profiles are removed.
    if (!report.error) {
        try { await rm(actual, { recursive: true, force: true, maxRetries: 10, retryDelay: 250 }); report.cleanup = 'passed'; }
        catch (error) { report.cleanup = 'retained-locked'; report.lab = lab; report.cleanupError = error.code; }
    }
    else { report.cleanup = 'retained-for-diagnosis'; report.lab = lab; }
    await writeFile(join(evidence, 'report.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report));
}
