---
artifact: business_contract
project: DreamGlows
updated: 2026-09-02
status: active
source: sg-docs
---

# DreamGlows — Document de gouvernance produit

## Idée produit

DreamGlows est une plateforme de pilotage personnel qui aide à atteindre des rêves concrets via une chaîne opérationnelle claire :

- définir les rêves comme objectifs stratégiques,
- découper en milestones mesurables,
- suivre les tâches quotidiennes associées,
- visualiser la progression dans un tableau de bord cohérent.

Le produit se concentre sur ce qui donne envie d’avancer — le pourquoi — puis rend le chemin et les actions compréhensibles, sans réduire un rêve à une liste ou à une estimation de temps.

## Public prioritaire

DreamGlows s’adresse d’abord au grand public : toute personne qui porte un rêve, un projet ou une ambition et souhaite le transformer en étapes concrètes. Le produit ne dépend pas d’un métier, d’un niveau d’expertise ou d’une identité de « personne productive ».

La voix de DreamGlows encourage sans retenue. « Tes rêves vont se réaliser » exprime la conviction et l’élan que la marque veut transmettre ; ce n’est pas une mesure de performance du produit. DreamGlows fournit un chemin, des étapes et des actions compréhensibles, tandis que chaque personne reste l’autrice de sa progression. Aucun cadre, de surfaces ou de rôle, ne sert à limiter la hauteur des rêves : le système doit garder la capacité de porter des ambitions ambitieuses.

## Ancrage actuel

- Produit opérationnel : plugin Obsidian (monorepo `obsidian_plugin/`) comme première surface active.
- Surface éditoriale : site Astro (`website/`) comme référence publique du positionnement et du copywriting produit.
- Étendue cible : Chrome (`chrome_extension/`), Windows (`windows_app/`), Android (`android_app/`) avec un langage produit unique.
- Priorité actuelle : stabiliser la narration produit, les milestones métier et la cohérence UX des surfaces.
- Identité retenue : **DreamGlows**.
- Nom de marque validé : **DreamGlows**.
- Référence de marque opérationnelle : **dreamgleams.com**.
- Dépôt GitHub : `dianedef/dreamglows`.

## Principes produit confirmés

- DreamGlows est un produit autonome : Obsidian est une surface de référence et de repli, pas un prérequis.
- Les données appartiennent à la personne qui les crée. Une perte d’accès au SaaS ne doit jamais rendre ses rêves, chemins, actions ou historiques illisibles.
- Toutes les surfaces reposent sur un même modèle métier ouvert et versionné.
- DreamGlows doit proposer un export complet, documenté et réimportable, indépendamment de l’abonnement.
- Obsidian accueille une copie locale durable en Markdown lisible, enrichie de métadonnées structurées permettant une restauration fidèle.
- La synchronisation bidirectionnelle est une destination produit ; elle sera précédée par l’export/import puis par un miroir fiable vers Obsidian afin de maîtriser les conflits et la récupération.
- Le contrat détaillé des capacités et des surfaces est maintenu dans `shipglows_data/business/dreamglows-capability-map.md`.

## Prochaine étape produit

- consolider le même langage “rêve → pourquoi → chemin → prochaine action → progrès” sur toutes les surfaces, puis aligner les vues de progression et la messagerie utilisateur.
- établir le modèle de données ouvert, l’export/import complet et le miroir Obsidian avant de multiplier les implémentations clientes.
- valider humainement le copywriting de la landing Astro avant toute publication ou déclinaison vers d’autres pages.
- garantir que chaque surface puisse montrer le même statut de progression pour un utilisateur donné.
