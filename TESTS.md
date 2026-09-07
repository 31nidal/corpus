# Vérification — interface moderne et libellés français

Vérification du 7 septembre 2026, Chromium 153 avec WebGL/SwiftShader. Ordinateur 1440 × 900 et émulation tactile 393 × 852.

## Résultats

- `npm run build` réussi : TypeScript et génération de `dist/`.
- Les neuf scénarios d’exploration ont réussi après la refonte des commandes, des matériaux et des libellés. Les deux contrôles supplémentaires ont également réussi : couverture française et vues rapides, avec un petit écran de 375 × 667. Bilan : 11 scénarios validés.
- Contrôle de production réussi : chargement initial et sélection du poumon droit composé de vrais maillages ; zéro erreur JavaScript, zéro réponse HTTP en erreur, zéro requête externe. Instrumentation de test absente de la production.

## Couverture

1. Intégrité des huit GLB : signature, tailles, SHA-256, 1 663 nœuds uniques, correspondance des assemblages et exclusion des fichiers non identifiés.
2. Fond blanc, 494 structures initiales, muscles téléchargés seulement à leur activation.
3. Survol et clic par lancer de rayon sur le vrai fémur, fiche, mouvement de caméra et réinitialisation.
4. Recherche française sans accent, sélection clavier d’un muscle détaillé, isolation, masquage, restauration et absence de résultat.
5. Tous les systèmes chargés, 1 663 structures visibles, sélection et isolation du cœur composé, masquage global.
6. Index filtré sur les nerfs et retour à la vue d’ensemble de 48 structures.
7. Mobile : absence de débordement horizontal, pincement à deux doigts, activation des artères et isolation tactile du fémur.
8. Zoom, orientation face/dos, crédits et fermeture au clavier.
9. Téléchargement des muscles interrompu volontairement : erreur explicite, squelette déjà chargé conservé.

10. Couverture des libellés français de chaque structure de l’atlas et de la vue d’ensemble, sans résidus anglais usuels.
11. Vues rapides Muscles / Squelette / Organes, compte des structures visibles, recherche française et fiche sur écran de 375 × 667.

## Captures du navigateur

- [Nouvelle interface](tests/artifacts/modern-desktop.png)
- [Petit écran](tests/artifacts/modern-small.png)
- [Fiche sur petit écran](tests/artifacts/modern-small-detail.png)
- [Production sur fond blanc](tests/artifacts/white-production.png)
- [Poumon sélectionné en production](tests/artifacts/white-production-lung.png)
- [Muscles activés](tests/artifacts/white-muscles.png)
- [Muscle isolé](tests/artifacts/white-isolated.png)
- [Téléphone](tests/artifacts/white-mobile.png)
- [Fiche et isolation sur téléphone](tests/artifacts/white-mobile-detail.png)

Les vues ordinateur, mobile et poumon sélectionné ont été inspectées visuellement. Il s’agit de captures réelles, pas d’illustrations de maquette.

## Reproduire

```sh
npm install
npx playwright install chromium --only-shell
npm test
npm run build
```

Les tests démarrent Vite automatiquement. Pour la production, lancer `npm run preview -- --host 127.0.0.1 --port 4173`, puis `node tests/production-smoke.mjs`. Ce dernier bloque toute requête externe.

Dans cette session, Chromium a été installé dans `/private/tmp/corpus-browsers` et les commandes de test utilisent `PLAYWRIGHT_BROWSERS_PATH=/private/tmp/corpus-browsers`. Un navigateur existant peut aussi être indiqué avec `PLAYWRIGHT_CHROMIUM_EXECUTABLE`.

## Limites

Pas de test sur téléphone physique, Safari ou Firefox. SwiftShader ne mesure pas les performances d’un GPU mobile. Les assertions accordent jusqu’à 90 secondes au chargement : ce délai n’est pas une promesse de performance. Le chargement de toutes les couches représente 50,61 Mo. Les avertissements Vite concernant des modules supérieurs à 500 Ko ne bloquent pas la compilation. Pas de validation clinique ; certaines fiches restent génériques ; les noms distribués sont traduits en français.
