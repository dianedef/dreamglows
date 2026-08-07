---
artifact: exploration_report
metadata_schema_version: "1.0"
artifact_version: "1.0.0"
project: "obsidian---goalflowz"
created: "2026-08-06"
updated: "2026-08-06"
status: decided
source_skill: sg-docs
scope: "naming and brand/domain selection"
owner: "user + Codex"
confidence: high
risk_level: low
security_impact: no
docs_impact: yes
linked_systems: ["branding", "dns-domain"]
evidence: []
depends_on: []
supersedes: []
next_step: "Proceed with implementation using DreamGlows naming"
---

# Exploration Report: DreamGlows naming and domain choice

## Starting Question

Quel nom de marque devons-nous retenir pour le produit (famille en `...glows`) et quel nom de domaine faut-il mémoriser ?

## Context Read

- Proposition de noms retenus par l’utilisateur (ex. `horizon`, `dream`, `goal`, `north`, `quest`, `momentum`, `road`, `next`, `ai`, `journey`) avec suffixe commun `...glows`.
- Choix utilisateur confirmé : `DreamGlows`.

## Decision

- Nom validé : **`DreamGlows`** (nom de marque).
- Domaine opérationnel principal retenu : **`dreamgleams.com`**.
- Données de référence au 2026-08-06 :
  - `dreamglows.com` : déjà enregistré (GoDaddy), parking actif, pas disponible en achat direct.
  - `dreamgleams.com` : WHOIS non assigné au moment de la vérification (non enregistré).
- Décision : priorité d’usage = **DreamGlows + dreamgleams.com**.

## Idee de produit

- Positionnement retenu : système de pilotage personnel et productif (objectifs, tâches, habitudes, journal) ancré sur une boucle de progression.
- Résultat attendu : une expérience claire de planification + exécution quotidienne qui aide à maintenir un rythme durable.
- Architecture d’exécution actuelle : plugin Obsidian et composants multi-surface dans le dépôt monorepo.

## Notes

- Cette exploration sert de mémoire projet pour éviter de refaire le choix de nom plus tard.
- `dreamglows.com` est réservé par un tiers ; on ne doit pas le choisir comme domaine principal.
- `dreamgleams.com` reste le backup sûr dès que la prise de domaine est confirmée en commande.

## Exploration Run History

| Date UTC | Prompt / Focus | Action | Result | Next step |
|----------|----------------|--------|--------|-----------|
| 2026-08-06 | Noms de marque suffixés par `glows` | Évaluation des options proposées, validation du meilleur choix | `DreamGlows` retenu | Vérifier en détail l’achat du domaine et créer configuration |
| 2026-08-06 | Sélection finale | Choix domaine principal opérationnel | `DreamGlows` + `dreamgleams.com` | Référencer ce couple dans la doc produit et réserver le domaine |
