---
artifact: spec
metadata_schema_version: "1.0"
artifact_version: "1.0.0"
project: DreamGlows
created: "2026-09-03"
updated: "2026-09-03"
status: implementing
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
  - "Convex is a future adapter and must not become a domain dependency."
next_step: "Complete the shared-core extraction and implement recoverable local Windows persistence."
---

# Spec: DreamGlows Windows Path adoption

## Status

implementing

## Objective

Deliver the smallest local Windows path that loads, plans, replans, completes, reopens, displays durable facts, and reloads one canonical Chemin document without duplicating business logic.

## Scope In

- Technology-agnostic TypeScript Path package shared by Obsidian and Windows.
- Client-owned adapters for Obsidian, recoverable local Windows persistence, and a future Convex boundary.
- Functional Windows UI for overview, next action, planning, completion, reopening, history, and persistence feedback.
- Cross-client fixtures and tests proving document identity and failure behavior.
- Mapped technical and setup documentation.

## Scope Out

- Convex implementation, identity, remote synchronization, conflict resolution, encryption, SaaS, and bidirectional Obsidian sync.
- Visual polish, graphical timelines, `vis-timeline`, gamification, AI planning, and complete Obsidian parity.
- Personal Obsidian vault access and unrelated legacy TypeScript debt.

## Architecture

- `@dreamglows/path-core` owns the canonical schema, validation, migrations, commands, events, projections, statistics, and persistence coordination.
- The core imports no UI framework, host SDK, storage runtime, or provider SDK.
- Each client owns its adapter and updates visible state only after a successful durable write.
- Convex may consume the same package later through a separately specified synchronization adapter.

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

1. Extract and prove the shared TypeScript core while keeping Obsidian green.
2. Implement atomic, recoverable local Windows persistence and restart tests.
3. Build the functional Windows vertical slice with minimal presentation.
4. Prove cross-client fixtures, error behavior, accessibility, and production build.
5. Align documentation, register the Windows artifact, and deliver exact-scope Git history.

## Acceptance Criteria

- [x] One shared package owns all canonical business behavior.
- [x] Obsidian tests and build pass against the shared package.
- [x] Windows persists and reloads the canonical document atomically.
- [ ] The same fixture retains identifiers, relations, periods, states, and events in both clients.
- [ ] The Windows vertical slice covers next action, planning, completion, reopening, history, and restart.
- [x] Corrupt input and failed writes preserve recoverable durable state.
- [ ] Essential interactions have keyboard or form equivalents.
- [ ] Convex and client technologies remain outside the domain package.

## Execution Batches

| Batch | Scope | Dependency | Proof |
| --- | --- | --- | --- |
| 1 | Shared core and Obsidian adapter | Existing canonical Chemin | Core typecheck, boundary tests, Obsidian tests/build |
| 2 | Windows local persistence | Batch 1 | Atomicity, backup, corruption, restart tests |
| 3 | Functional Windows journey | Batch 2 | Vertical-slice and accessibility tests |
| 4 | Documentation and artifact proof | Batches 1-3 | Mapped docs, Windows build, registered artifact |

## Current Chantier Flow

- Specification: ready and approved by the operator.
- Implementation: batches 1 and 2 complete; batch 3 is next.
- Verification: shared-core checks, 124 Obsidian tests/build, and Windows local-persistence restart/recovery tests pass.
- Delivery: pending exact-scope proof.

## Skill Run History

| Date UTC | Skill | Model | Action | Result | Next step |
| --- | --- | --- | --- | --- | --- |
| 2026-09-03 | sg-development | GPT-5 Codex | Formalize approved backend-first Windows adoption and extract the canonical TypeScript core. | Batch 1 passed: core typecheck 2/2 boundary tests, Obsidian 124/124 tests, and production build. | Deliver batch 1 exact-scope, then implement Windows local persistence. |
| 2026-09-03 | sg-development | GPT-5 Codex | Add Windows-local atomic JSON persistence, durable previous-copy backup, explicit recovery, and restart behavior. | Batch 2 implemented; Windows typecheck and recovery tests pass. | Deliver batch 2 exact-scope, then build the functional journey. |
