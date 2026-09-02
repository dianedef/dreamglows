---
artifact: business_competitor_register
project: DreamGlows
created: 2026-09-02
updated: 2026-09-02
status: active
source: market review
---

# Registre concurrentiel DreamGlows

## Positionnement de comparaison

DreamGlows aide le grand public à transformer un rêve en progression visible :
**rêve → milestone → tâche → progrès**. Les concurrents sont évalués selon leur
capacité à soutenir cette boucle, et non seulement selon le nombre de fonctions
de productivité proposées.

## Day Planner — Obsidian

- **URL :** <https://github.com/ivan-lednev/obsidian-day-planner>
- **Statut :** concurrent direct sur la planification quotidienne dans Obsidian.
- **Date de revue :** 2 septembre 2026.
- **Modèle :** plugin communautaire gratuit et open source.
- **Signal de traction :** environ 2,7 k étoiles GitHub et 545 forks lors de la revue.

### Capacités vérifiées

- calendrier éditable en vue journalière et multi-jours ;
- tâches provenant des Daily Notes, du plugin Tasks, de calendriers en ligne
  via liens ICS et de propriétés Dataview ;
- créneaux planifiés en Markdown, avec création, déplacement et redimensionnement
  dans la timeline ;
- suivi du temps expérimental par chronomètres associés aux tâches.

### Lecture concurrentielle

Day Planner rend le **quand** très tangible : il transforme les tâches en blocs
de temps visibles. Il ne porte pas nativement la chaîne DreamGlows entre ambition,
milestone, prochaine action et progression. C'est l'espace de différenciation de
DreamGlows : faire du temps planifié un moyen de faire avancer un projet de vie,
pas une fin en soi.

Les demandes de la communauté montrent également l'intérêt d'un espace quotidien
réunissant focus, tâches non planifiées, capture et revue autour de la timeline.
Ce besoin est une opportunité, pas une preuve de demande représentative. Le
glisser-déposer et la synchronisation Markdown doivent conserver une source de
vérité unique : un défaut signalé a temporairement dupliqué une tâche après son
report à une autre date.

### Sources primaires

- Dépôt et guide fonctionnel : <https://github.com/ivan-lednev/obsidian-day-planner>
- Proposition communautaire d'un espace « Today » : <https://github.com/ivan-lednev/obsidian-day-planner/issues/882>
- Incident de duplication au déplacement : <https://github.com/ivan-lednev/obsidian-day-planner/issues/849>

## Axes produits inspirés, sans imitation

| Priorité | Axe | Valeur pour DreamGlows | Décision / limite |
| --- | --- | --- | --- |
| P1 | Espace « Aujourd'hui » | Réunit le prochain milestone, les tâches non planifiées, les créneaux du jour et un bilan léger pour réduire le passage du plan à l'action. | À concevoir comme une seule boucle DreamGlows, pas comme un tableau de productivité générique. |
| P1 | Timeboxing relié aux milestones | Planifier une tâche dans le temps tout en rendant visible son rattachement au rêve et à l'étape qu'elle fait progresser. | Préserver une source de vérité unique et traiter explicitement reports, conflits et surcharge. |
| P2 | Prévu vs réel | Comparer la durée prévue et le temps réellement consacré à une tâche, puis restituer cet apprentissage au niveau du milestone. | Commencer par un relevé volontaire ; ne pas faire de mesure de productivité une promesse. |
| P2 | Interopérabilité Markdown progressive | Permettre l'import ou l'export de tâches simples pour que DreamGlows s'insère dans un vault existant. | Définir un contrat minimal et réversible avant toute compatibilité avec un autre plugin. |
| P3 | Calendriers ICS facultatifs | Donner du contexte aux contraintes de temps existantes. | Reporter cette intégration : les liens ICS exposent des enjeux de confidentialité et ne différencient pas DreamGlows au premier ordre. |

## Prochaine preuve à obtenir

Tester, avec des utilisateurs correspondant au public grand public de DreamGlows,
si l'espace « Aujourd'hui » raccourcit réellement le passage d'un milestone à une
action planifiée puis achevée. Cette validation doit précéder tout engagement de
construction de calendrier ou d'intégration ICS.
