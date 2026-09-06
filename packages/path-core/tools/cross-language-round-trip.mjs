// Synthetic document only. Runs the actual Dart implementation between TS writes.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { PathRepository, decodeCanonical } from '../src/repository.ts';
import { createPathCommandPort } from '../src/command-port.ts';

const dart = process.env.DREAMGLOWS_DART_EXE;
if (!dart) throw new Error('Set DREAMGLOWS_DART_EXE to the installed Dart executable.');
let document = JSON.parse(await readFile(new URL('../fixtures/portable-document-v1.json', import.meta.url), 'utf8'));
let writes = 0, ids = 0;
let repository = new PathRepository({ load: async () => document, save: async next => { document = next; writes++; } });
await repository.load();
const port = () => createPathCommandPort({
    async updateDocument(update) { const next = await update(structuredClone(document)); return next ? repository.save(next, document.envelope.revision) : structuredClone(document); },
    afterPersist() {}, now: () => '2026-09-06T12:00:00Z', createId: () => `ts-cross-${++ids}`,
});
for (const type of ['dream', 'milestone', 'habit', 'evidence', 'reflection']) {
    assert.equal((await port().execute({ type: 'create-entity', commandId: `create-${type}`, input: { id: `new-${type}`, type, title: type, why: 'A durable meaning', extensions: { future: ['keep', { everything: true }] } } })).accepted, true);
}
const beforeDart = structuredClone(document);
const result = spawnSync(dart, ['run', 'tool/round_trip.dart', '-', 'new-dream', 'Modified in Dart', 'Meaning edited in Dart'], {
    cwd: fileURLToPath(new URL('../../path_core_dart/', import.meta.url)), input: JSON.stringify(document), encoding: 'utf8', windowsHide: true, timeout: 60000,
});
assert.equal(result.status, 0, result.stderr || result.error?.message);
document = decodeCanonical(JSON.parse(result.stdout));
assert.ok(document);
assert.equal(document.envelope.revision, beforeDart.envelope.revision + 1);
assert.equal(document.envelope.events.length, beforeDart.envelope.events.length + 1);
const modified = document.envelope.entities.find(e => e.id === 'new-dream');
assert.equal(modified.title, 'Modified in Dart');
assert.equal(modified.why, 'Meaning edited in Dart');
const normalized = structuredClone(document);
normalized.envelope.revision = beforeDart.envelope.revision;
normalized.envelope.events.pop();
const original = beforeDart.envelope.entities.find(e => e.id === 'new-dream');
Object.assign(normalized.envelope.entities.find(e => e.id === 'new-dream'), { title: original.title, why: original.why, updatedAt: original.updatedAt });
assert.deepEqual(normalized, beforeDart, 'Every field outside the intended mutation must survive Dart');
repository = new PathRepository({ load: async () => document, save: async next => { document = next; writes++; } });
await repository.load();
const replayWrites = writes;
assert.equal((await port().execute({ type: 'update-entity', commandId: 'dart-conformance-edit', entityId: 'new-dream', patch: { title: 'Modified in Dart', why: 'Meaning edited in Dart' } })).replayed, true);
assert.equal(writes, replayWrites, 'Dart command replays in TypeScript without writing twice');
assert.equal((await port().execute({ type: 'update-entity', commandId: 'ts-after-dart', entityId: 'new-dream', patch: { description: 'Back in TypeScript' } })).accepted, true);
assert.deepEqual(document.envelope.events.slice(0, beforeDart.envelope.events.length), beforeDart.envelope.events);
console.log(JSON.stringify({ status: 'passed', route: 'TypeScript → Dart modification → TypeScript reload/replay/modification', entityTypes: [...new Set(document.envelope.entities.map(e => e.type))], entities: document.envelope.entities.length, preservedUnknownFields: true, historicalOrphansAndTombstones: true, crossLanguageReplay: true }));
