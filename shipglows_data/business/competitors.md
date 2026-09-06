---
artifact: business_competitor_register
project: DreamGlows
created: 2026-09-02
updated: 2026-09-03
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

### Synthèse décisionnelle

Day Planner est un concurrent direct sur le moment où une intention devient un
créneau concret. Sa force n'est pas de gérer un projet complet : c'est de rendre
le **quand** manipulable, dans l'environnement Markdown que l'utilisateur possède
déjà. DreamGlows doit donc reprendre cette lisibilité temporelle, mais la relier
à la raison d'agir et à une preuve de progression plutôt qu'à la seule occupation
du calendrier.

### Capacités vérifiées

- calendrier éditable en vue journalière et multi-jours ;
- tâches provenant des Daily Notes, du plugin Tasks, de calendriers en ligne
  via liens ICS et de propriétés Dataview ;
- créneaux planifiés en Markdown, avec création, déplacement et redimensionnement
  dans la timeline ;
- suivi du temps expérimental par chronomètres associés aux tâches.

### Forces à retenir

- **Manipulation directe :** créer, déplacer et redimensionner un bloc dans une
  timeline donne un retour immédiat sur la journée.
- **Faible friction d'adoption :** le plugin réutilise les Daily Notes et plusieurs
  formats de tâches existants au lieu d'imposer un modèle fermé.
- **Contexte temporel riche :** la vue multi-jours, la mini-timeline et les flux
  ICS aident à planifier en tenant compte des contraintes réelles.
- **Interopérabilité locale :** le Markdown reste la source de vérité, ce qui
  rend le fonctionnement compréhensible et récupérable hors du plugin.

### Limites et signaux de risque

- Le modèle reste centré sur la tâche et le calendrier : le lien natif entre une
  action, un milestone, un rêve et le sens personnel de l'effort n'est pas sa
  promesse.
- Le time-tracking est explicitement expérimental et ses blocs ne sont pas encore
  déplaçables par glisser-déposer.
- L'issue #882, fermée comme « not planned », révèle un besoin non couvert autour
  d'un espace quotidien réunissant focus, timeline, tâches non planifiées, capture
  et revue. C'est un signal de besoin, pas une preuve de demande représentative.
- L'issue #849 documente un cas de duplication après déplacement d'une tâche vers
  une date future. Pour DreamGlows, tout déplacement doit être transactionnel,
  idempotent et vérifié par une preuve de non-duplication.

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

### Ce que DreamGlows peut faire mieux

1. **Donner du sens au créneau :** afficher le rêve, le pourquoi et le milestone
   directement depuis un bloc planifié, avec une prochaine action claire.
2. **Fermer la boucle de la journée :** proposer « Aujourd'hui » comme un parcours
   léger — intention, action, focus, preuve, bilan — et non comme un calendrier
   supplémentaire.
3. **Protéger l'histoire :** conserver les reports, les sessions Focus, les
   changements et les conflits sans écrasement silencieux, avec export lisible.
4. **Rester accessible hors d'Obsidian :** offrir la même boucle sur Windows puis
   Android/Chrome, Obsidian restant une copie durable et une surface profonde,
   pas une dépendance.

### Sources primaires

- Dépôt et guide fonctionnel : <https://github.com/ivan-lednev/obsidian-day-planner>
- Proposition communautaire d'un espace « Today » : <https://github.com/ivan-lednev/obsidian-day-planner/issues/882>
- Incident de duplication au déplacement : <https://github.com/ivan-lednev/obsidian-day-planner/issues/849>

## Paysage concurrentiel élargi

Cette sélection couvre les produits qui concurrencent une partie significative de
la boucle DreamGlows. Leur présence dans le registre ne signifie pas qu'ils portent
tous la même promesse : certains concurrencent le chemin vers un objectif, d'autres
la planification quotidienne, la mesure de progression ou la surface Obsidian.

| Concurrent | Catégorie | Proximité | Menace principale | Apprentissage prioritaire |
| --- | --- | --- | --- | --- |
| Amazing Marvin | Objectifs et productivité personnelle | Très forte | Relie déjà objectifs, projets, tâches, habitudes et check-ins dans une expérience configurable. | Transformer une ambition en actions sans produire de complexité excessive. |
| Sunsama | Planification quotidienne guidée | Très forte | Propose un rituel complet de planification, timeboxing, charge réaliste, focus et revue. | Concevoir une boucle « Aujourd'hui » calme et guidée. |
| Goalscape | Gestion visuelle des objectifs | Très forte | Rend immédiatement visible une hiérarchie d'objectifs, leur importance et leur progression agrégée. | Faire comprendre le chemin et les priorités d'un seul regard. |
| TickTick | Productivité grand public tout-en-un | Forte | Réunit tâches, calendriers, habitudes, Pomodoro, statistiques et synchronisation multiplateforme. | Offrir une adoption rapide et une excellente continuité quotidienne. |
| Strides | Suivi d'objectifs et d'habitudes | Forte | Propose plusieurs modèles de mesure, des milestones, des rapports et une vue quotidienne. | Montrer des preuves de progression adaptées à la nature de chaque rêve. |
| Todoist | Gestion de tâches grand public | Moyenne à forte | Dispose d'une capture très fluide, d'une large distribution et de vues projets/Today/Upcoming. | Rendre la prochaine action plus rapide à capturer et retrouver. |
| Routine | Tâches, calendrier et notes | Moyenne à forte | Centralise capture, tâches, réunions, projets et notes sur toutes les grandes plateformes. | Réduire les changements de contexte entre intention, information et action. |
| Notion | Espace de travail configurable | Moyenne | Permet de reconstruire avec des bases et modèles presque toute la chaîne objectifs → projets → tâches → journal. | Être plus guidé et immédiat qu'un système à construire soi-même. |
| Time Blocks | Plugin Obsidian de timeboxing | Forte dans Obsidian | Combine backlog Tasks, planning hebdomadaire visuel, glisser-déposer et calendrier externe. | Relier une timeline locale au chemin DreamGlows sans dupliquer les données. |
| Prisma Calendar | Plugin Obsidian de planification avancée | Forte dans Obsidian | Cumule calendrier, timeline, récurrence, statistiques, capacité, time-tracking et ICS. | Maintenir une proposition simple face à un concurrent très riche fonctionnellement. |
| Task Calendar | Plugin Obsidian de gestion temporelle | Moyenne dans Obsidian | Regroupe les tâches datées et les rappels dans une expérience dédiée. | Garantir la fiabilité des tâches planifiées et des notifications. |

### Amazing Marvin

- **URL :** <https://amazingmarvin.com/>
- **Statut :** concurrent direct sur la transformation des objectifs en actions.
- **Capacités vérifiées :** objectifs finaux ou continus, projets, tâches, habitudes,
  métriques de progression, attentes hebdomadaires et check-ins configurables.
- **Lecture DreamGlows :** c'est le concurrent fonctionnel le plus proche. DreamGlows
  doit proposer un chemin plus lisible, plus émotionnel et moins configurable avant
  d'être utile.
- **Source primaire :** <https://help.amazingmarvin.com/en/articles/5015479-goals-objectives>

### Sunsama

- **URL :** <https://www.sunsama.com/>
- **Statut :** concurrent direct sur le passage du plan à la journée réelle.
- **Capacités vérifiées :** planification et clôture guidées, estimation de charge,
  report, timeboxing, objectifs hebdomadaires, focus, temps prévu/réel et intégrations.
- **Lecture DreamGlows :** sa force est le rituel. DreamGlows peut le dépasser en
  faisant remonter chaque action quotidienne jusqu'au rêve et à son pourquoi.
- **Source primaire :** <https://help.sunsama.com/docs/usage-guides/daily-planning/>

### Goalscape

- **URL :** <https://goalscape.com/>
- **Statut :** concurrent direct sur la représentation du chemin et de la progression.
- **Priorité de veille :** analyse approfondie suivante.
- **Capacités vérifiées :** carte radiale d'objectifs et sous-objectifs, importance
  visuelle, tags Now/Next, progression agrégée, notes, pièces jointes et temporalité.
- **Hypothèse à examiner :** sa représentation peut rendre la structure très claire,
  mais doit être évaluée pour les grands chemins, la prochaine action et l'usage mobile.
- **Source primaire :** <https://goalscape.com/product-overview/>

### TickTick

- **URL :** <https://ticktick.com/>
- **Statut :** concurrent direct grand public sur l'exécution quotidienne.
- **Capacités vérifiées :** tâches, multiples vues calendrier, habitudes, Pomodoro,
  statistiques, rappels, filtres, collaboration et synchronisation multiplateforme.
- **Lecture DreamGlows :** sa couverture fonctionnelle est une référence, mais elle
  reste organisée autour de la productivité et non d'un rêve porteur de sens.
- **Source primaire :** <https://ticktick.com/?language=en_>

### Strides

- **URL :** <https://www.stridesapp.com/>
- **Statut :** concurrent direct sur la mesure des objectifs et des habitudes.
- **Priorité de veille :** analyse approfondie suivante.
- **Capacités vérifiées :** quatre types de trackers — habitude, cible, moyenne et
  projet — avec milestones, rythme attendu, rapports, rappels et vue Daily Goals.
- **Hypothèse à examiner :** son modèle de mesure est riche, mais il faut vérifier
  comment il accompagne les objectifs qualitatifs et évite une progression artificielle.
- **Source primaire :** <https://www.stridesapp.com/>

### Todoist

- **URL :** <https://www.todoist.com/>
- **Statut :** concurrent adjacent majeur sur la capture et la gestion des actions.
- **Capacités vérifiées :** capture en langage naturel, projets, récurrence, filtres,
  vues Today/Upcoming et calendrier, modèles personnels et multiplateforme.
- **Signal stratégique :** Todoist a retiré son expérimentation Goals en août 2026,
  tout en conservant descriptions de projets et indicateurs de progression. Cela
  confirme que le problème du « pourquoi » reste important mais difficile à simplifier.
- **Sources primaires :** <https://www.todoist.com/> et
  <https://www.todoist.com/help/todoist/product-updates/goals-beta-retired-VKe2PuGn5>

### Routine

- **URL :** <https://routine.co/>
- **Statut :** concurrent adjacent sur l'espace quotidien unifié.
- **Capacités vérifiées :** tâches, calendrier, réunions, projets, notes, capture
  universelle et présence macOS, Windows, Linux, iOS, Android et Web.
- **Lecture DreamGlows :** référence pour la continuité entre capture contextuelle,
  organisation et action, notamment entre Chrome, Windows et Android.
- **Source primaire :** <https://routine.co/>

### Notion

- **URL :** <https://www.notion.so/>
- **Statut :** concurrent indirect par substitution et personnalisation.
- **Capacités vérifiées :** pages, bases relationnelles, vues calendrier/tableau,
  modèles d'objectifs, de projets, de tâches, de journal et automatisations.
- **Lecture DreamGlows :** Notion permet de construire un système puissant, mais
  demande de le concevoir et de l'entretenir. DreamGlows doit fournir cette cohérence
  nativement, avec moins de configuration et une portabilité explicite.
- **Source primaire indicative :** <https://www.notion.so/notion/Roadmap-e69981032645479888c14d32fdc13185>

### Concurrents fonctionnels dans Obsidian

#### Time Blocks

- **URL :** <https://community.obsidian.md/plugins/time-blocks>
- **Capacités vérifiées :** planning hebdomadaire, backlog issu du plugin Tasks,
  glisser-déposer, créneaux de 15 minutes, redimensionnement, vue jour et Google Calendar.
- **Lecture DreamGlows :** concurrent direct de toute future timeline hebdomadaire.

#### Prisma Calendar

- **URL :** <https://community.obsidian.md/plugins/prisma-calendar>
- **Capacités vérifiées :** calendriers multi-échelles, timeline, récurrence, inbox,
  time-tracking, capacité, statistiques, filtres, ICS et nombreuses personnalisations.
- **Lecture DreamGlows :** benchmark de profondeur fonctionnelle, avec un risque de
  surcharge que DreamGlows peut éviter par une expérience plus guidée.

#### Task Calendar

- **URL :** <https://community.obsidian.md/plugins/task-calendar>
- **Capacités vérifiées :** calendrier de tâches Obsidian, planification temporelle
  et alarmes configurables pour événements et tâches.
- **Lecture DreamGlows :** benchmark ciblé pour les rappels et la cohérence d'état
  entre une tâche Markdown et sa représentation temporelle.

## Ordre des prochaines analyses

1. **Goalscape** — analyse documentaire approfondie réalisée le 3 septembre 2026 ;
   prochaine preuve : essai pratique du parcours individuel et de l'expérience mobile.
2. **Strides** — analyse documentaire approfondie réalisée le 3 septembre 2026 ;
   prochaine preuve : essai pratique des quatre trackers et de l'export Plus.
3. **Amazing Marvin** — comparaison complète de la chaîne objectif → action → bilan.
4. **Sunsama** — décomposition détaillée du rituel « Aujourd'hui ».

## Analyse approfondie — Goalscape

### Promesse et public observés

Goalscape promet une gestion visuelle des objectifs dans laquelle le but principal,
ses sous-objectifs, leur importance relative et leur progression restent visibles
sur une même carte radiale. Son discours actuel couvre les personnes seules, les
petites équipes et les entreprises ; les fonctions d'attribution, de commentaires,
de partage et de SSO montrent néanmoins une orientation professionnelle marquée.

### Modèle mental

Le modèle part d'un objectif central, décomposé en niveaux successifs jusqu'aux
actions concrètes. Deux encodages visuels portent l'essentiel du sens :

- la taille d'un secteur représente son importance relative dans son parent ;
- son remplissage représente sa progression, agrégée des feuilles vers la racine.

L'importance des enfants d'un même parent constitue un arbitrage : agrandir l'un
réduit la place relative des autres. Les tags Now et Next, les dates, responsables,
couleurs et filtres servent ensuite à extraire ce qui demande une attention immédiate.

### Parcours fonctionnel reconstitué

1. Créer ou importer une carte, ou demander une première décomposition à l'IA.
2. Définir l'objectif central et ses sous-objectifs à plusieurs niveaux.
3. Pondérer leur importance et enrichir chaque élément avec dates, notes, médias,
   responsables, tags et couleurs.
4. Mettre à jour la progression des éléments opérationnels ; observer sa remontée
   dans toute la hiérarchie.
5. Filtrer par Now, Next, date, progression, personne, tag ou couleur pour agir.
6. Réviser fréquemment la carte et adapter structure, priorités et progression.

### Forces

- **Vue d'ensemble distinctive :** structure, priorité et progression sont encodées
  dans une seule représentation, sans nécessiter plusieurs tableaux de bord.
- **Arbitrage explicite :** la pondération relative matérialise qu'un temps ou une
  énergie limités ne permettent pas de tout traiter comme prioritaire.
- **Progression systémique :** une action locale produit un effet visible jusqu'à
  l'objectif central, mécanique très proche de la promesse DreamGlows.
- **Révision vivante :** déplacer, repondérer et filtrer encourage l'adaptation du
  chemin plutôt que le maintien artificiel d'un plan initial.
- **Portabilité supérieure à beaucoup de SaaS :** exports GSP, PNG, CSV, XLSX et
  DOCX, import GSP/CSV et collage d'une liste indentée.

### Limites et risques pour DreamGlows

- La carte encode très bien le **quoi** et le **poids**, mais le pourquoi personnel
  n'est qu'un contenu possible dans les notes, pas un objet central garanti.
- Une progression en pourcentage peut donner une fausse précision pour les rêves
  qualitatifs, exploratoires ou dont le chemin change en cours de route.
- Les niveaux profonds et les intitulés longs peuvent réduire la lisibilité ; le
  produit fournit centrage, repli de niveaux et affichage détaillé pour compenser.
- La prochaine action existe principalement par tags et listes filtrées : le passage
  vers une journée réaliste, une session de focus et une preuve vécue est moins central.
- La feuille de route publique indiquait encore une amélioration mobile pour le
  troisième trimestre 2026 lors de la revue ; la maturité mobile doit donc être testée.
- Les exports sont réels, mais ils ne prouvent pas à eux seuls une copie locale
  lisible, éditable et réimportable avec tout l'historique comme l'exige DreamGlows.

### Modèle économique observé

- essai Pro de 14 jours, puis lecture illimitée annoncée après expiration ;
- offre Pro individuelle/petite équipe à 7,50 € par utilisateur et par mois avec
  facturation annuelle, ou 9 € en facturation mensuelle lors de la revue ;
- offre Enterprise avec serveur dédié, marque, sous-domaine, SSO et support renforcé.

### Enseignements pour DreamGlows

1. Donner au Chemin une vue d'ensemble compacte où hiérarchie, importance et état
   sont perceptibles avant toute lecture détaillée.
2. Distinguer trois notions que Goalscape rapproche : **importance**, **progression
   déclarée** et **preuves réellement accumulées**.
3. Faire remonter les preuves des actions vers les milestones et le rêve, mais
   permettre une correction humaine de la progression agrégée.
4. Rendre l'arbitrage explicite sans imposer un total de 100 % : demander « qu'est-ce
   qui compte maintenant ? » peut être plus accessible au grand public.
5. Conserver le pourquoi comme champ visible du rêve et de chaque branche majeure,
   pas comme une note secondaire.
6. Ajouter un mode Focus du Chemin : masquer la complexité tout en conservant le
   contexte rêve → milestone → prochaine action.

### Ce qu'il ne faut pas copier tel quel

- la carte radiale comme représentation unique sur tous les appareils ;
- le pourcentage comme vérité universelle de l'avancement ;
- une profondeur hiérarchique illimitée sans aide à la simplification ;
- une orientation collaboration/entreprise avant d'avoir prouvé le parcours personnel.

### Sources primaires

- Produit : <https://goalscape.com/product-overview/>
- Méthode et tutoriel : <https://goalscape.com/templates/goalscape-tour/>
- Tarifs, exports et feuille de route : <https://goalscape.com/pricing/>
- Méthode « Define, Prioritize, Track, Repeat » : <https://goalscape.com/how-to/>

## Analyse approfondie — Strides

### Promesse et public observés

Strides se présente comme un outil personnel permettant de suivre objectifs et
habitudes au même endroit, avec rappels, graphiques, rapports et accompagnement
SMART. L'expérience publique observée est centrée sur l'écosystème Apple : iPhone,
iPad et Apple Watch ; une application Mac est annoncée et Android renvoie vers une
liste d'attente lors de la revue.

### Modèle mental

Sa force principale est de ne pas appliquer le même calcul à tous les objectifs.
L'utilisateur choisit parmi quatre types de trackers :

| Type | Usage | Mécanique |
| --- | --- | --- |
| Habit | Comportement à construire ou réduire | Oui/non, fréquence, limites, rappels et séries. |
| Target | Valeur à atteindre avant une date | Valeur courante comparée à une ligne de rythme. |
| Average | Valeur moyenne à maintenir | Moyenne par période ou glissante. |
| Project | Résultat composé d'étapes | Milestones, checklist, pourcentage, dates et rythme. |

Le rouge et le vert signalent si le rythme attendu est tenu. La vue Daily Goals
filtre ce qui doit être renseigné maintenant ; les rapports permettent ensuite une
lecture par semaine, mois, année ou depuis l'origine.

### Parcours fonctionnel reconstitué

1. Choisir un modèle ou créer un tracker personnalisé.
2. Sélectionner sa mécanique, sa cible, sa fréquence, ses dates et rappels.
3. Enregistrer chaque occurrence ou valeur, avec une note facultative.
4. Voir immédiatement l'état à faire, fait, manqué, ignoré et le rythme attendu.
5. Consulter historique, graphiques, séries, taux de réussite et rapports filtrés.
6. Inviter, si souhaité, un partenaire de responsabilité sur certains trackers.

### Forces

- **Mesure adaptée :** quatre modèles évitent de réduire toutes les ambitions à une
  simple checklist ou à un unique pourcentage.
- **Boucle quotidienne très courte :** la vue du jour montre uniquement ce qui doit
  être enregistré, avec gestes rapides et rappels flexibles.
- **Rythme intelligible :** la comparaison entre valeur actuelle et valeur attendue
  répond à « suis-je en bonne voie ? », pas seulement « combien ai-je fait ? ».
- **Historique corrigeable :** les saisies passées peuvent être consultées, annotées,
  modifiées ou annulées, et une journée peut être ignorée sans devenir un échec.
- **Progression motivante :** graphiques, séries, célébrations, rapports et partage
  facultatif rendent les petits progrès visibles.

### Limites et risques pour DreamGlows

- Le produit excelle dans la mesure mais représente peu les dépendances, alternatives
  et transformations d'un chemin complexe.
- Le pourquoi et l'histoire qualitative restent secondaires face aux nombres,
  couleurs, séries et taux de réussite.
- La notion de « journée parfaite » peut encourager une logique tout-ou-rien contraire
  à un accompagnement bienveillant des rêves longs et irréguliers.
- Une ligne de rythme suppose une trajectoire assez prévisible ; elle est moins adaptée
  à l'exploration, à l'apprentissage ou aux périodes de pause légitime.
- La couverture multiplateforme publique est nettement plus étroite que la cible
  DreamGlows, notamment avec Android encore en attente lors de la revue.
- Synchronisation, sauvegarde, export et verrouillage sont annoncés dans l'offre Plus ;
  l'export doit être testé pour évaluer lisibilité, complétude et réimportabilité.
- La FAQ reconnaît un rare problème de cache pouvant produire des doublons ou des
  éléments absents dans la vue du jour, avec recalcul manuel des états.

### Modèle économique observé

- formule gratuite limitée aux trois principaux objectifs ou habitudes ;
- offre Plus par abonnement mensuel ou annuel, ainsi qu'une option à paiement unique ;
- Plus déverrouille notamment trackers illimités, synchronisation iCloud, sauvegardes,
  rapports, tags, filtres, archivage, export, notes et verrouillage de confidentialité.

Les montants n'étaient pas publiés dans la FAQ consultée ; ils ne sont donc pas
inscrits dans ce registre sans vérification dans l'application ou l'App Store local.

### Enseignements pour DreamGlows

1. Associer à chaque milestone une **méthode de progression** choisie : binaire,
   valeur cible, cadence, moyenne, jalons, preuve qualitative ou combinaison.
2. Séparer l'état objectif (« valeur enregistrée »), l'interprétation (« en bonne
   voie ») et le ressenti de la personne (« cela avance-t-il vraiment ? »).
3. Construire une vue quotidienne minimaliste qui demande seulement les validations
   utiles, sans exposer tout le système du Chemin.
4. Autoriser pause, exception, correction et reprise sans casser l'histoire ni
   transformer une journée difficile en échec permanent.
5. Ajouter des notes ou preuves aux mesures pour que le progrès reste explicable,
   portable et humain.
6. Utiliser les célébrations comme reconnaissance d'un mouvement réel, avec contrôle
   utilisateur, plutôt que comme récompense d'une série arbitraire.

### Ce qu'il ne faut pas copier tel quel

- le rouge/vert comme jugement dominant ;
- la « journée parfaite » comme objectif universel ;
- les séries comme définition principale de la réussite ;
- l'enfermement de l'export et des sauvegardes derrière l'abonnement ;
- une expérience centrée sur un seul écosystème matériel.

### Sources primaires

- Produit et quatre trackers : <https://www.stridesapp.com/>
- Aide, historique, rythme, plateformes, données et modèle Plus :
  <https://www.stridesapp.com/help/>

## Comparaison Goalscape, Strides et DreamGlows

| Question | Goalscape | Strides | Opportunité DreamGlows |
| --- | --- | --- | --- |
| Pourquoi agir ? | Possible dans les notes, non structurant. | Peu visible dans la promesse publique. | Faire du pourquoi un objet central et toujours accessible. |
| Comment décomposer ? | Hiérarchie visuelle profonde. | Milestones surtout dans le tracker Project. | Chemin lisible avec jalons, dépendances et alternatives. |
| Que faire maintenant ? | Tags Now/Next et filtres. | Daily Goals à renseigner. | Prochaine action expliquée, adaptée au contexte et reliée au rêve. |
| Comment mesurer ? | Pourcentage pondéré remontant dans l'arbre. | Quatre mécaniques spécialisées et ligne de rythme. | Progression plurielle fondée sur mesures, preuves et appréciation humaine. |
| Comment apprendre ? | Révision de structure et de priorités. | Historique, notes et rapports. | Bilan qui conserve décisions, blocages, apprentissages et réorientation. |
| Propriété des données | Plusieurs exports, réimport partiel annoncé. | Export et sauvegarde réservés à Plus. | Export complet, lisible et réimportable sans abonnement. |
| Multiplateforme | Navigateur desktop/mobile, mobile à améliorer. | Apple principalement, Android en attente. | Windows, Android, Chrome et Obsidian sur un modèle commun hors ligne. |

### Conclusion stratégique

La combinaison la plus féconde n'est pas de fusionner leurs interfaces. DreamGlows
peut reprendre de Goalscape la **clarté du chemin et des arbitrages**, et de Strides
la **pluralité des méthodes de progression et la simplicité du geste quotidien**.
Sa différence doit rester le lien explicite et durable entre sens, chemin, action,
preuve et adaptation :

**rêve → pourquoi → chemin visible → prochaine action → preuve → bilan → chemin ajusté**.

## Axes produits inspirés, sans imitation

| Priorité | Axe | Valeur pour DreamGlows | Décision / limite |
| --- | --- | --- | --- |
| P1 | Espace « Aujourd'hui » | Réunit le prochain milestone, les tâches non planifiées, les créneaux du jour et un bilan léger pour réduire le passage du plan à l'action. | À concevoir comme une seule boucle DreamGlows, pas comme un tableau de productivité générique. |
| P1 | Timeboxing relié aux milestones | Planifier une tâche dans le temps tout en rendant visible son rattachement au rêve et à l'étape qu'elle fait progresser. | Préserver une source de vérité unique et traiter explicitement reports, conflits et surcharge. |
| P1 | Déplacement sûr et réversible | Reporter ou redimensionner une action sans doublon, avec confirmation claire de ce qui a changé et possibilité de restaurer. | Ajouter des tests d'idempotence, de concurrence et de reprise avant d'en faire un geste central. |
| P2 | Prévu vs réel | Comparer la durée prévue et le temps réellement consacré à une tâche, puis restituer cet apprentissage au niveau du milestone. | Commencer par un relevé volontaire ; ne pas faire de mesure de productivité une promesse. |
| P2 | Revue de progression | Transformer la fin de session ou de journée en preuve attachée au milestone : fait, appris, bloqué, prochaine adaptation. | Mesurer la compréhension et la continuité, pas le nombre d'heures ni une performance standardisée. |
| P2 | Interopérabilité Markdown progressive | Permettre l'import ou l'export de tâches simples pour que DreamGlows s'insère dans un vault existant. | Définir un contrat minimal et réversible avant toute compatibilité avec un autre plugin. |
| P3 | Calendriers ICS facultatifs | Donner du contexte aux contraintes de temps existantes. | Reporter cette intégration : les liens ICS exposent des enjeux de confidentialité et ne différencient pas DreamGlows au premier ordre. |

## Prochaine preuve à obtenir

Tester, avec des utilisateurs correspondant au public grand public de DreamGlows,
si l'espace « Aujourd'hui » raccourcit réellement le passage d'un milestone à une
action planifiée puis achevée. Cette validation doit précéder tout engagement de
construction de calendrier ou d'intégration ICS.

La première preuve produit recommandée est un vertical slice de l'espace
« Aujourd'hui » sans calendrier externe : un milestone actif, une prochaine
action, un créneau optionnel, une session Focus et une revue sauvegardée dans le
modèle commun. Le succès se mesure au temps nécessaire pour passer du milestone
à une action comprise puis clôturée, et à l'absence de perte ou de duplication
après un report.
