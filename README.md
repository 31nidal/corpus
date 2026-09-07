# Corpus — Explorer le corps humain

Prototype fonctionnel dans `SAAS/medecine`, en React, TypeScript et Three.js. Interface sur fond blanc avec commandes agrandies, panneaux compacts et vues rapides Organes / Squelette / Muscles, adaptée à l’ordinateur et au téléphone. Matériaux et éclairage de studio retravaillés pour mieux distinguer les tissus. Modèles et polices hébergés localement, sans backend ni compte.

## Lancer

```sh
npm install
npm run dev
```

Ouvrir http://localhost:5173. Production : `npm run build`, puis `npm run preview` (http://localhost:4173). Le dossier `dist/` peut être servi par un hébergement statique. Aucun secret requis.

## Explorer

Glisser pour tourner, molette ou pincement pour zoomer. Survol et clic sur les vrais maillages, cadrage animé, fiches pédagogiques et sources. Recherche en français sans accents ou avec le nom anglais source ; navigation par flèches et Entrée. Index filtrable par système. Boutons Isoler, Voir le contexte, Masquer et Rétablir les structures cachées. Affichage de toutes les couches, masquage, orientation face/dos et réinitialisation.

L’atlas détaillé est affiché par défaut. La vue d’ensemble conserve la sélection simplifiée de 48 structures.

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
