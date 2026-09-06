// Explicit isolated Windows Obsidian proof; never opens a personal profile/vault.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, mkdir, writeFile, readFile, copyFile, readdir, rm, realpath } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.DREAMGLOWS_PLAYWRIGHT_MODULE);
const executable = process.env.DREAMGLOWS_OBSIDIAN_EXE;
if (!executable || !process.env.DREAMGLOWS_PLAYWRIGHT_MODULE) throw new Error('Explicit Obsidian executable and Playwright module required.');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const lab = await mkdtemp(join(tmpdir(), 'dreamglows-interface-lab-'));
const vault = join(lab, 'vault'), profile = join(lab, 'profile');
const evidence = resolve(process.env.DREAMGLOWS_LAB_EVIDENCE ?? join(tmpdir(), `dreamglows-interface-proof-${Date.now()}`));
await mkdir(join(vault, '.obsidian', 'plugins', 'dreamglows'), { recursive: true });
await mkdir(profile); await mkdir(evidence, { recursive: true });
const pluginPath = join(vault, '.obsidian', 'plugins', 'dreamglows');
for (const name of ['main.js', 'styles.css', 'manifest.json']) await copyFile(join(name === 'manifest.json' ? join(root, 'obsidian_plugin') : (process.env.DREAMGLOWS_OBSIDIAN_BUNDLE_DIR ?? join(root, 'obsidian_plugin')), name), join(pluginPath, name));
const now = '2026-09-06T12:00:00.000Z';
const entity = (id,type,parentId) => ({id,type,title:id,description:'Description initiale',why:'Sens initial',status:'todo',createdAt:now,updatedAt:now,tags:[],extensions:{future:{kept:true}},futureField:['unknown',42],...(parentId?{parentId}:{})});
const source = {repositoryVersion:1,envelope:{schemaVersion:1,revision:0,entities:[entity('seed-dream','dream'),entity('seed-goal','goal','seed-dream')],events:[],extensions:{futureEnvelope:true}},settings:{},extensions:{futureRepository:true}};
await writeFile(join(pluginPath, 'data.json'), JSON.stringify(source));
await writeFile(join(vault, '.obsidian', 'app.json'), JSON.stringify({ restrictedMode: false }));
await writeFile(join(vault, '.obsidian', 'community-plugins.json'), JSON.stringify(['dreamglows']));
await writeFile(join(vault, '.obsidian', 'core-plugins.json'), JSON.stringify({ 'file-explorer': true, 'command-palette': true }));
await writeFile(join(profile, 'obsidian.json'), JSON.stringify({ vaults: { portabletest: { path: vault, ts: Date.now(), open: true } } }));
const report = { profile: 'isolated-temporary', personalVault: 'not-read', hostLoad: 'pending', interaction: 'pending', restart: 'pending', unknownFields: 'pending', cleanup: 'pending', diagnostics: [] };
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
async function dialog(heading) {
    for(let attempt=0;attempt<50;attempt++) {
        for(const candidate of browser.contexts()[0].pages()) if(await candidate.getByRole('heading',{name:heading,exact:true}).count()) return candidate;
        await delay(100);
    }
    throw new Error(`Missing native dialog: ${heading}`);
}
async function snapshot() { return JSON.parse(await readFile(join(pluginPath,'data.json'),'utf8')); }
async function saveDialog(dialogPage) {
    await dialogPage.getByRole('button',{name:'Enregistrer',exact:true}).click();
    await dialogPage.getByRole('heading',{name:/^(Nouvel élément du parcours|Modifier cet élément)$/}).waitFor({state:'hidden'});
}
try {
    await launch();
    for(const type of ['dream','goal','milestone','action','habit','evidence','reflection']) {
        assert.equal(await page.evaluate(()=>app.commands.executeCommandById('dreamglows:new-path-entity')),true);
        const modal=await dialog('Nouvel élément du parcours');
        await modal.getByRole('combobox',{name:'Type',exact:true}).selectOption(type);
        await modal.getByRole('textbox',{name:'Titre',exact:true}).fill(`Création ${type}`);
        await modal.getByRole('textbox',{name:'Pourquoi',exact:true}).fill(`Sens ${type}`);
        await modal.getByRole('textbox',{name:'Description',exact:true}).fill(`Description ${type}`);
        if(type!=='dream') await modal.getByRole('combobox',{name:'Parent',exact:true}).selectOption(type==='goal'?'seed-dream':'seed-goal');
        if(type==='reflection') await modal.screenshot({path:join(evidence,'creation-seven-types.png')});
        await saveDialog(modal);
        const saved=(await snapshot()).envelope.entities.find(e=>e.title===`Création ${type}`);
        assert.equal(saved.type,type); assert.equal(saved.why,`Sens ${type}`);
        if(type!=='dream')assert.equal(saved.parentId,type==='goal'?'seed-dream':'seed-goal');
    }
    await page.keyboard.press('Escape');
    await page.evaluate(()=>app.commands.executeCommandById('dreamglows:open-dreamglows'));
    await page.locator('[data-dg-tab="journey"]').click();
    await page.locator('[data-dg-entity-id="seed-dream"]').click();
    await page.getByRole('button',{name:'Modifier la sélection',exact:true}).click();
    const modal=await dialog('Modifier cet élément');
    await modal.getByRole('textbox',{name:'Titre',exact:true}).fill('Rêve modifié depuis Obsidian');
    await modal.getByRole('textbox',{name:'Pourquoi',exact:true}).fill('Sens modifié depuis Obsidian');
    await modal.getByRole('button',{name:'Archiver',exact:true}).click();
    await modal.getByRole('alert').filter({hasText:'Déplacez ou archivez'}).waitFor();
    assert.equal((await snapshot()).envelope.entities.find(e=>e.id==='seed-dream').deletedAt,undefined);
    await modal.screenshot({path:join(evidence,'guarded-edit.png')});
    await saveDialog(modal);
    report.interaction='passed';
    const beforeRestart=await snapshot();
    await stop();await launch();
    const reloaded=await snapshot(); assert.deepEqual(reloaded,beforeRestart);
    const edited=reloaded.envelope.entities.find(e=>e.id==='seed-dream');
    assert.equal(edited.title,'Rêve modifié depuis Obsidian');assert.equal(edited.why,'Sens modifié depuis Obsidian');
    assert.deepEqual(edited.extensions,source.envelope.entities[0].extensions);
    assert.deepEqual(edited.futureField,source.envelope.entities[0].futureField);
    assert.deepEqual(reloaded.extensions,source.extensions);assert.deepEqual(reloaded.envelope.extensions,source.envelope.extensions);
    report.restart='passed';report.unknownFields='passed';
    await page.keyboard.press('Escape');
    await page.evaluate(()=>app.commands.executeCommandById('dreamglows:open-dreamglows'));
    await page.locator('[data-dg-tab="journey"]').click();
    await page.locator('[data-dg-entity-id="seed-dream"]').click();
    await page.getByText('Sens modifié depuis Obsidian',{exact:false}).waitFor();
    await page.screenshot({path:join(evidence,'after-restart.png')});
    console.log('Seven native creates, guarded edit and exact process-restart preservation passed.');
} catch (error) {
    report.error = error.message;
    if (page) try { await page.screenshot({ path: join(evidence, 'failure.png') }); } catch {}
    process.exitCode = 1;
} finally {
    await stop();
    const actual = await realpath(lab);
    const intended = await realpath(tmpdir());
    if (!actual.startsWith(`${intended}\\dreamglows-interface-lab-`)) throw new Error('Unsafe lab cleanup target.');
    // Keep failed fixtures for diagnosis; successful disposable profiles are removed.
    if (!report.error) {
        try { await rm(actual, { recursive: true, force: true, maxRetries: 10, retryDelay: 250 }); report.cleanup = 'passed'; }
        catch (error) { report.cleanup = 'retained-locked'; report.lab = lab; report.cleanupError = error.code; }
    }
    else { report.cleanup = 'retained-for-diagnosis'; report.lab = lab; }
    await writeFile(join(evidence, 'report.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report));
}
