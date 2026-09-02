# Tasks — DreamGlows

> **Priority:** 🟠 P1 high · 🟡 P2 normal · 🟢 P3 low · ⚪ deferred
> **Status:** 📋 todo · 🔄 in progress · ✅ done · ⛔ blocked · 💤 deferred
> **Priority last updated:** 2026-09-02 UTC

## Active product chantiers

🟢 [DreamGlows] task: Nom de marque et actif principal validés (`DreamGlows` / `dreamgleams.com`) | status: done | area: branding | id: shortlist-final-name | status_note: Décision validée en 2026-08-06 via exploration "domain-name-dreamglows"

🟠 [DreamGlows] task: Arbre de pilotage livré sur Obsidian et Chrome | status: done | area: product | id: hierarchical-goals-tasks-tree | status_note: Hiérarchie accessible Objectifs → jalons → tâches dans Obsidian et Rêves → objectifs → jalons → tâches dans Chrome; typecheck, tests et builds validés en 2026-08-07

🟠 [DreamGlows] task: Définir et versionner le modèle de données ouvert commun | status: in progress | area: product-foundation | id: open-domain-model | depends_on: dreamglows-capability-map | status_note: Enveloppe Chemin v1, migration legacy, relations, révisions et événements implémentés et testés dans Obsidian au commit 465d337; adoption des autres surfaces encore à faire | acceptance: Schéma documenté pour rêve, pourquoi, objectif, jalon, action, habitude, preuve, bilan, relations, révisions et migrations

🟠 [DreamGlows] task: Prouver l’export, le réimport et la migration Obsidian sans perte | status: todo | area: data-portability | id: portable-round-trip | depends_on: open-domain-model | acceptance: Un paquet exporté reste lisible dans Obsidian et recrée objets, relations, pièces jointes et historique

🟠 [DreamGlows] task: Livrer la synchronisation multiplateforme et le miroir durable vers Obsidian | status: todo | area: sync | id: cross-platform-sync-obsidian-mirror | depends_on: open-domain-model,portable-round-trip | acceptance: Fonctionnement hors ligne, reprise, historique, suppressions et absence de perte silencieuse prouvés

🟠 [DreamGlows] task: Harmoniser le parcours rêve → pourquoi → chemin → prochaine action | status: in progress | area: product-core | id: shared-core-journey | depends_on: open-domain-model | status_note: Aujourd'hui, Semaine, Parcours, Histoire et le tableau de bord partagent désormais les entités, dates et événements canoniques dans Obsidian; statistiques et autres surfaces restent à aligner | acceptance: Le même sens, le même chemin et le même progrès sont compris sur chaque surface livrée

🟡 [DreamGlows] task: Livrer Windows comme première surface grand public hors Obsidian | status: todo | area: windows | id: first-mainstream-client | depends_on: shared-core-journey,cross-platform-sync-obsidian-mirror | status_note: Windows-first confirmé par l’opératrice le 2026-09-02; Android suivra comme compagnon quotidien | acceptance: Vue d’ensemble, planification, revue et prochaine action forment un parcours cohérent sans exiger Obsidian

🟡 [DreamGlows] task: Recentrer Chrome sur la capture contextuelle et la prochaine action | status: todo | area: chrome | id: contextual-chrome-companion | depends_on: shared-core-journey,cross-platform-sync-obsidian-mirror | acceptance: Une page Web peut devenir une idée, une preuve ou une action reliée au bon rêve

🟡 [DreamGlows] task: Ajouter l’édition bidirectionnelle Obsidian et la résolution visible des conflits | status: todo | area: sync | id: bidirectional-obsidian-sync | depends_on: cross-platform-sync-obsidian-mirror | acceptance: Toute divergence est fusionnée sûrement ou présentée sans écrasement silencieux
