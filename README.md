# GoalFlowz

Structure actuelle du repo (mono-repo) :

- `obsidian_plugin/` : plugin Obsidian (code d’origine déplacé ici).
- `chrome_extension/` : surface navigateur Chrome (placeholder à implémenter).
- `windows_app/` : surface Windows (placeholder à implémenter).
- `android_app/` : surface Android (placeholder à implémenter).

## Commandes principales

Depuis la racine :

- `pnpm install --lockfile-only`
- `pnpm dev` : lance les scripts `dev` disponibles dans les packages.
- `pnpm build` : lance les scripts `build` disponibles dans les packages.
- `pnpm dev:obsidian-plugin` / `pnpm build:obsidian-plugin` : uniquement le plugin Obsidian.

## Notes

Le plugin Obsidian garde sa propre configuration dans `obsidian_plugin/` (`package.json`, `vite.config.ts`, `manifest.json`, etc.).

## Installation BRAT (Obsidian)

Le dépôt est prêt pour BRAT :

- `manifest.json` est conforme au format Obsidian.
- `main.js` et `versions.json` sont dans `obsidian_plugin/`.
- `obsidian_plugin/data.json` n'est plus versionné (données de runtime uniquement).

Pour tester en BRAT :

1. Installer le plugin **BRAT** dans Obsidian.
2. Ouvrir `Settings → BRAT → Add beta plugin`.
3. Ajouter le repo GitHub : `https://github.com/dianedef/obsidian---goalflowz`
4. Utiliser le manifest direct si demandé :  
   `https://raw.githubusercontent.com/dianedef/obsidian---goalflowz/main/obsidian_plugin/manifest.json`
5. Cocher le plugin `goalflowz` puis activer.
