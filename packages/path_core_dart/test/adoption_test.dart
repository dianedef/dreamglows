import 'dart:convert';
import 'dart:io';

import 'package:path_core_dart/path_core_dart.dart';
import 'package:test/test.dart';

import 'path_repository_test.dart' show MemoryStorage;

void main() {
  test('queued command snapshots match their durable intent', () async {
    final repo = PathRepository(MemoryStorage());
    await repo.load();
    final tags = ['original'];
    final creation = repo.createEntity(
      commandId: 'snapshot',
      id: 'snapshot',
      type: 'dream',
      title: 'dream',
      tags: tags,
    );
    tags.add('too-late');
    await creation;
    expect(repo.document.entities.single['tags'], ['original']);
    final patch = <String, dynamic>{'why': 'original'};
    final update = repo.updateEntity(
      commandId: 'snapshot-update',
      entityId: 'snapshot',
      patch: patch,
    );
    patch['why'] = 'too-late';
    await update;
    expect(repo.document.entities.single['why'], 'original');
    await repo.updateEntity(
      commandId: 'snapshot-update',
      entityId: 'snapshot',
      patch: {'why': 'original'},
    );
    expect(repo.document.revision, 2);
  });
  final fixture = jsonDecode(
    File('../path-core/fixtures/adoption-conformance-v1.json')
        .readAsStringSync(),
  ) as Map<String, dynamic>;
  for (final item in fixture['cases'] as List) {
    test('shared conformance: ${item['name']}', () {
      if (item['valid'] == true) {
        final document = PathDocument.fromJson(
          item['document'] as Map<String, dynamic>,
        );
        expect(jsonDecode(document.encode()), item['document']);
      } else {
        expect(
          () => PathDocument.fromJson(item['document'] as Map<String, dynamic>),
          throwsFormatException,
        );
      }
    });
  }
  test('all creation types, nested actions, why, parent restrictions and historical parents', () async {
    final repo = PathRepository(MemoryStorage());
    await repo.load();
    for (final type in pathEntityTypes.where((t) => t != 'focus-session')) {
      await repo.createEntity(
        commandId: 'create-$type',
        id: type,
        type: type,
        title: type,
        why: 'meaning',
      );
    }
    await repo.createEntity(
      commandId: 'nested',
      id: 'nested',
      type: 'action',
      title: 'nested',
      parentId: 'action',
    );
    expect(repo.document.entities.last['parentId'], 'action');
    await expectLater(
      repo.reparent(commandId: 'cycle', entityId: 'action', parentId: 'nested'),
      throwsA(isA<PathCommandException>()),
    );
    await expectLater(
      repo.createEntity(
        commandId: 'invalid',
        type: 'dream',
        title: 'invalid',
        parentId: 'goal',
      ),
      throwsA(isA<PathCommandException>()),
    );
    final historical = repo.document;
    historical.entities.first['parentId'] = 'missing';
    expect(
      PathDocument.fromJson(historical.json).entities.first['parentId'],
      'missing',
    );
    await expectLater(
      repo.createEntity(
        commandId: 'missing',
        type: 'goal',
        title: 'invalid',
        parentId: 'missing',
      ),
      throwsA(isA<PathCommandException>()),
    );
  });
  test(
    'every command replays durably and rejects changed intent with no write',
    () async {
      final storage = MemoryStorage();
      var repo = PathRepository(storage);
      await repo.load();
      await repo.createEntity(
        commandId: 'goal',
        id: 'goal',
        type: 'goal',
        title: 'goal',
      );
      await repo.createEntity(
        commandId: 'action',
        id: 'action',
        type: 'action',
        title: 'action',
        extensions: {'future': true},
      );
      Future<void> replay(
        Future<Map<String, dynamic>> Function(PathRepository) command,
      ) async {
        await command(repo);
        final persisted = storage.contents;
        repo = PathRepository(storage);
        await repo.load();
        await command(repo);
        expect(storage.contents, persisted);
      }

      await replay(
        (r) => r.updateEntity(
          commandId: 'update',
          entityId: 'action',
          patch: {
            'why': 'important',
            'extensions': {'new': 1},
          },
        ),
      );
      expect(repo.document.entities.last['extensions'], {
        'future': true,
        'new': 1,
      });
      await replay(
        (r) =>
            r.plan(commandId: 'plan', entityId: 'action', date: '2026-09-08'),
      );
      await replay((r) => r.complete(commandId: 'done', entityId: 'action'));
      await replay((r) => r.reopen(commandId: 'reopen', entityId: 'action'));
      await replay(
        (r) => r.reparent(
          commandId: 'parent',
          entityId: 'action',
          parentId: 'goal',
        ),
      );
      await replay(
        (r) => r.startFocusSession(
          commandId: 'start',
          actionId: 'action',
          id: 'focus',
          mode: 'focus',
        ),
      );
      await replay(
        (r) => r.endFocusSession(
          commandId: 'end',
          entityId: 'focus',
          outcome: 'completed',
          handoffNote: 'next',
        ),
      );
      await replay(
        (r) => r.deleteEntity(commandId: 'delete-focus', entityId: 'focus'),
      );
      await replay(
        (r) => r.deleteEntity(commandId: 'delete', entityId: 'action'),
      );
      final persisted = storage.contents;
      await expectLater(
        repo.plan(commandId: 'plan', entityId: 'action', date: '2026-09-09'),
        throwsA(isA<PathCommandException>()),
      );
      expect(storage.contents, persisted);
      await expectLater(
        repo.createEntity(
          commandId: 'dead-parent',
          type: 'action',
          title: 'bad',
          parentId: 'action',
        ),
        throwsA(isA<PathCommandException>()),
      );
    },
  );
  test('failed writes recover, invalid dates and readonly snapshots cannot corrupt the repository', () async {
    final storage = MemoryStorage();
    final repo = PathRepository(storage);
    await repo.load();
    await repo.createEntity(
      commandId: 'a',
      id: 'a',
      type: 'action',
      title: 'a',
    );
    final original = storage.contents;
    await expectLater(
      repo.plan(commandId: 'invalid-date', entityId: 'a', date: '2026-02-30'),
      throwsA(isA<PathCommandException>()),
    );
    repo.document.entities.clear();
    expect(repo.document.entities.length, 1);
    storage.failWrites = true;
    await expectLater(
      repo.updateEntity(
        commandId: 'retry',
        entityId: 'a',
        patch: {'title': 'b'},
      ),
      throwsStateError,
    );
    expect(storage.contents, original);
    expect(repo.document.entities.single['title'], 'a');
    storage.failWrites = false;
    await repo.updateEntity(
      commandId: 'retry',
      entityId: 'a',
      patch: {'title': 'b'},
    );
    expect(repo.document.entities.single['title'], 'b');
  });
  test('cannot delete live parent or create ID collision', () async {
    final repo = PathRepository(MemoryStorage());
    await repo.load();
    await repo.createEntity(
      commandId: 'a',
      id: 'a',
      type: 'action',
      title: 'a',
    );
    await repo.createEntity(
      commandId: 'b',
      id: 'b',
      type: 'action',
      title: 'b',
      parentId: 'a',
    );
    await expectLater(
      repo.deleteEntity(commandId: 'delete', entityId: 'a'),
      throwsA(isA<PathCommandException>()),
    );
    await expectLater(
      repo.createEntity(
        commandId: 'collision',
        id: 'a',
        type: 'goal',
        title: 'a',
      ),
      throwsA(isA<PathCommandException>()),
    );
    expect(repo.document.revision, 2);
  });
}
