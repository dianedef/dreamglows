import 'dart:convert';

const pathSchemaVersion = 1;
const pathRepositoryVersion = 1;
const pathEntityTypes = {
  'dream',
  'goal',
  'milestone',
  'action',
  'habit',
  'focus-session',
  'evidence',
  'reflection',
};
const pathEventTypes = {
  'entity-created',
  'planned-period-changed',
  'entity-completed',
  'entity-reopened',
  'entity-reparented',
  'entity-updated',
  'entity-deleted',
  'focus-session-started',
  'focus-session-ended',
  'evidence-recorded',
  'reflection-recorded',
};

Map<String, dynamic> deepCopy(Map<String, dynamic> value) =>
    jsonDecode(jsonEncode(value)) as Map<String, dynamic>;

bool isCivilDate(dynamic value) {
  if (value is! String || !RegExp(r'^\d{4}-\d{2}-\d{2}$').hasMatch(value))
    return false;
  final parts = value.split('-').map(int.parse).toList();
  final date = DateTime.utc(parts[0], parts[1], parts[2]);
  return date.year == parts[0] &&
      date.month == parts[1] &&
      date.day == parts[2];
}

bool isZonedInstant(dynamic value) {
  if (value is! String ||
      !RegExp(
        r'^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$',
      ).hasMatch(value))
    return false;
  if (!isCivilDate(value.substring(0, 10))) return false;
  if (int.parse(value.substring(11, 13)) > 23 ||
      int.parse(value.substring(14, 16)) > 59 ||
      int.parse(value.substring(17, 19)) > 59)
    return false;
  if (!value.endsWith('Z')) {
    final zone = value.substring(value.length - 5);
    if (int.parse(zone.substring(0, 2)) > 23 ||
        int.parse(zone.substring(3)) > 59)
      return false;
  }
  return DateTime.tryParse(value) != null;
}

void validatePeriod(dynamic value) {
  if (value is! Map<String, dynamic>)
    throw const FormatException('Invalid planned period');
  for (final key in ['start', 'end']) {
    if (value.containsKey(key) &&
        !isCivilDate(value[key]) &&
        !isZonedInstant(value[key]))
      throw const FormatException('Invalid planned date');
  }
  if (value.containsKey('start') && value.containsKey('end')) {
    if (isCivilDate(value['start']) != isCivilDate(value['end']))
      throw const FormatException('Mixed planned dates');
    if (DateTime.parse(value['start']).isAfter(DateTime.parse(value['end'])))
      throw const FormatException('Inverted planned period');
  }
}

void _jsonSafe(dynamic value, [Set<Object>? ancestors]) {
  if (value == null ||
      value is String ||
      value is bool ||
      (value is num && value.isFinite))
    return;
  final seen = ancestors ?? Set<Object>.identity();
  if (value is! List && value is! Map<String, dynamic>)
    throw const FormatException('Not JSON-safe');
  if (!seen.add(value as Object)) throw const FormatException('Circular JSON');
  if (value is List) {
    for (final child in value) {
      _jsonSafe(child, seen);
    }
  } else {
    for (final entry in (value as Map<String, dynamic>).entries) {
      if (const {'__proto__', 'prototype', 'constructor'}.contains(entry.key))
        throw const FormatException('Unsafe JSON key');
      _jsonSafe(entry.value, seen);
    }
  }
  seen.remove(value);
}

void _string(dynamic value, {bool identity = false}) {
  if (value is! String || (identity && value.trim().isEmpty))
    throw const FormatException('Invalid string');
}

class PathDocument {
  PathDocument._(this.json);
  final Map<String, dynamic> json;
  factory PathDocument.empty() => PathDocument.fromJson({
    'repositoryVersion': 1,
    'envelope': {
      'schemaVersion': 1,
      'revision': 0,
      'entities': <dynamic>[],
      'events': <dynamic>[],
      'extensions': <String, dynamic>{},
    },
    'settings': <String, dynamic>{},
    'extensions': <String, dynamic>{},
  });
  factory PathDocument.decode(String source) {
    final decoded = jsonDecode(source);
    if (decoded is! Map<String, dynamic>)
      throw const FormatException('Invalid document');
    return PathDocument.fromJson(decoded);
  }
  factory PathDocument.fromJson(Map<String, dynamic> value) {
    validate(value);
    return PathDocument._(deepCopy(value));
  }
  Map<String, dynamic> get envelope => json['envelope'] as Map<String, dynamic>;
  int get revision => (envelope['revision'] as num).toInt();
  List<Map<String, dynamic>> get entities =>
      (envelope['entities'] as List).cast<Map<String, dynamic>>();
  List<Map<String, dynamic>> get events =>
      (envelope['events'] as List).cast<Map<String, dynamic>>();
  String encode() => const JsonEncoder.withIndent('  ').convert(json);
  static void validate(Map<String, dynamic> value) {
    _jsonSafe(value);
    if (value['repositoryVersion'] != 1 ||
        value['envelope'] is! Map<String, dynamic>)
      throw const FormatException('Invalid repository');
    final env = value['envelope'] as Map<String, dynamic>;
    final revision = env['revision'];
    if (env['schemaVersion'] != 1 ||
        revision is! num ||
        !revision.isFinite ||
        revision < 0 ||
        revision > 9007199254740991 ||
        revision != revision.truncateToDouble())
      throw const FormatException('Invalid revision or schema');
    if (value['settings'] is! Map<String, dynamic> ||
        value['extensions'] is! Map<String, dynamic> ||
        env['extensions'] is! Map<String, dynamic> ||
        env['entities'] is! List ||
        env['events'] is! List)
      throw const FormatException('Invalid envelope');
    final ids = <String>{};
    for (final item in env['entities'] as List) {
      if (item is! Map<String, dynamic>)
        throw const FormatException('Invalid entity');
      _string(item['id'], identity: true);
      if (!ids.add(item['id'] as String))
        throw const FormatException('Duplicate ID');
      if (!pathEntityTypes.contains(item['type']) ||
          !const {
            'todo',
            'in-progress',
            'done',
            'cancelled',
          }.contains(item['status']))
        throw const FormatException('Unsupported type or status');
      _string(item['title']);
      _string(item['description']);
      if (item.containsKey('why')) _string(item['why']);
      if (item.containsKey('parentId'))
        _string(item['parentId'], identity: true);
      if (item.containsKey('priority') &&
          !const {'low', 'medium', 'high'}.contains(item['priority']))
        throw const FormatException('Invalid priority');
      for (final key in ['createdAt', 'updatedAt']) {
        if (!isZonedInstant(item[key]))
          throw const FormatException('Invalid required date');
      }
      for (final key in ['completedAt', 'deletedAt', 'occurredAt']) {
        if (item.containsKey(key) && !isZonedInstant(item[key]))
          throw const FormatException('Invalid date');
      }
      if (item.containsKey('planned')) validatePeriod(item['planned']);
      if (item['tags'] is! List ||
          (item['tags'] as List).any((tag) => tag is! String) ||
          item['extensions'] is! Map<String, dynamic>)
        throw const FormatException('Invalid tags or extensions');
    }
    for (final item in env['events'] as List) {
      if (item is! Map<String, dynamic>)
        throw const FormatException('Invalid event');
      _string(item['id'], identity: true);
      if (!ids.add(item['id'] as String))
        throw const FormatException('Duplicate ID');
      if (!pathEventTypes.contains(item['type']))
        throw const FormatException('Unsupported event');
      _string(item['entityId'], identity: true);
      for (final key in ['occurredAt', 'recordedAt']) {
        if (!isZonedInstant(item[key]))
          throw const FormatException('Invalid event date');
      }
      for (final key in [
        'relatedEntityId',
        'previousParentId',
        'nextParentId',
      ]) {
        if (item.containsKey(key)) _string(item[key], identity: true);
      }
      for (final key in ['previousPlanned', 'nextPlanned']) {
        if (item.containsKey(key)) validatePeriod(item[key]);
      }
      for (final key in ['previousValues', 'nextValues']) {
        if (item.containsKey(key) && item[key] is! Map<String, dynamic>)
          throw const FormatException('Invalid event values');
      }
      if (item['extensions'] is! Map<String, dynamic>)
        throw const FormatException('Invalid event extensions');
    }
  }
}
