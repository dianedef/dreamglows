# DreamGlows (Obsidian)

DreamGlows dans Obsidian est conçu pour t’aider à atteindre tes rêves par une boucle opérationnelle simple :

1. **Définir des objectifs structurés** (tes grands rêves/intentions).
2. **Décomposer en milestones** (étapes concrètes et mesurables).
3. **Associer des tâches** à chaque milestone.
4. **Visualiser les progrès** en continu (journalier / hebdomadaire / global).

## Ce que propose DreamGlows

- **Pilotage par objectifs**
  - Créer, suivre et prioriser des objectifs.
  - Structurer les objectifs par jalons (`milestones`) pour garder un cap clair.

- **Exécution quotidienne**
  - Planifier et suivre les tâches liées à chaque milestone.
  - Centraliser notes, décisions et statut d’avancement.

- **Suivi visuel de progression**
  - Vue jour / semaine pour voir les actions accomplies.
  - Tableau de bord motivant avec métriques de progression.

- **Habitudes & routines**
  - Associer des habitudes aux objectifs pour maintenir une cadence.

## Installation (BRAT)

1. Ouvrir **Obsidian → Settings → BRAT → Add beta plugin**
2. Ajouter le dépôt GitHub : `https://github.com/dianedef/dreamglows`
3. Utiliser le manifeste : `https://raw.githubusercontent.com/dianedef/dreamglows/main/obsidian_plugin/manifest.json`
4. Activer le plugin **DreamGlows**

Le dépôt contient un plugin installé en mode développement avec:
- `manifest.json`
- `main.js`
- `versions.json`

## Structure du plugin

- `obsidian_plugin/src` : code source de l’interface et de la logique métier.
- `obsidian_plugin/main.js` : build distribué.

### Données persistées

- Les données de la machine utilisateur sont stockées via la configuration/runtime Obsidian.
- Les données globales de plugin sont sérialisées dans le format attendu par le plugin pour garantir la continuité entre sessions.

## État actuel

Le plugin Obsidian est la première surface active du projet. Les autres surfaces (`chrome_extension`, `android_app`, `windows_app`) sont alignées sur la même vision produit et restent en phase de montée en maturité.

## Feuille de route de base

- Renforcer la cohérence des vues autour des milestones.
- Consolider la visibilité “progrès global + next action”.
- Stabiliser les parcours de création et clôture de milestone.
- Étendre la continuité d’expérience sur les autres surfaces.
