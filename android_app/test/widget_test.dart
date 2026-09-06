import 'dart:convert';
import 'dart:ui';

import 'package:flutter_test/flutter_test.dart';
import 'package:path_flutter/path_flutter.dart';

class MemoryStorage implements PathStorage {
  String? contents;
  @override
  Future<String?> read() async => contents;
  @override
  Future<void> write(String value) async => contents = value;
}

void main() {
  testWidgets('Android narrow layout restores canonical meaning and unknown data', (tester) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    final storage = MemoryStorage();
    final repo = PathRepository(storage);
    await repo.load();
    await repo.execute({
      'type': 'create-entity', 'commandId': 'android-create',
      'input': {'id': 'android-dream', 'type': 'dream', 'title': 'Mon rêve Android', 'why': 'Du temps pour apprendre',
        'extensions': {'future': {'retained': true}}},
    });
    final restored = PathRepository(storage);
    await tester.pumpWidget(DreamGlowsApp(repository: restored));
    await tester.pumpAndSettle();
    expect(find.text('Mon rêve Android'), findsWidgets);
    expect(tester.takeException(), isNull);
    final entity = restored.document.entities.single;
    expect(entity['why'], 'Du temps pour apprendre');
    expect(entity['extensions']['future']['retained'], isTrue);
    expect(jsonDecode(storage.contents!)['repositoryVersion'], 1);
  });
}
