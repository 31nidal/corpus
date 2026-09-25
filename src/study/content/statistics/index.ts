import type { Course } from '../../curriculum'
import type { Question } from '../../questions'
import { canonicalCourses } from '../../taxonomy/canonicalCourses'

const metadata = new Map(canonicalCourses.filter(item => item.subject === 'Biostatistiques').map(item => [item.id, item]))
const base = 'https://openstax.org/books/introductory-statistics/pages/'
type Draft = { objectives: string[]; sections: Course['sections']; trap: string; recall: string; answer: string; source: string; learning?: Course['learning']; caseStudy: NonNullable<Course['caseStudy']>; glossary: NonNullable<Course['glossary']> }
const s = (title: string, text: string, bullets?: string[]) => ({ title, text, ...(bullets ? { bullets } : {}) })
function course(id: string, d: Draft): Course {
  const c = metadata.get(id)
  if (!c) throw new Error(`Chapitre canonique de biostatistiques introuvable : ${id}`)
  const url = d.source.startsWith('https://') ? d.source : base + d.source
  return { id, title: c.title, category: c.subject, tag: c.module, minutes: 15, structure: null,
    objectives: d.objectives, sections: d.sections, trap: d.trap, recall: d.recall, answer: d.answer,
    source: url, sources: [{ label: d.source.startsWith('https://') ? 'NCBI Bookshelf · Clinical Methods : Sensitivity, Specificity, and Predictive Value' : 'OpenStax · Introductory Statistics', url }],
    prerequisites: ['Fractions, pourcentages et proportionnalité', 'Lecture de tableaux et graphiques'],
    ...(d.learning ? { learning: d.learning } : {}), glossary: d.glossary, caseStudy: d.caseStudy,
    review: { status: 'unreviewed', updatedAt: '2026-09-23', sourcesUpdatedAt: '2026-09-23' } }
}
export const statisticsCourses: Course[] = [
  course('stats-diagnostic-tests', {
    objectives: ['Calculer sensibilité et spécificité', 'Distinguer valeur prédictive positive et négative', 'Appliquer un raisonnement bayésien à un dépistage'],
    sections: [
      s('Table de contingence', 'Un test diagnostique compare le résultat à un état de référence dans une population définie. La table distingue vrais positifs, faux positifs, vrais négatifs et faux négatifs. Sensibilité et spécificité conditionnent les résultats à l’état de référence, tandis que les valeurs prédictives conditionnent le statut réel au résultat du test.'),
      s('Sensibilité et spécificité', 'La sensibilité est la proportion de personnes malades dont le test est positif : VP/(VP+FN). La spécificité est la proportion de personnes non malades dont le test est négatif : VN/(VN+FP). Un test très sensible réduit les faux négatifs ; un test très spécifique réduit les faux positifs, dans la population et au seuil étudiés.'),
      s('Valeurs prédictives', 'La valeur prédictive positive vaut VP/(VP+FP) et la valeur prédictive négative VN/(VN+FN). Elles répondent à la question après connaître le résultat. Elles dépendent fortement de la prévalence ou probabilité prétest : lorsque la maladie est rare, les faux positifs peuvent représenter une part importante des tests positifs malgré une bonne spécificité.'),
      s('Bayes en effectifs naturels', 'Pour rendre le raisonnement concret, choisir une cohorte hypothétique de 1 000 personnes. Appliquer la prévalence pour répartir malades et non malades, puis sensibilité et spécificité dans chaque groupe. La VPP est le nombre de vrais positifs divisé par tous les positifs. Cette méthode évite d’inverser les probabilités conditionnelles.'),
      s('Seuil et usage clinique', 'Déplacer le seuil d’un test continu modifie souvent le compromis sensibilité-spécificité. Le choix dépend du coût des faux négatifs et faux positifs, de l’objectif — dépister ou confirmer —, des traitements disponibles et du parcours de confirmation. Les performances publiées doivent correspondre à la population et au contexte d’utilisation.'),
    ], trap: 'Une sensibilité de 95 % signifie P(test positif | maladie), pas P(maladie | test positif).', recall: 'Prévalence 1 %, sensibilité 90 %, spécificité 95 % : quelle VPP approximative sur 1 000 personnes ?', answer: 'Sur 1 000, 10 sont malades : 9 vrais positifs. Parmi 990 non malades, 5 % soit 49,5 sont faux positifs. VPP ≈ 9/(9+49,5) ≈ 15,4 %.', source: 'https://www.ncbi.nlm.nih.gov/books/NBK383/', learning: { formula: { label: 'Valeurs prédictives', expression: 'VPP = VP/(VP+FP) ; VPN = VN/(VN+FN)', explanation: 'Le dénominateur rassemble les personnes ayant le résultat considéré ; ces probabilités varient avec la prévalence.' }, comparison: { headers: ['Mesure', 'Conditionnement', 'Question'], rows: [['Sensibilité', 'Parmi les malades', 'Quelle part est détectée ?'], ['Spécificité', 'Parmi les non-malades', 'Quelle part est correctement négative ?'], ['VPP', 'Parmi les tests positifs', 'Quelle part est malade ?'], ['VPN', 'Parmi les tests négatifs', 'Quelle part est non malade ?']] }, example: { prompt: 'Sur 1 000 personnes, 10 malades ; sensibilité 90 %, spécificité 95 %.', steps: ['VP = 9 ; FN = 1.', 'VN = 940,5 ; FP = 49,5.', 'VPP = 9/(9+49,5).'], result: 'VPP ≈ 15,4 % ; l’arrondi des effectifs fractionnaires rappelle que les performances sont des proportions attendues.' }, errors: [{ title: 'Inverser les conditionnelles', detail: 'P(test+ | malade) et P(malade | test+) ne sont pas la même probabilité ; utiliser une table 2×2.' }] }, glossary: [['Vrai positif', 'Test positif chez une personne classée malade par la référence.'], ['Faux négatif', 'Test négatif chez une personne malade selon la référence.'], ['Probabilité prétest', 'Estimation de probabilité avant de connaître le résultat du test.']], caseStudy: { prompt: 'Un dépistage est utilisé dans une population où la maladie est très rare. Pourquoi un résultat positif peut-il nécessiter confirmation ?', answer: 'La faible prévalence réduit la VPP ; parmi les tests positifs, une proportion notable peut être constituée de faux positifs malgré une bonne spécificité.' }
  }),
  course('stats-study-design', {
    objectives: ['Distinguer cohortes, cas-témoins et essais randomisés', 'Identifier temporalité et mesure d’association adaptées', 'Repérer biais et facteurs de confusion'],
    sections: [
      s('Question, population et exposition', 'Le choix du plan d’étude part d’une question explicite : exposition, intervention, comparateur, population et résultat. Les critères d’inclusion définissent à qui les conclusions s’appliquent. La temporalité entre exposition et événement est centrale pour interpréter causalité et biais.'),
      s('Étude de cohorte', 'Une cohorte suit des personnes définies selon exposition, puis observe la survenue d’issues. Elle permet de mesurer incidence et risque, et de calculer un risque relatif dans des conditions appropriées. Elle peut être prospective ou rétrospective ; pertes de suivi, changements d’exposition et confusion peuvent affecter les résultats.'),
      s('Étude cas-témoins', 'Une étude cas-témoins sélectionne des personnes selon la présence ou non de l’issue, puis compare les expositions antérieures. Elle est utile pour des événements rares ou à longue latence. L’odds ratio est la mesure d’association usuelle ; biais de sélection et mémoire des expositions doivent être examinés.'),
      s('Essai randomisé contrôlé', 'Dans un essai randomisé, l’allocation aléatoire vise à équilibrer en moyenne facteurs connus et inconnus entre groupes. Le contrôle, l’aveugle lorsque possible et l’analyse selon l’assignation initiale limitent certains biais. La randomisation ne garantit pas une exécution parfaite, et les résultats peuvent manquer de puissance ou de généralisabilité.'),
      s('Association, causalité et biais', 'Confusion, sélection, information, causalité inverse et hasard peuvent expliquer une association observée. La temporalité, la plausibilité, la cohérence avec d’autres études et des analyses robustes contribuent à l’évaluation causale sans transformer un seul critère en preuve. Il faut aussi distinguer significativité statistique, taille d’effet et pertinence clinique.'),
    ], trap: 'Un odds ratio d’étude cas-témoins ne se lit pas automatiquement comme un risque relatif, surtout si l’issue est fréquente.', recall: 'Pourquoi une étude cas-témoins est-elle efficace pour étudier une maladie rare ?', answer: 'Elle sélectionne directement un nombre suffisant de cas puis des témoins, plutôt que de suivre une cohorte très grande jusqu’à observer peu d’événements.', source: '1-3-data-collection-experiment-and-sampling', glossary: [['Confusion', 'Distorsion d’une association par un facteur lié à l’exposition et à l’issue.'], ['Randomisation', 'Attribution aléatoire d’une intervention pour équilibrer les groupes en moyenne.'], ['Odds ratio', 'Rapport de cotes d’exposition ou d’issue entre groupes, selon le plan.']], caseStudy: { prompt: 'Une étude cas-témoins trouve une association entre médicament et maladie. Quel biais lié au recueil rétrospectif est à envisager ?', answer: 'Un biais de mémorisation : cas et témoins peuvent rapporter différemment une exposition antérieure.' } }),
  course('stats-confidence-intervals', {
    objectives: ['Interpréter un intervalle de confiance', 'Distinguer significativité statistique et importance clinique', 'Relier effectif et variabilité à la largeur d’un intervalle de confiance'],
    sections: [
      s('Estimation et incertitude', 'Une statistique calculée sur un échantillon estime un paramètre de population et varie d’un échantillon à l’autre. Un intervalle de confiance reflète cette incertitude selon une méthode et des hypothèses précises. Un intervalle étroit indique une précision plus élevée dans le modèle, pas l’absence de biais systématique.'),
      s('Interprétation fréquentiste', 'Un intervalle de confiance à 95 % signifie que si l’on répétait le plan d’échantillonnage et la méthode un grand nombre de fois, environ 95 % des intervalles construits contiendraient le paramètre fixe. Après calcul d’un intervalle particulier, on ne décrit pas en fréquentiste la probabilité du paramètre comme étant 95 % dans cet intervalle.'),
      s('Valeur p et hypothèse nulle', 'La valeur p est la probabilité, sous une hypothèse nulle et les autres hypothèses du modèle, d’observer un résultat au moins aussi extrême que celui obtenu. Elle n’est ni la probabilité que l’hypothèse nulle soit vraie ni la taille de l’effet. Elle dépend de l’effet, de la variabilité, de la taille d’échantillon et du plan.'),
      s('Significativité clinique', 'Une petite différence peut devenir statistiquement significative dans un grand échantillon sans importance clinique ; un effet potentiellement important peut rester imprécis dans un petit échantillon. Interpréter taille d’effet, intervalle, risques absolus, conséquences, coûts et préférences. Les critères de pertinence doivent être définis indépendamment du seuil de p.'),
      s('Multiplicité et rapport complet', 'Tester de nombreuses hypothèses augmente la chance de résultats fortuits. Préspécification, correction de multiplicité, transparence des analyses et réplication réduisent les interprétations sélectives. Présenter estimations et intervalles rend l’incertitude plus informative qu’une simple dichotomie significatif/non significatif.'),
    ], trap: 'p > 0,05 ne prouve pas l’absence d’effet ; l’étude peut être trop imprécise pour exclure des effets pertinents.', recall: 'Comment interpréter un IC fréquentiste à 95 % sans dire que le paramètre a 95 % de chances d’y être ?', answer: 'La procédure produirait des intervalles contenant le paramètre dans environ 95 % des répétitions, sous les hypothèses du modèle.', source: '8-2-a-single-population-mean-using-the-student-t-distribution', glossary: [['Précision', 'Degré d’incertitude aléatoire d’une estimation.'], ['Valeur p', 'Probabilité conditionnelle sous l’hypothèse nulle d’un résultat au moins aussi extrême.'], ['Taille d’effet', 'Quantification de l’ampleur d’une différence ou association.']], caseStudy: { prompt: 'Un essai rapporte p = 0,04 pour un effet très faible avec un intervalle étroit. Que faut-il examiner avant de conclure à un bénéfice important ?', answer: 'La taille d’effet absolue, l’intervalle de confiance, la pertinence clinique prédéfinie, les risques, le plan et la multiplicité des analyses.' } }),
]
const prompts: Record<string, string[]> = {
  'stats-diagnostic-tests': ['Quelle formule définit la sensibilité ?', 'Quelle mesure répond à P(maladie | test positif) ?', 'La VPP reste-t-elle constante lorsque la prévalence change ?', 'Sur 1 000 personnes, avec une prévalence de 1 % et une sensibilité de 90 %, combien de vrais positifs attend-on ?', 'Que désigne un faux négatif ?'],
  'stats-study-design': ['Dans quel plan sélectionne-t-on les participants selon la présence de la maladie ?', 'Quel plan permet directement d’estimer une incidence dans une population suivie ?', 'Que cherche à équilibrer la randomisation ?', 'Quelle mesure est habituelle en étude cas-témoins ?', 'Citez un biais possible de rappel.'],
  'stats-confidence-intervals': ['Que signifie un IC fréquentiste à 95 % ?', 'La valeur p est-elle la probabilité que l’hypothèse nulle soit vraie ?', 'À niveau de confiance et échelle identiques, que suggère un intervalle de confiance plus large ?', 'Une valeur p faible prouve-t-elle une importance clinique ?', 'Dans un test de différence au seuil de 5 %, que permet de conclure p > 0,05 à elle seule ?'],
}
const answers: Record<string, string[]> = {
  'stats-diagnostic-tests': ['VP/(VP+FN), proportion de malades testés positifs.', 'La valeur prédictive positive.', 'Non, elle varie notamment avec la prévalence.', 'Environ 9 vrais positifs attendus.', 'Un test négatif chez une personne malade selon la référence.'],
  'stats-study-design': ['L’étude cas-témoins.', 'Une étude de cohorte avec suivi adéquat.', 'À répartir les facteurs pronostiques en moyenne entre groupes.', 'L’odds ratio.', 'Les cas peuvent se souvenir ou rapporter différemment une exposition que les témoins.'],
  'stats-confidence-intervals': ['La procédure d’échantillonnage produirait des intervalles contenant le paramètre dans environ 95 % des répétitions, sous les hypothèses.', 'Non, elle est calculée conditionnellement à l’hypothèse nulle et au modèle.', 'Une estimation moins précise ou un effectif informatif plus faible.', 'Non, il faut examiner l’ampleur et la pertinence de l’effet.', 'Que les données ne permettent pas de rejeter le modèle nul au seuil choisi ; cela ne prouve pas l’absence d’effet.'],
}
const reviewedChoices: Record<string, {reason: string; options: string[]; why: string[]}[]> = {
  "stats-diagnostic-tests": [
    {
      "reason": "La sensibilité conditionne le résultat du test à la présence de maladie ; le dénominateur comprend tous les malades selon la référence.",
      "options": [
        "VN/(VN+FP).",
        "VP/(VP+FP).",
        "VN/(VN+FN)."
      ],
      "why": [
        "Cette proportion est la spécificité : elle porte sur les personnes non malades.",
        "Cette proportion est la valeur prédictive positive : elle porte sur les tests positifs.",
        "Cette proportion est la valeur prédictive négative : elle porte sur les tests négatifs."
      ]
    },
    {
      "reason": "La VPP estime la proportion de malades parmi les personnes dont le test est positif, soit VP/(VP+FP).",
      "options": [
        "La sensibilité.",
        "La spécificité.",
        "La valeur prédictive négative."
      ],
      "why": [
        "La sensibilité est P(test positif sachant maladie), soit la conditionnelle inverse.",
        "La spécificité est P(test négatif sachant absence de maladie).",
        "La VPN est P(absence de maladie sachant test négatif), donc conditionne sur un autre résultat."
      ]
    },
    {
      "reason": "À sensibilité et spécificité fixées, la proportion de vrais positifs parmi les positifs varie avec la fréquence de la maladie.",
      "options": [
        "Oui, si sensibilité et spécificité restent fixées.",
        "Oui, car son dénominateur ne contient que des malades.",
        "Non, mais elle diminue nécessairement lorsque la prévalence augmente."
      ],
      "why": [
        "Même à performances intrinsèques fixées, modifier la prévalence change les nombres relatifs de vrais et de faux positifs.",
        "Le dénominateur de la VPP comprend VP et FP, donc des personnes malades et non malades.",
        "À sensibilité et spécificité fixées dans le cas usuel, la VPP augmente avec la prévalence."
      ]
    },
    {
      "reason": "L’effectif malade attendu est 1 000×0,01=10 ; 90 % de ces 10 personnes seront détectées, soit 9 vrais positifs en moyenne.",
      "options": [
        "Dix vrais positifs attendus.",
        "Quatre-vingt-dix vrais positifs attendus.",
        "Neuf cents vrais positifs attendus."
      ],
      "why": [
        "Dix est le nombre attendu de malades ; une sensibilité de 90 % signifie qu’ils ne sont pas tous détectés.",
        "La sensibilité s’applique aux dix malades attendus, pas à un groupe de cent personnes.",
        "Appliquer 90 % aux mille personnes confond population totale et population malade."
      ]
    },
    {
      "reason": "Un faux négatif est une discordance : référence positive pour la maladie et résultat négatif au test étudié.",
      "options": [
        "Un test positif chez une personne non malade selon la référence.",
        "Un test négatif chez une personne non malade selon la référence.",
        "Un test positif chez une personne malade selon la référence."
      ],
      "why": [
        "C’est un faux positif, avec les deux statuts inversés.",
        "C’est un vrai négatif, car test et référence concordent.",
        "C’est un vrai positif, car test et référence concordent."
      ]
    }
  ],
  "stats-study-design": [
    {
      "reason": "Le plan cas-témoins commence par sélectionner des cas malades et des témoins issus de leur population source, puis compare les expositions.",
      "options": [
        "Une cohorte constituée selon l’exposition.",
        "Un essai randomisé de prévention.",
        "Une enquête transversale échantillonnée dans la population."
      ],
      "why": [
        "La cohorte sélectionne et classe les personnes avant l’observation de l’issue, plutôt qu’en fixant les nombres de cas et de témoins.",
        "L’essai assigne aléatoirement une intervention ; il ne constitue pas les groupes selon la survenue future de la maladie.",
        "Une enquête transversale mesure exposition et état de santé à un moment donné sans imposer les effectifs selon la maladie."
      ]
    },
    {
      "reason": "Avec une population initialement à risque et un suivi connu, une cohorte permet de compter les nouveaux cas et de calculer une incidence.",
      "options": [
        "Une étude cas-témoins classique à effectifs fixés.",
        "Une série de cas sans dénominateur de population.",
        "Une enquête de prévalence sans suivi."
      ],
      "why": [
        "La proportion de cas y est fixée par l’échantillonnage ; elle ne donne pas directement le risque dans la population.",
        "Sans population à risque ni durée de suivi, on ne peut pas calculer une incidence.",
        "La prévalence mesure les cas présents à un instant ; elle ne compte pas directement les nouveaux cas au cours d’un suivi."
      ]
    },
    {
      "reason": "L’attribution aléatoire rend les groupes comparables en moyenne sur les facteurs pronostiques mesurés et non mesurés ; elle ne garantit pas un équilibre exact dans chaque essai.",
      "options": [
        "Garantir une égalité exacte de tous les facteurs dans chaque échantillon.",
        "Choisir systématiquement le traitement selon la gravité initiale.",
        "Empêcher toute perte de vue après inclusion."
      ],
      "why": [
        "Le hasard peut laisser des déséquilibres, surtout dans de petits effectifs ; l’équilibre est une propriété moyenne.",
        "Une attribution guidée par la gravité est un choix déterministe pouvant introduire une confusion par indication.",
        "Les pertes de suivi restent possibles après randomisation et peuvent compromettre l’interprétation."
      ]
    },
    {
      "reason": "Dans un plan cas-témoins classique, on estime le rapport des cotes d’exposition ; on ne calcule pas directement les risques à partir de la proportion de cas échantillonnés.",
      "options": [
        "Le risque relatif calculé directement avec la proportion de cas du fichier.",
        "La différence d’incidence sans données supplémentaires.",
        "La prévalence de la maladie à partir du rapport cas/effectif total."
      ],
      "why": [
        "Les proportions de cas dans l’échantillon sont imposées par le plan ; elles ne représentent pas les risques dans les groupes exposés et non exposés.",
        "Une incidence nécessite un dénominateur de population à risque et une période ; ces informations ne découlent pas des seuls effectifs cas-témoins.",
        "Le rapport de recrutement cas/témoins ne reflète pas nécessairement la prévalence dans la population source."
      ]
    },
    {
      "reason": "Si le souvenir ou la déclaration d’exposition diffère selon le statut de cas, la mesure de l’exposition est biaisée de façon différentielle.",
      "options": [
        "La surestimation de la maladie par sélection exclusive de patients hospitalisés.",
        "Une différence aléatoire entre les moyennes de deux petits échantillons.",
        "Une erreur d’étalonnage identique d’un appareil pour tous les sujets."
      ],
      "why": [
        "Cela évoque un biais de sélection ; le biais de rappel concerne la mesure rétrospective de l’exposition.",
        "Une fluctuation d’échantillonnage n’est pas un biais systématique de mémorisation.",
        "C’est une erreur de mesure instrumentale, pas une différence de souvenir selon le statut de maladie."
      ]
    }
  ],
  "stats-confidence-intervals": [
    {
      "reason": "La couverture de 95 % qualifie la méthode sur des répétitions d’échantillonnage ; le paramètre de population est fixe dans ce cadre.",
      "options": [
        "Il contient 95 % des valeurs individuelles de la population.",
        "Il existe 95 % de chances que le paramètre fixe change pour entrer dans l’intervalle.",
        "Il exclut tout biais systématique dans 95 % des études."
      ],
      "why": [
        "Un intervalle pour un paramètre ne décrit pas la dispersion de 95 % des observations individuelles.",
        "Le paramètre est fixe ; ce sont les bornes calculées qui changent entre échantillons.",
        "La couverture suppose le modèle et le plan adaptés ; un biais de sélection ou de mesure n’est pas supprimé par le calcul d’un intervalle."
      ]
    },
    {
      "reason": "La valeur p mesure l’extrémité des données relativement à une distribution supposée sous H₀ ; elle ne donne pas P(H₀ sachant données).",
      "options": [
        "Oui, p=0,03 signifie que H₀ a 3 % de chances d’être vraie.",
        "Oui, p est la probabilité que le résultat soit dû exclusivement au hasard.",
        "Non, p représente directement la taille de l’effet observé."
      ],
      "why": [
        "Cette lecture inverse le conditionnement et nécessite un cadre probabiliste différent, avec notamment des hypothèses a priori.",
        "Cette formule vague n’est pas la définition ; p est calculée sous une hypothèse nulle et un modèle précis.",
        "Une taille d’effet et une valeur p sont deux quantités différentes ; p dépend aussi de l’incertitude et de l’effectif."
      ]
    },
    {
      "reason": "À niveau de confiance et échelle comparables, un intervalle large laisse compatibles davantage de valeurs du paramètre : la précision est moindre.",
      "options": [
        "Une preuve que l’effet est cliniquement important.",
        "L’absence certaine de biais de sélection.",
        "Une probabilité plus forte que l’hypothèse nulle soit vraie."
      ],
      "why": [
        "La largeur décrit l’incertitude ; elle ne prouve pas une grande amplitude de l’effet.",
        "La précision ne renseigne pas à elle seule sur un biais systématique.",
        "La largeur d’un IC n’est pas une probabilité attachée à H₀ ; il faut examiner aussi ses bornes et les hypothèses."
      ]
    },
    {
      "reason": "La pertinence clinique se juge sur l’amplitude de l’effet, ses conséquences et son incertitude ; une petite valeur p ne suffit pas.",
      "options": [
        "Oui, car p mesure directement l’ampleur du bénéfice.",
        "Oui, quel que soit l’effectif et le nombre d’analyses effectuées.",
        "Non, car un effet statistiquement significatif est nécessairement trop petit."
      ],
      "why": [
        "La valeur p n’est pas une mesure d’ampleur ; un grand effectif peut rendre détectable un effet minime.",
        "Effectif, plan et multiplicité influencent l’interprétation ; ils ne deviennent pas négligeables quand p est faible.",
        "Un effet significatif peut être petit ou important ; il faut évaluer sa taille, sans déduire l’une ou l’autre de p seule."
      ]
    },
    {
      "reason": "Ne pas rejeter H₀ au seuil de 5 % laisse subsister une incertitude ; un manque de puissance peut masquer un effet pertinent.",
      "options": [
        "L’effet est exactement nul dans la population.",
        "Les deux traitements sont équivalents cliniquement.",
        "L’hypothèse nulle a plus de 95 % de chances d’être vraie."
      ],
      "why": [
        "Une absence de rejet ne démontre pas l’égalité exacte au paramètre nul.",
        "L’équivalence nécessite un plan, une marge et une analyse dédiés ; p>0,05 dans un test de différence ne suffit pas.",
        "La valeur p ne fournit pas une probabilité a posteriori de H₀."
      ]
    }
  ]
}
export const statisticsQuestions: Question[] = statisticsCourses.flatMap(c => prompts[c.id].map((prompt, qi) => {
 const item = reviewedChoices[c.id][qi]
 return {id: `${c.id}-q${qi + 1}`, course: c.id, topic: c.category, prompt,
 options: [answers[c.id][qi], ...item.options], correct: [0], why: [item.reason, ...item.why],
 difficulty: qi < 2 ? 'essentiel' as const : 'application' as const, format: 'single' as const}
}))
