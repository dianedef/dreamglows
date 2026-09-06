---
artifact: spec
metadata_schema_version: "1.0"
artifact_version: "1.0.0"
project: DreamGlows
status: draft
created: "2026-09-06"
updated: "2026-09-07"
source_skill: sg-engineering
source_model: GPT-6
scope: offline-sync-obsidian-mirror
owner: Diane
confidence: high
risk_level: high
security_impact: yes
docs_impact: yes
user_story: "Retrouver mes chemins sur mes appareils, conserver mes modifications hors ligne et disposer d'un miroir Obsidian durable."
linked_systems: [packages/path-core, packages/path_core_dart, obsidian_plugin, windows_app, android_app, chrome_extension, CommandGlows, Convex]
depends_on: []
supersedes: []
evidence:
  - "Operator confirmed on 2026-09-07: dedicated DreamGlows Convex stores product data; CommandGlows centralizes identity and entitlements, not product data."
  - "Operator approved sync plan and Convex, then confirmed shared identity and entitlements owned by CommandGlows."
  - "Read-only inspection of CommandGlows schema.ts, bridge.ts and api/bridge/entitlement.ts on 2026-09-06."
  - "Portable native round-trip receipt recorded in common-model-adoption.md."
next_step: resolve-commandglows-server-integration-and-dreamglows-development-configuration
---

# Synchronisation hors ligne et miroir Obsidian

## Décisions validées

Un déploiement Convex dédié à DreamGlows porte ses données métier et la
synchronisation distante. CommandGlows reste propriétaire de
l'identité commune et du registre d'entitlements. Aucun registre de comptes ou
de droits parallèle dans DreamGlows. L'édition bidirectionnelle des notes et
l'interface de résolution des conflits sont différées à l'étape 6.

## Audit et frontière de preuve

Le stockage local sérialise les écritures ; les commandes ont des identifiants
stables et conservent leur requête dans l'historique. La révision du document
local ne constitue pas un ordre global entre appareils. Aucune file distante
durable ni configuration Convex DreamGlows n'a été identifiée dans le périmètre
inspecté. L'export portable prouvé reste manuel, sans suivi continu du miroir.

Le checkout CommandGlows inspecté contient `globalUsers`, `identityAccounts`,
`productEntitlements` et des ponts propres aux produits. Le pont ReplayGlows
vérifie une session Clerk et peut démarrer un essai ; le pont ContentGlows
résout un sujet Auth0. Aucun raccordement DreamGlows trouvé dans `convex/` ou
`src/lib/`. Cela ne prouve pas l'état hébergé ni celui d'autres branches.

## Contrat proposé

1. Chaque appareil conserve atomiquement son document et les opérations en attente.
   Une opération porte un identifiant stable, l'appareil, l'association au compte,
   la requête, les préconditions et l'état d'acquittement. Un redémarrage ne la perd
   pas ; une réponse réseau perdue entraîne le rejeu du même identifiant.
2. Le serveur résout le `globalUserId` public via CommandGlows depuis une identité
   vérifiée. L'identifiant fourni par le client n'autorise jamais l'accès. Les
   contrôles portent sur utilisateur, produit et environnement. Aucun secret de
   pont dans les applications. Aucun essai ou droit accordé par la synchronisation.
3. Convex valide les commandes et écrit atomiquement résultat, historique,
   séquence serveur et reçu de déduplication. Les clients téléchargent des lots
   bornés ; ils avancent leur curseur seulement après persistance locale complète.
4. Les créations indépendantes peuvent converger. Une précondition devenue fausse
   conserve la modification locale et la version distante ; elle bloque cette
   opération et ses dépendantes. Aucune règle du dernier horodatage gagnant.
   Les contraintes de parenté et d'unicité du Focus actif restent vérifiées.
5. Les suppressions restent des tombstones durables, jamais une absence de snapshot.
   Leur purge n'est pas incluse dans v1. Une restauration portable crée une nouvelle
   génération locale non publiée automatiquement : elle ne réinitialise ni le
   curseur distant ni les reçus d'opérations précédents.
6. La première association de données anonymes à un compte demande un choix
   explicite d'import. Un changement de compte isole les magasins et les files ;
   aucune opération de l'ancien compte n'est rejouée. Une révocation suspend les
   accès distants sans effacer le document local ni prétendre qu'il est synchronisé.
7. Synchroniser les données métier et les pièces jointes explicitement inventoriées.
   Exclure les secrets et réglages locaux ; les extensions inconnues du format
   portable restent préservées localement, sans publication automatique. Une liste
   de champs exportables versionnée précède toute première transmission distante.
8. Les pièces jointes sont adressées par contenu et vérifiées avant publication
   d'une référence distante. Une interruption laisse une opération reprenable ;
   le statut complet exige aussi la durabilité des fichiers référencés.

## Miroir Obsidian

Projection à sens unique du document local durable vers un dossier choisi, pilotée
par un journal persistant distinct du transport Convex. Elle fonctionne hors ligne.
Les notes emploient les identifiants canoniques stables ; un manifeste garde les
hashes et la révision projetée. Écrire une génération complète en staging, vérifier
les fichiers puis publier son marqueur de complétude ; conserver la précédente
jusqu'à validation. Une interruption reprend sans annoncer un miroir à jour.

Un fichier édité manuellement n'est jamais écrasé : conserver son contenu, mettre
sa projection en attente et signaler que le miroir est incomplet. Une suppression
canonique archive seulement la projection reconnue et intacte. Ne jamais parcourir
ou modifier le reste du coffre. Le réimport manuel portable reste une action séparée.

## Livraison et preuves

1. Protocole et fixtures communs TypeScript/Dart : coupure, rejeu, collision,
   suppression, restauration portable et compte différent, sans fournisseur réel.
2. Adaptateurs de persistance et miroir : arrêt brutal, reprise, fichier utilisateur
   modifié, pièce jointe manquante, refus d'écriture et corruption du manifeste.
3. Backend Convex et frontière CommandGlows : accès refusé sans droit, isolation
   utilisateur/environnement, déduplication et révocation. Tests puis preuve sur
   environnement de développement explicitement résolu.
4. Windows puis autres surfaces : deux appareils, reprise réseau et redémarrage.
   Distinguer « enregistré localement », « en attente », « synchronisé » et l'état
   du miroir. Login réel et accès protégé requis avant déclaration de livraison.

Documentation prévue : contrat de données, sécurité et comptes, procédure de
reprise, README des surfaces et suivi des capacités. Éditorial : aucune promesse
publique de synchronisation ou de sauvegarde distante avant preuve hébergée.

## Placement validé et configuration à résoudre

Placement validé le 2026-09-07 : Convex dédié à DreamGlows, avec contrôle d'identité
et d'accès délégué à CommandGlows. Les rêves, chemins, actions, historique et pièces
jointes appartiennent au stockage DreamGlows ; ils ne sont pas centralisés dans
CommandGlows. Le compte reste commun. Ce choix architectural est clos.
Ne pas choisir un déploiement ou une portée Doppler par supposition.

Le produit central exact, l'émetteur/audience de session et l'origine de développement
doivent ensuite être résolus dans cette configuration. Les ponts consultés sont
des preuves de conventions, pas des API génériques autorisées pour DreamGlows.
