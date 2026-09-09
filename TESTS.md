# Vérification — plateforme d’apprentissage Corpus

Vérification du 7 septembre 2026, Chromium 153 avec WebGL/SwiftShader. Ordinateur 1440 × 900 et émulation tactile 393 × 852.

## Résultats

- `npm run build` réussi : TypeScript et génération de `dist/`.
- Les neuf scénarios d’exploration ont réussi après la refonte des commandes, des matériaux et des libellés. Les deux contrôles supplémentaires ont également réussi : couverture française et vues rapides, avec un petit écran de 375 × 667. Bilan : 15 scénarios validés, avec nouvelles vérifications ciblées réussies après correction du chargement et ajustement de la vue Muscles.
- Contrôle de production réussi : chargement initial et sélection du poumon droit composé de vrais maillages ; zéro erreur JavaScript, zéro réponse HTTP en erreur, zéro requête externe. Instrumentation de test absente de la production.

## Couverture

1. Intégrité des huit GLB : signature, tailles, SHA-256, 1 663 nœuds uniques, correspondance des assemblages et exclusion des fichiers non identifiés.
2. Fond blanc, 494 structures initiales, muscles téléchargés seulement à leur activation.
3. Survol et clic par lancer de rayon sur le vrai fémur, fiche, mouvement de caméra et réinitialisation.
4. Recherche française sans accent, sélection clavier d’un muscle détaillé, isolation, masquage, restauration et absence de résultat.
5. Tous les systèmes chargés, 1 663 structures visibles, sélection et isolation du cœur composé, masquage global.
6. Index filtré sur les nerfs et retour à la vue d’ensemble de 48 structures.
7. Mobile : absence de débordement horizontal, pincement à deux doigts, activation des artères et isolation tactile du fémur.
8. Zoom, orientation face/dos, crédits et fermeture au clavier.
9. Téléchargement des muscles interrompu volontairement : erreur explicite, squelette déjà chargé conservé.

10. Couverture des libellés français de chaque structure de l’atlas et de la vue d’ensemble, sans résidus anglais usuels.
11. Vues rapides Muscles / Squelette / Organes, compte des structures visibles, recherche française et fiche sur écran de 375 × 667.

12. Liens profonds vers une couche non chargée, rechargement et navigation précédent/suivant.
13. Copie du lien, vue simplifiée partagée et identifiant inconnu avec retour à l’exploration.
14. Enveloppe réelle du visage en vue musculaire, effacement pendant une sélection et restauration.
15. Thème sombre mémorisé et parcours guidé complet en cinq étapes.

La correction de disponibilité attend toutes les couches actuellement demandées avant d’annoncer la fin du chargement. Le corps est cadré plus près et le shader du visage a été inspecté visuellement. La vue rapide Muscles conserve les structures sous-jacentes pour éviter les vides de la tête.

## Captures du navigateur

- [Muscles et visage, thème sombre](tests/artifacts/final-dark-muscles.png)
- [Thème sombre sur téléphone](tests/artifacts/final-dark-mobile.png)
- [Visite sur téléphone](tests/artifacts/final-mobile-tour.png)
- [Visite sur ordinateur](tests/artifacts/guided-tour.png)
- [Nouvelle interface](tests/artifacts/modern-desktop.png)
- [Petit écran](tests/artifacts/modern-small.png)
- [Fiche sur petit écran](tests/artifacts/modern-small-detail.png)
- [Production sur fond blanc](tests/artifacts/white-production.png)
- [Poumon sélectionné en production](tests/artifacts/white-production-lung.png)
- [Muscles activés](tests/artifacts/white-muscles.png)
- [Muscle isolé](tests/artifacts/white-isolated.png)
- [Téléphone](tests/artifacts/white-mobile.png)
- [Fiche et isolation sur téléphone](tests/artifacts/white-mobile-detail.png)

Les vues ordinateur, mobile et poumon sélectionné ont été inspectées visuellement. Il s’agit de captures réelles, pas d’illustrations de maquette.

## Reproduire

```sh
npm install
npx playwright install chromium --only-shell
npm test
npm run build
```

Les tests démarrent Vite automatiquement. Pour la production complète, lancer `npm start`, puis `node tests/production-smoke.mjs`. `CORPUS_URL` permet de changer l’adresse cible. Ce dernier bloque toute requête externe.

Dans cette session, Chromium a été installé dans `/private/tmp/corpus-browsers` et les commandes de test utilisent `PLAYWRIGHT_BROWSERS_PATH=/private/tmp/corpus-browsers`. Un navigateur existant peut aussi être indiqué avec `PLAYWRIGHT_CHROMIUM_EXECUTABLE`.

## Limites

Pas de test sur téléphone physique, Safari ou Firefox. SwiftShader ne mesure pas les performances d’un GPU mobile. Les assertions accordent jusqu’à 90 secondes au chargement : ce délai n’est pas une promesse de performance. Le chargement de toutes les couches représente 50,61 Mo. Les avertissements Vite concernant des modules supérieurs à 500 Ko ne bloquent pas la compilation. Pas de validation clinique ; certaines fiches restent génériques ; les noms distribués sont traduits en français.

Contrôle de production final : rechargement du lien vers le poumon, vue Muscles en thème sombre, écran de 375 × 667 et démarrage de visite guidée réussis. Zéro erreur JavaScript, réponse HTTP en erreur ou requête externe. Captures finales inspectées sur ordinateur et téléphone.


## Extension apprentissage et conversation

Vérification du 7 septembre 2026, Node, Chromium et WebGL/SwiftShader. La suite comporte désormais 24 scénarios. Aux 15 contrôles historiques s’ajoutent :

16. API locale : commandes françaises, contexte du cœur, requêtes invalides, limites de taille et méthodes.
17. Coupe, axe, inversion, opacité, repères et restauration de la caméra après ouverture du lien partagé.
18. Cours progressif, niveau avancé, six rubriques de pathologie et progression persistante.
19. Quiz : clic sur le vrai foie, bonne réponse, indice, corrections et bilan.
20. Assistant : sélection et isolation du pancréas effectives dans le moteur 3D.
21. Téléphone 375 × 667 : apprentissage et outils, scène de hauteur positive, absence de débordement horizontal.
22. Filtres digestif et urinaire combinables ; une partie éliminée par la coupe n’est plus sélectionnable par lancer de rayon.
23. Fournisseur HTTP de contrôle : contexte serveur, filtrage des actions et identifiants invalides, erreur 503 explicite.
24. Révélation du cœur après filtrage digestif, déformation animée effective et restauration à l’arrêt.

La vérification de retour caméra utilise une tolérance numérique : l’ancienne comparaison de zéros arrondis distinguait artificiellement `-0` de `0`. Les autres assertions conservent leurs critères fonctionnels.

La version compilée a été servie avec son API sur le port 4175. Contrôle de production réussi : chargement, recherche, lien profond, muscles, thème sombre, visite mobile, conversation, sélection du cœur, démarrage/arrêt de l’animation, apprentissage avancé et adaptation au téléphone. Zéro erreur JavaScript, zéro réponse HTTP en erreur, zéro requête externe. Aucun fournisseur génératif externe n’a été testé.

Captures réelles inspectées :

- [Conversation dans la colonne de droite](tests/artifacts/platform-production-chat.png)
- [Cours avancé et cœur 3D](tests/artifacts/platform-production-learning.png)
- [Cours sur téléphone](tests/artifacts/platform-production-mobile.png)
- [Bibliothèque sur petit écran](tests/artifacts/study-mobile-learning.png)
- [Coupe anatomique](tests/artifacts/study-cut.png)

Les contenus ne constituent pas une validation clinique. Les animations sont illustratives ; les coupes ne recréent pas les tissus internes. Les tests mobiles restent des émulations, sans mesure sur téléphone physique.

## Refonte Corpus Campus — 7 septembre 2026

La suite comporte maintenant 29 scénarios. Les anciens contrôles d’apprentissage ont été adaptés au nouvel espace Cours indépendant et au quiz spatial de dix structures. Cinq nouveaux scénarios contrôlent :

- Bibliothèque de 13 cours, recherche, URL dédiée, rechargement, rappel actif et retour au vrai fémur 3D. Aucun téléchargement GLB lors de l’ouverture directe de la bibliothèque.
- QCM à réponses multiples : sélection, correction de chaque proposition, score, carnet d’erreurs puis disparition d’une erreur après réussite.
- Examen blanc : absence de correction avant la fin, cinq réponses exactes donnant 5/5 et bilan complet.
- Échéance du chronomètre : une série non répondue se termine automatiquement avec 0/5.
- Téléphone 375 × 667 : navigation, lecture, série ciblée, correction en thème sombre et absence de débordement horizontal.

La banque contient 20 QCM originaux et le quiz spatial 10 identifications. Les temps affichés pour les cours sont indicatifs ; la durée d’examen est de 75 secondes par question. Les aperçus des neuf organes sont des captures du moteur 3D, sans substitutions anatomiques.

Captures de la refonte : `campus-atlas.png`, `campus-courses.png`, `campus-reading.png`, `campus-practice.png`, `campus-question.png`, `campus-mobile-atlas.png`, `campus-mobile-courses.png` et `campus-mobile-dark-feedback.png`, dans `tests/artifacts/`. Script de capture : `tests/campus-preview.mjs`. Génération des aperçus d’organes : `tests/campus-thumbnails.mjs`.

Les limites de validation clinique, de performance mobile physique et de couverture du programme universitaire restent inchangées. Le contenu est un socle d’anatomie et de physiologie, pas une préparation exhaustive à tous les enseignements PASS/L.AS.

Validation finale de Corpus Campus : compilation TypeScript/Vite réussie ; 27 scénarios réussis dans la suite complète, puis les deux scénarios restants réussis après ajustement des assertions (attente de la caméra animée et enveloppe faciale désormais présente en vue Organes). Les 29 scénarios ont ainsi été validés. `git diff --check` sans erreur.

Le parcours navigateur sur la version compilée servie à `http://127.0.0.1:4175` confirme le chargement, la sélection du poumon, le rechargement du lien profond, les muscles, les thèmes, la visite mobile, la commande locale de sélection du cœur, l’animation et le cours séparé. Résultat : aucune erreur JavaScript, aucune réponse HTTP en échec et aucune requête externe. L’instrumentation réservée aux tests est absente du build de production.

## Bibliothèque étendue — 8 septembre 2026

Compilation TypeScript/Vite réussie. Neuf scénarios ciblés ont été validés : huit dans l’exécution principale puis le parcours de recherche / cours / atlas après adaptation de sa recherche à la bibliothèque enrichie. La recherche porte désormais aussi sur les objectifs ; « membranaires » renvoie légitimement plusieurs chapitres.

Les contrôles couvrent la banque de 68 questions (identifiants, propositions, corrections et quatre QCM par nouveau chapitre), les 25 cours, les favoris, les notes isolées par cours après rechargement, le chapitre suivant, la sélection d’un quiz par URL, le filtre de niveau, la navigation entre questions sans révéler les corrections d’examen, le score, la fin du chronomètre et le carnet d’erreurs. La lecture directe des cours et des quiz sur téléphone ne déclenche aucun chargement GLB.

Les captures de la version compilée ont été réalisées avec `tests/library-preview.mjs` à 1440 × 1000 et 393 × 852, et inspectées : bibliothèque, article, application, accueil des quiz, banque par chapitre et lecture mobile sombre. Aucune erreur JavaScript, réponse HTTP en échec ou débordement horizontal dans ce parcours. Les fichiers se trouvent dans `tests/artifacts/library-*.png`.

Les validations sont effectuées dans Chromium, avec téléphone émulé. Elles ne remplacent pas une relecture médicale ou une vérification sur appareils physiques. Le serveur de production conserve l’écoute Railway sur `0.0.0.0` et le port d’environnement.

## Approfondissements, cerveau et schémas — 8 septembre 2026

Build TypeScript/Vite réussi, avec l’avertissement existant sur les bundles de plus de 500 ko. Quatorze scénarios distincts validés dans les suites ciblées `campus`, `library`, `depth` et `diagrams`, au fil des exécutions ; la suite historique complète n’a pas été relancée pour cette extension.

Couverture : 25 cours avec 6 à 8 sections, 143 questions et leurs corrections, réponse exclusive des vrai/faux, notes et favoris, filtres et examen, 25 schémas avec sélection et explications, navigation entre cours sans duplication de schéma. Une collision de clés React entre le schéma et les notes a été corrigée puis les parcours concernés ont été rejoués avec succès.

Sur téléphone émulé à 393 × 852 : cerveau réel FMA50801 isolé, rapprochement effectif de la caméra avec le zoom, recadrage, diagrammes au clavier, thème sombre et absence de débordement horizontal. Captures inspectées : `brain-mobile-zoom.png`, `diagram-mobile-pancreas.png`, `diagram-mobile-cycle.png`. Les schémas restent des représentations fonctionnelles ; aucune validation médicale supplémentaire n’est revendiquée.

## Extension matières et références anatomiques — 9 septembre 2026

État testé : 66 cours dans 13 matières, 307 questions corrigées et 66 schémas interactifs. Les matières se parcourent séparément, avec des groupes régionaux en anatomie et un chapitre suivant limité à la discipline courante. Les nouveaux exercices de vocabulaire sont distingués des 75 vrai/faux argumentés existants.

Tests ajoutés :

- `curriculum-organization.spec.ts` : couverture et identifiants, validité des liens 3D, inventaires du carpe et du tarse, ordre des groupes, recherche dans le contenu sans accents, liens matière/région, rechargement et retour navigateur, filtrage matière/chapitre des quiz, mobile sombre sans téléchargement GLB.
- `reference-bodies.spec.ts` : 880 maillages féminins réels, unicité et empreintes des fichiers, références des assemblages, nomenclature française, sélection utérine, lien profond féminin, retour masculin, cerveau et zoom mobile, chargement différé des muscles, accès aux détails hépatiques superposés.
- `provider.spec.ts` : commandes locales dans la référence féminine et rejet des identifiants absents de la référence active.

Les contrôles existants sur les cours, favoris, notes, examen, corrections, carnet d’erreurs, schémas, couches et zoom sont conservés. Les anciens compteurs et les accès directs à une grille mélangée ont été remplacés par les attentes de la bibliothèque organisée.

Vérification de production : `npm run build` réussit. Un serveur lancé directement avec `PORT=4199 node server/index.mjs`, sans chargement de `.env`, sert la page, le manifeste féminin, le GLB d’organes, la licence et `/api/status` en HTTP 200. L’action locale « Isole les ovaires » retourne `HRA-ovaries` dans la référence féminine. Le démarrage annonce `0.0.0.0:4199`.

Captures inspectées dans le navigateur : `catalog-directory.png`, `catalog-anatomy.png`, `catalog-mobile-chemistry.png`, `reference-female-desktop.png`, `reference-female-mobile.png`, `reference-female-uterus.png`. Corrections visuelles issues de cette inspection : cartes de matières en blocs, panneau des couches sous le sélecteur, notice féminine compacte sur téléphone et surfaces hépatiques superposées masquées en vue générale.

Limites : contrôle navigateur sous Chromium avec rendu logiciel SwiftShader ; pas de mesure sur un appareil physique bas de gamme. Le bundle principal reste proche de 1 Mo avant compression (280 Ko gzip), avec un avertissement Vite sur la taille des chunks. Le contenu pédagogique est une synthèse à relire avec les supports facultaires, pas un programme PASS/L.AS certifié exhaustif. Les nouvelles modifications sont locales, sans publication Railway lors de cette extension.

Résultat consolidé : **les 46 tests passent**, exécutés en séries ciblées. Un lancement concurrent a supprimé une ressource temporaire de trace (`ENOENT`) pendant la fermeture du contexte du test d’orientation ; ce test a été rejoué seul avec succès (18,5 s). Aucune modification du comportement de la caméra n’a été nécessaire. `git diff --check` est également sans erreur.

## MyCorpus : régions féminines et fluidité

Le périmètre courant comprend 67 cours et 311 questions. `reference-bodies.spec.ts` vérifie désormais les 74 pièces régionales, les trois zooms féminins, les liens cours/quiz, le retour au corps masculin, le logo et le titre MyCorpus. `rotation.spec.ts` vérifie l’absence de raycasts de survol pendant les gestes, la résolution temporaire à 1,25 puis son retour à 2 sur écran dense, et l’absence de sélection après un aller-retour de rotation. Les contrôles n’attestent pas une fréquence d’images identique sur tous les appareils.

Validation finale avant publication : les 16 scénarios ciblés ont réussi après correction du retour de résolution ; les cinq contrôles régions féminines / rotation / zoom ont été rejoués ensemble avec succès (2,7 min). Le build final est `index-WTrqbS1m.js`. Les sources de préparation complètes du modèle féminin restent dans `.model-cache/`, hors Git et hors déploiement. Aucun complément masculin 4.3i n’est publié sans téléchargement et validation de sa géométrie.
