---
artifact: technical_context
metadata_schema_version: "1.0"
artifact_version: "1.1.0"
project: DreamGlows
created: "2026-09-02"
updated: "2026-09-02"
status: active
source_skill: sg-docs
scope: technical-documentation-index
owner: Diane
confidence: high
risk_level: low
security_impact: none
docs_impact: yes
linked_systems:
  - shipglows_data/technical/code-docs-map.md
  - shipglows_data/technical/design-system-authority.md
depends_on: []
supersedes: []
evidence:
  - "The monorepo contains Obsidian, Chrome, Windows, Android, and Astro website surfaces."
  - "Commit 465d337 introduced the Obsidian canonical Path envelope, serialized repository, command port, shared projections, Journey, History, and Focus Session integration."
next_review: "2026-12-02"
next_step: none
---

# DreamGlows technical documentation

## Purpose

This directory is the canonical technical documentation layer for the DreamGlows monorepo. Start with the path map before editing code, then load only the primary document mapped to the affected surface.

## Navigation

| Document | Use it when |
| --- | --- |
| `code-docs-map.md` | Any source, package, build, or shared-workspace path changes |
| `design-system-authority.md` | A visual, layout, interaction, token, accessibility, or theme decision changes |
| `obsidian-interface-design-reference.md` | The Obsidian plugin interface changes |
| `obsidian-path-system.md` | Chemin data, persistence, commands, projections, compatibility, or verification changes |

## Surface status

| Surface | Code path | Technical documentation status |
| --- | --- | --- |
| Public website | `website/` | Mapped to the root README, product contract, editorial map, and design-system authority |
| Obsidian plugin | `obsidian_plugin/` | Canonical Chemin architecture documented; UI remains mapped to its README, Obsidian design reference, and design-system authority |
| Chrome extension | `chrome_extension/` | Baseline coverage through package documentation and the product contract |
| Windows application | `windows_app/` | Baseline coverage through package documentation and the product contract |
| Android application | `android_app/` | Baseline coverage through package documentation and the product contract |

## Validation

Run the mapped package check first. For governed documentation changes, also run the project governance topology audit and metadata lint on every touched artifact.

## Maintenance Rule

Update this index when the technical-documentation families, surface coverage, or canonical navigation order changes.
