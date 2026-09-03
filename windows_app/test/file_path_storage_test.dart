import 'dart:io';

import 'package:dreamglows_windows/path/file_path_storage.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('conserve et restaure la version précédente', () async {
    final directory = await Directory.systemTemp.createTemp('dreamglows-path-');
    addTearDown(() => directory.delete(recursive: true));
    final storage = FilePathStorage(
      File('${directory.path}${Platform.pathSeparator}path.json'),
    );
    await storage.write('one');
    await storage.write('two');
    expect(await storage.read(), 'two');
    expect(await storage.backup.readAsString(), 'one');
    await storage.restoreBackup();
    expect(await storage.read(), 'one');
  });

  test('charge la sauvegarde si le principal manque', () async {
    final directory = await Directory.systemTemp.createTemp('dreamglows-path-');
    addTearDown(() => directory.delete(recursive: true));
    final storage = FilePathStorage(
      File('${directory.path}${Platform.pathSeparator}path.json'),
    );
    await storage.backup.writeAsString('recoverable');
    expect(await storage.read(), 'recoverable');
  });
}
