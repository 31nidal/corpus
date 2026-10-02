# MyCorpus — cohérence visuelle

## Audit préalable

Base : `e9a7b78`, CI verte. Les huit feuilles demandées et `src/App.tsx`
ont été examinées avant modification. Trente-deux captures initiales couvrent
Atlas 3D, cours, Flashcards, cerveau, cœur, Mes cours, decks et révision
à 1440 et 390 px, en clair et sombre.

Les divergences principales étaient :

- teal, bleu Campus et bleu ciel Atlas/Mes cours définis séparément ;
- fonds sombres verts, bleus et ardoise concurrents ;
- rayons simples de 4 à 32 px sans échelle commune ;
- ombres très différentes entre decks, fiches et panneaux ;
- titres Flashcards jusqu’à 72 px, titres de cours à 43 px ;
- polices système encore déclarées dans l’Atlas spécialisé ;
- boutons, formulaires et focus définis indépendamment ;
- plusieurs surcharges responsive ou dark masquant la palette voulue.

## Règles communes

Tokens dans `src/styles.css`, sans nouvelle dépendance :

| Famille | Règle |
| --- | --- |
| Police de titres | Manrope Variable |
| Police d’interface et lecture | DM Sans Variable |
| Surfaces | `--mc-bg`, `--mc-surface`, `--mc-surface-soft` |
| Texte | `--mc-text`, `--mc-text-secondary`, `--mc-text-tertiary` |
| Marque | `--mc-brand`, `--mc-brand-hover`, `--mc-brand-soft`, `--mc-on-brand` |
| États | success, warning, error et leurs surfaces atténuées |
| Accents anatomiques | clinical et neuro, réservés aux repères secondaires |
| Rayons | xs 6, sm 10, md 14, lg 18, xl 24 px ; ronds et capsules conservés |
| Ombres | sm pour cartes ; md pour panneaux/modalités |
| Espacements | 4, 8, 12, 16, 24, 32, 48 px |
| Typographie | display 30–44, page 26–36, section 20–24, carte 18, corps 15, small 13, caption 12, eyebrow 10 px |

Le teal clair est légèrement assombri à `#08777b` : son contraste sur
`--mc-brand-soft` atteint **4,74:1**. Le thème sombre remplace les mêmes tokens,
avec fond `#101b1d`, surface `#172629` et texte `#e3efed`.
Les anciens noms de variables restent des alias pour les composants existants.

## Application par étapes

A. Tokens globaux et alias compatibles.
B. Header, état actif, boutons, saisies et focus visibles.
C. Chrome 3D : surfaces discrètes, régions, fiches et commandes ; scène inchangée.
D. Cours : titres modérés, lecture à environ 70 caractères, encarts, cartes et navigation.
E. Flashcards : hero réduit, révision et decks davantage présents, carte centrale lisible.
F. Atlas spécialisés : typographie et palette communes, accents Cœur/Cerveau discrets.
G. Responsive et thème sombre : ligne de navigation dédiée jusqu’à 1180 px,
   modes spécialisés séparés sur tablette, hero Flashcards empilé sur mobile,
   espaces suffisants entre modes et vues, réduction des animations respectée.

Les changements de production concernent exclusivement le CSS. Aucun composant
React, contenu médical, route, API, modèle de données, calendrier FSRS ou logique
Three.js n’est modifié.

## Vérification

Chaque étape a fait l’objet d’un build réussi. Tests ciblés :

- A : thème sombre Atlas, 1 test réussi ;
- B/C : régions et parcours à 1440/900/390 px, 4 tests réussis ;
- D : campus et supports pédagogiques, 11 tests réussis ;
- E : création, génération et révision des flashcards, 1 test réussi ;
- F : vues Cœur/Cerveau et thème sombre, 3 tests réussis ;
- G : 8 tests de design, quatre largeurs et deux thèmes, première relance réussie.

Le test de thème existant conserve ses vérifications précises de couleurs,
adaptées à la nouvelle palette. Aucun parcours utile n’est retiré.
Le nouveau test contrôle les contrastes des tokens, les zones de clic de la
navigation, les panneaux dans l’écran, les modes spécialisés et reduced-motion.

Les captures comparatives sont conservées dans `tests/artifacts/design/`
(dossier ignoré par Git). Elles couvrent 1440, 1024, 768 et 390 px, en clair
et sombre, avec cartes de test supprimées après la capture.
La galerie `docs/design-comparison.html` permet de comparer avant/après.

La relance ciblée finale regroupe **20 tests réussis** (Atlas et design),
sans retry. **64 captures finales** couvrent les quatre largeurs et les deux
thèmes ; aucun débordement horizontal du document n’est détecté.

Pour refaire les captures : démarrer le serveur local, puis exécuter
`node scripts/capture-design.mjs after`. Le mode `before` accepte en troisième
argument l’URL d’une copie locale de la version initiale.
La galerie est dans `docs/design-comparison.html`.

Validation complète sous Node 22.23.3 :

| Commande | Résultat |
| --- | --- |
| `npm ci` | Réussite |
| `npm run build` | Réussite |
| `test:accounts`, `test:study`, `test:taxonomy` | Réussite |
| `test:catalog-content`, `test:course-quality-sample` | Réussite |
| `test:feedback`, `test:security`, `test:flashcards` | Réussite |
| `CI=1 npm test -- --shard=1/3` | 39 réussites, aucun retry |
| `CI=1 npm test -- --shard=2/3` | 38 réussites, aucun retry |
| `CI=1 npm test -- --shard=3/3` | 38 réussites, aucun retry |

Total : **137 tests backend et 115 tests E2E**, sans échec ni retry.
Les trois shards complets ont été exécutés après les dernières modifications.
Les journaux locaux sont dans `/private/tmp/corpus-design/`.
Le résultat GitHub est associé au commit publié ; il est vérifié séparément
après cette validation locale.

## Limites

Les couleurs scientifiques des schémas, les codes anatomiques et les modèles
restent intacts. Les surfaces communes sont harmonisées ; certains styles
historiques de diagrammes, d’impression ou de composants secondaires restent
locaux. Le contraste des tokens est contrôlé automatiquement ; cela ne constitue
pas un audit exhaustif de chaque combinaison dans les schémas médicaux.
Les avertissements Vite sur la taille des bundles sont inchangés.
