# Références anatomiques MyCorpus

MyCorpus utilise plusieurs jeux de données anatomiques avec des couvertures et des licences différentes. Cette page décrit uniquement ce qui est effectivement distribué ou utilisé par l’application actuelle.

## Atlas masculin principal

L’atlas principal repose sur **BodyParts3D** et contient **1 663 structures maillées réelles**.

| Couche | Structures |
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

Des assemblages virtuels permettent de sélectionner certains organes entiers à partir de plusieurs maillages existants. Ils ne sont pas comptés comme de nouvelles géométries.

Les couches sont distribuées dans `public/models/` et chargées progressivement afin de limiter le coût initial côté navigateur.

### Source et licence

Source : BodyParts3D / Database Center for Life Science (DBCLS).

Les en-têtes des OBJ utilisés pour construire les GLB indiquent **CC BY-SA 2.1 Japon**. La page officielle actuelle de BodyParts3D indique par ailleurs CC BY 4.0 ; le projet conserve les notices et la provenance des fichiers effectivement téléchargés au lieu de supposer un changement rétroactif de licence.

Les informations de provenance et licences distribuées se trouvent notamment dans :

- `public/models/LICENSE.txt` ;
- `public/licenses/detailed-provenance.json` ;
- `public/licenses/provenance.json` ;
- `public/models/manifest.json`.

## Explorations féminines

L’interface actuelle ne propose pas un second corps complet. Elle fournit trois explorations féminines spécialisées :

- bassin ;
- appareil reproducteur ;
- sein.

Ces vues utilisent **74 maillages source indépendants** issus du Human Reference Atlas : 14 os, 47 organes/tissus et 13 éléments de soutien. Les fichiers distribués pour ces régions représentent environ 3,46 Mo.

Les regroupements `HRA-region-pelvis`, `HRA-region-reproductive` et `HRA-region-breast` référencent uniquement ces maillages féminins ; ils ne réutilisent pas les géométries masculines.

### Source et licence

Source : **Human Reference Atlas, United Female v1.5**, HuBMAP.

La licence du fichier source est **CC BY 4.0**. Les métadonnées et éléments de provenance sont conservés dans les fichiers distribués, notamment :

- `public/licenses/female-source-metadata.yaml` ;
- `public/licenses/female-source-crosswalk.csv` ;
- `public/licenses/female-provenance.json` ;
- `public/models/female-regions/LICENSE.txt`.

L’import HRA initial contenait davantage de maillages. Les données intermédiaires complètes servent uniquement à la préparation locale et restent dans `.model-cache/female/`, qui n’est pas versionné. Elles ne doivent pas être confondues avec les 74 maillages réellement utilisés dans l’interface actuelle.

## Nomenclature française

La nomenclature française s’appuie notamment sur TA2 via Z-Anatomy. Les maillages Z-Anatomy ne sont pas utilisés dans l’atlas ; seules des données terminologiques dérivées sont intégrées.

Les fichiers concernés conservent leur notice séparée, notamment `public/licenses/terminology-LICENSE.txt`.

## Liens et identifiants

Les identifiants anatomiques sont des contrats stables du produit :

- identifiants FMA pour l’atlas principal ;
- identifiants `HRA-...` pour les explorations féminines.

Ils sont utilisés dans la recherche, les cours et les liens profonds. Exemple :

```text
/#structure=FMA7088
/#body=female&structure=HRA-uterus
```

Un refactor ne doit pas les renommer sans migration explicite.

## Transformations

Les modèles Web sont transformés et simplifiés pour le rendu navigateur. Les scripts de préparation sont conservés dans `scripts/` afin de rendre les conversions auditables et reproductibles autant que possible.

Les transformations ne donnent pas aux modèles une valeur diagnostique. Les couleurs, matériaux, transparences et simplifications sont des choix de visualisation pédagogique.

## Limites

- les références anatomiques ne couvrent pas toutes les variations humaines ;
- certaines structures fines sont simplifiées pour le Web ;
- les explorations féminines sont régionales et non un atlas féminin complet ;
- les coupes du moteur 3D ouvrent des surfaces et ne recréent pas des tissus histologiques ou radiologiques ;
- l’outil est pédagogique et non clinique.

Avant toute redistribution des modèles ou données, vérifier les notices originales présentes dans `public/licenses/` et `public/models/`.
