# Reproduire les captures UX MyCorpus

Les 24 PNG de revue ont été retirés du dépôt : 2 741 173 octets (2,61 Mio), sans valeur documentaire durable indépendante du code. Le rapport, le script et la galerie restent versionnés. Les captures locales restent ignorées par Git dans `tests/artifacts/design/`.

Avec Node 22 et les dépendances installées, lancer le serveur dans un terminal :

```sh
VITE_QCM_TEST_SEED=playwright-qcm npm run dev -- --host 127.0.0.1 --port 5173
```

Dans un deuxième terminal :

```sh
node scripts/capture-design.mjs after http://127.0.0.1:5173
open docs/design-comparison.html
```

Le script produit 88 captures (11 parcours, 4 largeurs, 2 thèmes) et un JSON d’observations. Il vérifie les polices chargées, mesure le débordement horizontal, crée un compte de démonstration puis le supprime.

Pour retrouver la référence avant UX, créer un checkout séparé à `bca46e5` :

```sh
git worktree add --detach /tmp/mycorpus-ux-before bca46e5
cp scripts/capture-design.mjs /tmp/mycorpus-ux-before/scripts/capture-design.mjs
cd /tmp/mycorpus-ux-before
npm ci
VITE_QCM_TEST_SEED=playwright-qcm npm run dev -- --host 127.0.0.1 --port 5174
```

Dans un autre terminal, depuis ce checkout :

```sh
node scripts/capture-design.mjs before http://127.0.0.1:5174
```

Copier ensuite ses `before-*.png` dans le dossier `tests/artifacts/design/` du checkout courant pour comparer dans la galerie. La référence comporte 44 captures à 1440/390 px. L’ordre des propositions utilise la même graine de développement ; le tirage des questions reste aléatoire. Arrêter le serveur puis supprimer le worktree temporaire lorsqu’il n’est plus utile.
