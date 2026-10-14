# Study 2.0 — assistant documentaire

## Parcours et sources

L’assistant reste associé au PDF original : panneau droit à partir de 1200 px, sous le lecteur sur les écrans plus étroits. Une citation ouvre la page sans fermer la conversation. Plusieurs conversations sont conservées par document ; fermer le panneau ne les supprime pas. Le contexte « Expliquer ce passage » prépare une question et une sélection, sans lancer d’appel IA avant « Envoyer ».

Le périmètre est le cours actuel, un chapitre ou un passage sélectionné. Les sources sont relues en base et contrôlées par propriétaire ; un texte inventé ou une section étrangère est refusé. Les citations gardent section, page ou plage, version source et preuve. Les avertissements d’extraction partielle restent visibles : une absence dans les passages extraits ne démontre pas une absence dans un PDF illisible.

Les réponses sont exclusivement documentaires. Il n’y a pas de recherche externe ni de mode « connaissances générales ». Si le contenu sélectionné ne permet pas de répondre, l’assistant l’indique explicitement. Les quatre questions précédentes peuvent clarifier la demande ; les anciennes affirmations générées ne deviennent pas des sources fiables.

## Génération et persistance

Migration V2 4 additive : `study_v2_assistant_threads` et `study_v2_assistant_messages`. Sources et questions des messages sont immuables ; les clés étrangères composites contrôlent document/compte. Suppression de conversation avec confirmation, cascade à la suppression du document/compte. Aucun changement FSRS ou des supports historiques.

Les appels utilisent le client et les quotas Gemini existants : analyse de tous les fragments planifiés, recherche d’extraits verbatim pertinents, formulation depuis les preuves, puis vérification séparée des implications. Les citations et certaines quantités/unités sont revalidées côté serveur. Les messages sont enregistrés avant génération et suivis par polling. Les erreurs Gemini sont explicites, sans remplacement par une fausse réponse locale.

Limites : 20 conversations/document, 50 messages/conversation, question de 3 à 2 000 caractères ; deux réponses actives, six en cours/en attente, bail de 60 secondes renouvelé toutes les 20 secondes. Un seul message en traitement par conversation. Les demandes sont idempotentes ; un échec réseau permet de renvoyer le même identifiant. Un message interrompu n’est pas relancé automatiquement, car sa consommation peut être incertaine.

Le contexte de réponse conserve au maximum 24 preuves réparties dans le document et produit au maximum 12 paragraphes. La limitation de preuves est affichée. Ces bornes ne certifient pas l’exhaustivité. La relecture est un deuxième appel au même modèle ; elle ne remplace pas un expert médical et peut partager les erreurs du premier appel. Le contrôle des quantités n’est pas un système complet de vérification scientifique et peut refuser certaines formulations correctes.

Routes, toutes scopées avec 404 pour autrui et CSRF sur écritures :

- `GET/POST /api/study/v2/documents/:doc/assistant`
- `GET/DELETE /api/study/v2/documents/:doc/assistant/:thread`
- `POST /api/study/v2/documents/:doc/assistant/:thread/messages`

## Fichiers et preuves

Backend : `server/study/v2/assistant-schema.mjs`, `assistant.mjs`, `server/ai/document-assistant.mjs` ; intégrations dans `schema.mjs`, `handler.mjs`, `server/study.mjs`, `server/ai/pedagogy.mjs` et `generation.mjs`.

Interface : `src/study/v2/AssistantWorkspace.tsx`, `AssistantResponse.tsx`, `useAssistant.ts`, `assistantApi.ts`, `assistant.css`, intégration dans `DocumentWorkspace.tsx`. Chargement à la demande ; bundle principal maintenu à 760,48 ko.

Tests serveur : `tests/study-v2-assistant.test.mjs` (propriété/CSRF, idempotence, citations/pages, source exacte, abstention, valeurs inventées, appels de vérification et usage, interruption/plafond et cascade). Build réussi ; Study 119/119, flashcards 109/109, catalogue 6/6 et 21 parcours navigateur ciblés (assistant, QCM, fiches, bibliothèque, Mes cours historique, flashcards) verts.

Tests navigateur : `tests/study-v2-assistant.spec.ts` vérifie lecteur central/citation, conversation conservée, abstention, mobile 390 px avec sélection page 2, panne/reprise et absence de Gemini. Deux tests simulent le contrat de réponse ; le troisième utilise les routes réelles. Les routes et le protocole Gemini sont exercés séparément avec un provider injecté côté serveur. Il n’existe aucun mécanisme de simulation ajouté à la production.

Captures de revue reproductibles et ignorées par Git : `tests/artifacts/design/study-v2-assistant-desktop.png`, `study-v2-assistant-mobile.png`. Le cours est synthétique ; ces captures ne démontrent pas la qualité des réponses Gemini sur un corpus universitaire.

## Non vérifié manuellement et suites possibles

Gemini réel, Safari/iPhone, lecteur d’écran, performances sur 600 pages et qualité médicale des explications restent à évaluer. La conversation porte sur un seul document à la fois ; la comparaison entre documents et les réponses générales externes ne sont pas implémentées. Les exemples « pose-moi des questions » produisent une réponse documentaire, pas une série d’entraînement automatiquement validée ; utiliser l’espace QCM pour cela.

À suivre : intégration des flashcards depuis un passage exact, maintien des cartes visuelles et benchmark global. Activation bêta réversible ; aucune fusion ni mise en production automatique.
