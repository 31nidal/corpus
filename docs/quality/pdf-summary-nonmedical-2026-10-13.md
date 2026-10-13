# PDF et synthèses hors médecine — 13 octobre 2026

## Corrections

La lecture PDF reconstitue les colonnes avec leurs lignes courtes, conserve les blocs de code et leur indentation, rattache les indices/exposants et récupère les glyphes d’inégalité de la police AMS MSAM. Les métadonnées de titres structurés remplacent la détection trop large des lignes courtes. Les formules composées restent signalées : fractions et barres de valeur absolue ne sont pas garanties.

La synthèse demande des paragraphes explicatifs suivant le plan du cours, avec preuves contiguës, conditions et limites. Les propositions inversant une borne ou renforçant certaines possibilités sont refusées. Au plus quatre appels de réparation utilisent les mêmes règles de source, le même délai global et les mêmes contrôles de preuve. Les petits blocs de 6 000 caractères reviennent au découpage historique si le plafond de 32 blocs serait dépassé : aucun texte n’est tronqué pour respecter ce plafond.

Le nombre de sections représentées et les titres absents sont distincts du nombre de sections analysées. Après suppression d’un point lors de la validation, cette couverture est recalculée. La présence d’un point ne garantit pas que toutes les notions d’une section soient résumées.

La prévisualisation affiche les titres des sections et les catégories. Une synthèse validée s’affiche en paragraphes ; les fiches de révision et anciennes synthèses gardent leurs listes. Aucun changement de FSRS, de schéma SQLite ou des cartes existantes ; aucune nouvelle dépendance.

## Extraction : comparaison reproductible sur les mêmes PDF complets

Comparaison avec `77530c5`, avant ces corrections, en exécutant les deux versions de l’extracteur sur les mêmes octets téléchargés.

| PDF public | Pages | Sections avant | Sections après | Observation |
|---|---:|---:|---:|---|
| [Exo7 — Dérivée](https://exo7.emath.fr/cours/ch_derivee.pdf) | 14 | 73 | 16 | Moins de fragments mathématiques considérés comme titres ; indices et 29 glyphes ⩽ récupérés |
| [Exo7 — Algorithmes/Python](https://exo7.emath.fr/cours/ch_algo.pdf) | 25 | 115 | 40 | 50 blocs monospace délimités ; indentation conservée |
| [Banque de France — Inflation/déflation](https://www.banque-france.fr/system/files/2024-08/eeb-inflation-deflation.pdf) | 3 | 9 | 7 | Ordre des colonnes reconstitué ; titres accentués préservés |

Ces comptages ne mesurent ni l’exhaustivité ni l’exactitude du résumé. Les fichiers publics ne sont pas versionnés.

## Validation et réserves

- Les tests contrôlés couvrent les inégalités inversées, possibilités renforcées, sections manquantes, réparation plafonnée, erreur réseau sans nouvelle réparation, preuves provenant de plusieurs fragments d’une section, longs documents et couverture après suppression.
- Les 16 tests navigateur ciblés passent : import → synthèse/QCM/PDF et import → brouillons → édition → acceptation → FSRS ; prévisualisation à 390 px, avec avertissement des sections absentes et sans débordement.
- Les appels réels à Gemini 3.5 Flash-Lite ont échoué (`AI_UPSTREAM`, puis `AI_TIMEOUT`) sur les PDF maths et économie. Le modèle répond à la consultation des métadonnées, ce qui ne prouve pas la disponibilité de la génération. Aucun résultat nouveau exploitable : la qualité des synthèses réelles après correction reste à vérifier lorsque le service répond. Aucun changement automatique de modèle pour masquer ces échecs.
- Un ancien script local ignoré par Git, `tests/artifacts/design/main-integration/integration-smoke.validation.spec.ts`, attend un PDF de cardiologie fourni par `VALIDATION_REAL_PDF`, mais son PDF par défaut ne contient pas les barorécepteurs attendus. Son échec n’est pas compté comme un passage réussi ; la suite versionnée est lancée séparément.
- Non vérifiés : Safari/iPhone, lecteur d’écran, PDF exact de l’utilisateur, toutes les formules complexes et la qualité sémantique de tous les points. Aucune certification médicale automatique.
- Les cours déjà importés ne sont pas réécrits : réimporter pour utiliser la nouvelle extraction. Les cartes et données existantes restent conservées.
- Cette branche ne déclenche pas de déploiement de production.

## Suites locales

Build TypeScript/Vite : vert. Tests backend : Study 67/67, flashcards 109/109, catalogue 6/6, comptes 7/7, feedback 2/2, sécurité 1/1, taxonomie 11/11, qualité catalogue 6/6, progression 2/2. Le build conserve l’avertissement existant sur les chunks de plus de 500 ko.

Les résultats de la suite Playwright complète et de la CI distante sont consignés dans la PR ; les succès ciblés ci-dessus ne doivent pas être présentés comme une validation du benchmark Gemini réel.
