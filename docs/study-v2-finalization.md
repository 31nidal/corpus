# Study 2.0 — audit intégré et finalisation

État au 14 octobre 2026. Branche `fix/study-v2-finalization`, basée sur `feat/study-v2-quality-validation` (#22). Aucun merge, déploiement, changement de dépendance ou migration supplémentaire. `main` reste `c6e98d1d7eef91fd899e5b0bca13aa3803fff279`.

## PR et dépendances vérifiées

Les huit PR sont ouvertes, non brouillon, `MERGEABLE` / `CLEAN`, avec `validate` et les trois shards E2E verts sur leurs SHA respectifs. Les corrections de ce rapport se trouvent au-dessus de la pile, sans réécriture des branches précédentes.

| PR | Base | SHA contrôlé | Périmètre | Décision |
|---|---|---|---|---|
| #15 | main | 4cb5144 | Audit/migration | Prête à la revue technique |
| #16 | #15 | 9916fc1 | Pipeline durable et stockage | Prête à la revue technique |
| #17 | #16 | 8c4e0ca | Bibliothèque/lecteur | Intégrer aussi la pagination finale |
| #18 | #17 | d76cd28 | Fiches | Intégrer aussi les corrections des valeurs et diagnostics |
| #19 | #18 | 0eabb76 | QCM/entraînement | Intégrer aussi les contrôles de preuve et les lots de vérification |
| #20 | #19 | c1e5dc8 | Assistant | Revue technique possible ; limites Gemini ci-dessous |
| #21 | #20 | 80fbfc0 | Flashcards précises/visuelles | Prête à la revue technique, moteur conservé |
| #22 | #21 | db7f7f3 | Validation/performance | Compléter avec ce rapport et la PR de finalisation |

Ordre d’intégration éventuel : #15 → #16 → #17 → #18 → #19 → #20 → #21 → #22 → finalisation, après revue de l’ensemble final et checks sur chaque nouvelle base. Cette liste n’autorise aucune fusion ni mise en production. La CI des anciennes PR ne valide pas à elle seule les corrections finales.

## Bilan de chaque fonctionnalité

| Fonctionnalité | Vérification effectuée | Réserve |
|---|---|---|
| Bibliothèque | Dossiers matière/chapitre, déplacement, renommage, recherche contenu, archives/restauration, 101 documents paginés, annulation d’une réponse obsolète | Le compteur indique les documents chargés ; pagination par 100 |
| Import/extraction | Stockage original sécurisé, worker réel, sept PDF publics, scan image sans texte, dimensions, interruption/reprise, propriétaire | OCR Google réel non testé ; figures et formules complexes à relire |
| Lecteur/sélection | PDF original, texte sélectionnable, pages/zoom/sommaire, position persistée, source précise et mobile | Gestes iPhone/Safari non vérifiés manuellement |
| Fiches | Trois niveaux, édition/sauvegarde/version, export PDF téléchargé, preuves, conservation des valeurs reconnues | Résumé court volontairement partiel ; pas de contrôle d’exhaustivité sémantique |
| QCM | Unique/multiple, preuves, vérification indépendante, édition/régénération, validation humaine, correction immédiate/différée, score/historique | Cohérence IA imparfaite ; aucune validation médicale automatique |
| Assistant | Réponse positive rénale/anatomique confrontée aux citations, abstention, histoire, erreurs/quota, isolation | Question générale parfois trop peu couverte ; assistant biochimique bloqué par 429 lors du test |
| Flashcards | Passage/document/section, édition/acceptation idempotente, occlusion/page source, FSRS et retour classique | Session FSRS existante embarquée dans le cours, puis retour au PDF et au focus ; aucun scheduler réécrit |
| Comptes/persistance | Changement de compte, 404 pour autrui, rechargement/sauvegarde, CAS, cascades, migrations additives | Pas de test manuel multi-appareils sur le déploiement de production |

## Bugs corrigés et preuve

- Fiches structurées : un plafond de cinq points et les omissions du modèle pouvaient laisser des chiffres du cours hors du résultat. Ajout borné de paragraphes chiffrés **verbatim**, marqués `sourceSupplement`, avec les références originales. Aucun calcul, conversion ou connaissance extérieure. Les points IA refusés restent comptés ; une section sans point valide n’est pas masquée par ce mécanisme. Aucun complément imposé au résumé court, ni aux fiches déjà enregistrées.
- Quantités : un seul motif pour attestation et couverture, unités `mg/min` et `mg/mL` distinguées, virgules/espaces normalisés pour la comparaison, affichage original conservé. Les lettres d’un mot et `L’axis` ne sont pas des unités ; le précédent signal `5 s` issu de « 5 sécrétés » était un défaut de détection, pas une donnée en secondes. Ce contrôle reste limité aux notations reconnues.
- Gestion des erreurs Gemini : une interruption pendant la lecture du corps HTTP conserve désormais `AI_TIMEOUT` au lieu d’être présentée comme un JSON invalide. Une seule requête, aucune relance réseau implicite ; consommation conservée comme incertaine.
- Diagnostic de réparation : les nouveaux refus après l’appel de réparation sont aussi classés dans `rejectionReasons`, au lieu d’augmenter seulement le total.
- QCM : vérification par lots de quatre maximum, avec un résultat indexé distinct par question et contrôle complet de chaque proposition. Index manquants/dupliqués refusés, chaque question reste contrôlée séparément. Un candidat refusé ne bloque pas une meilleure question de même énoncé dans une section suivante.
- QCM : deux réponses réellement observées utilisaient « le texte n’associe pas » / « non décrite » pour justifier une contradiction. Un garde-fou ciblé refuse ces justifications d’absence, y compris dans le contrôle indépendant. Le prompt privilégie trois propositions homogènes, un seul paramètre modifié et une contradiction explicitement citée. Ce garde-fou ne prétend pas reconnaître toute erreur sémantique.
- Compatibilité classique/V2 : un document importé après la migration avait une version de métadonnées `null` ; la création de la projection avant le contrôle CAS produisait un faux 409 au premier renommage. La comparaison se fait désormais sous transaction avant création de la projection, puis un ancien `null` est refusé normalement. Un import classique fini ne reste plus artificiellement « importé » quand aucun job V2 ne le traite ; un ancien import inachevé sans job actif affiche une intervention nécessaire avec reprise explicite. Lecture du statut canonique sans réécriture de la source.
- Réacceptation : l’API pouvait recréer une note supprimée depuis son brouillon permanent, mais l’interface ne proposait aucune action pour ce cas. Bouton explicite sur les brouillons acceptés sans note ; aucune génération supplémentaire, l’id du brouillon est conservé et une seule nouvelle note est créée.
- Révision dans le cours : le lien accepté quittait « Mes cours ». Il ouvre maintenant le renderer FSRS existant dans le document, avec le même endpoint de queue ciblée, preview/version et notation. Retour au PDF et au lien d’origine, état des brouillons conservé, raccourcis limités à la session. L’espace global absolu a un override CSS scoped pour rejoindre le flux du cours ; hauteur réelle de navigation mobile prise en compte, pas de clic forcé. Aucun nouveau scheduler/API/format de carte. En mode ciblé, chargement des decks uniquement, sans liste générale ni statistiques inutiles.
- Bibliothèque : `nextOffset` était ignoré par l’interface. Les documents après le centième étaient inaccessibles. Ajout du chargement suivant, dédoublonnage, double clic bloqué et abort/version sur changement de recherche/dossier.
- Interface : ordre des espaces original → fiches → QCM → flashcards → assistant, pluriel des pages corrigé et chargement de pagination annoncé dans la région de statut existante.
- Mises à jour QCM : utilisation de l’état courant lors des retours d’édition pour éviter de remplacer la réponse d’une autre carte par un instantané ancien.

Les régressions reproduisent les valeurs/citations fautives, les index de lots, la pagination réelle et la requête obsolète. Les tests de scan utilisent un PDF valide contenant une image de cours, sans couche texte ; le worker et le lecteur sont réels, aucun OCR factice présenté comme une extraction réelle.

## Benchmark local comparable

[Résultats structurés](study-v2-finalization-results.json). 60 cours : 15 anatomie, 15 physiologie, 15 pharmacologie, 15 biochimie. 331 sections représentées dans chaque niveau. Flashcards : 457 avant / 457 après, aucun doublon de recto détecté, aucune preuve hors source, aucune perte par le critère du benchmark ; générateur/FSRS inchangés dans cette finalisation.

| Valeurs reconnues absentes | Base #22 | Finalisation |
|---|---:|---:|
| Résumé court | 29 | 29 |
| Fiche structurée | 7 | 0 |
| Fiche détaillée | 3 | 0 |

La comparaison utilise le même contrôle corrigé des unités pour les deux sorties. Le premier comptage intermédiaire était 8 → 0 avant correction du faux « 2 L » ; le résultat final comparable est 7 → 0. Ces chiffres n’évaluent pas les idées sans nombre, les unités non reconnues, les classifications écrites en lettres ou les relations anatomiques. Un refus de qualité reste visible dans le corpus local.

Sept fichiers publics extraits à nouveau, hashes des quatre universitaires identiques aux références précédentes. UNESS 18 pages, Grenoble 29, Lyon 70, Collège 125, mathématiques 14, Python 25, économie 3. Aucune page sans texte sur cet échantillon. Durées locales de quelques dixièmes de seconde à environ 2 s, pas un engagement de performance Railway. Grenoble/Lyon/formules/colonnes conservent leurs avertissements : 22 / 54 / 14 / 25 / 3 suivant le fichier concerné. Les figures ne sont pas certifiées interprétées par le pipeline.

## Gemini réel et contrôle des réponses

Nouveau budget explicitement autorisé : 24 requêtes HTTP, trois cours publics, plafond de 0,10 $ par cours. **23 utilisées**, environ **0,0416 $ estimés** sur les réponses avec usage connu. Modèle configuré `gemini-3.5-flash-lite`, délai normal 45 s/appel. Aucun PDF privé ni donnée de compte envoyé. Les sorties intégrales et journaux restent sous `/private/tmp/study-v2-finalization-*.json` ; ils ne contiennent pas la clé. Les pages du benchmark catalogue sont synthétiques (une section par page), distinctes des pages des PDF universitaires.

| Cours | Fiche après adaptation finale | QCM réels | Assistant réel |
|---|---|---|---|
| Filtration glomérulaire et fonctions tubulaires | 20 points, 8/8 sections, 0 valeur reconnue manquante ; 1 complément littéral | 2 reçus en 5,8 s ; l’audit final refuse celui qui invoque l’absence d’information pour un distracteur | Réponse positive sourcée, 1 paragraphe, 5,9 s ; elle ne couvre pas tous les mécanismes du cours |
| Rachis cervical | 18 points, 6/6 sections, 0 valeur reconnue manquante ; 2 compléments littéraux | 2 reçus en 5,0 s ; contrôles de forme/source passent | Abstention à une question générale ; question précise atlanto-axoïdienne : 2 paragraphes sourcés en 4,4 s |
| Enzymologie | 5 points, 5/5 sections, 0 valeur reconnue manquante | Premier essai : 1/2 retenu, puis refusé par l’audit final pour preuve d’absence. Après correction : 2/2 en 6,9 s, contradictions explicites | Erreur Google 429, test positif non validé ; aucune fausse réponse de remplacement |

Les fiches ont été confrontées aux paragraphes d’origine. Sur la sortie rénale sauvegardée, l’adaptation initiale gardait 19 points mais omettait `5 mg/mL` et `5 mL/min` ; le complément conserve tout l’exemple calculé déjà présent, sans inventer les unités des nombres 80 et 5. Sur la sortie anatomique, retrait du faux litre avant recomptage : 16 → 18 points. Les appels ne sont pas reproductibles mot pour mot ; comparer les deux adaptateurs sur **la même réponse sauvegardée** évite de confondre variation Gemini et effet du correctif.

Le timeout initial à 15 s n’est plus reproduit avec la configuration normale et les lots. Cela ne garantit pas la latence pour 30 questions ou les documents très longs. Les contrôles IA avaient accepté deux questions défectueuses : leurs marqueurs `verificationPassed` ne valent pas certification médicale. La question rénale sur la composition du filtre reste à relire, notamment les citations des distracteurs portant sur d’autres structures. Les nouvelles questions biochimiques sont plus ciblées ; une revue humaine reste requise avant entraînement.

## Tests, migrations, performance et captures

- Build TypeScript/Vite vert ; aucun script lint présent dans le projet.
- 280 tests backend verts : Study 134, flashcards 111, comptes 7, progression 2, taxonomie 11, catalogue 6, qualité catalogue 6, feedback 2, sécurité 1.
- 32 Playwright ciblés verts sans retry, sur serveur et base isolés : parcours import/lecture/édition/sauvegarde/PDF, QCM/assistant, sélection précise/acceptation/FSRS, image/mask, mobile 390 px, clavier/focus, erreurs, comptes, pagination, scan et transition classique/V2. Cartes basic desktop/mobile, cloze et typed notées avec historique persistant dans le cours ; aucun clic forcé pour contourner la navigation mobile. Réacceptation d’une note supprimée vérifiée aussi dans l’interface.
- Les parcours UI QCM/assistant utilisent des réponses contrôlées pour les tests de contrat ; les appels réels et leurs limites sont décrits séparément ci-dessus.
- Migrations V2 `[1,2,3,4]` idempotentes et additives, sources immuables, contrôles des clés étrangères et conservation des cartes/historiques FSRS vérifiés. Cette PR ne modifie aucun schéma.
- Bundle principal 760,52 ko, gzip 189,72 ko, contre 760,48 ko sur #22. Modules Study 2.0 chargés à la demande. L’avertissement Vite des anciens gros chunks reste présent.
- Captures recréées par les E2E dans `tests/artifacts/design/study-v2-*.png`, ignorées par Git : bibliothèque, lecteur clair/sombre, fiches desktop/mobile, QCM/assistant desktop/mobile, occlusion mobile, scan et FSRS dans le cours (1440/390 px). La galerie locale ne sert que ces images de fixtures contrôlées.

Commandes reproductibles :

```sh
npm run build
npm run test:study
npm run test:flashcards
npm run test:accounts
npm run test:student-progress
npm run test:taxonomy
npm run test:catalog-content
npm run test:course-quality-sample
npm run test:feedback
npm run test:security
npx playwright test --config=playwright.study-v2.config.ts
node --experimental-strip-types --experimental-loader=./scripts/ts-loader.mjs scripts/benchmark-study-v2.mjs --notes-baseline=db7f7f3
```

Le script est local par défaut. `--live-course`, `--live-task`, `--live-limit` et `--include-generated` servent aux benchmarks expressément autorisés. Ne pas relancer au-delà du budget restant sans nouvelle autorisation ; les retries HTTP comptent aussi.

## Décision et non vérifié

GO pour la revue technique de l’ensemble corrigé et la bêta avec relecture humaine. Pas de GO pour activation générale ou affirmation de fiabilité médicale complète. Aucune fusion ni mise en production effectuée.

Restent ouverts : assistant biochimique après le 429, un échantillon Gemini plus large après autorisation, appréciation humaine des QCM/synthèses et des 20 cartes préexistantes signalées dans la revue précédente, questions générales de l’assistant parfois partielles, OCR Google réel, figures/formules complexes, très longs PDF au-delà des 125 pages réellement mesurées, Safari/iPhone/tactile/lecteur d’écran, charge multi-utilisateurs et comportement sous limites mémoire Railway. Les données et l’interface classique restent conservées.

CI finale : consulter les checks de la [PR #23](https://github.com/31nidal/corpus/pull/23) sur son HEAD courant. Les 32 checks verts de la pile antérieure ne sont pas utilisés comme substitut.
