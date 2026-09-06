# Shared Dart Chemin core

Pure Dart document validation, durable commands and projections; Windows imports this package through compatibility exports. It has no Flutter or filesystem dependency. Android may use a path dependency when its application is implemented.

Run `dart pub get`, `dart test` and `dart analyze` here. Tests consume shared TypeScript JSON fixtures. `dart run tool/round_trip.dart <document.json> <entity-id> [title] [why]` emits the complete modified document to stdout without changing the input file.

`execute(Map<String,dynamic>)` accepts the TypeScript command-port JSON request shapes: create/update/delete, complete/reopen/reparent, schedule/reschedule/resize and dedicated start/end Focus. Named methods remain available; Windows `plan(date)` is a compatibility method. Exact command requests survive persistence and are replayable across surfaces. Historical events with sufficient recorded intent or unambiguous event fields are recognized; ambiguous requests fail closed.

Commands preserve unknown fields, retain tombstones, require live compatible parent writes, and serialize writes inside one repository instance. Returned documents are detached snapshots. Storage adapters remain responsible for inter-process concurrency. Failed writes do not publish state.

Strict document decoding rejects malformed periods. Repository loading additionally recognizes the historical Obsidian v1 goal/task migration provenance (`extensions.legacy.kind` and `fields`) and moves an invalid period losslessly to `extensions.legacy.invalidPlanned`. Colliding historical data fails closed. This recovery sets `recoveredLegacyPlanning`, performs no write during load, and is persisted with the next successful command. Arbitrary malformed documents are not repaired.
