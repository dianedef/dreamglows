import 'dart:io';

import 'path_repository.dart';

class FilePathStorage implements PathStorage {
  FilePathStorage(this.file);
  final File file;
  File get backup => File('${file.path}.backup');
  File get temporary => File('${file.path}.tmp');

  @override
  Future<String?> read() async {
    if (await file.exists()) return file.readAsString();
    if (await backup.exists()) return backup.readAsString();
    return null;
  }

  @override
  Future<void> write(String contents) async {
    await file.parent.create(recursive: true);
    final sink = temporary.openWrite(mode: FileMode.writeOnly);
    sink.write(contents);
    await sink.flush();
    await sink.close();
    if (await file.exists()) await file.copy(backup.path);
    await temporary.rename(file.path);
  }

  Future<void> restoreBackup() async {
    if (!await backup.exists()) {
      throw StateError('Aucune sauvegarde Chemin disponible.');
    }
    await backup.copy(file.path);
  }
}
