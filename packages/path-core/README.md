# DreamGlows Path Core

`@dreamglows/path-core` is the technology-agnostic TypeScript reference implementation of the canonical DreamGlows Chemin contract.

It owns the versioned JSON document, validation, legacy migration, commands, durable events, projections, statistics, and serialized repository coordination. It must not import Convex, Obsidian, Vue, Pinia, or a platform storage API.

Clients provide adapters implementing `PathRepositoryAdapter`:

- Obsidian maps the port to `loadData` and `saveData`;
- Windows will map it to recoverable local persistence;
- Convex may later map it to the specified synchronization protocol.

## Checks

- `pnpm --dir packages/path-core typecheck`
- `pnpm --dir packages/path-core test`
