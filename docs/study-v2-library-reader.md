# Study 2.0 — bibliothèque et lecteur PDF

## Activation réversible

Une fois connecté, « Essayer Study 2.0 · bêta » ouvre la nouvelle interface. La préférence est rattachée au compte via son stockage actuel. « Revenir à l’interface actuelle » conserve le document dans l’URL ; aucun document ni support n’est déplacé ou converti par ce changement.

`StudyEntry` remonte le workspace lorsque l’identité change, afin de supprimer immédiatement les données du compte précédent et ses états réseau. Les liens historiques `#tab=mes-cours&doc=…&section=…` restent valides. Une section initiale ouvre sa page lorsque les sections sont chargées.

## Parcours disponibles dans ce lot

- Import conservé et traité en arrière-plan, avec consentement OCR explicite. Le même identifiant de demande est réutilisé après une réponse réseau perdue.
- Matières et chapitres ; classement, recherche titre/contenu, récents, renommer, déplacer, archiver/restaurer. Suppression définitive avec confirmation intégrée.
- PDF original central : pages, zoom, sommaire et couche de texte PDF.js. Le texte sélectionné reste associé à la page affichée et peut être copié. Les pages scannées ne deviennent pas artificiellement sélectionnables à partir de l’OCR.
- Position de lecture enregistrée en base après 600 ms et récupérée à la réouverture. Les réponses réseau obsolètes sont annulées lors d’un changement de document/filtre/compte.
- Diagnostic d’extraction, original téléchargeable et reprise explicite. Le nombre de pages connu d’un scan est conservé même si son extraction échoue, pour permettre la navigation et la sauvegarde d’une page valide.
- Flashcards : intégration directe de `ReviewWorkspace`, sans nouveau moteur, API, deck ou scheduler. Génération, édition, acceptation et accès à la carte FSRS vérifiés.

Les fiches et QCM restent disponibles par « Fiches et QCM · interface actuelle ». Ils ne sont pas présentés comme des espaces V2 terminés. La barre de génération/explanation à partir d’une sélection précise sera branchée sur les services validés dans les prochains lots ; ce lot ne prétend pas générer depuis un passage exact.

## Architecture et fichiers

- `src/study/StudyEntry.tsx` : activation et séparation des comptes.
- `src/study/v2/Library.tsx`, `FolderNavigation.tsx`, `ImportPanel.tsx`, `DocumentCard.tsx` : bibliothèque et opérations documentaires.
- `src/study/v2/DocumentWorkspace.tsx`, `DocumentRecovery.tsx`, `PdfReader.tsx` : lecture de l’original, sources et diagnostics.
- `src/study/v2/useLibrary.ts`, `useDocument.ts`, `useNavigationInset.ts` : réseau annulable, position et espace réellement occupé par la navigation mobile.
- `src/study/v2/api.ts`, `types.ts` : contrats TypeScript et messages réseau français.
- `src/study/v2/studyV2.css`, `pdfTextLayer.css`, `versionSwitch.css` : styles isolés, thème sombre et responsive.
- `src/App.tsx` : entrée Study chargée à la demande ; les autres workspaces restent lazy.
- `src/study/MyCoursesWorkspace.tsx` : ajout d’un emplacement de contrôle de version, sans agrandir sa logique fonctionnelle.
- `server/study/v2/pipeline.mjs`, `tests/study-v2-pipeline.test.mjs` : page count conservé pour un scan échoué.
- `tests/study-v2-library.spec.ts` : parcours V2 et PDF de référence à deux chapitres, compressé Flate, avec résultats source attendus.

Le lecteur et PDF.js sont chargés uniquement à l’ouverture d’un document ; la Révision des flashcards à l’ouverture de son espace. Les canvas sont limités à quatre millions de pixels et les dimensions PDF contrôlées. Aucune nouvelle dépendance ni assouplissement de CSP.

À 390 px, le sommaire est repliable et initialement fermé. Le padding inférieur réserve la zone mesurée de la navigation mobile existante, avec safe area iPhone. L’original reste blanc en thème sombre ; l’interface et les contrôles suivent le thème.

## Validation et captures reproductibles

Build TypeScript/Vite ; Study 86/86, flashcards 109/109, catalogue 6/6. Les cinq E2E V2 vérifient bibliothèque/source, mobile/archive, changement de compte, import dont la réponse est perdue/PDF manquant, puis génération/édition/acceptation/FSRS. Les six E2E historiques Mes cours et Révision passent sans modification.

Commande :

```sh
npm test -- tests/study-v2-library.spec.ts tests/my-courses.spec.ts tests/flashcard-draft-review.spec.ts
```

Captures recréées par les tests dans `tests/artifacts/design/` (ignorées par Git, usage revue) :

- `study-v2-library-desktop.png`
- `study-v2-reader-desktop.png`
- `study-v2-reader-mobile.png` (390 × 844)
- `study-v2-reader-dark.png`

Les images montrent un PDF synthétique explicitement construit pour les tests ; elles ne prouvent pas la qualité d’un cours universitaire ou d’un OCR réel.

## Limites restantes

Safari/iPhone, lecteur d’écran et sélection tactile réelle non vérifiés manuellement. La sélection testée est un Range de navigateur sur la couche PDF, pas une interaction tactile automatisée. Pas encore de benchmark de performances sur 600 pages, de reconnaissance dédiée des figures, ni d’édition/export des multiples fiches V2. Les limites du pipeline et de la recherche LIKE restent celles de `study-v2-pipeline.md`.

La sauvegarde de position est différée : quitter immédiatement avant les 600 ms peut laisser la page précédente. Une extraction incertaine exige une comparaison avec l’original ; aucune fidélité médicale automatique n’est affirmée. La refonte complète et son évaluation pédagogique restent en cours. Pas de fusion ou déploiement automatique.
