# Mes cours : audit et refonte de révision active

Branche : `feat/my-courses-active-learning`, issue de `origin/main` (`8fd1cb4`). Aucun déploiement ou changement des paramètres Gemini. Documents, données, clés et comptes de production non utilisés pendant la recette.

## Audit préalable et priorités

- `MyCoursesWorkspace.tsx` concentrait import, résumés, QCM, entraînement et occlusion. Accueil orienté génération, résumé affiché par défaut, absence de classement par matière. Le runner ne montrait que `why[0]`, même pour une autre réponse ; la liste de QCM ne gérait pas les choix multiples ni leur progression.
- `server/study.mjs` fournit déjà import/extraction/OCR, quotas, authentification, isolation par utilisateur, documents/sections/questions SQLite et PDF privé. `server/study/supports.mjs` et `server/ai/generation.mjs` gèrent les QCM Gemini, leurs preuves et les quotas. Réutilisation du contrat existant `/documents/:id/questions`, y compris les fournisseurs configurés et leurs comportements de secours. Pas de second moteur IA.
- `reviewSchedule.ts` fournit déjà les intervalles 1/3/7/14/30/60 jours et un retour à 6 heures après erreur. `account/store.ts` synchronise `corpus-practice-v1` par utilisateur. Pas de second ordonnanceur ni de remplacement des anciennes données de progression.
- Flashcards : `ReviewWorkspace`, `PdfCropSelector`, `ImageOcclusionEditor` et les decks existants sont conservés. Le lecteur PDF.js authentifié sert également aux preuves et aux chapitres.
- Atlas : structures et identifiants disponibles dans les modules d’anatomie, mais aucun lien fiable à des PDF arbitraires sans sélection/validation humaine. Pas de correspondance automatique ajoutée.
- Limites : titres de chapitres issus de l’extraction automatique, anciens PDF parfois sans texte page par page ; les pages par défaut existantes ne prouvaient pas l’emplacement d’une citation. Une citation retrouvée ne prouve pas, à elle seule, la vérité médicale d’une correction générée.

Priorité : P0 accueil/matières → interrogation par chapitre → preuves vérifiées et accès PDF → tests. P1 limité à l’historique réel des réponses et à la répétition espacée existante. P2 et examen blanc multi-documents reportés pour éviter un deuxième moteur d’examen sans fondations testées.

Inspiration UX : petites séances configurables et retour immédiat ([Knowt](https://help.knowt.com/en/articles/10714631-how-do-i-use-learn-mode)), révisions échues et lien au document ([RemNote](https://help.remnote.com/en/articles/6690975-learning-from-pdfs-and-files-with-the-remnote-reader)). Aucun écran ou contenu copié.

## Comportement implémenté

- Accueil : action Reprendre, import rapide, matières, cours récents, échéances, questions problématiques/consolidées et dernières tentatives. Une matière regroupe plusieurs cours et les chapitres sont les sections détectées. Matière libre, enregistrée côté serveur ; les anciens documents apparaissent « À classer ».
- Apprendre / S’entraîner / Maîtriser : le lecteur original et la navigation par chapitre, Interroge-moi, puis les lacunes par chapitre. Les résumés, exports, génération relue et flashcards restent dans les outils secondaires. Les anciens liens document/section restent pris en charge.
- Interrogation : 3/5/10/20 questions, cours entier ou chapitre ; erreurs, questions échues puis nouvelles questions avec priorité aux chapitres faibles. Questions disponibles réutilisées avant une demande de génération limitée au manque. Source absente/introuvable : question exclue. Moins de questions que demandé : quantité réelle annoncée. Échec : message réel, pas de contenu fictif.
- Validation multi-réponses avec le même calcul que le catalogue. Enregistrement serveur idempotent ; une erreur réseau conserve la sélection et le même identifiant à la relance. Toutes les propositions sont corrigées et la citation est affichée après validation. Le serveur recalcule le score.
- La page exacte n’est annoncée que si la citation est retrouvée dans `study_pdf_pages`. Sans correspondance, l’extrait du chapitre reste disponible avec « page exacte non confirmée » et accès au PDF original. Aucune garantie automatique de validité scientifique : le PDF demeure la référence.
- Maîtrise : nombre de questions consolidées après trois réussites espacées, dénominateur = questions du périmètre, pas pages lues. Les chapitres servent de regroupement ; aucun diagnostic de connaissance exhaustive du programme PASS/LAS.

## Migration additive

Deux nouvelles tables créées de façon idempotente au premier accès aux fonctions d’apprentissage : `study_learning_documents` (matière/dernière ouverture) et `study_learning_attempts` (réponse/score/horodatage côté serveur). Aucun ALTER, effacement ou réécriture des anciens PDF/QCM/résumés. La suppression explicite d’un cours supprime son organisation et ses tentatives via les clés étrangères. Une régénération de QCM conserve les tentatives précédentes ; l’historique affiche les 100 plus récentes. Les anciennes réponses restent dans `corpus-practice-v1`, sans inventer rétroactivement des tentatives détaillées.

Les nouvelles routes héritent de l’authentification, de la protection d’origine et du contrôle de propriétaire du document. Corps borné à 10 Ko, listes de réponses bornées et scores non acceptés depuis le client. Les identifiants de tentative doivent être uniques ; une relance identique rend la même réponse.

## Reporté et limites

- Examen chronométré multi-PDF et historique d’examens : non implémentés dans cette branche. L’examen du catalogue existant reste inchangé.
- Annotations, surlignage, sélection de texte vers question et mode cache-réponse : reportés. Occlusion visuelle et flashcards du document conservées.
- Atlas automatique : reporté, aucune structure attribuée à un document sans preuve.
- Gemini réel : pas d’appel avec une clé de production pendant les tests. Les parcours locaux et les doubles réseau vérifient l’intégration et les erreurs ; ils ne mesurent pas la qualité d’une génération distante sur un grand PDF réel. Les validations de preuve existantes sont réutilisées, sans prétendre garantir une correction sémantique parfaite.
- Aucun renommage manuel des sections détectées, pas de système de dossiers imbriqués. L’organisation par matière est modifiable et persistante.

## Recette finale locale

- `npm run build` : réussi (TypeScript + Vite). Avertissement connu sur les bundles supérieurs à 500 Ko ; pas d’erreur de compilation. Aucun script de lint configuré dans le projet. `git diff --check` réussi.
- 231 tests Node réussis : study 73 (dont 5 nouveaux tests d’apprentissage), accounts 8, flashcards 100, security 1, anatomy 22, student-progress 2, taxonomy 11, catalog-content 6, course-quality-sample 6, feedback 2.
- 48 parcours Playwright de régression réussis sur comptes, Atlas, campus/QCM, apprentissage, brouillons de flashcards, PDF, UX et examens. Après les derniers correctifs, 9 parcours ciblés réussis (incluant le nouveau test d’annonce du moteur de secours et le parcours PDF Study vers flashcards), puis 1 parcours de génération tardive réussi. Au total : 51 cas distincts.
- Contrôles à 320/375/768/1440 px : accueil, organisation et interrogation, sans débordement horizontal. Lecteur PDF réellement rendu, correction multi-réponses, source ouverte, tentative rejouée avec le même ID, classement et absence de consolidation après une seule réussite vérifiés.
- Le contrat serveur QCM avec un double Gemini vérifie le fournisseur appelé, le nombre, le chapitre, la persistance et le quota. Aucun appel Gemini réel ou accès à des données/secrets de production. La qualité scientifique sur un grand document réel reste à évaluer avec un jeu de cours autorisé.
- Pas de CI distante lancée : travail local, sans push ni publication. Les configurations de test locales et les captures temporaires ne font pas partie du code livré.

## Fichiers de la refonte

- `docs/my-courses-active-learning.md`
- `package.json`
- `server/study.mjs`
- `server/study/learning.mjs`
- `src/study/CourseLearningDashboard.tsx`
- `src/study/CourseLearningPanels.tsx`
- `src/study/CourseTrainer.tsx`
- `src/study/MyCoursesWorkspace.tsx`
- `src/study/courseLearning.css`
- `src/study/learningProgress.ts`
- `src/study/myCoursesApi.ts`
- `src/study/myCoursesTypes.ts`
- `src/study/questionScoring.ts`
- `src/study/questions.ts`
- `tests/course-learning.spec.ts`
- `tests/course-learning.test.mjs`
- `tests/flashcard-draft-review.spec.ts`
- `tests/flashcards.spec.ts`
- `tests/my-courses.spec.ts`
- `tests/pdf-and-summary-quality.spec.ts`
- `tests/product-ux.spec.ts`
