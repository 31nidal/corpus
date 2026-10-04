# Passe graphique ciblée : Atlas et matières

Base : PR #4 synchronisée avec la performance de PR #3, commit `d91f0ab`.

## Causes et corrections

| Problème | Cause vérifiée | Correction |
| --- | --- | --- |
| Systèmes coupés | `catalog.css` imposait `top:385px` et `bottom:85px` au panneau, indépendamment de la hauteur réelle de l’introduction. Le défilement portait sur toute la card et `.layer-actions` était sticky avec un décalage négatif. | Suppression de cette contrainte ; trois zones flex : tabs, liste défilante avec `min-height:0`, footer non rétractable. Chaque ligne reste atteignable sans passer derrière les actions. |
| Composition verticale | Min-height de la page supérieur au petit viewport ; introduction, panneau, commandes et footer positionnés séparément avec plusieurs overrides de hauteur. | Page en `100dvh`, grille desktop avec introduction automatique, espace restant `minmax(0,1fr)` et footer. Espacements partagés par scène, panneaux et commandes ; liste interne scrollable, variante compacte sous 800 px. Mobile conserve son panneau dépliable avec hauteur dynamique et actions séparées. |
| Anatomie invisible | `.anatomy-subject` définissait un texte blanc et des descriptions claires pour un fond coloré ; la règle plus spécifique `.experience :is(...,.subject-card,...)` de `library.css` remplaçait ce fond par une surface claire. | Retrait de la variante de couleurs contradictoire. Toutes les cartes utilisent les mêmes tokens de texte ; h2 explicitement coloré, opacity 1 ; états hover/focus/active lisibles. |
| Select incohérent | Habillage natif, padding différent et minimum de 42 px imposé à l’input à l’intérieur d’une recherche déjà paddée. En sombre, une règle de catalogue renforçait la bordure de la recherche. | Recherche/select alignés à 48 px, mêmes tokens de surface/bordure/rayon/texte ; input transparent sans hauteur additionnelle, chevron discret ; select natif conservé avec focus visible et appearance native en couleurs forcées. |
| Grille comprimée | Deux colonnes de cards maintenues dans l’espace restant après une sidebar de 180 px ; titres longs sans retour à la ligne garanti. | `auto-fit`/`minmax` aux largeurs intermédiaires, cartes sans minimum intrinsèque excessif, titres pouvant revenir à la ligne, outils pouvant se réorganiser. |

Aucun changement de contenu médical, FSRS, SQLite, scoring, routing, logique métier ou des imports différés.

## Fichiers

- `src/App.tsx` : conteneurs de liste/footer uniquement ; callbacks inchangés.
- `src/styles.css` : hauteur dynamique, grille et scrolling Atlas, espaces partagés.
- `src/study/catalog.css` : retrait de la contrainte Atlas et de la variante Anatomie contradictoire.
- `src/study/library.css` : couleurs, contrôles et grille responsive des matières.
- `tests/graphics-layout.spec.ts` : 18 tests en clair/sombre ; limites et accès par scroll de chaque système, actions et footer sans chevauchement, réduction du viewport de 100 px ; cartes, contraste des titres >= 4,5:1 et opacity 1 dans quatre états, largeur des cartes et contrôles, focus et fonctionnement natif du filtre.
- `tests/flashcards.spec.ts` : attente ciblée du premier rendu de révision 3D portée à 15 s, comme le contrôle de disponibilité suivant ; toutes les assertions conservées.
- `scripts/capture-graphics.mjs` : captures reproductibles, chargement 3D/polices et thème explicitement stabilisés.
- `docs/graphics-corrections.md` : causes, corrections, captures et résultats de validation.

## Captures et inspection

Les pièces accessibles pour cette demande contenaient uniquement le texte, aucune capture jointe. L’état du dépôt avant correction a été capturé pour reproduire les défauts, puis comparé aux nouvelles images.

Les séries utilisent le mode Atlas détaillé (1 663 structures). Les 10 captures après correction ont été inspectées individuellement : Atlas Systèmes à 1440×900 et 1366×768 ; matières à 1440×900, 1024×768 et 390×844 ; clair et sombre. Le titre Anatomie apparaît avec la même hiérarchie que les autres matières ; recherche et filtre sont alignés ; le panneau affiche davantage de systèmes avec un footer séparé. Quand la liste dépasse, les lignes restantes sont atteignables par défilement interne.

Images locales non versionnées dans `tests/artifacts/design/graphics/` (10 avant, 10 après). Reproduction avec Node 22, serveur local sur 5173 :

```sh
VITE_QCM_TEST_SEED=playwright-qcm npm run dev -- --host 127.0.0.1 --port 5173
# Dans un autre terminal :
node scripts/capture-graphics.mjs after
```

La phase `before` est à exécuter sur une révision antérieure, pas sur le code corrigé. Les images sont destinées à la revue et restent exclues du dépôt.

## Validation

Build réussi et huit suites backend réussies : 137 tests backend. Suite E2E complète sur l’état final : **145 tests réussis sans retry en 22,8 minutes**, dont les 18 nouveaux tests graphiques. Commande : `CI=1 npm test -- --retries=0`. Le scénario de révision Atlas 3D a également réussi trois exécutions ciblées sans retry.

Une première exécution avait révélé une attente de 5 secondes insuffisante pour le premier rendu de révision 3D ; la trace était compatible avec une initialisation WebGL logicielle lente. Seule cette attente du test a été portée à 15 secondes, comme le contrôle de disponibilité suivant, sans retirer d’assertion ni modifier la logique produit.

Aucun problème restant constaté sur les captures inspectées dans le périmètre demandé. Les variations de hauteur sont simulées par redimensionnement Playwright ; la barre de navigateur d’un appareil mobile physique n’a pas été vérifiée.
