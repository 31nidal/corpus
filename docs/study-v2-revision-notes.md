# Study 2.0 — fiches de révision

## Périmètre

Plusieurs fiches par document, de niveaux court, structuré et détaillé. Une fiche peut porter sur le cours, des chapitres ou un passage sélectionné dans le PDF original. Le lecteur reste central ; chaque preuve permet de retrouver sa page. Les fiches arrivent en brouillon, restent éditables et deviennent enregistrées après relecture explicite. L’export télécharge un PDF avec le composant existant, sans fenêtre d’impression.

Les flashcards, FSRS-6, les synthèses historiques et les QCM existants ne sont pas remplacés. Les anciennes synthèses sont copiées à la demande, avec leur contenu original conservé en base. Les preuves non retrouvées sont signalées. Supprimer une copie historique crée un tombstone pour empêcher sa réapparition, sans supprimer l’ancienne synthèse.

## Persistance et routes

Migration V2 2 additive : `study_v2_notes`, propriété document/compte avec suppression en cascade, identité de demande unique, instantané immuable des sources, versions d’édition et bail de génération. Aucun changement des tables FSRS.

- `GET /api/study/v2/documents/:id/notes` : en-têtes et nombre de points.
- `POST /api/study/v2/documents/:id/notes` : `requestId`, `kind`, `sectionIds` optionnel ou `selection` vérifiée ; réponse 202 et génération persistée.
- `GET /api/study/v2/documents/:id/notes/:noteId` : contenu, preuves, couverture et diagnostics.
- `PATCH` sur cette route : titre, points, état et `expectedEditVersion`. Conflit 409 ; les sources sont immuables.
- `DELETE` sur cette route : suppression de la fiche uniquement.

Toutes les routes contrôlent le propriétaire (404 pour autrui) et les écritures utilisent la protection CSRF existante. Au maximum 30 fiches générées par document, six générations en cours/en attente et deux traitements actifs. Bail de 60 secondes renouvelé toutes les 20 secondes. Une génération interrompue n’est pas relancée automatiquement : un appel IA éventuellement facturé exige une nouvelle demande explicite. Les quotas Gemini existants restent utilisés.

## Fidélité et couverture

La sélection est retrouvée dans le texte enregistré de la page et d’une section appartenant au document. Les preuves générées doivent être retrouvées dans les sources ; les points sans preuve sont refusés avec un motif comptabilisé. Les nombres, signes et unités usuelles doivent correspondre à la preuve. Les tableaux affichés proviennent de lignes tabulaires effectivement présentes dans l’extrait.

Les instructions Gemini distinguent les trois niveaux. Sans Gemini, le moteur local reste extractif : les niveaux changent la couverture et le nombre de points, pas une compréhension sémantique simulée. Les titres sont séparés des faits ; une définition introductive courte et complète reste disponible.

La couverture mesure les sections représentées, les sections absentes et certaines quantités écrites absentes. Elle ne certifie ni exhaustivité sémantique ni validité médicale. Le contrôle des quantités peut refuser une paraphrase correcte ou une conversion d’unité ; il ne couvre pas toutes les notations scientifiques. Les diagnostics d’extraction de l’instantané restent visibles même si le document est ensuite réextrait avec succès.

Un point modifié garde sa preuve originale et porte un avertissement : la nouvelle formulation n’est pas automatiquement revalidée. Les modifications non sauvegardées sont conservées dans la session du navigateur lorsque son stockage est disponible ; elles ne sont pas synchronisées entre appareils. Un échec réseau conserve les champs et permet de réessayer la même intention de sauvegarde.

## Fichiers

Backend : `server/study/v2/notes-schema.mjs`, `notes.mjs`, `note-sources.mjs`, intégration dans `schema.mjs`, `handler.mjs`, `server/study.mjs` ; instructions de niveau dans `server/ai/summary.mjs`.

Interface : `src/study/v2/NotesWorkspace.tsx`, `NoteGenerationForm.tsx`, `NoteEditor.tsx`, `NotePreview.tsx`, `useNotes.ts`, `useNoteEditor.ts`, `notes.css`, intégration dans `DocumentWorkspace.tsx`, `api.ts`, `types.ts`.

Tests : `tests/study-v2-notes.test.mjs`, `tests/study-v2-notes.spec.ts`, helpers communs de serveur et PDF ; les tests existants utilisent les mêmes fixtures, sans changement de leurs assertions.

## Validation

Build TypeScript/Vite réussi ; Study 101/101, flashcards 109/109, catalogue 6/6. Les tests API couvrent notamment propriété, idempotence, conflits, quotas, interruption, conservation des synthèses historiques, preuves, signes/unités et avertissements d’extraction.

Les quatre parcours navigateur des fiches vérifient génération/édition/sauvegarde/export, sélection exacte page 2 et retour à la source, échec réseau/reprise et mobile 390 px. Les captures de revue sont recréées dans `tests/artifacts/design/study-v2-notes-desktop.png` et `study-v2-notes-mobile.png`, ignorées par Git. Elles montrent le PDF synthétique de référence, sans constituer un benchmark universitaire.

## Non vérifié manuellement et suites possibles

Safari/iPhone, lecteur d’écran, sélection tactile et mise en page de tous les exports PDF non vérifiés manuellement. Les E2E vérifient le téléchargement et l’absence d’impression ; ils ne certifient pas la qualité visuelle de chaque PDF exporté. Gemini réel et corpus universitaire représentatif restent à évaluer dans la phase de validation globale. Aucune certification médicale automatique.

À suivre : QCM V2 avec preuves par proposition et entraînement persistant, assistant documentaire, génération de flashcards depuis un passage exact, puis benchmark des documents réels et CI complète. Aucune fusion ni mise en production automatique de Study 2.0.
