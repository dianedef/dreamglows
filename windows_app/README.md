# Windows app

Objectif: livrer l'expérience DreamGlows en application Windows.

## Status

- Implémentation backend en cours.
- Le client consomme `@dreamglows/path-core`, le même domaine Chemin canonique qu'Obsidian.
- La première tranche reste locale et hors ligne. Convex, l'identité et la synchronisation sont hors scope jusqu'à spécification de leur protocole.
- Le design visuel est volontairement différé ; l'interface devra seulement rendre le parcours essentiel fonctionnel et accessible.

## Persistance locale

`NodePathFileAdapter` stocke l'enveloppe JSON canonique dans un chemin absolu fourni par le futur hôte Windows. Les écritures passent par un fichier temporaire vidé sur disque, conservent la version précédente dans un fichier `.backup`, puis remplacent le document principal.

Une installation vide est migrée par le noyau vers une enveloppe canonique. Un document principal corrompu échoue sans être écrasé et indique si une sauvegarde restaurable existe. Si le document principal manque après une interruption mais que sa sauvegarde existe, celle-ci est chargée avec un état de récupération explicite.

## Vérification

- `pnpm --dir windows_app typecheck`
- `pnpm --dir windows_app test`
