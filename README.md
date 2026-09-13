# MyCorpus

Plateforme web d’apprentissage médical orientée première année : atlas anatomique 3D, cours structurés, entraînement, répétition espacée et progression synchronisée.

## État actuel

MyCorpus est une application React/TypeScript avec rendu 3D Three.js et un petit backend Node.js. La version actuelle comprend notamment :

- 98 cours répartis dans 13 matières ;
- 98 schémas interactifs ;
- 1 492 questions corrigées, avec 15 à 19 exercices par cours ;
- 10 exercices d’identification 3D ;
- un atlas masculin détaillé de 1 663 structures BodyParts3D ;
- trois explorations féminines ciblées (bassin, appareil reproducteur, sein) construites à partir de 74 maillages HRA ;
- comptes persistants, connexion Google facultative, favoris, notes et historique ;
- répétition espacée pour les questions d’entraînement ;
- interface ordinateur et mobile.

Le produit est pédagogique. Il ne constitue ni un dispositif médical ni un outil de diagnostic, et son contenu ne remplace pas les supports officiels d’une faculté.

## Stack

- React 19 + TypeScript
- Vite
- Three.js
- Node.js
- SQLite (`node:sqlite`)
- Playwright
- Google OAuth 2.0 en option

## Démarrage local

Prérequis : Node.js 22.13 ou plus récent.

```bash
npm install
npm run dev
```

L’interface de développement est servie par Vite. Pour tester l’application complète avec le backend :

```bash
npm run build
npm start
```

Variables d’environnement disponibles : voir [`.env.example`](.env.example).

## Commandes utiles

```bash
npm run dev            # développement frontend
npm run build          # vérification TypeScript + build Vite
npm test               # suite Playwright
npm run test:accounts  # tests backend comptes
npm start              # serveur de production local
```

Les détails de validation sont regroupés dans [TESTS.md](TESTS.md).

## Architecture

```text
src/                  application React
  account/            état et interface de compte
  data/               nomenclature et données anatomiques
  study/              cours, questions, schémas et progression
server/               API locale, comptes, OAuth et fournisseurs
public/models/         modèles 3D distribués
public/licenses/       licences et provenance des données
scripts/               préparation et audit des modèles/données
tests/                 tests Playwright, tests backend et outils de validation visuelle
docs/                  documentation produit et données anatomiques
shared/                contrats partagés frontend/backend
```

Voir [docs/architecture.md](docs/architecture.md) pour la description des responsabilités et des contrats à préserver lors des refactors.

## Atlas 3D

L’atlas principal utilise BodyParts3D. Les structures sont chargées par couches et les modèles lourds sont différés jusqu’à leur activation. Les interactions comprennent notamment recherche, isolation, masquage, coupe, opacité, liens profonds et partage de l’état de vue.

Les explorations féminines utilisent des maillages distincts issus du Human Reference Atlas. Les limites, transformations et licences sont documentées dans [docs/reference-bodies.md](docs/reference-bodies.md).

## Apprentissage

L’espace d’étude contient des cours, schémas, questions théoriques et exercices 3D. Les questions ratées peuvent être reprogrammées rapidement et les réussites suivent une répétition espacée progressive.

La couverture actuelle et l’organisation des matières sont détaillées dans [docs/campus-library.md](docs/campus-library.md).

## Comptes et persistance

Le mode invité fonctionne localement dans le navigateur. Lorsqu’un compte est utilisé, l’état d’apprentissage est synchronisé côté serveur dans SQLite.

Les secrets ne doivent jamais être commités. `.env`, les bases SQLite locales et `.data/` sont ignorés par Git. La connexion Google est optionnelle et n’est activée que lorsque `GOOGLE_CLIENT_ID` et `GOOGLE_CLIENT_SECRET` sont configurés côté serveur.

## Déploiement

Le serveur écoute le port fourni par l’environnement et peut utiliser un volume persistant pour la base des comptes. La configuration actuellement prévue pour Railway repose sur :

- `PORT` ;
- `APP_ORIGIN` ;
- un volume persistant ;
- les variables Google OAuth si la connexion Google est activée.

## Tests et qualité

La suite couvre notamment :

- chargement et interaction avec les modèles 3D ;
- navigation desktop et mobile ;
- cours et entraînement ;
- progression et comptes ;
- liens profonds ;
- comportement du serveur et de l’API locale.

Les scripts de validation peuvent générer des captures dans `tests/artifacts/`. Ces PNG sont des sorties locales ignorées par Git et ne sont pas nécessaires au runtime.

## Données, sources et licences

Les modèles anatomiques et la nomenclature proviennent de sources tierces avec leurs propres licences. Les notices distribuées avec le projet se trouvent dans `public/licenses/`, `public/models/` et la documentation associée.

Principales références :

- BodyParts3D / DBCLS ;
- Human Reference Atlas / HuBMAP ;
- nomenclature dérivée de TA2 via Z-Anatomy ;
- sources pédagogiques mentionnées dans `public/SOURCES.md`.

Consulter impérativement [docs/reference-bodies.md](docs/reference-bodies.md), [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) et les fichiers de licence avant toute redistribution des données ou modèles.

## Limites connues

- validation principale sous Chromium ;
- pas de validation clinique du contenu ;
- certaines petites structures disposent encore de descriptions générales ;
- les modèles Web sont simplifiés pour limiter le coût de rendu ;
- les animations sont illustratives et ne simulent pas une physiologie complète.

## Extension de la bibliothèque — septembre 2026

La version actuelle comprend **98 cours classés dans 13 matières, 98 supports visuels interactifs, 1 492 questions corrigées et 10 exercices d’identification 3D**. Chaque chapitre possède des prérequis, une durée de lecture calculée sur son contenu et 15 à 19 questions. Seize chapitres pivots proposent aussi un tableau comparatif, une relation à appliquer, un exemple résolu et des erreurs classiques. Cinq d’entre eux ont été réécrits en huit parties (environ 930 à 1 020 mots hors exercices) et disposent de dessins SVG avec légendes masquables et exercices de repérage : cycle cardiaque, rein, ventilation, gastrulation et immunité adaptative. Les quiz proposent deux niveaux, des cas et calculs, une navigation numérotée en examen et une répétition espacée. Voir [le détail de la bibliothèque](docs/campus-library.md).

## Documentation

- [Architecture](docs/architecture.md)
- [Bibliothèque de cours et entraînement](docs/campus-library.md)
- [Références anatomiques et licences](docs/reference-bodies.md)
- [Notices tierces](THIRD_PARTY_NOTICES.md)
- [Tests](TESTS.md)
- [Backend et contrat API](server/README.md)
