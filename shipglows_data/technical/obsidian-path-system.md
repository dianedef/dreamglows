---
artifact: technical_context
metadata_schema_version: "1.0"
artifact_version: "1.7.0"
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
  - "Canonical 7/30/90/365-day statistics passed 97/97 tests and loaded in the disposable host; removing Chart.js reduced the production bundle from about 5.94 MB to 4.38 MB."
  - "Canonical create/update/tombstone and Focus start/end commands passed 101/101 tests, strict type checking, production build, and disposable host load."
  - "Modal hosts now receive the plugin-owned Pinia and command port; a source-boundary test and the 102-test suite prevent regression to the singleton store."
  - "Atomic Goal/Action saves passed 107/107 tests and the create-task command opened in the disposable host without the prior missing-context diagnostic."
  - "Focus lifecycle UI, complete history labels, the legacy-writer boundary, and a full create-to-history reload slice passed 114/114 tests; legacy Goal/Task/Focus stores are now read-only projections with no persistence subscriptions."
next_review: "2026-10-02"
next_step: "Move the remaining GoalTree and form-option readers onto canonical selectors, then prove populated accessibility and host interactions before removing the one-way compatibility projection."
---

# Obsidian canonical Path system

## Purpose

Chemin is the single business source for planning, acting, reviewing, and preserving history in the Obsidian plugin. It separates planned time from actual facts and keeps legacy compatibility at the boundary.

## Architecture

| Layer | Primary entrypoints | Contract |
| --- | --- | --- |
| Domain | `src/domain/path/model.ts`, `legacy-v0.ts` | Versioned JSON-safe envelope; stable identities; unknown legacy data preserved in extensions; ambiguous input diagnosed rather than guessed |
| Persistence | `repository.ts`, `persistence-coordinator.ts`, `obsidian-adapter.ts` | One full-document repository, FIFO writes, optimistic revisions, explicit corruption/write failures |
| Commands | `commands.ts`, `command-port.ts`, `application/path-command-port.ts` | Idempotent create/update/tombstone, planning, status, hierarchy, evidence/reflection, and Focus lifecycle commands; exact-intent replay; persistence before UI synchronization |
| Read model | `projections.ts`, `dashboard-view-model.ts`, `stores/pathStore.ts` | Today, Week, Journey, History, and dashboard summaries share filters, reference date, timezone rules, durable events, and canonical entity identity |
| Presentation | `CheminShell.vue`, `PathActionsPanel.vue`, `PathJourneyTree.vue`, `PathDetailPanel.vue`, Path views | Accessible list/tree and form actions remain complete without a graphical timeline dependency |
| Statistics | `statistics.ts`, `StatsView.vue` | Inclusive Paris civil ranges count durable facts separately from current status; complete and reopen remain distinct; hierarchy cycles and orphans are explicit |
| Compatibility | `legacy-store-bridge.ts` | Legacy input is checkpointed once; canonical state then mirrors one way into temporary read-only Goal/Task/Focus projections |

## Invariants

- `Europe/Paris` civil dates and explicitly zoned instants are distinct.
- Rescheduling changes planned time only; completion and reopening preserve factual history.
- Accepted command IDs are replay-safe only for the exact same intention.
- Deletion is a recoverable tombstone and refuses implicit cascade while living children remain.
- A Focus Session is a canonical child entity of its action and has an explicit durable start/end lifecycle.
- Repository read or write failures never silently become an empty document.
- Journey cycles and orphaned legacy relations remain visible and bounded.
- The semantic tree/list is authoritative; an optional graphical adapter may enhance it but cannot own data or essential commands.
- Gamification history and Obsidian note content remain separate sources until an explicit product mapping exists.
- Long-range statistics never infer accomplishments from current status or planned-period changes.

## Current compatibility boundary

The plugin still contains legacy Goal/Task read consumers for some form options and daily presentation. They are compatibility projections only: no Goal, Task, or Focus store subscription can reconstruct or persist the canonical document. Settings update their own field through the repository without merging a legacy business snapshot. Dashboard facts and portfolio counters are canonical, and only the canonical repository owns plugin `data.json`.

Modal Vue apps use the same Pinia, command port, and entity editor as the main plugin app. They never import or instantiate the legacy singleton Pinia. Goal/Action form submission is one atomic repository update; rejection or write failure leaves the form open and persists no partial draft. Focus start, pause, completion, and task switching use replay-safe canonical lifecycle commands with visible pending and failure feedback.

## Verification

Run `pnpm --dir obsidian_plugin test`, then `pnpm --dir obsidian_plugin build`. After a fresh approved build, use the disposable Obsidian Lab to prove artifact conformity, plugin loading, command interaction, target tab visibility, diagnostics, and cleanup. The Lab empty state does not prove populated data; migration, replay, reload, cycles, and large corpora remain covered by focused tests.

## Maintenance Rule

Update this document whenever the envelope, legacy decoder, repository transaction rules, command families, projections, selection behavior, compatibility bridge, or host-proof contract changes. Do not mark cross-platform adoption complete from Obsidian-only evidence.
