import 'dart:convert';

const pathSchemaVersion = 1;
const pathRepositoryVersion = 1;

Map<String, dynamic> deepCopy(Map<String, dynamic> value) =>
    jsonDecode(jsonEncode(value)) as Map<String, dynamic>;

class PathDocument {
  PathDocument._(this.json);
  final Map<String, dynamic> json;

  factory PathDocument.empty() => PathDocument._({
    'repositoryVersion': pathRepositoryVersion,
    'envelope': {
      'schemaVersion': pathSchemaVersion,
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
    if (decoded is! Map<String, dynamic>) {
      throw const FormatException(
        'Le document Chemin doit être un objet JSON.',
      );
    }
    validate(decoded);
    return PathDocument._(deepCopy(decoded));
  }
  factory PathDocument.fromJson(Map<String, dynamic> value) {
    validate(value);
    return PathDocument._(deepCopy(value));
  }

  Map<String, dynamic> get envelope => json['envelope'] as Map<String, dynamic>;
  int get revision => envelope['revision'] as int;
  List<Map<String, dynamic>> get entities =>
      (envelope['entities'] as List).cast<Map<String, dynamic>>();
  List<Map<String, dynamic>> get events =>
      (envelope['events'] as List).cast<Map<String, dynamic>>();
  String encode() => const JsonEncoder.withIndent('  ').convert(json);

  static void validate(Map<String, dynamic> value) {
    if (value['repositoryVersion'] != pathRepositoryVersion ||
        value['envelope'] is! Map<String, dynamic>) {
      throw const FormatException('Document de dépôt Chemin invalide.');
    }
    final envelope = value['envelope'] as Map<String, dynamic>;
    if (envelope['schemaVersion'] != pathSchemaVersion) {
      throw FormatException(
        'Version Chemin non prise en charge: ${envelope['schemaVersion']}',
      );
    }
    if (envelope['revision'] is! int || (envelope['revision'] as int) < 0) {
      throw const FormatException('Révision Chemin invalide.');
    }
    if (value['settings'] is! Map ||
        value['extensions'] is! Map ||
        envelope['entities'] is! List ||
        envelope['events'] is! List ||
        envelope['extensions'] is! Map) {
      throw const FormatException('Enveloppe Chemin incomplète.');
    }
    for (final item in envelope['entities'] as List) {
      if (item is! Map<String, dynamic> ||
          item['id'] is! String ||
          item['type'] is! String ||
          item['title'] is! String ||
          item['status'] is! String ||
          item['createdAt'] is! String ||
          item['updatedAt'] is! String ||
          item['tags'] is! List ||
          item['extensions'] is! Map) {
        throw const FormatException('Entité Chemin invalide.');
      }
    }
    for (final item in envelope['events'] as List) {
      if (item is! Map<String, dynamic> ||
          item['id'] is! String ||
          item['type'] is! String ||
          item['entityId'] is! String ||
          item['occurredAt'] is! String ||
          item['recordedAt'] is! String ||
          item['extensions'] is! Map) {
        throw const FormatException('Événement Chemin invalide.');
      }
    }
  }
}
