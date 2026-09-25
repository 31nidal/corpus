export const statsRevisions: Record<string, [string, string[], string[]][]> = {
  "stats-roc-curves-performance": [
    [
      "Quelle est la définition de la sensibilité (Se) d'un test diagnostique binaire ?",
      [
        "La probabilité que le test soit positif chez les sujets réellement malades (vrais positifs / ensemble des malades).",
        "La probabilité que le test soit négatif chez les sujets non malades.",
        "La proportion de vrais malades parmi les personnes testées positives."
      ],
      [
        "La sensibilité (Se = VP / (VP + FN)) mesure la capacité du test à détecter la maladie chez les personnes atteintes.",
        "C'est la définition de la spécificité (Sp).",
        "C'est la définition de la Valeur Prédictive Positive (VPP)."
      ]
    ],
    [
      "Quelle est la définition de la spécificité (Sp) d'un test diagnostique ?",
      [
        "La probabilité que le test soit négatif chez les sujets non malades (vrais négatifs / ensemble des non-malades).",
        "La probabilité d'avoir un test faussement positif.",
        "Le taux de faux négatifs dans l'échantillon."
      ],
      [
        "La spécificité (Sp = VN / (VN + FP)) quantifie la capacité à identifier correctement les individus indemnes de l'affection.",
        "Le taux de faux positifs est égal à 1 - Spécificité.",
        "Le taux de faux négatifs est égal à 1 - Sensibilité."
      ]
    ],
    [
      "Que représentent les axes d'une courbe ROC (Receiver Operating Characteristic) ?",
      [
        "L'ordonnée (axe Y) représente la sensibilité (taux de vrais positifs) et l'abscisse (axe X) représente 1 - spécificité (taux de faux positifs).",
        "L'ordonnée représente la spécificité et l'abscisse représente la sensibilité.",
        "L'ordonnée représente l'âge et l'abscisse le coût du traitement."
      ],
      [
        "La courbe ROC trace le compromis entre Se et (1 - Sp) pour toutes les valeurs seuils de décision possibles d'un test quantitatif.",
        "L'abscisse porte classiquement (1 - Sp) et l'ordonnée la sensibilité (Se).",
        "Les axes de la courbe ROC sont des métriques de performance diagnostique probabilistes."
      ]
    ],
    [
      "Que vaut l'aire sous la courbe ROC (AUC) pour un test diagnostique totalement inefficace (équivalent à un tirage à pile ou face) ?",
      [
        "AUC = 0,50 (la courbe se superpose à la diagonale de référence).",
        "AUC = 1,00.",
        "AUC = 0,00."
      ],
      [
        "Une AUC de 0,50 correspond à un pouvoir discriminant nul, la diagonale reliant (0,0) à (1,1).",
        "Une AUC de 1,00 correspond à un test diagnostique parfait (100 % de Se et 100 % de Sp sans faux positifs ni faux négatifs).",
        "Une AUC de 0 signifierait un test systématiquement inversé."
      ]
    ],
    [
      "Comment évoluent les Valeurs Prédictives Positive (VPP) et Négative (VPN) si la prévalence de la maladie augmente dans la population, pour une Se et Sp constantes ?",
      [
        "La VPP augmente et la VPN diminue.",
        "La VPP diminue et la VPN augmente.",
        "La VPP et la VPN restent rigoureusement constantes."
      ],
      [
        "La prévalence modifie la probabilité pré-test : plus la maladie est fréquente, plus un test positif a de chances d'être un vrai positif (VPP monte).",
        "C'est l'inverse : la VPN diminue lorsque la maladie devient très fréquente.",
        "Contrairement à Se et Sp qui sont intrinsèques au test, les valeurs prédictives dépendent fortement de la prévalence."
      ]
    ],
    [
      "Qu'est-ce que le rapport de vraisemblance positif (RV+ / Likelihood Ratio +) d'un test diagnostique ?",
      [
        "Le rapport Sensibilité / (1 - Spécificité) (probabilité d'un test positif chez un malade rapportée à celle chez un non-malade).",
        "Le rapport Spécificité / Sensibilité.",
        "Le produit Se × Sp."
      ],
      [
        "Un RV+ supérieur à 10 augmente considérablement la probabilité post-test de la maladie après un résultat positif.",
        "Cette formule ne correspond à aucun indicateur diagnostique standard.",
        "Le produit Se × Sp n'a pas de signification probabiliste diagnostique."
      ]
    ],
    [
      "Quel est l'impact de l'abaissement du seuil de positivité d'un test biologique continu (ex: glycémie) ?",
      [
        "La sensibilité augmente (moins de faux négatifs) mais la spécificité diminue (plus de faux positifs).",
        "La sensibilité et la spécificité augmentent simultanément à 100 %.",
        "La spécificité augmente sans modification de la sensibilité."
      ],
      [
        "En baissant le seuil, on capture plus de malades (gain de Se) au prix d'un nombre accru de sujets sains testés faussement positifs (perte de Sp).",
        "Il existe un compromis antagoniste indissociable entre sensibilité et spécificité pour un test continu donné.",
        "Baisser le seuil augmente le nombre de faux positifs et donc diminue la spécificité."
      ]
    ],
    [
      "Pour une action de dépistage de masse d'une maladie grave traitable, quel critère privilégie-t-on pour le test de première intention ?",
      [
        "Une très haute sensibilité pour minimiser au maximum le nombre de faux négatifs.",
        "Une très haute spécificité pour exclure immédiatement les non-malades.",
        "Un coût d'analyse extrêmement élevé."
      ],
      [
        "Le dépistage vise à ne laisser échapper aucun cas suspect (Se maximale), quitte à confirmer ensuite par un test plus spécifique.",
        "La spécificité maximale est requise pour le test de confirmation diagnostique avant un traitement lourd.",
        "Le coût financier doit au contraire être maîtrisé en santé publique."
      ]
    ],
    [
      "Que représente la Valeur Prédictive Positive (VPP) calculée dans une étude ?",
      [
        "La probabilité d'être réellement malade sachant que le test est positif (P(M+|T+)).",
        "La probabilité d'avoir un test positif sachant que l'on est malade.",
        "Le taux de mortalité dans l'échantillon."
      ],
      [
        "La VPP répond à la question du patient : « Mon test est positif, quelle est ma probabilité réelle d'avoir la maladie ? ».",
        "C'est la définition de la sensibilité (P(T+|M+)).",
        "Le taux de mortalité est un indicateur épidémiologique d'incidence de décès."
      ]
    ],
    [
      "Comment calcule-t-on le rapport de vraisemblance négatif (RV- / Likelihood Ratio -) ?",
      [
        "RV- = (1 - Sensibilité) / Spécificité.",
        "RV- = Sensibilité / Spécificité.",
        "RV- = (1 - Spécificité) / (1 - Sensibilité)."
      ],
      [
        "Un RV- inférieur à 0,1 permet d'exclure quasi formellement le diagnostic en présence d'un résultat négatif.",
        "Cette formule est inexacte pour le calcul du RV-.",
        "C'est l'inverse du rapport de vraisemblance positif."
      ]
    ]
  ],

  "stats-epidemiological-bias-confounding": [
    [
      "Quelles sont les trois grandes catégories d'erreurs systématiques (biais) en épidémiologie ?",
      [
        "Les biais de sélection, les biais de classement (ou d'information/mesure) et les biais de confusion.",
        "Les erreurs de syntaxe, de compilation et d'exécution.",
        "Les fluctuations d'échantillonnage aléatoires pures."
      ],
      [
        "Les biais introduisent une déviation systématique de l'estimation par rapport à la valeur vraie, non réductible par l'augmentation de l'effectif.",
        "Ce sont des erreurs informatiques logicielles.",
        "Les fluctuations aléatoires correspondent à l'erreur d'échantillonnage (aléa), contrôlée par la taille d'échantillon."
      ]
    ],
    [
      "Qu'est-ce qu'un biais de sélection dans une étude épidémiologique ?",
      [
        "Une distorsion survenant lorsque la probabilité d'être inclus dans l'échantillon dépend à la fois de l'exposition et de la maladie.",
        "Une mauvaise mesure de la tension artérielle par un tensiomètre défectueux.",
        "Une erreur de calcul dans la moyenne arithmétique."
      ],
      [
        "Le biais de sélection (ex: biais de Berkson à l'hôpital, biais du travailleur sain) altère la représentativité et la comparabilité des groupes.",
        "C'est un biais de mesure / information.",
        "C'est une faute de calcul mathématique."
      ]
    ],
    [
      "Qu'est-ce qu'un biais de mémorisation (biais de rappel / recall bias) fréquent dans les études cas-témoins rétrospectives ?",
      [
        "Une remémoration plus précise ou surévaluée de leurs expositions passées par les cas malades que par les témoins sains.",
        "Une perte de mémoire physiologique due à l'âge chez les investigateurs.",
        "Une disparition accidentelle des dossiers médicaux."
      ],
      [
        "Les sujets malades cherchent souvent une explication à leur maladie et se souviennent mieux de facteurs de risque que les témoins.",
        "Il s'agit d'une distorsion différentielle de rappel entre cas et témoins, pas d'amnésie des soignants.",
        "Les dossiers perdus correspondent à des données manquantes."
      ]
    ],
    [
      "Quelles sont les trois conditions indispensables pour qu'un facteur C soit considéré comme un facteur de confusion entre une exposition E et une maladie M ?",
      [
        "C est associé à la maladie M, C est associé à l'exposition E, et C n'est pas un intermédiaire sur la chaîne causale entre E et M.",
        "C est la cause directe exclusive de E et sans lien avec M.",
        "C est un traitement prescrit après la survenue de M."
      ],
      [
        "Le facteur de confusion fausse l'association observée en créant une liaison fallacieuse ou en masquant un effet réel.",
        "Si C n'est pas associé à M, il ne peut pas induire de confusion.",
        "Un intermédiaire sur la chaîne causale (médiateur) ne doit pas être traité comme un facteur de confusion sous peine de sous-estimer l'effet."
      ]
    ],
    [
      "Quelle méthode statistique permet de contrôler un facteur de confusion lors de l'analyse des données ?",
      [
        "L'ajustement par stratification (méthode de Mantel-Haenszel) ou par régression multivariée.",
        "L'augmentation simple du nombre de décimales.",
        "Le doublement arbitraire de l'échantillon sans modélisation."
      ],
      [
        "La modélisation multivariée (régression logistique, modèle de Cox) permet d'estimer l'effet propre de l'exposition « toutes choses égales par ailleurs ».",
        "Les décimales n'éliminent aucun biais systématique.",
        "Augmenter la taille d'un échantillon biaisé ne fait que réduire l'erreur aléatoire sans corriger le biais."
      ]
    ],
    [
      "Quelle méthode lors de la conception (design) d'un essai clinique randomisé élimine au mieux les facteurs de confusion connus et inconnus ?",
      [
        "La randomisation (tirage au sort de l'attribution des traitements).",
        "Le choix exclusif de volontaires jeunes.",
        "L'absence totale de groupe témoin."
      ],
      [
        "La randomisation équilibre en moyenne les caractéristiques pronostiques (observées et non observées) entre le groupe traité et le groupe contrôle.",
        "Restreindre l'échantillon limite la validité externe.",
        "Un essai sans groupe témoin ne permet pas de conclure à l'efficacité causale du traitement."
      ]
    ],
    [
      "Qu'est-ce qu'un biais de classement différentiel par rapport à un biais de classement non différentiel ?",
      [
        "Dans le biais différentiel, l'erreur de classification dépend du statut malade/non malade, ce qui biaise l'estimation dans un sens imprévisible ; dans le non différentiel, elle est indépendante et tend à sous-estimer l'effet (dilution vers 1).",
        "Le biais différentiel n'existe que dans les essais de phase I.",
        "Le classement différentiel donne toujours un risque relatif strictement égal à 0."
      ],
      [
        "Les erreurs non différentielles de mesure floutent l'association et biaisent généralement vers l'hypothèse nulle.",
        "Les biais de classement peuvent survenir dans tout type d'étude épidémiologique.",
        "Le risque relatif n'est pas systématiquement nul."
      ]
    ],
    [
      "Qu'est-ce que le « biais du travailleur sain » (healthy worker effect) en santé au travail ?",
      [
        "Une sous-estimation de la mortalité d'une population active comparée à la population générale, les personnes employées étant initialement en meilleure santé que l'ensemble de la population.",
        "L'absence d'accident du travail dans les usines robotisées.",
        "Une surestimation systématique du risque professionnel par les syndicats."
      ],
      [
        "La population générale comprend des personnes inaptes au travail pour cause de maladie chronique, biaisant la comparaison brute de mortalité.",
        "Ce n'est pas la définition épidémiologique du phénomène.",
        "Le biais du travailleur sain est un biais de sélection intrinsèque à la cohorte professionnelle."
      ]
    ],
    [
      "Qu'est-ce que le biais de publication dans la littérature scientifique ?",
      [
        "La tendance des revues et des auteurs à publier préférentiellement les études aux résultats positifs ou statistiquement significatifs plutôt que les résultats neutres.",
        "L'interdiction de publier des articles en français.",
        "Une coquille typographique dans un journal médical."
      ],
      [
        "Ce biais conduit à une surestimation de l'efficacité réelle des traitements dans les méta-analyses (détectable par l'asymétrie du funnel plot).",
        "La langue de publication n'est pas le biais de publication épidémiologique.",
        "Une coquille est une erreur matérielle d'impression."
      ]
    ],
    [
      "Comment le maintien du « double aveugle » (double insu) prévient-il les biais d'évaluation et de prise en charge dans un essai clinique ?",
      [
        "Ni le patient ni l'équipe soignante/évaluatrice ne connaissent le traitement administré, évitant les modifications de comportement et les jugements subjectifs biaisés.",
        "En empêchant les patients de lire la notice du médicament.",
        "En dispensant les investigateurs de déclarer les effets indésirables."
      ],
      [
        "Le double insu neutralise l'effet placebo différentiel et le biais d'évaluation du critère de jugement clinique.",
        "Le consentement éclairé et l'information du patient restent obligatoires.",
        "La pharmacovigilance et la déclaration des événements indésirables demeurent strictement obligatoires."
      ]
    ]
  ],

  "stats-sampling-point-estimation": [
    [
      "Quelle est la différence fondamentale entre une « population cible » et un « échantillon » en statistiques médicales ?",
      [
        "La population est l'ensemble complet des individus auxquels on souhaite généraliser les conclusions, et l'échantillon est le sous-ensemble effectivement observé et mesuré.",
        "La population comprend uniquement les animaux et l'échantillon les humains.",
        "L'échantillon est toujours dix fois plus grand que la population."
      ],
      [
        "L'inférence statistique consiste à estimer les paramètres inconnus de la population à partir des statistiques calculées sur l'échantillon représentatif.",
        "Cette distinction est sans rapport avec les définitions statistiques.",
        "L'échantillon est par définition une fraction de la population parente."
      ]
    ],
    [
      "Qu'est-ce qu'un estimateur « sans biais » (non biaisé) d'un paramètre populationnel ?",
      [
        "Un estimateur dont l'espérance mathématique est égale à la vraie valeur du paramètre dans la population (E(θ̂) = θ).",
        "Un estimateur dont la variance est infinie.",
        "Un estimateur qui donne exactement le même chiffre sur tous les échantillons possibles."
      ],
      [
        "En répétant l'échantillonnage une infinité de fois, la moyenne des estimations convergerait exactement vers la vraie valeur du paramètre.",
        "Une variance infinie caractérise un estimateur inutilisable et instable.",
        "Les valeurs varient d'un échantillon à l'autre en raison de la fluctuation d'échantillonnage."
      ]
    ],
    [
      "Pourquoi utilise-t-on le dénominateur (n - 1) plutôt que n pour calculer la variance échantillonnale corrigée (s²) ?",
      [
        "Pour corriger le biais d'estimation et obtenir un estimateur non biaisé de la variance de la population σ².",
        "Pour simplifier les calculs de division mentale.",
        "Parce que le premier sujet de l'étude est toujours exclu."
      ],
      [
        "L'utilisation de la moyenne échantillonnale x̄ à la place de la vraie moyenne inconnue μ retire un degré de liberté (perte de liberté d'un écart).",
        "Diviser par (n - 1) n'a rien à voir avec une simplification mathématique.",
        "Tous les sujets mesurés participent au calcul de la variance corrigée."
      ]
    ],
    [
      "Quelle est la formule de l'erreur-type de la moyenne (SEM / Standard Error of the Mean) pour un échantillon de taille n et d'écart-type s ?",
      [
        "SEM = s / √n.",
        "SEM = s × n.",
        "SEM = s² / n²."
      ],
      [
        "L'erreur-type quantifie la variabilité de la moyenne d'échantillon autour de la vraie moyenne populationnelle ; elle diminue proportionnellement à la racine carrée de n.",
        "Multiplier par n augmenterait l'erreur avec la taille de l'échantillon, ce qui est absurde.",
        "Cette formule ne correspond pas à l'écart-type de la distribution d'échantillonnage."
      ]
    ],
    [
      "Comment évolue la précision de l'estimation de la moyenne (réduction de SEM) si l'on multiplie la taille de l'échantillon n par 4 ?",
      [
        "L'erreur-type est divisée par 2 (√4 = 2), doublant ainsi la précision de l'estimation.",
        "L'erreur-type est divisée par 4.",
        "La précision reste totalement inchangée."
      ],
      [
        "La loi de racine carrée implique qu'il faut quadrupler l'effectif pour réduire l'incertitude de moitié.",
        "L'erreur-type dépend de la racine carrée de n et non de n directement.",
        "Augmenter l'échantillon améliore toujours la précision de l'estimateur."
      ]
    ],
    [
      "Quelle est l'interprétation exacte d'un intervalle de confiance à 95 % (IC 95 %) pour une moyenne populationnelle μ ?",
      [
        "Si l'on répétait l'échantillonnage un grand nombre de fois dans les mêmes conditions, 95 % des intervalles ainsi calculés contiendraient la vraie valeur fixe μ.",
        "Il y a 95 % de chances que tous les patients de l'échantillon aient une valeur comprise dans cet intervalle.",
        "La vraie moyenne μ varie aléatoirement entre les deux bornes avec une probabilité de 95 %."
      ],
      [
        "Le paramètre μ est fixe mais inconnu ; c'est l'intervalle d'échantillonnage qui est une variable aléatoire recouvrant le paramètre 95 fois sur 100.",
        "L'intervalle de confiance concerne le paramètre moyen, non la dispersion des valeurs individuelles (intervalle de référence).",
        "En statistiques fréquentistes, le paramètre populationnel n'est pas une variable aléatoire."
      ]
    ],
    [
      "Quelle est la formule d'un intervalle de confiance asymptotique à 95 % pour une proportion p estimée sur un grand échantillon n ?",
      [
        "p̂ ± 1,96 × √[p̂(1 - p̂) / n].",
        "p̂ ± 0,5 × n.",
        "p̂ / (1 - p̂)."
      ],
      [
        "La valeur 1,96 correspond au quantile à 97,5 % de la loi normale centrée réduite N(0,1).",
        "Cette formule est dimensionnellement fausse.",
        "C'est la formule de l'odds (cote), pas de l'intervalle de confiance."
      ]
    ],
    [
      "Quelle méthode d'échantillonnage probabiliste donne à chaque individu de la population une probabilité égale et connue d'être sélectionné ?",
      [
        "L'échantillonnage aléatoire simple.",
        "L'échantillonnage de convenance (volontaires dans la salle d'attente).",
        "L'échantillonnage au jugé par le médecin."
      ],
      [
        "Le tirage aléatoire simple est la méthode de référence pour garantir la représentativité et l'absence de biais de sélection.",
        "L'échantillon de convenance est non probabiliste et sujet à des biais de sélection majeurs.",
        "Le choix subjectif fausse la représentativité de l'échantillon."
      ]
    ],
    [
      "Qu'est-ce que l'échantillonnage stratifié en épidémiologie ?",
      [
        "La division de la population en sous-groupes homogènes (strates, ex: tranches d'âge) suivie d'un tirage aléatoire au sein de chaque strate.",
        "Le regroupement de patients par numéro de chambre d'hôpital.",
        "L'inclusion successive de tous les patients admis un lundi."
      ],
      [
        "La stratification assure une représentation adéquate des sous-groupes clés et réduit la variance globale de l'estimation.",
        "C'est un échantillonnage par grappes.",
        "C'est un recrutement séquentiel systématique."
      ]
    ],
    [
      "Quelle distinction oppose un « intervalle de confiance » d'un « intervalle de référence » (intervalle de normalité) en médecine ?",
      [
        "L'intervalle de confiance encadre un paramètre moyen populationnel avec un niveau de confiance, tandis que l'intervalle de référence délimite la plage où se situent 95 % des valeurs individuelles de la population saine.",
        "L'intervalle de confiance ne s'applique qu'aux animaux.",
        "L'intervalle de référence est toujours deux fois plus étroit que l'intervalle de confiance."
      ],
      [
        "L'IC 95 % se rétrécit avec l'augmentation de n (SEM = s/√n), alors que l'intervalle de référence individuel reste stable (environ ± 2 écarts-types s).",
        "Les deux notions sont fondamentales en médecine humaine.",
        "L'intervalle de référence individuel est beaucoup plus large que l'intervalle de confiance d'une moyenne sur grand échantillon."
      ]
    ]
  ],

  "stats-descriptive-distributions": [
    [
      "Quels sont les deux paramètres de tendance centrale et de dispersion les plus adaptés pour décrire une variable quantitative continue symétrique de distribution normale ?",
      [
        "La moyenne arithmétique et l'écart-type (écart-type / déviation standard).",
        "La médiane et les valeurs extrêmes sans effectif.",
        "Le mode et le pourcentage de zéros."
      ],
      [
        "Pour une distribution gaussienne symétrique, la moyenne coïncide avec la médiane et l'écart-type résume la dispersion.",
        "La médiane et l'écart interquartile sont préférables pour les distributions asymétriques.",
        "Le mode seul ne résume pas la dispersion d'une variable quantitative."
      ]
    ],
    [
      "Pour une distribution fortement asymétrique (ex: durée de séjour hospitalier, taux d'anticorps), quels indicateurs statistiques doit-on privilégier ?",
      [
        "La médiane et l'intervalle (ou écart) interquartile [Q1 - Q3].",
        "La moyenne arithmétique et l'écart-type.",
        "Le minimum et le maximum exclusively."
      ],
      [
        "La médiane et les quartiles sont des statistiques non paramétriques robustes insensibles aux valeurs extrêmes aberrantes.",
        "La moyenne est fortement influencée par les valeurs extrêmes et devient trompeuse en cas de forte asymétrie.",
        "L'étendue min-max est extrêmement vulnérable aux valeurs aberrantes isolées."
      ]
    ],
    [
      "Comment se définit la médiane d'une série statistique ordonnée ?",
      [
        "La valeur qui partage l'échantillon ordonné en deux moitiés égales, avec 50 % des observations en dessous et 50 % au-dessus.",
        "La somme de toutes les valeurs divisée par le nombre de sujets.",
        "La valeur la plus fréquemment observée dans l'échantillon."
      ],
      [
        "La médiane correspond au 50e percentile (Q2) et représente la valeur centrale de la série triée.",
        "C'est la définition de la moyenne arithmétique.",
        "C'est la définition du mode."
      ]
    ],
    [
      "Quelle est la définition de la variance d'un échantillon statistique ?",
      [
        "La moyenne des carrés des écarts des observations par rapport à leur moyenne arithmétique.",
        "La différence entre la valeur maximale et la valeur minimale.",
        "Le rapport entre la moyenne et l'écart-type."
      ],
      [
        "La variance s² mesure la dispersion quadratique ; sa racine carrée donne l'écart-type s dans les mêmes unités que la variable d'origine.",
        "C'est la définition de l'étendue (range).",
        "L'écart-type divisé par la moyenne est le coefficient de variation (CV)."
      ]
    ],
    [
      "Que représente l'écart interquartile (IQR = Q3 - Q1) d'une série de données ?",
      [
        "L'étendue couverte par les 50 % centraux des observations (différence entre le 75e et le 25e percentile).",
        "La totalité des valeurs observées du minimum au maximum.",
        "La distance entre la moyenne et le zéro."
      ],
      [
        "L'IQR délimite la boîte centrale du diagramme en boîte à moustaches (box-plot).",
        "C'est l'étendue totale (max - min).",
        "Cette distance n'a pas de nom statistique particulier."
      ]
    ],
    [
      "Qu'est-ce qu'une variable qualitative nominale par rapport à une variable ordinale ?",
      [
        "Une variable nominale comporte des catégories sans ordre hiérarchique naturel (ex: groupe sanguin ABO), tandis qu'une variable ordinale possède un ordre intrinsèque (ex: stade tumoral I, II, III).",
        "Une variable nominale est toujours mesurée avec un thermomètre.",
        "Une variable ordinale ne peut prendre que deux valeurs numériques décimales."
      ],
      [
        "Les modalités nominales ne s'ordonnent pas (A, B, AB, O), alors que les modalités ordinales traduisent une gradation.",
        "La température est une variable quantitative continue.",
        "Une variable ordinale est qualitative et n'a pas de valeurs décimales continues."
      ]
    ],
    [
      "Quel type de représentation graphique est le plus approprié pour visualiser la distribution d'une variable quantitative continue regroupée en classes ?",
      [
        "L'histogramme (où l'aire des rectangles est proportionnelle aux effectifs).",
        "Le diagramme en secteurs circulaires (camembert) sans échelle.",
        "La carte géographique départementale."
      ],
      [
        "L'histogramme permet d'observer l'allure de la distribution (symétrie, asymétrie, unimodalité ou bimodalité).",
        "Le camembert est réservé aux variables qualitatives à faible nombre de modalités.",
        "La carte représente la distribution spatiale, non la distribution statistique d'une variable continue."
      ]
    ],
    [
      "Dans une distribution asymétrique étirée vers la droite (asymétrie positive / skewness positive), quel est l'ordre habituel des paramètres de tendance centrale ?",
      [
        "Mode < Médiane < Moyenne.",
        "Moyenne < Médiane < Mode.",
        "Mode = Médiane = Moyenne."
      ],
      [
        "Les valeurs élevées extrêmes tirent la moyenne vers la droite, tandis que le mode reste au pic de fréquence et la médiane au centre des effectifs.",
        "Cet ordre caractérise une distribution asymétrique étirée vers la gauche (asymétrie négative).",
        "L'égalité parfaite caractérise une distribution strictement symétrique unimodale (ex: gaussienne)."
      ]
    ],
    [
      "Qu'appelle-t-on le « coefficient de variation » (CV = s / x̄) en biologie médicale ?",
      [
        "Le rapport de l'écart-type sur la moyenne, exprimé en pourcentage pour évaluer l'imprécision relative d'un dosage biologique.",
        "Le nombre de sujets malades divisé par le nombre de témoins.",
        "La constante de gravitation universelle."
      ],
      [
        "Le CV est un indice de dispersion adimensionnel permettant de comparer la variabilité de paramètres ayant des unités ou moyennes différentes.",
        "C'est un ratio épidémiologique cas/témoins.",
        "C'est une constante physique sans lien avec la variabilité analytique."
      ]
    ],
    [
      "Que visualisent les « moustaches » (whiskers) d'un diagramme en boîte de Tukey (box-plot) ?",
      [
        "Les valeurs adjacentes délimitant les données non aberrantes (souvent jusqu'à 1,5 × IQR au-delà des quartiles), les points au-delà étant signalés comme aberrants.",
        "La somme de toutes les fréquences cumulées.",
        "L'incertitude sur la mesure du temps en minutes."
      ],
      [
        "Le box-plot synthétise visuellement les 5 nombres de Tukey : minimum (ou valeur adjacente basse), Q1, médiane, Q3 et maximum (ou valeur adjacente haute).",
        "La courbe des fréquences cumulées est une ogive de Galton.",
        "Les moustaches ne représentent pas un temps chronométrique."
      ]
    ]
  ],

  "stats-probability-laws": [
    [
      "Quelles sont les bornes fondamentales entre lesquelles est obligatoirement comprise la probabilité P(A) de tout événement A ?",
      [
        "0 ≤ P(A) ≤ 1 (avec P(∅) = 0 pour l'événement impossible et P(Ω) = 1 pour l'événement certain).",
        "-1 ≤ P(A) ≤ +1.",
        "0 ≤ P(A) ≤ 100 sans unité."
      ],
      [
        "Selon les axiomes de Kolmogorov, une probabilité est un nombre réel positif ou nul ne pouvant excéder 1.",
        "Une probabilité négative n'a aucun sens mathématique.",
        "En pourcentage la valeur s'écrit de 0 % à 100 %, mais la valeur de la probabilité mathématique est comprise entre 0 et 1."
      ]
    ],
    [
      "Comment calcule-t-on la probabilité de l'union de deux événements A et B quelconques (P(A ∪ B)) ?",
      [
        "P(A ∪ B) = P(A) + P(B) - P(A ∩ B).",
        "P(A ∪ B) = P(A) × P(B).",
        "P(A ∪ B) = P(A) / P(B)."
      ],
      [
        "Il faut retrancher la probabilité de l'intersection P(A ∩ B) pour ne pas compter deux fois les cas où A et B se réalisent simultanément.",
        "Le produit correspond à la probabilité de l'intersection de deux événements indépendants.",
        "Le quotient correspond à une cote ou un rapport, non à l'union."
      ]
    ],
    [
      "Quelle est la définition de la probabilité conditionnelle de l'événement A sachant que l'événement B est réalisé (notée P(A|B)), avec P(B) > 0 ?",
      [
        "P(A|B) = P(A ∩ B) / P(B).",
        "P(A|B) = P(A) + P(B).",
        "P(A|B) = P(A) × P(B)."
      ],
      [
        "La condition B restreint l'univers des possibles à l'événement B, ramenant la probabilité à la fraction de l'intersection incluse dans B.",
        "L'addition ne définit pas le conditionnement probabiliste.",
        "Cette formule ne s'applique que si B est certain (P(B)=1)."
      ]
    ],
    [
      "Quelle relation mathématique caractérise l'indépendance statistique de deux événements A et B ?",
      [
        "P(A ∩ B) = P(A) × P(B)  (ou de façon équivalente P(A|B) = P(A)).",
        "P(A ∩ B) = 0 (les événements ne peuvent jamais se produire ensemble).",
        "P(A) + P(B) = 1."
      ],
      [
        "La réalisation de B n'apporte aucune information sur la réalisation de A, et inversement.",
        "P(A ∩ B) = 0 définit deux événements incompatibles (ou disjoints), ce qui est le contraire de l'indépendance pour des probabilités non nulles.",
        "Cette relation définit des événements complémentaires, pas indépendants."
      ]
    ],
    [
      "Quelles sont les conditions d'application d'une loi binomiale B(n, p) ?",
      [
        "La répétition de n épreuves de Bernoulli identiques et indépendantes à deux issues possibles (succès de probabilité p, échec de probabilité 1-p).",
        "Une variable continue mesurée chez un seul patient.",
        "Un tirage sans remise dans une petite population de 10 personnes."
      ],
      [
        "La variable X comptant le nombre de succès dans n essais indépendants suit la loi binomiale B(n, p).",
        "Une variable continue ne suit pas une loi discrète binomiale.",
        "Le tirage sans remise dans une petite population suit une loi hypergéométrique en raison de la non-indépendance des tirages."
      ]
    ],
    [
      "Quelle est l'espérance mathématique E(X) et la variance V(X) d'une variable aléatoire X suivant une loi binomiale B(n, p) ?",
      [
        "E(X) = n · p  et  V(X) = n · p · (1 - p).",
        "E(X) = n / p  et  V(X) = n² · p.",
        "E(X) = 0  et  V(X) = 1."
      ],
      [
        "Le nombre moyen de succès attendu est n·p et la dispersion est maximale lorsque p = 0,5.",
        "Ces formules sont mathématiquement incorrectes pour la loi binomiale.",
        "Ce sont les paramètres de la loi normale centrée réduite N(0,1)."
      ]
    ],
    [
      "Quel théorème fondamental permet d'inverser les probabilités conditionnelles pour calculer P(Maladie|Test+) à partir de P(Test+|Maladie) et de la prévalence ?",
      [
        "Le théorème de Bayes (formule de Bayes).",
        "Le théorème de Pythagore.",
        "Le théorème de Rolle."
      ],
      [
        "Le théorème de Bayes : P(M|T) = [P(T|M) · P(M)] / P(T) est le fondement du raisonnement diagnostique et de l'inférence bayésienne.",
        "Le théorème de Pythagore s'applique aux triangles rectangles en géométrie.",
        "Le théorème de Rolle concerne l'analyse des fonctions réelles dérivables."
      ]
    ],
    [
      "Quelle loi de probabilité discrète est adaptée pour modéliser le nombre d'événements rares survenant dans un intervalle de temps ou d'espace continu (ex: cas d'une maladie rare par an) ?",
      [
        "La loi de Poisson (loi des événements rares).",
        "La loi binomiale B(2, 0.5).",
        "La loi uniforme continue."
      ],
      [
        "La loi de Poisson P(λ) est caractérisée par l'égalité remarquable entre son espérance et sa variance : E(X) = V(X) = λ.",
        "La loi B(2, 0.5) correspond au lancer de deux pièces.",
        "La loi uniforme continue attribue une densité constante sur un intervalle borné."
      ]
    ],
    [
      "Quelle est la probabilité d'obtenir 0 succès (aucun effet indésirable) dans n essais indépendants où chaque patient a un risque p de développer l'effet ?",
      [
        "P(X = 0) = (1 - p)^n.",
        "P(X = 0) = 1 - n · p.",
        "P(X = 0) = n · (1 - p)."
      ],
      [
        "Chaque patient a une probabilité (1 - p) de ne pas avoir l'effet indésirable ; par indépendance, les probabilités se multiplient.",
        "Cette approximation linéaire n'est valable que pour de très petits produits n·p et peut devenir négative.",
        "Cette formule est fausse pour le calcul de probabilité conjointe."
      ]
    ],
    [
      "Que vaut la somme des probabilités de tous les événements élémentaires d'un univers fini Ω ?",
      [
        "Exactement égale à 1 (∑ P(ω_i) = 1).",
        "Égale à l'effectif total n.",
        "Égale à zéro."
      ],
      [
        "L'ensemble des événements élémentaires forme une partition de l'univers certain Ω dont la probabilité totale est 1.",
        "La somme des probabilités vaut 1 et non n.",
        "Une somme de probabilités ne peut pas être nulle pour un ensemble complet d'événements."
      ]
    ]
  ],

  "stats-normal-distribution": [
    [
      "Quelles sont les propriétés caractéristiques de la courbe de densité de la loi normale (courbe de Gauss) de paramètres μ et σ ?",
      [
        "Une courbe continue unimodale, parfaitement symétrique en forme de cloche, centrée sur la moyenne μ (qui est aussi la médiane et le mode) avec des points d'inflexion à μ ± σ.",
        "Une courbe asymétrique strictement positive décroissante exponentielle.",
        "Une série de rectangles discontinus sans asymptote."
      ],
      [
        "La loi normale N(μ, σ²) est la distribution reine de la statistique, entièrement déterminée par son espérance μ et son écart-type σ.",
        "C'est la description d'une loi exponentielle.",
        "C'est la description d'un histogramme empirique."
      ]
    ],
    [
      "Comment transforme-t-on une variable normale X ~ N(μ, σ) en variable normale centrée réduite Z ~ N(0, 1) ?",
      [
        "Par la standardisation : Z = (X - μ) / σ.",
        "En multipliant X par la variance : Z = X × σ².",
        "En prenant le logarithme népérien : Z = ln(X)."
      ],
      [
        "Cette transformation soustrait la moyenne (centrage) et divise par l'écart-type (réduction), permettant d'utiliser la table universelle de la loi N(0,1).",
        "Multiplier par σ² modifierait l'échelle sans centrer la distribution.",
        "Le logarithme transforme une variable log-normale en variable normale."
      ]
    ],
    [
      "Selon la règle empirique de la loi normale (règle des 68-95-99,7), quel pourcentage approximatif des valeurs se situe dans l'intervalle [μ - 2σ ; μ + 2σ] (plus précisément ± 1,96 σ) ?",
      [
        "Environ 95 % des observations (95,45 % à ±2σ et exactement 95,0 % à ±1,96σ).",
        "Environ 50 % des observations.",
        "99,99 % des observations."
      ],
      [
        "Ce résultat fondamental fonde la construction des intervalles de référence biologiques à 95 % chez le sujet sain.",
        "L'intervalle [μ - 0,67σ ; μ + 0,67σ] contient 50 % des valeurs (intervalle interquartile d'une loi normale).",
        "L'intervalle à ± 3σ contient déjà 99,73 % des valeurs."
      ]
    ],
    [
      "Quel pourcentage d'observations se situe dans l'intervalle [μ - σ ; μ + σ] pour une distribution gaussienne ?",
      [
        "Environ 68,3 % des observations.",
        "Exactement 50 %.",
        "95 %."
      ],
      [
        "Plus des deux tiers de la population normale se trouvent à moins d'un écart-type de la moyenne.",
        "50 % correspond à l'intervalle interquartile [Q1 - Q3].",
        "95 % correspond à l'intervalle à ± 1,96 écarts-types."
      ]
    ],
    [
      "Que stipule le Théorème Central Limite (TCL) pour la moyenne x̄ d'un échantillon de taille n prélevé dans une population quelconque de moyenne μ et de variance finie σ² ?",
      [
        "Lorsque la taille d'échantillon n est suffisamment grande (n ≥ 30), la distribution de la moyenne d'échantillon x̄ converge vers une loi normale N(μ, σ²/n), quelle que soit la forme de la distribution d'origine.",
        "Toutes les variables biologiques individuelles deviennent des nombres entiers pairs.",
        "La variance de l'échantillon devient strictement égale à zéro dès que n > 10."
      ],
      [
        "Le TCL permet d'appliquer les tests paramétriques (test Z, test t) et de calculer des intervalles de confiance sur de grands échantillons sans supposer la normalité de la variable brute.",
        "Le TCL concerne la distribution d'échantillonnage de la moyenne, pas les valeurs individuelles.",
        "La variance d'échantillonnage de la moyenne diminue en σ²/n mais la variance des individus σ² reste constante."
      ]
    ],
    [
      "Quelle est la probabilité qu'une variable normale centrée réduite Z prenne une valeur supérieure à +1,96 (P(Z > 1,96)) ?",
      [
        "0,025 (soit 2,5 %, la zone de rejet unilatérale à droite).",
        "0,50 (50 %).",
        "0,05 (5 %)."
      ],
      [
        "Par symétrie, 5 % de l'aire sous la courbe se situe en dehors de [-1,96 ; +1,96], soit 2,5 % à gauche (Z < -1,96) et 2,5 % à droite (Z > +1,96).",
        "La moitié de la distribution se situe au-dessus de Z = 0.",
        "5 % correspond à la somme des deux extrémités bilatérales |Z| > 1,96."
      ]
    ],
    [
      "Que vaut l'aire totale sous la courbe de densité de probabilité de la loi normale f(x) de -∞ à +∞ ?",
      [
        "Exactement 1 (l'intégrale de toute fonction de densité sur son domaine vaut 1).",
        "Égale à l'écart-type σ.",
        "Égale à π."
      ],
      [
        "L'aire totale représente la probabilité de l'univers certain P(Ω) = 1.",
        "L'aire ne dépend pas de la valeur de σ ; un σ plus grand élargit la courbe mais abaisse son sommet pour conserver une aire unitaire.",
        "La formule fait intervenir √(2π) au dénominateur précisément pour normaliser l'aire à 1."
      ]
    ],
    [
      "Dans quel cas une loi binomiale B(n, p) peut-elle être convenablement approximée par une loi normale N(np, np(1-p)) ?",
      [
        "Lorsque n est grand et que np ≥ 5 et n(1 - p) ≥ 5.",
        "Lorsque n = 2 et p = 0,001.",
        "Uniquement lorsque p = 0 ou p = 1."
      ],
      [
        "Cette approximation gaussienne avec correction de continuité simplifie le calcul des probabilités cumulées sur grands échantillons binomiaux.",
        "Pour de petits effectifs ou des probabilités très faibles, on utilise la loi de Poisson ou la formule binomiale exacte.",
        "Pour p = 0 ou 1, la variable est dégénérée constante sans distribution continue."
      ]
    ],
    [
      "Quel test statistique graphique ou analytique permet de vérifier l'adéquation d'un échantillon à une distribution normale ?",
      [
        "Le diagramme quantile-quantile (Q-Q plot) et les tests de Shapiro-Wilk ou de Kolmogorov-Smirnov.",
        "Le test du Chi-2 d'indépendance binaire.",
        "La régression logistique binaire."
      ],
      [
        "Sur un Q-Q plot de normalité, les points doivent s'aligner le long de la première bissectrice si la distribution est normale.",
        "Le Chi-2 d'indépendance croise deux variables qualitatives.",
        "La régression logistique modélise la survenue d'un événement binaire."
      ]
    ],
    [
      "Si la calcémie d'une population saine suit une loi normale de moyenne μ = 2,40 mmol/L et d'écart-type σ = 0,10 mmol/L, quelles sont les limites de l'intervalle de référence à 95 % ?",
      [
        "[2,20 mmol/L ; 2,60 mmol/L] (calculé par 2,40 ± 2 × 0,10, ou plus exactement 2,40 ± 1,96 × 0,10 = [2,204 ; 2,596]).",
        "[1,00 mmol/L ; 3,00 mmol/L].",
        "[0 mmol/L ; 5 mmol/L]."
      ],
      [
        "L'intervalle de normalité individuel à 95 % s'étend à environ 2 écarts-types de part et d'autre de la moyenne.",
        "Ces bornes sont beaucoup trop larges et engloberaient des états pathologiques sévères.",
        "Ces limites sont incompatibles avec les données physiologiques de l'énoncé."
      ]
    ]
  ],

  "stats-hypothesis-testing-framework": [
    [
      "Quelle est la définition de l'hypothèse nulle (H0) dans la démarche standard des tests d'hypothèses statistiques ?",
      [
        "L'hypothèse d'absence d'effet, d'absence de différence ou de conformité au hasard que le test cherche à éprouver (et éventuellement rejeter).",
        "L'hypothèse que le chercheur espère démontrer avec certitude absolue.",
        "L'hypothèse que la taille de l'échantillon est égale à zéro."
      ],
      [
        "On pose H0 (ex: μ1 = μ2) et on calcule la probabilité d'observer les données sous cette hypothèse de référence.",
        "L'hypothèse de recherche correspond généralement à l'hypothèse alternative H1.",
        "La taille d'échantillon n'a aucun lien avec la formulation de H0."
      ]
    ],
    [
      "Qu'est-ce que l'erreur de type I (risque alpha / α) dans un test d'hypothèse ?",
      [
        "Le risque de rejeter à tort l'hypothèse nulle H0 alors qu'elle est en réalité vraie (faux positif statistique).",
        "Le risque d'accepter H0 alors qu'elle est fausse.",
        "L'erreur commise lors de la saisie informatique des données."
      ],
      [
        "Le seuil de signification α est fixé a priori par l'expérimentateur, conventionnellement à 5 % (α = 0,05).",
        "C'est la définition de l'erreur de type II (risque bêta).",
        "Il s'agit d'un risque probabiliste décisionnel et non d'une bévue matérielle."
      ]
    ],
    [
      "Qu'est-ce que l'erreur de type II (risque bêta / β) et qu'appelle-t-on la « puissance statistique » d'un test (1 - β) ?",
      [
        "Le risque β est de ne pas rejeter H0 alors qu'elle est fausse ; la puissance (1 - β) est la capacité du test à détecter une différence réelle lorsqu'elle existe.",
        "Le risque β est la probabilité d'avoir 100 % de réussite au traitement.",
        "La puissance est le nombre total de patients inclus dans l'étude."
      ],
      [
        "Une étude clinique bien dimensionnée vise généralement une puissance statistique de 80 % ou 90 % (soit un risque β de 20 % ou 10 %).",
        "Le risque β est un risque d'erreur d'inférence, pas un taux d'efficacité clinique.",
        "La puissance dépend de l'effectif n mais est une probabilité comprise entre 0 et 1."
      ]
    ],
    [
      "Quelle est la définition rigoureuse de la « p-value » (degré de signification p) fournie par un logiciel statistique ?",
      [
        "La probabilité, sous l'hypothèse nulle H0, d'obtenir une statistique de test au moins aussi extrême que celle observée dans l'échantillon.",
        "La probabilité que l'hypothèse nulle H0 soit vraie.",
        "La probabilité que le traitement soit inefficace à 100 %."
      ],
      [
        "La p-value quantifie la compatibilité des données avec H0 : plus p est faible, plus les données observées sont invraisemblables sous H0.",
        "La p-value n'est PAS la probabilité de H0 P(H0|Données), ce qui serait une inversion fallacieuse (sophisme du procureur).",
        "La p-value ne mesure pas directement la probabilité intrinsèque d'efficacité biologique."
      ]
    ],
    [
      "Quelle règle de décision s'applique lorsque la p-value calculée est inférieure ou égale au seuil α choisi (p ≤ 0,05) ?",
      [
        "On rejette l'hypothèse nulle H0 et on conclut à une différence statistiquement significative au seuil α.",
        "On accepte définitivement que H0 est absolument vraie.",
        "On annule immédiatement l'expérience pour recommencer."
      ],
      [
        "Le résultat est jugé trop improbable sous le simple effet du hasard pour conserver H0, conduisant à retenir H1.",
        "Lorsque p ≤ α, on rejette H0, on ne l'accepte pas.",
        "Le rejet de H0 est la conclusion d'un test concluant et significatif."
      ]
    ],
    [
      "Que doit-on conclure si la p-value est supérieure au seuil de signification (ex: p = 0,23 avec α = 0,05) ?",
      [
        "On ne peut pas rejeter l'hypothèse nulle H0 ; on conclut à une absence de différence statistiquement démontrée (non-rejet ≠ preuve d'égalité).",
        "On a prouvé scientifiquement que les deux traitements sont rigoureusement identiques.",
        "Le test prouve que le nouveau traitement est toxique."
      ],
      [
        "« L'absence de preuve n'est pas la preuve de l'absence » : un manque de puissance statistique (effectif trop faible) peut empêcher de mettre en évidence une différence réelle.",
        "Pour prouver l'équivalence de deux traitements, il faut réaliser un essai spécifique d'équivalence ou de non-infériorité.",
        "Une p-value non significative ne prouve aucune toxicité."
      ]
    ],
    [
      "Quels sont les principaux facteurs qui augmentent la puissance statistique (1 - β) d'une étude ?",
      [
        "Augmenter la taille de l'échantillon n, avoir une taille d'effet biologique importante (grand écart entre moyennes) et réduire la variabilité des mesures (faible variance σ²).",
        "Diminuer le seuil alpha de 5 % à 0,01 %.",
        "Réduire le nombre de patients inclus à 3 sujets."
      ],
      [
        "Plus l'échantillon est grand et le signal fort par rapport au bruit de fond, plus la puissance de détection augmente.",
        "Diminuer le seuil alpha rend le rejet de H0 plus strict et diminue la puissance statistique.",
        "Réduire l'échantillon effondre dramatiquement la puissance du test."
      ]
    ],
    [
      "Quelle différence distingue un test bilatéral (two-tailed) d'un test unilatéral (one-tailed) ?",
      [
        "Le test bilatéral teste une différence dans les deux sens possibles (μ1 ≠ μ2), tandis que le test unilatéral teste une direction a priori unique (μ1 > μ2 ou μ1 < μ2).",
        "Le test bilatéral nécessite obligatoirement deux investigateurs différents.",
        "Le test unilatéral double automatiquement la taille de l'échantillon."
      ],
      [
        "En recherche clinique, le test bilatéral est la règle standard conservatrice car un traitement peut s'avérer supérieur ou inférieur au comparateur.",
        "Le terme bilatéral concerne la distribution de la statistique de test et les deux zones de rejet aux extrémités de la courbe.",
        "L'orientation unilatérale modifie le seuil critique pour un même effectif sans le doubler."
      ]
    ],
    [
      "Pourquoi ne doit-on PAS confondre la « signification statistique » (p < 0,05) et la « pertinence clinique » d'un résultat ?",
      [
        "Avec un très grand échantillon (ex: n = 100 000), une différence minime et sans aucun intérêt médical peut être statistiquement très significative (p < 0,001).",
        "Parce que les statistiques médicales sont purement théoriques et dénuées de validité.",
        "Parce qu'un résultat cliniquement pertinent a obligatoirement une p-value supérieure à 0,50."
      ],
      [
        "La pertinence clinique s'évalue par la taille de l'effet clinique (différence absolue de risque, gain d'espérance de vie) et son intervalle de confiance, pas par la p-value seule.",
        "Les méthodes statistiques sont essentielles pour quantifier l'incertitude dans les essais cliniques.",
        "Un résultat cliniquement pertinent requiert également une démonstration statistique solide."
      ]
    ],
    [
      "Qu'est-ce que le problème des comparaisons multiples (inflation du risque alpha global) lorsque l'on réalise de nombreux tests statistiques simultanés sans correction ?",
      [
        "La probabilité de trouver au moins un résultat faussement positif par simple hasard augmente rapidement avec le nombre k de tests réalisés (1 - (1 - α)^k).",
        "La mémoire de l'ordinateur sature et bloque le logiciel.",
        "La puissance statistique devient négative."
      ],
      [
        "Si l'on réalise 20 tests indépendants au seuil de 5 %, la probabilité d'avoir au moins un faux positif atteint environ 64 %, imposant des corrections (ex: correction de Bonferroni).",
        "Ce n'est pas un problème de capacité mémoire matérielle.",
        "La puissance reste une probabilité positive."
      ]
    ]
  ],

  "stats-comparison-means-z-t": [
    [
      "Quel test statistique paramétrique utilise-t-on pour comparer les moyennes de deux groupes indépendants lorsque la variance de la population est inconnue et estimée sur l'échantillon ?",
      [
        "Le test t de Student pour échantillons indépendants (test t à deux échantillons).",
        "Le test du Chi-2 de conformité.",
        "Le test de corrélation de Spearman."
      ],
      [
        "La statistique t = (x̄1 - x̄2) / SE suit une loi de Student sous H0 avec (n1 + n2 - 2) degrés de liberté (ou approximation de Welch).",
        "Le test du Chi-2 s'applique aux variables qualitatives catégorielles.",
        "Le test de Spearman mesure la corrélation de rangs non linéaire."
      ]
    ],
    [
      "Dans quelle situation théorique applique-t-on le test Z de comparaison de moyennes plutôt que le test t de Student ?",
      [
        "Lorsque la variance de la population σ² est parfaitement connue a priori ou sur de très grands échantillons où la distribution de Student converge vers la loi normale N(0,1).",
        "Uniquement sur de très petits échantillons de taille n = 3.",
        "Lorsque les données sont des photographies sans chiffres."
      ],
      [
        "Le test Z utilise les quantiles de la loi normale centrée réduite N(0,1) lorsque σ est connu ou asymptotiquement.",
        "Sur petits échantillons avec variance inconnue, l'utilisation de la loi de Student est obligatoire pour compenser l'incertitude sur l'estimation de s.",
        "Les tests de moyennes s'appliquent à des variables quantitatives numériques."
      ]
    ],
    [
      "Quelles sont les trois conditions d'application classiques du test t de Student de comparaison de deux moyennes indépendantes (version classique de Student) ?",
      [
        "L'indépendance des observations entre les deux groupes, la normalité de la distribution de la variable dans chaque groupe (ou grands effectifs n ≥ 30), et l'homogénéité des variances (homoscédasticité).",
        "L'appariement strict de chaque patient avec son jumeau.",
        "Une taille d'échantillon exactement égale à 10 dans chaque bras."
      ],
      [
        "Si l'égalité des variances n'est pas respectée, on utilise la variante robuste du test t de Welch (qui n'impose pas l'homogénéité des variances).",
        "L'appariement relève du test t pour séries appariées et non du test pour groupes indépendants.",
        "Les tailles des deux groupes peuvent être différentes (n1 ≠ n2)."
      ]
    ],
    [
      "Qu'est-ce que le test t de Welch pour deux échantillons indépendants ?",
      [
        "Une adaptation du test t de Student qui ne fait pas l'hypothèse d'égalité des variances des deux groupes (hétéroscédasticité) et ajuste les degrés de liberté.",
        "Un test non paramétrique utilisant uniquement la médiane.",
        "Un test exclusivement réservé aux études animales de toxicologie."
      ],
      [
        "Le test de Welch est recommandé par défaut dans les logiciels modernes car il contrôle parfaitement le risque alpha même si σ1² ≠ σ2².",
        "Le test de Welch est un test paramétrique calculé sur les moyennes et variances réelles.",
        "Le test de Welch est très largement utilisé en recherche clinique humaine."
      ]
    ],
    [
      "Comment calcule-t-on les degrés de liberté (ddl) du test t de Student classique pour deux échantillons de tailles n1 et n2 avec variances égales ?",
      [
        "ddl = n1 + n2 - 2.",
        "ddl = n1 × n2.",
        "ddl = n1 + n2."
      ],
      [
        "On perd deux degrés de liberté car on estime deux moyennes d'échantillons distinctes (x̄1 et x̄2) pour calculer la variance combinée.",
        "Le produit n1 × n2 ne correspond pas aux degrés de liberté de Student.",
        "Il faut retrancher les paramètres estimés de l'effectif total."
      ]
    ],
    [
      "Si l'on compare la pression artérielle systolique entre un groupe traité (n1 = 50, x̄1 = 130 mmHg) et un groupe placebo (n2 = 50, x̄2 = 142 mmHg), avec une différence de -12 mmHg et un IC 95 % [-16 mmHg ; -8 mmHg], que peut-on déduire du test t au seuil de 5 % ?",
      [
        "L'intervalle de confiance à 95 % ne contenant pas la valeur 0, la différence de moyennes est statistiquement significative au seuil α = 0,05 (p < 0,05).",
        "La différence n'est pas significative car l'intervalle contient des nombres négatifs.",
        "Le test est non concluant car les deux groupes ont la même taille."
      ],
      [
        "L'exclusion de la valeur nulle (0) par l'IC 95 % d'une différence de moyennes est strictement équivalente au rejet de H0 au seuil bilatéral de 5 %.",
        "Le signe négatif indique simplement que la moyenne du groupe traité est inférieure à celle du placebo (baisse de tension recherchée).",
        "Avoir des groupes de même taille (n1 = n2) maximise la puissance statistique."
      ]
    ],
    [
      "Quel test non paramétrique alternatif utilise-t-on si la variable quantitative n'est pas distribuée normalement sur de très petits échantillons indépendants (ex: n1 = 6, n2 = 7) ?",
      [
        "Le test de Mann-Whitney (ou test de Wilcoxon pour échantillons indépendants).",
        "Le test de Student apparié.",
        "Le test du Chi-2 de McNemar."
      ],
      [
        "Le test de Mann-Whitney compare les sommes des rangs des deux groupes sans exiger la normalité de la distribution.",
        "Le test apparié s'applique aux mesures répétées chez les mêmes sujets.",
        "Le test de McNemar s'applique aux variables qualitatives binaires appariées."
      ]
    ],
    [
      "Qu'est-ce que la variance combinée (pooled variance sp²) utilisée dans le test t de Student standard ?",
      [
        "La moyenne pondérée des variances des deux échantillons par leurs degrés de liberté respectifs sous l'hypothèse d'homogénéité des variances.",
        "La somme des moyennes des deux groupes.",
        "Le rapport entre la plus grande et la plus petite observation."
      ],
      [
        "sp² = [(n1 - 1)s1² + (n2 - 1)s2²] / (n1 + n2 - 2), fournissant une meilleure estimation de la variance commune σ².",
        "La variance combinée est une mesure de dispersion quadratique, pas une somme de moyennes.",
        "Ce rapport ne correspond pas à la variance combinée."
      ]
    ],
    [
      "Comment se comporte la loi de Student lorsque le nombre de degrés de liberté devient très grand (ex: ddl > 100) ?",
      [
        "Elle converge vers la loi normale centrée réduite N(0, 1).",
        "Elle devient une loi de Poisson uniforme.",
        "Sa variance devient infinie."
      ],
      [
        "Pour de grands effectifs, les queues de distribution plus épaisses de Student se réduisent et épousent la courbe de Gauss normale.",
        "La loi de Student reste continue et ne devient pas une loi de Poisson discrète.",
        "La variance de Student ddl/(ddl-2) tend vers 1 lorsque ddl tend vers l'infini."
      ]
    ],
    [
      "Pourquoi est-il crucial de rapporter la différence moyenne observée avec son intervalle de confiance à 95 % plutôt que la seule p-value ?",
      [
        "Parce que l'IC 95 % renseigne à la fois sur la magnitude de l'effet clinique, sa direction et la précision de l'estimation, alors que la p-value ne donne qu'un résultat binaire de signification.",
        "Parce que l'intervalle de confiance remplace le diagnostic clinique du médecin.",
        "Parce que la p-value est interdite dans les journaux médicaux internationaux."
      ],
      [
        "Les recommandations internationales (CONSORT, ICMJE) exigent la présentation des tailles d'effet avec leurs intervalles de confiance.",
        "L'IC quantifie l'incertitude statistique mais ne remplace pas l'évaluation clinique globale.",
        "La p-value est rapportée conjointement à l'intervalle de confiance."
      ]
    ]
  ],

  "stats-comparison-proportions-chi2": [
    [
      "Quel test statistique utilise-t-on classiquement pour comparer les pourcentages ou proportions observés dans deux ou plusieurs groupes indépendants à l'aide d'un tableau de contingence ?",
      [
        "Le test du Chi-2 d'homogénéité (ou d'indépendance) de Pearson.",
        "Le test t de Student pour séries appariées.",
        "L'analyse de variance à mesures répétées."
      ],
      [
        "Le test du Chi-2 compare les effectifs observés aux effectifs théoriques (attendus sous l'hypothèse d'indépendance).",
        "Le test t de Student s'applique à des moyennes quantitatives.",
        "L'ANOVA s'applique à des variables quantitatives continues."
      ]
    ],
    [
      "Comment calcule-t-on l'effectif théorique attendu (E_ij) d'une case (ligne i, colonne j) d'un tableau de contingence sous l'hypothèse d'indépendance H0 ?",
      [
        "E_ij = (Total de la ligne i × Total de la colonne j) / Grand total N.",
        "E_ij = Total de la ligne i + Total de la colonne j.",
        "E_ij = N / Nombre total de cases."
      ],
      [
        "Cette formule applique la règle de multiplication des probabilités indépendantes : P(Ligne i ∩ Colonne j) = P(Ligne i) × P(Colonne j).",
        "L'addition des totaux marginaux n'a pas de sens probabiliste.",
        "Cette répartition équiprobable ne prendrait pas en compte les marges observées."
      ]
    ],
    [
      "Quelle est la formule générale de la statistique de test du Chi-2 (χ²) de Pearson ?",
      [
        "χ² = ∑ [(Observé - Attendu)² / Attendu].",
        "χ² = ∑ (Observé - Attendu).",
        "χ² = Moyenne / Écart-type."
      ],
      [
        "On somme les écarts quadratiques standardisés sur toutes les cellules du tableau ; plus χ² est grand, plus les données s'écartent de H0.",
        "La somme des simples écarts (Observé - Attendu) est toujours rigoureusement égale à zéro.",
        "Cette formule correspond au score Z de standardisation d'une variable quantitative."
      ]
    ],
    [
      "Quelles sont les conditions de validité classiques de Cochran pour appliquer le test asymptotique du Chi-2 sur un tableau de contingence ?",
      [
        "L'effectif total N doit être suffisant (N ≥ 20) et tous les effectifs théoriques attendus (E_ij) doivent être supérieurs ou égaux à 5 (au moins 80 % des cases ≥ 5 et aucun < 1).",
        "Tous les pourcentages doivent être strictement égaux à 50 %.",
        "L'étude doit inclure au moins 10 000 participants."
      ],
      [
        "Si les effectifs théoriques attendus sont trop faibles (< 5), l'approximation continue par la loi du Chi-2 n'est plus valide.",
        "Les pourcentages observés peuvent prendre n'importe quelle valeur.",
        "Un échantillon de taille modérée (quelques dizaines à centaines de sujets) suffit si les effectifs théoriques dépassent 5."
      ]
    ],
    [
      "Quel test exact non paramétrique doit-on utiliser pour un tableau 2×2 lorsque les effectifs théoriques sont insuffisants (< 5) pour valider le Chi-2 ?",
      [
        "Le test exact de Fisher (calculant la probabilité hypergéométrique exacte de la table observée).",
        "Le test Z de Gauss asymptotique.",
        "La régression linéaire multiple."
      ],
      [
        "Le test de Fisher calcule directement la probabilité exacte des permutations conditionnelles sans approximation asymptotique.",
        "Le test Z repose sur la même approximation asymptotique que le Chi-2.",
        "La régression linéaire modélise une variable quantitative continue."
      ]
    ],
    [
      "Combien de degrés de liberté (ddl) possède un test du Chi-2 appliqué à un tableau de contingence de R lignes et C colonnes ?",
      [
        "ddl = (R - 1) × (C - 1).",
        "ddl = R × C.",
        "ddl = R + C - 1."
      ],
      [
        "Pour un tableau 2×2 standard, ddl = (2 - 1) × (2 - 1) = 1 degré de liberté (valeur critique à 5 % = 3,84).",
        "Le nombre de degrés de liberté est réduit par les contraintes marginales fixées.",
        "Cette formule est inexacte pour les tableaux de contingence."
      ]
    ],
    [
      "Quelle est la valeur seuil critique du Chi-2 à 1 degré de liberté pour un seuil de signification α = 0,05 ?",
      [
        "χ²_critique = 3,84 (qui correspond à 1,96²).",
        "χ²_critique = 1,00.",
        "χ²_critique = 10,50."
      ],
      [
        "Si la statistique χ² calculée est strictement supérieure à 3,84, on rejette H0 au seuil de 5 % (p < 0,05).",
        "1,00 est une valeur beaucoup trop basse sous laquelle H0 n'est jamais rejetée.",
        "10,50 correspond à un seuil très strict de p < 0,001 à 1 ddl."
      ]
    ],
    [
      "Qu'est-ce que la correction de continuité de Yates pour le test du Chi-2 à 1 degré de liberté (tableau 2×2) ?",
      [
        "Une soustraction de 0,5 à la valeur absolue de chaque écart |Observé - Attendu| pour corriger le passage d'une distribution discrète à une loi continue.",
        "Une multiplication par 2 de tous les effectifs observés.",
        "L'exclusion arbitraire de la première colonne du tableau."
      ],
      [
        "La correction de Yates rend le test plus conservateur en évitant de surestimer la signification statistique sur des effectifs modérés.",
        "Multiplier les effectifs réduirait artificiellement la variance et fausserait le test.",
        "Toutes les colonnes du tableau doivent être conservées."
      ]
    ],
    [
      "Quel test statistique spécifique doit-on utiliser pour comparer deux proportions mesurées sur des séries appariées (ex: même patient avant et après traitement avec réponse binaire Oui/Non) ?",
      [
        "Le test du Chi-2 de McNemar (portant sur les paires discordantes).",
        "Le test du Chi-2 d'indépendance de Pearson standard.",
        "Le test t de Student pour échantillons indépendants."
      ],
      [
        "Le test de McNemar prend en compte la corrélation intra-sujet et analyse uniquement les changements de statut (b et c dans la table 2×2 appariée).",
        "Le Chi-2 standard fait l'hypothèse d'indépendance des observations, violée dans les plans appariés.",
        "Le test t compare des moyennes continues, pas des proportions binaires."
      ]
    ],
    [
      "Quelle est la relation mathématique exacte entre la statistique Z d'un test de comparaison de deux proportions et la statistique χ² du Chi-2 à 1 ddl ?",
      [
        "χ² = Z²  (la statistique du Chi-2 à 1 ddl est rigoureusement le carré du score Z).",
        "χ² = √Z.",
        "χ² = Z / 2."
      ],
      [
        "Le test bilatéral de comparaison de deux proportions par loi normale (test Z) et le test du Chi-2 à 1 ddl donnent des p-values rigoureusement identiques (ex: 1,96² = 3,84).",
        "La relation est quadratique et non une racine carrée.",
        "La statistique du Chi-2 est le carré de la statistique normale standardisée."
      ]
    ]
  ],

  "stats-paired-samples-tests": [
    [
      "Pourquoi utilise-t-on un protocole d'étude à « séries appariées » (mesures répétées chez le même sujet ou paires appariées) ?",
      [
        "Pour éliminer la variabilité interindividuelle en utilisant chaque sujet comme son propre témoin, ce qui augmente considérablement la puissance statistique.",
        "Pour doubler artificiellement le nombre de patients sans les recruter.",
        "Pour éviter de devoir mesurer le critère de jugement clinique."
      ],
      [
        "L'analyse porte directement sur les différences intra-paires (d_i = Après_i - Avant_i), neutralisant les facteurs de confusion individuels stables.",
        "Le nombre de sujets réels reste identique, chaque sujet fournissant deux mesures.",
        "Le critère doit obligatoirement être mesuré à chaque temps du protocole."
      ]
    ],
    [
      "Quel test statistique paramétrique utilise-t-on pour comparer les moyennes d'une variable quantitative continue mesurée avant et après intervention sur les mêmes individus ?",
      [
        "Le test t de Student pour séries appariées (paired t-test).",
        "Le test t de Student pour deux échantillons indépendants.",
        "Le test du Chi-2 de Pearson."
      ],
      [
        "Le test t apparié calcule la différence d_i = x_après - x_avant pour chaque sujet et teste si la moyenne de ces différences d̄ diffère significativement de 0.",
        "Le test pour échantillons indépendants ignore le lien intra-sujet et perdrait une grande partie de la puissance de détection.",
        "Le Chi-2 compare des fréquences catégorielles et non des moyennes continues."
      ]
    ],
    [
      "Quelle est la formule de la statistique de test t pour séries appariées sur n paires ?",
      [
        "t = d̄ / (s_d / √n), où d̄ est la moyenne des différences individuelles et s_d l'écart-type de ces différences.",
        "t = (x̄1 - x̄2) / (s1 + s2).",
        "t = n × d̄."
      ],
      [
        "La statistique t suit une loi de Student à (n - 1) degrés de liberté sous H0 (d̄_pop = 0).",
        "Cette formule ignore l'erreur-type de la moyenne des différences appariées.",
        "Multiplier par n ne prend pas en compte la dispersion des écarts."
      ]
    ],
    [
      "Combien de degrés de liberté (ddl) possède un test t de Student apparié réalisé sur n paires de mesures ?",
      [
        "ddl = n - 1.",
        "ddl = 2n - 2.",
        "ddl = n / 2."
      ],
      [
        "Puisque l'analyse porte sur la série unique des n différences individuelles, le nombre de degrés de liberté est égal au nombre de paires moins 1.",
        "2n - 2 correspond aux degrés de liberté de deux groupes indépendants de n sujets.",
        "Cette division ne correspond à aucune règle de degrés de liberté."
      ]
    ],
    [
      "Quel test non paramétrique alternatif utilise-t-on pour comparer deux séries appariées lorsque la distribution des différences n'est pas gaussienne sur un petit échantillon ?",
      [
        "Le test des rangs signés de Wilcoxon pour séries appariées (Wilcoxon signed-rank test).",
        "Le test de Mann-Whitney pour échantillons indépendants.",
        "Le test du Chi-2 d'homogénéité."
      ],
      [
        "Le test de Wilcoxon apparié prend en compte à la fois le signe (+ ou -) et le rang de la magnitude de chaque différence individuelle.",
        "Mann-Whitney s'applique à deux groupes indépendants non appariés.",
        "Le Chi-2 d'homogénéité s'applique à des variables qualitatives."
      ]
    ],
    [
      "Quel test statistique est spécifiquement adapté pour comparer des proportions binaires appariées (ex: succès/échec avant et après traitement chez les mêmes patients) ?",
      [
        "Le test de McNemar.",
        "Le test t de Student indépendant.",
        "Le test de Log-Rank pour courbes de survie."
      ],
      [
        "Dans la table de contingence 2×2 des paires, la statistique de McNemar vaut (|b - c| - 1)² / (b + c), se concentrant sur les paires discordantes.",
        "Le test t compare des moyennes quantitatives.",
        "Le test de Log-Rank compare des fonctions de survie au cours du temps."
      ]
    ],
    [
      "Dans un test de McNemar sur tableau 2×2 apparié, pourquoi les paires concordantes (cellules a et d : succès aux deux temps ou échec aux deux temps) ne sont-elles pas utilisées dans le calcul du test ?",
      [
        "Parce qu'elles représentent des sujets dont l'état n'a pas changé entre avant et après, n'apportant aucune information sur l'effet différentiel du traitement.",
        "Parce qu'elles correspondent à des erreurs de laboratoire éliminées.",
        "Parce que leur effectif est toujours égal à zéro."
      ],
      [
        "Seuls les sujets ayant changé de statut (succès devenu échec ou échec devenu succès) permettent de tester si une direction de changement prédomine.",
        "Ces paires sont parfaitement valides mais stables.",
        "Les paires concordantes représentent souvent la majorité de l'échantillon."
      ]
    ],
    [
      "Que devient une paire de mesures si l'une des deux données (avant ou après) est manquante dans une analyse appariée classique ?",
      [
        "La paire entière est exclue de l'analyse appariée (analyse par cas complets), réduisant l'effectif effectif n.",
        "La donnée manquante est automatiquement remplacée par 1 000.",
        "L'ordinateur invente une mesure aléatoire sans le signaler."
      ],
      [
        "La perte de suivi d'un temps de mesure exclut le sujet de l'analyse appariée simple, soulignant l'importance des modèles mixtes pour données répétées en cas de perdus de vue.",
        "Remplacer par une valeur arbitraire biaiserait gravement les résultats.",
        "Les logiciels scientifiques n'imputent pas de données à l'insu de l'utilisateur."
      ]
    ],
    [
      "Quelle hypothèse nulle (H0) teste-t-on formellement dans un test t de Student pour séries appariées ?",
      [
        "La moyenne des différences individuelles dans la population est égale à zéro (μ_d = 0).",
        "La variance de la population est infinie.",
        "Tous les patients ont exactement la même valeur absolue."
      ],
      [
        "H0 stipule qu'en moyenne dans la population, le traitement n'induit aucune modification du paramètre mesuré.",
        "Cette proposition n'a pas de sens dans le cadre du test d'hypothèse.",
        "Les valeurs individuelles diffèrent naturellement ; c'est l'espérance de leur différence qui est testée à 0."
      ]
    ],
    [
      "Si l'on applique par erreur un test t pour échantillons indépendants sur des données fortement appariées et corrélées, quelle en est la conséquence statistique majeure ?",
      [
        "Une perte majeure de puissance statistique (augmentation du risque bêta de ne pas détecter un effet réel) en incluant la variance interindividuelle dans le dénominateur.",
        "Une explosion du risque alpha à 100 %.",
        "L'impossibilité mathématique d'effectuer la division."
      ],
      [
        "La variance de la différence est s_d² = s1² + s2² - 2·cov(X1, X2) ; ignorer la covariance positive gonfle l'erreur-type et rend le test faussement conservateur.",
        "Le risque alpha reste contrôlé ou devient trop conservateur.",
        "Le calcul mathématique s'exécute mais aboutit à un résultat sous-optimal et inapproprié."
      ]
    ]
  ],

  "stats-non-parametric-tests": [
    [
      "Dans quelles situations doit-on privilégier l'utilisation d'un test statistique non paramétrique ?",
      [
        "Lorsque la variable est ordinale, lorsque la distribution est très asymétrique sur de petits échantillons (n < 30), ou en présence de valeurs extrêmes aberrantes violant les conditions de normalité.",
        "Uniquement lorsque l'échantillon dépasse un million de personnes.",
        "Lorsque l'on souhaite garantir une p-value égale à 0."
      ],
      [
        "Les tests non paramétriques (tests sans distribution) ne font aucune hypothèse sur la forme paramétrique de la loi sous-jacente.",
        "Sur très grands échantillons, le théorème central limite autorise l'usage des tests paramétriques.",
        "Aucun test statistique ne peut garantir a priori une p-value prédéterminée."
      ]
    ],
    [
      "Sur quel principe fondamental reposent la plupart des tests non paramétriques classiques (comme Mann-Whitney ou Kruskal-Wallis) ?",
      [
        "La transformation des valeurs quantitatives brutes en rangs ordonnés (du plus petit au plus grand) et l'analyse de la somme des rangs dans chaque groupe.",
        "L'élévation de toutes les valeurs au carré avant régression.",
        "Le calcul exclusif de la moyenne arithmétique et de l'écart-type."
      ],
      [
        "Le classement par rangs neutralise l'impact démesuré des valeurs extrêmes aberrantes tout en conservant l'information d'ordre.",
        "L'élévation au carré accentuerait l'asymétrie.",
        "Ce sont les tests paramétriques qui reposent sur les moyennes et variances."
      ]
    ],
    [
      "Quel test non paramétrique est l'équivalent du test t de Student pour deux échantillons indépendants ?",
      [
        "Le test U de Mann-Whitney (ou test de la somme des rangs de Wilcoxon pour groupes indépendants).",
        "Le test des rangs signés de Wilcoxon pour séries appariées.",
        "Le test de Kruskal-Wallis à 5 groupes."
      ],
      [
        "Le test de Mann-Whitney teste si la distribution d'une variable tend à prendre des valeurs plus élevées dans un groupe que dans l'autre.",
        "Le test des rangs signés s'applique aux séries appariées.",
        "Kruskal-Wallis s'applique à la comparaison de 3 groupes ou plus (équivalent de l'ANOVA)."
      ]
    ],
    [
      "Quel test non paramétrique est l'équivalent du test t de Student pour séries appariées ?",
      [
        "Le test des rangs signés de Wilcoxon (Wilcoxon signed-rank test).",
        "Le test de Mann-Whitney.",
        "Le test du Chi-2 d'indépendance."
      ],
      [
        "Le test des rangs signés de Wilcoxon classe les valeurs absolues des différences intra-paires et leur réaffecte leur signe d'origine.",
        "Mann-Whitney compare deux groupes indépendants non appariés.",
        "Le Chi-2 s'applique aux tables de contingence catégorielles."
      ]
    ],
    [
      "Quel test non paramétrique permet de comparer plus de deux groupes indépendants (équivalent non paramétrique de l'ANOVA à un facteur) ?",
      [
        "Le test de Kruskal-Wallis (analyse de variance par rangs).",
        "Le test de Friedman.",
        "Le test t de Student à deux échantillons."
      ],
      [
        "Kruskal-Wallis généralise le test de Mann-Whitney à k groupes indépendants (k ≥ 3).",
        "Le test de Friedman est l'équivalent de l'ANOVA à mesures répétées (groupes appariés).",
        "Le test t est limité à la comparaison de deux groupes seulement."
      ]
    ],
    [
      "Quel est le test non paramétrique équivalent à l'ANOVA pour mesures répétées (comparaison de k mesures appariées chez les mêmes sujets) ?",
      [
        "Le test de Friedman.",
        "Le test de Kruskal-Wallis.",
        "Le test de Fisher exact."
      ],
      [
        "Le test de Friedman analyse les rangs attribués au sein de chaque bloc (patient) à travers les différentes conditions expérimentales.",
        "Kruskal-Wallis s'applique à des groupes indépendants.",
        "Fisher exact s'applique aux tableaux de contingence 2×2."
      ]
    ],
    [
      "Quel coefficient non paramétrique permet de quantifier la liaison monotone entre deux variables quantitatives ou ordinales sans supposer de relation linéaire ?",
      [
        "Le coefficient de corrélation de rangs de Spearman (rho de Spearman) ou le tau de Kendall.",
        "Le coefficient r de Pearson linéaire standard.",
        "La constante diélectrique de l'eau."
      ],
      [
        "Le rho de Spearman calcule la corrélation de Pearson appliquée aux rangs des observations, mesurant toute relation monotone croissante ou décroissante.",
        "Le coefficient de Pearson ne mesure que les liaisons strictement linéaires entre variables gaussiennes.",
        "La constante diélectrique est une propriété physique sans rapport."
      ]
    ],
    [
      "Quel est le principal inconvénient d'un test non paramétrique lorsqu'il est appliqué à des données parfaitement gaussiennes ?",
      [
        "Une légère perte d'efficacité et de puissance statistique comparé au test paramétrique optimal (efficacité relative d'environ 95 % pour Mann-Whitney).",
        "Un risque alpha qui passe automatiquement à 50 %.",
        "L'impossibilité d'obtenir une p-value calculable."
      ],
      [
        "En transformant les valeurs réelles en simples rangs, on perd une petite fraction de l'information quantitative, mais la perte de puissance reste très minime.",
        "Le risque alpha reste parfaitement contrôlé au seuil fixé.",
        "Les logiciels calculent exactement la p-value des tests non paramétriques."
      ]
    ],
    [
      "Pourquoi les tests non paramétriques sont-ils qualifiés de « robustes » ?",
      [
        "Parce qu'ils ne sont pas influencés par la présence de valeurs aberrantes extrêmes ni par les formes de distribution non conventionnelles.",
        "Parce qu'ils ne nécessitent aucun calcul informatique.",
        "Parce qu'ils donnent toujours un résultat conforme aux attentes du chercheur."
      ],
      [
        "Remplacer une valeur extrême de 10 000 par son rang (ex: rang 20) neutralise son effet de levier destructeur sur la moyenne et l'écart-type.",
        "Le calcul des permutations de rangs exige une puissance de calcul combinatoire substantielle.",
        "La robustesse statistique signifie l'insensibilité aux violations d'hypothèses, pas la partialité des résultats."
      ]
    ],
    [
      "Comment gère-t-on les valeurs identiques (ex-aequo / ties) lors de l'attribution des rangs dans un test non paramétrique ?",
      [
        "On attribue à chaque valeur ex-aequo la moyenne des rangs qu'elles auraient occupés si elles avaient été distinctes.",
        "On supprime immédiatement toutes les valeurs en double de l'étude.",
        "On tire au sort le gagnant à pile ou face."
      ],
      [
        "Par exemple, si les 3e et 4e valeurs sont identiques, on leur attribue à chacune le rang moyen (3 + 4) / 2 = 3,5.",
        "Supprimer des données réelles introduirait un biais injustifié.",
        "Le rang moyen est la méthode standard déterministe adoptée par tous les logiciels statistiques."
      ]
    ]
  ],

  "stats-correlation-linear-regression": [
    [
      "Quelle est la première étape indispensable avant de calculer un coefficient de corrélation linéaire entre deux variables quantitatives X et Y ?",
      [
        "Tracer le nuage de points (diagramme de dispersion / scatter plot) pour visualiser la forme de la relation et détecter d'éventuelles non-linéarités ou valeurs aberrantes.",
        "Diviser immédiatement X par Y sans regarder les données.",
        "Transformer toutes les données en pourcentages binaires."
      ],
      [
        "Le quartet d'Anscombe illustre que des nuages de points totalement différents (linéaire, parabolique, valeur aberrante) peuvent avoir exactement le même coefficient r.",
        "Cette division ne renseigne pas sur la structure de la corrélation.",
        "La dichotomisation arbitraire détruit l'information quantitative continue."
      ]
    ],
    [
      "Entre quelles valeurs est obligatoirement compris le coefficient de corrélation linéaire de Pearson r ?",
      [
        "-1 ≤ r ≤ +1 (où r = +1 indique une relation linéaire positive parfaite, r = -1 une relation linéaire négative parfaite et r = 0 l'absence de relation linéaire).",
        "0 ≤ r ≤ +∞.",
        "-100 ≤ r ≤ +100 sans unité."
      ],
      [
        "Le signe de r indique le sens de la pente et sa valeur absolue la force de l'alignement des points le long d'une droite.",
        "Le coefficient de corrélation de Pearson est un indice sans dimension borné entre -1 et +1.",
        "r ne s'exprime pas en pourcentage de -100 à +100 dans la convention mathématique standard."
      ]
    ],
    [
      "Pourquoi ne doit-on JAMAIS confondre « corrélation » et « causalité » en épidémiologie médicale ?",
      [
        "Une forte corrélation statistique entre deux variables peut être due au simple hasard, à une causalité inverse ou à un facteur de confusion commun (ex: consommation de glaces et noyades estivales liées à la température).",
        "Parce que la corrélation n'est calculable que sur les cadavres.",
        "Parce que la causalité n'existe jamais en médecine."
      ],
      [
        "Pour établir un lien de causalité, il faut réunir les critères de Bradford Hill (séquence temporelle, force d'association, gradient dose-réponse, plausibilité biologique, etc.).",
        "La corrélation s'applique à tout échantillon biologique vivant ou inanimé.",
        "La médecine fondée sur les preuves s'efforce d'établir des liens causaux rigoureux."
      ]
    ],
    [
      "Que représente le coefficient de détermination R² (ou r²) dans un modèle de régression linéaire simple ?",
      [
        "La proportion de la variance totale de la variable dépendante Y expliquée par le modèle linéaire en fonction de X (comprise entre 0 et 1, ou 0 % et 100 %).",
        "Le taux de survie des patients à 5 ans.",
        "La pente de la droite de régression en degrés."
      ],
      [
        "Un R² = 0,64 signifie que 64 % de la variabilité de Y est expliquée par la droite de régression sur X.",
        "R² est un indicateur de qualité d'ajustement statistique, pas un taux de survie clinique.",
        "La pente de la droite est le coefficient β1 exprimé dans les unités de Y par unité de X."
      ]
    ],
    [
      "Dans l'équation de régression linéaire simple Y = β0 + β1 · X + ε, quelle est la signification du coefficient de pente β1 ?",
      [
        "La variation moyenne attendue de la variable Y pour chaque augmentation d'une unité de la variable X.",
        "La valeur de Y lorsque X est égal à l'infini.",
        "L'âge moyen des participants à l'étude."
      ],
      [
        "Si β1 = 2,5 mmHg/kg, chaque prise de 1 kg de poids corporel s'accompagne en moyenne d'une élévation de 2,5 mmHg de la pression artérielle.",
        "La constante β0 (ordonnée à l'origine) représente la valeur moyenne attendue de Y lorsque X = 0.",
        "Le coefficient β1 est une pente mathématique, pas une moyenne d'âge."
      ]
    ],
    [
      "Sur quel critère mathématique repose la méthode d'estimation des Moindres Carrés Ordinaires (MCO) pour ajuster la droite de régression ?",
      [
        "Minimiser la somme des carrés des résidus verticaux (écarts entre les valeurs de Y observées et les valeurs de Y prédites par la droite).",
        "Maximiser la distance entre les points et la droite.",
        "Faire passer la droite par le plus grand nombre possible de points entiers."
      ],
      [
        "La droite des moindres carrés passe obligatoirement par le point moyen (x̄, ȳ) et rend minimale la variance résiduelle inexpliquée.",
        "Minimiser l'erreur quadratique est le principe fondamental, pas la maximiser.",
        "La droite ajuste la tendance globale sans nécessairement toucher aucun point individuel."
      ]
    ],
    [
      "Pourquoi est-il dangereux d'utiliser une équation de régression pour faire des prédictions en « extrapolation » (au-delà de la plage des valeurs observées de X) ?",
      [
        "Parce que la relation linéaire observée dans l'intervalle d'étude peut devenir non linéaire, saturer ou s'inverser en dehors de cette zone.",
        "Parce que l'ordinateur refuse d'effectuer le calcul.",
        "Parce que la régression ne fonctionne qu'entre 0 et 10."
      ],
      [
        "Par exemple, extrapoler la croissance d'un enfant de 5 ans jusqu'à 40 ans prédirait une taille absurde de 3 mètres.",
        "Le logiciel effectuera le calcul mathématique mais la prédiction sera biologiquement infondée.",
        "La régression s'applique sur n'importe quel intervalle de mesure continu."
      ]
    ],
    [
      "Qu'est-ce qu'un « point aberrant » (outlier) à fort effet de levier dans une régression linéaire ?",
      [
        "Une observation isolée très éloignée de la moyenne des X et/ou des Y qui peut à elle seule modifier drastiquement la pente et la significativité de la droite de régression.",
        "Un point situé exactement au centre du nuage de points.",
        "Une donnée manquante non enregistrée."
      ],
      [
        "L'analyse des résidus et des distances de Cook permet d'identifier ces points influents qui faussent l'ajustement global.",
        "Le point central n'a aucun effet de levier sur la pente.",
        "Une donnée manquante ne figure pas sur le graphique."
      ]
    ],
    [
      "Quelle hypothèse nulle (H0) teste-t-on lors du test de significativité de la pente d'une régression linéaire simple ?",
      [
        "La pente populationnelle est nulle (β1 = 0), signifiant l'absence de relation linéaire entre X et Y.",
        "L'ordonnée à l'origine est égale à 100.",
        "Tous les résidus sont strictement positifs."
      ],
      [
        "Si la pente n'est pas significativement différente de 0 (p > 0,05), la variable X n'aide pas à prédire Y de façon linéaire.",
        "Le test standard porte sur la pente β1 et non sur l'ordonnée à l'origine.",
        "Par construction, la moyenne des résidus est nulle avec des valeurs positives et négatives."
      ]
    ],
    [
      "Si le coefficient de corrélation linéaire entre deux variables est r = 0, peut-on affirmer qu'il n'existe aucune relation entre elles ?",
      [
        "Non, cela indique seulement l'absence de relation linéaire ; il peut exister une forte relation non linéaire (ex: relation quadratique parabolique en U).",
        "Oui, r = 0 prouve l'indépendance totale absolue dans tous les cas.",
        "Oui, cela prouve que les deux variables sont identiques."
      ],
      [
        "Pour une parabole parfaite Y = X² centrée sur 0, la relation est déterministe mais le coefficient de Pearson r est rigoureusement égal à 0.",
        "Pearson ne détecte que les composantes linéaires ; pour tester l'indépendance non linéaire, on utilise d'autres outils (information mutuelle, tests non paramétriques).",
        "Deux variables identiques auraient un r = +1, pas r = 0."
      ]
    ]
  ],

  "stats-measures-of-association-rr-or": [
    [
      "Dans quel type de plan d'étude épidémiologique peut-on calculer directement et légitimement le Risque Relatif (RR) ?",
      [
        "Dans les études de cohorte prospectives ou les essais cliniques randomisés (où les incidences chez les exposés et non-exposés sont directement mesurables).",
        "Dans les études cas-témoins rétrospectives sans incidence mesurable.",
        "Dans les études de séries de cas descriptives pures."
      ],
      [
        "Le RR est le rapport de l'incidence chez les exposés (I_e) sur l'incidence chez les non-exposés (I_ne) : RR = I_e / I_ne.",
        "Dans les études cas-témoins, le nombre de cas et de témoins est fixé par l'investigateur, rendant impossible le calcul direct des taux d'incidence réels.",
        "Une série de cas sans groupe témoin ne permet pas de calculer de risque comparatif."
      ]
    ],
    [
      "Quelle mesure d'association doit-on utiliser par excellence dans une étude cas-témoins ?",
      [
        "L'Odds Ratio (OR / rapport de cotes, calculé par le produit en croix des effectifs : OR = (a·d) / (b·c)).",
        "Le Risque Relatif direct (RR).",
        "La moyenne arithmétique de la glycémie.",
        "Le test t de Student apparié."
      ],
      [
        "L'Odds Ratio estime convenablement le Risque Relatif lorsque la maladie étudiée est rare dans la population (hypothèse de maladie rare).",
        "Le RR ne peut pas être calculé directement dans un schéma cas-témoins standard.",
        "La moyenne n'est pas une mesure d'association épidémiologique binaire.",
        "Le test t n'est pas une mesure d'association pour table 2×2."
      ]
    ],
    [
      "Comment interprète-t-on un Risque Relatif de RR = 1,00 ?",
      [
        "Absence d'association entre l'exposition et la maladie (le risque est strictement identique chez les exposés et les non-exposés).",
        "L'exposition multiplie le risque de maladie par 10.",
        "L'exposition protège totalement contre la maladie (risque nul)."
      ],
      [
        "La valeur 1,00 correspond à la valeur d'indifférence (hypothèse nulle H0) pour les mesures d'association relatives (RR et OR).",
        "Un risque décuplé correspondrait à un RR = 10,0.",
        "Une protection totale correspondrait à un RR = 0,0."
      ]
    ],
    [
      "Comment interprète-t-on un Risque Relatif de RR = 2,50 (avec IC 95 % [1,80 ; 3,40]) ?",
      [
        "Les sujets exposés ont un risque de développer la maladie 2,5 fois plus élevé que les non-exposés (augmentation de 150 % du risque), résultat statistiquement significatif au seuil de 5 %.",
        "Le traitement guérit 2,5 % des patients.",
        "L'exposition diminue le risque de 2,5 fois."
      ],
      [
        "L'IC 95 % ne contenant pas la valeur nulle 1,00, l'augmentation de risque est statistiquement significative.",
        "Le RR n'est pas un taux de guérison brut.",
        "Un RR > 1 indique un facteur de risque péjoratif et non un facteur protecteur."
      ]
    ],
    [
      "Comment interprète-t-on un Risque Relatif de RR = 0,60 (avec IC 95 % [0,45 ; 0,80]) pour un nouveau vaccin ?",
      [
        "L'intervention est protectrice : elle réduit le risque d'infection de 40 % (1 - RR = 1 - 0,60 = 0,40 d'efficacité vaccinale relative) par rapport au groupe témoin.",
        "Le vaccin augmente les contaminations de 60 %.",
        "Le vaccin est totalement inefficace car RR < 1."
      ],
      [
        "L'Efficacité Relative d'une intervention préventive est donnée par RRR = 1 - RR ; l'IC 95 % exclut 1,00, confirmant la protection significative.",
        "Une augmentation correspondrait à un RR supérieur à 1.",
        "Un RR inférieur à 1 prouve l'effet protecteur bénéfique de la vaccination."
      ]
    ],
    [
      "Qu'est-ce que le Risque Absolu (ou Différence de Risques / Réduction Absolue de Risque ARR) ?",
      [
        "La différence arithmétique simple entre le taux d'événements chez les exposés et le taux chez les non-exposés (ARR = |I_e - I_ne|).",
        "Le produit des deux risques.",
        "Le rapport des deux cotes d'exposition."
      ],
      [
        "Le risque absolu quantifie le fardeau réel de la maladie dans la population et permet d'éviter l'illusion de grands pourcentages relatifs sur des risques initiaux minimes.",
        "Le produit n'a pas de signification clinique en épidémiologie.",
        "C'est la définition de l'Odds Ratio."
      ]
    ],
    [
      "Comment calcule-t-on le « Nombre de Sujets à Traiter » (NNT / Number Needed to Treat) pour éviter un événement clinique défavorable ?",
      [
        "NNT = 1 / ARR (l'inverse de la Réduction Absolue de Risque).",
        "NNT = 1 / Risque Relatif.",
        "NNT = Nombre total de lits dans l'hôpital."
      ],
      [
        "Si l'ARR est de 5 % (0,05), NNT = 1 / 0,05 = 20 : il faut traiter 20 patients pendant la durée de l'étude pour éviter 1 événement défavorable supplémentaire.",
        "Le NNT se calcule à partir de la différence absolue et non du ratio relatif.",
        "Cette proposition est sans rapport avec le calcul pharmaco-épidémiologique."
      ]
    ],
    [
      "Qu'est-ce que la « cote » (odds) d'un événement de probabilité p ?",
      [
        "Le rapport entre la probabilité de survenue de l'événement et la probabilité de sa non-survenue : Odds = p / (1 - p).",
        "La probabilité p multipliée par 100.",
        "L'écart-type de la population divisé par 2."
      ],
      [
        "Si la probabilité de gagner est p = 0,80, la cote est de 0,80 / 0,20 = 4 (soit « 4 contre 1 »).",
        "Multiplier par 100 donne le pourcentage, pas la cote.",
        "La cote est un ratio probabiliste sans lien avec l'écart-type."
      ]
    ],
    [
      "Dans quelle condition l'Odds Ratio (OR) est-il une excellente approximation du Risque Relatif (RR) ?",
      [
        "Lorsque la maladie ou l'événement étudié est rare dans la population (prévalence ou incidence < 5 % à 10 %).",
        "Uniquement lorsque 100 % de la population est malade.",
        "Lorsque la taille de l'échantillon est égale à 1 patient."
      ],
      [
        "Quand p est très petit, (1 - p) est proche de 1, de sorte que l'odds p/(1-p) ≈ p, et l'OR converge vers le RR (hypothèse de maladie rare).",
        "Si la maladie est très fréquente, l'OR s'éloigne fortement du RR et surestime la magnitude de l'effet relatif.",
        "Sur un échantillon de 1 sujet, aucun ratio d'association n'est calculable."
      ]
    ],
    [
      "Qu'est-ce que la Fraction Étiologique du Risque chez les Exposés (FER_e / Fraction Attribuable) ?",
      [
        "La proportion de cas chez les exposés attribuable à l'exposition causale, calculée par (RR - 1) / RR (soit (I_e - I_ne) / I_e).",
        "Le nombre total de médecins dans le service.",
        "La somme de toutes les prévalences mondiales."
      ],
      [
        "Si le tabac donne un RR = 10 pour le cancer bronchique, la FER_e vaut (10 - 1) / 10 = 90 % : 90 % des cancers chez les fumeurs sont directement attribuables au tabac.",
        "Cette proposition est fantaisiste.",
        "La fraction attribuable est une proportion comprise entre 0 % et 100 % mesurant l'impact préventif potentiel."
      ]
    ]
  ]
}
