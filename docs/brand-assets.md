# Marque MyCorpus3D

Le symbole principal reprend le logo fourni (cerveau argenté, anneaux orbitaux et trois sphères), détouré avec un vrai canal alpha. Aucun fond blanc, médaillon CSS, étirement ou filtre de recoloration n'est appliqué.

## Assets et dimensions

| Fichier | Dimensions | Usage |
| --- | --- | --- |
| `public/brand/mycorpus3d-master.png` | 512 × 512 | Référence transparente pour les exports futurs |
| `public/mycorpus-logo.webp` | 256 × 256 | Logo web, compression WebP sans perte, 54 602 octets |
| `public/favicon-32.png` | 32 × 32 | Favicon PNG |
| `public/favicon-64.png` | 64 × 64 | Favicon PNG haute densité |
| `public/favicon.ico` | 16, 32 et 48 × 48 | Compatibilité des navigateurs et recherche automatique de favicon |

Le logo est affiché à 48 × 48 px dans l'en-tête desktop, 38 × 38 px sous 701 px, 64 × 64 px dans le chargement et 40 × 40 px sur la page de confidentialité. `object-fit:contain` et des dimensions carrées préservent les proportions. Le texte de marque et le nom accessible deviennent MyCorpus3D ; le reste de la direction artistique est conservé.

Le projet n'utilise actuellement ni manifest PWA, ni service worker, ni plugin PWA. Aucun manifest ou jeu d'icônes PWA inutile n'a été ajouté. Les manifests de `public/models/` décrivent les modèles anatomiques et restent inchangés.

## Préparation du logo

Le détourage utilise l'outil intégré imagegen, avec le logo fourni comme cible d'édition. Consigne : retirer uniquement le fond blanc, y compris les espaces entre les anneaux et le cerveau ; conserver l'identité, l'orientation, le rendu argenté, les trois anneaux et sphères, les proportions, les reflets et la lumière centrale ; produire un vrai canal alpha et retirer l'ombre portée extérieure ; ne pas ajouter de texte, de médaillon ni de fond.

Le détourage a été inspecté avant export. Les exports de tailles inférieures sont redimensionnés proportionnellement ; le WebP conserve sans perte les pixels de l'export 256 px. Les anciens PNG opaques ont été supprimés.

## Vérification

Captures locales dans `tests/artifacts/design/transparent-logo/`, exclues du dépôt : clair/sombre à 1440, 1024, 768, 390 et 320 px, plus confidentialité mobile. Vérifications navigateur : logo chargé, dimensions carrées, fond CSS transparent, absence de collision avec le bouton de thème, absence de débordement horizontal, trois favicons servis correctement. Aucun code métier, base de données, QCM, flashcards ou composant Atlas n'est modifié.

Build réussi ; les dix tests responsive existants des matières réussissent sans retry (28,4 secondes). Les captures desktop, tablette et mobile ont été inspectées visuellement. Le test existant de présence du lien de marque est adapté au nouveau nom accessible ; ses assertions fonctionnelles restent inchangées.
