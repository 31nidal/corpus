# Téléchargement PDF et retrait temporaire d’Anki — 12 octobre 2026

Les exports du catalogue et des synthèses téléchargent directement un fichier `.pdf`, sans `window.print`, modification du titre de page ni dialogue d’impression. Dans Mes cours, « Télécharger le PDF original » utilise la route PDF existante, qui contrôle le propriétaire.

Le document généré est A4, paginé, avec texte sélectionnable, titres, paragraphes, listes, contenu des tableaux, sources et schémas rasterisés. L’interface interactive est exclue. Le thème du site n’affecte pas les couleurs du PDF. Une police Noto Sans sous licence OFL est embarquée pour les accents et les symboles usuels. La licence accompagne l’asset.

jsPDF est importé uniquement lorsque l’utilisateur exporte : environ 132 ko gzip dans le chunk d’export, plus les polices Noto Sans normale et grasse (environ 1,1 Mo au total), récupérées au premier export puis mises en cache en mémoire. Aucun service externe, clé ou serveur de rendu n’est nécessaire. Les modules HTML optionnels de jsPDF ne sont pas utilisés. La CSP existante est conservée.

Le bouton est désactivé pendant la préparation et une erreur annonce la possibilité de réessayer. Le téléchargement utilise un Blob local avec libération différée de l’URL.

Les commandes Anki et leur modale sont retirées des cours, de Mes cours et des statistiques Flashcards. Les fonctions CSV/API historiques restent disponibles pour compatibilité et une éventuelle réactivation ; aucune carte ni donnée FSRS n’est supprimée.

Validation locale : build, suites Study/Flashcards/catalogue, 13 parcours Playwright ciblés et parcours image-occlusion/FSRS ; téléchargement du PDF original et d’une synthèse, absence des boutons Anki desktop/mobile, lecture du texte exporté (accents, exposants, prime), présence du schéma et dimensions A4.

## Amélioration du rendu PDF

La mise en page utilise désormais des titres réellement gras, des métadonnées regroupées, des encadrés pour les objectifs et pièges, des listes et un glossaire structurés. Les titres restent avec le contenu suivant ; les légendes et schémas restent ensemble. Un plan du cours occupe la première page lorsque le schéma doit commencer sur la suivante. Les tableaux répètent leurs en-têtes après un saut de page et conservent les lignes longues.

Les schémas ont un rendu clair indépendant du thème du site, une rasterisation à résolution triple et des libellés adaptés à l’espace disponible. Les cartes de notions sont recadrées autour de leur contenu et leur hauteur est adaptée aux compositions verticales, notamment lors d’un export depuis un viewport mobile.

Vérification visuelle des PDF réellement téléchargés : cycle cardiaque, cœur et cycle cellulaire (ce dernier depuis un viewport de 390 px). Validation supplémentaire : dix tests Playwright ciblés, dont un tableau de 75 lignes avec contrôle du texte, des en-têtes répétés et des limites de page ; suites Study (56), Flashcards (109) et catalogue (6) vertes. Les quatre tests PDF ont été relancés après le dernier ajustement des schémas.

Limites : les schémas sont des images ; les cellules des tableaux sont réparties en colonnes de largeur égale. Ce PDF est une version de lecture et ne reproduit pas exactement la mise en page interactive. Safari/iPhone et lecteur d’écran non vérifiés manuellement. Aucun déploiement ni fusion effectué.
