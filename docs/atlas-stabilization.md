# Stabilisation Atlas — 1–2 octobre 2026

## Périmètre et diagnostic

Référence : `main`, commit `ed3493f0a081bf6291f27836e0bece9a77915b2a`.
Le dépôt local était propre au début de l’intervention.
Les journaux du [run GitHub 36763845812](https://github.com/31nidal/corpus/actions/runs/36763845812)
montrent 10 échecs E2E : 1 sur le shard 1, 4 sur le shard 2 et 5 sur le shard 3.

| Cause | Nature | Correction |
| --- | --- | --- |
| Le conteneur 3D s’appelait `three-d-workspace`, alors que le CSS ciblait `atlas-workspace`. Il restait statique, avec une hauteur nulle. Les commandes absolues se positionnaient sous l’en-tête et le menu féminin perdait son contexte d’empilement. Cette incohérence existait déjà dans `5778754`. | Régression produit | Rétablir la classe attendue par les styles existants. |
| Les boutons `Vue cerveau` et `Parcourir l’atlas` avaient été remplacés par les cartes régionales et `Parcourir toutes les structures`. | Tests obsolètes | Utiliser les nouveaux noms accessibles ; conserver les assertions de maillage, isolation, zoom et index. |
| Deux navigations proposaient `Atlas 3D` sur mobile. | Sélecteur ambigu | Cibler la navigation pédagogique mobile par son rôle et son nom. |
| Les styles globaux, chargés après le CSS Atlas, masquaient les cartes régionales sur mobile/tablette et déplaçaient le bloc desktop jusqu’aux commandes de zoom. | Régression produit | Limiter les règles au conteneur 3D et placer les cartes au-dessus des commandes basses. |
| Cinq boutons occupaient une grille mobile de quatre colonnes. Le panneau spécialisé pouvait descendre sous cette barre. | Responsive | Cinq colonnes et espace inférieur réservé aux atlas spécialisés. |
| À 900 px, la marque, les boutons et le thème se chevauchaient. À 390 px, certaines entrées sortaient de la ligne de navigation. Une ancienne règle mettait aussi l’en-tête spécialisé en colonne sans hauteur suffisante. | Responsive | Ligne dédiée sur tablette, boutons compacts sur mobile et direction explicite de l’en-tête spécialisé. |
| Les atlas spécialisés n’étaient plus accessibles depuis le parcours 3D principal. | Régression de navigation | Ajouter les accès depuis les fiches Cœur et Cerveau, avec les fragments existants. |
| Fermer une fiche spécialisée conservait `structure` dans le hash : elle revenait après rechargement. | Synchronisation route/interface | Retirer la sélection du hash à la fermeture. |
| Le test flashcard cherchait l’ancien libellé et utilisait un `if (isVisible())`. Il pouvait réussir sans ouvrir la modale. | Couverture insuffisante | Exiger le bouton actuel, la modale, les champs préremplis ; tester également un enregistrement réel et sa persistance. |

Aucune erreur Three.js/WebGL n’est établie comme cause des échecs GitHub étudiés.
Le chargement différé est vérifié avec un GLB volontairement retenu : la fiche
apparaît avant l’arrivée des organes, puis le modèle se cadre après chargement.
Les nouvelles attentes utilisent des états observables, sans `waitForTimeout` ajouté.

## Fichiers modifiés

- `src/App.tsx` : classe du conteneur et accès aux atlas spécialisés.
- `src/atlas/navigation.ts` et `src/atlas/AtlasFlashcardModal.tsx` : provenance pédagogique des cartes et liens profonds réutilisables.
- `src/atlas/AtlasWorkspace.tsx` : fermeture de fiche synchronisée avec le hash.
- `src/atlas/atlas.css` : cartes régionales, en-tête et espace de navigation mobile.
- `src/styles.css` : grille de cinq entrées et disposition des navigations mobile/tablette.
- `tests/depth.spec.ts` : parcours cérébral actuel, avec isolation explicite.
- `tests/exploration.spec.ts` : bouton actuel d’ouverture de l’index.
- `tests/learning.spec.ts` : navigation mobile ciblée sans ambiguïté.
- `tests/atlas-brain-heart.spec.ts` : couverture renforcée des dix vues, fiches,
  liens profonds, fermetures, régions, zones de clic, GLB retardé et flashcard persistante.

Les captures `tests/artifacts/atlas-brain-{1440,900,390}.png` ont été inspectées.
Les parcours sont exécutés dans Chromium ; aucune validation sur appareil physique n’est revendiquée.

## Validation

Validation complète réussie sous Node **22.23.3**, installé dans un répertoire
temporaire hors du dépôt. Le serveur de diagnostic est arrêté : Playwright
démarre ses propres serveurs avec `VITE_QCM_TEST_SEED=playwright-qcm`.

| Commande | Résultat sous Node 22 |
| --- | --- |
| `npm ci` | Réussite |
| `npm run build` | Réussite |
| `npm run test:accounts` | Réussite |
| `npm run test:study` | Réussite |
| `npm run test:taxonomy` | Réussite |
| `npm run test:catalog-content` | Réussite |
| `npm run test:course-quality-sample` | Réussite |
| `npm run test:feedback` | Réussite |
| `npm run test:security` | Réussite |
| `npm run test:flashcards` | Réussite |
| `CI=1 npm test -- --shard=1/3` | 36 tests passés, aucun retry |
| `CI=1 npm test -- --shard=2/3` | 36 tests passés, aucun retry |
| `CI=1 npm test -- --shard=3/3` | 35 tests passés, aucun retry |

Les huit groupes backend totalisent **137 tests**, sans échec ni test ignoré.
Les trois shards totalisent **107 tests E2E**, sans échec ni nouvelle tentative.
Après la connexion pédagogique, le build, les 137 tests backend et les
12 tests Atlas ont été rejoués avec succès, sans retry.
Les trois shards complets ont ensuite été rejoués sur l’état final :
36, 36 et 35 tests réussis, sans échec ni retry (5,0 / 8,8 / 7,4 minutes).
Les sorties complètes sont conservées dans `/private/tmp/corpus-validation/`.
Les premiers essais diagnostiques incluent une interruption d’attente sur un
ancien sélecteur et un conflit de traces entre deux commandes partageant leur
dossier de sortie. Les validations suivantes utilisent des dossiers séparés.
La suite ciblée intermédiaire comptait 36 réussites et un échec sur le bouton
de visite guidée ; ce chevauchement a ensuite été corrigé.

## Architecture et contrats

À la reprise du 2 octobre, quatre fichiers avaient des changements locaux
inutiles : registre Atlas vidé et déclarations dupliquées. Ces seuls changements
ont été retirés, en conservant les définitions existantes compatibles avec les
flashcards 3D. Le build et les huit groupes backend ont ensuite réussi à nouveau.

La petite extraction `src/atlas/navigation.ts` compose les liens profonds et
la provenance des cartes à partir des mappings existants. La modale conserve
désormais le cours lié et la route de la structure dans les métadonnées déjà
supportées ; cela active le bouton existant « Revenir dans le cours ».
Le test de création vérifie également la persistance de cette provenance.
Aucune donnée médicale ni nouvelle table n’est ajoutée.

Les gros fichiers demandés ont été examinés. Les responsabilités sensibles
SQLite, comptes, génération et FSRS restent dans leurs modules actuels.
Aucun refactor global, changement de schéma, migration, ID anatomique, modèle,
manifeste, cookie, clé `corpus-*`, route API ou fichier `.env` n’est nécessaire
à cette stabilisation.

## Risques et suites

- Les gros bundles déclenchent encore l’avertissement Vite de taille des chunks.
- Les tests de maillages détaillés utilisent SwiftShader et restent coûteux ;
  certains anciens tests contiennent encore des pauses fixes.
- La validation locale macOS ne remplace pas une nouvelle exécution Linux GitHub.

Prochaines étapes : découpage ciblé des bundles Atlas, remplacement progressif
des pauses historiques par des états caméra observables, puis extractions
architecturales séparées et couvertes par les tests.

Publication des corrections et validation GitHub Actions en cours après
réussite de toutes les vérifications locales pertinentes.
