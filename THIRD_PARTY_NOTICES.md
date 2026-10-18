# Third-party notices

MyCorpus distribue ou dérive certaines données et ressources provenant de projets tiers. Ces éléments conservent leurs licences et obligations propres ; ils ne doivent pas être assimilés au code applicatif du projet.

## Modèles anatomiques BodyParts3D

Source : Database Center for Life Science (DBCLS), BodyParts3D.

Les notices et éléments de provenance utilisés par le projet sont conservés dans :

- `public/models/LICENSE.txt` ;
- `public/licenses/detailed-provenance.json` ;
- `public/licenses/provenance.json` ;
- `public/licenses/bodyparts3d-*.txt`.

## Human Reference Atlas

Les explorations féminines régionales sont dérivées de Human Reference Atlas / HuBMAP, United Female v1.5.

Les métadonnées, crédits et provenance sont conservés dans :

- `public/licenses/female-source-metadata.yaml` ;
- `public/licenses/female-source-crosswalk.csv` ;
- `public/licenses/female-provenance.json` ;
- `public/models/female-regions/LICENSE.txt`.

## Terminologie

Une partie de la nomenclature française est dérivée de données TA2 via Z-Anatomy. Les maillages Z-Anatomy ne sont pas distribués comme modèles de l’atlas.

Voir :

- `public/licenses/terminology-LICENSE.txt`.

## Polices

Les polices distribuées par les dépendances `@fontsource-variable/dm-sans` et `@fontsource-variable/manrope` sont couvertes par l’OFL. Les copies de notices utilisées par le projet se trouvent dans :

- `public/licenses/font-dm-sans-OFL.txt` ;
- `public/licenses/font-manrope-OFL.txt`.

## Sources pédagogiques

Les sources utilisées pour les synthèses pédagogiques sont recensées dans `public/SOURCES.md` et dans les cours concernés.

## Vérification avant redistribution

Toute redistribution des modèles, données de nomenclature ou autres ressources tierces doit respecter les fichiers de licence et de provenance d’origine. Pour la description technique des références anatomiques utilisées par l’application, voir `docs/reference-bodies.md`.

## Navigation anatomique PART-OF

`public/models/anatomical-relations.json` importe un sous-ensemble des identifiants,
noms et relations publiés dans `public/licenses/partof_inclusion_relation_list.txt`
(BodyParts3D / DBCLS). Les noms des structures livrées proviennent également du
manifeste BodyParts3D existant. L’empreinte SHA-256 de la table et la révision du
manifeste sont conservées dans le fichier généré. Attribution et conditions des
sources : `public/models/LICENSE.txt` ; traduction française Z-Anatomy déjà
attribuée dans `public/licenses/terminology-LICENSE.txt`. Aucune nouvelle
ressource géométrique Z-Anatomy n’est redistribuée par cet import de relations.


### HRA Visible Human Female — optional detailed subset

`public/models/female-detailed/` is an adapted, lossless subset of HRA United Female v1.5, restricted to source nodes explicitly named VH_F. Authors: Kristen Browne and Heidi Schlehlein, HuBMAP (2023). Source DOI: https://doi.org/10.48539/HBM352.BTSQ.586. License: Creative Commons Attribution 4.0 International (CC BY 4.0). Allen and Yao source components are excluded. Source identifiers, geometry and coordinate transforms are retained; resource collections and binary packaging were adapted for MyCorpus3D. See the included LICENSE.txt and `public/licenses/female-detailed-provenance.json` for attribution, source digest, input digests and changes.
