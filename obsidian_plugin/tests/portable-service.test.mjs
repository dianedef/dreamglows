import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { PortableService } from '../src/application/portable-service.ts';
import { RecoverableData } from '../src/application/recoverable-data.ts';
import { AttachmentInventory } from '../src/application/attachment-inventory.ts';
import { markdownReferences } from '../src/application/markdown-references.ts';
import { PathRepository } from '@dreamglows/path-core/repository';
import { PathPersistenceCoordinator } from '@dreamglows/path-core/persistence-coordinator';
import { exportPortablePackage, importPortablePackage, PORTABLE_MANIFEST } from '@dreamglows/path-core/portable';

const fixture = () => readFile(new URL('../../packages/path-core/fixtures/portable-document-v1.json', import.meta.url), 'utf8').then(JSON.parse);
const empty = () => ({ repositoryVersion: 1, envelope: { schemaVersion: 1, revision: 8, entities: [], events: [], extensions: {} }, settings: { untouched: true }, extensions: {} });

test('Markdown collection covers reference images and escaped paths but ignores code examples', () => {
    const references = markdownReferences('![preuve][p]\n\n[p]: <Assets/mon fichier.png>\n\n[[Note liée]]\n\n`[[not-a-link]]`\n\n```md\n![ignored](absent.png)\n```\n\n<img src="Assets/html.png">');
    assert.deepEqual(references.links, ['Assets/mon%20fichier.png', 'Note liée']);
    assert.ok(references.html.some(html => html.includes('Assets/html.png')));
});
class Vault {
    files = new Map(); writes = []; sequence = 0; failPath; assets = []; inventory = new Map();
    async read(path) { if (!this.files.has(path)) throw new Error(`Missing ${path}`); return new Uint8Array(this.files.get(path)); }
    async exists(path) { return this.files.has(path) || [...this.files.keys()].some(key => key.startsWith(`${path}/`)); }
    async listFiles(folder) { return [...this.files.keys()].filter(path => path.startsWith(`${folder}/`)); }
    async writeNew(path, bytes) { this.writes.push(path); if (this.failPath?.(path)) throw new Error('Disk full'); assert.equal(this.files.has(path), false, path); this.files.set(path, new Uint8Array(bytes)); }
    async collectAttachments(document) { return this.inventory.has(JSON.stringify(document)) ? Promise.all(this.inventory.get(JSON.stringify(document)).map(async path => ({ path, bytes: await this.read(path) }))) : this.assets; }
    async rememberAttachments(document, paths) { this.inventory.set(JSON.stringify(document), paths); }
    newPackageFolder(kind) { return `Portable/${kind}-${++this.sequence}`; }
}
function host(initial = empty()) {
    let disk = structuredClone(initial); let fail = false;
    const adapter = { load: async () => structuredClone(disk), save: async value => { if (fail) throw new Error('Document write failed'); disk = structuredClone(value); } };
    return { coordinator: new PathPersistenceCoordinator(new PathRepository(adapter)), adapter, get disk() { return disk; }, set fail(value) { fail = value; } };
}
async function seed(vault, document, assets = []) {
    const files = await exportPortablePackage(document, assets);
    for (const [path, bytes] of files) vault.files.set(`Incoming/${path}`, bytes);
    return files;
}

test('service exports and restores exact data after restart, creates a usable backup and retries idempotently', async () => {
    const source = await fixture(), vault = new Vault(), destination = host();
    const asset = { path: 'Assets/proof.bin', bytes: new Uint8Array([0, 255, 11]) };
    await seed(vault, source, [asset]);
    const service = new PortableService(destination.coordinator, vault);
    const result = await service.restore(await service.preview('Incoming'));
    assert.deepEqual(result.document, source);
    assert.deepEqual(destination.disk, source);
    assert.deepEqual(vault.files.get(asset.path), asset.bytes);
    const backup = new Map([...vault.files].filter(([path]) => path.startsWith(`${result.backup}/`)).map(([path, bytes]) => [path.slice(result.backup.length + 1), bytes]));
    assert.deepEqual((await importPortablePackage(backup)).document, empty());
    const restarted = new PortableService(new PathPersistenceCoordinator(new PathRepository(destination.adapter)), vault);
    const exportedFolder = await restarted.export();
    assert.deepEqual((await restarted.preview(exportedFolder)).data.document, source);
    await restarted.restore(await restarted.preview('Incoming'));
    assert.deepEqual(destination.disk, source);
});

test('checksum failure, attachment collision and stale preview cause zero destination writes', async () => {
    for (const failure of ['checksum', 'collision', 'stale', 'changed-package']) {
        const vault = new Vault(), destination = host(), source = await fixture();
        await seed(vault, source, [{ path: 'Assets/proof.bin', bytes: new Uint8Array([1]) }]);
        const service = new PortableService(destination.coordinator, vault);
        if (failure === 'checksum') {
            vault.files.set('Incoming/document.json', new Uint8Array([0]));
            await assert.rejects(() => service.preview('Incoming'));
        } else {
            const preview = await service.preview('Incoming');
            if (failure === 'collision') vault.files.set('Assets/proof.bin', new Uint8Array([2]));
            if (failure === 'stale') await destination.coordinator.update(document => ({ ...document, settings: { changed: true } }));
            if (failure === 'changed-package') vault.files.set('Incoming/document.json', new Uint8Array([0]));
            const before = structuredClone(destination.disk);
            await assert.rejects(() => service.restore(preview));
            assert.deepEqual(destination.disk, before);
        }
        assert.deepEqual(vault.writes, [], failure);
    }
});

test('backup failure and document failure preserve prior document; retry succeeds', async () => {
    const vault = new Vault(), destination = host(), source = await fixture();
    await seed(vault, source);
    const service = new PortableService(destination.coordinator, vault);
    vault.failPath = path => path.includes('backup');
    // Obtain the immutable preview before injecting persistence failures.
    const preview = await service.preview('Incoming');
    await assert.rejects(() => service.restore(preview), /Disk full/);
    assert.deepEqual(destination.disk, empty());
    vault.failPath = undefined; destination.fail = true;
    await assert.rejects(() => service.restore(preview), /Unable to save/);
    assert.deepEqual(destination.disk, empty());
    assert.ok([...vault.files.keys()].some(path => path.includes('backup') && path.endsWith(PORTABLE_MANIFEST)));
    destination.fail = false;
    await service.restore(preview);
    assert.deepEqual(destination.disk, source);
});

test('same document with a different attachment inventory is rejected before an interrupted commit can replace active metadata', async () => {
    const source = await fixture(), vault = new Vault(), destination = host(source);
    vault.files.set('Assets/old.bin', new Uint8Array([1]));
    await vault.rememberAttachments(source, ['Assets/old.bin']);
    await seed(vault, source, [{ path: 'Assets/new.bin', bytes: new Uint8Array([2]) }]);
    const service = new PortableService(destination.coordinator, vault);
    const preview = await service.preview('Incoming');
    destination.fail = true;
    await assert.rejects(() => service.restore(preview), /inventaire de pièces jointes différent/);
    assert.deepEqual(vault.writes, []);
    assert.deepEqual(await vault.collectAttachments(source), [{ path: 'Assets/old.bin', bytes: new Uint8Array([1]) }]);
    assert.deepEqual(destination.disk, source);
});

class DataDisk {
    files = new Map(); failRename = false;
    async exists(path) { return this.files.has(path); }
    async read(path) { if (!this.files.has(path)) throw new Error('Missing'); return this.files.get(path); }
    async write(path, text) { this.files.set(path, text); }
    async remove(path) { this.files.delete(path); }
    async rename(from, to) { if (this.failRename && from.endsWith('.pending')) throw new Error('Rename failed'); if (!this.files.has(from) || this.files.has(to)) throw new Error('Invalid rename'); this.files.set(to, this.files.get(from)); this.files.delete(from); }
}

test('recoverable plugin data rolls back a failed replacement and restores an interrupted one on restart', async () => {
    const disk = new DataDisk(); disk.files.set('data.json', JSON.stringify(empty()));
    const storage = new RecoverableData(disk, 'data.json', () => {});
    disk.failRename = true;
    await assert.rejects(async () => storage.saveData(await fixture()), /Rename failed/);
    assert.deepEqual(await storage.loadData(), empty());
    disk.failRename = false;
    await storage.saveData(await fixture());
    assert.deepEqual(await storage.loadData(), await fixture());
    // Simulate process termination between old-file rename and pending-file promotion.
    disk.files.set('data.json.previous', disk.files.get('data.json'));
    disk.files.delete('data.json');
    let recovered = 0;
    const restarted = new RecoverableData(disk, 'data.json', () => { recovered++; });
    assert.deepEqual(await restarted.loadData(), await fixture());
    assert.equal(recovered, 1);
    disk.files.set('data.json', '{corrupt');
    await assert.rejects(() => restarted.loadData(), SyntaxError);
});

test('attachment inventory survives restart and follows ordinary saves without changing document bytes', async () => {
    const disk = new DataDisk(), original = await fixture();
    const inventory = new AttachmentInventory(new RecoverableData(disk, 'inventory.json', () => {}));
    await inventory.remember(original, ['Assets/unreferenced.bin']);
    const next = structuredClone(original); next.envelope.revision++;
    await inventory.carry(original, next);
    const restarted = new AttachmentInventory(new RecoverableData(disk, 'inventory.json', () => {}));
    assert.deepEqual(await restarted.paths(original), ['Assets/unreferenced.bin']);
    assert.deepEqual(await restarted.paths(next), ['Assets/unreferenced.bin']);
    assert.deepEqual(original, await fixture());
    const imported = empty(); await restarted.remember(imported, []);
    await restarted.carry(next, imported);
    assert.deepEqual(await restarted.paths(imported), []);
});
