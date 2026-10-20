# MyCorpus3D

[![CI](https://github.com/31nidal/corpus/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/31nidal/corpus/actions/workflows/ci.yml)

Plateforme d’apprentissage pour les étudiants en santé : explorer l’anatomie en 3D, étudier ses cours, s’entraîner et réviser avec des flashcards personnelles.

## Fonctionnalités

### Atlas anatomique

- Vue d’ensemble de **48 maillages** et référence masculine détaillée de **1 663 maillages** BodyParts3D, chargés progressivement.
- Explorations féminines régionales de **74 maillages** et référence détaillée optionnelle de **591 maillages** HRA Visible Human Female. Ces références restent partielles et distinctes du modèle masculin.
- Recherche par nom, identifiant ou numéro de vertèbre ; arbre des ressources, composants des ensembles et relations anatomiques sourcées.
- Sélection, isolation, masquage, opacité individuelle, restauration de scène, six orientations et partage de la vue.
- Révision par réponse libre, QCM, clic sur le modèle, association et examen, avec correction et historique.
- Fiches repliables sur mobile pour conserver une scène lisible.

### Cours et entraînement

- Catalogue de **305 entrées dans 18 catégories**, avec cours, schémas, recherche et entraînement. Le nombre d’entrées ne constitue pas une certification de couverture des programmes universitaires ni de validation scientifique.
- Favoris, notes, progression et répétition espacée.
- Espace **Mes cours** pour importer des supports et préparer ses révisions ; génération locale et fournisseurs optionnels configurés côté serveur.

### Flashcards

- Création manuelle, génération depuis du texte et organisation en decks personnels.
- Menu expliquant les **six formats** : question/réponse, inversée, dans les deux sens, texte à trous, réponse saisie et image à masquer.
- Exemples de recto/verso et aide au choix du format dans l’éditeur.
- [Accès direct au menu des six formats](https://mycorpus3d.com/#tab=flashcards&flashView=create), conservé après rechargement.
- Révision avec l’ordonnanceur FSRS existant, statistiques et synchronisation entre appareils pour les comptes connectés.
- Les exercices anatomiques 3D restent dans l’atlas ; les flashcards Atlas 3D ont été retirées. Les anciennes cartes conservent leur texte et leur historique sous forme de cartes classiques.

### Comptes

L’exploration et les apprentissages disponibles en mode invité utilisent le stockage local du navigateur. La création de flashcards personnelles nécessite un compte. Les comptes synchronisent leur état dans SQLite ; la connexion Google est facultative.

## Démarrage

**Prérequis : Node.js ≥ 22.13 et < 27**, avec npm. Aucun service IA externe n’est nécessaire pour lancer le projet.

```bash
git clone https://github.com/31nidal/corpus.git
cd corpus
npm ci
npm run dev
```

Ouvrir **http://localhost:5173**. Vite sert l’interface et les routes API de développement.

La configuration locale est facultative : copier [`.env.example`](.env.example) dans `.env` pour configurer les fournisseurs, les comptes ou Google OAuth. Les secrets restent exclusivement côté serveur.

### Version compilée

```bash
npm run build
npm start
```

Le serveur écoute `PORT`, ou **8080** sans configuration. L’exemple `.env` définit `PORT=4173` ; adapter l’URL au port choisi.

Pour un déploiement avec comptes persistants, configurer `APP_ORIGIN` et un volume via `ACCOUNT_DATA_DIR` ou `RAILWAY_VOLUME_MOUNT_PATH`. Voir le [guide backend](server/README.md).

## Vérifications

| Commande | Vérification |
| --- | --- |
| `npm run build` | TypeScript et compilation de production |
| `npm run audit:anatomy` | GLB, correspondances, empreintes et preuves de provenance |
| `npm run test:anatomy` | Graphe anatomique, ressources et compatibilités |
| `npm run test:flashcards` | Cartes, FSRS, validation et API |
| `npm run test:accounts` | Comptes, persistance et synchronisation |
| `npm run test:study` | Traitement des supports et génération pédagogique |
| `npm run test:student-progress` | Progression des étudiants |
| `npm run test:security` | En-têtes de sécurité |
| `npm test` | Parcours navigateur Playwright |

Avant le premier lancement des tests navigateur : `npx playwright install chromium`.

La [CI GitHub Actions](https://github.com/31nidal/corpus/actions/workflows/ci.yml) vérifie la compilation et les suites serveur, puis exécute les tests navigateur en trois lots. Les commandes complémentaires et les limites de couverture sont décrites dans [TESTS.md](TESTS.md).

## Organisation

```text
src/
  atlas/          navigation anatomique, graphe et exercices
  flashcards/     création, formats et révision des cartes
  study/          cours, supports et entraînement
  account/        comptes et synchronisation côté client
  dashboard/      suivi et sessions d’apprentissage
server/           API, SQLite et fournisseurs optionnels
shared/           contrats communs au client et au serveur
public/models/    modèles 3D et manifestes versionnés
public/licenses/  licences et provenance des ressources
scripts/          imports, audits et outils de préparation
tests/            tests serveur et navigateur
docs/             documentation technique et produit
```

## Documentation

- [Index de la documentation](docs/README.md)
- [Architecture et contrats à préserver](docs/architecture.md)
- [Atlas : fonctionnalités, validation et limites](docs/atlas/implementation.md)
- [Références anatomiques et licences](docs/reference-bodies.md)
- [Flashcards et FSRS](docs/flashcards-fsrs.md)
- [Configuration du backend](server/README.md)
- [Tests et qualité](TESTS.md)

## Sources et limites

Les modèles et la terminologie ont leurs propres licences : BodyParts3D/DBCLS, Human Reference Atlas/HuBMAP et données terminologiques dérivées de Z-Anatomy. Consulter [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md), les [références anatomiques](docs/reference-bodies.md) et les notices incluses avant redistribution. Aucun identifiant TA2 ou nom latin vérifié n’est déduit automatiquement d’une simple traduction.

L’application est pédagogique et ne constitue pas un outil de diagnostic. Les modèles sont optimisés pour le Web et leur couverture est partielle. L’estomac reste un maillage global ; aucun fundus, antre ou pylore indépendant n’est revendiqué. La relecture scientifique individuelle et le rapprochement TA2 restent à compléter. Les coupes sont géométriques et les animations illustratives.

La validation automatisée principale utilise Chromium. Safari, Firefox et les appareils physiques nécessitent des vérifications complémentaires. Les limites de performances dépendent du réseau et du matériel WebGL.

Les bases locales, secrets, caches, builds et captures générées ne sont pas versionnés. Les contributions doivent préserver les identifiants anatomiques, les liens, les données des comptes et les licences des ressources.

## Préparation juridique (branche dédiée)

Les documents préparatoires et mécanismes de compte sont décrits dans [l’audit initial](docs/legal/audit-initial.md) et le [dossier de finalisation](docs/legal/finalisation.md). Les champs `[À COMPLÉTER]` et la validation humaine sont bloquants pour la publication commerciale. Aucun paiement ni CGV de vente fictive n’est ajouté.
