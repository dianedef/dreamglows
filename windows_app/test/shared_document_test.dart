import 'dart:io';

import 'package:dreamglows_windows/path/path_document.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('Dart charge sans conversion le document partagé avec TypeScript', () {
    final file = File('../packages/path-core/fixtures/path-repository-v1.json');
    final document = PathDocument.decode(file.readAsStringSync());
    expect(document.entities[1]['id'], 'action-shared');
    expect(document.entities[1]['parentId'], 'goal-shared');
    expect(document.entities[1]['planned'], {'start': '2026-09-04'});
    expect(document.json['extensions']['futureRepositoryField'], 42);
  });
}
