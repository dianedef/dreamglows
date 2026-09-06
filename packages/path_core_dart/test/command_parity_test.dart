import 'package:path_core_dart/path_core_dart.dart';
import 'package:test/test.dart';

import 'path_repository_test.dart' show MemoryStorage;

void main() {
  test('creation retains title whitespace and reopening Focus keeps one active session', () async {
    final storage = MemoryStorage();
    final repo = PathRepository(storage);
    await repo.load();
    final created = await repo.execute({
      'type': 'create-entity',
      'commandId': 'create',
      'input': {'id': 'action', 'type': 'action', 'title': '  preserved  '},
    });
    expect(created['title'], '  preserved  ');
    await repo.startFocusSession(
      commandId: 'first',
      actionId: 'action',
      id: 'first',
      mode: 'focus',
    );
    await repo.endFocusSession(
      commandId: 'end-first',
      entityId: 'first',
      outcome: 'completed',
    );
    await repo.startFocusSession(
      commandId: 'second',
      actionId: 'action',
      id: 'second',
      mode: 'focus',
    );
    final persisted = storage.contents;
    await expectLater(
      repo.reopen(commandId: 'reopen-first', entityId: 'first'),
      throwsA(
        isA<PathCommandException>().having(
          (e) => e.reason,
          'reason',
          'active-session-exists',
        ),
      ),
    );
    expect(storage.contents, persisted);
    expect(
      repo.document.entities
          .where(
            (e) => e['type'] == 'focus-session' && e['status'] == 'in-progress',
          )
          .length,
      1,
    );
  });
  test(
    'civil rescheduling preserves whole days across Paris DST boundaries',
    () async {
      final repo = PathRepository(MemoryStorage());
      await repo.load();
      for (final id in ['plan', 'reschedule']) {
        await repo.createEntity(
          commandId: 'create-$id',
          id: id,
          type: 'action',
          title: id,
          planned: {
            'start': '2026-03-29',
            'end': '2026-03-30',
            'future': 'retained',
          },
        );
      }
      await repo.plan(
        commandId: 'move-plan',
        entityId: 'plan',
        date: '2026-09-06',
      );
      await repo.reschedule(
        commandId: 'move-reschedule',
        entityId: 'reschedule',
        planned: {'start': '2026-09-06'},
      );
      for (final entity in repo.document.entities) {
        expect(entity['planned'], {
          'start': '2026-09-06',
          'end': '2026-09-07',
          'future': 'retained',
        });
      }
      expect(
        DateTime.parse('2026-03-30T00:00:00Z')
            .difference(DateTime.parse('2026-03-29T00:00:00Z')),
        const Duration(days: 1),
      );
    },
  );
  test(
    'Windows plan switches instant periods to civil without stale end dates',
    () async {
      final repo = PathRepository(MemoryStorage());
      await repo.load();
      await repo.createEntity(
        commandId: 'create',
        id: 'action',
        type: 'action',
        title: 'action',
        planned: {
          'start': '2026-09-01T12:00:00Z',
          'end': '2026-09-01T14:00:00Z',
          'future': {'keep': true},
        },
      );
      await repo.plan(
        commandId: 'switch',
        entityId: 'action',
        date: '2026-09-06',
      );
      expect(repo.document.entities.single['planned'], {
        'start': '2026-09-06',
        'future': {'keep': true},
      });
      expect(
        repo.document.events.last['previousPlanned']['end'],
        '2026-09-01T14:00:00Z',
      );
      expect(
        repo.document.events.last['nextPlanned'].containsKey('end'),
        false,
      );
    },
  );
  test('canonical requests replay after TypeScript events and emit identical requests', () async {
    final storage = MemoryStorage();
    var repo = PathRepository(storage);
    await repo.load();
    final create = {
      'type': 'create-entity',
      'commandId': 'create',
      'input': {'id': 'action', 'type': 'action', 'title': 'action'},
    };
    await repo.execute(create);
    expect(repo.document.events.last['extensions']['commandRequest'], create);
    final doc = repo.document;
    doc.events.add({
      'id': 'ts-complete',
      'type': 'entity-completed',
      'entityId': 'action',
      'occurredAt': '2026-09-06T12:00:00Z',
      'recordedAt': '2026-09-06T12:00:00Z',
      'extensions': {'commandId': 'complete'},
    });
    storage.contents = doc.encode();
    repo = PathRepository(storage);
    await repo.load();
    final persisted = storage.contents;
    await repo.execute({
      'type': 'complete',
      'commandId': 'complete',
      'entityId': 'action',
    });
    expect(storage.contents, persisted);
    await repo.execute({
      'type': 'update-entity',
      'commandId': 'update',
      'entityId': 'action',
      'patch': {'why': 'meaning'},
    });
    final updated = storage.contents;
    repo = PathRepository(storage);
    await repo.load();
    await repo.execute({
      'patch': {'why': 'meaning'},
      'entityId': 'action',
      'commandId': 'update',
      'type': 'update-entity',
    });
    expect(storage.contents, updated);
    await expectLater(
      repo.execute({
        'type': 'update-entity',
        'commandId': 'update',
        'entityId': 'action',
        'patch': {'why': 'different'},
      }),
      throwsA(isA<PathCommandException>()),
    );
  });
  test('period commands preserve unknown fields, duration, reject mixed or inverted and replay', () async {
    final storage = MemoryStorage();
    final repo = PathRepository(storage);
    await repo.load();
    await repo.createEntity(
      commandId: 'a',
      id: 'a',
      type: 'action',
      title: 'a',
    );
    await repo.schedule(
      commandId: 's',
      entityId: 'a',
      planned: {'start': '2026-09-06', 'end': '2026-09-08', 'future': true},
    );
    await repo.reschedule(
      commandId: 'r',
      entityId: 'a',
      planned: {'start': '2026-09-10'},
    );
    expect(repo.document.entities.single['planned'], {
      'start': '2026-09-10',
      'end': '2026-09-12',
      'future': true,
    });
    await repo.resize(
      commandId: 'z',
      entityId: 'a',
      patch: {'end': '2026-09-13'},
    );
    final persisted = storage.contents;
    await repo.resize(
      commandId: 'z',
      entityId: 'a',
      patch: {'end': '2026-09-13'},
    );
    expect(storage.contents, persisted);
    await expectLater(
      repo.resize(
        commandId: 'bad',
        entityId: 'a',
        patch: {'end': '2026-09-01'},
      ),
      throwsFormatException,
    );
    await expectLater(
      repo.resize(
        commandId: 'mixed',
        entityId: 'a',
        patch: {'end': '2026-09-14T12:00:00Z'},
      ),
      throwsFormatException,
    );
    await repo.reschedule(
      commandId: 'zone',
      entityId: 'a',
      planned: {'start': '2026-09-14T12:00:00Z'},
    );
    expect(repo.document.entities.single['planned'], {
      'start': '2026-09-14T12:00:00Z',
      'future': true,
    });
  });
  test('recover only known v1 legacy planning without losing raw data or writing during load', () async {
    final storage = MemoryStorage();
    var repo = PathRepository(storage);
    await repo.load();
    await repo.createEntity(commandId: 'a', id: 'a', type: 'goal', title: 'a');
    final doc = repo.document;
    final invalid = {'start': '2026-09-10', 'end': '2026-09-01', 'future': 42};
    doc.entities.single['planned'] = invalid;
    doc.entities.single['extensions'] = {
      'legacy': {
        'kind': 'goal',
        'fields': {'original': 'kept'},
      },
    };
    storage.contents = doc.encode();
    final raw = storage.contents;
    expect(() => PathDocument.decode(raw!), throwsFormatException);
    repo = PathRepository(storage);
    await repo.load();
    expect(repo.recoveredLegacyPlanning, true);
    expect(storage.contents, raw);
    expect(repo.document.entities.single['planned'], null);
    expect(
      repo.document.entities.single['extensions']['legacy']['invalidPlanned'],
      invalid,
    );
    await repo.updateEntity(
      commandId: 'write',
      entityId: 'a',
      patch: {'why': 'meaning'},
    );
    final reloaded = PathRepository(storage);
    await reloaded.load();
    expect(reloaded.recoveredLegacyPlanning, false);
    final arbitrary = reloaded.document;
    arbitrary.entities.single['planned'] = invalid;
    arbitrary.entities.single['extensions'] = {};
    storage.contents = arbitrary.encode();
    await expectLater(PathRepository(storage).load(), throwsFormatException);
    arbitrary.entities.single['extensions'] = {
      'legacy': {
        'kind': 'goal',
        'fields': {},
        'invalidPlanned': {'start': 'another'},
      },
    };
    storage.contents = arbitrary.encode();
    await expectLater(PathRepository(storage).load(), throwsFormatException);
  });
}
