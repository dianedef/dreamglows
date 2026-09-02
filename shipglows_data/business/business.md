---
artifact: business_context
metadata_schema_version: "1.0"
artifact_version: "1.0.0"
project: DreamGlows
created: "2026-09-02"
updated: "2026-09-02"
status: active
source_skill: sg-docs
scope: business
owner: Diane
confidence: high
risk_level: medium
business_model: unknown
target_audience: "Grand public portant un rêve, un projet ou une ambition à concrétiser"
value_proposition: "Transformer un rêve en milestones, tâches et progrès visibles"
market: "Pilotage personnel et planification orientée objectifs"
delivery_posture: development
security_impact: unknown
docs_impact: yes
evidence:
  - "2026-09-02: dreamglows-product.md confirme le public, la promesse et le plugin Obsidian comme première surface active."
linked_artifacts:
  - shipglows_data/business/dreamglows-product.md
  - shipglows_data/business/competitors.md
depends_on: []
supersedes: []
next_review: "2026-12-02"
next_step: "Valider la première narration publique DreamGlows."
---

# Contexte métier DreamGlows

## Identité

DreamGlows aide une personne à transformer un rêve concret en progrès visible
par une chaîne simple : **rêve → milestone → tâche → progrès**. Le produit ne
promet pas la réalisation du rêve ; il rend le chemin plus clair et la prochaine
action plus accessible.

## Client prioritaire

Le produit s'adresse d'abord au grand public, sans dépendre d'un métier ou d'une
identité de « personne productive ». Son utilisateur porte un projet, une
ambition ou un rêve qu'il souhaite décomposer en étapes concrètes.

## Différenciation actuelle

L'alternative directe Day Planner rend les créneaux quotidiens visibles dans
Obsidian. DreamGlows vise à relier ces actions quotidiennes à une ambition et à
ses milestones, sans réduire le produit à un calendrier générique.

## Décisions et inconnues

- **Décidé :** le produit est en posture `development` ; son intégration Git
  canonique est `main`.
- **Décidé :** le plugin Obsidian est la première surface active.
- **Inconnu :** modèle économique, prix et signal de demande mesuré.

## Risques

- Ajouter un calendrier ou des intégrations externes avant d'avoir validé leur
  effet sur le passage d'un milestone à une action achevée diluerait la promesse.
- Une intégration de calendrier ICS exige une décision explicite sur la
  confidentialité avant toute mise en œuvre.
