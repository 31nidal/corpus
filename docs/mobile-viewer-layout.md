# Atlas : séparation des commandes sur mobile

## Causes

La toolbar `.viewer-bottom` est positionnée indépendamment du footer `.bottombar`, du chat, des couches et des raccourcis régionaux. Leurs différents offsets depuis le bas ne réservent aucune place dans le contenu. En outre, `.discovery-secondary` est masqué sous 1100 px : le CTA « Parcourir toutes les structures » disparaissait en mobile.

## Correction

Les règles sont limitées à l’Atlas principal et au breakpoint mobile ≤700 px. La scène, les régions/CTA, le chat, les couches et le footer utilisent un flux grid. La scène peut rétrécir ; un viewport court permet de défiler verticalement jusqu’au footer et à la réserve du dock. Les panneaux de détail conservent leur disposition existante.

La toolbar reste fixe et accessible, au-dessus de la navigation mobile. Sa hauteur partagée est 54 px : boutons de 44 px + padding vertical de 8 px + bordures de 2 px. Le `padding-bottom` et le `scroll-padding-bottom` du contenu réservent cette hauteur plus les deux espacements de 8 px. La navigation occupe 62 px ; son positionnement et celui du dock partagent la même réserve, augmentée de `env(safe-area-inset-bottom)`. `viewport-fit=cover` active cette prise en compte sur iPhone.

Le footer conserve sa hauteur intrinsèque et peut revenir à la ligne. Le CTA redevient visible avec les tokens turquoise existants. À 320 px, seul le pictogramme redondant du bouton Face/Dos est masqué ; tous les boutons restent présents. Le panneau déplié des couches s’ancre au-dessus de son propre bouton plutôt qu’à un offset indépendant du viewport.

Aucun callback, code du viewer, routing, donnée ou règle métier n’est modifié.

## Validation

`tests/mobile-viewer-layout.spec.ts` couvre 320 / 375 / 390 / 430 px en clair et sombre, aux hauteurs 844 et 668 px, avec insets de 0 et 34 px. Il vérifie l’accès par défilement au CTA et au footer, leur ordre et leur séparation avec le dock/navigation, la zone tactile des commandes, les limites horizontales de la scène et l’ouverture du catalogue par le CTA.

Captures avant/après locales, exclues du dépôt : `tests/artifacts/design/mobile-toolbar/`. La safe area est simulée dans Chromium ; aucun iPhone physique n’a été utilisé.

Résultats : build réussi, huit nouveaux tests réussis sans retry (1,5 minute), trois scénarios mobiles existants réussis sans retry (53,3 secondes : couches clair/sombre et exploration féminine). Les huit captures finales ont été inspectées visuellement.
