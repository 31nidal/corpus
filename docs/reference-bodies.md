# Atlas principal et explorations féminines MyCorpus

La présentation actuelle utilise le corps masculin comme atlas principal (1 663 structures). La section féminine est limitée à trois explorations : bassin, appareil reproducteur et sein. Elle charge 74 maillages source indépendants (14 os, 47 organes/tissus, 13 éléments de soutien), pour 3,46 Mo. Les 880 maillages de l’import HRA initial sont conservés localement dans `.model-cache/female/` comme source de préparation, mais ne sont plus proposés comme corps féminin entier ni comptés dans l’interface courante.

Les regroupements `HRA-region-pelvis`, `HRA-region-reproductive` et `HRA-region-breast` référencent les pièces existantes. Aucun maillage masculin n’entre dans ces regroupements. `scripts/build_female_regions.py` génère le sous-ensemble à partir des GLB HRA déjà importés ; `scripts/female-region-members.json` fixe l’appartenance des pièces.

La recherche de compléments masculins 4.3i est documentée dans `public/licenses/male-extension-audit.json`. L’inventaire fournit des candidats, mais `download.cgi` redirige vers l’accueil sans délivrer d’OBJ. Les candidats ne sont donc pas intégrés et ne gonflent pas le compteur.

## Archive de provenance de l’import initial

# Références anatomiques disponibles

Corpus propose deux jeux de données réels, avec des couvertures différentes. Le total de **2 543 structures maillées** additionne **1 663 structures masculines BodyParts3D** et **880 structures féminines Human Reference Atlas**. Ce nombre ne désigne ni 2 543 structures par corps, ni 2 543 concepts anatomiques différents : un même organe peut être représenté dans les deux références. Les assemblages virtuels ne sont pas comptés comme de nouvelles géométries.

| Couche | Homme | Femme |
| --- | ---: | ---: |
| Enveloppe | 1 | 1 |
| Squelette et dents | 231 | 91 |
| Organes et tissus internes | 262 | 631 |
| Muscles | 398 | 16 |
| Artères | 423 | 48 |
| Veines | 225 | 56 |
| Nerfs | 34 | 2 |
| Articulations et soutien | 89 | 35 |
| Total réel | 1 663 | 880 |

Les 17 assemblages masculins et 10 assemblages féminins facilitent la sélection d’organes entiers. Ils référencent les maillages existants. Les compteurs de visibilité excluent ces assemblages.

## Référence féminine

Source : [Human Reference Atlas, United Female v1.5](https://doi.org/10.48539/HBM352.BTSQ.586), Kristen Browne et Heidi Schlehlein, HuBMAP. Modèle composite, principalement issu de Visible Human Female (US National Library of Medicine), complété par les références indiquées dans le crosswalk HRA. Le squelette, les muscles et les nerfs sont partiels. Ce jeu n’est pas un modèle exhaustif de toutes les variations anatomiques féminines.

Licence exacte du fichier source : **CC BY 4.0**, d’après les métadonnées officielles de cette version, conservées dans `public/licenses/female-source-metadata.yaml`. Le crosswalk et les crédits des composants sont conservés dans `female-source-crosswalk.csv`. La provenance, le SHA-256 de l’original et les transformations sont détaillés dans `female-provenance.json`. Les crédits distribués avec les GLB sont dans `public/models/female-regions/LICENSE.txt`.

L’original contient 888 maillages. Les huit éléments d’un placenta de référence séparé sont exclus : l’atlas affiché ne représente pas une grossesse. Les 880 autres sont conservés avec leur identité source. Le bassin reproducteur propose notamment des assemblages sélectionnables pour l’utérus, les ovaires et les trompes ; les cours correspondants possèdent leurs propres explications.

Les huit GLB optimisés totalisent 30,15 Mo (base décimale). Le chargement initial enveloppe/squelette/organes représente 22,24 Mo. Les autres couches se chargent à leur activation. Les surfaces d’empreintes et subdivisions hépatiques superposées restent accessibles par recherche et sélection directe, mais sont masquées en vue générale pour éviter le scintillement entre surfaces coplanaires.

Import reproductible : `scripts/import_female_atlas.py` (Python, numpy, trimesh, fast-simplification ; scipy pour les normales), puis `scripts/label_female_atlas.py`. Le premier accepte le chemin du GLB source en argument ; consulter son en-tête avant exécution. Les noms français sont dans `src/data/female-labels.json` ; les identifiants `HRA-…` reprennent les noms des nœuds source.

## Interaction et limites

- Homme/Femme change réellement les fichiers chargés, les résultats de recherche, les compteurs et la sélection.
- Les liens partagés conservent la référence : `/#body=female&structure=HRA-uterus`.
- Les cours ouvrent un repère 3D réellement disponible, en choisissant la référence correspondante.
- Les commandes de l’assistant sont validées contre la référence active. Les fiches locales restent limitées aux contenus documentés ; aucun fournisseur IA payant n’est requis.
- La visite guidée historique et le quiz d’identification 3D utilisent la référence masculine et la rétablissent explicitement. Les quiz de cours couvrent les deux appareils reproducteurs.
- L’archive officielle BodyParts3D PART-OF 4.0 à 99 % a été vérifiée : ses concepts nommés sont déjà présents. Aucun doublon n’a été ajouté pour augmenter artificiellement le compteur.

La référence masculine conserve sa licence propre CC BY-SA 2.1 Japon, attestée par les en-têtes des OBJ téléchargés. La nouvelle référence féminine n’en change pas les conditions.
