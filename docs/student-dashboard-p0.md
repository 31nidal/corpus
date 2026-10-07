# Pilotage étudiant P0

Branche `feat/student-dashboard-p0`, issue de `main` après fusion de la PR #5 (`baeebc7`). Cette PR doit être revue avant fusion.

## Écrans et parcours

L’entrée **Aujourd’hui** de la navigation principale et mobile ouvre `#tab=aujourdhui`. La page propose les tâches réellement disponibles, une carte de maîtrise, le carnet **Mes faiblesses** et une entrée **Examen blanc**. L’Atlas demeure accessible avec ses routes existantes.

La session du jour prend, dans cet ordre : les flashcards dues disponibles, les erreurs QCM dues (ou les autres QCM dus si aucune erreur n’est due), jusqu’à dix QCM d’un chapitre faible et le cours commencé le plus récent. Aucune question ni carte nouvelle n’est générée. Les séries QCM sont bornées à la banque réellement disponible. Les erreurs/QCM dus sont proposés par lots de vingt au maximum ; le moteur flashcards conserve ses lots de trente et l’enfouissement des cartes sœurs. Le bouton **Continuer ma session** permet de poursuivre après les séries. Un cours se termine par son action existante. Le dashboard permet également de reprendre ou de passer une étape.

Invités : les cours et QCM restent enregistrés localement. Connectés : les données existantes et la lecture utilisent `storageScope` et la synchronisation du compte. Les flashcards continuent d’exiger un compte, comme avant cette évolution. Leur absence ou indisponibilité ne produit pas un faux nombre de cartes dues.

## Données et maîtrise

`corpus-practice-v1` reste l’unique source des tentatives, erreurs et échéances QCM. Les modifications du carnet proviennent toujours de `nextReview` et `isDue` dans `reviewSchedule.ts`. Les formules de correction, le remappage des propositions et les IDs restent inchangés.

Pour un chapitre ou une matière :

**score = arrondi(100 × nombre de questions dont le dernier essai est juste / nombre de questions distinctes dont le dernier essai date des 30 derniers jours).**

Le dernier essai est juste quand `wrong === false`. Une question n’est comptée qu’une fois, quel que soit son nombre de tentatives. Le score de matière est calculé sur ses observations, sans moyenne des pourcentages des chapitres. Sans observation datée récente, le score vaut `null` et s’affiche « — ». Les anciennes données dépourvues de date restent dans le carnet et les tentatives historiques, mais ne créent pas de score récent.

États : maîtrisé ≥ 85 %, à consolider de 70 à 84 %, faible < 70 %. Ce score décrit l’entraînement observé et ne prédit pas une note de concours. La couverture (nombre de QCM observés) est affichée pour ne pas confondre une seule bonne réponse avec une preuve de maîtrise exhaustive.

Cours terminés et lecture sont affichés séparément, sans points de maîtrise artificiels. Les statistiques FSRS réutilisent le critère existant `repetitions >= 3 && interval_days >= 21` pour les cartes maîtrisées. Aucun changement de FSRS, de ses paramètres ou de ses échéances. Les interactions Atlas ne sont pas utilisées comme preuve de connaissance.

Le compteur QCM du jour compte les questions distinctes dont `lastReviewed` tombe dans le jour civil local. Il ne prétend pas compter tous les essais du jour, information absente des enregistrements invités. Les réponses flashcards du jour sont calculées dans le fuseau IANA du navigateur par le backend existant.

## Architecture et persistance

- `src/dashboard/progress.ts` : calculs purs et construction du parcours ; `DashboardWorkspace.tsx` : UI ; `session.ts` : parcours temporaire, isolé par compte et conservé dans l’onglet.
- `catalog.json` : index d’IDs, titres et matières (305 chapitres, 2 543 questions), sans questions médicales, corrections ni géométrie. Recréer avec `npm run dashboard:index` après un changement du catalogue. Un test vérifie son identité avec les données sources.
- `src/study/courseIndex.json` contient uniquement les ID, titres, matières, repères Atlas et intitulés de sections nécessaires à la navigation et à la recherche existantes. Il est régénéré et testé avec le même script. Le catalogue complet et la banque QCM passent dans un chunk à la demande. Le panneau de compte et le viewer principal sont également lazy. Une ouverture du dashboard ne déclenche pas Three.js ni le viewer.
- Dashboard et espaces existants restent lazy. Une ouverture directe du dashboard ne charge ni manifeste ni GLB du viewer Atlas. Le chargement et les routes existants de l’Atlas restent disponibles.
- `corpus-reading-v1` : pourcentage maximal de défilement, section et date par cours. Maximum 500 entrées. La fusion entre appareils garde le pourcentage maximal et la section la plus récente ; validation côté serveur. Le défilement est un repère de lecture, pas une preuve d’acquisition. Les anciennes lectures non persistées ne sont pas reconstituées artificiellement.
- La lecture utilise la table `entries` existante. **Aucune migration ni nouvelle table SQLite.** Import de progression invité incluant la lecture via l’action existante du compte.
- `GET /api/account/exams` : dix événements `quiz` dont le titre est `Examen blanc`, issus de la table `history` existante et limités au propriétaire. Aucun deuxième historique QCM.
- Le bilan d’examen enregistre toujours les erreurs via `nextReview` et l’événement `quiz` via `storageScope.event`.
- `examSession.ts` conserve dans `sessionStorage` les IDs, la graine de permutation, les réponses, l’index et les horodatages. À la restauration, les énoncés et corrections sont reconstruits depuis la banque existante. Le résultat terminé est restaurable sans incrémenter de nouveau les tentatives.

## Examen blanc

Réutilise `PracticeWorkspace` : matière/chapitre existants, sélection de plusieurs matières, niveau, 5/10/20/40 questions, durée automatique (75 secondes par question) ou 1/5/10/30/60/120 minutes, banque mixte/jamais vue/erreurs. Avec un chapitre choisi, son filtre demeure prioritaire.

Pendant l’examen : timer, navigation numérotée, réponses modifiables, aucun feedback immédiat. Quitter avant la soumission ouvre une confirmation native avec focus et retour possible à l’examen. Le timer continue et soumet automatiquement à l’échéance. La fin normale se fait depuis la dernière question.

Bilan : score entier existant, durée, bonnes/mauvaises/non répondues, scores par matière et chapitre, cours associés et corrections existantes. Une question non répondue reçoit zéro et rejoint les erreurs selon la règle QCM existante. Historique pour les comptes ; en mode invité, progression et bilan de l’onglet restent disponibles sans nouvelle base locale parallèle.

Bundle principal de référence PR #5 : 2 887,35 kB (gzip 783,99 kB). Après cette séparation : 760,44 kB (gzip 189,66 kB). Les chunks de cours/QCM restent accessibles à la demande ; les données médicales ne sont pas modifiées.

## Captures et validation

Lancer la preview locale puis `node scripts/capture-student-dashboard.mjs`. Seize captures (Aujourd’hui, Maîtrise, faiblesses, configuration examen × 1440/390 px × clair/sombre) sont créées dans `tests/artifacts/design/student-dashboard/`, ignoré par Git. Le script refuse les domaines distants pour ne pas injecter de données de démonstration sur la production.

Tests ajoutés : index fidèle, formule et absence de score, pondération par observation, erreurs et réussite, parcours disponible, lecture multi-appareils, statistiques FSRS isolées, dashboard vide/actif/indisponible, navigation vers cours/QCM, timer configurable, permutation/réponses restaurées, soumission unique, bilan et synchronisation du résultat. Les suites métier existantes restent conservées.

Validation finale locale : build production avec contrôle TypeScript réussi ; 141 tests backend/progression réussis ; `npm test -- --retries=0 --workers=2` : 179 tests réussis en 14,9 minutes, sans retry. Les 40 tests ciblés dashboard/flashcards/navigation passent également. Parcours manuel dashboard → Atlas → dashboard contrôlé sans erreur JavaScript. Les captures sont recréées après les dernières corrections de navigation.

## Limites assumées

- Les scores récents reposent sur le dernier essai par question ; l’ancien store invité ne fournit pas un historique de tous les essais datés.
- La lecture commencée est mesurée à partir de cette version ; aucun pourcentage rétroactif inventé.
- Les séances et réponses d’examen sont persistées dans l’onglet, pas synchronisées en cours d’examen entre appareils. Les résultats des comptes sont synchronisés par le mécanisme existant.
- Les cartes et cours PDF personnels restent accessibles dans leurs espaces existants. Ils ne sont pas assimilés automatiquement à un chapitre canonique sans correspondance fiable.
- « Maîtrisé » reste un indicateur d’entraînement observé, accompagné de sa couverture.
