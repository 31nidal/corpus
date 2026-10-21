> V1 préparée sur `chore/legal-readiness` : les adaptateurs externes décrits ci-dessous ne sont plus sélectionnés par l’API publique. Les anciennes variables ne réactivent pas Gemini, HTTP ou Ollama. Cette préparation n’est pas déployée. Voir [le bilan V1](legal/gemini-off-v1.md).

# Génération pédagogique Gemini

## P0 — Audit avant modification

Base : `3d4288f`, branche `feat/gemini-pedagogical-generation`.

- `server/flashcards/generation.mjs` extrait des phrases et applique des règles de relations, équivalences, cloze et valeurs. Le contrat de notes couvre basic/reverse/bidirectional/cloze/typed. La validation actuelle exige des réponses et preuves présentes dans la source ; conserver cette garantie.
- `server/flashcards/handler.mjs` accepte déjà un fournisseur abstrait, conserve des reçus de génération et utilise le quota Study. Aucun adaptateur Gemini direct. Le dialogue de génération permet édition, sélection et prévisualisation avant création des notes.
- `server/flashcards/review/repository.mjs` génère exclusivement localement, par section puis tour de rôle. Il conserve les brouillons, leur preuve, l'identité permanente, la déduplication et l'acceptation transactionnelle. L'intégration doit réutiliser cette persistance, sans modifier FSRS.
- `server/pdfExtractor.mjs` couvre ASCII85/Flate, longueurs indirectes et tables Unicode par police. La segmentation est heuristique ; tableaux, colonnes, formules complexes et pages sans texte restent des limites. Pas d'OCR. `pdfjs-dist` est déjà installé pour le viewer et peut fournir une extraction positionnelle côté serveur sans nouvelle dépendance.
- `server/study.mjs` conserve documents/sections/PDF sur disque et SQLite, sous contrôle du propriétaire. Les synthèses et QCM sont enregistrés dès leur génération ; il manque une prévisualisation éditable pour ce nouveau flux.
- Les quotas sont dans `study_quotas`, par utilisateur, avec réservation atomique avant appel et remboursement sur échec. Ils doivent rester le compteur mensuel unique. Il manque le détail des tokens, les coûts estimés et une limite commune de concurrence.
- Authentification : sessions serveur, cookie HttpOnly, mutations protégées par origine/en-tête ; les routes et fichiers PDF filtrent `user_id`. Aucune identité ou session ne doit être envoyée au fournisseur.
- UI : `GenerationDialog`, `MyCoursesWorkspace`, `src/study/review/`, `PdfCropSelector`, clients API Study/flashcards. Éviter d'agrandir le workspace principal : nouveaux composants dédiés.

## Risques et plan

1. P1 : client REST officiel Gemini, schémas JSON, validation serveur, limites de taille/tokens/appels/concurrence, erreurs assainies et journal technique sans contenu ni clé.
2. P2 : génération et régénération ciblée de flashcards, preuves contrôlées, quota commun, brouillons persistants existants et indication explicite du repli local.
3. P3 : extraction structurée et références de pages, découpage couvrant toutes les sections, OCR explicite et borné ; prévisualisation des synthèses/fiches/QCM avant validation.
4. P4 : simulations API et régressions, corpus de six matières, PDFs variés, tests de sécurité/quotas/conservation et échantillon Gemini réel limité.
5. P5 : commits progressifs, PR avec résultats et limites. Aucun merge ni déploiement.

Risques prioritaires : provenance inventée, réponse JSON tronquée, silence sur une partie du document, quota consommé après échec, concurrence et double acceptation, coût multiplié par le découpage, injection dans une source et fuite des secrets. FSRS-6, ses historiques, les notes manuelles, les decks et l'export restent hors refonte.

## Références officielles

- https://ai.google.dev/api/generate-content
- https://ai.google.dev/gemini-api/docs/structured-output
- https://ai.google.dev/gemini-api/docs/pricing
- https://ai.google.dev/gemini-api/docs/document-processing

Le JSON structuré ne prouve pas la fidélité sémantique ni la validité médicale. La validation de provenance et la revue humaine restent nécessaires.

## Vérification avant déploiement — 11 octobre 2026

La clé locale accède aux métadonnées de `gemini-2.5-flash-lite`, mais `generateContent` renvoie 404 : ce modèle n'est plus disponible pour les nouveaux utilisateurs. Google recommande `gemini-3.5-flash-lite`. Trois appels réels avec ce modèle ont réussi : flashcards, synthèse et QCM, avec preuves validées et sans fuite de clé. Les paramètres retirés (`temperature`, `thinkingBudget`) sont omis pour ce modèle ; le défaut historique reste configurable, sans changement silencieux de modèle.

Pour activer Gemini en production, configurer côté Railway `GEMINI_API_KEY`, `GEMINI_MODEL=gemini-3.5-flash-lite` et `AI_GENERATION_PROVIDER=gemini`. Ne jamais versionner la clé. Le coût estimé par défaut de ce modèle est de 0,30 USD / million de tokens en entrée et 2,50 USD en sortie ; les variables tarifaires explicites restent prioritaires. Ces tarifs sont des estimations, pas une facture.

Références : https://ai.google.dev/gemini-api/docs/generate-content/whats-new-gemini-3.6 et https://ai.google.dev/gemini-api/docs/pricing.
