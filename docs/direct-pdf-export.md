# Téléchargement PDF et retrait temporaire d’Anki — 12 octobre 2026

Les exports du catalogue et des synthèses téléchargent directement un fichier `.pdf`, sans `window.print`, modification du titre de page ni dialogue d’impression. Dans Mes cours, « Télécharger le PDF original » utilise la route PDF existante, qui contrôle le propriétaire.

Le document généré est A4, paginé, avec texte sélectionnable, titres, paragraphes, listes, contenu des tableaux, sources et schémas rasterisés. L’interface interactive est exclue. Le thème du site n’affecte pas les couleurs du PDF. Une police Noto Sans sous licence OFL est embarquée pour les accents et les symboles usuels. La licence accompagne l’asset.

jsPDF est importé uniquement lorsque l’utilisateur exporte : environ 129 ko gzip dans le chunk d’export, plus la police TTF de 555 ko, récupérée au premier export. Aucun service externe, clé ou serveur de rendu n’est nécessaire. Les modules HTML optionnels de jsPDF ne sont pas utilisés. La CSP existante est conservée.

Le bouton est désactivé pendant la préparation et une erreur annonce la possibilité de réessayer. Le téléchargement utilise un Blob local avec libération différée de l’URL.

Les commandes Anki et leur modale sont retirées des cours, de Mes cours et des statistiques Flashcards. Les fonctions CSV/API historiques restent disponibles pour compatibilité et une éventuelle réactivation ; aucune carte ni donnée FSRS n’est supprimée.

Validation locale : build, suites Study/Flashcards/catalogue, 13 parcours Playwright ciblés et parcours image-occlusion/FSRS ; téléchargement du PDF original et d’une synthèse, absence des boutons Anki desktop/mobile, lecture du texte exporté (accents, exposants, prime), présence du schéma et dimensions A4.

Limites : les schémas sont des images ; les cellules des tableaux sont réparties en colonnes de largeur égale. Ce PDF est une version de lecture et ne reproduit pas exactement la mise en page interactive. Safari/iPhone et lecteur d’écran non vérifiés manuellement. Aucun déploiement ni fusion effectué.
