---
artifact: editorial_content_context
metadata_schema_version: "1.0"
artifact_version: "1.0.0"
project: DreamGlows
created: "2026-09-02"
updated: "2026-09-02"
status: active
source_skill: sg-docs
scope: editorial-governance-index
owner: Diane
confidence: high
risk_level: medium
security_impact: none
docs_impact: yes
content_surfaces:
  - public_site
  - repository_readme
  - plugin_installation
claim_register: shipglows_data/editorial/content-map.md#claim-sources
page_intent: shipglows_data/editorial/content-map.md#landing-page-intent
linked_systems:
  - shipglows_data/editorial/content-map.md
  - website/src/data/copy.ts
  - shipglows_data/business/dreamglows-product.md
depends_on: []
supersedes: []
evidence:
  - "The Astro landing page is the first dedicated public editorial surface."
next_review: "2026-12-02"
next_step: "Complete the operator copy review before publication."
---

# DreamGlows editorial governance

## Purpose

This directory owns the routing and review rules for public DreamGlows content. It does not duplicate the copy rendered by the product surfaces.

## Canonical order

1. Read `content-map.md` to identify the public surface, page job, source contracts, and update triggers.
2. Read `shipglows_data/business/dreamglows-product.md` for the verified product promise and surface status.
3. Edit runtime copy only in its mapped source, currently `website/src/data/copy.ts` for the landing page.
4. Rebuild the affected surface and obtain human approval before publication when positioning or primary copy changes.

## Claim boundary

DreamGlows may describe its product method, current Obsidian availability, and declared future surfaces. It must not imply that Chrome, Windows, or Android are available while they remain in preparation, or claim measured product outcomes without supporting evidence. Strong aspirational encouragement such as “Tes rêves vont se réaliser” belongs to the brand voice and must not be presented as measured product proof. The copy must never frame the offering as limiting a user’s ambition; we should reinforce that no dream is too large for the method to support.

The primary audience is the general public. Public language must remain understandable without professional productivity vocabulary, avoid assuming a specific job or expertise level, welcome personal as well as professional dreams without segmenting the homepage by persona, and encourage people with confidence rather than defensive qualification.

## Maintenance Rule

Update this index when a public content family, claim-governance artifact, review gate, or runtime copy source changes.
