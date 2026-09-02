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
  - Parcourir rêves, objectifs, jalons et actions dans l'arbre canonique **Parcours**, avec sélection et panneau de détail partagés.
  - Utiliser l’arbre au clavier ou sur écran étroit sans perdre le contexte.

- **Exécution quotidienne**
  - Planifier, replanifier, terminer et rouvrir les actions depuis les vues Aujourd'hui et Semaine.
  - Retrouver les actions non planifiées sans dépendre du glisser-déposer.
  - Centraliser notes, décisions et statut d’avancement.

- **Suivi visuel de progression**
  - Une même source alimente Aujourd'hui, Semaine, Parcours et Histoire.
  - Histoire conserve séparément planifications, réalisations, réouvertures, preuves et réflexions.
  - Tableau de bord motivant avec métriques de progression.

- **Habitudes & routines**
  - Associer des habitudes aux objectifs pour maintenir une cadence.

## Installation (BRAT)

1. Ouvrir **Obsidian → Settings → BRAT → Add beta plugin**
2. Ajouter le dépôt GitHub : `https://github.com/dianedef/dreamglows`
3. Sélectionner la dernière release ou figer la version souhaitée
4. Activer le plugin **DreamGlows**

Chaque release BRAT contient les assets suivants :
- `manifest.json`
- `main.js`
- `styles.css`

## Structure du plugin

- `obsidian_plugin/src` : code source de l’interface et de la logique métier.
- `obsidian_plugin/main.js` : build distribué.
- `obsidian_plugin/styles.css` : styles distribués chargés par Obsidian.

### Données persistées

- Une enveloppe Chemin versionnée constitue la source de vérité du plugin.
- Les écritures sont sérialisées, révisionnées et rejouables par identifiant de commande.
- Les anciennes formes Goal/Task sont décodées de façon permissive : les ambiguïtés sont diagnostiquées et les champs inconnus restent récupérables.
- Un pont temporaire maintient les écrans legacy pendant leur migration ; il ne remplace pas l'enveloppe canonique.

## État actuel

Le plugin Obsidian est la première surface active du projet. Le socle Chemin et ses quatre projections y sont implémentés et vérifiés. Les autres surfaces (`chrome_extension`, `android_app`, `windows_app`) sont alignées sur la même vision produit, mais ne consomment pas encore toutes ce modèle commun.

## Feuille de route de base

- Remplacer les métriques et la pseudo-histoire legacy du tableau de bord par les projections canoniques.
- Migrer les éditeurs et Focus Session avant de retirer le pont de compatibilité.
- Ajouter une projection statistique canonique couvrant les périodes longues.
- Étendre la continuité d’expérience sur les autres surfaces.
