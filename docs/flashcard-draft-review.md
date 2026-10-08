# Révision des flashcards de Mes cours — contrat de migration 5

Étape actuelle : schéma et API de révision implémentés, UI non commencée. Synthèses et QCM gardent leur flux actuel. Les écrans existants utilisent encore leur ancien dialogue jusqu’à l’étape UI.

## Stockage durable

`flashcard_drafts` conserve l’identité permanente, le propriétaire, le document, la section, la page, le type réel de note, recto/verso/champs structurés, extrait de preuve, matière/chapitre/tags, confiance et preuve verbatim. Statuts : `pending`, `accepted`, `rejected`, `edited`. Suppression du compte/document en cascade ; suppression d’une section : référence mise à NULL, preuve et page conservées.

`content_hash` est un SHA-256 des deux chaînes [recto généré, extrait source] sérialisées séparément en JSON après normalisation NFC, minuscules françaises et compactage des espaces. Accents et ponctuation conservés. Index UNIQUE `(user_id, document_id, content_hash)`. Cette empreinte d’origine doit rester immuable après édition : une génération répétée doit retrouver le même brouillon, même modifié ou rejeté. La génération utilise `INSERT OR IGNORE` et renvoie `created`, `ignored`, ainsi que `unattributed` pour les extraits non attribuables à une section.

`accepted_note_id` est UNIQUE et référence `flashcard_notes` avec `ON DELETE SET NULL`. Tant que la note existe, une nouvelle acceptation renvoie cette note. Si elle a été supprimée, le brouillon reste `accepted` avec référence NULL ; une acceptation explicite recrée une note et ses cartes FSRS dans une transaction, puis enregistrer la nouvelle référence. Les tests de schéma et de routes exercent ce scénario, y compris deux appels rapprochés via deux handlers.

Le CHECK `note_type` reprend la liste commune réelle : `basic`, `reverse`, `bidirectional`, `cloze`, `typed`, `image_occlusion`, `atlas_3d`. La génération textuelle actuelle ne produit pas de notes visuelles. `rejected_from` n’accepte que NULL, `pending`, `edited`.

Les dates `created_at`, `updated_at`, `rejected_at` sont des millisecondes Unix entières, comme les reçus, assets et échéances FSRS. Les notes/cartes historiques utilisent aussi des dates ISO textuelles : ne pas confondre ces formats. Aucun timestamp existant n’est converti. `REJECTED_DRAFT_RETENTION_MS` vaut 30 × 86 400 000 ; la purge automatique s’exécute uniquement au démarrage du serveur Node, du serveur Vite de développement ou de preview. Aucun GET ni autre accès HTTP ne purge les brouillons. L’horloge est injectable ; la frontière stricte « plus de 30 jours » est testée.

## Critère « fidèle au cours » calculé

`SAFE_DRAFT_RULE` dans `server/flashcards/review/policy.mjs` est l’unique configuration : confiance ≥ 0,95, preuve verbatim, type `basic`, `reverse` ou `cloze`, statut `pending`. Les statuts édités, rejetés et déjà acceptés sont exclus du lot automatique ; la réacceptation après suppression reste une action explicite.

La confiance vient exclusivement d’un fait typé déjà reconnu dans la même section, avec preuve identique. Pas de score inventé à partir d’un simple type de carte. La vérification verbatim compacte les espaces et normalise NFC, sans changer casse, accents, mots ou ponctuation. Le libellé utilisateur doit être « fidèles au cours » : une preuve verbatim ne garantit pas que le cours soit médicalement juste. Le bouton « Accepter les N fidèles » devra être absent quand N = 0. Le critère n’est jamais stocké ; seule la confiance et `verbatim_proof` le sont. Les cartes à réponses chiffrées et équivalences ne sont pas automatiquement couvertes par les faits typés actuels.

## Mesure du seuil 0,95

Générateur réel `generateLocalNoteDrafts`, mode `standard`, cible 12, source synthétique de type document ; aucun PDF importé ni appel fournisseur. Les sections du catalogue sont assemblées comme le fait la route de génération, avec leurs titres, texte et puces. Les numéros de pages de mesure sont uniquement des repères synthétiques, le catalogue n’étant pas un PDF.

Texte d’exemple existant des tests : « Le débit cardiaque est le produit de la fréquence cardiaque par le volume d’éjection systolique. La pression artérielle dépend du débit cardiaque et des résistances périphériques. Le nœud sinusal assure normalement le rythme du cœur. »

| Source | Générés | Preuve verbatim | Fait typé reconnu | Sûrs ≥ 0,95 |
| --- | ---: | ---: | ---: | ---: |
| Exemple ci-dessus | 2 | 2 | 0 | 0/2 : 0 % |
| `anat-diaphragm-muscle` — Diaphragme thoraco-abdominal : coupoles, centre tendineux et orifices de passage | 7 | 7 | 0 | 0/7 : 0 % |

Ce seuil ne permet aucun lot automatique sur ces deux exemples : les faits typés existants ne couvrent que certaines innervations, vascularisations et localisations conservatrices. Baisser légèrement le seuil ne corrigerait pas une absence de fait reconnu (confiance 0). Le test positif contrôlé « Le nerf médian innerve le muscle pronateur rond. » produit une confiance 0,97 et passe le critère. L’extracteur et le filtre d’atomisation et/ou restent inchangés.

## Validation du schéma

`test:flashcards` : 86 réussis ; `test:study` : 25 ; `test:catalog-content` : 6. Le contrôle de versions de migration est explicitement `[1, 2, 3, 4, 5]`.

Les tests couvrent dédoublonnage (y compris rejet et isolation des espaces de stockage), conservation des accents, cascades, types/statuts/dates, unicité de note et remplacement après suppression, ainsi que les signaux et exclusions du critère sûr. Les contrôles HTTP de propriété, génération et purge sont également couverts par les tests API ajoutés à l’étape suivante.


## Mesure sur 20 cours avant l’API

Échantillon déterministe de 20 cours espacés régulièrement dans la liste des 305 IDs triés ; pas de sélection selon le score obtenu. Script :

```sh
node --experimental-strip-types --experimental-loader=./scripts/ts-loader.mjs scripts/measure-draft-confidence.mjs
```

Mode standard, cible 12 par cours, texte et puces des sections réelles. Distribution sur 139 brouillons : confiance 0 → 139 ; 0,93 → 0 ; 0,95 → 0 ; 0,97 → 0. Aucun ne passe le critère.

`generateLocalNoteDrafts` ne dérive pas ses cartes des faits typés. Ce critère ne deviendra réellement discriminant qu’une fois les brouillons dérivés de ces faits, dans le chantier d’atomisation hors périmètre. Le rapprochement actuel d’un extrait avec un fait peut fonctionner sur un exemple contrôlé, mais ne fournit pas aujourd’hui une couverture du catalogue. Ni le seuil ni l’extracteur et/ou n’ont été modifiés.

| ID du cours | Brouillons | Confiance 0 | ≥ 0,95 |
| --- | ---: | ---: | ---: |
| `anat-arm-compartments` | 7 | 7 | 0 |
| `anat-ear` | 12 | 12 | 0 |
| `anat-intercostal-space-vessels` | 6 | 6 | 0 |
| `anat-pelvis` | 12 | 12 | 0 |
| `anat-trunk-muscles` | 10 | 10 | 0 |
| `biochem-glycogen-metabolism` | 4 | 4 | 0 |
| `cell-mitochondria-peroxisomes` | 4 | 4 | 0 |
| `chem-organic-functions-isomery` | 4 | 4 | 0 |
| `embryo-implantation-decidualization` | 4 | 4 | 0 |
| `FMA7148` | 12 | 12 | 0 |
| `genetics-replication-repair` | 7 | 7 | 0 |
| `immuno-adaptive` | 12 | 12 | 0 |
| `odonto-saliva-caries-pathophysiology` | 3 | 3 | 0 |
| `pharma-renal-biliary-clearance` | 6 | 6 | 0 |
| `phys-renal` | 12 | 12 | 0 |
| `physics-mri-sequences-spatial` | 7 | 7 | 0 |
| `public-health-prevention-strategies` | 2 | 2 | 0 |
| `soc-drug-pricing-reimbursement` | 2 | 2 | 0 |
| `stats-comparison-means-z-t` | 3 | 3 | 0 |
| `tissues` | 10 | 10 | 0 |


## Contrat API

Préfixe `/api/flashcards`. Authentification et protection d’origine existantes conservées. Un document ou brouillon absent ou appartenant à autrui retourne 404. Dans un lot sur un document autorisé, chaque ID étranger/inconnu retourne `not_found` avec `httpStatus: 404`, sans empêcher les autres éléments du lot.

| Méthode | Route | Contrat |
| --- | --- | --- |
| POST | `/documents/:id/drafts/generate` | Corps `{count, level}` uniquement ; aucun texte client. Sections relues en base, page = start_page. Maximum nommé/testé 60. |
| GET | `/documents/:id/drafts` | Filtres `status`, `limit` (1–100), `offset`. Liste paginée, compteurs globaux du document, total filtré. |
| PATCH | `/drafts/:id` | `front`, `back`, `noteType`, `fields`. Validation existante de notes ; 409 sur accepted. Un rejected édité reste rejected, restored vers edited. Empreinte et preuve d’origine inchangées. |
| POST | `/drafts/:id/accept` | `{deckId}` ; transaction par brouillon ; accepted ou already_accepted, sans reçu ni requestId. |
| POST | `/drafts/:id/reject` | Refus 409 sur accepted ; état antérieur enregistré ; rejeter à nouveau ne renouvelle pas la date de purge. |
| POST | `/drafts/:id/restore` | Rejected uniquement, sinon 409 ; retour à rejected_from. |
| POST | `/documents/:id/drafts/accept` | `{ids, deckId}` ou `{faithfulOnly: true, deckId}`. Maximum nommé/testé 100 ; résultat par ID. Fidélité recalculée avec les sections présentes. |
| POST | `/documents/:id/drafts/reject` | `{ids}` ; traitement par brouillon, résultats explicites. |
| POST | `/documents/:id/drafts/restore` | `{ids}` ; traitement par brouillon, résultats explicites. |

Les lots d’acceptation renvoient `accepted / already_accepted / not_found / invalid`, avec les compteurs réellement obtenus. Les lots de rejet/restauration renvoient `rejected / restored / not_found / invalid`. Un identifiant invalide, un deck absent ou une panne d’insertion n’annule que le brouillon concerné. Les résultats invalides incluent un code HTTP et un message. Le mode faithfulOnly renvoie aussi eligibleBefore, remainingFaithful et batchLimit afin de ne pas masquer une limite ou un traitement partiel.

La fidélité n’est pas une colonne : `faithfulToCourse` est calculé lors de la lecture et revérifié lors de l’acceptation automatique. Une preuve disparue de la section ne reste pas éligible. Les brouillons édités sont exclus, y compris lorsqu’ils sont rejetés puis restaurés.

## Extension ultérieure

Étendre la validation aux synthèses/QCM nécessiterait des statuts et une identité durable pour ces objets, leurs propres actions de validation et l’adaptation des lecteurs/entraînements pour n’utiliser que les éléments acceptés. Aucun changement de ce flux n’est inclus ici.

## Validation API

`test:flashcards` : 95 tests réussis (dont 9 nouveaux tests API) ; `test:study` : 25 ; `test:catalog-content` : 6. Build production et TypeScript réussis. UI et Playwright du nouveau parcours restent à faire ; aucune CI distante lancée à cette étape non poussée.
