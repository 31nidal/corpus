# Qualité des brouillons locaux

Cette correction est indépendante de la révision persistée. Les lignes commençant par Chapitre, Partie, Figure, Tableau ou Schéma suivis d’un numéro (arabe ou romain, avec ou sans deux-points) sont écartées. Un sujet se terminant par et/ou/au/aux/du/des/de/la/le/les/un/une est écarté. Les relations, l’atomisation et l’extraction PDF restent inchangées.

Les rectos identiques après normalisation sont regroupés avant le plafond demandé. Les réponses et extraits de preuve sont conservés ; si une fusion concerne des notes typed/cloze/bidirectional, le résultat devient une note basic avec les réponses réunies, plutôt qu’une réponse typée ambiguë. Cela ne tranche pas les contradictions d’un cours : l’utilisateur doit toujours relire le brouillon.

## Mesure avant/après

PDF texte d’une page construit par `tests/fixtures/local-generation-quality.mjs`, identique avant/après, 12 lignes. À exécuter avec `node scripts/measure-local-flashcard-quality.mjs` (ou fournir le chemin d’un PDF).

| Mesure | Avant (main cdedab6) | Après |
| --- | ---: | ---: |
| Brouillons, générateur de cartes | 10 | 3 |
| Brouillons, générateur de notes | 10 | 3 |
| Titres/légendes écartés par le nouveau filtre | 0 | 6 |
| Sujets tronqués écartés | 0 | 2 |
| Paires de rectos identiques fusionnées | 0 | 1 |

Deux des six titres/légendes ne généraient déjà pas de carte ; les nouveaux filtres retirent donc six anciens brouillons (quatre titres et deux sujets tronqués), puis la fusion retire un doublon. Le résultat conserve trois questions. Les deux phrases sur le débit cardiaque et l’aldostérone sont écartées, sans tentative de corriger leurs relations.

## Limites de vérification

Mesure synthétique reproductible, sans validation de qualité médicale et sans benchmark représentatif de PDF utilisateurs. Les phrases exactes accentuées sont testées séparément ; le PDF de test utilise Helvetica avec texte ASCII. Aucun fournisseur externe, aucune modification des cartes existantes, FSRS ou règles de révision. La fusion est limitée à chaque appel de génération : elle ne dédoublonne pas des sections générées dans des appels séparés.

## Corrections du benchmark de pré-fusion

Les cloze du trajet de l’œsophage et du nerf obturateur étaient rejetées avant la conversion cloze : leur sujet basic se terminait par « et ». L’extraction cloze vérifie maintenant directement la phrase et sa coordination ; les titres, légendes et vrais sujets tronqués restent exclus.

Les rectos identiques avec réponses distinctes sont contextualisés, sans concaténer les réponses ni les preuves. Le helper `draftFronts.mjs` est aussi utilisé par le flux persisté de #7 à l’échelle du document ; chaque brouillon conserve sa section, sa page et sa citation. Les cartes et brouillons existants ne sont pas réécrits. La régénération ne ressuscite pas un brouillon rejeté parce que son recto a été amélioré.

Corrections pédagogiques ciblées : premier prédicat valide plutôt qu’un verbe dans son complément, « se constitue » et « décrit », nom « produit » devant un autre prédicat, libellé générique pour relie/sépare/protège, et maintien en basic des formules mêlées à de la prose. Aucun contenu médical ni FSRS n’est modifié. Les référents absents, titres descriptifs et réponses incomplètes nécessitent toujours une révision humaine.

Benchmark corrigé des mêmes 45 cours : anatomie 155, physiologie 136, pharmacologie 66, soit 357 brouillons, contre 317 avant correction de #8 et 341 sur main. Aucun recto doublonné dans les appels sur cours entiers et aucune preuve non verbatim. Les deux cloze utiles sont présentes. Seize anciennes questions mal formées restent écartées ; cette perte de couverture des phrases est documentée, même si leurs anciens rectos n’étaient pas exploitables. Aucun chiffre ne constitue une certification médicale automatique.
