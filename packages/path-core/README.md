# DreamGlows Path Core

`@dreamglows/path-core` is the technology-agnostic TypeScript reference implementation of the canonical DreamGlows Chemin contract.

It owns the versioned JSON document, validation, legacy migration, commands, durable events, projections, statistics, and serialized repository coordination. It must not import Convex, Obsidian, Vue, Pinia, or a platform storage API.

Clients provide adapters implementing `PathRepositoryAdapter`:

- Obsidian maps the port to `loadData` and `saveData`;
- Chrome maps it to serialized extension storage with revision checks;
- Windows uses recoverable local persistence through the matching pure Dart package;
- Convex may later map it to the specified synchronization protocol.

## Checks

- `pnpm --dir packages/path-core typecheck`
- `pnpm --dir packages/path-core test`

## Adoption contract

Repository/envelope versions remain 1. Optional `why: string` records the meaning
of a dream; absence is never replaced with invented meaning. Generic creation
supports dream, goal, milestone, action, habit, evidence and reflection. Focus uses
its dedicated lifecycle. Actions may contain actions, retaining Chrome subtasks.
New parent relations require live compatible entities and cannot introduce cycles.
Historical missing parents remain readable; deletion retains tombstones and events.
Unknown fields survive edits; extension patches merge with existing extensions.

`fixtures/adoption-conformance-v1.json` is shared with `packages/path_core_dart`.
See `shipglows_data/technical/common-model-adoption.md` for proof and boundaries.
Sharing the data contract does not mean every client exposes every command in its UI.
