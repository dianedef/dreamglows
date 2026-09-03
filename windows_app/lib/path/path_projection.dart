import 'path_document.dart';

List<Map<String, dynamic>> livingEntities(PathDocument document) => document
    .entities
    .where((entity) => entity['deletedAt'] == null)
    .toList(growable: false);

Map<String, dynamic>? nextAction(PathDocument document) {
  final actions = livingEntities(document)
      .where(
        (entity) => entity['type'] == 'action' && entity['status'] != 'done',
      )
      .toList();
  actions.sort((a, b) {
    final ad = (a['planned'] as Map?)?['start']?.toString() ?? '9999';
    final bd = (b['planned'] as Map?)?['start']?.toString() ?? '9999';
    return ad.compareTo(bd);
  });
  return actions.isEmpty ? null : actions.first;
}

List<Map<String, dynamic>> durableHistory(PathDocument document) {
  final events = [...document.events];
  events.sort(
    (a, b) => (b['occurredAt'] as String).compareTo(a['occurredAt'] as String),
  );
  return events;
}
