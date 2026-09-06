---
artifact: technical_context
metadata_schema_version: "1.0"
artifact_version: "1.0.0"
project: DreamGlows
created: "2026-09-06"
updated: "2026-09-06"
status: active
source_skill: sg-development
scope: common-model-adoption
owner: Diane
confidence: high
risk_level: high
security_impact: yes
docs_impact: yes
linked_systems: [packages/path-core, packages/path_core_dart, chrome_extension, windows_app, obsidian_plugin]
depends_on: []
supersedes: []
evidence:
  - "Shared document fixtures and actual TypeScript to Dart to TypeScript modification and replay."
  - "Isolated Chromium and native Obsidian proof; managed Windows rendered inspection."
next_review: "2026-10-06"
next_step: verify-cross-surface-adoption
---

# Modèle commun et adoption

Le document conserve `repositoryVersion: 1` et `schemaVersion: 1`. La chaîne
optionnelle `why` représente le sens du rêve. Son absence signifie non renseigné.
Les propriétés inconnues restent conservées, y compris lors d'une modification.
Une modification des extensions fusionne les clés fournies avec les clés existantes.

| Enfant | Parents admis pour une nouvelle relation |
| --- | --- |
| Rêve | Aucun |
| Objectif | Rêve, objectif |
| Jalon | Objectif |
| Action | Objectif, jalon, action |
| Habitude | Objectif |
| Preuve, bilan | Rêve, objectif, jalon, action, habitude, session Focus |
| Session Focus | Action, via le début de session |

Les éléments génériques peuvent exister sans parent. Les relations historiques
orphelines restent lisibles ; une nouvelle relation exige un parent vivant et ne
peut créer de cycle. La suppression conserve les données et événements, et refuse
un parent ayant des enfants vivants.

Le décodage refuse les identités vides ou dupliquées entre entités et événements,
les versions/types/statuts inconnus, les révisions hors entier JavaScript sûr,
les dates invalides, périodes inversées, mélanges date civile/instant et clés JSON
dangereuses. Un refus n'autorise jamais une initialisation vide de remplacement.

L'ancienne migration pouvait produire une période inversée ou mixte. Lors de la
migration v0, cette période est conservée exactement sous
`entity.extensions.legacy.invalidPlanned`, sans inventer de planification valide.
La lecture du dépôt applique la même reprise aux anciens documents v1 portant la
provenance `extensions.legacy.kind` et `fields`. Les autres erreurs de document
restent bloquantes. Obsidian annonce les éléments à replanifier ; les champs source
et les périodes originales restent récupérables.

## Surfaces

Obsidian importe directement le cœur TypeScript. Ses formulaires existants ne
constituent pas encore une interface complète pour tous les types. Windows importe
le cœur Dart pur `packages/path_core_dart`, indépendant de Flutter et d'Android ;
les anciens imports Windows restent disponibles par des exports de compatibilité.

Chrome projette le document canonique dans son arbre : `objective`/`task` restent
des aliases UI de `goal`/`action`. Les données non représentées restent conservées.
Le stockage legacy est sauvegardé avant le premier document canonique. Le service
worker est l'unique écrivain ; une révision périmée est refusée.

Android reste un dossier préparatoire. Le package Dart est réutilisable mais
aucune intégration Android ni preuve sur appareil n'est acquise.

## Preuves et limites

`packages/path-core/fixtures/adoption-conformance-v1.json` est exécuté dans les deux
langages. Les suites couvrent mutations, rejeu, champs inconnus et erreurs de
persistance. Les reçus finaux sont dans la spec `common-model-adoption.md`.

Ce travail ne livre pas la synchronisation distante, le miroir durable vers un
coffre, l'édition bidirectionnelle ni une interface de résolution des conflits.
La preuve du format portable Obsidian reste distincte de l'adoption par surface.
