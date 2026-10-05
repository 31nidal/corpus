# Atlas : toolbar desktop rattachée au viewer

La toolbar de droite `.viewer-bottom` était une sœur de `.stage`, ancrée par des offsets à l’ensemble `.atlas-workspace`. Elle semblait appartenir au panneau latéral et au footer plutôt qu’au viewer.

Le même bloc JSX est maintenant placé dans `.stage`, sans modification de ses callbacks. Au-dessus de 700 px, son positionnement absolu utilise le conteneur 3D comme référence et le token partagé `--atlas-gap` pour ses retraits droit/bas : 16 px, ou 8 px sur les fenêtres de hauteur ≤800 px. Le dock mobile reste fixe avec sa réserve et sa safe area ; ses sélecteurs sont adaptés au nouvel emplacement du nœud.

Au-dessus de 1100 px, le panneau « Une région à la fois » abandonne son offset bas et prend la hauteur de son contenu (`height:max-content`), avec padding de 16 px. Sa hauteur maximale reste bornée par l’espace disponible ; sur une fenêtre courte, le défilement interne permet d’atteindre toutes les actions sans chevaucher le footer.

Fichiers : `src/App.tsx`, `src/atlas/atlas.css`, `tests/mobile-viewer-layout.spec.ts`, `tests/desktop-viewer-layout.spec.ts` et ce rapport. Aucun changement de logique métier ou du moteur 3D.

Les tests desktop couvrent 1280, 1440, 1600 et 1920 px, en clair/sombre, aux hauteurs 768, 900 et 1080 px : référence de positionnement, retraits dans le viewer, absence de chevauchement avec panneau/footer, accès aux boutons, rotation Face/Dos, reset et réglages. Les huit scénarios mobiles existants sont également rejoués.

Les captures finales sont locales et exclues du dépôt dans `tests/artifacts/design/desktop-toolbar/`.

Validation finale : build réussi, 12 tests Playwright réussis sans retry (quatre desktop et huit mobile). Les huit captures desktop clair/sombre et la capture mobile de contrôle ont été inspectées. Le bloc JSX de la toolbar, ses boutons et ses callbacks sont identiques à ceux de la révision précédente ; seul son emplacement change.
