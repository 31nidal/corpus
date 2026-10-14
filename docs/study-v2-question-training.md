# Study 2.0 — QCM et entraînements

## Parcours

Une série appartient à un document et à son compte. La génération propose 1 à 30 questions, réponse unique ou multiple, difficulté essentielle/standard/avancée et objectif restitution/compréhension. Le périmètre est le cours, des chapitres ou un passage vérifié dans le PDF original. Plusieurs séries restent conservées ; aucun QCM historique n’est supprimé, et l’interface actuelle reste accessible par le contrôle de version.

Chaque question reste en brouillon. Chaque proposition conserve réponse, explication, relation à la preuve (implique/contredit), extrait verbatim, section et page. L’utilisateur peut modifier énoncé, propositions, réponses et explications ; toute modification invalide le contrôle IA précédent. Une validation demande une confirmation explicite de relecture. Les questions rejetées restent visibles et rééditables.

La régénération cible une seule question et conserve son identifiant. Une modification concurrente est protégée par sa version : une génération tardive ne l’écrase pas. La question régénérée redevient brouillon. Les tentatives déjà commencées gardent leur instantané original.

L’entraînement utilise uniquement les questions validées. En correction immédiate, la correction apparaît après enregistrement d’une réponse. En correction différée, le serveur masque réponses et explications jusqu’à la fin. Le score est calculé côté serveur ; les réponses multiples exigent l’ensemble exact des réponses correctes, sans crédit partiel. Terminer avec des réponses manquantes est explicite. Les réponses sont idempotentes, définitives après enregistrement et conservées en base avec l’historique et la reprise.

## Génération et limites pédagogiques

Le nouveau chemin Gemini ne modifie pas `generateStudyQuestions` historique. Un premier appel génère des candidats ; un second appel indépendant vérifie chaque question contre les fragments originaux : contexte de l’énoncé, implications/contradictions réelles, explications, ambiguïtés, unités et conditions. Une affirmation simplement absente du cours ne constitue pas une réponse fausse démontrée. Références inexistantes, réponses incohérentes, vérification insuffisante et doublons sont refusés.

Les appels de génération et de vérification sont agrégés dans la consommation existante. Les quotas mensuels et budgets quotidiens sont réutilisés. Aucun nouveau service, dépendance lourde ou assouplissement CSP. Une erreur Gemini reste explicite ; il n’y a pas de QCM local présenté comme vérifié à sa place.

Une passe génère au plus huit candidats par fragment groupé afin de borner les appels et la sortie JSON. Une demande de 30 questions peut donc fournir moins de questions, même sur une source valide ; le nombre réellement produit et la couverture des sections sont affichés. Le nombre demandé n’est jamais atteint en inventant des questions. La vérification est un deuxième appel au même modèle, pas un expert indépendant ni une certification médicale. Des erreurs corrélées du modèle restent possibles. Les contrôles de couverture comptent les sections citées et ne démontrent pas l’exhaustivité sémantique.

## Persistance et sécurité

Migration V2 3 additive : `study_v2_question_sets`, `study_v2_questions`, `study_v2_question_jobs`, `study_v2_training_attempts`. Sources et instantanés d’entraînement sont immuables. Les clés étrangères composites isolent document/compte et suppriment les supports avec le document. FSRS-6, cartes, decks et historiques flashcards restent inchangés.

Limites : 30 séries/document, 30 questions/série, six générations actives/en attente, deux traitements simultanés, bail de 60 secondes renouvelé toutes les 20 secondes. Une génération expirée devient interrompue et n’est pas relancée automatiquement : consommation IA éventuellement incertaine. Les demandes sont idempotentes par compte ; aucune erreur de génération ne crée une question sans preuve.

Toutes les routes contrôlent la propriété (404 pour autrui), et les écritures gardent la CSRF existante :

- `GET/POST /api/study/v2/documents/:doc/question-sets`
- `GET/DELETE /api/study/v2/documents/:doc/question-sets/:set`
- `PATCH /api/study/v2/documents/:doc/question-sets/:set/questions/:question`
- `POST .../questions/:question/regenerate`
- `GET /api/study/v2/documents/:doc/question-jobs/:job`
- `POST /api/study/v2/documents/:doc/question-sets/:set/train`
- `GET /api/study/v2/documents/:doc/training` et `GET .../training/:attempt`
- `POST .../training/:attempt/answer` et `POST .../training/:attempt/finish`

Supprimer une série supprime ses entraînements après confirmation ; cela ne supprime ni le cours, ni ses fiches, ni ses flashcards. L’historique liste les 100 dernières tentatives ; le détail d’une tentative connue reste accessible. Cette interface est un outil de révision individuel : le propriétaire peut consulter les corrections dans sa série, même pendant un entraînement ; il ne s’agit pas d’un examen surveillé.

## Fichiers et validation

Backend : `server/study/v2/questions-schema.mjs`, `question-validation.mjs`, `questions.mjs`, `question-training.mjs`, intégrations `schema.mjs`, `handler.mjs`, `server/study.mjs`, `server/ai/study-questions.mjs`, `pedagogy.mjs`, `generation.mjs`.

Interface : `src/study/v2/QuestionsWorkspace.tsx`, `QuestionGenerationForm.tsx`, `QuestionCard.tsx`, `QuestionTraining.tsx`, `useQuestionSets.ts`, `questionApi.ts`, `questionTypes.ts`, `questions.css`, intégration du lecteur et de sa sélection dans `DocumentWorkspace.tsx`. Les espaces sont chargés à la demande ; le bundle principal reste 760,48 ko.

Tests API et provider : `tests/study-v2-questions.test.mjs` couvre propriété, CSRF, idempotence, modifications/versions, régénération ciblée/conflit concurrent, interruption, plafonds, preuves, vérification séparée/consommation, réponses uniques/multiples, corrections masquées, score, instantanés et cascade.

Tests navigateur : `tests/study-v2-questions.spec.ts`. Deux tests de contrat UI simulent les réponses QCM après un véritable import/lecture PDF : édition, validation, correction différée, historique/source, mobile 390 px et reprise réseau. Le troisième utilise les routes réelles sans Gemini pour vérifier l’erreur explicite sans faux résultat local. Les simulations navigateur ne démontrent pas la génération distante réelle ; celle-ci est testée avec un provider injecté dans les tests serveur, sans mécanisme de test en production.

Captures recréées dans `tests/artifacts/design/study-v2-qcm-desktop.png` et `study-v2-qcm-mobile.png`, ignorées par Git. Build TypeScript/Vite réussi ; Study 112/112, flashcards 109/109, catalogue 6/6 et 18 parcours navigateur (QCM, fiches, bibliothèque, Mes cours historique et flashcards) verts.

## Non vérifié manuellement et suites possibles

Gemini réel sur un corpus médical, homogénéité pédagogique des distracteurs, Safari/iPhone, lecteur d’écran et très nombreuses séries non vérifiés manuellement. Les prompts et contrôles ne remplacent pas une revue médicale. La validation globale sur les documents de référence reste nécessaire avant de déclarer Study 2.0 terminé.

À suivre : assistant documentaire, flashcards depuis un passage exact et validation finale du corpus. Activation bêta réversible ; aucune fusion ni mise en production automatique.
