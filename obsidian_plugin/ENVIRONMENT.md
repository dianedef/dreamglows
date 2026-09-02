<!-- >>> ShipGlows development environment >>> -->
## ShipGlows development environment

- Environment schema: `shipglows-project-environment/v2`
- Server manager: `shipglows-devserver`
- Project kind: `obsidian-plugin`
- Assigned port: `not applicable (Obsidian plugin)`
- Canonical local URL: `not applicable (Obsidian plugin)`
- Obsidian artifacts: `main.js`, `manifest.json`, optional `styles.css`
- Explicit vault configuration: `SHIPGLOWS_OBSIDIAN_VAULT=<absolute-vault-path>` in `.shipglows.env`
- Synchronization mode: copy only to `<vault>\.obsidian\plugins\<plugin-id>` after explicit `s start`
- Obsidian validation boundary: build/watch and copied artifacts can be proven; enabling or reloading the plugin in Obsidian remains a manual action.
- Live status authority: Windows ShipGlows DevServer registry

Use the assigned URL for ordinary web projects. Browser extensions use their generated unpacked directory and browser extension manager instead of a normal page URL. Obsidian plugins use their declared build/watch script and an explicitly configured vault without an HTTP port. Do not substitute framework defaults such as Astro/Vite `4321` or a port from another project. Read the ShipGlows registry for live process and surface state; this durable document is not rewritten on start or stop.
<!-- <<< ShipGlows development environment <<< -->
