---
artifact: spec
metadata_schema_version: "1.0"
artifact_version: "2.0.0"
project: DreamGlows
created: "2026-09-03"
updated: "2026-09-03"
status: completed
user_story: "As a DreamGlows user, I want Windows to load and update the same canonical Chemin document as Obsidian so that my path, next action, planning, accomplishments, and history remain coherent after restart."
source_skill: sg-development
source_model: GPT-5 Codex
scope: windows-path-adoption
owner: Diane
confidence: high
risk_level: high
security_impact: yes
docs_impact: yes
linked_systems:
  - packages/path-core/
  - obsidian_plugin/src/domain/path/
  - windows_app/
  - shipglows_data/technical/obsidian-path-system.md
  - shipglows_data/technical/code-docs-map.md
depends_on:
  - dreamglows-unified-path-system
supersedes: []
evidence:
  - "The operator approved the Windows adoption plan and selected a technology-agnostic TypeScript core on 2026-09-03."
  - "The first Windows slice is backend-first; its UI must exercise the complete path but has no visual-design objective."
  - "The operator replaced the Node/Electron direction with Flutter for Windows and future mobile clients on 2026-09-03."
  - "The operator accepted one portable contract with conforming TypeScript and Dart implementations so Flutter remains fully offline-capable."
  - "Convex is the future TypeScript SaaS and synchronization authority, not a dependency of either local domain implementation."
next_step: "Specify the Convex identity, synchronization, conflict, and security protocol before adding remote continuity."
---

# Spec: DreamGlows Windows Path adoption

## Status

completed

## Objective

Deliver the smallest local Windows path that loads, plans, replans, completes, reopens, displays durable facts, and reloads one canonical Chemin document without duplicating business logic.

## Scope In

- Technology-agnostic TypeScript Path package shared by Obsidian and future Convex functions.
- A conforming Dart Path package shared by Flutter clients, with recoverable local persistence.
- Functional Windows UI for overview, next action, planning, completion, reopening, history, and persistence feedback.
- Cross-client fixtures and tests proving document identity and failure behavior.
- Mapped technical and setup documentation.

## Scope Out

- Convex implementation, identity, remote synchronization, conflict resolution, encryption, SaaS, and bidirectional Obsidian sync.
- Visual polish, graphical timelines, `vis-timeline`, gamification, AI planning, and complete Obsidian parity.
- Personal Obsidian vault access and unrelated legacy TypeScript debt.

## Architecture

- A language-neutral JSON contract and golden fixtures own interoperability.
- `@dreamglows/path-core` is the TypeScript implementation consumed by Obsidian and future Convex functions.
- Flutter clients consume a conforming Dart implementation for offline commands, projections, and persistence.
- Neither implementation imports UI frameworks, host SDKs, storage runtimes, or provider SDKs in its domain layer.
- Convex synchronization remains a later protocol with explicit identity, revisions, conflicts, tombstones, and security rules.

## Success Behavior

- Obsidian consumes the extracted package without behavioral regression.
- Windows reads and writes the same repository and envelope versions without destructive conversion.
- Stable identifiers, child-owned relations, planned periods, factual timestamps, tombstones, and append-only events survive reload.
- The functional Windows journey works with keyboard and forms without relying on visual polish.

## Error Behavior

- Unsupported, malformed, or corrupt documents fail closed and are never replaced by an empty document.
- Failed writes preserve the last durable document and cannot produce a false saved state.
- Replayed command IDs are accepted only for the exact same intent.
- Recovery preserves a previous valid local copy and exposes an actionable failure.

## Implementation Tasks

1. Preserve the extracted TypeScript core and formalize shared JSON fixtures.
2. Replace the Node Windows scaffold with Flutter and implement the conforming Dart domain.
3. Implement atomic, recoverable Flutter-local persistence and restart tests.
4. Build the functional Windows vertical slice with minimal presentation.
5. Prove cross-language fixtures, error behavior, accessibility, and production build.
6. Align documentation, register the Windows artifact, and deliver exact-scope Git history.

## Acceptance Criteria

- [x] One shared package owns all canonical business behavior.
- [x] Obsidian tests and build pass against the shared package.
- [x] Flutter Windows persists and reloads the canonical document atomically.
- [x] The same fixture retains identifiers, relations, periods, states, and events in both clients.
- [x] The Windows vertical slice covers next action, planning, completion, reopening, history, and restart.
- [x] Corrupt input and failed writes preserve recoverable durable state in Flutter.
- [x] Essential interactions have keyboard or form equivalents.
- [x] Convex and client technologies remain outside the domain package.

## Execution Batches

| Batch | Scope | Dependency | Proof |
| --- | --- | --- | --- |
| 1 | Shared core and Obsidian adapter | Existing canonical Chemin | Core typecheck, boundary tests, Obsidian tests/build |
| 2 | Flutter scaffold, Dart domain, shared fixtures | Batch 1 | Dart analysis and cross-language fixture tests |
| 3 | Flutter local persistence | Batch 2 | Atomicity, backup, corruption, restart tests |
| 4 | Functional Windows journey | Batch 3 | Vertical-slice, widget, and accessibility tests |
| 5 | Documentation and artifact proof | Batches 1-4 | Mapped docs, Windows build, registered artifact |

## Current Chantier Flow

- Specification: ready and approved by the operator.
- Implementation: TypeScript core and conforming Flutter/Dart Windows vertical slice complete.
- Verification: TypeScript shared-fixture checks, Flutter analysis/tests, managed Windows runtime, and Windows release build passed.
- Delivery: local Windows artifact registered; exact-scope Git delivery pending.

## Skill Run History

| Date UTC | Skill | Model | Action | Result | Next step |
| --- | --- | --- | --- | --- | --- |
| 2026-09-03 | sg-development | GPT-5 Codex | Formalize approved backend-first Windows adoption and extract the canonical TypeScript core. | Batch 1 passed: core typecheck 2/2 boundary tests, Obsidian 124/124 tests, and production build. | Deliver batch 1 exact-scope, then implement Windows local persistence. |
| 2026-09-03 | sg-development | GPT-5 Codex | Add Windows-local atomic JSON persistence, durable previous-copy backup, explicit recovery, and restart behavior. | Batch 2 implemented; Windows typecheck and recovery tests pass. | Deliver batch 2 exact-scope, then build the functional journey. |
| 2026-09-03 | sg-development | GPT-5 Codex | Replace the Electron/Node direction with the operator-approved Flutter architecture. | Plan replaced; the Node adapter is superseded and retained in Git history only. | Build the Flutter scaffold and Dart conformance layer. |
| 2026-09-03 | sg-development | GPT-5 Codex | Implement the Flutter Windows vertical slice, canonical Dart conformance, recoverable persistence, and shared contract fixture. | Flutter analysis and 8 tests pass; TypeScript shared-document tests pass; managed Windows runtime and release build pass; local artifact registered. | Commit and push exact scope, then specify Convex synchronization separately. |
