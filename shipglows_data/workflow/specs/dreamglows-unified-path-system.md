---
artifact: spec
metadata_schema_version: "1.0"
artifact_version: "1.7.0"
project: DreamGlows
created: "2026-09-02"
updated: "2026-09-02"
status: active
user_story: "As a DreamGlows user, I want one coherent path across today, week, journey, and history so that planning, acting, and reflecting never contradict or lose my data."
source_skill: sg-development
source_model: GPT-5.6 Codex
scope: unified-path-system
owner: Diane
confidence: high
risk_level: high
security_impact: yes
docs_impact: yes
linked_systems:
  - shipglows_data/business/dreamglows-product.md
  - shipglows_data/business/dreamglows-capability-map.md
  - shipglows_data/workflow/TASKS.md
  - obsidian_plugin/src/main.ts
  - obsidian_plugin/src/types/
  - obsidian_plugin/src/stores/
  - obsidian_plugin/src/services/
  - obsidian_plugin/src/views/
  - obsidian_plugin/src/components/
depends_on:
  - open-domain-model
supersedes: []
evidence:
  - "Operator approved the unified Chemin implementation plan on 2026-09-02."
  - "Repository investigation found duplicate Goal and Task schemas, competing persistence paths, an unconsumed TimelineService, and temporal views derived from file creation dates."
  - "GoalTree, GoalsView detail, DayView, PlanningView, EventService, progression history, and the installed vis-timeline package provide reusable foundations."
next_step: "Retire the proven duplicate StorageService writer and dead legacy timeline/view paths, then isolate long-range statistics behind a canonical selector."
---

# Spec: DreamGlows unified path system

## Title

DreamGlows unified path system

## Status

ready

## User Story

As a DreamGlows user planning and pursuing a dream, I want one coherent path across Today, Week, Journey, and History so that I always understand why an action exists, when it is planned, what actually happened, and what to do next without contradictory views or lost data.

## Minimal Behavior Contract

When a user creates, schedules, reschedules, completes, or reopens an action, DreamGlows writes the change once through a canonical versioned repository and every applicable projection shows the same entity and state. A failed or conflicting write leaves the last durable state intact, explains the failure, and restores the visible position. Unscheduled entities remain discoverable, and changing planned dates never rewrites completion facts or durable history.

## Success Behavior

- One action retains the same stable identity, parent, planned dates, completion state, and history across Today, Week, Journey, History, reload, and export.
- The hierarchy answers why an action exists; temporal projections answer when it is planned or occurred.
- A shared selection and detail panel follow the entity across projections.
- Mouse, touch, and keyboard users can perform every essential command without relying on drag, double-click, hover, animation, or color alone.
- Existing valid data is migrated deterministically, unknown fields are preserved, and migration can be audited and rolled back.

## Error Behavior

- Invalid dates, inverted periods, cycles, missing parents, duplicate identifiers, and conflicting legacy relations produce bounded diagnostics instead of silent deletion or coercion.
- A persistence failure cannot leave Pinia, the rendered projection, and durable storage claiming different states.
- A corrupt or unreadable data source is never converted silently to an empty dataset and saved over the original.
- A failed migration retains the original byte-for-byte source and exposes recovery guidance.
- If the graphical timeline cannot render or is inaccessible, the synchronized list remains complete and operable.

## Problem

DreamGlows already has daily, weekly, hierarchical, dashboard, and progression views, but they do not share one temporal owner. Goal and Task types disagree on dates, statuses, and relations. Plugin-native persistence and StorageService can write incompatible envelopes, settings writes can omit business data, and asynchronous subscribers can finish out of order. Planning currently derives dates from note creation metadata, TimelineService is not consumed, EventService is memory-only, and reward history is intentionally pruned. Adding another timeline before consolidating these boundaries would amplify contradiction and data-loss risk.

## Solution

Create a single product surface named Chemin backed by a library-independent domain and command layer. A versioned canonical envelope and one serialized repository own durable writes. Pinia stores become in-memory projections. Pure selectors generate Today, Week, Journey, and History from the same entities. Existing GoalTree, goal detail, daily modules, and modals are adapted behind shared selection and commands. A visual timeline adapter may use vis-timeline after an accessibility and integration spike, while a synchronized semantic list remains the complete fallback. Legacy readers remain permissive during migration; all new writes use only the canonical envelope.

## Scope In

- Canonical serializable domain for dreams, goals, milestones, actions, habits, evidence, reflections, focus sessions, and history events.
- Explicit distinction between civil dates, UTC instants, planned periods, actual completion, and event occurrence.
- One versioned plugin-data envelope with revision, migration diagnostics, legacy extension preservation, and serialized writes.
- Deterministic migration from current Goal/Task dialects and legacy relation aliases.
- Shared command layer for schedule, reschedule, resize, complete, reopen, reparent, evidence, and reflection.
- Pure projections for Today, Week, Journey, and History.
- One Chemin shell, period navigation, filters, shared selection, detail panel, unscheduled tray, live feedback, and list fallback.
- Progressive reuse and retirement of current Obsidian views and services.
- Tests, isolated Obsidian host proof, documentation coherence, and exact-scope delivery.

## Scope Out

- SaaS synchronization, multi-device conflict resolution, Windows or Android clients, bidirectional Obsidian sync, social features, autonomous AI planning, public release, BRAT publication, or marketplace submission.
- Importing or adapting GPL source code from timeline-view.
- Treating XP, Gold, or streaks as the definition of real progress.
- Forcing habits, mood, energy, or focus sessions into timeline items when they are better represented as adjacent daily context.

## Constraints

- Preserve all unrelated and pre-existing working-tree changes.
- The Obsidian plugin remains functional without a graphical timeline library.
- Domain and migration code contains no Obsidian, Vue, Pinia, or vis-timeline dependency.
- Persist only JSON-safe values; Date instances cannot cross the repository boundary.
- Civil dates use explicit `YYYY-MM-DD`; instants use ISO 8601 with a timezone; conversion between them requires an explicit zone.
- Child entities own parent identifiers; inverse child collections are derived rather than persisted as a second authority.
- Legacy fields that cannot be mapped safely remain under a namespaced extension with diagnostics.
- No personal vault may be discovered or used for automated proof.
- A production build must use the project-declared command and precede isolated Obsidian Lab proof.

## Test Contract

- Establish a reproducible unit and component test runner within the plugin before migration implementation.
- Preserve immutable anonymized legacy fixtures with expected canonical output, diagnostics, object counts, identifiers, relations, dates, and second-run no-op behavior.
- Test migration and commands as pure functions before repository integration.
- Test repository round trips and failures with an in-memory Obsidian-compatible adapter; prove serialized writes and no lost fields.
- Prove the vertical slice: create action, plan it, observe it in Today/Week/Journey, complete it, observe it in History, reload, and compare identity/dates/event.
- Test keyboard-equivalent commands, selection continuity, rollback feedback, focus behavior, list fallback, narrow layout, reduced motion, and non-color state communication.
- Run the declared production build, inspect generated artifacts, then use the disposable Obsidian Lab for artifact, host-load, interaction, diagnostic, and cleanup proof.
- Human visual approval is required before claiming the final graphical Journey projection complete; it is not required for the headless data-safety milestones.

## Dependencies

- Confirmed DreamGlows product contract and capability map.
- Existing plugin-native `loadData` and `saveData` APIs.
- Existing goals, tasks, habits, progression, focus-session stores and current user data formats.
- Existing GoalTree, GoalsView detail panel, DayView modules, PlanningView, TimeNavigation, and task/goal modals.
- Existing DreamGlows design tokens and Obsidian theme variables.
- Optional visual adapter: installed vis-timeline package, subject to the adapter spike.

## Invariants

- One entity identifier denotes the same entity in every projection and after reload.
- Planned time and actual history are never conflated.
- Rescheduling cannot mutate `completedAt` or prior history events.
- History events are append-only; corrective events supersede facts without deleting the audit trail.
- Unscheduled entities remain visible and actionable.
- A failed write cannot be reported as saved.
- Settings writes preserve every business collection and business writes preserve settings.
- Migration is idempotent, input-preserving, diagnosable, and reversible.
- The tree and list remain fully usable without the graphical timeline.
- No essential action depends exclusively on pointer drag, double-click, hover, animation, or color.
- The portable data model remains independent of Obsidian paths and UI components.

## Links & Consequences

- Upstream product outcomes: DG-CAP-02 Path, DG-CAP-03 Next action, DG-CAP-04 Progress and evidence, DG-CAP-05 Reflection and redirection, DG-CAP-07 Portability, and DG-CAP-09 Conflicts and restoration.
- Upstream work: `open-domain-model`; the first data milestone contributes to it rather than creating a competing domain contract.
- Downstream consumers: Obsidian Today, Planning, Goals, Stats, Profile, dashboard preview, future Windows and Android clients, export/import, and synchronization.
- Revalidation is required after changes to canonical schema, migration mapping, persistence envelope, command semantics, projection boundaries, or timeline adapter.
- Before to after: multiple view-local temporal interpretations become four projections of one canonical Chemin system.

## Documentation Coherence

- Update the capability map when the canonical schema and vertical slice are implemented and proved.
- Update the technical code map with the canonical domain, repository, command, projection, and adapter boundaries.
- Update TASKS only at evidence-backed milestone transitions; do not duplicate the spec plan there.
- Update the plugin changelog only for completed user-visible increments.
- No public website copy changes are authorized by this chantier.

## Edge Cases

- Empty or new installation; settings-only data; goals without actions; actions without dates or parents.
- Date-only values, UTC values, zoned ISO values, daylight-saving transitions, locale changes, and week boundaries in Europe/Paris.
- Inverted or zero-length periods; actions spanning days; completed items rescheduled afterward.
- Duplicate, invalid, or missing identifiers; orphaned relations; contradictory parent declarations; cycles.
- Unknown legacy fields, future schema versions, partially corrupt JSON, interrupted writes, and concurrent store mutations.
- The same legacy entity found in plugin data and daily notes with matching or conflicting content.
- Large datasets, dense overlapping ranges, narrow panes, zoomed text, light/dark themes, touch-only and keyboard-only operation.
- Entity selected in one projection but filtered or out of range in another.

## ZOMBIES Coverage

- Z: zero-data install, empty periods, and unscheduled tray remain useful.
- O: one dream, goal, milestone, and action prove the full vertical path.
- M: many overlapping entities, groups, filters, events, and large histories remain bounded and navigable.
- B: date/time boundaries, narrow widths, long labels, missing parents, and DST transitions preserve meaning.
- I: domain, migration, repository, stores, commands, projections, views, export, and host reload remain connected.
- E: corrupt input, rejected command, failed write, failed migration, and graphical-adapter failure recover visibly.
- S: local Obsidian scope is explicit; cross-device sync and public release remain outside this chantier.

## Implementation Tasks

1. **Safety baseline and fixtures** — inventory real legacy shapes without exposing personal content, introduce a plugin-owned test runner, freeze anonymized fixtures and checksums, and prove current build behavior. Validation: fixture inventory, reproducible unit command, unchanged input checksums. Constraint: no production-data migration or personal-vault access.
2. **Canonical domain contract** — introduce JSON-safe schema/version types, explicit date semantics, child-owned relations, history events, and permissive v0 decoding. Validation: schema tests for every known dialect, aliases, unknown fields, orphans, cycles, and date boundaries. Dependency: task 1.
3. **Pure migration** — normalize legacy data deterministically, preserve unknowns, emit diagnostics, and prove idempotence and round-trip counts. Validation: golden fixtures and second-run no-op. Dependency: task 2.
4. **Single repository** — replace competing writes with one serialized versioned plugin-data repository; settings and business data share a complete envelope; read failures never become empty saves. Validation: integration tests with concurrency and fault injection. Dependency: task 3.
5. **Command and event layer** — implement atomic schedule, reschedule, resize, complete, reopen, reparent, evidence, and reflection commands with one durable event per accepted transition. Validation: command-state-event tests including rejection and retry. Dependency: task 4.
6. **Projection layer** — implement pure Today, Week, Journey, and History selectors plus shared filter, range, selection, and unscheduled behavior. Validation: cross-projection identity/state tests and Europe/Paris boundary fixtures. Dependency: task 5.
7. **Chemin shell** — introduce accessible scope tabs and shared state while initially hosting current views; extract the shared detail panel and controlled period navigation. Validation: component tests for tabs, focus, selection continuity, live feedback, and narrow layout. Dependency: task 6.
8. **Today and Week migration** — project canonical actions rather than note creation times, preserve adjacent habits/focus/bilan modules, and add explicit form/keyboard planning before drag enhancement. Validation: vertical slice through Today/Week, rollback on failed save, accessibility test. Dependency: task 7.
9. **Journey projection and visual-adapter spike** — adapt GoalTree to the canonical hierarchy, evaluate vis-timeline behind an adapter, synchronize tree/list/visual selection, and support create/move/resize only with equivalent explicit commands. Validation: performance corpus, keyboard/list fallback, themes, reduced motion, and isolated host screenshot. Dependency: task 8.
10. **History projection** — render durable completions, evidence, reflections, recoveries, and redirections; link rewards without treating them as source truth. Validation: completion/reopen/reschedule chronology and reload/export stability. Dependency: tasks 5 and 7.
11. **Consolidation** — derive dashboard preview from Chemin selectors and retire obsolete view-local calculations, legacy persistence, dead services, duplicate types, and unused settings only after parity. Validation: repository scan, regression suite, migration compatibility, and isolated host proof. Dependency: tasks 8–10.
12. **Documentation and delivery** — update mapped product/technical documents and changelog for proven behavior; run final build and Lab proof; commit and push only exact chantier paths while preserving unrelated changes. Validation: documentation coherence, clean owned diff, resolved upstream contains owned commits. Dependency: task 11.

## Acceptance Criteria

- [ ] A canonical versioned envelope preserves settings and every business collection across independent changes and reload.
- [ ] Every known current/legacy Goal and Task shape migrates without silent loss; unknown fields remain recoverable and diagnostics identify ambiguity.
- [ ] Migration is idempotent and recoverable from an untouched original source.
- [ ] One action can be created, scheduled, shown in Today/Week/Journey, completed, shown in History, and reloaded with identical identity and facts.
- [ ] Rescheduling changes planned time only and creates a durable event without rewriting actual completion history.
- [ ] Today, Week, Journey, History, GoalTree, detail, and dashboard preview consume shared selectors rather than independent temporal calculations.
- [ ] Unscheduled actions remain visible and can be planned without drag.
- [ ] Every essential pointer interaction has a keyboard/form equivalent and visible focus/feedback.
- [ ] The graphical timeline can fail or be disabled without removing access to data or commands.
- [ ] Production build and isolated Obsidian artifact, host-load, interaction, diagnostics, and cleanup checks pass.
- [ ] Existing unrelated working-tree changes and personal Obsidian data remain untouched.
- [ ] Product, technical, tracker, and changelog documentation accurately reflect only proven milestones.

## Test Strategy

- **Unit:** schemas, migration transforms, relation normalization, date semantics, commands, history-event rules, and projections.
- **Golden fixtures:** each legacy envelope and conflict class with canonical expected output, warnings, counts, checksums, and idempotence.
- **Integration:** repository round trip, serialized write queue, revision handling, read/write failure, rollback, settings/business preservation, and reload.
- **Component:** explicit navigation, tabs, list fallback, selection continuity, detail commands, focus restoration, live announcements, error rollback, and responsive behavior.
- **Performance:** representative 1,000-item and 10,000-item projection/migration fixtures plus a dense visual timeline corpus.
- **Accessibility:** keyboard-only critical path, semantic tabs/tree/list/buttons, zoom, themes, reduced motion, and no color-only status.
- **Host:** declared production build followed by disposable Obsidian Lab load, interaction, diagnostics, cleanup, and bounded screenshots.
- **Manual:** human review of the final Journey visual composition and any interaction that cannot be faithfully automated in the isolated host.

## Risks

- **Data loss from competing persistence:** eliminate dual-write first; retain original data and fail closed.
- **Legacy ambiguity:** preserve rather than guess, report diagnostics, and require user intervention only for unresolved meaning that changes outcome.
- **Large dirty worktree:** use exact-path patches and staging; never overwrite or stage unrelated changes.
- **UI-first pressure:** keep graphical work blocked until migration and repository proof pass.
- **Library lock-in or accessibility gaps:** isolate vis-timeline behind an adapter and keep the semantic list authoritative for access.
- **History inflation:** record meaningful domain transitions, not every render, store patch, or gamification calculation.
- **Timezone drift:** separate civil dates from instants and test DST/week boundaries explicitly.
- **Premature legacy removal:** use permissive reads and canonical-only writes until compatibility evidence supports retirement.
- **Residual risk:** unknown real-world legacy data may require additional fixtures; the decoder must preserve unknown content and stop before destructive coercion.

## OWASP Security Gate

- The feature is local and introduces no new network, authentication, tenant, payment, or public endpoint.
- Treat imported JSON, Markdown, frontmatter, titles, and history text as untrusted input: validate shape and length, render as text by default, and do not inject source HTML into timeline templates.
- Prevent prototype-pollution keys and unsafe object merges in permissive legacy decoding.
- Never log API keys, personal note contents, full data blobs, or paths unnecessary for diagnostics.
- Migration backups remain local and contain the same sensitive user data as the source; do not commit, upload, or include them in fixtures.
- Applicable concerns: injection, insecure design, integrity failures, security logging/data exposure, and vulnerable dependency review for the optional timeline adapter.

## Execution Batches

- **Read-only parallel batch completed:** data/persistence analysis; UI/projection/accessibility analysis; testing/migration analysis.
- **Write batch A — sequential:** spec, fixtures, test infrastructure, canonical domain, and pure migration. Integration owner: primary agent.
- **Write batch B — sequential after A proof:** repository and command layer. No parallel edits to `main.ts`, stores, or persistence services.
- **Write batch C — non-overlapping only after readiness:** projection tests/components may run separately from documentation updates, with primary-agent integration before build.
- Existing modified UI files remain excluded until their current changes are inventoried and the relevant UI milestone begins.

## Execution Notes

- Use delegated sequential agents for bounded implementation or verification missions because the operator explicitly requested subagents.
- First-read implementation files: `obsidian_plugin/src/main.ts`, `obsidian_plugin/src/types/models.ts`, `obsidian_plugin/src/types/goals.ts`, `obsidian_plugin/src/types/tasks.ts`, `obsidian_plugin/src/services/StorageService.ts`, and `obsidian_plugin/package.json`.
- Begin with the smallest reproducible test runner compatible with the existing pnpm/Vite/TypeScript workspace. Any newly required package and lockfile change must remain exact-scope and justified by the test contract.
- Do not build before reviewing the declared `pnpm build` command and owned generated-artifact impact.
- Do not use a personal vault; use only the disposable Obsidian Lab after an approved fresh build.
- Milestone commits and ordinary current-branch pushes are authorized by the approved technical plan only when exact owned paths can be isolated and all required checks pass. Stop if unrelated changes overlap staging or upstream resolution is ambiguous.

## Open Questions

None for the safety baseline and canonical vertical slice. The four product scopes are confirmed; their final visual placement remains an implementation detail. Adoption of vis-timeline and any automatic mapping of ambiguous legacy subgoals remain evidence-gated implementation decisions with the safe list/preservation fallbacks already specified.

## Skill Run History

| Date UTC | Skill | Model | Action | Result | Next step |
|----------|-------|-------|--------|--------|-----------|
| 2026-09-02 UTC | sg-development | GPT-5.6 Codex | Investigated the approved unified Chemin plan with delegated read-only data, UI, and proof analyses; authored the durable implementation contract. | draft | Run adversarial spec review and readiness. |
| 2026-09-02 UTC | sg-development | GPT-5.6 Codex | Reviewed failure, concurrency, migration, accessibility, dependency, documentation, and dirty-worktree paths; added autonomous execution anchors. | reviewed | Run readiness decision. |
| 2026-09-02 UTC | sg-development | GPT-5.6 Codex | Confirmed the spec is decision-complete, bounded by milestone gates, and independently executable without conversation history. | ready | Implement the data-safety baseline. |
| 2026-09-02 UTC | sg-development | GPT-5.6 Codex | Added a dependency-free plugin test command, synthetic legacy fixture inventory, immutable fixture checksums, and byte-preservation tests. | implemented | Implement the canonical domain contract and decoder. |
| 2026-09-02 UTC | sg-development | GPT-5.6 Codex | Added the JSON-safe Chemin domain, civil-date/zoned-instant primitives, and a permissive legacy decoder with preservation and pollution defenses. | implemented | Implement deterministic pure migration. |
| 2026-09-02 UTC | sg-development | GPT-5.6 Codex | Added deterministic, idempotent pure migration with stable diagnostic identities, child-owned relation precedence, golden output, and deferred milestone classification. | implemented | Implement the single serialized repository. |
| 2026-09-02 UTC | sg-development | GPT-5.6 Codex | Added an adapter-driven repository with canonical/legacy reads, complete document round trips, FIFO writes, optimistic revision checks, and fault-injection proof. | implemented | Integrate the repository with plugin persistence. |
| 2026-09-02 UTC | sg-development | GPT-5.6 Codex | Revalidated the 23-test foundation, committed only owned plugin paths, and pushed checkpoint `93aeb13` to `origin/main`. | backed-up milestone | Integrate the repository without disturbing current UI work. |
| 2026-09-02 UTC | sg-development | GPT-5.6 Codex | Added the legacy-store bridge and single persistence coordinator, routed plugin bootstrap and store saves through the canonical repository, removed view-owned duplicate watchers, then proved a fresh build in the disposable Obsidian Lab. | implemented and host-proven locally | Add canonical commands/events, then begin shared Chemin projections. |
| 2026-09-02 UTC | sg-development | GPT-5.6 Codex | Added idempotent canonical commands with one durable event per accepted transition, plus pure Today, Week, Journey, and History projections with Paris calendar boundaries, shared filters, contextual ancestry, selection visibility, and unscheduled/invalid trays. | implemented and host-proven locally | Introduce the accessible Chemin shell and shared projection state. |
| 2026-09-02 UTC | sg-development | GPT-5.6 Codex | Added the shared canonical Pinia read model, explicit four-tab Chemin shell, and first real History panel backed only by durable events; preserved Stats/Profile as secondary destinations and proved History activation in the disposable host. | implemented and host-proven locally | Migrate Today and Week internals to canonical projections and commands. |
| 2026-09-02 UTC | sg-development | GPT-5.6 Codex | Added the injected Chemin command port, post-persist canonical/legacy synchronization guard, accessible plan/reschedule/complete/reopen controls, and canonical action sections in Today and Week while keeping note tasks separate; Week navigation now updates the shared reference date. | vertical slice implemented and host-proven empty-state | Migrate Journey and shared selection/detail. |
| 2026-09-02 UTC | sg-development | GPT-5.6 Codex | Replaced the legacy-computed Journey surface with the canonical hierarchy projection, one shared selection, an accessible keyboard tree, reusable canonical detail/history, and persisted reparenting with rollback feedback; kept the semantic tree authoritative and deferred the optional graphical adapter. | implemented and host-proven empty-state; 78/78 tests | Populate and consolidate History, then retire parity-proven legacy calculations. |
| 2026-09-02 UTC | sg-development | GPT-5.6 Codex | Added a pure History view-model and upgraded History with weekly navigation, Paris-day grouping, structured before/after facts, related evidence/reflections, shared selection, and the reusable detail panel. | implemented and host-proven empty-state; 83/83 tests | Replace dashboard pseudo-history, then remove only proven dead legacy writers/views. |
| 2026-09-02 UTC | sg-docs | GPT-5.6 Codex | Aligned the Obsidian README, tracker, technical navigation, canonical Path architecture, verification evidence, and tracked specification with delivered behavior while preserving the unproven cross-platform boundary. | documentation updated and governance-validated | Replace dashboard pseudo-history and metrics with canonical projections. |
| 2026-09-02 UTC | sg-development | GPT-5.6 Codex | Replaced dashboard Goal/Task calculations and synthetic activity with a pure canonical selector for Today counts, portfolio status, active priorities, and Paris-day durable events; added an honest empty state and accessible event semantics. | implemented and host-proven empty-state; 88/88 tests | Retire only proven duplicate writers/views, then design canonical long-range statistics. |

## Current Chantier Flow

- Product direction: approved by operator.
- Investigation: complete; data, UI, accessibility, migration, and test surfaces mapped.
- Specification: complete and adversarially reviewed.
- Readiness: ready; no material product, data, security, platform, or proof decision remains for task 1.
- Implementation: in progress; the canonical dashboard and prior Chemin surfaces now pass 88/88 tests, including Paris-day boundaries, honest zero state, the 12,000-level Journey corpus, and durable event facts.
- Verification: canonical dashboard/Today/Week/Journey/History empty states and tab activation are host-proven; populated composition and rollback remain unit/integration-proven because the Lab cannot yet seed plugin data.
- Delivery: implementation checkpoint `465d337` is present on `origin/main`; the overall chantier remains open.

  Next step: retire the proven duplicate StorageService writer and dead legacy timeline/view paths, then isolate long-range statistics behind a canonical selector.
