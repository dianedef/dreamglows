import 'package:dreamglows_windows/path/path_document.dart';
import 'package:dreamglows_windows/path/path_repository.dart';
import 'package:flutter_test/flutter_test.dart';

class MemoryStorage implements PathStorage {
  String? contents;
  bool failWrites = false;
  @override
  Future<String?> read() async => contents;
  @override
  Future<void> write(String value) async {
    if (failWrites) throw StateError('disk-full');
    contents = value;
  }
}

void main() {
  test('parcours create, plan, complete, reopen et reload', () async {
    final storage = MemoryStorage();
    final repository = PathRepository(
      storage,
      clock: () => DateTime.utc(2026, 9, 3, 8),
    );
    await repository.load();
    final goal = await repository.createEntity(
      commandId: 'c1',
      type: 'goal',
      title: 'Publier',
    );
    final action = await repository.createEntity(
      commandId: 'c2',
      type: 'action',
      title: 'Relire',
      parentId: goal['id'] as String,
    );
    await repository.plan(
      commandId: 'c3',
      entityId: action['id'] as String,
      date: '2026-09-04',
    );
    await repository.complete(
      commandId: 'c4',
      entityId: action['id'] as String,
    );
    expect(repository.document.entities.last['completedAt'], isNotNull);
    await repository.reopen(commandId: 'c5', entityId: action['id'] as String);
    expect(repository.document.entities.last['completedAt'], isNull);
    expect(
      repository.document.events.map((e) => e['type']),
      containsAll(['entity-completed', 'entity-reopened']),
    );
    final reloaded = PathRepository(storage);
    await reloaded.load();
    expect(reloaded.document.revision, 5);
    expect(reloaded.document.entities.last['parentId'], goal['id']);
  });

  test(
    'rejoue commandId sans seconde écriture et refuse un autre intent',
    () async {
      final storage = MemoryStorage();
      final repository = PathRepository(storage);
      await repository.load();
      final first = await repository.createEntity(
        commandId: 'same',
        type: 'goal',
        title: 'Stable',
      );
      final replay = await repository.createEntity(
        commandId: 'same',
        type: 'goal',
        title: 'Stable',
      );
      expect(replay['id'], first['id']);
      expect(repository.document.revision, 1);
      await expectLater(
        repository.createEntity(
          commandId: 'same',
          type: 'goal',
          title: 'Autre',
        ),
        throwsA(isA<PathCommandException>()),
      );
    },
  );

  test('ne publie pas un état si la persistence échoue', () async {
    final storage = MemoryStorage();
    final repository = PathRepository(storage);
    await repository.load();
    storage.failWrites = true;
    await expectLater(
      repository.createEntity(
        commandId: 'fail',
        type: 'goal',
        title: 'Invisible',
      ),
      throwsStateError,
    );
    expect(repository.document.entities, isEmpty);
    expect(repository.document.revision, 0);
  });

  test('préserve les champs inconnus au chargement et à l’écriture', () async {
    final storage = MemoryStorage()..contents = PathDocument.empty().encode();
    final decoded = PathDocument.decode(storage.contents!);
    decoded.json['futureField'] = {'kept': true};
    storage.contents = decoded.encode();
    final repository = PathRepository(storage);
    await repository.load();
    await repository.createEntity(
      commandId: 'future',
      type: 'goal',
      title: 'Compatible',
    );
    expect(PathDocument.decode(storage.contents!).json['futureField'], {
      'kept': true,
    });
  });

  test('refuse un document corrompu sans le remplacer', () async {
    final storage = MemoryStorage()..contents = '{invalid';
    final repository = PathRepository(storage);
    await expectLater(repository.load(), throwsFormatException);
    expect(storage.contents, '{invalid');
  });
}
