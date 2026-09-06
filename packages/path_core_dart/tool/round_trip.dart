import 'dart:io';
import 'dart:convert';

import 'package:path_core_dart/path_core_dart.dart';

class BufferStorage implements PathStorage {
  BufferStorage(this.contents);
  String contents;
  @override
  Future<String?> read() async => contents;
  @override
  Future<void> write(String value) async {
    contents = value;
  }
}

Future<void> main(List<String> args) async {
  if (args.length < 2)
    throw ArgumentError(
      'Usage: dart run tool/round_trip.dart <file or -> <entity-id> [title] [why]',
    );
  final source = args[0] == '-'
      ? await stdin.transform(utf8.decoder).join()
      : await File(args[0]).readAsString();
  final storage = BufferStorage(source);
  final repository = PathRepository(
    storage,
    clock: () => DateTime.utc(2026, 9, 6, 12),
  );
  await repository.load();
  await repository.execute({
    'type': 'update-entity',
    'commandId': 'dart-conformance-edit',
    'entityId': args[1],
    'patch': {
      'title': args.length > 2 ? args[2] : 'Modified in Dart',
      'why': args.length > 3 ? args[3] : 'Shared meaning retained',
    },
  });
  stdout.write(storage.contents);
}
