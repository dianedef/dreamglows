import 'dart:io';
import 'dart:convert';

import 'package:dreamglows_windows/path/path_document.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('le paquet portable conserve Focus, historique, révision et champs inconnus en Dart', () {
    final source = File('../packages/path-core/fixtures/portable-document-v1.json').readAsStringSync();
    final document = PathDocument.decode(source);
    expect(jsonDecode(document.encode()), jsonDecode(source));
    final restarted = PathDocument.decode(document.encode());
    expect(restarted.json, document.json);
    expect(restarted.revision, 42);
    expect(restarted.entities.where((entity) => entity['type'] == 'focus-session').length, 3);
    expect(restarted.entities.firstWhere((entity) => entity['id'] == 'focus-interrupted')['parentId'], 'missing-task');
  });
  test('Dart charge sans conversion le document partagé avec TypeScript', () {
    final file = File('../packages/path-core/fixtures/path-repository-v1.json');
    final document = PathDocument.decode(file.readAsStringSync());
    expect(document.entities[1]['id'], 'action-shared');
    expect(document.entities[1]['parentId'], 'goal-shared');
    expect(document.entities[1]['planned'], {'start': '2026-09-04'});
    expect(document.json['extensions']['futureRepositoryField'], 42);
  });
}
