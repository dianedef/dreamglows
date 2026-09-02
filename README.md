# DreamGlows

DreamGlows est une plateforme de pilotage personnel centrée sur une idée simple :

- atteindre ses rêves via une chaîne **Objectifs → Milestones → Tâches**,
- suivre les progrès sur un tableau clair,
- garder une exécution quotidienne disciplinée.

Le même langage produit s’applique à toutes les surfaces du projet.

## Portée produit (mono-repo)

- `obsidian_plugin/` : surface Obsidian (plugin opérationnel).
- `chrome_extension/` : surface navigateur Chrome (alignement actif).
- `windows_app/` : surface Windows (alignement actif).
- `android_app/` : surface Android (alignement actif).

## Ce que propose DreamGlows, globalement

### 1) Vision opérationnelle

- Donner une structure à des ambitions longues (rêves, objectifs stratégiques).
- Les découper en milestones réalisables et mesurables.
- Lier les tâches à chaque étape.
- Visualiser l’avancement (jour / semaine / global).

### 2) Utilisation cohérente par surface

- Obsidian : pilotage quotidien dans l’environnement de notes.
- Chrome/Windows/Android : expérience alignée vers la même boucle objectif-milestone-tâches-progression.

### 3) État actuel

- Obsidian est la première surface active.
- Les autres surfaces montent progressivement pour préserver une promesse produit homogène.

## Commandes principales

Depuis la racine :

- `pnpm install --lockfile-only`
- `pnpm dev` : lance les scripts `dev` disponibles dans les packages.
- `pnpm build` : lance les scripts `build` disponibles dans les packages.
- `pnpm dev:obsidian-plugin` / `pnpm build:obsidian-plugin` : uniquement le plugin Obsidian.

## Installation BRAT (Obsidian)

Les releases GitHub sont prêtes pour BRAT :

- chaque release publie `manifest.json`, `main.js` et `styles.css` comme assets ;
- la version du tag, de la release et du manifeste est identique ;
- `obsidian_plugin/data.json` n’est pas versionné (données de runtime uniquement).

Pour tester en BRAT :

1. Installer le plugin **BRAT** dans Obsidian.
2. Ouvrir `Settings → BRAT → Add beta plugin`.
3. Ajouter le repo GitHub : `https://github.com/dianedef/dreamglows`.
4. Sélectionner la dernière release ou figer la version souhaitée.
5. Cocher le plugin `dreamglows` puis l’activer.
