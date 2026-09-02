import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const testsDirectory = path.dirname(fileURLToPath(import.meta.url));
const fixturesDirectory = path.join(testsDirectory, 'fixtures');

async function readFixture(relativePath) {
  const bytes = await readFile(path.join(fixturesDirectory, relativePath));
  return {
    bytes,
    data: JSON.parse(bytes.toString('utf8')),
    sha256: createHash('sha256').update(bytes).digest('hex')
  };
}

test('the legacy inventory describes only immutable synthetic fixtures', async () => {
  const inventory = JSON.parse(
    await readFile(path.join(fixturesDirectory, 'inventory.json'), 'utf8')
  );

  assert.equal(inventory.version, 1);
  assert.match(inventory.privacy, /synthetic/i);

  for (const dialect of inventory.dialects) {
    const fixture = await readFixture(dialect.fixture);
    assert.equal(fixture.data.syntheticFixture, true, dialect.fixture);
    assert.equal(fixture.data.goals?.length ?? 0, dialect.goalCount, dialect.fixture);
    assert.equal(fixture.data.tasks?.length ?? 0, dialect.taskCount, dialect.fixture);

    const identifiers = [
      ...(fixture.data.goals ?? []).map(({ id }) => id),
      ...(fixture.data.tasks ?? []).map(({ id }) => id)
    ];
    assert.deepEqual(identifiers, dialect.identifiers, dialect.fixture);
  }
});

test('fixture bytes match the reviewed SHA-256 manifest', async () => {
  const manifest = JSON.parse(
    await readFile(path.join(fixturesDirectory, 'checksums.sha256.json'), 'utf8')
  );

  for (const [relativePath, expectedHash] of Object.entries(manifest.files)) {
    const fixture = await readFixture(relativePath);
    assert.equal(fixture.sha256, expectedHash, relativePath);
  }
});

test('fixture reads and JSON round trips never mutate source bytes', async () => {
  const inventory = JSON.parse(
    await readFile(path.join(fixturesDirectory, 'inventory.json'), 'utf8')
  );

  for (const { fixture: relativePath } of inventory.dialects) {
    const before = await readFixture(relativePath);
    const cloned = structuredClone(before.data);
    JSON.parse(JSON.stringify(cloned));
    const after = await readFixture(relativePath);
    assert.equal(after.sha256, before.sha256, relativePath);
    assert.deepEqual(after.data, before.data, relativePath);
  }
});
