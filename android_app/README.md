# Android app

Objectif : livrer DreamGlows pour le quotidien sur Android après Windows.

## État

Application non implémentée. Le cœur réutilisable est désormais disponible dans `../packages/path_core_dart`, sans dépendance Flutter : document canonique, validation, commandes durables et projections. Ses tests utilisent les mêmes fixtures de conformité que TypeScript.

Une future application Flutter peut déclarer `path_core_dart` avec `path: ../packages/path_core_dart`. Elle devra fournir son adaptateur de stockage et prouver son intégration, son authentification et son parcours sur Android. Les tests du paquet ne constituent pas une preuve d’adoption par une application Android.
