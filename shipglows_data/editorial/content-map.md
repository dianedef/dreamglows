---
artifact: content_map
metadata_schema_version: "1.0"
artifact_version: "1.0.0"
project: DreamGlows
created: "2026-09-02"
updated: "2026-09-02"
status: active
source_skill: sg-docs
scope: content-map
owner: Diane
confidence: high
risk_level: medium
content_surfaces:
  - landing_pages
  - repository_docs
  - plugin_installation
  - editorial_governance
security_impact: none
docs_impact: yes
evidence:
  - "website/src/pages/index.astro renders the first dedicated public landing page."
  - "website/src/data/copy.ts centralizes its editable copy."
linked_artifacts:
  - shipglows_data/business/dreamglows-product.md
  - README.md
  - obsidian_plugin/README.md
depends_on:
  - artifact: shipglows_data/business/dreamglows-product.md
    required_status: active
supersedes: []
next_review: "2026-12-02"
next_step: "Complete the operator copy review before publication."
---

# DreamGlows content map

## Purpose

This map identifies the public content surfaces, their jobs, and the evidence that bounds their claims. It is structural governance, not a second copy source or an editorial backlog.

## Content surfaces

| Surface | Canonical path | Purpose | Source of truth | Update when |
| --- | --- | --- | --- | --- |
| Public landing page | `website/src/pages/index.astro` | Present the product, method, active surface, and primary CTA | Copy in `website/src/data/copy.ts`; product truth in `shipglows_data/business/dreamglows-product.md` | Positioning, offer, page structure, CTA, availability, or product promise changes |
| Landing copy | `website/src/data/copy.ts` | Central editable source for public page wording | Product contract plus explicit operator decisions | Copy, audience framing, benefits, surface status, or CTA changes |
| Repository overview | `README.md` | Explain the monorepo and route contributors or beta users | Product contract and verified package state | Surface membership, commands, installation, or product status changes |
| Obsidian installation | `obsidian_plugin/README.md` and the root BRAT section | Explain the currently active product surface and its installation | Verified release assets and plugin behavior | Installation, compatibility, required assets, or availability changes |
| Editorial governance | `shipglows_data/editorial/` | Own public-content routing, claim boundaries, and review state | This map and the product contract | Public surfaces, claim ownership, or review rules change |

## Landing page intent

| Page | Audience | Job | Primary CTA | Must include | Must not imply |
| --- | --- | --- | --- | --- | --- |
| `/` | General public: anyone who wants to turn a personal or professional dream into concrete steps | Give confidence, make the DreamGlows method understandable, and invite exploration of the active Obsidian surface | Explore the DreamGlows GitHub repository and Obsidian plugin | Unrestrained encouragement, dream → objectives → milestones → tasks, visible progress, current surface status | Professional jargon, narrow persona assumptions, measured product outcomes without evidence, or availability of surfaces still in preparation |

## Claim sources

- Product identity, method, surface status, and next product step: `shipglows_data/business/dreamglows-product.md`.
- Primary audience: general public, without profession, expertise, or productivity-identity prerequisites.
- Brand encouragement: “Tes rêves vont se réaliser” is an aspirational conviction, not a measured product-performance claim.
- Installation and repository facts: verified root and package READMEs plus release configuration.
- Visual expression: `shipglows_data/technical/design-system-authority.md`.
- No pricing, security, privacy, AI reliability, speed, or measured outcome claim is currently authorized by this map.

## Editorial Update Plan

- Changed source: new Astro landing page and centralized landing copy.
- Impacted surfaces: landing page, repository overview, product contract, technical and editorial maps; grand-public wording replaces specialist productivity vocabulary.
- Required action: updated; operator copy review remains the acceptance step before publication.
- Owner role: integrator for governance, human decision for final copy acceptance.
- Validation: Astro build, public-claim comparison against the product contract, metadata lint, and operator review.
- Closure status: documentation complete; publication not authorized.

## Open gaps

- Human review of the landing headline, benefit hierarchy, and CTA wording before publication.
- A canonical deployment domain and publication route are not yet declared.
- Blog, newsletter, pricing, FAQ, and support surfaces are not declared; do not invent them.

## Maintenance Rule

Update this map when a public surface, page job, CTA, claim source, runtime copy path, or editorial update trigger changes.
