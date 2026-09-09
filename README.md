# MyCorpus — Explorer le corps humain

Prototype fonctionnel dans `SAAS/medecine`, en React, TypeScript et Three.js. Interface sur fond blanc avec commandes agrandies, panneaux compacts et vues rapides Organes / Squelette / Muscles, adaptée à l’ordinateur et au téléphone. Matériaux et éclairage de studio retravaillés pour mieux distinguer les tissus. Modèles et polices hébergés localement, API de conversation légère, sans compte.

## Lancer

```sh
npm install
npm run dev
```

Ouvrir http://localhost:5173. Production complète : `npm run build`, puis `npm start` (http://localhost:8080, Node 22.9+). `npm run preview` permet également une prévisualisation avec l’API. Aucun secret requis pour le mode ressources locales ; un hébergement statique seul ne fournit pas l’assistant.

## Explorer

Glisser pour tourner, molette ou pincement pour zoomer. Survol et clic sur les vrais maillages, cadrage animé, fiches pédagogiques et sources. Recherche en français sans accents ou avec le nom anglais source ; navigation par flèches et Entrée. Index filtrable par système. Boutons Isoler, Voir le contexte, Masquer et Rétablir les structures cachées. Affichage de toutes les couches, masquage, orientation face/dos et réinitialisation.

L’atlas principal conserve les **1 663 structures masculines BodyParts3D**. Une section **Anatomie féminine** propose trois zooms spécialisés : bassin, appareil reproducteur et sein, à partir de **74 maillages féminins HRA**, sans emprunt au modèle masculin. Le sélecteur de corps féminin entier a été retiré. Les fichiers régionaux pèsent 3,46 Mo. Voir [les sources et limites](docs/reference-bodies.md).

L’atlas masculin détaillé est affiché par défaut. La vue d’ensemble conserve la sélection simplifiée de 48 structures.

| Couche détaillée | Structures |
| --- | ---: |
| Enveloppe | 1 |
| Squelette et dents | 231 |
| Organes et structures internes | 262 |
| Muscles | 398 |
| Artères | 423 |
| Veines | 225 |
| Nerfs | 34 |
| Articulations et tissus de soutien | 89 |
| **Total** | **1 663** |

17 assemblages virtuels supplémentaires permettent de sélectionner des organes entiers à partir des mêmes maillages : 1 680 entrées de recherche, sans dupliquer la géométrie. Le compteur de visibilité compte uniquement les structures réelles.

Les huit GLB détaillés représentent 50,61 Mo et 1 794 983 triangles. Le chargement initial concerne 494 structures (enveloppe, squelette, organes), soit 19,01 Mo. Les autres systèmes sont téléchargés à leur activation avec progression et gestion d’erreur. La vue d’ensemble pèse 7,66 Mo. Le rendu est actualisé quand la scène change pour limiter le travail du GPU au repos.

## Origine et licences

Vrais maillages [BodyParts3D, DBCLS](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html) : archive officielle ISA 4.0, 142 903 898 octets, 2 234 OBJ. Les fichiers sont réunis seulement lorsqu’ils portent le même concept FMA. 17 fichiers sans identification sont exclus. Cinq lobes pulmonaires réels de l’archive 3.0 complètent les ramifications 4.0. La vue d’ensemble provient de l’archive PART-OF 4.0 avec le même complément. Aucun organe n’est remplacé par une primitive géométrique.

**Les en-têtes OBJ téléchargés portent CC BY-SA 2.1 Japon.** Les GLB adaptés conservent cette licence, attribution et partage identique. La [page officielle actuelle](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html), mise à jour le 27 février 2025, indique CC BY 4.0 : les deux mentions sont documentées sans présumer d’un changement rétroactif.

BodyParts3D, © The Database Center for Life Science licensed under CC Attribution-Share Alike 2.1 Japan.

Voir [la notice des modèles](public/models/LICENSE.txt), [la provenance détaillée](public/licenses/detailed-provenance.json), [le manifeste et les empreintes GLB](public/models/manifest.json), [la provenance de la vue d’ensemble](public/licenses/provenance.json) et [les lobes pulmonaires](public/licenses/lung-surfaces-provenance.json).

La nomenclature française utilise le fichier TA2.csv de [Z-Anatomy](https://github.com/Z-Anatomy/Models-of-human-anatomy), Gauthier Kervyn et contributeurs, sous CC BY-SA 4.0. Le dictionnaire normalisé `src/data/terminology.json` et les libellés dérivés `src/data/french-labels.json` conservent cette licence séparée : [notice](public/licenses/terminology-LICENSE.txt). Aucun maillage Z-Anatomy n’est utilisé.

Les fiches françaises synthétisent des connaissances issues du NIH et d’OpenStax : [sources](public/SOURCES.md). Les fiches de nombreuses petites structures expliquent leur groupe, sans prétendre donner leur fonction particulière.

## Reconstruction des maillages

Les GLB sont inclus : Python n’est pas nécessaire pour compiler le site. Pour les reconstruire, installer `scripts/requirements-models.txt` dans un environnement virtuel. `scripts/build_anatomy.py --source /private/tmp/bodyparts3d --download` construit la vue d’ensemble ; conserver son manifeste dans `public/models/overview.json`. Exécuter ensuite `scripts/download_full_archive.py`, puis `scripts/build_detailed_atlas.py`. Les deux derniers scripts utilisent le cache `/private/tmp/bodyparts3d`. Les téléchargements officiels sont contrôlés par taille, CRC et empreintes.

Transformation commune : rotation `(x,y,z) → (x,z,−y)`, centrage et échelle uniforme (hauteur 3,6, axe vertical +Y, face +Z). Simplification des maillages, recalcul des normales, conversion GLB. Les identifiants FMA restent stables ; les assemblages locaux de la vue d’ensemble sont explicitement préfixés BP3D_.

## Vérification et limites

`npm test` lance Playwright ; `npm run build` vérifie TypeScript et produit le site. Voir [TESTS.md](TESTS.md) pour les résultats et captures.

- Corps de référence masculin adulte : pas toutes les anatomies, variantes ni détails microscopiques. Le nombre de structures décrit cet atlas, pas un dénombrement universel du corps humain.
- Tous les modèles distribués possèdent un libellé français. Les noms sources anglais restent dans les manifestes pour la traçabilité, sans être affichés dans les fiches. Les traductions descriptives composées ne sont pas une nomenclature officielle ; une révision terminologique spécialisée reste possible.
- Maillages simplifiés pour le Web ; fines structures et intersections entre versions peuvent présenter des limites. Couleurs pédagogiques, enveloppe transparente.
- Tout afficher charge environ 51 Mo de modèles et peut ralentir un téléphone peu puissant. WebGL requis ; pas de décodeur distant.
- Validation Chromium et émulation tactile ; pas de validation sur téléphone physique, Safari ou Firefox. Outil pédagogique, pas outil de diagnostic.

## Compléter les noms français

`python3 scripts/complete-french.py` compose les libellés à partir de la nomenclature et de correspondances explicites, puis échoue si un nom source reste non traduit. `node scripts/audit-french.mjs` vérifie la couverture du catalogue. Seuls les libellés nécessaires sont chargés dans le navigateur, sans le dictionnaire de travail complet.

## Présence, partage et étude

Le cadrage initial est rapproché, avec un halo et une ombre de présentation au sol. Le bouton Isoler est l’action principale de la fiche. Une explication distingue les 48 repères de la vue d’ensemble des 1 663 structures détaillées.

Chaque sélection dispose d’un lien stable, par exemple `/#structure=FMA7088` (cœur), ou `/#structure=FMA7088&mode=overview`. Ces fragments fonctionnent sur un hébergement statique sans configuration de réécriture. Le bouton Copier le lien fournit l’URL ; si le presse-papiers est indisponible, un champ sélectionnable est proposé. Rechargement et navigation précédent/suivant restaurent la sélection et activent ses couches. La copie ajoute aussi un état versionné : caméra, couches, opacités, structures masquées, isolation, coupe, repères et thème. Les URL peuvent être longues après de nombreux masquages ; elles ne contiennent ni conversation ni progression. Les animations et le parcours courant ne sont pas partagés.

Un thème sombre facultatif est mémorisé localement. Le blanc reste le choix initial. La visite guidée comporte cinq étapes avec consignes d’observation et fiches sourcées : poumon, cœur, intestin grêle, cerveau et fémur. Un quiz 3D distinct complète cette visite.

### Visage en vue Muscles

Les principaux muscles faciaux sont absents des modèles distribués. Le shader de l’enveloppe corporelle rend donc opaque sa région faciale réelle en vue musculaire, avec une transition progressive sur le cou. Aucun muscle facial n’est inventé ni ajouté au compteur. Cette présentation nécessite la couche Enveloppe ; elle disparaît lorsque celle-ci est masquée, et devient transparente pendant une sélection pour préserver l’exploration interne.


## Plateforme d’apprentissage

Navigation Atlas 3D / Cours / Entraînement / Ma progression. La conversation contextuelle accompagne l’atlas ; les cours disposent d’un espace de lecture indépendant.

- Treize fiches de cours, dont neuf sur les organes et quatre sur les fondamentaux, avec rappel actif et approfondissement. Huit fiches de pathologies en six rubriques, avec sources.
- Quiz spatial de dix structures : sélection sur les maillages ou repères, indices, réponse dévoilée et bilan. Le score récompense le premier essai sans aide. Vingt QCM théoriques complètent cet entraînement.
- Progression des cours mémorisée sur cet appareil, effaçable dans Profil. Pas de compte ni synchronisation.
- Neuf filtres de systèmes combinables, construits à partir des structures réellement présentes ; réseau lymphatique partiel et anatomie reproductrice masculine uniquement.
- Coupe mobile suivant trois axes, inversion du côté conservé et plan de repère ; opacité par couche ; étiquettes nominatives ou numérotées.
- Cinquante profils anatomiques enrichissent 80 structures musculaires et donnent des repères de réseau à 280 artères et 142 veines. Les autres structures conservent une fiche générale : leurs attaches, innervation ou territoires précis restent à documenter.
- Deux animations illustratives sur les vrais modèles : battement et respiration. Pas de simulation du débit sanguin, des valves ou de la mécanique articulaire.

L’API `/api/chat` comprend notamment « Montre-moi le pancréas », « Isole le cœur » et des questions sur les cours. **Le mode livré utilise des ressources locales, sans IA générative.** L’adaptateur de fournisseur est prêt, mais aucun fournisseur externe n’a été configuré. Voir [contrat API et extension](server/README.md).

Les coupes ouvrent les maillages de surface sans remplir les tissus internes : ce ne sont pas des coupes histologiques ou radiologiques. Le contenu médical est une introduction sourcée, pas un cursus complet ni une validation clinique. Les données et composants sont séparés pour enrichir progressivement la plateforme.

## Corpus Campus — espaces séparés

La navigation comprend **Atlas 3D**, **Cours** et **Entraînement**, utilisables sur ordinateur et téléphone. Les cours sont des pages de lecture indépendantes, avec un lien profond (`#tab=cours&cours=orientation`), recherche et filtres par matière. Une ouverture directe des cours ou de l’entraînement ne télécharge aucun GLB avant utilisation de l’atlas.

Le socle comporte 13 fiches : quatre fondamentaux (orientation, homéostasie, membrane, tissus) et neuf organes. Chaque cours présente objectifs, notions, point de vigilance, rappel actif dévoilable et source. Il est possible de marquer un cours terminé, ouvrir son modèle 3D et lancer ses QCM. Les supports de la faculté restent la référence du programme ; la biochimie complète, la biophysique, les statistiques et les autres matières du PASS/L.AS ne sont pas couvertes.

L’entraînement propose 20 QCM originaux à réponses multiples, filtrés par matière ou cours, tirés sans doublon. Sessions de 5, 10 ou 20 questions, réduites au nombre disponible dans le filtre. Mode apprentissage avec correction par proposition ; mode examen avec 75 secondes par question, navigation arrière et correction différée. Le chronomètre termine la session à échéance. Barème interne : 1 point pour une sélection entièrement correcte, sinon 0 ; aucun point négatif. Bilan détaillé, lien vers le cours et reprise des erreurs. Le carnet d’erreurs mémorise la dernière réussite ou erreur de chaque question localement (`corpus-practice-v1`). Il ne s’agit ni d’annales ni d’un barème officiel.

Le quiz spatial comprend désormais 10 structures réelles, avec indices, repères numérotés prioritaires et bilan par structure. Il reste distinct des QCM théoriques. Les vues de l’atlas bénéficient d’un environnement de studio calculé localement, de matériaux physiques, d’ombres et de couleurs cardiaques affinées. L’enveloppe réelle du visage est opaque en vue Organes ou Muscles sans sélection ; elle devient transparente pour explorer l’intérieur. Les ombres et reflets sont des choix de présentation, sans valeur diagnostique.

Organisation : `src/study/curriculum.ts`, `questions.ts`, `CoursesWorkspace.tsx`, `PracticeWorkspace.tsx` et `study.css`. Les rendus de cours sont générés depuis les GLB via `tests/campus-thumbnails.mjs`, avec attribution dans `public/course-previews/LICENSE.txt`. Aucun nouveau modèle IA ou service payant n’a été activé par cette refonte.

## Extension de la bibliothèque — septembre 2026

La version actuelle comprend **67 cours classés dans 13 matières, 67 schémas interactifs, 311 questions corrigées et 10 exercices d’identification 3D**. Les cours possèdent 6 à 8 sections, un lexique, une application corrigée, des notes personnelles et des favoris. Les quiz disposent d’une bibliothèque par chapitre, de filtres de niveau et d’une navigation numérotée en examen. Une vue dédiée au cerveau et des contrôles de zoom visibles facilitent l’exploration. Les chiffres des sections précédentes décrivent les étapes antérieures du prototype. Voir [le détail de la bibliothèque](docs/campus-library.md).
