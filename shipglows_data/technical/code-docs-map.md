---
artifact: technical_guidelines
metadata_schema_version: "1.0"
artifact_version: "1.2.0"
project: DreamGlows
created: "2026-09-02"
updated: "2026-09-03"
status: active
source_skill: sg-docs
scope: code-docs-map
owner: Diane
confidence: high
risk_level: medium
security_impact: none
docs_impact: yes
linked_systems:
  - README.md
  - website/
  - obsidian_plugin/
  - packages/path-core/
  - chrome_extension/
  - windows_app/
  - android_app/
  - shipglows_data/technical/design-system-authority.md
  - shipglows_data/technical/obsidian-path-system.md
  - shipglows_data/editorial/content-map.md
depends_on:
  - artifact: shipglows_data/technical/README.md
    artifact_version: "1.0.0"
    required_status: active
supersedes: []
evidence:
  - "The 2026-09-02 Astro surface bootstrap established the first public website mapping."
  - "Commit 465d337 established the canonical Obsidian Path subsystem and its focused test suite."
  - "The 2026-09-03 shared-core extraction established package-level ownership and consuming-client validation."
next_review: "2026-12-02"
next_step: none
---

# DreamGlows code-to-documentation map

## Purpose

This is the canonical path-to-document routing map for DreamGlows. Match every task-owned changed path here before closure, load the named primary document, and update the mapped documentation when its trigger applies.

## Path map

| Code or configuration path | Primary documentation | Secondary documentation | Validation | Documentation update trigger |
| --- | --- | --- | --- | --- |
| `website/src/data/copy.ts`, `website/src/pages/**`, `website/src/layouts/**` | `shipglows_data/editorial/content-map.md` | `shipglows_data/business/dreamglows-product.md`, `README.md` | `pnpm build:website` | Positioning, promise, availability, page intent, CTA, metadata, or public-surface structure changes |
| `website/src/styles/**` | `shipglows_data/technical/design-system-authority.md` | `shipglows_data/editorial/content-map.md` | `pnpm build:website` plus the changed-path design drift check | Web tokens, visual roles, responsive behavior, focus, contrast, or motion changes |
| `website/package.json`, `website/astro.config.mjs`, `website/tsconfig.json` | `shipglows_data/technical/README.md` | `README.md` | `pnpm build:website` | Framework, build command, output mode, package boundary, or runtime requirements change |
| `obsidian_plugin/src/**`, `obsidian_plugin/package.json` | `obsidian_plugin/README.md` | `shipglows_data/business/dreamglows-product.md`, `shipglows_data/technical/design-system-authority.md`, `shipglows_data/technical/obsidian-interface-design-reference.md` | `pnpm build:obsidian-plugin` plus focused tests for changed behavior | Plugin behavior, data, build, setup, UI contract, or product promise changes |
| `obsidian_plugin/src/domain/path/**`, `obsidian_plugin/src/application/path-command-port.ts`, `obsidian_plugin/src/stores/pathStore.ts`, `obsidian_plugin/tests/path-*.test.mjs` | `shipglows_data/technical/obsidian-path-system.md` | `obsidian_plugin/README.md`, `shipglows_data/workflow/specs/dreamglows-unified-path-system.md` | `pnpm --dir obsidian_plugin test`, `pnpm --dir obsidian_plugin build`, then disposable `s obsidian-lab` proof | Canonical schema, migration, persistence, command, projection, compatibility, or proof contract changes |
| `packages/path-core/**` | `packages/path-core/README.md` | `shipglows_data/technical/obsidian-path-system.md`, `shipglows_data/workflow/specs/dreamglows-windows-path-adoption.md` | `pnpm --dir packages/path-core typecheck`, `pnpm --dir packages/path-core test`, and every consuming-client suite | Canonical schema, command, persistence, projection, compatibility, package boundary, or adapter-port changes |
| `chrome_extension/src/**`, `chrome_extension/package.json` | `chrome_extension/README.md` | `shipglows_data/business/dreamglows-product.md` | `pnpm build:chrome-extension` plus focused tests | Extension behavior, permissions, setup, build, or product promise changes |
| `windows_app/**` | `windows_app/README.md` | `shipglows_data/business/dreamglows-product.md`, `shipglows_data/workflow/specs/dreamglows-windows-path-adoption.md` | `flutter analyze`, `flutter test`, managed `flutter run -d windows`, and release artifact registration | Flutter Windows behavior, canonical Dart conformance, local persistence, setup, distribution, or product promise changes |
| `android_app/**` | `android_app/README.md` | `shipglows_data/business/dreamglows-product.md` | Package-declared focused check | Android behavior, setup, distribution, or product promise changes |
| `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml` | `README.md` | `shipglows_data/technical/README.md` | Relevant package build and workspace resolution | Workspace membership, package-manager workflow, root scripts, or dependency policy changes |
| `.shipglows/design-system-drift.json` | `shipglows_data/technical/design-system-authority.md` | `shipglows_data/technical/README.md` | Changed-path design drift check | Token source, accepted visual exception, or classification policy changes |
| `shipglows_data/business/**` | Target business artifact | `README.md`, `shipglows_data/editorial/content-map.md` when public claims change | Metadata lint and semantic review | Product identity, promise, surface status, audience, or roadmap truth changes |
| `shipglows_data/editorial/**` | Target editorial artifact | `shipglows_data/business/dreamglows-product.md` | Metadata lint and public-copy review | Public surface ownership, page intent, claim source, or editorial workflow changes |
| `shipglows_data/technical/**` | Target technical artifact | `shipglows_data/technical/README.md` | Metadata lint and targeted path checks | Technical ownership, validation route, design authority, or mapping changes |

## Documentation Update Plan Format

```markdown
## Documentation Update Plan

- Changed paths: `<task-owned paths>`
- Primary docs: `<mapped owners>`
- Secondary docs: `<mapped dependents or none>`
- Required action: `<update|review|not impacted>`
- Reason: `<trigger or concrete no-impact reason>`
- Owner role: `<executor|integrator|human decision>`
- Validation: `<focused checks>`
- Status: `<complete|needs review|blocked>`
```

## Current website bootstrap plan

- Changed paths: `website/**`, root workspace files, README, design authority, product and editorial governance.
- Primary docs: this map, `shipglows_data/editorial/content-map.md`, `shipglows_data/technical/design-system-authority.md`, and `shipglows_data/business/dreamglows-product.md`.
- Required action: updated.
- Reason: a new public Astro surface changes workspace membership, copy ownership, public page intent, build commands, and web visual authority.
- Owner role: integrator.
- Validation: website build, governance topology audit, changed-path design drift check, and metadata lint.
- Status: complete pending the operator's human copy review, which is an editorial acceptance step rather than a documentation gap.

## Maintenance Rule

Update this map whenever a code area, primary documentation owner, validation command, or documentation trigger changes.

The cross-platform capability, data-portability, and surface-role contract is owned by `shipglows_data/business/dreamglows-capability-map.md`; implementation changes to a client data model, synchronization, export/import, offline behavior, recovery, or conflict handling must review it.
