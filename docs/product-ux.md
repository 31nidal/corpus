# MyCorpus — amélioration des parcours

## A. Audit avant modification

Base : `bca46e5`, branche de travail `feat/product-ux`. Lecture des composants et des tests, navigation dans Chromium local, captures avec le système existant. Les comptes de capture sont temporaires.

| Priorité | Espace | Problème constaté | Intervention prévue |
| --- | --- | --- | --- |
| P0 | Cours | Les liens du sommaire disparaissent sur mobile ; aucune section active sur desktop. | Sommaire repliable mobile, section active au défilement, progression accessible. |
| P0 | Atlas | Recherche par sous-chaîne contiguë, classement des ensembles avant les noms exacts. | Normalisation, mots dans tout ordre, classement exact/français/original/catégorie. |
| P0 | Mes cours | Erreurs de génération/suppression dans `alert()`, absentes du détail du document. | Erreur contextualisée dans le panneau, document conservé, message fermable. |
| P1 | Navigation | Deux navigations mobiles répètent cinq destinations ; Compte sans état actif et Atlas spécialisé sans état sémantique. | Destinations cohérentes, état courant explicite, retour et focus visibles. |
| P1 | Atlas 3D | Deux jeux de commandes de zoom ; identifiant technique et partage avant le rôle anatomique. | Commandes complémentaires, rôle et détails prioritaires, provenance conservée. |
| P1 | Cours | Génération de flashcards plus visible que lecture ; lien Atlas discret et éloigné. | Actions secondaires plus calmes, lien Atlas immédiat si relation existante. |
| P1 | QCM | Correction liste les propositions sans hiérarchie explicite ; modes proches visuellement. | Bonnes réponses/justifications identifiées, mode examen sobre, progression et sélection visibles. |
| P1 | Flashcards | CTA « Commencer » peu explicite ; compte de cartes dues répété ; générateur occupe le premier écran devant les decks. | « Réviser maintenant », decks avant création, états sans carte/deck avec action. |
| P1 | Révision | Recto/verso techniques, aucun raccourci général, notation peu guidée. | Question/réponse, espace et 1–4 avec garde-fous, boutons mobiles lisibles. |
| P1 | Mes cours/import | Workflow décrit techniquement, aucun nom/taille pendant extraction ; deux grands états vides équivalents. | Étapes lisibles, bénéfices, statut réel d’extraction et fichier, un état vide compact. |
| P1 | Atlas cœur/cerveau | Actions d’apprentissage cachées ; caption générique identique dans les modes pédagogiques. | Actions immédiatement accessibles, consigne spécifique au mode, détails secondaires repliables. |
| P1 | Compte | Depuis les états invités, aucune action directe vers le formulaire pourtant disponible. | Lien de connexion dans les états invités, état actif et retour du panneau. |
| P2 | Tous | Quelques couleurs inline/anciens espacements contournent les tokens. | Polish des zones touchées ; conserver les couleurs médicales des schémas. |
| P2 | Performance | Mes cours et Flashcards déjà lazy ; Atlas spécialisé importé directement. | Évaluer le lazy loading sans charger de modèle supplémentaire. |

Les données médicales, IDs, relations de cours existantes, scoring, FSRS, SQLite et règles d’import restent la référence. Aucun nom latin ou mapping nouveau n’est inventé. Les noms sources existants restent affichables.

## Validation et résultat

### Changements réalisés (B–J)

- **Navigation** : six espaces, une seule navigation mobile, destination courante explicite et accès direct au compte depuis les états invités.
- **Atlas principal** : recherche normalisée, accents et mots dans tout ordre, noms français exacts prioritaires, nom source et catégorie. L’index détaillé est chargé au besoin sans charger les GLB. La sélection charge ensuite la scène nécessaire. La fiche privilégie la fonction et les repères, garde les détails accessibles et rassemble les actions pédagogiques. Un seul jeu de zoom est visible selon le contexte ; les outils restent au-dessus de la navigation mobile.
- **Cours** : sommaire actif, progression de lecture, panneau compact sur mobile et accès immédiat à l’Atlas pour les relations déjà présentes. La navigation vers une section est immédiate pour éviter qu’une interaction avec le sommaire interrompe un long défilement.
- **QCM** : sélection accentuée, correction hiérarchisée, difficulté et progression, navigation libre des questions et retour. L’examen conserve la correction masquée et son scoring. Chaque nouvelle question revient en haut pour rendre son mode et son numéro visibles.
- **Flashcards** : « Réviser maintenant », decks avant générateur, cartes dues/nouvelles, progression et série de jours. Révision centrée sur Question/Réponse, progression et notation tactile. Espace/Entrée révèlent ; 1–4 notent après disponibilité du preview. Les cartes 3D et Image Occlusion gardent leurs interactions spécifiques.
- **Mes cours** : six étapes de l’import à la révision, PDF par dépôt ou sélection, bouton de sélection visible dès le premier écran mobile, nom/taille et indicateur pendant l’extraction, états vides avec action, erreurs dans le document et toasts après succès.
- **Cœur/Cerveau** : consignes propres aux modes, fonction/localisation prioritaires, actions d’apprentissage visibles et détails secondaires repliables. Le module spécialisé est lazy et ne monte pas le viewer GLB caché.
- **Polish** : tokens, Manrope/DM Sans, retours cohérents, focus et boutons tactiles, dark mode et réduction des animations.

### Parcours simplifiés

1. Chercher une structure → ouvrir sa fiche → cours ou entraînement, sans activer manuellement l’Atlas détaillé.
2. Lire → ouvrir le sommaire compact → choisir une section → repérer la section active.
3. Choisir une série → répondre → valider → comprendre la correction → revoir le cours.
4. Ouvrir Flashcards → réviser → révéler → noter au clavier ou au toucher.
5. Importer un PDF → voir le fichier en cours d’extraction → lire → générer, avec possibilité de réessayer après erreur.
6. Sélectionner cœur/cerveau → lire sa fonction → accéder directement aux actions pédagogiques.

### Fichiers modifiés

| Groupe | Fichiers |
| --- | --- |
| Navigation et Atlas principal | `src/App.tsx`, `src/styles.css`, `src/atlas/search.ts` |
| Atlas spécialisés | `src/atlas/AtlasInfoPanel.tsx`, `AtlasWorkspace.tsx`, `atlas.css` |
| Cours et QCM | `src/study/CoursesWorkspace.tsx`, `CourseLibrary.tsx`, `PracticeWorkspace.tsx`, `study.css` |
| PDF | `src/study/MyCoursesWorkspace.tsx`, `myCourses.css` |
| Flashcards | `src/flashcards/FlashcardsWorkspace.tsx`, `flashcards.css` |
| Capture et documentation | `scripts/capture-design.mjs`, `docs/design-comparison.html`, ce rapport, `product-ux-screenshots.md`, instructions de reproduction |
| Tests | `tests/product-ux.spec.ts`, `atlas-brain-heart.spec.ts`, `design-system.spec.ts`, `exploration.spec.ts`, `flashcards.spec.ts`, `learning.spec.ts` |

Les 24 PNG de revue (2 741 173 octets, 2,61 Mio) ont été retirés ; aucune image ne justifiait une conservation durable. Le script, le rapport et la galerie permettent de recréer les comparaisons.

Aucune dépendance ajoutée, aucun changement de contenu médical, d’IDs, de modèles GLB, de routage, de règles de scoring, de FSRS ou de SQLite. Les adaptations des tests existants portent sur les libellés, la navigation visible et les actions devenues immédiatement accessibles ; leurs vérifications métier restent présentes.

### Comparaison visuelle

[Instructions de reproduction des comparaisons](product-ux-screenshots.md) et [galerie locale](design-comparison.html). Référence `bca46e5` : 44 captures ; produit amélioré : 88 captures (11 parcours × 4 largeurs × 2 thèmes). Polices chargées vérifiées et absence de débordement horizontal dans toute la matrice. Les comptes de démonstration sont supprimés après capture.

Les captures ont été réellement inspectées pour les alignements, la lecture, les actions principales et les contrôles. Elles ont notamment révélé le chevauchement des outils 3D par la navigation, la scène masquée derrière la fiche mobile spécialisée et le haut des QCM conservant le défilement du formulaire : ces points ont été corrigés.

### Validation UX initiale, avant synchronisation

- `npm ci` avec Node 22 : réussi.
- `npm run build` : réussi après chaque étape et lors de la validation finale. Le warning Vite existant sur la taille de certains chunks reste présent.
- Huit suites backend : **137 tests réussis**, aucun échec (`accounts` 6, `study` 25, `taxonomy` 11, `catalog-content` 6, `course-quality-sample` 6, `feedback` 2, `security` 1, `flashcards` 80).
- Corrections mobiles : **4 tests ciblés réussis** sans retry ; **2 tests ciblés supplémentaires réussis** après le dernier contrôle de l’import PDF et des commandes caméra.
- Parcours produit et design system : **19 tests ciblés réussis** sans retry, quatre largeurs et deux thèmes.
- Recherche Atlas : **5 exécutions successives réussies**, sans retry, après correction de la transition entre les deux index.
- Suite E2E finale : `CI=1 npm test -- --retries=0` ; **126 tests** incluant 11 nouveaux tests produit. Les résultats complets et les trois jobs de CI sont consignés dans la PR.

Les tests couvrent la recherche détaillée sans GLB anticipé, la fiche et le lien cours/Atlas, les sommaires desktop/mobile, la navigation dans les six espaces, la révision au clavier avec notation réellement persistée, le statut d’import et une erreur de génération simulée avec document conservé. Les assertions tactiles vérifient également que le menu Structures fermé n’intercepte pas les commandes caméra. Les nouvelles assertions QCM protègent le mode et le numéro visibles au démarrage et au changement de question. Les tests existants continuent de vérifier réponses, scoring, correction, flux PDF, cartes 3D et Image Occlusion.

La première suite complète a identifié trois échecs (121/124 réussis) : outils masqués par la navigation, navigation du sommaire interrompue et ancienne assertion refusant le nom source. Les corrections ont été vérifiées avant la relance complète. Un passage ultérieur (125/126 réussis) a également révélé une transition tardive entre l’index léger et l’index détaillé : la sélection installe maintenant immédiatement l’index déjà disponible et sa fiche, avant le chargement GLB. Cinq exécutions successives du parcours ont validé la correction sans retry.

### Améliorations restantes (maximum cinq)

1. Étendre un jour le modèle anatomique pour les structures absentes, notamment le nerf médian. Aujourd’hui sa recherche propose un cours existant, sans inventer un ID ni un maillage.
2. Affiner davantage le partage de l’espace entre planche et fiche sur les téléphones de faible hauteur.
3. Ajouter une progression d’extraction chiffrée si le serveur fournit un jour des étapes mesurables ; l’indicateur actuel reste indéterminé.
4. Enrichir les liens QCM → Atlas uniquement après validation de relations anatomiques fiables.


## Synchronisation avec la base performance PR #3

Les optimisations de `perf/ci-and-lazy-loading` sont conservées : compilation/tests backend dans un seul job `validate`, puis trois shards E2E dépendants ; imports dynamiques de `CoursesWorkspace`, `PracticeWorkspace` et `AtlasWorkspace`. Les écrans Cours et Entraînement utilisent une boundary Suspense avec chargement cohérent pour préserver la navigation pendant le téléchargement. Aucun import eager de ces trois espaces n’est présent. Un E2E contrôle leurs requêtes à la demande et la navigation pendant un chargement retardé.

Les conflits de `App.tsx` ont été résolus en gardant la recherche Atlas, les états de navigation, les fallbacks UX et les callbacks pédagogiques. Les composants QCM, Flashcards, PDF et Atlas spécialisés de PR #4 sont conservés. Aucun changement de règles métier, FSRS, SQLite, contenu médical ou routing n’est inclus dans cette synchronisation.

Mesures comparables avec Node 22, `npm run build`, fichier JS référencé par `dist/index.html`, gzip Python niveau 9 calculé sur les mêmes octets :

| Bundle principal | Avant : PR #4 `ddf6d4b` | Après : UX + base performance |
| --- | ---: | ---: |
| JS non compressé | 3,078,888 octets | 2,887,528 octets |
| gzip | 836,871 octets | 781,371 octets |

Réduction : 6.22 % du JS principal, 6.63 % gzip. Ce chiffre mesure le fichier d’entrée, pas le total des chunks ni les GLB. Les espaces différés restent téléchargés lorsqu’ils sont ouverts.

Les 24 PNG de revue sont supprimés du contenu final (2 741 173 octets économisés) ; aucune image n’a été retenue comme documentation permanente. Les captures restent reproductibles via le script et la galerie locale.

Validation de l’intégration locale sur `0bb5c76` (tête de PR #3) : `npm run build` réussi ; huit suites backend réussies, **137 tests** ; `CI=1 npm test -- --retries=0` réussi, **127 tests en 16,8 minutes**, aucun retry. Les 12 tests produit incluent le nouveau contrôle de lazy-loading. Une exécution précédente interrompue par la mise en veille du Mac a été écartée et entièrement relancée avec `caffeinate -i`.

PR #3 a été fusionnée dans `main` au commit `e699c25273c074264f5fdf43dca23d2416d8437b`. PR #4 est rebasée sur cette base ; le rebase ne modifie aucun fichier de l’intégration déjà validée. La CI GitHub exécutera à nouveau le build, les huit suites backend et les trois shards E2E sur cette nouvelle base.

La validation d’intégration a exposé une boucle de rendu préexistante dans `ReviewAtlas3D` : la configuration de visibilité était recréée après chaque notification de chargement, ce qui relançait le chargement. Les objets de visibilité et d’opacité sont désormais mémorisés ; leurs valeurs et la scène restent identiques. Les deux parcours 3D ont passé trois exécutions chacun (6 tests sans retry), avec une assertion supplémentaire contre la boucle React. FSRS, notation et données de scène restent inchangés.
