# Shared Flutter surface

`import 'package:path_flutter/path_flutter.dart';` exposes `DreamGlowsApp(repository: optionalRepository)`, `PathHome`, `FilePathStorage` and the portable Dart domain.
Windows and Android use this single interface and local storage adapter; no Flutter application logic is copied into either host.

The Material interface follows the system light/dark theme, uses two columns on wide screens and one scrollable column on narrow screens. It creates all seven ordinary types, edits title/description/why without replacing unknown fields, selects compatible live parents excluding self/descendants, plans dates and completes/reopens canonical schedulable types (evidence/reflection keep factual semantics), guards deletion with live children and starts/ends Focus through dedicated commands. Parent changes have a separate explicit commit button. Unsaved navigation asks before discarding; failed writes retain input and permit retry. Durable history remains viewable.

Data stays in the platform application-support directory as `path.v1.json`; temporary writes and a previous-file backup are shared. One repository instance serializes writes. Multi-process locking, remote sync, identity services and a recovery UI for a corrupt primary document are outside this package.

Validation: `flutter analyze` and `flutter test` in this directory. Tests inject storage, proving failure/retry, restart retention, narrow keyboard input, relation filtering and draft protection. Native host proof is recorded separately by the integrating task.
