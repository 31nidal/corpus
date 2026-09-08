# Bibliothèque et entraînement — septembre 2026

Corpus contient désormais **25 cours, 25 schémas interactifs et 143 questions** (68 QCM et 75 vrai/faux argumentés). Chaque cours comprend 6 à 8 sections et au moins quatre questions associées ; chacun des 12 nouveaux chapitres possède sept questions. Les 10 identifications du quiz 3D restent un entraînement distinct.

Les nouveaux chapitres couvrent les organites, l’expression des gènes, le cycle cellulaire, le signal neuronal, la contraction musculaire, le sang, l’hémodynamique, la ventilation, les compartiments hydriques, l’endocrinologie, l’immunité et le métabolisme. Ce sont des introductions structurées avec exercices, et non une couverture exhaustive du programme PASS/L.AS ni des annales officielles. Les durées incluent la lecture et les exercices ; elles sont indicatives.

## Pages de cours

- Sommaire, objectifs, sections, mécanismes séquencés quand ils sont pertinents, lexique, application corrigée et rappel actif.
- Un schéma explicatif par cours : éléments sélectionnables au clic ou au clavier, explication détaillée, flèches et disposition adaptée au téléphone. Ces schémas représentent les mécanismes, pas une anatomie à l’échelle.
- Trois sections approfondies supplémentaires par cours, avec mécanismes, exemples et points de vigilance.
- Sources accessibles au bas du cours ; les cours nouveaux affichent plusieurs sections de référence d’OpenStax Anatomy and Physiology 2e.
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

Tout reste local à l’appareil : `corpus-completed`, `corpus-practice-v1`, `corpus-saved-courses` et `corpus-note-<identifiant>`. Aucun compte, aucune synchronisation et aucun service payant supplémentaire ne sont nécessaires. Les notes sont limitées à 8 000 caractères par cours et un message signale un échec d’écriture.

## Organisation

- `src/study/chapters.ts` : nouveaux cours et liens de référence.
- `src/study/courseApplications.ts` : lexiques et applications des 13 cours initiaux.
- `src/study/chapterQuestions.ts` : 48 QCM supplémentaires, avec corrections par proposition.
- `src/study/deepCourses.ts` : approfondissements des 25 cours.
- `src/study/reasoningQuestions.ts` : 75 vrai/faux argumentés, à réponse unique.
- `src/study/diagrams.ts`, `CourseDiagram.tsx`, `diagrams.css` : données et rendu des 25 schémas interactifs.
- `src/study/curriculum.ts` et `questions.ts` : catalogues unifiés, identifiants stables.
- `CoursesWorkspace.tsx`, `PracticeWorkspace.tsx`, `library.css` : lecture, navigation et présentation.

Les textes, exercices et schémas fonctionnels sont des synthèses françaises rédigées pour Corpus. Les aperçus anatomiques continuent d’utiliser les modèles existants et leurs crédits. La vue « Cerveau » isole le véritable assemblage FMA50801 ; les contrôles visibles permettent de zoomer et de recadrer la structure, y compris sur téléphone. Une relecture pédagogique spécialisée reste nécessaire avant de présenter la banque comme validée par une faculté.
