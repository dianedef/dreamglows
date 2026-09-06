import 'dart:async';
import 'dart:convert';
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

const _parents = <String, Set<String>>{
  'goal': {'dream', 'goal'},
  'milestone': {'goal'},
  'action': {'goal', 'milestone', 'action'},
  'habit': {'goal'},
  'evidence': {
    'dream',
    'goal',
    'milestone',
    'action',
    'habit',
    'focus-session',
  },
  'reflection': {
    'dream',
    'goal',
    'milestone',
    'action',
    'habit',
    'focus-session',
  },
};

DateTime _civilUtc(String date) => DateTime.parse('${date}T00:00:00Z');
String _stable(dynamic value) {
  dynamic canonical(dynamic item) {
    if (item is Map<String, dynamic>) {
      final keys = item.keys.toList()..sort();
      return {for (final key in keys) key: canonical(item[key])};
    }
    if (item is List) return item.map(canonical).toList();
    return item;
  }

  return jsonEncode(canonical(value));
}

class PathRepository {
  PathRepository(this.storage, {DateTime Function()? clock})
    : _clock = clock ?? DateTime.now;
  final PathStorage storage;
  final DateTime Function() _clock;
  final Random _random = Random.secure();
  PathDocument? _document;
  Future<void> _writeTail = Future.value();
  bool recoveredLegacyPlanning = false;
  PathDocument get document => PathDocument.fromJson(
    (_document ?? (throw StateError('Dépôt non chargé'))).json,
  );
  Future<PathDocument> load() async {
    final source = await storage.read();
    recoveredLegacyPlanning = false;
    if (source == null) {
      _document = PathDocument.empty();
    } else {
      final raw = jsonDecode(source);
      if (raw is! Map<String, dynamic>)
        throw const FormatException('Invalid repository');
      final env = raw['envelope'];
      if (raw['repositoryVersion'] == 1 &&
          env is Map<String, dynamic> &&
          env['schemaVersion'] == 1 &&
          env['entities'] is List) {
        for (final entity in env['entities'] as List) {
          if (entity is! Map<String, dynamic> || !entity.containsKey('planned'))
            continue;
          final extensions = entity['extensions'];
          final legacy = extensions is Map<String, dynamic>
              ? extensions['legacy']
              : null;
          if (legacy is! Map<String, dynamic> ||
              !const {'goal', 'task'}.contains(legacy['kind']) ||
              legacy['fields'] is! Map<String, dynamic>)
            continue;
          try {
            validatePeriod(entity['planned']);
          } on FormatException {
            if (legacy.containsKey('invalidPlanned') &&
                _stable(legacy['invalidPlanned']) != _stable(entity['planned']))
              throw const FormatException(
                'Conflicting legacy planning recovery',
              );
            legacy['invalidPlanned'] = entity.remove('planned');
            recoveredLegacyPlanning = true;
          }
        }
      }
      _document = PathDocument.fromJson(raw);
    }
    return document;
  }

  Future<Map<String, dynamic>> createEntity({
    required String commandId,
    required String type,
    required String title,
    String? parentId,
    String? id,
    String description = '',
    String? why,
    String? priority,
    List<String> tags = const [],
    Map<String, dynamic> extensions = const {},
    Map<String, dynamic>? planned,
  }) => _mutate(
    commandId,
    'create-entity',
    {
      'type': type,
      'title': title,
      'parentId': parentId,
      'id': id,
      'description': description,
      'why': why,
      'priority': priority,
      'tags': tags,
      'extensions': extensions,
      'planned': planned,
    },
    (next, now, captured) {
      if (!pathEntityTypes.contains(type) || type == 'focus-session')
        _fail('incompatible-type');
      if (title.trim().isEmpty || (id != null && id.trim().isEmpty))
        _fail('invalid-command');
      _parent(next, type, parentId);
      final entity = <String, dynamic>{
        'id': id ?? _id('entity'),
        'type': type,
        'title': title,
        'description': description,
        'why': ?why,
        'priority': ?priority,
        'status': 'todo',
        'parentId': ?parentId,
        'planned': ?captured['planned'],
        'createdAt': now,
        'updatedAt': now,
        'tags': captured['tags'],
        'extensions': captured['extensions'],
      };
      if (_occupied(next, entity['id'])) _fail('id-collision');
      (next['entities'] as List).add(entity);
      _event(next, 'entity-created', entity['id'], now);
      return entity;
    },
  );
  Future<Map<String, dynamic>> updateEntity({
    required String commandId,
    required String entityId,
    required Map<String, dynamic> patch,
  }) => _mutate(
    commandId,
    'update-entity',
    {'entityId': entityId, 'patch': patch},
    (next, now, captured) {
      final patch = captured['patch'] as Map<String, dynamic>;
      final entity = _entity(next, entityId);
      if (patch.keys.any(
        (key) => !const {
          'title',
          'description',
          'why',
          'priority',
          'tags',
          'extensions',
        }.contains(key),
      ))
        _fail('invalid-command');
      if (patch.containsKey('title') &&
          (patch['title'] is! String ||
              (patch['title'] as String).trim().isEmpty))
        _fail('invalid-command');
      final before = <String, dynamic>{}, after = <String, dynamic>{};
      for (final key in patch.keys) {
        final value = key == 'extensions' && patch[key] is Map<String, dynamic>
            ? <String, dynamic>{
                ...entity['extensions'] as Map<String, dynamic>,
                ...patch[key] as Map<String, dynamic>,
              }
            : patch[key];
        if (_stable(entity[key]) != _stable(value)) {
          before[key] = entity[key];
          after[key] = value;
          entity[key] = value;
        }
      }
      if (after.isEmpty) _fail('no-op');
      entity['updatedAt'] = now;
      _event(next, 'entity-updated', entityId, now, {
        'previousValues': before,
        'nextValues': after,
      });
      return entity;
    },
  );
  Future<Map<String, dynamic>> deleteEntity({
    required String commandId,
    required String entityId,
  }) => _mutate(commandId, 'delete-entity', {'entityId': entityId}, (
    next,
    now,
    captured,
  ) {
    final entity = _entity(next, entityId);
    if ((next['entities'] as List).any(
      (e) => e['parentId'] == entityId && e['deletedAt'] == null,
    ))
      _fail('has-children');
    entity.addAll({'deletedAt': now, 'updatedAt': now, 'status': 'cancelled'});
    _event(next, 'entity-deleted', entityId, now);
    return entity;
  });
  Future<Map<String, dynamic>> reparent({
    required String commandId,
    required String entityId,
    String? parentId,
  }) => _mutate(
    commandId,
    'reparent',
    {'entityId': entityId, 'parentId': parentId},
    (next, now, captured) {
      final entity = _entity(next, entityId);
      if (!_parents.containsKey(entity['type'])) _fail('incompatible-type');
      if (entity['parentId'] == parentId) _fail('no-op');
      _parent(next, entity['type'], parentId, entityId: entityId);
      final previous = entity['parentId'];
      if (parentId == null) {
        entity.remove('parentId');
      } else {
        entity['parentId'] = parentId;
      }
      entity['updatedAt'] = now;
      _event(next, 'entity-reparented', entityId, now, {
        'previousParentId': ?previous,
        'nextParentId': ?parentId,
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
    captured,
  ) {
    if (!isCivilDate(date)) _fail('invalid-date');
    final entity = _entity(next, entityId);
    _schedulable(entity);
    final previous = entity['planned'] as Map<String, dynamic>?;
    final planned = <String, dynamic>{...?previous}
      ..remove('start')
      ..remove('end');
    planned['start'] = date;
    if (previous?['start'] != null &&
        previous?['end'] != null &&
        isCivilDate(previous!['start']) &&
        isCivilDate(previous['end'])) {
      planned['end'] = _civilUtc(date)
          .add(
            _civilUtc(previous['end']).difference(_civilUtc(previous['start'])),
          )
          .toIso8601String()
          .substring(0, 10);
    }
    if (_stable(previous) == _stable(planned)) _fail('no-op');
    entity.addAll({'planned': planned, 'updatedAt': now});
    _event(next, 'planned-period-changed', entityId, now, {
      'previousPlanned': ?previous,
      'nextPlanned': planned,
    });
    return entity;
  });
  Future<Map<String, dynamic>> complete({
    required String commandId,
    required String entityId,
  }) => _status(commandId, entityId, true);
  Future<Map<String, dynamic>> reopen({
    required String commandId,
    required String entityId,
  }) => _status(commandId, entityId, false);
  Future<Map<String, dynamic>> _status(
    String commandId,
    String entityId,
    bool done,
  ) => _mutate(
    commandId,
    done ? 'complete' : 'reopen',
    {'entityId': entityId},
    (next, now, captured) {
      final entity = _entity(next, entityId);
      _schedulable(entity);
      if (done) {
        if (entity['status'] == 'done') _fail('no-op');
        if (!const {'todo', 'in-progress'}.contains(entity['status']))
          _fail('incompatible-type');
        entity.addAll({'status': 'done', 'completedAt': now});
      } else {
        if (entity['status'] != 'done') _fail('no-op');
        if (entity['type'] == 'focus-session' &&
            (next['entities'] as List).any(
              (other) =>
                  other['id'] != entityId &&
                  other['type'] == 'focus-session' &&
                  other['status'] == 'in-progress' &&
                  other['deletedAt'] == null,
            )) {
          _fail('active-session-exists');
        }
        entity['status'] = 'in-progress';
        entity.remove('completedAt');
      }
      entity['updatedAt'] = now;
      _event(
        next,
        done ? 'entity-completed' : 'entity-reopened',
        entityId,
        now,
      );
      return entity;
    },
  );
  Future<Map<String, dynamic>> startFocusSession({
    required String commandId,
    required String actionId,
    required String mode,
    String? id,
  }) => _mutate(
    commandId,
    'start-focus-session',
    {'actionId': actionId, 'mode': mode, 'id': id},
    (next, now, captured) {
      if (_entity(next, actionId)['type'] != 'action' ||
          !const {'focus', 'creation', 'administration'}.contains(mode))
        _fail('incompatible-type');
      if ((next['entities'] as List).any(
        (e) =>
            e['type'] == 'focus-session' &&
            e['status'] == 'in-progress' &&
            e['deletedAt'] == null,
      ))
        _fail('active-session-exists');
      final entity = <String, dynamic>{
        'id': id ?? _id('entity'),
        'type': 'focus-session',
        'title': 'Session de focus',
        'description': '',
        'status': 'in-progress',
        'parentId': actionId,
        'occurredAt': now,
        'createdAt': now,
        'updatedAt': now,
        'tags': <String>[],
        'extensions': {'mode': mode},
      };
      if (_occupied(next, entity['id'])) _fail('id-collision');
      (next['entities'] as List).add(entity);
      _event(next, 'focus-session-started', entity['id'], now);
      return entity;
    },
  );
  Future<Map<String, dynamic>> endFocusSession({
    required String commandId,
    required String entityId,
    required String outcome,
    String? handoffNote,
    String? nextAction,
  }) => _mutate(
    commandId,
    'end-focus-session',
    {
      'entityId': entityId,
      'outcome': outcome,
      'handoffNote': handoffNote,
      'nextAction': nextAction,
    },
    (next, now, captured) {
      final entity = _entity(next, entityId);
      if (entity['type'] != 'focus-session' ||
          !const {'completed', 'interrupted'}.contains(outcome))
        _fail('incompatible-type');
      if (entity['status'] != 'in-progress') _fail('no-op');
      entity.addAll({
        'status': outcome == 'completed' ? 'done' : 'cancelled',
        'completedAt': now,
        'updatedAt': now,
      });
      final ext = entity['extensions'] as Map<String, dynamic>;
      if (handoffNote != null && handoffNote.trim().isNotEmpty)
        ext['handoffNote'] = handoffNote.trim();
      if (nextAction != null && nextAction.trim().isNotEmpty)
        ext['nextAction'] = nextAction.trim();
      _event(next, 'focus-session-ended', entityId, now);
      return entity;
    },
  );
  static final Object _requestKey = Object();

  /// Accepts the same JSON command request as the TypeScript command port.
  Future<Map<String, dynamic>> execute(Map<String, dynamic> command) {
    final request = deepCopy(command);
    return runZoned(() {
      final id = request['commandId'] as String;
      final entityId = request['entityId'] as String?;
      final input =
          (request['input'] as Map<String, dynamic>?) ?? <String, dynamic>{};
      switch (request['type']) {
        case 'create-entity':
          return createEntity(
            commandId: id,
            id: input['id'] as String,
            type: input['type'] as String,
            title: input['title'] as String,
            description: input['description'] as String? ?? '',
            why: input['why'] as String?,
            priority: input['priority'] as String?,
            parentId: input['parentId'] as String?,
            tags: (input['tags'] as List?)?.cast<String>() ?? [],
            extensions: input['extensions'] as Map<String, dynamic>? ?? {},
            planned: input['planned'] as Map<String, dynamic>?,
          );
        case 'update-entity':
          return updateEntity(
            commandId: id,
            entityId: entityId!,
            patch: request['patch'] as Map<String, dynamic>,
          );
        case 'delete-entity':
          return deleteEntity(commandId: id, entityId: entityId!);
        case 'complete':
          return complete(commandId: id, entityId: entityId!);
        case 'reopen':
          return reopen(commandId: id, entityId: entityId!);
        case 'reparent':
          return reparent(
            commandId: id,
            entityId: entityId!,
            parentId: request['nextParentId'] as String?,
          );
        case 'schedule':
          return schedule(
            commandId: id,
            entityId: entityId!,
            planned: request['planned'] as Map<String, dynamic>,
          );
        case 'reschedule':
          return reschedule(
            commandId: id,
            entityId: entityId!,
            planned: request['planned'] as Map<String, dynamic>,
          );
        case 'resize':
          return resize(
            commandId: id,
            entityId: entityId!,
            patch: request['patch'] as Map<String, dynamic>,
          );
        case 'start-focus-session':
          return startFocusSession(
            commandId: id,
            actionId: input['actionId'] as String,
            id: input['id'] as String,
            mode: input['mode'] as String,
          );
        case 'end-focus-session':
          return endFocusSession(
            commandId: id,
            entityId: entityId!,
            outcome: input['outcome'] as String,
            handoffNote: input['handoffNote'] as String?,
            nextAction: input['nextAction'] as String?,
          );
        default:
          throw const PathCommandException('invalid-command');
      }
    }, zoneValues: {_requestKey: request});
  }

  Future<Map<String, dynamic>> schedule({
    required String commandId,
    required String entityId,
    required Map<String, dynamic> planned,
  }) => _period(commandId, entityId, planned, 'schedule');
  Future<Map<String, dynamic>> reschedule({
    required String commandId,
    required String entityId,
    required Map<String, dynamic> planned,
  }) => _period(commandId, entityId, planned, 'reschedule');
  Future<Map<String, dynamic>> resize({
    required String commandId,
    required String entityId,
    required Map<String, dynamic> patch,
  }) => _period(commandId, entityId, patch, 'resize');
  Future<Map<String, dynamic>> _period(
    String commandId,
    String entityId,
    Map<String, dynamic> period,
    String mode,
  ) => _mutate(
    commandId,
    mode,
    {'entityId': entityId, mode == 'resize' ? 'patch' : 'planned': period},
    (env, now, captured) {
      final entity = _entity(env, entityId);
      _schedulable(entity);
      final requested =
          captured[mode == 'resize' ? 'patch' : 'planned']
              as Map<String, dynamic>;
      final previous = entity['planned'] as Map<String, dynamic>?;
      if (mode == 'schedule' && previous != null ||
          mode != 'schedule' && previous == null)
        _fail('no-op');
      if (mode == 'resize') {
        if (requested.containsKey('start') == requested.containsKey('end'))
          _fail(requested.containsKey('start') ? 'invalid-command' : 'no-op');
      } else if (!requested.containsKey('start')) {
        _fail('invalid-command');
      }
      final preserved = <String, dynamic>{...?previous}
        ..remove('start')
        ..remove('end');
      final nextPeriod = <String, dynamic>{
        ...preserved,
        ...(mode == 'resize' ? previous! : {}),
        ...requested,
      };
      if (mode == 'reschedule' &&
          previous?['start'] != null &&
          previous?['end'] != null &&
          !requested.containsKey('end')) {
        if (isCivilDate(previous!['start']) &&
            isCivilDate(previous['end']) &&
            isCivilDate(requested['start'])) {
          nextPeriod['end'] = _civilUtc(requested['start'])
              .add(
                _civilUtc(previous['end'])
                    .difference(_civilUtc(previous['start'])),
              )
              .toIso8601String()
              .substring(0, 10);
        } else if (isZonedInstant(previous['start']) &&
            isZonedInstant(previous['end']) &&
            isZonedInstant(requested['start'])) {
          nextPeriod['end'] = DateTime.parse(requested['start'])
              .add(
                DateTime.parse(previous['end'])
                    .difference(DateTime.parse(previous['start'])),
              )
              .toUtc()
              .toIso8601String();
        }
      }
      validatePeriod(nextPeriod);
      if (_stable(previous) == _stable(nextPeriod)) _fail('no-op');
      entity.addAll({'planned': nextPeriod, 'updatedAt': now});
      _event(env, 'planned-period-changed', entityId, now, {
        'previousPlanned': ?previous,
        'nextPlanned': nextPeriod,
      });
      return entity;
    },
  );

  Map<String, dynamic> _request(
    String commandId,
    String command,
    Map<String, dynamic> intent,
  ) {
    final cleaned = Map<String, dynamic>.from(intent)
      ..removeWhere((key, value) => value == null);
    if (command == 'create-entity' || command == 'start-focus-session')
      return {'type': command, 'commandId': commandId, 'input': cleaned};
    if (command == 'end-focus-session') {
      final entityId = cleaned.remove('entityId');
      return {
        'type': command,
        'commandId': commandId,
        'entityId': entityId,
        'input': cleaned,
      };
    }
    if (command == 'reparent') {
      final parent = cleaned.remove('parentId');
      if (parent != null) cleaned['nextParentId'] = parent;
    }
    return {'type': command, 'commandId': commandId, ...cleaned};
  }

  bool _legacyReplay(Map<String, dynamic> event, Map<String, dynamic> request) {
    final command = request['type'];
    final input = request['input'];
    final target =
        command == 'create-entity' || command == 'start-focus-session'
        ? input['id']
        : request['entityId'];
    if (event['entityId'] != target) return false;
    final ext = event['extensions'] as Map<String, dynamic>;
    if (command == 'complete') return event['type'] == 'entity-completed';
    if (command == 'reopen') return event['type'] == 'entity-reopened';
    if (command == 'delete-entity') return event['type'] == 'entity-deleted';
    if (command == 'reparent')
      return event['type'] == 'entity-reparented' &&
          event['nextParentId'] == request['nextParentId'];
    if (command == 'update-entity')
      return event['type'] == 'entity-updated' &&
          _stable(ext['intent']) == _stable(request['patch']);
    if (command == 'create-entity' ||
        command == 'start-focus-session' ||
        command == 'end-focus-session') {
      final expected = {
        'create-entity': 'entity-created',
        'start-focus-session': 'focus-session-started',
        'end-focus-session': 'focus-session-ended',
      }[command];
      return event['type'] == expected &&
          _stable(ext['intent']) == _stable(input);
    }
    if (const {'schedule', 'reschedule', 'resize'}.contains(command)) {
      final wanted =
          request[command == 'resize' ? 'patch' : 'planned']
              as Map<String, dynamic>;
      final actual = event['nextPlanned'] as Map<String, dynamic>?;
      return event['type'] == 'planned-period-changed' &&
          ext['command'] == command &&
          wanted.entries.every(
            (e) => _stable(actual?[e.key]) == _stable(e.value),
          );
    }
    return false;
  }

  Future<Map<String, dynamic>> _mutate(
    String commandId,
    String command,
    Map<String, dynamic> intent,
    Map<String, dynamic> Function(
      Map<String, dynamic>,
      String,
      Map<String, dynamic>,
    )
    change,
  ) {
    final captured = deepCopy(intent);
    final request = deepCopy(
      Zone.current[_requestKey] as Map<String, dynamic>? ??
          _request(commandId, command, captured),
    );
    final completer = Completer<Map<String, dynamic>>();
    _writeTail = _writeTail.then((_) async {
      try {
        if (commandId.trim().isEmpty) _fail('invalid-command');
        final replay = _replay(commandId, command, captured, request);
        if (replay != null) {
          completer.complete(replay);
          return;
        }
        // Serialized local commands do not publish state before durable write.
        final next = deepCopy(document.json),
            envelope = next['envelope'] as Map<String, dynamic>;
        final result = change(
          envelope,
          _clock().toUtc().toIso8601String(),
          captured,
        );
        final event = (envelope['events'] as List).last as Map<String, dynamic>;
        event['extensions'] = {
          'commandId': commandId,
          'command': command,
          'intent': captured,
          'commandRequest': request,
        };
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
    Map<String, dynamic> request,
  ) {
    for (final event in document.events) {
      final ext = event['extensions'] as Map<String, dynamic>;
      if (ext['commandId'] == commandId) {
        final matches = ext.containsKey('commandRequest')
            ? _stable(ext['commandRequest']) == _stable(request)
            : (ext['command'] == command &&
                      _stable(ext['intent']) == _stable(intent)) ||
                  _legacyReplay(event, request);
        if (!matches) _fail('command-conflict');
        return deepCopy(
          document.entities.firstWhere((e) => e['id'] == event['entityId']),
        );
      }
    }
    return null;
  }

  Map<String, dynamic> _entity(Map<String, dynamic> env, String id) =>
      (env['entities'] as List).cast<Map<String, dynamic>>().firstWhere(
        (e) => e['id'] == id && e['deletedAt'] == null,
        orElse: () => throw const PathCommandException('entity-not-found'),
      );
  void _schedulable(Map<String, dynamic> entity) {
    if (const {'evidence', 'reflection'}.contains(entity['type']))
      _fail('incompatible-type');
  }

  void _parent(
    Map<String, dynamic> env,
    String type,
    String? parentId, {
    String? entityId,
  }) {
    if (parentId == null) return;
    final parents = (env['entities'] as List)
        .cast<Map<String, dynamic>>()
        .where((e) => e['id'] == parentId && e['deletedAt'] == null);
    if (parents.isEmpty) _fail('parent-not-found');
    if (!(_parents[type]?.contains(parents.first['type']) ?? false))
      _fail('incompatible-type');
    Map<String, dynamic>? cursor = parents.first;
    final visited = <String>{};
    while (cursor != null) {
      final id = cursor['id'] as String;
      if (id == entityId || !visited.add(id)) _fail('cycle');
      final matches = (env['entities'] as List)
          .cast<Map<String, dynamic>>()
          .where((e) => e['id'] == cursor!['parentId']);
      cursor = matches.isEmpty ? null : matches.first;
    }
  }

  bool _occupied(Map<String, dynamic> env, dynamic id) => [
    ...env['entities'] as List,
    ...env['events'] as List,
  ].any((e) => e['id'] == id);
  void _event(
    Map<String, dynamic> env,
    String type,
    String entityId,
    String now, [
    Map<String, dynamic> extra = const {},
  ]) {
    (env['events'] as List).add({
      'id': _id('event'),
      'type': type,
      'entityId': entityId,
      'occurredAt': now,
      'recordedAt': now,
      ...extra,
      'extensions': <String, dynamic>{},
    });
  }

  Never _fail(String reason) => throw PathCommandException(reason);
  String _id(String prefix) =>
      '$prefix-${_clock().microsecondsSinceEpoch}-${_random.nextInt(1 << 32)}';
}
