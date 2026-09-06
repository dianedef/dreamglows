# Windows app

Objectif: livrer l'expérience DreamGlows en application Windows.

## Statut

- Client Flutter Windows fonctionnel, orienté backend et hors ligne.
- Le contrat JSON versionné est partagé avec `@dreamglows/path-core`. TypeScript exécute le domaine dans Obsidian et Chrome ; le package pur `packages/path_core_dart` fournit le document et les commandes du client Flutter.
- La première tranche reste locale et hors ligne. Convex, l'identité et la synchronisation sont hors scope jusqu'à spécification de leur protocole.
- Le design visuel est volontairement différé ; l'interface Material rend le parcours essentiel utilisable au clavier et par formulaire.

## Persistance locale

`FilePathStorage` stocke le document de dépôt Chemin canonique dans le répertoire Application Support de Windows. Les écritures sont sérialisées, passent par un fichier temporaire vidé sur disque, conservent la version précédente dans un fichier `.backup`, puis remplacent le document principal.

Une installation vide crée un document canonique v1. Un document principal corrompu échoue sans être écrasé. Si le document principal manque après une interruption mais que sa sauvegarde existe, celle-ci est chargée. La restauration explicite est disponible dans l'adaptateur et sera exposée dans l'interface de récupération dédiée.

## Parcours livré

- créer un rêve, objectif, jalon, action, habitude, preuve ou bilan ; les relations sont validées par le cœur partagé ;
- voir le Chemin et la prochaine action ;
- planifier ou replanifier par date civile ;
- accomplir ou rouvrir ;
- consulter l'histoire durable ;
- retrouver le même document après redémarrage.

## Vérification

- `flutter analyze`
- `flutter test`
- `pnpm --dir packages/path-core test`

Le fixture `packages/path-core/fixtures/path-repository-v1.json` est chargé sans conversion par les suites TypeScript et Dart.

## Adoption du modèle

Le cœur Dart expose les requêtes JSON canoniques via `execute`, avec validation,
rejeu durable, suppression historique, rattachement et planification complète.
L’interface actuelle n’expose pas encore toutes ces commandes ; son alignement
produit reste une étape distincte. Le rendu natif et les sept types du sélecteur
ont été vérifiés dans la session Windows gérée, sans écrire de données personnelles.
Voir `shipglows_data/technical/common-model-adoption.md`.
