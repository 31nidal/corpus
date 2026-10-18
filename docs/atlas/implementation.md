# Atlas : fondations, navigation et révision 3D

## Fonctionnement livré

- L’onglet **Arbre** des couches expose les ressources réellement présentes, leurs ensembles et leurs composants. Recherche par nom, identifiant et numéro de vertèbre ; sélection synchronisée avec le modèle et la fiche. Les systèmes anatomiques restent des filtres séparés des couches techniques.
- Chaque fiche propose les parents et enfants PART-OF importés, et séparément les composants de son assemblage 3D. Un concept non modélisé se consulte dans la navigation documentaire sans changer frauduleusement la sélection 3D. Les relations de la référence masculine ne sont jamais appliquées au féminin.
- L’opacité individuelle agit sur les vrais matériaux Three.js, y compris un ensemble multi-maillages. Les opacités d’ensembles constituent un plafond pour leurs composants ; l’opacité de couche reste multiplicative. « Restaurer la scène précédente » rétablit sélection, caméra, visibilité, masquage, isolation, opacités, labels et plan de coupe.
- Les outils proposent six orientations. Le plan de coupe est explicitement géométrique : aucune fermeture de surface ni reconstitution de tissus n’est revendiquée.
- « Réviser ces structures en 3D » lance une session de dix cibles maximum dans les composants de l’ensemble, le plus petit ensemble contenant la structure, ou son système disponible. Modes : réponse libre, QCM, clic, association d’un nom au repère surligné et examen. Le chronomètre d’examen est facultatif. Les réponses acceptent noms français et source, identifiants et numéros vertébraux. Le nom de la sélection n’est pas exposé par l’assistant pendant l’exercice. Le mode clic conserve l’ensemble étudié et permet de masquer temporairement les maillages qui cachent une structure profonde ; les surfaces seulement révélées à la sélection sont exclues de ses cibles. Aucune tolérance clinique ou synonymie non documentée n’est inventée.
- Les résultats présentent les erreurs, leur reprise et un historique des cent dernières sessions. Le stockage invité est local ; les comptes utilisent leur stockage existant et sa synchronisation SQLite. Les tentatives sont fusionnées par identifiant pour préserver celles d’un autre appareil.
- Les flashcards 3D et les liens partagés conservent les opacités individuelles. Le serveur vérifie les structures contre le bon manifeste et respecte les anciennes scènes qui n’ont pas ce champ. Le système FSRS existant n’est pas modifié.

## Organisation des données

`src/atlas/anatomicalGraph.ts` définit structure, référence, relation, système, région, ressource et correspondance versionnée. Les maillages d’un assemblage sont répartis entre leurs ressources réelles, et non attribués artificiellement au seul groupe de l’organe. `null` signifie information inconnue, les relations absentes restent absentes ; un nom traduit ne prouve ni une équivalence TA2 ni une validation scientifique. Les champs médicaux de ce nouveau catalogue ne sont pas remplis à partir des règles lexicales des anciennes fiches.

`public/models/anatomical-relations.json` contient 1 238 relations publiées et 384 concepts ancêtres supplémentaires, uniquement parce qu’ils relient des structures livrées. Il ne contient aucune subdivision inventée. Le fichier porte l’empreinte du TSV d’origine et la révision du manifeste utilisé ; une révision différente n’hérite pas silencieusement de ces relations.

Les correspondances continuent de provenir des manifestes versionnés existants. Les trois références historiques conservent leurs identifiants et révisions. Une quatrième référence féminine optionnelle possède sa propre révision et son propre modèle de flashcard. Les données anatomiques de référence restent des fichiers contrôlables dans Git ; les tentatives personnelles utilisent les comptes existants plutôt qu’un deuxième stockage de répétition espacée.

## Pipeline et contrôles

```sh
npm run import:anatomy-relations
npm run audit:anatomy
npm run test:anatomy
node --experimental-strip-types --experimental-loader=./scripts/ts-loader.mjs scripts/report-anatomy-coverage.mjs
npm run build
npm run test:accounts
npm run test:flashcards
npm run test:security
npx playwright test tests/atlas-refonte.spec.ts tests/atlas-brain-heart.spec.ts
```

L’import utilise exclusivement les relations exactes du TSV local. Les tests détectent cycles, identifiants dupliqués, relations orphelines et incompatibilités de révision. L’audit ouvre les GLB 2, lit leurs vrais nœuds porteurs de maillages et vérifie groupes, noms, tailles, SHA-256, preuves de provenance et notices. Une révision nouvelle ou une licence non approuvée échoue : ajouter une ressource nécessite d’abord sa vérification, puis une approbation explicite dans le registre de l’audit. Ce registre n’est pas un avis juridique automatisé.

`coverage.json` est un inventaire reproductible des ressources actuelles, ventilé selon les prédicats de navigation. Les catégories peuvent se chevaucher ; les chiffres ne mesurent pas une exhaustivité anatomique ni une validation scientifique. Il montre notamment la couverture très partielle des glandes, sens et lymphatiques et la différence de couverture entre références corporelles.

## Critères d’acceptation et suites nécessaires

| Critère demandé | État de ce lot |
| --- | --- |
| Maillages existants sélectionnables | Contrôle physique des mappings + sélection du moteur conservée ; navigation depuis les ensembles ajoutée. |
| Navigation organe → composants | Disponible pour les composants présents ; navigation PART-OF en parallèle. |
| Vertèbres numérotées | 24 vertèbres présacrales identifiées par leurs noms sources, C1/atlas et C2/axis compris. Pas de sous-maillages de pédicules/lames créés. |
| Cœur approfondi | 40 composants source accessibles ; nomenclature et contenu détaillé restent à relire individuellement. |
| Estomac approfondi | **Non satisfait géométriquement** : toujours un maillage global. Pas d’antre/pylore/fundus sélectionnable inventé. |
| Tous les systèmes détaillés | Les contrôles et exercices couvrent tous les maillages livrés ; ressources endocrines, sensorielles, lymphatiques, nerveuses et féminines encore partielles. |
| Traçabilité et validation | Relations sources et versions explicites ; champs inconnus conservés ; relecture scientifique individuelle encore nécessaire. |
| Apprentissages | Identification, QCM, clic, association et examen ; reconstruction omise faute d’ordre anatomique validé. Pas de nouvel ordonnanceur FSRS. |
| Modèles supplémentaires vérifiés | 591 maillages VH_F intégrés dans une référence optionnelle distincte, à partir du cache HRA contrôlé. Import global Z-Anatomy écarté à cause des mentions NC de certains composants. |
| Performances et mobile | Chargement différé et nettoyage existants conservés ; les nouveaux GLB féminins ne sont demandés qu’après choix de la référence détaillée ; tests navigateur dédiés. Avertissement historique sur les gros bundles restant. |

La segmentation de l’estomac, les comparaisons morphologiques de vertèbres, les attaches musculaires géométriques, la dissection par déplacement, les relations vasculaires/nerveuses transversales, les vues internes supplémentaires et le crosswalk TA2 sont des travaux suivants. Ils nécessitent des ressources ou métadonnées contrôlées, parfois une validation humaine. Ce lot ne doit pas être présenté comme la refonte scientifique complète de tous les systèmes.

## Vérifications du premier lot

- `npm run build` : réussi ; avertissement de taille des bundles déjà présent.
- `npm run audit:anatomy` : trois manifestes et leurs GLB cohérents.
- `npm run test:anatomy` : 14 tests réussis.
- `node --test tests/accounts.test.mjs tests/flashcard-atlas-3d.test.mjs` : 20 tests réussis, dont synchronisation multi-appareils et nouvelles opacités.
- `npm run test:flashcards` : 110 tests réussis.
- `npm run test:security` : réussi.

Les résultats navigateur finaux sont consignés à la fin de ce document après
leur exécution. Le premier passage de diagnostic a révélé un sélecteur de test
qui attendait « Cœur » alors que le dictionnaire livré contient « Coeur » ; il
a été corrigé. Un passage intermédiaire a été interrompu pendant les modifications
pour éviter de valider une session réinitialisée par le rechargement de Vite.


## Référence féminine détaillée optionnelle

Le sélecteur « Référence anatomique féminine » conserve par défaut les régions historiques (74 maillages, `female_detail`, `hra-female-v1`). Le choix « Atlas détaillé » utilise `female_extended`, `hra-vhf-detail-v1`, dans `public/models/female-detailed/` : 605 entrées dont 591 maillages réels, répartis en huit fichiers GLB totalisant 25 655 684 octets. Les fichiers régionaux existants restent inchangés. Les liens portent `body=female&femaleModel=detail` ; les flashcards enregistrent le modèle et sa révision séparément.

L’extracteur `scripts/build-female-detailed.mjs` utilise le cache local HRA United Female v1.5, dont les empreintes et la provenance CC BY 4.0 sont vérifiées. Seuls les nœuds explicitement nommés `VH_F_` sont retenus. Les composants Allen et Yao sont exclus. Les attributs, indices et transformations des ressources extraites sont copiés sans modification. Les tests vérifient aussi les coordonnées et la topologie des 74 maillages régionaux conservés ; leurs normales avaient été recalculées par l’ancien exporteur et ne sont pas déclarées identiques à celles du cache.

Le cœur féminin comporte 14 composants réels. Deux collections de ressources rénales regroupent cortex, colonnes, pyramides, papilles, pelvis, capsule, hile et vaisseaux associés selon leurs noms sources et côtés explicites. Ces collections restent à relire ; elles ne constituent pas des relations PART-OF publiées. La référence ne contient aucun sous-maillage supplémentaire du fundus, de l’antre ou du pylore. Elle reste partielle, notamment pour les muscles, les nerfs et le squelette.

Les questions de clic excluent les noms affichés ambigus dans leur périmètre : deux papilles portant le même nom ne donnent pas lieu à une pénalisation arbitraire. Les identifiants sources longs sont préservés dans les scènes et la progression. Sur mobile, les fiches et le panneau de révision peuvent être repliés pour libérer la scène ; le panneau de révision est ancré au même espace de travail que la fiche afin de rester au-dessus de la navigation.

La régénération exige le cache source local, non versionné : `npm run import:female-detailed`. Les tests de la distribution livrée n’en dépendent pas. Les preuves de provenance sont dans `public/licenses/female-detailed-provenance.json`, la notice dans `public/models/female-detailed/LICENSE.txt`.

## Vérifications complémentaires

Avant l’intégration de la référence détaillée : 38 tests navigateur réussis sur les parcours de refonte, d’exploration, d’apprentissage et de références corporelles. Les suites étude (68 tests), taxonomie (11 tests) et flashcards (110 tests) ont également réussi. La campagne suivante inclut spécifiquement les nouveaux modèles et la correction mobile ; ses résultats sont ajoutés après exécution.


### Contrôles après extension HRA

- Audit des quatre manifestes : aucune erreur (48, 1 663, 74 et 591 maillages respectivement).
- Compilation de production : réussie ; avertissement historique de taille des bundles conservé.
- Tests anatomiques : 22 réussis, dont données réelles, conservation des maillages régionaux, correspondances, ambiguïtés des questions de clic et identifiants longs.
- Comptes et flashcards 3D : 22 réussis. Suite flashcards complète : 112 réussis.
- Campagne navigateur de 19 tests : réussie, couvrant les exercices, les six orientations, le partage, la nouvelle référence et la correction du panneau mobile.

Une vérification visuelle complémentaire a renforcé les assertions mobiles : le statut de chargement ne suffit pas à prouver que le premier rendu WebGL est déjà composé. Les tests attendent désormais des pixels correspondant aux surfaces anatomiques dans une capture réelle. Ils ne se contentent pas de compter les objets en mémoire. La création de flashcards depuis l’atlas a également révélé une dépendance aux styles du module Flashcards chargé à la demande : la fenêtre importe maintenant elle-même sa feuille de styles.

Dernière campagne après correction de la fenêtre de flashcards : **7 tests navigateur réussis** (référence détaillée, partage/rechargement, composants du cœur féminin, capture de flashcard avec le bon modèle et la bonne révision, rendu mobile vérifié sur les pixels et trois parcours historiques régionaux). Les 19 tests précédents restent consignés séparément ; ces campagnes se recouvrent et ne sont pas additionnées comme des cas uniques. La compilation finale réussit et `git diff --check` ne signale aucune erreur.
