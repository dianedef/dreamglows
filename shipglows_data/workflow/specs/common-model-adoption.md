---
artifact: spec
metadata_schema_version: "1.0"
artifact_version: "1.0.0"
project: DreamGlows
status: reviewed
user_story: "As a DreamGlows user I retain the same meaning, relationships and history across implemented surfaces."
created: "2026-09-06"
updated: "2026-09-06"
created_at: "2026-09-06"
updated_at: "2026-09-06"
source_model: GPT-6
source_skill: sg-development
scope: common-model-adoption
owner: Diane
confidence: high
risk_level: high
security_impact: yes
docs_impact: yes
linked_systems: [packages/path-core, packages/path_core_dart, chrome_extension, windows_app, obsidian_plugin]
depends_on: []
supersedes: []
evidence:
  - "Approved correction plan, shared fixtures, cross-language runner and isolated native/browser proofs."
next_step: prove-portable-edit-round-trip
---

# Common model adoption

## Outcome and authority
User approved the five correction steps after the read-only cross-surface audit.
As a user I retain the same dream, meaning, relationships and history when my
data is read or modified by any implemented DreamGlows surface.

## Contract
Keep repositoryVersion/schemaVersion 1 with additive optional `why: string` on
entities (meaning belongs to the dream). Existing fields and unknown JSON survive.
Create supports dream, goal, milestone, action, habit, evidence and reflection;
Focus keeps its dedicated lifecycle. Allow action beneath action to retain Chrome
subtasks, with cycle checks. Historical missing parents remain readable; new writes
require live compatible parents. Malformed identities/types/statuses/dates fail
before writes. Replayed commands never write twice; changed intent is refused.

Chrome migrates its nested tree into the canonical repository, preserves original
storage before the canonical commit, retains unknown node and view data, and uses
canonical data for subsequent persistence. No flattening of nested actions. A
failed migration leaves original data available; repeated migration is stable.
Dart shares a pure package across Windows and future Android. Android application
integration remains pending, since android_app is only a placeholder.

## Scope and ordered actions
1. Complete TypeScript contract and command coverage.
2. Extract/alignment of pure Dart document/repository with Windows compatibility exports.
3. Chrome migration, canonical persistence and loading integration.
4. Shared conformance cases, regression tests/builds, documentation of boundaries.
No remote sync, Obsidian bidirectional editing, new Android product UI, credentials,
personal vault/profile migration, or release packaging in this scope.

## Execution Batches
Integration owner: parent agent. Independent files, shared contract frozen above.
- Dart owner: packages/path_core_dart/**, windows_app/**, android_app/README.md.
- Chrome owner: chrome_extension/** (migration, service worker, editor and tests).
- Parent: packages/path-core/**, Obsidian integration/tests,
  root workspace metadata and shipglows_data/**.
The Dart owner reads TypeScript contracts, never edits them. Parent supplies shared
fixture location packages/path-core/fixtures/adoption-conformance-v1.json.

## Proof and readiness
Shared JSON fixtures test accepted and rejected documents in both languages.
Exercise create/update/delete/reparent/status/planning, replay and write failure;
compare preserved fields, relationships, revisions and events. Chrome synthetic
storage tests cover legacy backup, restart, failed commit, stale concurrent writes,
unknown fields and nested tasks. Run core, Obsidian and Chrome suites, Dart tests
and applicable compilation. Runtime proof is separately reported; no authentication
bypass or personal storage writes. No server is required for domain tests.

## Risks / ZOMBIES
Zero: empty storage initializes valid document. One/many: all types, nested nodes,
duplicate IDs rejected. Boundary: dates, safe integers, versions and cycles.
Interfaces: storage failures never silently replace source. Exceptions: corrupt
input fails closed. Security: local untrusted JSON, safe keys and no remote access.
Existing settings and secrets are preserved without being logged.

## Documentation
Update technical common-model documentation and task status with exact proved versus
pending scope. Do not mark global adoption complete while Android is unimplemented.

## Skill Run History
- 2026-09-06: specification authored from approved correction plan and live audit.
- 2026-09-06: readiness checked: bounded additive contract, migration retention,
  independent ownership and local proof paths resolved; ready for implementation.

## Current Chantier Flow
Both approved adoption batches are implemented and locally verified. Git delivery
is recorded by the commit containing this receipt. Next: portable edit round-trip.

## Approved continuation — shared Flutter and interface adoption

2026-09-06: user approved shared Windows/Android Flutter foundation and interface
completion after audit. Ready for implementation. Existing local-only operation
continues without identity services or protected remote data; no auth bypass.

Contract: create/edit the seven ordinary entity types, including title, description
and why; choose compatible parents; complete/reopen, plan, delete with live-child
guard, and use dedicated Focus start/end where appropriate. Hidden or unrepresented
fields survive edits. Errors preserve pending input and never imply a successful
save. Chrome remains a capture-oriented surface rather than a full planner.
Android is a local daily companion using the same widgets/domain as Windows with
single-column navigation on narrow screens. No remote sync, release, or cloud auth.

Execution Batches (non-overlapping, parent integrates):
- Flutter agent: packages/path_flutter/** and windows_app/**. Shared app export
  `DreamGlowsApp`, local storage adapter, adaptive forms and command tests.
- Chrome agent: chrome_extension/** only. All seven ordinary types and editable
  meaning/description/compatible relations, canonical persistence, browser proof.
- Obsidian agent: obsidian_plugin/src/** and obsidian_plugin/tests/** only. Generic
  creation/editing, why, allowed relations, lifecycle commands and focused proof.
- Parent: android_app/**, root workspace files, governance, native Android proof,
  final builds and integration review. Android imports path_flutter; no UI fork.

Proof: meaningful edit/restart persistence cases on each surface, unknown-field
retention, failure feedback, narrow screen and keyboard access, Flutter analysis
and tests, native Windows and managed Android emulator, browser and isolated vault.
Use existing theme primitives; Flutter semantic layout values live in shared theme.
Delivery: exact-scope commit and ordinary main push after proof; no public release.

### Continuation verification receipt

- 2026-09-06: approved continuation implemented and verified. Domain adoption is
  complete for the four implemented local surfaces; public journey/release and
  cross-device synchronization remain separate work.
- Chrome: 47 tests, typecheck, Chrome/Firefox builds passed. Isolated built Chrome
  proved seven-type capture, why/description/parent edit, reload, stale recovery,
  Enter button activation and Escape focus restoration. Receipt:
  `%TEMP%/dreamglows-canonical-proof-0xMmXP/result.json`; Firefox runtime untested.
- Obsidian: 134 tests and final production bundle passed. Final native isolated
  vault proved all seven creates, modification, guarded archive, exact document
  after process restart and unknown-field retention. Receipt:
  `%TEMP%/dreamglows-interface-adoption-final/report.json`. Existing unrelated global
  TypeScript errors remain outside this change; no new application/modal diagnostics.
- Shared Flutter: 9 behavior tests; Windows: 9 tests; Android: 1 narrow restoration
  test. Analyses clean in all three Flutter packages. Domain relation conformance,
  failure/retry, draft preservation, Focus and factual capabilities covered.
- Native Windows and Android: keyboard/touch create, why modification, real file
  save and exact document equality after managed process restart passed. Windows
  dark wide layout and Android light narrow layout visually inspected. Only the
  synthetic proof documents and their backups were removed after stopping apps.
  Receipts: `%TEMP%/dreamglows-windows-proof/report.json` and
  `%TEMP%/dreamglows-android-proof/report.json`.
- Android first launch lost the emulator before installation, then a transient
  DevServer registry lock rejected retry. Bounded retry succeeded; Android Gradle
  heap/workers are capped to leave memory for the emulator. Active target is
  `emulator-5554` (ShipGlows_API_36), logical `flutter run -d emulator-5554`.
- Windows logical command: `flutter run -d windows`. Both are managed debug runs,
  not public distribution. Authentication/service configuration: deliberately
  local-only, no existing auth bypass and no protected-access claim.
- Independent review corrected factual command visibility and Chrome Enter
  bubbling. No new authored raw style values; generated Obsidian CSS changes
  scoped hashes only. Shared Flutter dimensions live in its theme authority.
- Documentation/editorial: updated surface READMEs, capability status, model
  contract, design authority, code map and task tracker. Internal-only milestone.
  Three bounded agents, prepared parallel implementation plus independent review.

## Verification Receipt

- TypeScript: 36 tests, strict typecheck passed.
- Obsidian: 131 tests and production plugin build passed. Current authored bundle
  loaded in an isolated native Windows vault; export, preview, keyboard-confirmed
  import, full restart and byte-identical reexport passed with no diagnostics.
- Dart: 35 tests, including all 19 shared conformance documents; analysis clean.
- Windows: 9 Flutter tests and analysis clean. Managed Windows live session running,
  non-headless, logical `flutter run -d windows`; final hot reload succeeded. Native
  rendered empty state and all seven creation types visually checked via Computer
  Use. No personal data created. This is a debug session, not a release artifact.
- Real cross-language runner: 11 entities spanning all eight types, TypeScript
  creation -> Dart title/meaning mutation -> TypeScript reload/replay/mutation.
  All fields outside intended mutations compare equal; history, tombstones,
  historical orphans and unknown fields retained; Dart request replays without
  another TypeScript write.
- Independent review caught and corrected date-kind bounds, historical migration
  periods, DST civil arithmetic, title whitespace and concurrent active Focus.
- All personal Obsidian/Chrome profiles remain not-read. No authentication exists
  in these declared offline operations; no bypass or protected-access claim.
- UI command exposure remains partial and Android application integration pending,
  as explicitly bounded by the approved plan. Global open-domain-model stays open.
- Chrome: 39 tests, typecheck, Chrome and Firefox builds passed. Isolated built
  Chromium extension proved exact legacy backup, rendered hydration, title edit,
  awaited persistence, reload, nested actions, unknown fields and canonical history.
  Two concurrent editors proved refusal of stale revision, visible error and
  downloaded recovery containing pending edits. No Firefox runtime claim.
- Chrome proof receipt: `%TEMP%/dreamglows-canonical-proof-g3QQ41/result.json`.
  Obsidian final receipt: `%TEMP%/dreamglows-adoption-obsidian-final/report.json`.
- Changed-file visual drift: 100 findings already present at HEAD, no introduced
  findings after removing new raw recovery styles. Existing styling debt remains.
- Documentation: updated mapped package READMEs, common-model contract, capability
  status, technical navigation and tracker. No external API contract changed.
- Editorial: updated repository surface status; no new availability or release claim.
  Changelog: internal-only implementation milestone; no public release packaged.
