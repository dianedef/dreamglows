# Mode Focus — MVP Obsidian

## Intention

Le Mode Focus aide une personne à avancer sur une action concrète sans perdre
le lien avec ce qui compte pour elle. Il ne mesure pas la valeur d'une personne
ni ne lui impose une méthode de productivité : il rend visible l'action choisie,
son contexte et une reprise claire après une interruption.

Il prolonge le parcours DreamGlows :

`rêve / objectif → chemin → prochaine tâche → session de focus → preuve de progrès`

## Résultat utilisateur

Depuis la vue du jour, une personne peut choisir une tâche non terminée,
démarrer une session, retrouver pourquoi elle compte, puis la terminer ou la
quitter en laissant une prochaine action explicite.

La session est liée à la tâche et, lorsqu'il existe, à son objectif. Les
milestones restent dérivés de la hiérarchie d'objectifs existante : le MVP ne
crée pas un second modèle de relations.

## Périmètre MVP

| Moment | Comportement attendu |
| --- | --- |
| Démarrer | Depuis une tâche de la vue du jour, `Commencer le focus` crée une session active. La tâche passe en `en cours` seulement si elle était à faire. |
| Pendant | Un bandeau discret affiche la tâche, l'objectif lié, le mode choisi et le temps écoulé. Il ne bloque aucune navigation ni changement de tâche. |
| Basculer | Choisir une autre tâche ouvre une courte transition : `où en es-tu ?` et `quelle est la prochaine action ?`. Ces deux champs sont facultatifs. |
| Terminer | `Terminer la session` enregistre la durée et propose trois suites égales : marquer la tâche terminée, la laisser en cours, ou revenir à la vue du jour. |
| Reprendre | Une tâche avec une dernière session non clôturée ou interrompue montre sa dernière note de reprise et permet de redémarrer sans perte de contexte. |

## Choix de mode

Le mode est une aide de contexte, jamais une identité à configurer. Le MVP
propose trois libellés locaux et modifiables ultérieurement :

- `Focus` — avancer sur une tâche exigeante ou continue ;
- `Création` — produire, imaginer ou écrire ;
- `Administration` — organiser, répondre ou traiter.

`Focus` est présélectionné. Le changement de mode ne modifie ni la priorité,
ni le statut ni la récompense de la tâche.

## Données minimales

Créer un état autonome `focusSessions` persistant dans les données du plugin,
sans transformer `Task.actualMinutes` en source de vérité. Une session clôturée
peut alimenter ce total par agrégation explicite plus tard.

```ts
type FocusMode = 'focus' | 'creation' | 'administration';
type FocusSessionStatus = 'active' | 'completed' | 'interrupted';

interface FocusSession {
  id: string;
  taskId: string;
  goalId?: string;
  mode: FocusMode;
  status: FocusSessionStatus;
  startedAt: string;
  endedAt?: string;
  durationMinutes?: number;
  handoffNote?: string;
  nextAction?: string;
  createdAt: string;
  updatedAt: string;
}
```

Règles :

- une seule session `active` à la fois ;
- tous les horodatages sont ISO 8601 ;
- une session déjà clôturée est immuable, hors correction explicitement conçue ;
- supprimer une tâche ne supprime pas son historique de focus ; celui-ci devient
  lisible comme « tâche supprimée » ;
- le contenu de `handoffNote` et `nextAction` appartient à l'utilisateur et
  reste dans l'export futur avec la session.

## Expérience et garde-fous

- Aucun verrouillage de durée, compte à rebours, notification répétée ou message
  pseudo-scientifique.
- Aucun écran de réglages requis avant la première session.
- Le bandeau actif doit rester lisible sur une petite fenêtre et ne pas masquer
  les commandes Obsidian.
- Une interruption inattendue laisse la session active ; au prochain lancement,
  l'interface demande de la reprendre, la clôturer ou l'indiquer interrompue.
- Les statistiques ne sont utiles que si elles restent reliées aux tâches,
  objectifs et progrès ; le MVP n'ajoute pas de nouveau tableau de bord.

## Critères d'acceptation

1. Une tâche non terminée peut démarrer une session en deux actions maximum.
2. Pendant une session, la tâche active et son objectif sont identifiables sans
   quitter la vue du jour.
3. Le basculement vers une autre tâche conserve, si elle est saisie, une note
   de reprise et une prochaine action pour la session précédente.
4. Terminer une session ne marque jamais automatiquement une tâche comme faite.
5. Recharger Obsidian pendant une session ne perd ni la tâche associée, ni le
   mode, ni la date de démarrage.
6. Les sessions terminées restent consultables même si leur tâche ou objectif a
   été supprimé.
7. Le parcours reste utilisable sans créer de rôle, choisir une couleur ou
   renseigner une durée cible.
8. Les données nouvelles sont validées, persistées et compatibles avec un futur
   export/import versionné.

## Découpage d'implémentation

1. Ajouter les types, la validation et la persistance de `focusSessions`.
2. Créer un store unique qui applique l'invariant d'une seule session active.
3. Intégrer le démarrage, le bandeau actif et la clôture dans `DayView`.
4. Ajouter la transition de bascule et la reprise après redémarrage.
5. Écrire les tests de transition, de persistance et de non-perte d'historique.
6. Évaluer ensuite, sur données réelles, l'agrégation vers `actualMinutes` et
   les indicateurs de progression.

## Hors périmètre

- minuterie Pomodoro, blocage du changement de tâche ou pression par notifications ;
- rôles, couleurs ou icônes configurables ;
- synchronisation, API, partage d'équipe ou statistiques de productivité ;
- attribution automatique d'XP, d'or ou de récompenses par durée de focus.

## État d'implémentation — 2026-09-02

**Implémenté dans Obsidian :**

- persistance locale de `focusSessions` et validation défensive au chargement ;
- invariant d'une seule session active ;
- démarrage depuis une tâche, avec passage de `à faire` à `en cours` seulement ;
- choix de mode, temps écoulé, pause, clôture et bascule vers une autre tâche ;
- note « où j'en étais » et prochaine action enregistrées à la clôture ou à la
  bascule.

**Preuve réalisée :** le build du plugin est passé, puis DreamGlows a été
chargé et sa commande d'ouverture exécutée dans un Obsidian Lab isolé, sans
diagnostic runtime.

**Reste à livrer :** affichage d'un historique par tâche, présentation d'une
session orpheline après suppression de sa tâche, agrégation éventuelle vers
`actualMinutes`, export/import versionné et tests dédiés des transitions.
