# Tests MyCorpus

Ce document décrit l’état de validation à conserver pour toute modification du projet. L’historique détaillé des campagnes précédentes reste disponible dans l’historique Git ; ce fichier décrit uniquement le fonctionnement actuel.

## Commandes principales

```bash
npm ci
npm run build
npm run test:accounts
npm run test:flashcards
npm run test:anatomy
npm run audit:anatomy
npx playwright install chromium
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
- vue d’ensemble au premier lancement, persistance du mode détaillé et ordre de chargement progressif ;
- comportement mobile et clavier ;
- explorations féminines régionales et référence détaillée optionnelle ;
- séparation des modèles et compatibilité des anciennes cartes ;
- exercices anatomiques, historique et rendu mobile réel.

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

### Flashcards

- choix des six formats et explications dans le menu ;
- création, modification et révision ;
- FSRS, sources et brouillons ;
- images à masquer et refus du format Atlas 3D retiré ;
- migration des anciennes cartes 3D en texte, sans perte des identifiants et de l’historique FSRS.

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
- que les modèles et les fichiers versionnés reçoivent les politiques de cache prévues ;
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

## Préparation juridique

`npm run legal:check` vérifie les pages statiques par rapport au générateur et à la version des CGU. Le build lance aussi ce contrôle. `tests/legal.spec.ts` couvre les pages publiques à 320/375/768/1440 px, les liens, l’absence de consentement fictif et l’inscription explicite. `tests/accounts.test.mjs` vérifie la preuve e-mail/Google, les versions refusées, la non-rétroactivité, l’export isolé et la suppression des fichiers.

Pour éviter de réutiliser un serveur de développement connecté à une IA distante : `PLAYWRIGHT_PORT=5175 npx playwright test tests/legal.spec.ts tests/accounts.spec.ts tests/my-courses.spec.ts tests/flashcard-menu.spec.ts`. Le nouveau serveur utilise les générateurs locaux déterministes. Ne pas pointer ces tests de création/suppression de comptes vers la production.

### Conservation V1 et publication

`npm run test:privacy` teste la politique de conservation sur des bases temporaires. `npm run privacy:retention` produit un aperçu dans la base configurée (aucun effacement de contenu ; création possible des métadonnées d’observation). L’application requiert `RETENTION_POLICY_APPROVED=1` et `--apply` ; ne pas exécuter sur la production avant validation opérationnelle et préavis réels. Le serveur préparé programme la maintenance quotidienne uniquement avec ce flag.

`npm run legal:publication-check` est un contrôle de préparation distinct du build : il doit actuellement refuser les champs manquants, la version draft et la sélection de Gemini pour l’accueil des mineurs décidé par l’éditeur. La réussite future de ce contrôle n’atteste pas la conformité des contrats ni des configurations de production.

### V1 locale sans Gemini

`npm run test:v1-local` exerce l’API publique avec des configurations Gemini/HTTP/Ollama volontairement laissées présentes et un piège réseau : une tentative cachée suivie d’un fallback ferait échouer le test. Les anciens adaptateurs sont encore testés isolément avec fournisseurs factices ; cela ne les active pas dans la V1 publique.

`npm run evaluate:local` reproduit l’évaluation sur neuf cas synthétiques. `tests/v1-local-security.spec.ts` teste le rendu sûr d’anciennes cartes Cloze contenant du HTML malveillant. La politique de code bloque désormais le batch de conservation et sa maintenance automatique même si l’ancien flag est présent ; les commandes d’activation décrites dans les bilans précédents ne s’appliquent donc plus à cette V1.
