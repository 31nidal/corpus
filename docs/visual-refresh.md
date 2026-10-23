# Bleu nuit : couche visuelle et stabilité des dimensions

La palette sombre est définie dans `src/visual-refresh.css`. Les tailles, espacements, polices, hauteurs de boutons et règles responsive restent définis dans les styles des espaces d’origine. La refonte ne doit pas ajouter de padding, min-height, police plus grasse ou bordure supplémentaire qui déplacerait le contenu. Les nouvelles couleurs, bordures colorées et ombres utilisent les dimensions existantes ; les encadrements décoratifs emploient des ombres internes et pseudo-éléments.

Les circuits du fond sont un SVG original intégré en CSS, répété à faible opacité. Aucun téléchargement externe ni script de motif. Les illustrations et pseudo-éléments décoratifs ne reçoivent pas de clic et n’ajoutent pas de contenu accessible ou de statistiques fictives. Le dessin du cœur est décoratif et disparaît aux largeurs réduites.

La préférence de thème clair explicitement enregistrée reste disponible ; le bleu nuit est le choix par défaut en l’absence de préférence.

## Vérification locale

Comparaison des rectangles des principaux éléments avant/après retrait de la couche visuelle dans le navigateur, en conservant les feuilles de styles de référence antérieures à la refonte. Le dessin purement décoratif ajouté au DOM est exclu de la référence. Cela vérifie les effets de cette couche sur la géométrie réelle, sans comparer les couleurs ou exiger des images identiques.

Espaces : Aujourd’hui, Mes cours, Flashcards, Cours, Entraînement et Atlas. Largeurs : 320, 375, 768 et 1440 px. Les mesures portent sur les en-têtes, titres, onglets, cartes, navigation, recherche et panneaux de l’atlas visibles selon l’espace. Tolérance : 1 px. Contrôle supplémentaire de l’absence de défilement horizontal et du chargement 3D.

Ce contrôle ne constitue pas une garantie sur tous les contenus possibles, dialogues ou longueurs de texte. Les styles de placement de référence sont conservés pour réduire ces risques. La recette utilise une base de prévisualisation séparée, aucun compte ni secret de production et aucun appel Google réel.

Aucune fusion ni publication sur le site de production.

Résultat final : 24 comparaisons réussies, aucun écart supérieur à 1 px sur les éléments mesurés, aucun débordement horizontal aux quatre largeurs. Compilation et contrôle du diff réussis. Les captures et le rapport détaillé restent dans le dossier temporaire local, sans données personnelles.
