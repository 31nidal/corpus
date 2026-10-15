# Study 2.0 — flashcards depuis les sources

## Contrat conservé

La génération, les brouillons, les types de notes, l’acceptation idempotente, les decks et FSRS-6 restent ceux du système existant. Aucune migration flashcards, aucune conversion de cartes et aucun historique de révision réécrit. Les filtres document/chapitres/pages historiques restent disponibles.

La route existante `POST /api/flashcards/documents/:id/drafts/generate` accepte désormais un locator `selection: {page, text}` optionnel. Ce texte est retrouvé dans la page et une section du document appartenant au compte ; il ne devient jamais une source arbitraire envoyée par le client. Limite de 15 à 10 000 caractères pour les flashcards. Seul le passage vérifié est utilisé par le générateur local ou Gemini ; la page sélectionnée reste exacte même si la phrase apparaît sur plusieurs pages. Le dédoublonnage et les rejets persistants sont conservés.

Les fiches, QCM et assistant réutilisent le même petit validateur de sélection, avec leur minimum historique de 35 caractères. Le helper ne dépend pas des tables V2 : les documents déjà importés restent compatibles.

Un échec du test de sélection a identifié une limite locale concrète : « depend de » dans le PDF ASCII de référence n’était pas reconnu, contrairement à « dépend de ». Le seul prédicat concerné accepte désormais ces deux graphies ; la citation et la réponse ne sont pas corrigées ou réécrites. Les titres, légendes et sujets tronqués restent filtrés comme auparavant.

## Cartes visuelles

`VisualCardCreator` réutilise `PdfCropSelector`, `ImageOcclusionEditor` et les APIs existantes, dans Study 2.0 et dans l’interface actuelle. Le document et sa page sont capturés au moment de l’ouverture. L’image garde document/page/recadrage comme métadonnées. Sans deck, l’utilisateur peut créer une destination avant le recadrage. L’URL temporaire de l’image est créée dans un effet et révoquée à la fermeture ; elle n’est plus recréée à chaque render.

L’éditeur utilisait des classes Tailwind sans styles Tailwind chargés dans ce projet. Des classes CSS isolées rendent effectifs le layout, la superposition des masques, les poignées et le responsive, sans changer le modèle des masques ni le calcul FSRS. Une création au clavier, un sélecteur de masque et les coordonnées en pourcentage permettent de créer/modifier les régions sans glisser à la souris. Échap, confinement du focus et retour au bouton d’origine sont ajoutés au dialogue ; la sauvegarde reste celle de l’éditeur existant.

## Fichiers

Backend : `server/study/source-selection.mjs`, réutilisation dans `server/study/v2/note-sources.mjs`, adaptations `server/flashcards/review/repository.mjs`, `handler.mjs`, prédicat ciblé dans `server/flashcards/generation.mjs`.

UI : `src/study/v2/DocumentFlashcards.tsx`, `DocumentWorkspace.tsx`, `src/study/VisualCardCreator.tsx`, intégration simplifiée dans `MyCoursesWorkspace.tsx`, options de sélection dans `src/study/review/`, classes de layout et contrôles clavier dans `src/flashcards/ImageOcclusionEditor.tsx`, `MaskKeyboardControls.tsx`, `useOcclusionDialog.ts`, `imageOcclusionEditor.css`.

## Validation et limites

Build TypeScript/Vite réussi ; Study 119/119, flashcards 111/111, catalogue 6/6. Tests API des graphies accentuée/ASCII, sélection exacte, page non ambiguë, refus des sources inventées, propriété, dédoublonnage et acceptation répétée. Les 24 E2E ciblés passent, incluant les parcours historiques.

`tests/study-v2-flashcards.spec.ts` couvre les routes réelles : sélection PDF → génération → édition → acceptation → FSRS ; page PDF → image → masque clavier → note persistée avec sa source → URL libérée ; mobile 390 px, Échap/focus et retour à la création visuelle de l’interface actuelle. Capture de revue ignorée par Git : `tests/artifacts/design/study-v2-visual-card-mobile.png`.

Non vérifiés manuellement : Safari/iPhone, lecteur d’écran, gestes tactiles, toutes les tailles de figures et la qualité Gemini réelle. Le système local est fondé sur des règles et peut ne produire aucune carte sur des phrases non reconnues ; cela est annoncé et ne prouve pas que le cours contient peu d’information utile. La sélection reste limitée à une page et une section ; une phrase coupée entre pages exige une sélection de chapitre. Aucune certification médicale automatique.

Les APIs de cartes Atlas et d’export existantes restent inchangées. Le benchmark et la CI complète restent nécessaires avant l’activation générale. Aucune fusion ni mise en production automatique.
