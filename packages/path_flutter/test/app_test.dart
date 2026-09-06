import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:path_flutter/path_flutter.dart';

class MemoryStorage implements PathStorage {
  String? data;
  bool fail = false;
  @override
  Future<String?> read() async => data;
  @override
  Future<void> write(String value) async {
    if (fail) throw StateError('disk full');
    data = value;
  }
}

Finder input(String label) => find.widgetWithText(TextField, label);
Future<void> click(WidgetTester tester, String label) async {
  final target = find.widgetWithText(FilledButton, label);
  await tester.ensureVisible(target);
  await tester.tap(target);
  await tester.pumpAndSettle();
}

void main() {
  testWidgets(
    'create, failed edit retains input, retry and restart preserve unknown fields',
    (tester) async {
      final storage = MemoryStorage();
      final repo = PathRepository(storage);
      await repo.load();
      await repo.createEntity(
        commandId: 'seed',
        id: 'dream',
        type: 'dream',
        title: 'Original',
        extensions: {
          'future': {'retained': true},
        },
      );
      await tester.pumpWidget(DreamGlowsApp(repository: repo));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Original'));
      await tester.pumpAndSettle();
      await tester.enterText(input('Titre'), 'Changed');
      await tester.enterText(input('Pourquoi'), 'Meaning');
      storage.fail = true;
      await click(tester, 'Enregistrer');
      expect(find.textContaining('Votre saisie est conservée'), findsOneWidget);
      expect(find.text('Changed'), findsOneWidget);
      expect(repo.document.entities.single['title'], 'Original');
      storage.fail = false;
      await click(tester, 'Enregistrer');
      final restarted = PathRepository(storage);
      await tester.pumpWidget(const SizedBox());
      await tester.pumpWidget(DreamGlowsApp(repository: restarted));
      await tester.pumpAndSettle();
      expect(find.text('Changed'), findsOneWidget);
      expect(restarted.document.entities.single['why'], 'Meaning');
      expect(restarted.document.entities.single['extensions'], {
        'future': {'retained': true},
      });
      expect(jsonDecode(storage.data!)['envelope']['revision'], 2);
    },
  );
  testWidgets('narrow daily screen creates through keyboard without overflow', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(360, 800);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    final storage = MemoryStorage();
    final repo = PathRepository(storage);
    await tester.pumpWidget(DreamGlowsApp(repository: repo));
    await tester.pumpAndSettle();
    await tester.ensureVisible(input('Titre'));
    await tester.enterText(input('Titre'), 'Mobile dream');
    await tester.testTextInput.receiveAction(TextInputAction.done);
    await tester.pumpAndSettle();
    expect(repo.document.entities.single['title'], 'Mobile dream');
    expect(tester.takeException(), isNull);
  });
  testWidgets('load failure offers retry', (tester) async {
    final storage = MemoryStorage()..data = 'broken';
    final repo = PathRepository(storage);
    await tester.pumpWidget(DreamGlowsApp(repository: repo));
    await tester.pumpAndSettle();
    expect(find.textContaining('Chargement impossible'), findsOneWidget);
    storage.data = null;
    await click(tester, 'Réessayer');
    expect(find.text('Prochaine action'), findsOneWidget);
  });
  testWidgets('switching selection explicitly protects unsaved draft', (
    tester,
  ) async {
    final repo = PathRepository(MemoryStorage());
    await repo.load();
    await repo.createEntity(
      commandId: 'seed',
      type: 'dream',
      title: 'Existing',
    );
    await tester.pumpWidget(DreamGlowsApp(repository: repo));
    await tester.pumpAndSettle();
    await tester.enterText(input('Titre'), 'Pending');
    await tester.tap(find.text('Existing'));
    await tester.pumpAndSettle();
    expect(find.text('Saisie non enregistrée'), findsOneWidget);
    await tester.tap(find.text('Continuer la saisie'));
    await tester.pumpAndSettle();
    expect(find.text('Pending'), findsOneWidget);
    expect(repo.document.entities.length, 1);
  });
  testWidgets('parent choices exclude self, descendants and deleted records', (
    tester,
  ) async {
    final repo = PathRepository(MemoryStorage());
    await repo.load();
    await repo.createEntity(
      commandId: 'root',
      id: 'root',
      type: 'goal',
      title: 'Root',
    );
    await repo.createEntity(
      commandId: 'child',
      id: 'child',
      type: 'goal',
      title: 'Child',
      parentId: 'root',
    );
    await repo.createEntity(
      commandId: 'other',
      id: 'other',
      type: 'dream',
      title: 'Other',
    );
    await repo.createEntity(
      commandId: 'gone',
      id: 'gone',
      type: 'dream',
      title: 'Gone',
    );
    await repo.deleteEntity(commandId: 'delete', entityId: 'gone');
    await tester.pumpWidget(DreamGlowsApp(repository: repo));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Root'));
    await tester.pumpAndSettle();
    final selector = find.widgetWithText(
      DropdownButtonFormField<String>,
      'Parent compatible',
    );
    await tester.ensureVisible(selector);
    await tester.tap(selector);
    await tester.pumpAndSettle();
    expect(find.text('Other'), findsAtLeastNWidgets(2));
    expect(
      find.text('Root'),
      findsNWidgets(2),
    ); // list and title field, never an option
    expect(find.text('Child'), findsOneWidget);
    expect(find.text('Gone'), findsNothing);
    await tester.tap(find.text('Other').last);
    await tester.pumpAndSettle();
    final apply = find.widgetWithText(OutlinedButton, 'Appliquer le parent');
    await tester.ensureVisible(apply);
    await tester.tap(apply);
    await tester.pumpAndSettle();
    expect(repo.document.entities.first['parentId'], 'other');
  });
  test('UI relation types conform to canonical domain including nested actions and Focus', () async {
    final repo = PathRepository(MemoryStorage());
    await repo.load();
    for (final type in entityLabels.keys) {
      await repo.createEntity(
        commandId: 'seed-$type',
        id: type,
        type: type,
        title: type,
      );
    }
    await repo.startFocusSession(
      commandId: 'focus',
      id: 'focus-session',
      actionId: 'action',
      mode: 'focus',
    );
    for (final child in entityLabels.keys) {
      for (final parent in [...entityLabels.keys, 'focus-session']) {
        final operation = repo.createEntity(
          commandId: '$child-$parent',
          type: child,
          title: 'test',
          parentId: parent,
        );
        if (compatibleParents[child]?.contains(parent) ?? false) {
          await operation;
        } else {
          await expectLater(operation, throwsA(isA<PathCommandException>()));
        }
      }
    }
  });

  testWidgets('dedicated Focus lifecycle survives restart', (tester) async {
    final storage = MemoryStorage();
    final repo = PathRepository(storage);
    await repo.load();
    await repo.createEntity(
      commandId: 'action',
      id: 'action',
      type: 'action',
      title: 'Work',
    );
    await tester.pumpWidget(DreamGlowsApp(repository: repo));
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(ListTile, 'Work'));
    await tester.pumpAndSettle();
    final start = find.widgetWithText(OutlinedButton, 'Démarrer Focus');
    await tester.ensureVisible(start);
    await tester.tap(start);
    await tester.pumpAndSettle();
    expect(repo.document.entities.last['status'], 'in-progress');
    await click(tester, 'Terminer Focus');
    final restarted = PathRepository(storage);
    await restarted.load();
    expect(restarted.document.entities.last['status'], 'done');
    expect(restarted.document.entities.last['parentId'], 'action');
  });
  testWidgets('Focus refuses unsaved draft and delete cancellation keeps it', (
    tester,
  ) async {
    final repo = PathRepository(MemoryStorage());
    await repo.load();
    await repo.createEntity(
      commandId: 'action',
      id: 'action',
      type: 'action',
      title: 'Work',
    );
    await tester.pumpWidget(DreamGlowsApp(repository: repo));
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(ListTile, 'Work'));
    await tester.pumpAndSettle();
    await tester.enterText(input('Titre'), 'Pending');
    final start = find.widgetWithText(OutlinedButton, 'Démarrer Focus');
    await tester.ensureVisible(start);
    await tester.tap(start);
    await tester.pumpAndSettle();
    expect(repo.document.entities.length, 1);
    expect(find.textContaining('Enregistrez la saisie'), findsOneWidget);
    final remove = find.widgetWithText(TextButton, 'Supprimer');
    await tester.ensureVisible(remove);
    await tester.tap(remove);
    await tester.pumpAndSettle();
    await tester.tap(find.text('Annuler'));
    await tester.pumpAndSettle();
    expect(find.text('Pending'), findsOneWidget);
    expect(repo.document.entities.single['deletedAt'], isNull);
  });

  testWidgets(
    'factual entities omit scheduling and completion, action retains commands',
    (tester) async {
      final repo = PathRepository(MemoryStorage());
      await repo.load();
      for (final type in ['evidence', 'reflection', 'action', 'dream']) {
        await repo.createEntity(commandId: type, type: type, title: type);
      }
      await tester.pumpWidget(DreamGlowsApp(repository: repo));
      await tester.pumpAndSettle();
      for (final type in ['evidence', 'reflection', 'action', 'dream']) {
        final row = find.widgetWithText(ListTile, type);
        await tester.ensureVisible(row);
        await tester.tap(row);
        await tester.pumpAndSettle();
        final factual = ['evidence', 'reflection'].contains(type);
        expect(
          find.text('Planifier / replanifier'),
          factual ? findsNothing : findsOneWidget,
        );
        expect(find.text('Accomplir'), factual ? findsNothing : findsOneWidget);
      }
    },
  );
}
