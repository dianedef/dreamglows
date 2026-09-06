---
artifact: technical_guidelines
metadata_schema_version: "1.0"
artifact_version: "1.0.0"
project: DreamGlows
created: "2026-09-02"
updated: "2026-09-02"
status: active
source_skill: sg-design
scope: cross-surface-design-system
owner: Diane
confidence: high
risk_level: medium
security_impact: none
docs_impact: yes
linked_systems:
  - obsidian_plugin/src/styles/dreamglows-tokens.css
  - website/src/styles/tokens.css
  - obsidian_plugin/src/styles/
  - obsidian_plugin/src/components/
  - shipglows_data/technical/obsidian-interface-design-reference.md
depends_on: []
supersedes: []
evidence:
  - "The active product surface is an Obsidian plugin and already consumes Obsidian theme variables."
next_review: "2026-12-02"
next_step: none
---

# DreamGlows design-system authority

The canonical project token source is `obsidian_plugin/src/styles/dreamglows-tokens.css`. It maps Obsidian theme variables to stable DreamGlows semantic roles and owns shared spacing, typography roles, control geometry, focus, shape, elevation, and modal layout values. Component styles consume `--dg-*` tokens and must not create parallel local token sets.

Obsidian remains the upstream authority for host colors, theme-dependent text and surfaces, native control behavior, and theme adaptation. DreamGlows tokens alias those host roles rather than replacing them with a fixed web palette.

Component styles must remain scoped by a DreamGlows shell class, preserve light and dark themes, visible focus, native control semantics, keyboard order, text zoom, and narrow-window reflow. Raw colors, global `.modal` overrides, parallel typography systems, and screen-local inline styles are prohibited.

The mandatory host-specific rules and visual review checklist live in `shipglows_data/technical/obsidian-interface-design-reference.md`. Any new or redesigned Obsidian surface must use it before implementation and again during rendered proof.

## Web surface

The canonical token source for the public Astro surface is `website/src/styles/tokens.css`. It owns the site's semantic color roles, typography, spacing, shape, elevation, motion, focus treatment, and breakpoints. Web components and page styles consume only these `--dg-*` roles.

The web palette is an intentional public-brand adaptation rather than a resolved-value copy of Obsidian host themes. Both surfaces preserve the same semantic responsibilities—clear hierarchy, warm momentum, visible progress, readable focus states, restrained motion, and accessible contrast—while their platform-specific values remain explicitly separate. No exact cross-surface visual parity is claimed until a generated canonical mapping exists.

## Shared Flutter surfaces

Windows and Android share `packages/path_flutter/lib/src/theme.dart` as their
theme and semantic layout authority. Material theme roles and native Flutter
form controls own focus, input, text scaling and touch behavior. Shared layout
constants own padding and the wide/narrow transition; screens consume those
constants rather than introducing platform-specific copies. Narrow layouts place
the daily action and editor in a scrollable column, while wide layouts keep the
path and selected detail side by side. The Obsidian palette is not copied into
Flutter; each host retains its maintained theme primitives.
