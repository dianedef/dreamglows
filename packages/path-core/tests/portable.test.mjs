import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { exportPortablePackage, importPortablePackage, PORTABLE_MANIFEST, portableText, readPortableText, portableHash, assertPortablePath } from '../src/portable.ts';
import { migratePortableFocus } from '../src/portable-focus.ts';
import { PathRepository } from '../src/repository.ts';
import { PathPersistenceCoordinator } from '../src/persistence-coordinator.ts';
import { createPathCommandPort } from '../src/command-port.ts';

const fixture = () => readFile(new URL('../fixtures/portable-document-v1.json', import.meta.url), 'utf8').then(JSON.parse);
const attachments = () => [{ path: 'Fichiers/preuve.bin', bytes: new Uint8Array([0, 255, 128, 10]) }, { path: 'Fichiers/vide.txt', bytes: new Uint8Array() }];

test('all document data, historical orphans and bytes survive exact restore, restart and reexport', async () => {
    const original = await fixture();
    const exported = await exportPortablePackage(original, attachments());
    const imported = await importPortablePackage(exported);
    let disk = { repositoryVersion: 1, envelope: { schemaVersion: 1, revision: 999, entities: [], events: [], extensions: {} }, settings: {}, extensions: {} };
    const adapter = { load: async () => structuredClone(disk), save: async value => { disk = structuredClone(value); } };
    const destination = new PathPersistenceCoordinator(new PathRepository(adapter));
    await destination.restore(() => imported.document);
    const restarted = new PathPersistenceCoordinator(new PathRepository(adapter));
    await restarted.load();
    assert.deepEqual(restarted.document, original);
    assert.deepEqual(await exportPortablePackage(restarted.document, imported.attachments), exported);
    assert.deepEqual(imported.attachments, attachments());
    assert.deepEqual(imported.editedEntities, []);
    const saved = await restarted.update(document => ({ ...document, settings: { ...document.settings, nextWrite: true } }));
    assert.equal(saved.envelope.revision, original.envelope.revision + 1);
});

test('empty state produces a complete restorable package', async () => {
    const empty = { repositoryVersion: 1, envelope: { schemaVersion: 1, revision: 0, entities: [], events: [], extensions: {} }, settings: {}, extensions: {} };
    assert.deepEqual((await importPortablePackage(await exportPortablePackage(empty))).document, empty);
});

test('corruption, missing files, unknown versions and duplicate paths fail closed', async () => {
    const exported = await exportPortablePackage(await fixture(), attachments());
    const badHash = new Map(exported); badHash.set('attachments/Fichiers/preuve.bin', new Uint8Array([1]));
    await assert.rejects(() => importPortablePackage(badHash), /Intégrité/);
    const missing = new Map(exported); missing.delete('attachments/Fichiers/preuve.bin');
    await assert.rejects(() => importPortablePackage(missing), /manquants/);
    for (const mutate of [manifest => { manifest.version = 2; }, manifest => { manifest.files.push(manifest.files[0]); }, manifest => { manifest.files[0].path = '../outside'; }]) {
        const files = new Map(exported), manifest = JSON.parse(readPortableText(files.get(PORTABLE_MANIFEST)));
        mutate(manifest); files.set(PORTABLE_MANIFEST, portableText(JSON.stringify(manifest)));
        await assert.rejects(() => importPortablePackage(files));
    }
});

test('portable paths reject traversal, hidden config, Windows aliases and Unicode aliases', () => {
    for (const path of ['../a', '/a', 'C:/a', 'a\\b', '.obsidian/plugins', 'a/../b', 'CON.txt', 'aux', 'a.', 'a ', 'a//b', 'a%2fb', 'e\u0301.txt']) assert.throws(() => assertPortablePath(path), path);
    assert.doesNotThrow(() => assertPortablePath('Pièces jointes/été.bin'));
});

test('Markdown edits require explicit consent and cannot change identity or unknown fields', async () => {
    const original = await fixture();
    const files = await exportPortablePackage(original);
    const entity = original.envelope.entities[0];
    const path = `objects/${await portableHash(portableText(entity.id))}.md`;
    files.set(path, portableText(readPortableText(files.get(path)).replace(`title: ${JSON.stringify(entity.title)}`, 'title: "Titre édité 🌟"')));
    await assert.rejects(() => importPortablePackage(files), /Intégrité/);
    const result = await importPortablePackage(files, { acceptMarkdownEdits: true });
    const expected = structuredClone(original); expected.envelope.entities[0].title = 'Titre édité 🌟';
    assert.deepEqual(result.document, expected);
    assert.deepEqual(result.editedEntities, [entity.id]);
    files.set(path, portableText(readPortableText(files.get(path)).replace(`id: ${JSON.stringify(entity.id)}`, 'id: "other"')));
    await assert.rejects(() => importPortablePackage(files, { acceptMarkdownEdits: true }), /Identité/);
});

test('legacy Focus migrates deterministically including a deleted task and retains every raw field', async () => {
    const document = await fixture();
    const raw = { id: 'legacy-focus', taskId: 'deleted-before-migration', goalId: 'goal-old', mode: 'creation', status: 'interrupted', startedAt: '2026-09-01T08:00:00+02:00', endedAt: '2026-09-01T08:12:00+02:00', durationMinutes: 12, handoffNote: 'Reprendre ici', nextAction: 'Relire', createdAt: '2026-09-01T08:00:00+02:00', updatedAt: '2026-09-01T08:12:00+02:00', future: { untouched: true } };
    document.envelope.extensions.legacy = { envelope: { focusSessions: [raw] } };
    const migrated = migratePortableFocus(document);
    assert.deepEqual(migrated.envelope.entities.at(-1).extensions.legacyFocus, raw);
    assert.equal(migrated.envelope.entities.at(-1).parentId, raw.taskId);
    assert.deepEqual(migratePortableFocus(migrated), migrated);
    assert.deepEqual((await importPortablePackage(await exportPortablePackage(document))).document, migrated);
    const malformed = structuredClone(document); malformed.envelope.extensions.legacy.envelope.focusSessions[0].startedAt = 'invalid';
    await assert.rejects(() => exportPortablePackage(malformed), /historique invalide/);
});

test('real Focus start/end transitions and active resumption work after exact import and restart', async () => {
    let disk = await fixture(); disk.envelope.entities = disk.envelope.entities.filter(entity => entity.type !== 'focus-session');
    disk.envelope.events = [];
    const adapter = { load: async () => disk, save: async value => { disk = structuredClone(value); } };
    let coordinator = new PathPersistenceCoordinator(new PathRepository(adapter));
    let clock = '2026-09-06T10:00:00Z'; let nextId = 0;
    const port = () => createPathCommandPort({ updateDocument: update => coordinator.update(update), afterPersist: () => {}, now: () => clock, createId: () => `new-event-${++nextId}` });
    assert.equal((await port().execute({ type: 'start-focus-session', commandId: 'start-1', input: { id: 'focus-new', actionId: 'action-live', mode: 'focus' } })).accepted, true);
    const exported = await exportPortablePackage(coordinator.document);
    coordinator = new PathPersistenceCoordinator(new PathRepository(adapter));
    await coordinator.restore(() => importPortablePackage(exported).then(value => value.document));
    coordinator = new PathPersistenceCoordinator(new PathRepository(adapter)); await coordinator.load();
    const rejected = await port().execute({ type: 'start-focus-session', commandId: 'start-2', input: { id: 'focus-other', actionId: 'action-live', mode: 'focus' } });
    assert.equal(rejected.reason, 'active-session-exists');
    clock = '2026-09-06T10:25:00Z';
    const end = { type: 'end-focus-session', commandId: 'end-1', entityId: 'focus-new', input: { outcome: 'interrupted', handoffNote: 'Où j’en étais', nextAction: 'Continuer' } };
    assert.equal((await port().execute(end)).accepted, true);
    const after = structuredClone(disk);
    assert.equal((await port().execute(end)).replayed, true);
    assert.deepEqual(disk, after);
    assert.equal(disk.envelope.entities.find(entity => entity.id === 'action-live').extensions.actualMinutes, 7);
    assert.equal(disk.envelope.entities.find(entity => entity.id === 'focus-new').extensions.handoffNote, 'Où j’en étais');
});
