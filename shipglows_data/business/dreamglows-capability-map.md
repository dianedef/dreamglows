---
artifact: product_context
metadata_schema_version: "1.0"
artifact_version: "1.0.0"
project: DreamGlows
created: "2026-09-02"
updated: "2026-09-02"
status: active
source_skill: sg-planning
scope: cross-platform-capabilities
owner: Diane
confidence: high
risk_level: high
target_user: "Toute personne qui veut avancer vers un rêve, un projet ou une ambition."
user_problem: "Garder vivant ce qui compte et disposer d’un chemin compréhensible pour avancer, sans perdre la maîtrise de ses données."
desired_outcomes: "Relier son pourquoi à un chemin clair, savoir quelle action entreprendre, voir ses progrès et conserver une copie durable de toute son histoire."
non_goals: "Transformer DreamGlows en gestionnaire de listes générique, imposer Obsidian, ou enfermer les données dans le SaaS."
security_impact: yes
docs_impact: yes
evidence:
  - "Décisions produit confirmées par l’opératrice le 2026-09-02 : public général, encouragement sans retenue, produit autonome et données accessibles hors SaaS."
  - "Le plugin Obsidian contient déjà rêves/objectifs, jalons, tâches, habitudes, progression et vues de planification."
  - "L’extension Chrome contient déjà un arbre Rêve → Objectif → Jalon → Tâche."
linked_artifacts:
  - shipglows_data/business/dreamglows-product.md
  - shipglows_data/workflow/TASKS.md
depends_on: []
supersedes: []
next_review: "2026-10-02"
next_step: "Définir le premier parcours Windows construit sur la fondation commune."
---

# Carte des capacités DreamGlows

## Contrat produit

DreamGlows aide chacun à avancer vers ce qui compte. Le produit part du **pourquoi**, transforme le rêve en chemin compréhensible, rend la prochaine action évidente et montre les progrès sans enfermer l’expérience dans des listes ou des estimations de temps.

Le SaaS apporte la continuité entre appareils, mais ne possède jamais l’unique copie utile. Les données restent exportables, lisibles et restaurables sans accès au service.

## Parcours de valeur prioritaire

1. **Donner du sens** — exprimer un rêve, pourquoi il compte et ce que sa réalisation changera.
2. **Tracer le chemin** — définir des objectifs et des jalons compréhensibles, leurs relations et les signes de progression.
3. **Avancer maintenant** — choisir ou recevoir une prochaine action adaptée au contexte, puis la terminer, la reporter ou la reformuler.
4. **Voir le mouvement** — retrouver les preuves de progrès, célébrer, comprendre les blocages et ajuster le chemin sans perdre l’histoire.
5. **Rester libre** — continuer à lire et exploiter ses données hors ligne, hors abonnement ou hors DreamGlows, puis les restaurer si souhaité.

## Carte des capacités communes

| ID | Capacité | Résultat utilisateur | État | Phase |
| --- | --- | --- | --- | --- |
| DG-CAP-01 | Rêve et pourquoi | Je formule ce qui compte, la vie désirée et mes propres signes de réussite. | Partiel dans Obsidian | Cœur produit |
| DG-CAP-02 | Chemin | Je relie objectifs, jalons, dépendances et alternatives dans un ordre compréhensible. | Partiel dans Obsidian et Chrome | Cœur produit |
| DG-CAP-03 | Prochaine action | Je sais quoi faire maintenant et pourquoi cette action compte. | Partiel dans Obsidian | Cœur produit |
| DG-CAP-04 | Progression et preuves | Je vois le chemin parcouru, les événements importants et ce qui a réellement changé. | Partiel dans Obsidian | Cœur produit |
| DG-CAP-05 | Réflexion et réorientation | Je peux faire le point, apprendre, modifier mon chemin et conserver son histoire. | À concevoir | Cœur produit |
| DG-CAP-06 | Continuité multiplateforme | Je retrouve un état cohérent sur mes appareils, y compris après une période hors ligne. | À construire | Fondation |
| DG-CAP-07 | Propriété et portabilité | J’exporte, lis, sauvegarde, déplace et réimporte toutes mes données sans abonnement actif. | À construire | Fondation |
| DG-CAP-08 | Copie durable Obsidian | Je dispose d’une copie locale lisible et exploitable dans un coffre Obsidian standard. | À construire | Fondation |
| DG-CAP-09 | Conflits et restauration | Aucune modification n’est perdue ; je comprends et résous les divergences, puis restaure un état antérieur. | À construire | Fondation puis maturité |
| DG-CAP-10 | Guidance accessible | Je comprends DreamGlows sans vocabulaire de productivité, grâce à un accompagnement, des exemples et des états vides utiles. | À harmoniser | Expérience |
| DG-CAP-11 | Encouragement choisi | Le produit soutient mon élan avec célébrations, rappels et habitudes sous mon contrôle. | Partiel dans Obsidian | Expérience |
| DG-CAP-12 | Confiance | Je comprends la confidentialité, les sauvegardes, la suppression, la récupération et la fermeture éventuelle du service. | À construire | Fondation |

La gamification existante (XP, or, séries) est une couche d’engagement optionnelle. Elle ne définit ni le cœur de la promesse ni le progrès réel d’une personne.

## Contrat de données ouvertes

Le modèle partagé doit représenter au minimum : rêve, pourquoi, objectif, jalon, action, habitude, note ou preuve de progrès, bilan et relation entre ces objets.

Chaque objet possède un identifiant stable, une version de schéma, ses dates de création et de modification, sa source, son état et, pour la synchronisation, une révision ainsi qu’une trace de suppression. Les relations utilisent les identifiants et non les chemins de fichiers.

Le paquet portable comprend :

- des fichiers Markdown lisibles avec frontmatter YAML pour les objets éditables dans Obsidian ;
- un manifeste JSON versionné pour l’intégrité, les relations, les révisions et le réimport exact ;
- les pièces jointes dans des chemins relatifs et documentés ;
- un historique ou journal d’événements suffisant pour comprendre et restaurer ;
- une documentation du format et des migrations entre versions.

L’export complet et le réimport doivent rester disponibles même sans abonnement. La copie portable ne dépend pas d’une clé détenue uniquement par DreamGlows.

## Rôle des surfaces

| Surface | Rôle principal | Capacités privilégiées | Hors rôle initial |
| --- | --- | --- | --- |
| Site Astro | Découverte et confiance | Promesse, exemples, explication de la propriété des données, accès aux produits | Héberger les données personnelles |
| SaaS commun | Continuité, coordination et récupération | Identité, synchronisation, révisions, sauvegardes, export, restauration | Être l’unique copie lisible |
| Obsidian | Atelier profond et copie durable | Pourquoi, planification, notes, bilans, édition hors ligne, export et récupération | Être obligatoire pour utiliser DreamGlows |
| Chrome | Capture dans le contexte du Web | Capturer une idée ou une preuve, relier une page, retrouver le pourquoi et la prochaine action | Devenir le tableau de bord complet |
| Android | Compagnon quotidien | Capture rapide, prochaine action, rappel choisi, validation, bref bilan, hors ligne | Planification complexe sur petit écran |
| Windows | Poste de pilotage complet | Vue d’ensemble, planification, revue, concentration et gestion des conflits | Dupliquer chaque interaction mobile |
| Noyau partagé | Cohérence métier | Schéma, validation, calcul de progression, migrations et protocole de synchronisation | Logique spécifique à une interface |

## Maturité de la continuité des données

1. **Portabilité prouvée** — export complet, validation du paquet, réimport et migration des données Obsidian existantes.
2. **Miroir sûr vers Obsidian** — le SaaS écrit une copie locale compréhensible ; une panne ou une fin d’abonnement ne retire rien à l’utilisateur.
3. **Synchronisation multiplateforme** — clients hors ligne, révisions, historique, reprises et suppressions cohérentes.
4. **Édition bidirectionnelle Obsidian** — ingestion des modifications locales, fusion déterministe quand elle est sûre et résolution explicite sinon.

Commencer directement par le bidirectionnel augmenterait fortement le risque de perte silencieuse. La progression ci-dessus protège d’abord la promesse de propriété, puis enrichit l’édition.

## Ordre de livraison

### P1 — Fondation de confiance

- figer le modèle de domaine ouvert et ses règles de migration ;
- prouver un aller-retour export → lecture/édition → import sans perte ;
- migrer les données locales actuelles du plugin Obsidian ;
- définir révisions, historique, suppressions et résolution de conflits ;
- rendre le parcours rêve → pourquoi → chemin → prochaine action cohérent dans le noyau partagé.

### P1 — Première continuité réelle

- identité et synchronisation du SaaS ;
- fonctionnement hors ligne et reprise ;
- miroir durable SaaS → Obsidian ;
- sauvegarde, restauration, export sans abonnement et procédure de sortie du service.

### P2 — Expérience grand public

- livrer Windows comme première surface grand public hors Obsidian et comme poste de pilotage complet ;
- adapter ensuite Chrome à la capture contextuelle ;
- livrer ensuite Android comme compagnon quotidien ;
- harmoniser onboarding, langage, progression, encouragement et accessibilité ;
- ajouter la résolution visible des conflits.

### P3 — Maturité

- édition bidirectionnelle Obsidian ;
- parité fonctionnelle choisie entre Windows et Android ;
- personnalisation avancée, automatisations et couches d’engagement validées par l’usage.

## Preuves d’acceptation

- Une nouvelle personne passe d’un rêve à une prochaine action compréhensible sans connaître les méthodes de productivité.
- La même personne retrouve le même pourquoi, le même chemin et le même progrès sur deux surfaces.
- Après coupure réseau, les modifications restent possibles puis se synchronisent sans perte silencieuse.
- Un export complet s’ouvre dans Obsidian et reste compréhensible sans DreamGlows.
- L’export peut recréer un compte ou une installation locale avec objets, relations, pièces jointes et historique intacts.
- Deux modifications concurrentes sont fusionnées de façon déterministe ou présentées clairement ; aucune n’est écrasée en silence.
- La perte d’abonnement ou l’indisponibilité du SaaS n’empêche ni la lecture ni la sauvegarde des données.

## Décisions, hypothèses et inconnues

### Confirmé

- public général et voix encourageante sans retenue ;
- DreamGlows autonome, Obsidian facultatif ;
- propriété et accessibilité durable des données ;
- modèle commun à toutes les plateformes ;
- export/import puis miroir Obsidian avant le bidirectionnel.
- Windows est la première surface grand public à livrer après Obsidian ; Android vient ensuite comme compagnon quotidien.

### Hypothèse à valider

- Le premier parcours Windows devrait réunir la vue d’ensemble, la planification, la revue et la prochaine action sans chercher immédiatement la parité complète avec Obsidian.

### Inconnues structurantes

- modèle exact de chiffrement compatible avec une copie locale autonome ;
- frontière entre état courant et journal d’événements dans le paquet portable ;
- niveau d’édition garanti directement dans les fichiers Obsidian lors de la première version du miroir.

## Non-objectifs de la fondation

- assistant IA autonome ;
- réseau social, communauté ou classement ;
- marketplace de modèles ;
- gamification complexe ;
- parité totale de chaque fonction sur chaque écran.

Ces sujets pourront être évalués après la preuve du parcours cœur et de la continuité des données.
