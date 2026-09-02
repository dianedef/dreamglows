---
artifact: technical_context
metadata_schema_version: "1.0"
artifact_version: "1.2.0"
project: DreamGlows
created: "2026-09-02"
updated: "2026-09-02"
status: active
source_skill: sg-docs
scope: obsidian-canonical-path-system
owner: Diane
confidence: high
risk_level: high
security_impact: yes
docs_impact: yes
linked_systems:
  - obsidian_plugin/src/domain/path/
  - obsidian_plugin/src/application/path-command-port.ts
  - obsidian_plugin/src/stores/pathStore.ts
  - obsidian_plugin/src/views/
  - obsidian_plugin/tests/path-*.test.mjs
  - shipglows_data/workflow/specs/dreamglows-unified-path-system.md
depends_on:
  - artifact: shipglows_data/technical/README.md
    artifact_version: "1.1.0"
    required_status: active
supersedes: []
evidence:
  - "Commit 465d337 contains the canonical implementation and generated Obsidian artifact."
  - "The focused Node suite passed 83/83 tests on 2026-09-02."
  - "Production build and disposable Obsidian Lab checks passed for Today, Week, Journey, and History without host diagnostics."
  - "The canonical dashboard selector passed 5 focused tests and the full 88-test suite; its empty state loaded in the disposable Obsidian Lab without diagnostics."
  - "The direct StorageService plugin-data writer and unreferenced parallel timeline/view paths were removed; 91/91 tests and a fresh disposable host proof passed."
next_review: "2026-10-02"
next_step: "Canonicalize dashboard projections, then remove duplicate legacy writers only after parity proof."
---

# Obsidian canonical Path system

## Purpose

Chemin is the single business source for planning, acting, reviewing, and preserving history in the Obsidian plugin. It separates planned time from actual facts and keeps legacy compatibility at the boundary.

## Architecture

| Layer | Primary entrypoints | Contract |
| --- | --- | --- |
| Domain | `src/domain/path/model.ts`, `legacy-v0.ts` | Versioned JSON-safe envelope; stable identities; unknown legacy data preserved in extensions; ambiguous input diagnosed rather than guessed |
| Persistence | `repository.ts`, `persistence-coordinator.ts`, `obsidian-adapter.ts` | One full-document repository, FIFO writes, optimistic revisions, explicit corruption/write failures |
| Commands | `commands.ts`, `command-port.ts`, `application/path-command-port.ts` | Idempotent commands; one durable event per accepted transition; exact-intent replay; persistence before UI synchronization |
| Read model | `projections.ts`, `dashboard-view-model.ts`, `stores/pathStore.ts` | Today, Week, Journey, History, and dashboard summaries share filters, reference date, timezone rules, durable events, and canonical entity identity |
| Presentation | `CheminShell.vue`, `PathActionsPanel.vue`, `PathJourneyTree.vue`, `PathDetailPanel.vue`, Path views | Accessible list/tree and form actions remain complete without a graphical timeline dependency |
| Compatibility | `legacy-store-bridge.ts` | Canonical state mirrors into legacy Goal/Task stores temporarily; legacy edits merge through the coordinator until their editors migrate |

## Invariants

- `Europe/Paris` civil dates and explicitly zoned instants are distinct.
- Rescheduling changes planned time only; completion and reopening preserve factual history.
- Accepted command IDs are replay-safe only for the exact same intention.
- Repository read or write failures never silently become an empty document.
- Journey cycles and orphaned legacy relations remain visible and bounded.
- The semantic tree/list is authoritative; an optional graphical adapter may enhance it but cannot own data or essential commands.
- Gamification history and Obsidian note content remain separate sources until an explicit product mapping exists.

## Current compatibility boundary

The plugin still contains legacy Goal/Task consumers for modals, Focus Session, and some daily presentation. Store subscriptions therefore remain active. Dashboard facts and portfolio counters are canonical. `StorageService` may read and format daily notes, but can no longer write plugin `data.json`; only the canonical repository owns that document.

## Verification

Run `pnpm --dir obsidian_plugin test`, then `pnpm --dir obsidian_plugin build`. After a fresh approved build, use the disposable Obsidian Lab to prove artifact conformity, plugin loading, command interaction, target tab visibility, diagnostics, and cleanup. The Lab empty state does not prove populated data; migration, replay, reload, cycles, and large corpora remain covered by focused tests.

## Maintenance Rule

Update this document whenever the envelope, legacy decoder, repository transaction rules, command families, projections, selection behavior, compatibility bridge, or host-proof contract changes. Do not mark cross-platform adoption complete from Obsidian-only evidence.
