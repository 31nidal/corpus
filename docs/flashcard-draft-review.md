# Révision des flashcards de Mes cours — contrat de migration 5

Étape actuelle : schéma et tests uniquement. Aucune route de révision ni UI n’est encore implémentée. Synthèses et QCM gardent leur flux actuel.

## Stockage durable

`flashcard_drafts` conserve l’identité permanente, le propriétaire, le document, la section, la page, le type réel de note, recto/verso/champs structurés, extrait de preuve, matière/chapitre/tags, confiance et preuve verbatim. Statuts : `pending`, `accepted`, `rejected`, `edited`. Suppression du compte/document en cascade ; suppression d’une section : référence mise à NULL, preuve et page conservées.

`content_hash` est un SHA-256 des deux chaînes [recto généré, extrait source] sérialisées séparément en JSON après normalisation NFC, minuscules françaises et compactage des espaces. Accents et ponctuation conservés. Index UNIQUE `(user_id, document_id, content_hash)`. Cette empreinte d’origine doit rester immuable après édition : une génération répétée doit retrouver le même brouillon, même modifié ou rejeté. L’API future utilisera `INSERT OR IGNORE` et comptera les lignes ignorées.

`accepted_note_id` est UNIQUE et référence `flashcard_notes` avec `ON DELETE SET NULL`. Tant que la note existe, une nouvelle acceptation renvoie cette note. Si elle a été supprimée, le brouillon reste `accepted` avec référence NULL ; une acceptation explicite pourra recréer une note et ses cartes FSRS dans une transaction, puis enregistrer la nouvelle référence. Le test de schéma exerce ce scénario avec le repository existant ; les routes devront ensuite être testées séparément.

Le CHECK `note_type` reprend la liste commune réelle : `basic`, `reverse`, `bidirectional`, `cloze`, `typed`, `image_occlusion`, `atlas_3d`. La génération textuelle actuelle ne produit pas de notes visuelles. `rejected_from` n’accepte que NULL, `pending`, `edited`.

Les dates `created_at`, `updated_at`, `rejected_at` sont des millisecondes Unix entières, comme les reçus, assets et échéances FSRS. Les notes/cartes historiques utilisent aussi des dates ISO textuelles : ne pas confondre ces formats. Aucun timestamp existant n’est converti. `REJECTED_DRAFT_RETENTION_MS` vaut 30 × 86 400 000 ; la purge automatique sera ajoutée au démarrage et aux accès de l’API de révision, avec tests de frontière temporelle.

## Critère « sûr » calculé

`SAFE_DRAFT_RULE` dans `server/flashcards/review/policy.mjs` est l’unique configuration : confiance ≥ 0,95, preuve verbatim, type `basic`, `reverse` ou `cloze`, statut `pending`. Les statuts édités, rejetés et déjà acceptés sont exclus du lot automatique ; la réacceptation après suppression reste une action explicite.

La confiance vient exclusivement d’un fait typé déjà reconnu dans la même section, avec preuve identique. Pas de score inventé à partir d’un simple type de carte. La vérification verbatim compacte les espaces et normalise NFC, sans changer casse, accents, mots ou ponctuation. Le critère n’est jamais stocké ; seule la confiance et `verbatim_proof` le sont. Les cartes à réponses chiffrées et équivalences ne sont pas automatiquement couvertes par les faits typés actuels.

## Mesure du seuil 0,95

Générateur réel `generateLocalNoteDrafts`, mode `standard`, cible 12, source synthétique de type document ; aucun PDF importé ni appel fournisseur. Les sections du catalogue sont assemblées comme le fait la route de génération, avec leurs titres, texte et puces. Les numéros de pages de mesure sont uniquement des repères synthétiques, le catalogue n’étant pas un PDF.

Texte d’exemple existant des tests : « Le débit cardiaque est le produit de la fréquence cardiaque par le volume d’éjection systolique. La pression artérielle dépend du débit cardiaque et des résistances périphériques. Le nœud sinusal assure normalement le rythme du cœur. »

| Source | Générés | Preuve verbatim | Fait typé reconnu | Sûrs ≥ 0,95 |
| --- | ---: | ---: | ---: | ---: |
| Exemple ci-dessus | 2 | 2 | 0 | 0/2 : 0 % |
| `anat-diaphragm-muscle` — Diaphragme thoraco-abdominal : coupoles, centre tendineux et orifices de passage | 7 | 7 | 0 | 0/7 : 0 % |

Ce seuil ne permet aucun lot automatique sur ces deux exemples : les faits typés existants ne couvrent que certaines innervations, vascularisations et localisations conservatrices. Baisser légèrement le seuil ne corrigerait pas une absence de fait reconnu (confiance 0). Le test positif contrôlé « Le nerf médian innerve le muscle pronateur rond. » produit une confiance 0,97 et passe le critère. L’extracteur et le filtre d’atomisation et/ou restent inchangés.

## Validation de cette étape

`test:flashcards` : 86 réussis ; `test:study` : 25 ; `test:catalog-content` : 6. Le contrôle de versions de migration est explicitement `[1, 2, 3, 4, 5]`.

Les tests couvrent dédoublonnage (y compris rejet et isolation des espaces de stockage), conservation des accents, cascades, types/statuts/dates, unicité de note et remplacement après suppression, ainsi que les signaux et exclusions du critère sûr. Les contrôles HTTP de propriété, génération et purge restent à vérifier lors de l’étape API.
