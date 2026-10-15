# Study 2.0 — bibliothèque et pipeline persistants

## Activation et compatibilité

Ce lot fournit le backend, pas encore la nouvelle interface. Les routes historiques restent disponibles. Le premier accès authentifié à `/api/study/v2/` applique la migration additive 1 ; un démarrage ordinaire ne migre pas une base qui n’a jamais utilisé V2. Si les tables V2 existent, `createApiHandler` reprend les tâches au démarrage, sans attendre une visite de la bibliothèque.

Les identifiants historiques, les sections, résumés, QCM, notes et historiques FSRS restent conservés. Les tests de migration comparent toutes les lignes historiques, y compris une carte ayant déjà été révisée. L’archive ne supprime rien ; restauration par `archived:false`. La suppression définitive utilise le contrat historique, avec cascade des tables complémentaires et suppression du PDF.

## Modèle ajouté

- `study_v2_migrations` : journal transactionnel (version 1).
- `study_v2_folders` : matières et chapitres, parents contrôlés par propriétaire.
- `study_v2_document_meta` : classement, archive, dernière ouverture, page de lecture, état, version et hash SHA-256 de l’original.
- `study_v2_jobs` : demande idempotente par compte, étape, consentement OCR, tentatives, bail et jeton de possession.
- `study_v2_versions` et `study_v2_blocks` : instantanés des sections et blocs par page, immuables en mise à jour. Suppression en cascade avec le document/compte.

Les nouveaux horodatages sont en millisecondes Unix ; les dates historiques restent en ISO. Les références composites empêchent les associations entre comptes. Les documents anciens sont projetés sans réécriture et sans écraser un classement ou une position V2 existants.

## Routes

Sessions et protection d’origine habituelles. Les ressources d’autrui donnent 404.

| Méthode | Route sous `/api/study/v2` | Contrat |
| --- | --- | --- |
| GET | `/documents` | Recherche `q` dans titre/contenu ; `folderId` (matière inclut ses chapitres, vide = non classés), `archived`, `limit` 1–100, `offset` ; documents, dossiers, `nextOffset`. Ordre dernière consultation puis date d’import. |
| POST | `/folders` | `name`, `kind:subject/chapter`, `parentId` ; chapitre lié à une matière possédée. |
| POST | `/documents/upload` | Binaire PDF ; `x-study-request-id`, nom/titre URI-encodés, `x-document-ocr:1` uniquement avec consentement. Réponse 202 : document, tâche et `reused`. Même demande + même fichier réutilisent le résultat ; autre fichier : 409. |
| GET | `/documents/:id` | Métadonnées et dernière tâche. Les sections/PDF restent accessibles par les routes historiques. |
| PATCH | `/documents/:id` | `title`, `folderId`, `archived`, `readingPage`, `opened` ; `expectedUpdatedAt` facultatif pour détecter un conflit (409). |
| GET | `/documents/:id/job` | Dernière tâche ou null. |
| POST | `/documents/:id/retry` | `requestId`, `consentOcr` ; reprise explicite, original requis. Ne remplace pas les passages déjà lisibles. |
| GET | `/documents/:id/sources?page=N` | Version courante, page et blocs ; coordonnées null lorsqu’elles ne sont pas fiables. |
| GET | `/jobs/:id` | État et diagnostic de la tâche possédée. |

## Traitement et reprise

Le PDF est vérifié et stocké sous un UUID (fichier 0600) **avant** extraction. Les erreurs de lecture ne suppriment pas l’original. État initial `imported`, puis `processing`, et résultat `ready`, `partial`, `needs_attention` ou `failed`.

Extraction native/structurée dans un worker thread : deux workers maximum, huit tâches en file/exécution, 25 Mio par import (quota du compte également appliqué), 600 pages, dimension de page 14 400 points maximum, 120 secondes par extraction, heap JS du worker limité à 256 Mio, texte exploitable entre 50 et 2 000 000 caractères hors espaces. Ce heap ne constitue pas une limite totale de mémoire native.

Bail de 60 secondes, heartbeat toutes les 20 secondes. Un jeton empêche un ancien worker dont le bail a été repris de publier ses résultats. Les tâches natives expirées sont reprises, au maximum trois tentatives. Une tâche interrompue à l’étape OCR devient `interrupted` : sa consommation peut être incertaine et aucun nouvel appel payant n’est lancé automatiquement.

Sans consentement, le PDF n’est pas envoyé pour OCR. Avec consentement, Gemini et ses contrôles de quota/budget existants sont réutilisés. Un OCR sans texte utile rembourse la génération ; les pages incertaines sont signalées. Lors d’une reprise, seules les pages auparavant illisibles apportent de nouvelles sections ; les sources et identifiants déjà cités ne changent pas.

PDF sans texte, filtre non supporté et flux corrompu gardent des codes distincts. Une erreur de quota/OCR ne devient pas silencieusement une réussite.

## Preuves et limites de ce lot

Validation locale : Study 86 tests, flashcards 109, catalogue 6 ; build TypeScript + Vite. Les nouveaux tests couvrent migration répétée/rollback, intégrité FK/SQLite, historique FSRS inchangé, import stocké avant extraction, reprise au démarrage, bail perdu, quotas, archive/restauration, isolation/CSRF, worker réel et dimensions excessives. Les fixtures OCR sont simulées et ne prouvent pas la qualité d’une transcription Gemini réelle.

Les titres, paragraphes, tableaux et code reprennent la reconstruction actuelle. Les figures et listes n’ont pas encore de reconnaissance dédiée ; aucune localisation précise n’est inventée. Les coordonnées de blocs sont donc null. Une reprise peut conserver un bloc texte de compatibilité pour une page déjà citée, plutôt que substituer une nouvelle reconstruction.

La recherche utilise SQLite LIKE borné, sans index plein texte ni normalisation accent/casse française ; son coût sur une grande bibliothèque reste à mesurer. La file est plafonnée globalement, avec workers limités par processus ; plusieurs réplicas peuvent dépasser le total de deux workers. Pas de nettoyage automatique des originaux orphelins après un arrêt brutal entre écriture disque et transaction : ils restent inaccessibles et nécessitent un futur outil de rapprochement vérifiable.

Ce lot ne valide pas encore la nouvelle interface, les supports pédagogiques, Safari/iPhone, les lecteurs d’écran, un corpus de PDF longs ou l’OCR réel. La refonte complète reste en cours. Aucune fusion ni mise en production automatique.
