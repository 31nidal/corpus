# Architecture MyCorpus

Ce document décrit les responsabilités actuelles du projet et les contrats qui doivent rester stables lors d’un refactor.

## Vue d’ensemble

MyCorpus est composé de trois blocs principaux :

1. un frontend React/TypeScript ;
2. un moteur 3D Three.js avec modèles distribués localement ;
3. un backend Node.js léger pour comptes, synchronisation et API locale.

Le projet ne dépend pas d’un fournisseur IA externe pour fonctionner. Un adaptateur de fournisseur peut être configuré côté serveur, mais le mode local reste autonome.

## Frontend

### `src/App.tsx`

Point d’orchestration principal de l’interface. Il relie la navigation générale, l’atlas, les panneaux pédagogiques et les espaces d’étude.

### `src/AnatomyViewer.tsx`

Responsable de la scène Three.js et des interactions 3D : chargement, caméra, sélection, visibilité, couches et rendu.

### `src/study/`

Contient le domaine apprentissage :

- catalogue de cours ;
- contenu pédagogique ;
- banque de questions ;
- schémas interactifs ;
- entraînement ;
- répétition espacée ;
- progression.

### `src/account/`

Gère l’état de compte côté client, la synchronisation et les écrans liés à l’authentification.

### `src/data/`

Regroupe les données nécessaires à l’atlas et à la nomenclature. Les identifiants anatomiques utilisés dans les liens et dans les cours doivent rester stables.

## Backend

### `server/index.mjs`

Point d’entrée HTTP de production.

### `server/accounts.mjs`

Comptes, sessions, persistance SQLite, synchronisation de l’état et OAuth Google.

### `server/api.mjs`

API de conversation/commandes et validation des actions transmises à l’interface.

### `server/providers.mjs`

Adaptation optionnelle vers un fournisseur externe compatible avec le contrat serveur.

## Données 3D

Les modèles distribués sont stockés sous `public/models/`. Les manifestes et fichiers de provenance doivent rester cohérents avec les GLB correspondants.

Les données de préparation qui ne sont pas nécessaires au runtime doivent rester hors du dépôt lorsqu’elles sont volumineuses ou reproductibles. Les caches locaux sont exclus par `.gitignore`.

## Persistance

### Navigateur

Les principales clés client utilisent le préfixe `corpus-`. Elles font partie du contrat de compatibilité : un changement de nom sans migration ferait perdre l’état local des utilisateurs.

### Serveur

SQLite stocke les utilisateurs, sessions, données synchronisées, historique, limites et identités OAuth. Toute modification du schéma doit être compatible avec les bases déjà déployées ou accompagnée d’une migration.

## Contrats de compatibilité

Un refactor sans changement fonctionnel doit préserver :

- les fragments d’URL et liens profonds ;
- les identifiants FMA/HRA ;
- les chemins des modèles et manifestes ;
- les routes `/api/...` ;
- les noms de cookies ;
- les clés `corpus-*` ;
- les variables d’environnement ;
- le format des données synchronisées ;
- les règles de score et de répétition espacée ;
- le comportement des comptes et de Google OAuth.

## Stratégie de refactor recommandée

Le découpage de gros fichiers doit être fait par extraction progressive plutôt que par réécriture :

1. extraire un composant ou une fonction sans changer son interface ;
2. relancer build et tests ;
3. comparer le comportement observable ;
4. seulement ensuite poursuivre le découpage.

Les gros fichiers actuels peuvent être séparés à terme par domaines (`atlas`, `study`, `account`, `chat`) mais les déplacements ne doivent pas être mélangés avec des changements produit.

## Validation

Voir [../TESTS.md](../TESTS.md) pour la suite et les invariants attendus.
