# Study 2.0 — audit du socle existant

Audit du 13 octobre 2026, base `c6e98d1d7eef91fd899e5b0bca13aa3803fff279`. Ce document distingue les constats de lecture du code, les tests déjà disponibles et les validations à réaliser. Il ne certifie pas la qualité médicale des générations.

## Architecture vérifiée

Application React/Vite, API HTTP Node, SQLite natif (`node:sqlite`, WAL, clés étrangères). Pas de Next.js, SSR ni ORM. Versions exactes du lockfile : React/React DOM 19.2.8, Vite 6.4.3, TypeScript 5.8.3, pdfjs-dist 6.3.289, ts-fsrs 5.4.2, Playwright 1.63.0, jsPDF 4.2.1. Node local 26.7.0 ; CI Node 22 ; plage supportée >=22.13 et <27 (`package.json`, `package-lock.json`, `.github/workflows/ci.yml:20`).

`src/study/MyCoursesWorkspace.tsx` (978 lignes), `myCoursesApi.ts` (117), `myCoursesTypes.ts` (70) et `myCourses.css` (683) lus intégralement. Analyse des handlers Study, extraction, OCR, quotas, fournisseurs, brouillons/notes et scheduler. Les observations ci-dessous sont statiques sauf lorsque le rapport de validation cité fournit un test reproductible.

## Parcours actuel et constats

| Constat | Référence précise | Conséquence / priorité |
|---|---|---|
| L’extraction/OCR précède le stockage du fichier et la création du document. Un échec renvoie une erreur sans conserver le PDF. | `server/study.mjs:230–342` | Pas de reprise, de consultation ni de récupération d’un import illisible. P0 pipeline. |
| L’import reste une requête longue ; pas de journal de tâche, heartbeat ou reprise après redémarrage. | `server/study.mjs:206`, `server/study/pdf-layout.mjs:7`, `myCoursesApi.ts:37` | Une coupure réseau rend l’état ambigu ; les états processing/error du schéma ne pilotent pas réellement ce parcours. P0. |
| Un scan intégral peut être transmis à Gemini automatiquement si configuré, indépendamment de la case OCR pour les pages mixtes. | `server/study.mjs:238`, `src/study/MyCoursesWorkspace.tsx:886` | Rendre le consentement et la consommation OCR explicites et persistants dans V2. |
| Le classement ne connaît que des documents, sans matières, chapitres de bibliothèque, recherche ni archive. | `server/study.mjs:26–93,184`, `MyCoursesWorkspace.tsx:934` | Bibliothèque difficile à utiliser et suppression définitive comme seule gestion. |
| `loadDoc` réinitialise l’onglet selon les supports disponibles ; le PDF original est un lien de téléchargement ou une modale. | `MyCoursesWorkspace.tsx:160,340`, `src/flashcards/PdfCropSelector.tsx:108` | Pas de lecteur central, position ni sélection textuelle ; le viewer canvas ne propose pas de text layer. |
| Les réponses réseau ne sont ni annulées ni rattachées à un identifiant de sélection dans le composant. Le document courant n’est pas réinitialisé lors d’un changement de compte. | `MyCoursesWorkspace.tsx:135–177`, `src/App.tsx:539` | Risque d’affichage périmé et de données de l’ancien compte dans l’état React ; les endpoints restent protégés par propriétaire. À tester explicitement. |
| Le document initial est utilisé à l’initialisation du state, sans synchronisation avec les changements de prop. | `MyCoursesWorkspace.tsx:63`, `src/App.tsx:199–202` | Risque de décalage entre lien profond/historique et document affiché. |
| Plusieurs actions concurrentes pour synthèse/QCM, ancien flux direct et prévisualisation selon le provider. | `MyCoursesWorkspace.tsx:221–269,344–390,490`, `server/study.mjs:387–401,471` | Parcours et validation différents selon Gemini/local/Ollama. Unifier V2 sans casser les anciens contrats. |
| Sauvegarder une synthèse supprime l’ancienne ; une seule synthèse est retournée. | `server/study/supports.mjs:81`, `server/study.mjs:413,528` | Plusieurs fiches, historique et édition après sauvegarde impossibles. |
| Les previews expirent après 2 h et ne constituent pas un support pérenne. | `server/study/supports.mjs:32,110` | Ajouter des supports persistants/versionnés, ne pas utiliser les previews comme bibliothèque. |
| Génération QCM Gemini à réponse unique, justification des distracteurs générique. | `server/ai/pedagogy.mjs:123–143` | La preuve de la bonne réponse ne suffit pas à établir la fausseté de chaque distracteur. P0 pédagogique du lot QCM. |
| Le format single est imposé au backend ; la liste utilise un seul index sélectionné. | `server/study.mjs:871,906`, `MyCoursesWorkspace.tsx:67,554` | Réponses multiples à implémenter dans le nouveau contrat, pas à simuler par plusieurs radios. |
| L’entraînement affiche toujours `why[0]` et stocke ses résultats dans localStorage. | `MyCoursesWorkspace.tsx:261,714` | Mauvaise proposition expliquée selon l’ordre ; historique non synchronisé entre appareils. |
| Le message source affirme qu’aucune notion extérieure n’a été inventée. | `MyCoursesWorkspace.tsx:756` | Assertion non démontrée par les contrôles actuels. Remplacer par une explication honnête des références. |
| Les URLs blob de l’occlusion sont créées pendant le render et jamais révoquées. | `MyCoursesWorkspace.tsx:780` | Fuite de ressources lors des rendus. Réutiliser le composant avec une URL bornée au cycle de vie. |
| Grille minmax(320px,1fr) dans un conteneur avec padding ; actions nombreuses et modale source sans rôle/focus trap. | `myCourses.css:193`, `MyCoursesWorkspace.tsx:742` | Risque de débordement à 320 px et accessibilité irrégulière. |

## Extraction et sources

`server/study/pdf-layout.mjs` utilise pdfjs et conserve le parser natif de `server/pdfExtractor.mjs` comme compatibilité. Colonnes, blocs monospace, indices et glyphes AMS ont été améliorés dans la PR #14 ; les fractions complexes et zones non textuelles restent incertaines. La limite PDF est 25 Mo, 600 pages côté extraction, 40 pages/10 Mo pour OCR Gemini (`server/ai/pedagogy.mjs:146`). L’OCR retourne uncertain et n’écrase pas les pages déjà lisibles (`server/study/ocr-pages.mjs:11`).

Les pages (`study_pdf_pages`) et sections ont déjà un propriétaire et des pages sources. Les blocs/positions produits dans `pdf-text.mjs` ne sont pas persistés. Aucune coordonnée fiable de figure n’est inventée. Les filtres non supportés, flux corrompus et scans doivent garder leurs diagnostics distincts.

La reconstruction du plan reste heuristique ; ne pas confondre moins de sections avec absence de perte. Référence : `docs/quality/pdf-summary-nonmedical-2026-10-13.md`. Les cours existants ne sont pas retraités automatiquement.

## Contrats flashcards à conserver

- Scheduler FSRS actuel dans `server/flashcards/fsrsScheduler.mjs`, migrations numérotées dans `migrations.mjs`, notes/cards/review_logs/decks conservés sans modification. FSRS-6 reste le moteur de révision.
- Les brouillons persistants ont identité permanente, preuve, document/section/page, content_hash et accepted_note_id. Acceptation transactionnelle idempotente, restauration et dédoublonnage : `server/flashcards/review/schema.mjs:8`, `repository.mjs:51,126`, `handler.mjs:28`.
- Génération existante par document, section(s), plage de pages ; la plage filtre les sections qui se chevauchent, sans découper leur contenu (`review/repository.mjs:51–67`). Une sélection exacte nécessite une validation dans le texte possédé ; elle ne doit pas créer un second générateur.
- Types basic/reverse/bidirectional/cloze/typed, occlusion et Atlas conservés. `src/study/review/ReviewWorkspace.tsx` est réutilisable en panneau ; révision de la carte créée passe par son noteId.
- Suppression définitive d’un document cascade les brouillons ; les notes/cartes acceptées ont leur source SET NULL (`server/flashcards/schema.mjs:11,88`). Une archive/restauration V2 n’effectue aucune de ces suppressions.
- L’export Anki reste accessible au backend pour compatibilité mais ses boutons ont été retirés de l’interface. La refonte ne réintroduit pas ces boutons ni ne supprime ce contrat (`server/study.mjs:758`, `tests/anki-export.spec.ts`).

## Sécurité, quotas et stockage

Les handlers identifient la session hachée et filtrent les documents par user_id ; les mutations exigent le header anti-CSRF et vérifient l’origine (`server/study.mjs:132,172,382`). La CSP n’autorise que les ressources du projet, dont worker-src self/blob (`server/security.mjs:2`). PDF/worker doivent rester servis sous cette origine ; aucune clé Gemini dans le client.

Les générations réservent atomiquement le quota mensuel, journalisent usage/échecs et appliquent un budget quotidien (`server/study/quota.mjs:95`, `server/ai/generation.mjs:5`, `server/ai/usage.mjs:26`). Les erreurs Gemini peuvent déclencher un repli local explicitement étiqueté. Une tâche asynchrone ne doit jamais réessayer automatiquement un appel dont la facturation est incertaine.

Les fichiers vivent dans le volume Railway ou ACCOUNT_DATA_DIR, par propriétaire. La suppression du compte nettoie son répertoire et cascade ses lignes (`server/accounts.mjs:326`). Les sauvegardes de volume ne sont pas vérifiables depuis le code : requis avant toute activation d’une migration en production.

## Validation actuelle et manques

Tests existants : `tests/study.test.mjs` (import/quotas/isolation/parser), `gemini-client.test.mjs`, `gemini-integration.test.mjs`, `pedagogical-quality.test.mjs`, `flashcard-draft-api.test.mjs`, migrations et FSRS. E2E `my-courses.spec.ts`, `flashcard-draft-review.spec.ts`, `pdf-and-summary-quality.spec.ts` et `course-flashcard-dialog.spec.ts`.

Base PR #14 : 212 tests backend, 194 cas E2E en CI, dont comptes Google et navigation cours après relance ; un timeout local Atlas 1920 px passe isolément. Aucun de ces succès ne valide automatiquement la qualité médicale. Le dernier benchmark Gemini réel était bloqué par indisponibilité/délai : nouvelle vérification live nécessaire, aucune certitude inventée.

À ajouter : migrations sur DB existante avec notes/review_logs inchangés, reprise après interruption, import conservé même sans OCR, archive/restauration, recherche contenu, édition de fiches sauvegardées, QCM multi et validation de toutes les propositions, sessions synchronisées, assistant hors-contexte/injection/isolation, lecteur/sélection/focus mobile, absence de perte des sources.

## Décision

Conserver l’extraction et les services existants, ajouter un domaine Study V2 modulaire sous `server/study/v2/` et `src/study/v2/`. Les anciens endpoints et tables restent compatibles. Le plan détaillé, les jalons et les conditions d’activation sont dans [study-v2-migration.md](study-v2-migration.md). L’audit n’est pas une déclaration d’achèvement de Study 2.0.
