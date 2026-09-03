import 'dart:async';
import 'dart:math';

import 'path_document.dart';

abstract interface class PathStorage {
  Future<String?> read();
  Future<void> write(String contents);
}

class PathCommandException implements Exception {
  const PathCommandException(this.reason);
  final String reason;
  @override
  String toString() => reason;
}

class PathRepository {
  PathRepository(this.storage, {DateTime Function()? clock})
    : _clock = clock ?? DateTime.now;

  final PathStorage storage;
  final DateTime Function() _clock;
  final Random _random = Random.secure();
  PathDocument? _document;
  Future<void> _writeTail = Future.value();

  PathDocument get document =>
      _document ?? (throw StateError('Dépôt non chargé'));

  Future<PathDocument> load() async {
    final source = await storage.read();
    _document = source == null
        ? PathDocument.empty()
        : PathDocument.decode(source);
    return document;
  }

  Future<Map<String, dynamic>> createEntity({
    required String commandId,
    required String type,
    required String title,
    String? parentId,
  }) => _mutate(
    commandId,
    'create-entity',
    {'type': type, 'title': title, 'parentId': parentId},
    (next, now) {
      if (type != 'goal' && type != 'action') {
        throw const PathCommandException('incompatible-type');
      }
      if (title.trim().isEmpty) {
        throw const PathCommandException('invalid-command');
      }
      if (parentId != null && !_validParent(next, type, parentId)) {
        throw const PathCommandException('incompatible-parent');
      }
      final entity = <String, dynamic>{
        'id': _id('entity'),
        'type': type,
        'title': title.trim(),
        'description': '',
        'status': 'todo',
        'parentId': ?parentId,
        'createdAt': now,
        'updatedAt': now,
        'tags': <dynamic>[],
        'extensions': <String, dynamic>{},
      };
      (next['entities'] as List).add(entity);
      _event(next, 'entity-created', entity['id'] as String, commandId, now, {
        'command': 'create-entity',
        'intent': {'type': type, 'title': title, 'parentId': parentId},
      });
      return entity;
    },
  );

  Future<Map<String, dynamic>> plan({
    required String commandId,
    required String entityId,
    required String date,
  }) => _mutate(commandId, 'plan', {'entityId': entityId, 'date': date}, (
    next,
    now,
  ) {
    if (!RegExp(r'^\d{4}-\d{2}-\d{2}$').hasMatch(date)) {
      throw const PathCommandException('invalid-date');
    }
    final entity = _entity(next, entityId);
    final previous = entity['planned'];
    entity['planned'] = {'start': date};
    entity['updatedAt'] = now;
    _event(next, 'planned-period-changed', entityId, commandId, now, {
      'command': previous == null ? 'schedule' : 'reschedule',
      'previousPlanned': ?previous,
      'nextPlanned': {'start': date},
    });
    return entity;
  });

  Future<Map<String, dynamic>> complete({
    required String commandId,
    required String entityId,
  }) => _changeStatus(commandId, entityId, true);
  Future<Map<String, dynamic>> reopen({
    required String commandId,
    required String entityId,
  }) => _changeStatus(commandId, entityId, false);

  Future<Map<String, dynamic>> _changeStatus(
    String commandId,
    String entityId,
    bool complete,
  ) => _mutate(
    commandId,
    complete ? 'complete' : 'reopen',
    {'entityId': entityId},
    (next, now) {
      final entity = _entity(next, entityId);
      if (complete) {
        if (entity['status'] == 'done') {
          throw const PathCommandException('no-op');
        }
        entity['status'] = 'done';
        entity['completedAt'] = now;
      } else {
        if (entity['status'] != 'done') {
          throw const PathCommandException('no-op');
        }
        entity['status'] = 'in-progress';
        entity.remove('completedAt');
      }
      entity['updatedAt'] = now;
      _event(
        next,
        complete ? 'entity-completed' : 'entity-reopened',
        entityId,
        commandId,
        now,
      );
      return entity;
    },
  );

  Future<Map<String, dynamic>> _mutate(
    String commandId,
    String command,
    Map<String, dynamic> intent,
    Map<String, dynamic> Function(Map<String, dynamic>, String) change,
  ) {
    final completer = Completer<Map<String, dynamic>>();
    _writeTail = _writeTail.then((_) async {
      try {
        if (commandId.trim().isEmpty) {
          throw const PathCommandException('invalid-command');
        }
        final replay = _replay(commandId, command, intent);
        if (replay != null) {
          completer.complete(replay);
          return;
        }
        final next = deepCopy(document.json);
        final envelope = next['envelope'] as Map<String, dynamic>;
        final result = change(envelope, _clock().toUtc().toIso8601String());
        envelope['revision'] = document.revision + 1;
        final validated = PathDocument.fromJson(next);
        await storage.write(validated.encode());
        _document = validated;
        completer.complete(deepCopy(result));
      } catch (error, stack) {
        completer.completeError(error, stack);
      }
    });
    return completer.future;
  }

  Map<String, dynamic>? _replay(
    String commandId,
    String command,
    Map<String, dynamic> intent,
  ) {
    for (final event in document.events) {
      final ext = event['extensions'];
      if (ext is Map && ext['commandId'] == commandId) {
        if (ext['command'] != command ||
            ext['intent'].toString() != intent.toString()) {
          throw const PathCommandException('command-conflict');
        }
        return deepCopy(
          document.entities.firstWhere((e) => e['id'] == event['entityId']),
        );
      }
    }
    return null;
  }

  Map<String, dynamic> _entity(Map<String, dynamic> doc, String id) =>
      (doc['entities'] as List).cast<Map<String, dynamic>>().firstWhere(
        (item) => item['id'] == id && item['deletedAt'] == null,
        orElse: () => throw const PathCommandException('entity-not-found'),
      );

  bool _validParent(Map<String, dynamic> doc, String type, String parentId) {
    final parent = _entity(doc, parentId);
    return type == 'goal'
        ? parent['type'] == 'dream' || parent['type'] == 'goal'
        : parent['type'] == 'goal' || parent['type'] == 'milestone';
  }

  void _event(
    Map<String, dynamic> doc,
    String type,
    String entityId,
    String commandId,
    String now, [
    Map<String, dynamic> extra = const {},
  ]) {
    final event = <String, dynamic>{
      'id': _id('event'),
      'type': type,
      'entityId': entityId,
      'occurredAt': now,
      'recordedAt': now,
      ...extra.where(
        (key, _) => key == 'previousPlanned' || key == 'nextPlanned',
      ),
      'extensions': {
        'commandId': commandId,
        ...extra.where(
          (key, _) => key != 'previousPlanned' && key != 'nextPlanned',
        ),
      },
    };
    (doc['events'] as List).add(event);
  }

  String _id(String prefix) =>
      '$prefix-${_clock().microsecondsSinceEpoch}-${_random.nextInt(1 << 32)}';
}

extension<K, V> on Map<K, V> {
  Map<K, V> where(bool Function(K key, V value) predicate) => Map.fromEntries(
    entries.where((entry) => predicate(entry.key, entry.value)),
  );
}
