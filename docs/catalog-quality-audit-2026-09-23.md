# Audit qualité du catalogue canonique — 23 septembre 2026

## Portée

Audit de lancement sur un échantillon de 30 cours couvrant les 18 matières du catalogue. La vérification combine les invariants automatisés du dépôt (présence du cours, objectifs, sections, sources, QCM) et une lecture manuelle ciblée du contenu, des sources et des formulations de QCM.

Cet audit n'est pas une validation médicale professionnelle des 305 cours. Il sert à détecter les défauts systématiques de génération et les risques produit avant bêta.

## Échantillon

- Anatomie : `anat-wrist-carpal-tunnel`, `anat-brachial-plexus`, `anat-portal-vein-system`
- Physiologie : `phys-cardiovascular-hemodynamics-regulation`, `phys-respiratory-regulation`
- Chimie : `chem-thermodynamics`, `chem-acid-base-equilibria`
- Pharmacologie : `pharma-absorption-distribution`, `pharma-clinical-trials-phases`
- Biostatistiques : `stats-hypothesis-testing-framework`, `stats-roc-curves-performance`
- Santé, Société, Humanité : `ssh-patient-rights-consent-kouchner`, `ssh-ethics-end-of-life-palliative`
- Recherche biomédicale : `research-clinical-trial-design`, `research-critical-reading-diagnostic-study`
- Santé publique : `public-health-indicators`, `public-health-surveillance-alerts`
- Biologie cellulaire : `cell-membrane-trafficking`, `cell-endocytosis-exocytosis`
- Biochimie : `biochem-krebs-cycle`, `biochem-hemoglobin-myoglobin-oxygen`
- Génétique & Biologie moléculaire : `genetics-mutations-nomenclature`
- Embryologie & Reproduction : `embryo-teratogenesis-critical-windows`
- Histologie : `histo-vascular-wall`
- Biophysique : `physics-osmosis-colligative-starling`, `physics-mri-ultrasound-principles`
- Immunologie : `immuno-hypersensitivity-autoimmunity`
- Médicament & Société : `soc-drug-pricing-reimbursement`
- Odontologie : `odonto-saliva-caries-pathophysiology`
- Anglais médical : `english-reading-clinical-trials`

## Constats

### Structure pédagogique

Les cours examinés suivent globalement le standard de première année prévu par le dépôt : objectifs explicites, sections substantielles, piège, rappel actif, réponse et source. Les chapitres quantitatifs inspectés distinguent correctement formule, hypothèses et interprétation au lieu de présenter uniquement un calcul.

Les exemples lus sont généralement au bon niveau PASS/L.AS : ils expliquent le mécanisme avant de demander la restitution et signalent régulièrement les limites d'un modèle ou d'une interprétation.

### Exactitude et prudence

Aucune contradiction scientifique critique évidente n'a été repérée dans les passages inspectés. Les cours sensibles utilisent souvent des formulations prudentes : distinction association/causalité, limites de modèles, variabilité anatomique, droit susceptible d'évoluer et séparation entre contenu pédagogique et décision clinique.

Les chapitres SHS/droit examinés s'appuient sur Legifrance ou la HAS et signalent que le cadre juridique évolue. Les chapitres de pharmacologie/recherche utilisent notamment NCBI, EMA ou EQUATOR.

### Sources à rendre plus spécifiques

Quatre références de l'échantillon méritent une amélioration avant une revue éditoriale approfondie :

1. `anat-wrist-carpal-tunnel` pointe vers une page OpenStax générale sur les os du membre supérieur, peu spécifique au tunnel carpien et au nerf médian.
2. `phys-respiratory-regulation` pointe vers une page consacrée au transport des gaz, alors que le chapitre traite surtout du contrôle ventilatoire.
3. `public-health-indicators` utilise une actualité Santé publique France sur le fardeau environnemental comme source principale d'un cours général sur les indicateurs.
4. `public-health-surveillance-alerts` utilise la page d'accueil de Santé publique France ; une page institutionnelle dédiée à la surveillance/veille serait préférable.

Ces liens ne rendent pas les chapitres inutilisables, mais ils affaiblissent la traçabilité précise des affirmations.

### QCM

Le contenu des questions inspectées est globalement cohérent avec les cours, mais deux défauts systémiques ont été détectés :

- de nombreux lots générés stockent la bonne proposition en première position (`correct: [0]`) ;
- plusieurs banques utilisent des explications génériques répétées pour les distracteurs, par exemple une même phrase pour plusieurs mauvaises propositions.

Le premier point est un risque direct d'apprentissage par position plutôt que par compréhension. Il est corrigé dans la branche de cet audit en mélangeant les propositions au démarrage de chaque session tout en remappant les indices corrects et les explications, sans modifier les IDs des questions.

Le second point reste un chantier éditorial : les distracteurs les plus importants devraient recevoir une justification spécifique lorsque le mécanisme d'erreur est différent.

## Recherche étudiant

Avant cet audit, la recherche reposait surtout sur une sous-chaîne du texte complet. Elle ne tenait pas explicitement compte des anciens IDs, des UE, des intitulés Toulouse ou d'abréviations courantes.

La branche de cet audit ajoute :

- recherche multi-mots indépendante de l'ordre exact ;
- ID canonique et anciens IDs ;
- module canonique ;
- UE et intitulé universitaire Toulouse ;
- alias de matières : `biocell`, `physio`, `pharma`, `ICM`, `stats`, `SHS`, `LCA`, etc. ;
- quelques synonymes ciblés comme `cardio`, `pneumo` et `spirométrie`.

Des tests couvrent notamment :
- `organelles biocell membrane`
- `UE3 pression débit résistance`
- `LCA diagnostic`
- `ICM absorption`
- `UE13 abstract`

## Priorités de suivi

1. Remplacer les quatre sources trop générales identifiées ci-dessus par des références directement pertinentes.
2. Enrichir progressivement les explications de distracteurs génériques dans les QCM générés.
3. Faire relire en priorité les chapitres juridiques, pharmacologiques et cliniquement sensibles par une personne compétente avant de les présenter comme relus professionnellement.
4. Exploiter en bêta les recherches sans résultat pour enrichir les alias à partir du vocabulaire réel des étudiants.
