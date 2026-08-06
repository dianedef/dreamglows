# Spécification Orbit-concept (v1 - intégration GoalFlowz)

## 1) Objectif

Reproduire le loop produit d’Orbit-style (focus quotidien + progression gamifiée + rythme constant) dans l’existant Obsidian + Vue 3/Pinia, sans maquette.

- Garder la structure Obsidian existante (notes + dashboard interne).
- Ajouter la couche gamifiée : XP, Gold, niveau, streak, récompenses réutilisables sur tâches/objectif/habitudes.
- Utiliser le concept de “jour de focus” et de visibilité rapide dans `DayView`.

## 2) What exists aujourd’hui (point de départ)

### Fonctionnel
- Gestion objectifs/tâches dans Pinia et vues existantes.
- Vue journalière avec :
  - résumé + objectifs/tâches à venir,
  - calendrier de progression,
  - grille habitudes,
  - humeur / amour / énergie.
- Stockage local via `data.json`.
- Templating et settings Obsidian.

### Limites actuelles côté concept Orbit
- Pas de progression gamifiée persistée de façon centralisée (niveau/streak/gold/xp).
- Pas de récompense explicite sur transitions d’achèvement (task/goal/habit).
- Actions de récompense non reliées aux store operations.
- Les méthodes utilisées par les modales (`setGoals`, `createGoal`, `addTaskToGoal`, `removeTaskFromGoal`, `updateGoal` with full object) ne sont pas toutes présentes en cohérence.
- Vue jour n’affiche pas les métriques de progression.

## 3) Spécification fonctionnelle cible (version “Orbit-like” minimale)

### 3.1 Système de progression
- Définir un état global `gameProgression` dans settings:
  - `level`
  - `xp`
  - `totalXp`
  - `gold`
  - `streak`
  - `bestStreak`
  - `lastActivityDate`
  - `rewardedByDate` (anti-double récompense)
- Règles:
  - `task` terminé = récompense XP + Gold.
  - `goal` terminé = récompense plus forte.
  - `habit` validée pour une date = récompense journalière.
  - récompense idempotente par entité/jour (clé anti-doublon).
  - montée de niveau selon barème configurable.

### 3.2 Triggers de récompense
- Récompense de `task` :
  - quand une tâche passe de non-`done` vers `done`.
  - si créée déjà en `done`, récompense immédiate.
- Récompense de `goal` :
  - quand un goal passe de non-`done` vers `done`.
- Récompense de `habit` :
  - quand une habitude est cochée `true` pour une date.

### 3.3 Persistance
- `gameProgression` inclus dans les données persistées via `GoalFlowz.savePluginData`.
- `validateSettings` doit hydrater `gameProgression` de manière robuste depuis `data.json`.
- Toute modification de progression met à jour les settings persistés.

### 3.4 UI
- `DayView` affiche une carte “Progression” :
  - niveau, XP / prochain palier, Gold,
  - streak actuel + meilleur streak,
  - jauge de progression du niveau.

## 4) Work completed (phase actuelle)

- `types/settings.ts`
  - ajout de `GameProgression`, `DEFAULT_GAME_PROGRESSION`, champ `gameProgression`.
- Nouveau store `stores/progressionStore.ts`
  - xp/gold/level/streak,
  - anti double reward,
  - montée de niveau.
- `main.ts`
  - intégration du store progression,
  - chargeur de progression dans `initializeStores`,
  - validateur settings incluant `gameProgression`.
- `savePluginData` persisté avec settings + goals/tasks.
- `stores/tasksStore.ts`
  - récompense sur création en `done` et transition vers `done`.
- `stores/goalsStore.ts`
  - ajout de `setGoals`, `createGoal`, `addTaskToGoal`, `removeTaskFromGoal`,
  - `updateGoal` supporte appels par id + patch, ou par objet complet,
  - récompense sur transition vers `done`.
- `stores/habitsStore.ts`
  - récompense sur bascule `false -> true` (par date).
- `views/DayView.vue`
  - import du progressionStore,
  - computed `progression`,
  - carte résumé “Progression”.
- `styles/day-view.css`
  - style de la carte progression et barre de XP.
- `views/ProfileView.vue` + `styles/profile-view.css`
  - écran profil mini avec résumé progression, répartition par source, historique récent.
- `views/MainView.vue`
  - nouvelle navigation intégrant le mode `profile`.
- `styles/RegisterStyles.ts`
  - enregistrement des styles du profil.

## 5) Risques / dépendances connus

- Le type `Goal` dans le code actuel est historiquement hétérogène (`status` mixte/enum, champs optionnels différents selon vues). Les méthodes `Goal`/`tasks` ont été rendues robustes mais strictement typées avec cast minimal.
- La logique gamification est initialement “simple” (pas encore boutique / inventaire / quêtes secondaires), volontairement alignée sur la phase conceptuelle.

## 6) Itération livrée (v1.1)

1. ✅ Mini log de gains dans la journée (XP/Gold au moment de la récompense).
2. ✅ Milestones de niveau (`niveau 5`, `10`, `20`) avec bonus.
3. ✅ Écran “Profile” mini (répartition par source, historique, résumé progression).
4. ⏳ Écrire une route export/import des stats de progression (prochaine étape).
