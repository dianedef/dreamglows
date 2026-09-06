# DreamGlows (Obsidian)

DreamGlows dans Obsidian est conçu pour t’aider à atteindre tes rêves par une boucle opérationnelle simple :

1. **Définir des objectifs structurés** (tes grands rêves/intentions).
2. **Décomposer en milestones** (étapes concrètes et mesurables).
3. **Associer des tâches** à chaque milestone.
4. **Visualiser les progrès** en continu (journalier / hebdomadaire / global).

## Ce que propose DreamGlows

- **Pilotage par objectifs**
  - Créer et modifier rêves, objectifs, jalons, actions, habitudes, preuves et réflexions depuis **Parcours → Nouvel élément** ou la commande **Nouvel élément du parcours**.
  - Renseigner le pourquoi et la description, choisir un parent compatible et conserver les données non éditées ; l'archivage refuse un élément ayant encore des enfants.
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
  - Le tableau de bord résume les actions, objectifs, priorités et faits durables de la date consultée sans fabriquer d'activité.
  - Statistiques compare les faits Chemin sur 7, 30, 90 ou 365 jours dans un tableau accessible ; les données de bien-être restent séparées dans Aujourd'hui.

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
- Les formulaires Objectif/Action appliquent ensemble leurs changements de texte, dates, parent et statut, ou n'en appliquent aucun en cas d'échec.
- Les sessions Focus démarrent et se terminent par les mêmes commandes durables, avec reprise sûre après un échec de sauvegarde.
- Aucun service de notes ou de métriques ne peut écrire directement le document global du plugin.
- Les anciennes formes Goal/Task sont décodées de façon permissive : les ambiguïtés sont diagnostiquées et les champs inconnus restent récupérables.
- Les anciens fichiers Goal/Task sont migrés à la première ouverture, mais aucun store ou pont legacy ne reste actif ensuite.
- Une ancienne période invalide issue d'une migration Goal/Task est conservée dans `extensions.legacy.invalidPlanned`, retirée de la planification active et signalée à l'ouverture. Les autres documents canoniques invalides sont refusés avant écriture.

## État actuel

Le plugin Obsidian est la première surface active du projet. Le socle Chemin et ses quatre projections y sont implémentés et vérifiés. Chrome persiste dans le noyau TypeScript commun ; Windows et Android utilisent son équivalent Dart et des écrans Flutter partagés. Les sept types ordinaires sont éditables ; les sessions Focus gardent leur cycle dédié. Ce partage du modèle n'assure pas encore la synchronisation entre appareils.

## Preuve de portabilité

Le laboratoire `tests/portable-lab.mjs` vérifie dans un coffre Obsidian Windows
temporaire l'export natif, la modification extérieure d'un titre et de sa
description Markdown, le refus en mode strict puis l'acceptation explicite.
Après sauvegarde et restauration par le dialogue natif, un redémarrage complet
précède le réexport : tous les fichiers sont comparés octet par octet au paquet
attendu. Relations, historique, paramètres et champs non modifiés restent intacts,
ainsi que trois pièces jointes binaires, dont une sans lien textuel.

Exécution : définir `DREAMGLOWS_OBSIDIAN_EXE`, `DREAMGLOWS_PLAYWRIGHT_MODULE`
(module Playwright résolu) et `DREAMGLOWS_LAB_EVIDENCE` (dossier des preuves),
puis lancer `node obsidian_plugin/tests/portable-lab.mjs` depuis la racine.
Le reçu et les captures sont écrits dans ce dossier. Le coffre personnel reste
hors du test. Cette preuve porte sur le format portable v1 et l'hôte Obsidian ;
elle ne prouve ni la synchronisation ni l'édition bidirectionnelle automatique.

## Feuille de route de base

- Étendre la continuité d’expérience et l'enveloppe Chemin sur les autres surfaces.
