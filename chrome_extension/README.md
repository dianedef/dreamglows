# DreamGlows Chrome Extension

La surface navigateur sert à capturer un élément et le rattacher à son chemin :

- suivre ses rêves via des objectifs structurés,
- décliner ces objectifs en milestones,
- garder une vue rapide sur l’avancement,
- consulter et traiter les tâches associées.

## État actuel

La surface Chrome est en cours d’harmonisation avec l’implémentation Obsidian.

### Objectif de cette surface

Fournir un accès léger au même modèle de pilotage:

- capture des sept types ordinaires du modèle commun,
- arbre typé `Rêve → Objectif → Jalon → Action`, avec habitudes, preuves et réflexions,
- navigation rapide avec expansion, fil d’Ariane et focus sur une branche,
- réorganisation par glisser-déposer avec validation de la hiérarchie,
- statut, progression et échéance visibles dans chaque nœud,
- stockage local au format canonique partagé.

## Adoption du modèle commun (septembre 2026)

L’éditeur `src/setup/index.html?type=update` lit et écrit le dépôt canonique
`repositoryVersion: 1` via `@dreamglows/path-core`. Le service worker sérialise
les écritures et refuse une révision périmée. Les noms UI « Objectif » et
« Action » correspondent à `goal` et `action`, y compris les actions imbriquées.

La migration sauvegarde la valeur historique exacte de `tree-store` sous
`dreamglows-tree-backup-v1` avant de créer `dreamglows-path-v1`. Elle garde les
champs inconnus, les données de vue et la provenance des dates de migration.
Le stockage historique reste intact. Une sauvegarde ou une écriture échouée
interrompt l’opération ; un redémarrage reprend depuis la sauvegarde.

L’arbre projette rêves, objectifs, jalons, actions, habitudes, preuves et réflexions.
« Ajouter » ouvre une capture typée. « Modifier les détails » permet d’éditer le
pourquoi, la description et le parent compatible ; le dialogue natif garde le focus
clavier. Le type d’un élément existant reste immuable. Les sessions Focus restent
intactes dans le document, avec leurs relations conservées lors des autres éditions. Les modifications passent par les commandes communes,
avec journal canonique et suppressions logiques. Un enfant masqué vivant empêche
la suppression de son parent. Double-clic sur le titre ou F2 ouvre sa modification.
Les erreurs d’enregistrement sont visibles ; le téléchargement de récupération
contient le document de base et les modifications locales avant rechargement.
Ce fichier de récupération n’est pas un export portable du produit.

Preuves locales : `node node_modules/vitest/vitest.mjs run --threads false`,
`node node_modules/vue-tsc/bin/vue-tsc.js --noEmit`, builds Chrome et Firefox.
Après un build Chrome, `node scripts/canonical-extension-proof.mjs` teste dans
un profil Chromium temporaire la migration, la capture des sept types, une édition du pourquoi/de la description,
un rattachement compatible, leur persistance, le rechargement et le refus visible d’une deuxième fenêtre périmée avec récupération.
Aucun profil personnel n’est lu ou modifié.

Les pages popup/options/iframe restent leurs interfaces préparatoires existantes.
Le test Chromium isolé ne valide ni le profil Chrome personnel, ni le runtime
Firefox. Synchronisation distante, miroir Obsidian et résolution interactive des
conflits restent les étapes ultérieures du produit.
