# Study 2.0 — validation du 14 octobre 2026

## Décision

GO technique pour la revue de la bêta progressive, avec retour à l’interface actuelle. NO-GO pour affirmer une qualité pédagogique ou médicale globale, ou activer Study 2.0 pour tous les comptes sans validation complémentaire. Rien n’est fusionné ou déployé automatiquement.

Les parcours réels d’import, lecture, fiches, flashcards et cartes visuelles passent. Les routes QCM/assistant et leur protocole Gemini sont testés avec des providers contrôlés. Les appels Gemini réels ci-dessous constituent un petit échantillon, avec un QCM non validé après timeout ; ils ne permettent pas de certifier les explications et distracteurs de tout un corpus.

## Corpus et comparaison

`scripts/benchmark-study-v2.mjs` sélectionne les mêmes 45 cours que le benchmark de pré-fusion : 15 anatomie, 15 physiologie, 15 pharmacologie, tri déterministe `validation-quality-v1`. Flashcards comparées à `c6e98d1` ; fiches comparées à `80fbfc0`, avant la correction de contexte identifiée ici. Aucun texte de cours ni carte utilisateur réécrit.

| Domaine | Cours | Flashcards avant | Après | Rectos doublonnés après | Preuves hors texte | Cartes perdues |
|---|---:|---:|---:|---:|---:|---:|
| Anatomie | 15 | 155 | 155 | 0 | 0 | 0 |
| Physiologie | 15 | 136 | 136 | 0 | 0 | 0 |
| Pharmacologie | 15 | 66 | 66 | 0 | 0 | 0 |
| Total | 45 | 357 | 357 | 0 | 0 | 0 |

La quantité stable ne démontre pas la qualité médicale. Les réserves de `flashcard-quality-review.md` restent valables : notamment 20 cartes préexistantes nécessitant une revue humaine. Les garde-fous et la révision des brouillons ne sont pas présentés comme une correction automatique de ces problèmes.

### Correction concrète des fiches locales

Le découpage en phrases séparait des pronoms de leur antécédent. Le garde-fou existant rejetait ensuite ces phrases, dont des rapports anatomiques utiles. La correction regroupe uniquement les phrases contiguës d’une même ligne de paragraphe, garde leur preuve verbatim et ne joint pas des lignes distinctes ou des titres. Les tableaux et blocs de code restent groupés. Aucun garde-fou médical/quantitatif assoupli et aucun référent inventé.

| Mesure sur les 45 cours | Avant | Après |
|---|---:|---:|
| Candidats refusés par les contrôles des fiches locales | 48 | 1 |
| Sections représentées | 247/247 | 247/247 |
| Caractères source couverts par les preuves, résumé court | 49,4 % | 52,3 % |
| Caractères source couverts par les preuves, fiche structurée | 82,6 % | 86,4 % |
| Caractères source couverts par les preuves, fiche détaillée | 89,5 % | 93,4 % |

Le comptage de caractères mesure l’union des extraits cités, titres compris dans le dénominateur. Il ne mesure ni notions apprises, ni fidélité sémantique, ni exhaustivité médicale. Les plafonds des formats courts restent visibles ; la couverture des valeurs signale les omissions plutôt que d’affirmer un cours complet.

## PDF réels

Les quatre PDF universitaires ont exactement les SHA-256 du benchmark précédent. Extraction dans le worker utilisé par le pipeline, sans OCR payant automatique. Les avertissements sont conservés.

| PDF | Pages | Caractères extraits | Sections | Pages sans texte | Avertissements |
|---|---:|---:|---:|---:|---:|
| Cardiologie UNESS | 18 | 27 801 | 24 | 0 | 0 |
| Physiologie Grenoble | 29 | 6 837 | 11 | 0 | 22 |
| Pharmacologie Lyon | 70 | 24 007 | 24 | 0 | 54 |
| Cardiologie collège | 125 | 234 819 | 230 | 0 | 0 |
| Exo7 Dérivée | 14 | 29 624 | 15 | 0 | 14 |
| Exo7 Python | 25 | 69 065 | 28 | 0 | 25 |
| Banque de France, inflation | 3 | 13 326 | 7 | 0 | 3 |

Les avertissements concernent notamment colonnes reconstruites et formules composées. Les diapositives avec figures ne deviennent pas un texte complet simplement parce qu’une légende est extractible. Les fractions, valeurs absolues, images et coordonnées fiables exigent encore une comparaison à l’original. Les 230 sections du long PDF reflètent un découpage automatique, sans plan éditorial certifié. Les temps locaux d’extraction sont d’environ 0,3 à 2 secondes sur cet échantillon, sans garantie sur d’autres machines.

Les tests de compression couvrent également ASCII85+Flate, Flate seul et brut, longueurs de flux indirectes, scan sans texte, filtre non supporté et flux corrompu. Les limites de taille, pages, dimensions, concurrence et interruption sont testées séparément. Aucun PDF réel chiffré ni OCR réel évalué dans cette passe.

## Gemini réel, budget explicitement autorisé

Un seul cours du catalogue : `phys-renal`, huit sections, environ 6 700 caractères ; modèle configuré `gemini-3.5-flash-lite`. Aucun PDF importé ou donnée de compte envoyé. Après refus initial de la revue automatique, l’utilisateur a explicitement autorisé cet envoi, avec un plafond total de huit requêtes HTTP. Sept ont finalement été utilisées ; aucun changement automatique de modèle.

| Tâche | Résultat | Limite |
|---|---|---|
| Fiche structurée | 19 points, 8/8 sections représentées, preuves retrouvées | Six quantités écrites absentes signalées ; couverture des sections ne vaut pas exhaustivité |
| Deux QCM | Échec `AI_TIMEOUT`, aucun résultat final validé | Délai du premier benchmark réduit à 15 s ; ce résultat ne démontre pas un échec au délai normal de production |
| Assistant, information absente du cours | Abstention correcte, aucun paragraphe inventé | Ne valide pas une réponse documentaire positive sur des mécanismes médicaux |

Le script final utilise désormais le délai configuré de production. Aucun nouvel appel QCM effectué après le timeout ; les deux requêtes restantes étaient réservées au test d’abstention, qui n’en a utilisé qu’une. Une consommation du timeout reste incertaine. Les résultats locaux ne remplacent pas ce test distant incomplet.

## Validation technique, migrations et preuves UX

Build TypeScript/Vite vert. Backend : Study 121/121, flashcards 111/111, comptes 7/7, progression 2/2, taxonomie 11/11, catalogue 6/6, qualité catalogue 6/6, feedback 2/2, sécurité 1/1 : 267 tests verts. Les 24 parcours E2E ciblés passent après la dernière correction, sans retry.

Les tests de migrations vérifient explicitement les versions V2 `[1,2,3,4]`, l’idempotence, les clés étrangères, la conservation des documents/sections/synthèses, cartes et état/historique FSRS. Les migrations sont additives ; aucune purge de données existantes. Les anciens supports restent accessibles dans l’interface actuelle et les synthèses copiées ne remplacent pas leurs originaux.

Parcours réels vérifiés : import → lecture/selection/page persistée → fiche → édition/sauvegarde/PDF téléchargé ; passage exact → flashcards → édition → acceptation → FSRS ; page PDF → occlusion → note avec document/page → libération URL ; mobile 390 px sans débordement, Échap/focus et retour à l’interface actuelle. Deux E2E QCM et deux assistant simulent leurs réponses côté navigateur ; les tests serveur couvrent séparément les routes réelles et les appels Gemini contrôlés. Cette distinction demeure explicite.

Le bundle principal reste 760,48 ko, contre 760,47 ko sur la base de la refonte. PDF.js et les nouveaux espaces sont chargés à la demande. L’avertissement Vite sur les chunks déjà supérieurs à 500 ko reste présent. Pas de nouvelle dépendance lourde ni modification de CSP, routing ou moteur FSRS.

Captures de revue recréées par les tests dans `tests/artifacts/design/study-v2-*.png` et ignorées par Git. Bibliothèque, lecteur clair/sombre, fiches, QCM, assistant et occlusion mobile. Elles montrent un document synthétique, pas des réponses médicales certifiées. Aucune suppression de l’ancienne interface : elle constitue encore le retour possible pendant la migration.

## Reproduction et limites restantes

```sh
node --experimental-strip-types --experimental-loader=./scripts/ts-loader.mjs scripts/benchmark-study-v2.mjs --output=/private/tmp/study-v2-benchmark.json
node scripts/verify-university-pdfs.mjs /private/tmp/corpus-real-pdfs
npm test -- tests/study-v2-library.spec.ts tests/study-v2-notes.spec.ts tests/study-v2-questions.spec.ts tests/study-v2-assistant.spec.ts tests/study-v2-flashcards.spec.ts tests/my-courses.spec.ts tests/flashcard-draft-review.spec.ts
```

Le benchmark local ne fait aucun appel payant. `--live` est une option explicite ; utiliser seulement après autorisation du contenu à envoyer. `--live-limit` est limité à huit requêtes HTTP, retries compris, et `--live-task` permet de cibler une tâche. Les PDF publics ne sont pas versionnés ; leurs chemins peuvent être adaptés avec `--pdf-dir` et `--nonmedical-dir`.

À compléter avant activation générale : QCM Gemini réel jusqu’à la correction finale, assistant positif sourcé, corpus Gemini représentatif, revue médicale des ambiguïtés et réponses incomplètes, Safari/iPhone/lecteur d’écran/tactile, figures complexes, OCR réel et très longs documents. La présence de tests verts ne suffit pas à déclarer la qualité pédagogique terminée.
