# Tests MyCorpus

Ce document décrit l’état de validation à conserver pour toute modification du projet. L’historique détaillé des campagnes précédentes reste disponible dans l’historique Git ; ce fichier décrit uniquement le fonctionnement actuel.

## Commandes principales

```bash
npm install
npm run build
npm run test:accounts
npm test
```

Pour vérifier le serveur de production local :

```bash
npm run build
npm start
```

Puis, dans un autre terminal :

```bash
node tests/production-smoke.mjs
```

`CORPUS_URL` permet de cibler une autre URL pour le smoke test.

## Couverture attendue

La validation fonctionnelle couvre au minimum les domaines suivants :

### Atlas 3D

- chargement des modèles distribués ;
- correspondance des structures et manifestes ;
- sélection, recherche, isolation, masquage et restauration ;
- vues rapides et couches détaillées ;
- coupe anatomique, opacité et repères ;
- liens profonds et restauration de l’état ;
- chargement différé des modèles lourds ;
- comportement mobile et clavier ;
- explorations féminines régionales.

### Apprentissage

- navigation dans les matières et les cours ;
- schémas interactifs ;
- favoris et notes ;
- entraînement par chapitre et difficulté ;
- mode apprentissage et mode examen ;
- correction et carnet d’erreurs ;
- répétition espacée ;
- quiz d’identification 3D ;
- persistance de la progression.

### Comptes et backend

- création et connexion de compte ;
- synchronisation de l’état ;
- sessions et expiration ;
- validation des données enregistrées ;
- connexion Google lorsque configurée ;
- comportement sans Google OAuth ;
- limites de requêtes et erreurs API ;
- persistance SQLite.

### Production

Le smoke test vérifie notamment :

- que l’application compilée se charge correctement ;
- qu’aucune erreur JavaScript inattendue n’apparaît ;
- que les ressources locales nécessaires sont servies ;
- que l’API répond ;
- que les principaux parcours atlas / cours / entraînement restent accessibles.

## Navigateurs

La validation automatisée principale utilise Chromium via Playwright. Les scénarios mobiles utilisent une émulation de viewport et d’interactions tactiles.

Cette couverture ne remplace pas des tests manuels réguliers sur :

- Safari ;
- Firefox ;
- iPhone physique ;
- Android physique ;
- appareils à GPU limité.

## Validation visuelle

Les scripts `tests/*-preview.mjs` et `tests/*-inspection.mjs` peuvent produire des captures dans `tests/artifacts/`. Les PNG générés sont ignorés par Git : ils servent à l’inspection locale et peuvent être recréés à la demande.

## Règle pour les refactors

Un refactor qui prétend conserver exactement le comportement doit au minimum respecter les contrats suivants :

- mêmes URLs et fragments (`#tab=...`, `#structure=...`, etc.) ;
- mêmes identifiants anatomiques FMA/HRA ;
- mêmes chemins de modèles distribués ;
- mêmes routes `/api/...` ;
- mêmes noms de cookies ;
- mêmes clés de stockage `corpus-*` ;
- même schéma de données SQLite ou migration explicitement compatible ;
- mêmes variables d’environnement publiques/serveur ;
- mêmes règles de progression et répétition espacée.

Voir également [docs/architecture.md](docs/architecture.md).

## Limites

Les tests techniques ne constituent pas une validation médicale ou clinique du contenu. Les modèles 3D sont optimisés pour le Web et les animations restent illustratives.
