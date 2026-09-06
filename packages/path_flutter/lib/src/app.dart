import 'dart:io';

import 'package:flutter/material.dart';
import 'package:path_core_dart/path_core_dart.dart';
import 'package:path_provider/path_provider.dart';

import 'file_path_storage.dart';
import 'theme.dart';

const entityLabels = {
  'dream': 'Rêve',
  'goal': 'Objectif',
  'milestone': 'Jalon',
  'action': 'Action',
  'habit': 'Habitude',
  'evidence': 'Preuve',
  'reflection': 'Réflexion',
};
const compatibleParents = <String, Set<String>>{
  'goal': {'dream', 'goal'},
  'milestone': {'goal'},
  'action': {'goal', 'milestone', 'action'},
  'habit': {'goal'},
  'evidence': {
    'dream',
    'goal',
    'milestone',
    'action',
    'habit',
    'focus-session',
  },
  'reflection': {
    'dream',
    'goal',
    'milestone',
    'action',
    'habit',
    'focus-session',
  },
};

class DreamGlowsApp extends StatelessWidget {
  const DreamGlowsApp({super.key, this.repository});
  final PathRepository? repository;
  @override
  Widget build(BuildContext context) => MaterialApp(
    title: 'DreamGlows',
    theme: PathTheme.material,
    darkTheme: PathTheme.dark,
    themeMode: ThemeMode.system,
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
  PathRepository? repo;
  final title = TextEditingController(),
      description = TextEditingController(),
      why = TextEditingController(),
      date = TextEditingController();
  String type = 'dream', parent = '', mode = 'focus';
  String? selectedId, message;
  bool busy = true;
  int sequence = 0;
  @override
  void initState() {
    super.initState();
    load();
  }

  Future<void> load() async {
    setState(() => busy = true);
    try {
      final value =
          widget.repository ??
          PathRepository(
            FilePathStorage(
              File(
                '${(await getApplicationSupportDirectory()).path}${Platform.pathSeparator}path.v1.json',
              ),
            ),
          );
      await value.load();
      if (mounted) {
        setState(() {
          repo = value;
          busy = false;
          message = value.recoveredLegacyPlanning
              ? 'Ancienne planification conservée dans l’historique.'
              : null;
        });
      }
    } catch (error) {
      if (mounted) {
        setState(() {
          busy = false;
          message = 'Chargement impossible : $error';
        });
      }
    }
  }

  String command() => '${DateTime.now().microsecondsSinceEpoch}-${sequence++}';
  List<Map<String, dynamic>> get entities =>
      repo == null ? [] : livingEntities(repo!.document);
  Map<String, dynamic>? get current {
    for (final e in entities) {
      if (e['id'] == selectedId) return e;
    }
    return null;
  }

  bool get hasDraft {
    final e = current;
    return title.text != (e?['title'] ?? '') ||
        description.text != (e?['description'] ?? '') ||
        why.text != (e?['why'] ?? '') ||
        parent != (e?['parentId'] ?? '') ||
        date.text != ((e?['planned'] as Map?)?['start'] ?? '');
  }

  Future<void> select(
    Map<String, dynamic>? entity, {
    bool force = false,
  }) async {
    if (!force && hasDraft) {
      final discard = await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('Saisie non enregistrée'),
          content: const Text(
            'Abandonner la saisie avant de changer d’élément ?',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Continuer la saisie'),
            ),
            TextButton(
              onPressed: () => Navigator.pop(context, true),
              child: const Text('Abandonner'),
            ),
          ],
        ),
      );
      if (discard != true || !mounted) return;
    }

    setState(() {
      selectedId = entity?['id'] as String?;
      type = entity?['type'] as String? ?? 'dream';
      title.text = entity?['title'] as String? ?? '';
      description.text = entity?['description'] as String? ?? '';
      why.text = entity?['why'] as String? ?? '';
      date.text = (entity?['planned'] as Map?)?['start'] as String? ?? '';
      parent = entity?['parentId'] as String? ?? '';
      message = null;
    });
  }

  Future<void> run(Future<void> Function(PathRepository) action) async {
    if (busy || repo == null) return;
    setState(() {
      busy = true;
      message = null;
    });
    try {
      await action(repo!);
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
          message = 'Échec : $error. Votre saisie est conservée ; réessayez.';
        });
      }
    }
  }

  Future<void> save() => run((r) async {
    if (selectedId == null) {
      final e = await r.createEntity(
        commandId: command(),
        type: type,
        title: title.text,
        description: description.text,
        why: why.text,
        parentId: parent.isEmpty ? null : parent,
      );
      selectedId = e['id'] as String;
    } else {
      final e = current!;
      final patch = <String, dynamic>{};
      for (final entry in {
        'title': title.text,
        'description': description.text,
        'why': why.text,
      }.entries) {
        if ((e[entry.key] ?? '') != entry.value) patch[entry.key] = entry.value;
      }
      if (patch.isNotEmpty) {
        await r.updateEntity(
          commandId: command(),
          entityId: selectedId!,
          patch: patch,
        );
      }
    }
  });
  List<Map<String, dynamic>> get parents {
    final blocked = <String>{?selectedId};
    bool changed = true;
    while (changed) {
      changed = false;
      for (final e in entities) {
        if (blocked.contains(e['parentId']) && blocked.add(e['id'] as String)) {
          changed = true;
        }
      }
    }
    return entities
        .where(
          (e) =>
              !blocked.contains(e['id']) &&
              (compatibleParents[type]?.contains(e['type']) ?? false),
        )
        .toList();
  }

  Widget field(
    String label,
    TextEditingController controller, {
    int lines = 1,
  }) => Padding(
    padding: const EdgeInsets.only(bottom: PathTheme.gap),
    child: TextField(
      controller: controller,
      enabled: !busy,
      maxLines: lines,
      decoration: InputDecoration(
        labelText: label,
        border: const OutlineInputBorder(),
      ),
      onSubmitted: lines == 1
          ? (_) => controller == date
                ? run((r) async {
                    await r.plan(
                      commandId: command(),
                      entityId: selectedId!,
                      date: date.text,
                    );
                  })
                : save()
          : null,
    ),
  );
  Widget editor() {
    final e = current, options = parents;
    final displayedParent = options.any((e) => e['id'] == parent) ? parent : '';
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          selectedId == null ? 'Créer' : 'Détail',
          style: Theme.of(context).textTheme.headlineSmall,
        ),
        if (selectedId == null)
          DropdownButtonFormField<String>(
            initialValue: type,
            isExpanded: true,
            decoration: const InputDecoration(labelText: 'Type'),
            items: entityLabels.entries
                .map(
                  (e) => DropdownMenuItem(value: e.key, child: Text(e.value)),
                )
                .toList(),
            onChanged: busy
                ? null
                : (v) => setState(() {
                    type = v!;
                    parent = '';
                  }),
          ),
        if (e != null)
          Text('${entityLabels[type] ?? 'Focus'} · ${e['status']}'),
        field('Titre', title),
        field('Description', description, lines: 3),
        field('Pourquoi', why, lines: 2),
        FilledButton(
          onPressed: busy ? null : save,
          child: Text(selectedId == null ? 'Créer' : 'Enregistrer'),
        ),
        if (type != 'focus-session') ...[
          DropdownButtonFormField<String>(
            key: ValueKey('$selectedId-$type-$displayedParent'),
            initialValue: displayedParent,
            isExpanded: true,
            decoration: const InputDecoration(labelText: 'Parent compatible'),
            items: [
              const DropdownMenuItem(value: '', child: Text('Sans parent')),
              ...options.map(
                (e) => DropdownMenuItem(
                  value: e['id'] as String,
                  child: Text(
                    e['title'] as String,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ),
            ],
            onChanged: busy ? null : (v) => setState(() => parent = v!),
          ),
          if (parent.isNotEmpty && displayedParent.isEmpty)
            const Text(
              'Parent historique indisponible ; conservé tant que vous ne changez pas la relation.',
            ),
          if (e != null)
            OutlinedButton(
              onPressed: busy
                  ? null
                  : () => run((r) async {
                      await r.reparent(
                        commandId: command(),
                        entityId: selectedId!,
                        parentId: parent.isEmpty ? null : parent,
                      );
                    }),
              child: const Text('Appliquer le parent'),
            ),
        ],
        if (e != null) ...[
          const SizedBox(height: PathTheme.gap),
          if (!const {'evidence', 'reflection'}.contains(type)) ...[
            field('Date (AAAA-MM-JJ)', date),
            OutlinedButton(
              onPressed: busy
                  ? null
                  : () => run((r) async {
                      await r.plan(
                        commandId: command(),
                        entityId: selectedId!,
                        date: date.text,
                      );
                    }),
              child: const Text('Planifier / replanifier'),
            ),
          ],
          if (!const {
                'focus-session',
                'evidence',
                'reflection',
              }.contains(type) &&
              const {'todo', 'in-progress', 'done'}.contains(e['status']))
            OutlinedButton(
              onPressed: busy
                  ? null
                  : () => run((r) async {
                      if (e['status'] == 'done') {
                        await r.reopen(
                          commandId: command(),
                          entityId: selectedId!,
                        );
                      } else {
                        await r.complete(
                          commandId: command(),
                          entityId: selectedId!,
                        );
                      }
                    }),
              child: Text(e['status'] == 'done' ? 'Rouvrir' : 'Accomplir'),
            ),
          if (type == 'action') ...[
            DropdownButtonFormField<String>(
              initialValue: mode,
              decoration: const InputDecoration(labelText: 'Mode Focus'),
              items: const [
                DropdownMenuItem(value: 'focus', child: Text('Focus')),
                DropdownMenuItem(value: 'creation', child: Text('Création')),
                DropdownMenuItem(
                  value: 'administration',
                  child: Text('Administration'),
                ),
              ],
              onChanged: busy ? null : (v) => setState(() => mode = v!),
            ),
            OutlinedButton(
              onPressed: busy
                  ? null
                  : () => run((r) async {
                      if (hasDraft) {
                        throw StateError(
                          'Enregistrez la saisie avant de démarrer Focus',
                        );
                      }
                      final focus = await r.startFocusSession(
                        commandId: command(),
                        actionId: selectedId!,
                        mode: mode,
                      );
                      await select(focus, force: true);
                    }),
              child: const Text('Démarrer Focus'),
            ),
          ],
          if (type == 'focus-session' && e['status'] == 'in-progress') ...[
            FilledButton(
              onPressed: busy
                  ? null
                  : () => run((r) async {
                      await r.endFocusSession(
                        commandId: command(),
                        entityId: selectedId!,
                        outcome: 'completed',
                      );
                    }),
              child: const Text('Terminer Focus'),
            ),
            OutlinedButton(
              onPressed: busy
                  ? null
                  : () => run((r) async {
                      await r.endFocusSession(
                        commandId: command(),
                        entityId: selectedId!,
                        outcome: 'interrupted',
                      );
                    }),
              child: const Text('Interrompre Focus'),
            ),
          ],
          if (entities.any((child) => child['parentId'] == selectedId))
            const Text(
              'Déplacez ou supprimez les enfants avant de supprimer cet élément.',
            )
          else
            TextButton(
              onPressed: busy ? null : deleteSelected,
              child: const Text('Supprimer'),
            ),
        ],
      ],
    );
  }

  Future<void> deleteSelected() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Supprimer cet élément ?'),
        content: Text(
          hasDraft
              ? 'L’élément sera retiré du Chemin et la saisie non enregistrée sera abandonnée. Son historique sera conservé.'
              : 'L’élément sera retiré du Chemin. Son historique sera conservé.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Annuler'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Confirmer la suppression'),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;
    await run((r) async {
      await r.deleteEntity(commandId: command(), entityId: selectedId!);
      await select(null, force: true);
    });
  }

  Widget overview() => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: [
      Text(
        'Prochaine action',
        style: Theme.of(context).textTheme.headlineSmall,
      ),
      Text(
        nextAction(repo!.document)?['title'] as String? ??
            'Aucune action disponible',
      ),
      TextButton(
        onPressed: busy ? null : () => select(null),
        child: const Text('Nouvel élément'),
      ),
      Text('Chemin', style: Theme.of(context).textTheme.headlineSmall),
      ...entities.map(
        (e) => ListTile(
          selected: e['id'] == selectedId,
          title: Text(e['title'] as String),
          subtitle: Text(
            '${entityLabels[e['type']] ?? 'Focus'} · ${e['status']}',
          ),
          onTap: busy ? null : () => select(e),
        ),
      ),
      ExpansionTile(
        title: const Text('Histoire durable'),
        children: durableHistory(repo!.document)
            .map(
              (event) => ListTile(
                title: Text(event['type'] as String),
                subtitle: Text(event['occurredAt'] as String),
              ),
            )
            .toList(),
      ),
    ],
  );
  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('DreamGlows — Chemin')),
    body: SafeArea(
      child: repo == null
          ? Center(
              child: busy
                  ? const CircularProgressIndicator()
                  : Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(message ?? 'Document indisponible'),
                        FilledButton(
                          onPressed: load,
                          child: const Text('Réessayer'),
                        ),
                      ],
                    ),
            )
          : Column(
              children: [
                if (busy) const LinearProgressIndicator(),
                if (message != null)
                  Padding(
                    padding: const EdgeInsets.all(PathTheme.gap),
                    child: Semantics(liveRegion: true, child: Text(message!)),
                  ),
                Expanded(
                  child: LayoutBuilder(
                    builder: (context, size) {
                      if (size.maxWidth < PathTheme.wide) {
                        return ListView(
                          padding: const EdgeInsets.all(PathTheme.padding),
                          children: [overview(), const Divider(), editor()],
                        );
                      }
                      return Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Expanded(
                            child: SingleChildScrollView(
                              padding: const EdgeInsets.all(PathTheme.padding),
                              child: overview(),
                            ),
                          ),
                          const VerticalDivider(),
                          Expanded(
                            child: SingleChildScrollView(
                              padding: const EdgeInsets.all(PathTheme.padding),
                              child: editor(),
                            ),
                          ),
                        ],
                      );
                    },
                  ),
                ),
              ],
            ),
    ),
  );
  @override
  void dispose() {
    for (final c in [title, description, why, date]) {
      c.dispose();
    }
    super.dispose();
  }
}
