import 'dart:io';

import 'package:flutter/material.dart';
import 'package:path_provider/path_provider.dart';

import 'path/file_path_storage.dart';
import 'path/path_projection.dart';
import 'path/path_repository.dart';

void main() => runApp(const DreamGlowsApp());

class DreamGlowsApp extends StatelessWidget {
  const DreamGlowsApp({super.key, this.repository});
  final PathRepository? repository;
  @override
  Widget build(BuildContext context) => MaterialApp(
    title: 'DreamGlows',
    theme: ThemeData(
      colorScheme: ColorScheme.fromSeed(seedColor: Colors.indigo),
    ),
    home: PathHome(repository: repository),
  );
}

class PathHome extends StatefulWidget {
  const PathHome({super.key, this.repository});
  final PathRepository? repository;
  @override
  State<PathHome> createState() => _PathHomeState();
}

class _PathHomeState extends State<PathHome> {
  PathRepository? repository;
  final title = TextEditingController(), date = TextEditingController();
  String type = 'goal';
  String? selectedId, message;
  bool busy = true;
  @override
  void initState() {
    super.initState();
    load();
  }

  Future<void> load() async {
    try {
      final repo =
          widget.repository ??
          PathRepository(
            FilePathStorage(
              File(
                '${(await getApplicationSupportDirectory()).path}${Platform.pathSeparator}path.v1.json',
              ),
            ),
          );
      await repo.load();
      if (mounted) {
        setState(() {
          repository = repo;
          busy = false;
        });
      }
    } catch (error) {
      if (mounted) {
        setState(() {
          message = 'Chargement impossible : $error';
          busy = false;
        });
      }
    }
  }

  String command(String name) =>
      '$name-${DateTime.now().microsecondsSinceEpoch}';
  Map<String, dynamic>? get selected {
    for (final entity
        in repository?.document.entities ?? const <Map<String, dynamic>>[]) {
      if (entity['id'] == selectedId) return entity;
    }
    return null;
  }

  Future<void> run(Future<void> Function(PathRepository) action) async {
    final repo = repository;
    if (repo == null || busy) return;
    setState(() {
      busy = true;
      message = null;
    });
    try {
      await action(repo);
      if (mounted) {
        setState(() {
          busy = false;
          message = 'Enregistré';
        });
      }
    } catch (error) {
      if (mounted) {
        setState(() {
          busy = false;
          message = 'Échec : $error';
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (busy && repository == null) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    if (repository == null) {
      return Scaffold(
        body: Center(child: Text(message ?? 'Document indisponible')),
      );
    }
    final document = repository!.document,
        entities = livingEntities(document),
        next = nextAction(document),
        current = selected;
    return Scaffold(
      appBar: AppBar(title: const Text('DreamGlows — Chemin')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: ListView(
                children: [
                  Text(
                    'Prochaine action',
                    style: Theme.of(context).textTheme.headlineSmall,
                  ),
                  Text(
                    next?['title']?.toString() ?? 'Aucune action disponible',
                  ),
                  const SizedBox(height: 20),
                  Text(
                    'Créer',
                    style: Theme.of(context).textTheme.headlineSmall,
                  ),
                  TextField(
                    controller: title,
                    decoration: const InputDecoration(labelText: 'Titre'),
                    onSubmitted: (_) => create(),
                  ),
                  DropdownButtonFormField<String>(
                    initialValue: type,
                    decoration: const InputDecoration(labelText: 'Type'),
                    items: const [
                      DropdownMenuItem(value: 'goal', child: Text('Objectif')),
                      DropdownMenuItem(value: 'action', child: Text('Action')),
                    ],
                    onChanged: (value) => setState(() => type = value!),
                  ),
                  FilledButton(
                    onPressed: busy ? null : create,
                    child: const Text('Créer'),
                  ),
                  const SizedBox(height: 20),
                  Text(
                    'Chemin',
                    style: Theme.of(context).textTheme.headlineSmall,
                  ),
                  ...entities.map(
                    (entity) => ListTile(
                      selected: entity['id'] == selectedId,
                      title: Text(entity['title'] as String),
                      subtitle: Text('${entity['type']} · ${entity['status']}'),
                      onTap: () =>
                          setState(() => selectedId = entity['id'] as String),
                    ),
                  ),
                ],
              ),
            ),
            const VerticalDivider(),
            Expanded(
              child: ListView(
                children: [
                  Text(
                    'Détail',
                    style: Theme.of(context).textTheme.headlineSmall,
                  ),
                  if (current == null)
                    const Text('Sélectionnez un élément du Chemin.'),
                  if (current != null) ...[
                    Text(current['title'] as String),
                    Text('État : ${current['status']}'),
                    Text(
                      'Planifié : ${(current['planned'] as Map?)?['start'] ?? 'non'}',
                    ),
                    TextField(
                      controller: date,
                      decoration: const InputDecoration(
                        labelText: 'Date (AAAA-MM-JJ)',
                      ),
                      onSubmitted: (_) => plan(),
                    ),
                    FilledButton(
                      onPressed: busy ? null : plan,
                      child: const Text('Planifier / replanifier'),
                    ),
                    if (current['status'] == 'done')
                      OutlinedButton(
                        onPressed: busy ? null : reopen,
                        child: const Text('Rouvrir'),
                      )
                    else
                      OutlinedButton(
                        onPressed: busy ? null : complete,
                        child: const Text('Accomplir'),
                      ),
                  ],
                  if (message != null)
                    Semantics(liveRegion: true, child: Text(message!)),
                  const SizedBox(height: 24),
                  Text(
                    'Histoire durable',
                    style: Theme.of(context).textTheme.headlineSmall,
                  ),
                  ...durableHistory(document).map(
                    (event) => ListTile(
                      dense: true,
                      title: Text(event['type'] as String),
                      subtitle: Text(event['occurredAt'] as String),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> create() => run((repo) async {
    final parent = type == 'action' && selected?['type'] == 'goal'
        ? selectedId
        : null;
    final entity = await repo.createEntity(
      commandId: command('create'),
      type: type,
      title: title.text,
      parentId: parent,
    );
    title.clear();
    selectedId = entity['id'] as String;
  });
  Future<void> plan() => run(
    (repo) async => repo.plan(
      commandId: command('plan'),
      entityId: selectedId!,
      date: date.text,
    ),
  );
  Future<void> complete() => run(
    (repo) async =>
        repo.complete(commandId: command('complete'), entityId: selectedId!),
  );
  Future<void> reopen() => run(
    (repo) async =>
        repo.reopen(commandId: command('reopen'), entityId: selectedId!),
  );
  @override
  void dispose() {
    title.dispose();
    date.dispose();
    super.dispose();
  }
}
