# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [1.0.1] — 2026-09-02

### Fixed
- Correction du calcul des tâches en cours dans le tableau de bord.
- Création fiable des notes quotidiennes absentes, y compris dans des dossiers imbriqués et lors de saisies rapides.
- Publication BRAT avec la feuille de styles correctement nommée `styles.css`.

## [Unreleased] — 2026-08-06

### Added
- Initial project setup
- Vue arborescente accessible pour naviguer entre objectifs, sous-objectifs et tâches.
- Panneau de détail contextuel avec progression, statut, dates et actions rapides.
- Création de tâche pré-rattachée à l’objectif sélectionné.

### Changed
- La vue Objectifs privilégie désormais l’arbre de pilotage et reste utilisable sur les écrans étroits.
- La modale de tâche adopte une mise en page bornée et responsive, une hiérarchie claire, des libellés accessibles et des actions explicites.
- Les formulaires Objectif/Action et le cycle Focus écrivent désormais exclusivement dans le Chemin canonique, avec sauvegardes atomiques ou rejouables et erreurs visibles.
- Les anciens stores Goal/Task/Focus sont devenus des projections en lecture seule et ne peuvent plus réécrire les données métier.

### Fixed
- Compatibilité du build avec Vite 8 pour les types Vue importés et les feuilles de styles injectées.
