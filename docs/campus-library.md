# Bibliothèque et entraînement — septembre 2026

MyCorpus contient **98 cours, 569 sections, 98 schémas interactifs et 435 questions corrigées** : 68 QCM, 75 vrai/faux argumentés et 292 questions de vocabulaire contextualisées. Chaque cours comprend 4 à 8 sections, un lexique et au moins quatre exercices. Les 10 identifications du quiz 3D constituent un entraînement distinct.

La bibliothèque commence par **13 matières séparées** : anatomie, biologie cellulaire, histologie, embryologie, génétique, chimie, biochimie, physiologie, immunologie, biophysique, biostatistiques, pharmacologie et santé publique. Chaque matière est organisée en régions ou thèmes, puis en chapitres. La navigation au chapitre suivant reste dans la même discipline. La recherche parcourt aussi les sections et lexiques, sans imposer les accents.

L’anatomie comprend les principaux os par région : crâne et face, rachis, thorax, ceinture scapulaire, humérus, radius/ulna, carpe/main, bassin, fémur, patella, tibia/fibula et tarse/pied. Les autres chapitres développent articulations, groupes musculaires, cou, médiastin, péritoine, voies urinaires, appareils reproducteurs féminin et masculin, moelle, nerfs crâniens, œil, oreille et réseau lymphatique. Plusieurs os voisins sont étudiés dans un même chapitre.

Ce socle couvre les fondamentaux attendus en première année dans treize matières, sans constituer une couverture certifiée de tous les programmes PASS/L.AS ni une banque d’annales officielles. Les nouvelles questions de vocabulaire complètent les exercices de raisonnement existants ; elles ne remplacent pas les problèmes et annales propres à chaque faculté. Les durées de lecture et d’exercice sont indicatives.

## Pages de cours

- Sommaire, objectifs, sections, mécanismes séquencés quand ils sont pertinents, lexique, application corrigée et rappel actif.
- Un schéma interactif par cours : éléments sélectionnables au clic ou au clavier, explication détaillée, flèches et disposition adaptée au téléphone. Les cours initiaux présentent des mécanismes ; les nouveaux proposent surtout des cartes de comparaison des notions, identifiées comme telles. Ce ne sont pas des planches anatomiques à l’échelle.
- Trois sections approfondies supplémentaires pour les 25 cours initiaux, avec mécanismes, exemples et points de vigilance.
- Sources accessibles au bas du cours : OpenStax, Organisation mondiale de la Santé, Haute Autorité de santé, ANSM et Société française de pharmacologie et de thérapeutique selon la matière.
- Notes personnelles séparées par chapitre, favoris, filtres des cours enregistrés ou non terminés, navigation au chapitre suivant.
- URL du cours : `/#tab=cours&cours=organelles`. Les chapitres concernés ouvrent un modèle existant dans l’atlas.
- Le pourcentage de défilement est une aide à la lecture, pas une mesure d’acquisition. Le cours est marqué terminé explicitement.

## Pages de quiz

- Bibliothèque des séries par chapitre, recherche, compteurs de questions travaillées et réussies au dernier essai.
- Choix du chapitre, de la matière, du niveau « connaissances essentielles » ou « application et raisonnement ».
- Séries de 5, 10, 20 ou 40 questions, limitées à la taille réelle du filtre, sans doublons.
- Apprentissage avec correction immédiate, examen chronométré avec navigation numérotée et corrections différées, bilan et carnet d’erreurs.
- URL ciblée : `/#tab=entrainement&cours=hemodynamics`. Une session et ses réponses en cours ne sont pas conservées après rechargement.

## Stockage

En mode invité, la progression, les réponses, les favoris et les notes restent dans le stockage du navigateur. Un compte MyCorpus facultatif les synchronise dans la base SQLite du serveur et restaure l’historique sur un autre appareil. L’inscription classique et la connexion Google sont prises en charge lorsque les variables OAuth sont configurées. Les notes sont limitées à 8 000 caractères par cours ; l’utilisateur peut exporter ou supprimer ses données depuis son espace personnel.

## Organisation

- `src/study/chapters.ts` : nouveaux cours et liens de référence.
- `src/study/courseApplications.ts` : lexiques et applications des 13 cours initiaux.
- `src/study/chapterQuestions.ts` : 48 QCM supplémentaires, avec corrections par proposition.
- `src/study/deepCourses.ts` : approfondissements des 25 cours.
- `src/study/reasoningQuestions.ts` : 75 vrai/faux argumentés, à réponse unique.
- `src/study/diagrams.ts`, `CourseDiagram.tsx`, `diagrams.css` : données et rendu des 98 schémas interactifs.
- `src/study/curriculum.ts` et `questions.ts` : catalogues unifiés, identifiants stables.
- `CoursesWorkspace.tsx`, `PracticeWorkspace.tsx`, `library.css` : lecture, navigation et présentation.

Les textes, exercices et schémas fonctionnels sont des synthèses françaises rédigées pour Corpus. Les aperçus anatomiques continuent d’utiliser les modèles existants et leurs crédits. La vue « Cerveau » isole le véritable assemblage FMA50801 ; les contrôles visibles permettent de zoomer et de recadrer la structure, y compris sur téléphone. Une relecture pédagogique spécialisée reste nécessaire avant de présenter la banque comme validée par une faculté.

## Fichiers ajoutés pour cette extension

- `subjects.ts`, `CourseLibrary.tsx`, `catalog.css` : classement matière/région, sommaires, recherche et présentation mobile. Exemple : `/#tab=cours&matiere=anatomie&module=Membre+supérieur`.
- `skeletalCourses.ts`, `regionalCourses.ts` : ostéologie et articulations.
- `systemCourses.ts`, `regionalSystems.ts`, `reproductiveCourses.ts` : anatomie régionale, muscles, système nerveux et appareils reproducteurs.
- `scienceCourses.ts` : enseignements fondamentaux complémentaires.
- `firstYearExpansion.ts` : 31 chapitres approfondis d’histologie, embryologie, génétique, chimie, biochimie, physiologie, immunologie, biophysique, biostatistiques, pharmacologie et santé publique.
- `courseSupport.ts` : cartes de notions et questions à correction individuelle associées aux nouveaux lexiques.
- [Les deux références 3D et leurs limites](reference-bodies.md).

## Explorations féminines spécialisées

Depuis l’atlas principal, « Anatomie féminine » ouvre Bassin, Appareil reproducteur ou Sein. Chaque région dispose d’un zoom initial, d’une sélection des pièces et de raccourcis vers son cours et son quiz. Le bassin et l’appareil reproducteur partagent le chapitre `anat-female-pelvis`. Le sein dispose du nouveau chapitre `anat-breast`, de six sections, d’un schéma de fonctionnement et de quatre exercices. Sur téléphone, le compositeur de l’assistant est masqué dans ces explorations pour conserver les commandes de région accessibles ; il reste disponible dans l’atlas principal et sur ordinateur.
