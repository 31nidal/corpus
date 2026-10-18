# Audit de refonte — 17 octobre 2026

## État constaté avant modification

React 19, TypeScript, Vite, Three.js direct (sans React Three Fiber). `App.tsx` orchestre routes par fragment, modèles, sélection, visibilité et apprentissage. `AnatomyViewer.tsx` charge les GLB par couche avec GLTFLoader, raycasting, cadrage, isolation, transparence de groupe, masquage, labels, clipping et libération des ressources. `ExplorerTools.tsx` expose les outils. Les atlas cœur/cerveau dans `src/atlas` sont des **planches SVG**, pas des modèles 3D internes supplémentaires.

| Ressource | Entrées (assemblages inclus) | Taille GLB |
| --- | ---: | ---: |
| Vue masculine simplifiée | 48 | 7 661 908 octets |
| Référence masculine détaillée | 1 680 | 50 613 100 octets |
| Référence féminine régionale HRA | 80 | 3 462 576 octets |

Les groupes détaillés couvrent peau, squelette, organes, muscles, artères, veines, nerfs et articulations. Ce ne sont pas huit systèmes anatomiques exhaustifs. Les manifestes conservent FMA/HRA, noms de maillages, versions et empreintes. Un assemblage virtuel référence plusieurs maillages sans les dupliquer. Les fichiers `public/licenses/partof_*` contiennent de vraies relations FMA encore inexploitées par la navigation.

`src/data/terminology.json` et les dictionnaires français sont une nomenclature dérivée de Z-Anatomy ; **aucun crosswalk TA2 identifiable ni identifiant latin normatif n'a été constaté**. Ne pas baptiser ces IDs TA2. Les fiches actuelles utilisent des règles lexicales et des profils : une description générique n'est pas une validation scientifique individuelle de chaque branche. Les champs manquants doivent rester inconnus.

## Pilotes et limites géométriques

- Cœur FMA7088 : assemblage de 40 maillages. Cavités, parois, muscles papillaires et valves existent séparément ; la disponibilité de chaque subdivision doit se vérifier dans le manifeste et le GLB. La hiérarchie PART-OF source est partielle ; ne pas compléter ses relations par intuition.
- Estomac FMA7148 : un seul maillage. Aucun maillage séparé de cardia, fundus, antre ou pylore constaté. Une coupe graphique ne crée pas ces structures. Leur géométrie détaillée reste à acquérir et à valider.
- Colonne FMA13478 : assemblage de 47 maillages ; vertèbres et disques sont identifiés dans le détail. C1/atlas et C2/axis ne doivent pas être perdus par une recherche limitée au mot « vertebra ».
- Féminin : 80 entrées dont assemblages régionaux, couverture distincte. Ne jamais appliquer le graphe FMA masculin aux maillages HRA en supposant une équivalence.

## Conserver / corriger / étendre

Conserver les modèles, IDs, licences, moteur, chargement différé, route, comptes et SQLite, cours, QCM, flashcards et FSRS. Le registre serveur `server/flashcards/atlasRegistry.mjs` versionne déjà les modèles et les scènes enregistrées. Réutiliser les flashcards 3D existantes plutôt que créer un ordonnanceur concurrent.

Corriger l'absence de navigation depuis un assemblage vers ses composants et vers les parents, l'absence d'opacité individuelle et de restauration de la scène avant isolation. Distinguer **composition de la ressource 3D** et **relation anatomique PART-OF**. Ne pas déduire cette dernière d'un chevauchement de maillages.

Étendre par un catalogue typé indépendant du nom GLB, avec informations inconnues explicites, relations sourcées, correspondances versionnées et pipeline vérifiant les fichiers réels. Les subdivisions documentées sans maillage ne doivent pas devenir des cibles de quiz 3D.

## Sources étudiées (consultation du 17 octobre 2026)

| Source | Formats / précision | Droits et décision |
| --- | --- | --- |
| [BodyParts3D / DBCLS](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html) | OBJ, concepts FMA, arbres IS-A/PART-OF ; version 4.0 et complément pulmonaire 3.0 déjà convertis en GLB. Taille locale mesurée ci-dessus ; résolution source et réduction documentées par le pipeline existant. | [Page actuelle](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html) : CC BY 4.0 depuis 2025 ; en-têtes téléchargés : CC BY-SA 2.1 JP. Conserver l'attribution DBCLS et le partage des adaptations selon la licence des fichiers, comme le fait déjà le dépôt. Pas de changement rétroactif supposé. |
| [Z-Anatomy, dépôt officiel](https://github.com/Z-Anatomy/Models-of-human-anatomy) | Projet Blender masculin, nomenclature et maillages dérivés ; import et alignement nécessaires avant GLB. Taille et granularité d'une archive précise non mesurées ici. | Le README officiel indique CC BY-SA 4.0 et cite aussi des modèles de rein sous CC BY-NC 4.0 et d’oreille interne sous CC BY-NC-SA 4.0. **Import global écarté pour une plateforme commerciale** : vérifier séparément les composants et leurs adaptations. Aucune nouvelle ressource intégrée dans ce lot. |
| [Open Anatomy](https://www.openanatomy.org/faq.html) | Atlas régionaux, géométrie, images et annotations, source versionnée ; ne constitue pas un corps universel prêt à importer. | [SPL/NAC Brain Atlas](https://www.openanatomy.org/atlas-pages/atlas-spl-nac-brain.html) : plus de 300 structures, IRM et segmentation, hiérarchie RadLex, licence 3D Slicer section B explicitement indiquée ; archive et droits détaillés à contrôler avant conversion. Les autres atlas exigent leur propre vérification. Aucun import effectué. |
| HRA féminin local | GLB, provenance et crosswalk dans `public/licenses/female-*` ; organes régionaux et squelette partiel. | Conserver les attributions et conditions par ressource déjà consignées dans `public/models/female-regions/LICENSE.txt`. |

Les licences CC citées autorisent l'usage commercial sous leurs conditions ; cela ne vaut pas validation juridique globale de la plateforme. Les nouvelles sources restent candidates tant que l'archive exacte, ses droits, son poids, ses identifiants et sa géométrie n'ont pas été contrôlés.

## Validation existante et critères restants

Playwright couvre sélection, profondeur, zoom, rotation, atlas spécialisés, corps de référence et flashcards. Tests Node couvrent comptes, sécurité, cours et répétition espacée. L'ancien bilan `docs/atlas-stabilization.md` est historique ; il ne prouve pas l'état de cette refonte.

La refonte complète exige encore des ressources d'estomac segmentées, une couverture de chaque système évaluée individuellement, un crosswalk TA2 contrôlé et une validation scientifique humaine. Aucune expansion de catalogue ni étiquette ne résout ces absences géométriques.

## Point de vigilance sur les contenus pédagogiques déjà référencés

La [page OpenStax consultée](https://openstax.org/books/anatomy-and-physiology-2e/pages/23-4-the-stomach)
affiche au 17 octobre 2026 des conditions CC BY-NC-SA et des restrictions de
réutilisation commerciale. Aucun nouveau texte, image ou exercice de ce livre
n’a été intégré dans ce lot. Les liens bibliographiques déjà présents dans
l’application ne constituent pas une preuve de droits de réutilisation de ses
contenus ; la provenance et la version des contenus historiques doivent être
contrôlées avant toute importation supplémentaire.


## Extension réalisée après l’audit initial

Le cache HRA local, déjà importé avec sa provenance, a permis d’extraire exclusivement les 591 nœuds féminins VH_F en une référence optionnelle distincte. Voir `implementation.md` pour le pipeline, les contrôles, les compatibilités et les limites. L’inventaire initial ci-dessus décrit l’état précédant la refonte ; `coverage.json` ajoute désormais une colonne `femaleDetailed`, sans modifier les comptes de la sélection régionale historique. Aucun modèle Allen/Yao ni modèle tiers supplémentaire n’a été assimilé à cette référence.
