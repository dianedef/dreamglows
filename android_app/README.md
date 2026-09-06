# DreamGlows Android

Compagnon quotidien local construit avec Flutter. L'application utilise directement
`../packages/path_flutter` pour ses écrans adaptatifs et son adaptateur fichier,
et `../packages/path_core_dart` pour les commandes et le document canonique.
Windows consomme les mêmes composants : aucune copie Android des règles métier.

## Développement

Depuis ce dossier : `flutter pub get`, `flutter analyze`, `flutter test`.
Démarrer avec le gestionnaire ShipGlows :
`s start -ProjectPath <chemin-absolu-vers-android_app> -FlutterDevice android`.
Utiliser un appareil connecté explicitement choisi ou l'émulateur provisionné
`ShipGlows_API_36`. Le registre DevServer décrit la session réellement active.

## Données et limites

Les données restent dans le répertoire privé de l'application sous `path.v1.json`.
La première intégration est locale : aucune identité, authentification ou donnée
protégée distante n'est implémentée. Ce fonctionnement ne contourne aucun login.
La désinstallation peut effacer ces données ; la synchronisation, l'export dans
l'interface et le miroir Obsidian ne sont pas encore intégrés à cette application.
Le format canonique reste commun et les champs non édités sont conservés.

L'identifiant de développement est `com.dreamglows.dreamglows_android`. Le squelette
Android est généré par le SDK Flutter installé. Aucune signature de distribution,
publication Play Store ou disponibilité grand public n'est déclarée ici.
Les preuves sur émulateur sont consignées dans la spec `common-model-adoption.md`.
