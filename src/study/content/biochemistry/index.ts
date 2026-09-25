import type { Course } from '../../curriculum'
import type { Question } from '../../questions'
import { canonicalCourses } from '../../taxonomy/canonicalCourses'

const metadata = new Map(canonicalCourses.filter(item => item.subject === 'Biochimie').map(item => [item.id, item]))
const base = 'https://openstax.org/books/biology-2e/pages/'
type Draft = { objectives: string[]; sections: Course['sections']; trap: string; recall: string; answer: string; source: string; caseStudy: NonNullable<Course['caseStudy']>; glossary: NonNullable<Course['glossary']> }
const s = (title: string, text: string, bullets?: string[]) => ({ title, text, ...(bullets ? { bullets } : {}) })
function course(id: string, d: Draft): Course {
  const c = metadata.get(id)
  if (!c) throw new Error(`Chapitre canonique de biochimie introuvable : ${id}`)
  return { id, title: c.title, category: c.subject, tag: c.module, minutes: 14, structure: null,
    objectives: d.objectives, sections: d.sections, trap: d.trap, recall: d.recall, answer: d.answer,
    source: base + d.source, sources: [{ label: 'OpenStax · Biology 2e', url: base + d.source }],
    prerequisites: ['Structure chimique des biomolécules', 'Équilibres et réactions chimiques'],
    glossary: d.glossary, caseStudy: d.caseStudy,
    review: { status: 'unreviewed', updatedAt: '2026-09-23', sourcesUpdatedAt: '2026-09-23' } }
}

export const biochemistryCourses: Course[] = [
  course('biochem-amino-acids-properties', {
    objectives: ['Classer les acides aminés selon leur chaîne latérale', 'Décrire les niveaux d’organisation protéique', 'Relier séquence, repliement et fonction'],
    sections: [
      s('Une unité commune, des chaînes différentes', 'Les protéines sont des polymères d’acides aminés reliés par des liaisons peptidiques. Chaque acide aminé possède un carbone alpha lié à un groupe amine, un carboxyle, un hydrogène et une chaîne latérale R. À pH physiologique, les groupes terminaux sont généralement ionisés et la plupart des acides aminés libres sont sous forme zwitterionique.'),
      s('Propriétés des chaînes latérales', 'Les chaînes latérales déterminent les interactions avec l’eau et les autres groupes. Certaines sont hydrophobes, d’autres polaires ou chargées positivement ou négativement. Glycine est petite et flexible ; proline contraint la chaîne ; cystéine peut former un pont disulfure après oxydation. Les catégories sont des repères, car l’environnement local module le comportement.'),
      s('Séquence et structure primaire', 'L’ordre des acides aminés, lu de l’extrémité N-terminale vers C-terminale, constitue la structure primaire. La liaison peptidique possède un caractère partiellement double et reste relativement plane, ce qui limite sa rotation. Des changements de séquence peuvent modifier la stabilité, l’adressage ou la fonction sans toujours abolir l’activité.'),
      s('Structures secondaire et tertiaire', 'Les hélices alpha et feuillets bêta sont stabilisés par des liaisons hydrogène entre groupes du squelette peptidique. La structure tertiaire résulte d’interactions entre chaînes latérales : effet hydrophobe, liaisons ioniques, liaisons hydrogène, forces de dispersion et parfois ponts disulfure. Plusieurs domaines peuvent former une protéine compacte.'),
      s('Assemblages et dénaturation', 'Des sous-unités déjà repliées peuvent s’associer en structure quaternaire. Température, pH extrême ou agents chaotropes peuvent déstabiliser les interactions non covalentes et dénaturer la protéine ; la chaîne primaire est souvent conservée si les liaisons peptidiques ne sont pas hydrolysées. Certaines protéines se replient spontanément, d’autres requièrent des chaperonnes.'),
    ],
    trap: 'La dénaturation perturbe principalement les structures secondaire, tertiaire et quaternaire ; elle ne coupe pas automatiquement la chaîne peptidique.',
    recall: 'Pourquoi un acide aminé hydrophobe est-il souvent enfoui dans le cœur d’une protéine soluble ?',
    answer: 'Son enfouissement limite le contact de sa chaîne apolaire avec l’eau et contribue à l’effet hydrophobe qui stabilise le repliement.',
    source: '3-4-proteins', glossary: [['Zwitterion', 'Espèce portant simultanément des charges positives et négatives.'], ['Pont disulfure', 'Liaison covalente entre deux cystéines oxydées.'], ['Domaine', 'Région d’une protéine pouvant former une unité structurale et fonctionnelle.']],
    caseStudy: { prompt: 'Une protéine perd son activité après chauffage, puis la retrouve partiellement après refroidissement. Quelle propriété cela illustre-t-il ?', answer: 'Une partie du repliement et des interactions stabilisatrices peut être réversible ; la récupération dépend du degré d’agrégation et des conditions, et n’est pas garantie.' }
  }),
  course('biochem-enzymes-kinetics', {
    objectives: ['Expliquer la catalyse enzymatique', 'Interpréter Km et Vmax dans un modèle simple', 'Distinguer inhibition compétitive et non compétitive'],
    sections: [
      s('Accélérer une réaction sans changer son bilan', 'Une enzyme augmente la vitesse en abaissant l’énergie d’activation, souvent en stabilisant l’état de transition. Elle ne modifie ni le bilan thermodynamique ni la position finale de l’équilibre. Le site actif rapproche et oriente les réactifs, puis le produit est libéré et l’enzyme peut effectuer un nouveau cycle.'),
      s('Spécificité et conditions', 'La forme tridimensionnelle, les charges et les groupes chimiques du site actif favorisent certains substrats. Le modèle d’ajustement induit décrit les changements conformationnels associés à la liaison. Température, pH, disponibilité du substrat et cofacteurs déterminent l’activité mesurée ; une condition extrême peut altérer la structure.'),
      s('Saturation et paramètres apparents', 'Dans le modèle de Michaelis-Menten, la vitesse initiale augmente avec la concentration de substrat puis tend vers Vmax lorsque les sites sont occupés. Km est la concentration donnant la moitié de Vmax dans ce modèle ; il renseigne sur le comportement cinétique sans être toujours une mesure directe de l’affinité. La quantité d’enzyme influence Vmax.'),
      s('Inhibition réversible', 'Un inhibiteur compétitif concurrence le substrat pour le site actif : une forte concentration de substrat peut surmonter l’effet dans le modèle classique, l’augmentation apparente de Km s’accompagnant d’une Vmax inchangée. Un inhibiteur non compétitif pur réduit Vmax sans modifier Km ; les formes mixtes peuvent affecter les deux paramètres.'),
      s('Régulation de l’activité', 'Les cellules règlent les enzymes par disponibilité du substrat, inhibition par le produit, modifications covalentes, activation protéolytique, association à des partenaires et allostérie. Les voies métaboliques coordonnent les étapes plutôt que d’activer toutes les enzymes de façon identique. La rétro-inhibition peut adapter le flux à la demande.'),
    ],
    trap: 'Une enzyme modifie la vitesse d’approche de l’équilibre, pas la constante d’équilibre ni l’énergie libre globale de la réaction.',
    recall: 'Dans le modèle de Michaelis-Menten, que signifie une concentration de substrat égale à Km ?',
    answer: 'À cette concentration, la vitesse initiale est égale à la moitié de Vmax, sous les hypothèses du modèle.',
    source: '6-5-enzymes', glossary: [['Énergie d’activation', 'Énergie nécessaire pour atteindre l’état de transition.'], ['Vmax', 'Vitesse limite lorsque l’enzyme est saturée en substrat.'], ['Allostérie', 'Régulation par liaison d’un effecteur à un site distinct du site catalytique.']],
    caseStudy: { prompt: 'Un médicament augmente Km apparent mais laisse Vmax inchangée. Quel type d’inhibition est compatible avec ce profil ?', answer: 'Une inhibition compétitive réversible dans le modèle simple, à interpréter avec les limites expérimentales et les mécanismes possibles.' }
  }),
  course('biochem-bioenergetics', {
    objectives: ['Distinguer énergie libre et énergie d’activation', 'Expliquer le couplage par l’ATP', 'Relier oxydation des nutriments à la synthèse d’ATP'],
    sections: [
      s('Énergie libre et spontanéité', 'La variation d’énergie libre de Gibbs ΔG indique le sens thermodynamiquement favorable à température et pression constantes : une valeur négative correspond à un processus exergonique dans les conditions considérées. Cela ne prédit pas sa vitesse, qui dépend de la barrière d’activation. Les concentrations réelles peuvent déplacer ΔG par rapport à ΔG°.'),
      s('ATP comme intermédiaire de couplage', 'L’hydrolyse de l’ATP en ADP et phosphate inorganique est favorable dans des conditions cellulaires, notamment grâce à la stabilisation des produits. Une réaction défavorable peut être couplée à cette hydrolyse si le bilan des variations d’énergie libre devient négatif. Le couplage exige un mécanisme commun, souvent un intermédiaire phosphorylé.'),
      s('Régénérer l’ATP', 'L’ATP est continuellement consommé puis régénéré. La phosphorylation au niveau du substrat transfère directement un phosphate d’un intermédiaire métabolique à l’ADP. La phosphorylation oxydative utilise le gradient électrochimique de protons créé par la chaîne respiratoire mitochondriale et exploité par l’ATP synthase.'),
      s('Oxydation et transfert d’électrons', 'L’oxydation des nutriments libère des électrons captés notamment par NAD⁺ et FAD, qui deviennent NADH et FADH₂. Dans la chaîne respiratoire, les électrons passent par des transporteurs et leur énergie contribue au pompage des protons. L’oxygène est l’accepteur terminal dans la respiration aérobie et est réduit en eau.'),
      s('Rendement et contrôle', 'Le rendement d’ATP varie selon les navettes, les fuites de protons, les besoins de biosynthèse et l’état physiologique ; une valeur unique ne s’applique pas à toutes les cellules et conditions. La disponibilité en ADP stimule le flux respiratoire, tandis que l’état énergétique et les voies de signalisation adaptent production et consommation.'),
    ],
    trap: 'Un ΔG négatif rend un processus thermodynamiquement favorable mais ne garantit pas qu’il soit rapide sans catalyse.',
    recall: 'Comment l’hydrolyse de l’ATP peut-elle rendre favorable une réaction endergonique ?',
    answer: 'Le bilan des réactions couplées additionne leurs ΔG ; si la somme est négative et qu’un mécanisme lie effectivement les étapes, le processus global devient favorable.',
    source: '6-4-atp-adenosine-triphosphate', glossary: [['Exergonique', 'Processus dont le ΔG est négatif dans les conditions considérées.'], ['Couplage', 'Association mécanistique de réactions dont le bilan énergétique global est favorable.'], ['Force proton-motrice', 'Énergie stockée dans le gradient électrochimique de protons.']],
    caseStudy: { prompt: 'Une cellule manque d’oxygène : quelle conséquence attend-on sur la phosphorylation oxydative et pourquoi la glycolyse peut-elle persister ?', answer: 'La chaîne respiratoire ralentit faute d’accepteur terminal, le NADH est moins réoxydé et la phosphorylation oxydative diminue. La glycolyse peut continuer si la fermentation régénère du NAD⁺, mais son rendement énergétique est plus faible.' }
  }),
  course('biochem-carbohydrate', {
    objectives: ['Situer les étapes principales de la glycolyse', 'Distinguer investissement et rendement énergétique', 'Expliquer le devenir du pyruvate selon le contexte'],
    sections: [
      s('Une voie cytosolique universelle', 'La glycolyse transforme une molécule de glucose en deux molécules de pyruvate dans le cytosol. Elle ne requiert pas directement d’oxygène et peut fonctionner dans des cellules dépourvues de mitochondries. Ses dix réactions sont catalysées par des enzymes et comportent des étapes réversibles ainsi que des étapes de régulation fortement orientées.'),
      s('Phase d’investissement', 'Deux ATP sont consommés pour phosphoryler et activer le glucose puis ses dérivés. Le fructose-1,6-bisphosphate est clivé en deux trioses phosphates qui convergent vers le glycéraldéhyde-3-phosphate. La phosphorylation contribue à retenir les intermédiaires dans la cellule et prépare leur oxydation.'),
      s('Phase de rendement', 'Chaque triose est oxydé, ce qui réduit du NAD⁺ en NADH, puis les intermédiaires à haut potentiel de transfert permettent la phosphorylation de l’ADP. Quatre ATP sont produits par glucose, soit un gain net de deux ATP, et deux NADH sont formés. Le bilan doit distinguer production brute et consommation.'),
      s('Destin du pyruvate et du NADH', 'En condition aérobie, le pyruvate peut être converti en acétyl-CoA et oxydé dans la mitochondrie. Lorsque la réoxydation mitochondriale est limitée, la lactate déshydrogénase réduit le pyruvate en lactate tout en régénérant du NAD⁺. La fermentation soutient le flux glycolytique sans produire davantage d’ATP directement.'),
      s('Contrôle du flux', 'L’hexokinase ou glucokinase, la phosphofructokinase-1 et la pyruvate kinase participent au contrôle de la voie. La phosphofructokinase-1 répond notamment à l’état énergétique et à des signaux métaboliques. Les isoformes et leur régulation varient selon les tissus ; la glycolyse répond aussi à l’hormone et à la disponibilité en glucose.'),
    ],
    trap: 'La fermentation lactique régénère le NAD⁺ ; elle ne constitue pas une étape supplémentaire de synthèse d’ATP au-delà du bilan glycolytique.',
    recall: 'Quel est le bilan net classique en ATP et NADH par molécule de glucose lors de la glycolyse ?',
    answer: 'Deux ATP nets et deux NADH, avec formation de deux pyruvates.',
    source: '7-2-glycolysis', glossary: [['Phosphorylation au niveau du substrat', 'Formation d’ATP par transfert direct d’un phosphate depuis un intermédiaire.'], ['NADH', 'Forme réduite du coenzyme NAD⁺, transporteur d’électrons.'], ['Fermentation lactique', 'Réduction du pyruvate en lactate qui réoxyde le NADH en NAD⁺.']],
    caseStudy: { prompt: 'Un globule rouge mature produit de l’ATP malgré l’absence de mitochondries. Quelle voie est indispensable et quel est son rendement net classique ?', answer: 'La glycolyse cytosolique fournit l’ATP, avec un bilan net de deux ATP par glucose.' }
  }),
  course('biochem-fatty-acid-oxidation-ketogenesis', {
    objectives: ['Décrire la mobilisation des triglycérides', 'Suivre le devenir mitochondrial des acides gras', 'Comparer synthèse et oxydation des lipides'],
    sections: [
      s('Réserve et mobilisation', 'Les triacylglycérols stockés dans les gouttelettes lipidiques constituent une réserve énergétique concentrée et hydrophobe. Des lipases les hydrolysent en acides gras et glycérol selon les signaux hormonaux et l’état énergétique. Le tissu adipeux libère les acides gras liés à l’albumine ; le glycérol rejoint des voies hépatiques.'),
      s('Activation et entrée mitochondriale', 'Un acide gras est activé en acyl-CoA en consommant l’équivalent de deux liaisons riches en énergie de l’ATP. Les acides gras à longue chaîne nécessitent généralement la navette carnitine pour atteindre la matrice mitochondriale. Le malonyl-CoA inhibe la CPT-I et coordonne l’entrée avec la synthèse lipidique.'),
      s('Bêta-oxydation', 'Chaque cycle de bêta-oxydation raccourcit l’acyl-CoA de deux carbones et produit un acétyl-CoA, un NADH et un FADH₂, avec des ajustements en fin de chaîne et pour les doubles liaisons. L’acétyl-CoA peut entrer dans le cycle de Krebs si les conditions métaboliques le permettent. Les électrons alimentent la chaîne respiratoire.'),
      s('Synthèse des acides gras', 'La synthèse se déroule principalement dans le cytosol et utilise l’acétyl-CoA, l’ATP et le NADPH. L’acétyl-CoA carboxylase forme le malonyl-CoA ; la synthase des acides gras allonge ensuite la chaîne. Cette voie et la bêta-oxydation diffèrent par leur compartiment, leurs cofacteurs et leurs transporteurs, ce qui évite un simple cycle futile.'),
      s('Corps cétoniques et contexte clinique', 'En période de jeûne prolongé ou de déficit insulinique marqué, le foie peut produire des corps cétoniques à partir de l’acétyl-CoA lorsque son utilisation dans le cycle de Krebs est limitée. Certains tissus les utilisent comme carburant après adaptation. Une production excessive peut provoquer une acidocétose ; elle ne doit pas être confondue avec la cétose nutritionnelle.'),
    ],
    trap: 'La bêta-oxydation produit principalement de l’acétyl-CoA, du NADH et du FADH₂ ; elle ne transforme pas directement un acide gras en glucose chez l’humain.',
    recall: 'Quel est le rôle de la navette carnitine dans l’oxydation des acides gras à longue chaîne ?',
    answer: 'Elle permet le transfert de groupes acyl à longue chaîne à travers les membranes mitochondriales vers la matrice, où se déroule la bêta-oxydation.',
    source: '7-6-connections-of-carbohydrate-protein-and-lipid-metabolic-pathways', glossary: [['Acyl-CoA', 'Acide gras activé et lié au coenzyme A.'], ['CPT-I', 'Enzyme de la membrane mitochondriale externe régulant l’entrée des acides gras longs.'], ['Corps cétonique', 'Métabolite hydrosoluble produit par le foie à partir de l’acétyl-CoA.']],
    caseStudy: { prompt: 'Pourquoi le malonyl-CoA diminue-t-il l’oxydation des acides gras pendant leur synthèse ?', answer: 'Il inhibe CPT-I, limitant l’entrée mitochondriale des acides gras longs et coordonnant synthèse cytosolique et oxydation mitochondriale.' }
  }),
  course('biochem-oxidative-phosphorylation', {
    objectives: ['Décrire le trajet des électrons dans la chaîne respiratoire', 'Expliquer le gradient protonique et le fonctionnement de l’ATP synthase', 'Relier inhibition ou découplage aux flux d’oxygène et d’ATP'],
    sections: [
      s('Une chaîne de transporteurs', 'La chaîne respiratoire des mitochondries est organisée dans la membrane interne. Les électrons du NADH entrent généralement au complexe I ; ceux du FADH₂ peuvent rejoindre la coenzyme Q via le complexe II. Coenzyme Q, complexe III, cytochrome c et complexe IV transmettent les électrons jusqu’à l’oxygène, accepteur terminal réduit en eau.'),
      s('Pompage des protons', 'Les complexes I, III et IV utilisent une partie de l’énergie des transferts d’électrons pour déplacer des protons de la matrice vers l’espace intermembranaire. Le complexe II ne pompe pas de protons. Le gradient combine différence de concentration et différence de potentiel électrique à travers une membrane interne normalement peu perméable aux protons.'),
      s('ATP synthase', 'Les protons retournent vers la matrice à travers l’ATP synthase. Leur flux entraîne une rotation de ses sous-unités et des changements de conformation catalytiques qui favorisent la synthèse d’ATP à partir d’ADP et de phosphate. Le gradient protonique constitue l’énergie immédiate de la phosphorylation oxydative.'),
      s('Rendement et contrôle respiratoire', 'Le rendement lié au NADH est généralement supérieur à celui du FADH₂ car leurs électrons entrent à des niveaux différents de la chaîne. La production dépend aussi des navettes, du transport mitochondrial, des fuites protoniques et de la demande. L’ADP disponible favorise le retour des protons par l’ATP synthase et soutient le flux respiratoire.'),
      s('Inhibiteurs et découplants', 'Un inhibiteur bloque un transfert ou l’ATP synthase et peut modifier consommation d’oxygène et production d’ATP selon le site d’action. Un découplant augmente la perméabilité aux protons : le gradient se dissipe, la synthèse d’ATP diminue et une part de l’énergie est libérée en chaleur. Les conséquences doivent être interprétées en tenant compte du substrat et de la viabilité cellulaire.'),
    ],
    trap: 'Le complexe II transfère des électrons à la coenzyme Q, mais ne pompe pas de protons à travers la membrane interne.',
    recall: 'Pourquoi les électrons issus de l’oxydation du succinate permettent-ils moins de synthèse d’ATP que ceux du NADH matriciel ?',
    answer: 'Le FAD lié à la succinate déshydrogénase transfère les électrons au niveau du complexe II, sans passer par le complexe I. Le pompage protonique associé est donc moindre que pour le NADH matriciel.',
    source: '7-4-oxidative-phosphorylation', glossary: [['Force proton-motrice', 'Gradient électrochimique à travers la membrane interne mitochondriale.'], ['Accepteur terminal', 'Molécule recevant les électrons en fin de chaîne, ici l’oxygène.'], ['Découplant', 'Agent dissipant le gradient protonique sans produire directement l’ATP correspondant.']],
    caseStudy: { prompt: 'Une molécule découplante dissipe le gradient protonique. Quel effet attendre sur la synthèse d’ATP et la production de chaleur ?', answer: 'La phosphorylation oxydative produit moins d’ATP et une plus grande part de l’énergie est dissipée sous forme de chaleur.' }
  }),
]

const prompts: Record<string, [string, string, string, string, string]> = {
  'biochem-amino-acids-properties': ['Quel niveau décrit la séquence N- vers C-terminale ?', 'Quelles interactions stabilisent principalement une hélice alpha ?', 'Quel résidu peut former un pont disulfure ?', 'Que signifie dénaturer une protéine sans hydrolyse ?', 'Pourquoi une chaîne latérale hydrophobe est-elle souvent enfouie dans une protéine globulaire soluble ?'],
  'biochem-enzymes-kinetics': ['Quel effet une enzyme exerce-t-elle sur l’énergie d’activation ?', 'Dans le modèle simple, que vaut v quand [S] = Km ?', 'Quel paramètre diminue avec une inhibition non compétitive pure ?', 'Une enzyme déplace-t-elle la position de l’équilibre ?', 'Quel rôle joue une rétro-inhibition métabolique ?'],
  'biochem-bioenergetics': ['Que signifie un ΔG négatif ?', 'Comment le couplage énergétique rend-il possible une étape défavorable ?', 'Quel gradient alimente directement l’ATP synthase mitochondriale ?', 'Quel accepteur reçoit les électrons à la fin de la chaîne respiratoire mitochondriale ?', 'Un processus favorable est-il nécessairement rapide ?'],
  'biochem-carbohydrate': ['Dans quel compartiment se déroule la glycolyse ?', 'Quel est le gain net classique de la glycolyse en ATP par glucose ?', 'Quel coenzyme est réduit lors de l’oxydation du glycéraldéhyde-3-phosphate ?', 'Que fait la fermentation lactique au NADH ?', 'La glycolyse requiert-elle directement l’oxygène ?'],
  'biochem-fatty-acid-oxidation-ketogenesis': ['Quel est le produit carboné récurrent de la bêta-oxydation ?', 'Quel système assure le transfert des groupements acyle à longue chaîne vers la matrice mitochondriale ?', 'Quel inhibiteur physiologique freine CPT-I ?', 'Quel cofacteur réducteur soutient la synthèse des acides gras ?', 'Le foie exporte-t-il ses corps cétoniques comme carburant ?'],
    'biochem-oxidative-phosphorylation': ['Quel gradient traverse directement l’ATP synthase mitochondriale ?', 'Où se situe la chaîne respiratoire mitochondriale ?', 'Quel est l’accepteur terminal des électrons en respiration aérobie ?', 'Que se passe-t-il si la membrane interne devient perméable aux protons ?', 'En phosphorylation oxydative, quel système crée principalement le gradient utilisé par l’ATP synthase ?'],
}
const correctText: Record<string, string[]> = {
  'biochem-amino-acids-properties': ['La structure primaire.', 'Des liaisons hydrogène entre groupes du squelette peptidique.', 'La cystéine.', 'Perdre des conformations supérieures sans couper nécessairement les liaisons peptidiques.', 'L’enfouissement limite son contact avec l’eau et contribue à l’effet hydrophobe.'],
  'biochem-enzymes-kinetics': ['Elle l’abaisse en stabilisant l’état de transition.', 'La moitié de Vmax.', 'La Vmax, vitesse maximale lorsque l’enzyme est saturée.', 'Non, elle accélère l’atteinte de l’équilibre sans modifier sa position.', 'Elle adapte le flux en freinant une étape lorsque le produit final est suffisamment abondant.'],
  'biochem-bioenergetics': ['Le processus est favorable dans les conditions considérées, mais sa vitesse n’est pas déterminée par ce seul signe.', 'Le bilan des ΔG devient négatif si les étapes sont mécanistiquement liées.', 'Le gradient électrochimique de protons.', 'L’oxygène, réduit en eau.', 'Non, la vitesse dépend aussi de la barrière d’activation et de la catalyse.'],
  'biochem-carbohydrate': ['Le cytosol, compartiment où se déroulent ses dix réactions.', 'Deux ATP nets.', 'Le NAD⁺, réduit en NADH.', 'Elle réoxyde le NADH en NAD⁺.', 'Non, la voie n’utilise pas directement l’oxygène.'],
  'biochem-fatty-acid-oxidation-ketogenesis': ['L’acétyl-CoA.', 'La navette carnitine.', 'Le malonyl-CoA.', 'Le NADPH, cofacteur réducteur utilisé lors de la synthèse lipidique.', 'Oui, ils peuvent être utilisés par plusieurs tissus après adaptation.'],
  'biochem-oxidative-phosphorylation': ['Le gradient électrochimique de protons entre espace intermembranaire et matrice.', 'La membrane interne de la mitochondrie.', 'L’oxygène, qui est réduit en eau.', 'Le gradient se dissipe et la synthèse d’ATP peut diminuer malgré une respiration accrue.', 'Les complexes I, III et IV de la chaîne respiratoire.'],
}
const reviewedChoices: Record<string, {reason: string; options: string[]; why: string[]}[]> = {
  "biochem-amino-acids-properties": [
    {
      "reason": "La structure primaire est l’ordre des résidus reliés par des liaisons peptidiques, lu de l’extrémité N vers l’extrémité C.",
      "options": [
        "La structure secondaire.",
        "La structure tertiaire.",
        "La structure quaternaire."
      ],
      "why": [
        "La structure secondaire décrit des arrangements locaux, comme l’hélice α, et non la séquence des résidus.",
        "La structure tertiaire est le repliement tridimensionnel d’une chaîne.",
        "La structure quaternaire concerne l’association de plusieurs chaînes polypeptidiques."
      ]
    },
    {
      "reason": "Les groupes C=O et N–H du squelette forment des liaisons hydrogène régulières, classiquement entre les résidus i et i+4 d’une hélice α.",
      "options": [
        "Des ponts disulfure entre chaque paire de résidus voisins.",
        "Des liaisons peptidiques entre chaînes latérales.",
        "Des interactions hydrogène exclusivement entre chaînes latérales."
      ],
      "why": [
        "Les ponts disulfure impliquent deux cystéines ; ils ne constituent pas le réseau régulier qui stabilise une hélice α.",
        "Les liaisons peptidiques relient le squelette ; l’hélice ne nécessite pas de nouvelles liaisons covalentes entre chaînes latérales.",
        "Dans l’hélice α, le réseau caractéristique implique le squelette peptidique, pas exclusivement les groupes latéraux."
      ]
    },
    {
      "reason": "Deux groupements thiol de cystéines peuvent être oxydés en une liaison covalente S–S.",
      "options": [
        "La méthionine.",
        "La sérine.",
        "La lysine."
      ],
      "why": [
        "La méthionine contient un thioéther, pas un thiol libre susceptible de former le pont disulfure usuel.",
        "La sérine porte un hydroxyle ; elle ne fournit pas le soufre d’une liaison S–S.",
        "La lysine porte une chaîne latérale aminée, sans groupement thiol."
      ]
    },
    {
      "reason": "La dénaturation perturbe le repliement et souvent l’activité ; la séquence peut rester intacte si les liaisons peptidiques ne sont pas hydrolysées.",
      "options": [
        "Changer obligatoirement la séquence en acides aminés.",
        "Séparer uniquement les sous-unités, sans altérer aucun repliement.",
        "Hydrolyser chaque liaison peptidique jusqu’aux acides aminés libres."
      ],
      "why": [
        "La perte de conformation n’impose pas un changement de séquence primaire.",
        "La dénaturation peut affecter les structures secondaire et tertiaire, ainsi que les assemblages quaternaires.",
        "Une hydrolyse complète détruit la chaîne ; elle n’est pas nécessaire à la dénaturation."
      ]
    },
    {
      "reason": "Dans une protéine globulaire soluble, l’enfouissement de groupes apolaires réduit leur exposition au solvant aqueux.",
      "options": [
        "Parce que toutes les chaînes hydrophobes portent une charge positive.",
        "Parce que l’eau forme avec elles davantage de liaisons hydrogène qu’avec les groupes polaires.",
        "Parce que leur position est imposée uniquement par le sens N→C."
      ],
      "why": [
        "Hydrophobicité et charge positive ne sont pas équivalentes ; les chaînes apolaires sont généralement non chargées.",
        "Les groupes apolaires ne présentent pas les mêmes possibilités de liaison hydrogène avec l’eau que les groupes polaires.",
        "La séquence influence le repliement, mais le seul sens de lecture ne détermine pas l’exposition d’un résidu au solvant."
      ]
    }
  ],
  "biochem-enzymes-kinetics": [
    {
      "reason": "Le site actif stabilise l’état de transition et ouvre une voie réactionnelle à barrière plus faible, sans changer le ΔG global.",
      "options": [
        "Elle augmente la barrière d’activation pour les deux sens.",
        "Elle rend le ΔG de toute réaction négatif.",
        "Elle diminue uniquement l’énergie libre des produits."
      ],
      "why": [
        "Une barrière plus haute ralentirait la réaction ; la catalyse abaisse la barrière pertinente.",
        "Le ΔG dépend des états initial et final ; une enzyme n’en change pas le signe par sa seule présence.",
        "La catalyse ne modifie pas les niveaux énergétiques des réactifs et produits à l’équilibre."
      ]
    },
    {
      "reason": "Dans v = Vmax[S]/(Km+[S]), substituer [S]=Km donne v=Vmax/2.",
      "options": [
        "Vmax.",
        "Deux fois Vmax.",
        "Un quart de Vmax."
      ],
      "why": [
        "La Vmax est approchée lorsque [S] est très supérieur à Km, pas quand les deux sont égaux.",
        "La vitesse ne dépasse pas Vmax dans le modèle de Michaelis-Menten aux conditions fixées.",
        "Vmax/4 correspondrait à [S]=Km/3 dans ce modèle, non à [S]=Km."
      ]
    },
    {
      "reason": "En inhibition non compétitive pure, l’inhibiteur réduit la capacité catalytique sans modifier le Km apparent.",
      "options": [
        "Le Km apparent seul.",
        "La constante d’équilibre de la réaction.",
        "Le ΔG standard de réaction."
      ],
      "why": [
        "La non-compétition pure conserve Km ; une compétition classique augmente le Km apparent sans changer Vmax.",
        "Un inhibiteur agit sur la cinétique, pas sur l’équilibre thermodynamique de la réaction considérée.",
        "La variation d’activité enzymatique ne change pas les propriétés thermodynamiques standard des réactifs et produits."
      ]
    },
    {
      "reason": "L’enzyme accélère les réactions dans les deux sens ; les concentrations d’équilibre restent fixées par la thermodynamique.",
      "options": [
        "Oui, elle augmente nécessairement la proportion de produits à l’équilibre.",
        "Oui, à condition que sa concentration soit suffisamment élevée.",
        "Non, parce qu’elle n’accélère que le sens direct."
      ],
      "why": [
        "L’enzyme ne modifie pas la constante d’équilibre ; elle permet seulement de l’atteindre plus vite.",
        "Ajouter de l’enzyme augmente la capacité catalytique, sans déplacer l’équilibre de la réaction.",
        "Elle peut catalyser les deux sens ; accélérer seulement le sens direct ne justifierait pas la conservation de l’équilibre."
      ]
    },
    {
      "reason": "Le produit final peut inhiber une étape régulatrice en amont, limitant sa propre surproduction.",
      "options": [
        "Accélérer systématiquement sa propre synthèse quand le produit final s’accumule.",
        "Transformer directement le produit final en substrat initial.",
        "Consommer l’enzyme régulatrice à chaque réaction."
      ],
      "why": [
        "Ce serait une rétroaction positive ; la rétro-inhibition réduit une activité en amont.",
        "La régulation d’une enzyme ne se confond pas avec une réaction de conversion inverse.",
        "L’enzyme est un catalyseur réutilisable ; une régulation ne nécessite pas sa consommation stœchiométrique."
      ]
    }
  ],
  "biochem-bioenergetics": [
    {
      "reason": "Un ΔG négatif traduit une évolution thermodynamiquement favorable dans le sens étudié, sans information suffisante sur sa rapidité.",
      "options": [
        "La réaction est nécessairement instantanée.",
        "La réaction est à l’équilibre.",
        "La réaction ne peut se dérouler qu’avec une enzyme."
      ],
      "why": [
        "Une barrière d’activation élevée peut rendre très lent un processus favorable.",
        "À l’équilibre, ΔG vaut zéro ; une valeur négative indique une force motrice dans le sens direct.",
        "Une enzyme change la vitesse, mais ne définit pas le signe du ΔG."
      ]
    },
    {
      "reason": "Les variations d’énergie libre s’additionnent ; le couplage doit relier réellement les réactions, par exemple via un intermédiaire commun.",
      "options": [
        "La seule coexistence de deux réactions dans le même récipient suffit.",
        "Une enzyme change directement le signe du ΔG de l’étape défavorable isolée.",
        "Une réaction exergonique rend toutes les autres réactions cellulaires favorables."
      ],
      "why": [
        "Sans mécanisme de couplage, l’énergie dissipée par une réaction ne force pas nécessairement l’autre.",
        "La catalyse ne change pas la thermodynamique ; c’est le bilan des étapes couplées qui devient favorable.",
        "Le transfert d’énergie doit être organisé et localement couplé ; il n’existe pas d’effet automatique sur toutes les réactions."
      ]
    },
    {
      "reason": "La force proton-motrice comporte une composante électrique et une différence de pH à travers la membrane interne.",
      "options": [
        "Le seul gradient de sodium à travers la membrane plasmique.",
        "Le gradient de glucose entre cytosol et noyau.",
        "Le seul gradient de calcium du réticulum sarcoplasmique."
      ],
      "why": [
        "Ce gradient alimente certains transports cellulaires, pas directement l’ATP synthase mitochondriale humaine.",
        "Le glucose apporte des substrats énergétiques, mais ce n’est pas le flux qui traverse l’ATP synthase.",
        "Le calcium régule notamment la contraction ; le gradient couplé à l’ATP synthase mitochondriale est protonique."
      ]
    },
    {
      "reason": "Au complexe IV, l’oxygène reçoit des électrons et participe à la formation d’eau.",
      "options": [
        "Le NAD⁺, transformé en NADH en fin de chaîne.",
        "Le CO₂, réduit directement en glucose.",
        "Le pyruvate, réduit en lactate par le complexe IV."
      ],
      "why": [
        "Le NADH donne ses électrons à la chaîne ; le NAD⁺ n’est pas son accepteur terminal aérobie.",
        "La chaîne respiratoire humaine ne réalise pas la fixation du CO₂ en glucose.",
        "La réduction du pyruvate en lactate est cytosolique et catalysée par la lactate déshydrogénase, pas par le complexe IV."
      ]
    },
    {
      "reason": "La thermodynamique indique le sens favorable ; la cinétique dépend notamment de la barrière d’activation.",
      "options": [
        "Oui, tout ΔG négatif implique une vitesse élevée.",
        "Oui, si la réaction libère de la chaleur, même sans autre information.",
        "Non, parce que toute réaction favorable possède un ΔG positif."
      ],
      "why": [
        "Une réaction favorable peut être ralentie par une barrière d’activation importante.",
        "Le caractère exothermique ne suffit pas à déterminer la vitesse ni même, à lui seul, le ΔG.",
        "Le signe favorable est négatif ; la lenteur éventuelle relève de la cinétique, pas d’une inversion de ce signe."
      ]
    }
  ],
  "biochem-carbohydrate": [
    {
      "reason": "Les enzymes de la glycolyse fonctionnent dans le cytosol ; la présence de mitochondries n’est pas nécessaire à cette voie.",
      "options": [
        "La matrice mitochondriale.",
        "La membrane interne mitochondriale.",
        "La lumière du réticulum endoplasmique."
      ],
      "why": [
        "La matrice accueille notamment la pyruvate déshydrogénase et le cycle de Krebs, non les dix étapes glycolytiques.",
        "Cette membrane porte la chaîne respiratoire et l’ATP synthase, pas la glycolyse.",
        "La glycolyse est une voie cytosolique ; elle n’a pas pour compartiment la lumière du réticulum."
      ]
    },
    {
      "reason": "La voie consomme deux ATP puis en produit quatre par phosphorylation au niveau du substrat : le gain net est de deux par glucose.",
      "options": [
        "Quatre ATP nets.",
        "Zéro ATP net.",
        "Trente-deux ATP nets."
      ],
      "why": [
        "Quatre ATP sont formés, mais il faut soustraire les deux ATP initialement investis.",
        "Les quatre ATP produits dépassent les deux consommés ; le bilan n’est pas nul.",
        "Cet ordre de grandeur concerne une oxydation aérobie complète selon les conventions, pas la glycolyse isolée."
      ]
    },
    {
      "reason": "La glycéraldéhyde-3-phosphate déshydrogénase transfère des électrons au NAD⁺ lors de l’oxydation du substrat.",
      "options": [
        "Le NADP⁺, réduit en NADPH.",
        "Le FAD, réduit en FADH₂.",
        "L’ATP, réduit en ADP."
      ],
      "why": [
        "Le NADP⁺ intervient notamment dans la voie des pentoses phosphates ; l’enzyme glycolytique utilise le NAD⁺.",
        "Le FAD intervient dans d’autres réactions d’oxydation, mais pas comme coenzyme de cette étape glycolytique.",
        "ATP→ADP est une transformation de phosphorylation/hydrolyse, pas la réduction du coenzyme accepteur d’électrons ici."
      ]
    },
    {
      "reason": "La lactate déshydrogénase réduit le pyruvate en lactate en réoxydant le NADH ; le NAD⁺ peut ainsi être réutilisé par la glycolyse.",
      "options": [
        "Elle transforme le NADH en FADH₂.",
        "Elle produit un NADH supplémentaire à partir du NAD⁺.",
        "Elle hydrolyse le NADH pour former directement un ATP."
      ],
      "why": [
        "La fermentation lactique régénère le couple NAD⁺/NADH ; elle ne convertit pas un coenzyme en un autre.",
        "Dans le sens pyruvate→lactate, le NADH est consommé et non produit.",
        "Cette étape assure un équilibre redox ; elle ne synthétise pas directement d’ATP."
      ]
    },
    {
      "reason": "Aucune des dix réactions glycolytiques ne consomme O₂ ; la poursuite du flux exige néanmoins une régénération suffisante du NAD⁺.",
      "options": [
        "Oui, l’oxygène est le substrat de la phosphofructokinase.",
        "Oui, chaque glucose consomme directement six O₂ dans la glycolyse.",
        "Non, parce que la glycolyse n’effectue aucune réaction d’oxydoréduction."
      ],
      "why": [
        "La phosphofructokinase utilise le fructose-6-phosphate et l’ATP, pas O₂.",
        "Six O₂ correspondent au bilan d’oxydation complète du glucose, pas au bilan glycolytique.",
        "La voie réduit du NAD⁺ en NADH ; l’absence de consommation directe d’O₂ ne signifie pas absence d’oxydoréduction."
      ]
    }
  ],
  "biochem-fatty-acid-oxidation-ketogenesis": [
    {
      "reason": "Chaque tour de β-oxydation retire généralement une unité à deux carbones sous forme d’acétyl-CoA ; une chaîne impaire laisse finalement du propionyl-CoA.",
      "options": [
        "Le malonyl-CoA.",
        "Le pyruvate.",
        "Le citrate."
      ],
      "why": [
        "Le malonyl-CoA apporte des unités carbonées à la synthèse des acides gras ; ce n’est pas le produit répété de leur β-oxydation.",
        "Le pyruvate est notamment le produit de la glycolyse ; la β-oxydation libère surtout de l’acétyl-CoA.",
        "Le citrate se forme par condensation de l’acétyl-CoA et de l’oxaloacétate, en aval de la β-oxydation."
      ]
    },
    {
      "reason": "Le groupement acyle d’un acyl-CoA à longue chaîne est transféré à la carnitine pour franchir la membrane interne puis reconstitué en acyl-CoA dans la matrice.",
      "options": [
        "La navette malate-aspartate.",
        "Le transporteur mitochondrial du pyruvate.",
        "La translocase ADP/ATP."
      ],
      "why": [
        "Cette navette transfère des équivalents réducteurs du NADH cytosolique, pas les groupements acyle des acides gras longs.",
        "Ce transporteur fait entrer le pyruvate ; il ne remplace pas la navette carnitine.",
        "Elle échange les nucléotides adényliques entre matrice et cytosol, non les acides gras longs."
      ]
    },
    {
      "reason": "Le malonyl-CoA, intermédiaire de lipogenèse, inhibe CPT-I et limite l’entrée d’acides gras longs dans la voie mitochondriale d’oxydation.",
      "options": [
        "La carnitine.",
        "L’acétyl-CoA comme inhibiteur direct principal de CPT-I.",
        "L’oxaloacétate."
      ],
      "why": [
        "La carnitine participe à la navette comme accepteur de groupement acyle ; elle n’est pas le signal inhibiteur physiologique demandé.",
        "L’acétyl-CoA est un précurseur du malonyl-CoA ; c’est ce dernier qui assure le frein classique sur CPT-I.",
        "L’oxaloacétate intervient dans le cycle de Krebs et la néoglucogenèse ; il n’est pas l’inhibiteur régulateur classique de CPT-I."
      ]
    },
    {
      "reason": "La synthèse des acides gras consomme du NADPH lors des étapes réductrices de l’élongation.",
      "options": [
        "Le NAD⁺.",
        "Le FAD oxydé.",
        "L’ATP comme donneur direct d’électrons."
      ],
      "why": [
        "Le NAD⁺ est une forme oxydée ; il ne fournit pas les électrons des réductions lipogéniques.",
        "Le FAD accepte des électrons dans certaines oxydations ; il n’est pas le donneur réducteur de la synthase des acides gras.",
        "L’ATP fournit de l’énergie à certaines étapes, mais le pouvoir réducteur est apporté par le NADPH."
      ]
    },
    {
      "reason": "Les corps cétoniques sont produits surtout dans le foie puis utilisés par des tissus extra-hépatiques possédant la voie de cétolyse.",
      "options": [
        "Non, le foie consomme toute sa production grâce à SCOT.",
        "Oui, principalement pour être oxydés par les érythrocytes matures.",
        "Non, ils ne peuvent être utilisés que pour fabriquer des acides biliaires."
      ],
      "why": [
        "Le foie ne possède pas l’activité SCOT nécessaire à la cétolyse classique et exporte les corps cétoniques.",
        "Les érythrocytes matures n’ont pas de mitochondries et ne peuvent pas oxyder les corps cétoniques.",
        "Acétoacétate et β-hydroxybutyrate peuvent fournir de l’acétyl-CoA à des tissus extra-hépatiques ; ils ne sont pas limités à cette fonction."
      ]
    }
  ],
  "biochem-oxidative-phosphorylation": [
    {
      "reason": "Le retour des H⁺ vers la matrice peut être couplé à ADP+Pi→ATP ; l’énergie provient de la force proton-motrice.",
      "options": [
        "Un flux d’oxygène à travers l’ATP synthase.",
        "Un flux de NADH à travers la membrane interne.",
        "Un gradient de glucose à travers la membrane externe."
      ],
      "why": [
        "L’oxygène est réduit au complexe IV ; ce sont les protons qui empruntent le canal de l’ATP synthase.",
        "Le NADH mitochondrial est oxydé au complexe I ; il ne traverse pas l’ATP synthase.",
        "Ce gradient ne constitue pas la force motrice directement exploitée par l’ATP synthase."
      ]
    },
    {
      "reason": "La membrane interne porte les complexes respiratoires et sépare les compartiments entre lesquels s’établit la force proton-motrice.",
      "options": [
        "La membrane externe mitochondriale.",
        "La membrane plasmique de la cellule humaine.",
        "La lumière du réticulum endoplasmique."
      ],
      "why": [
        "La membrane externe contient notamment des porines ; elle n’héberge pas la chaîne respiratoire humaine.",
        "Certaines bactéries y placent leur chaîne respiratoire, mais dans la cellule humaine celle-ci est mitochondriale.",
        "Le réticulum participe entre autres aux synthèses protéiques et lipidiques, pas à la chaîne respiratoire mitochondriale."
      ]
    },
    {
      "reason": "L’O₂ capte des électrons au complexe IV et est réduit en eau ; son absence limite le flux respiratoire aérobie.",
      "options": [
        "Le cytochrome c.",
        "L’ubiquinone.",
        "Le NAD⁺."
      ],
      "why": [
        "Le cytochrome c est un transporteur intermédiaire entre les complexes III et IV, pas l’accepteur terminal.",
        "L’ubiquinone transporte des électrons vers le complexe III ; elle n’est pas l’accepteur final.",
        "Le NADH cède des électrons au début de la chaîne ; le NAD⁺ n’est pas l’accepteur final aérobie."
      ]
    },
    {
      "reason": "Une fuite de protons dissocie transport d’électrons et phosphorylation : moins d’énergie est conservée en ATP et davantage peut être dissipée en chaleur.",
      "options": [
        "Le rendement ATP par oxygène augmente nécessairement.",
        "La consommation d’oxygène doit toujours s’arrêter immédiatement.",
        "Le gradient protonique augmente puisque les protons circulent plus vite."
      ],
      "why": [
        "Le découplage diminue le rendement de phosphorylation, même si la consommation d’oxygène augmente.",
        "La chaîne peut accélérer lorsque la contre-pression du gradient diminue, si substrats et oxygène restent disponibles.",
        "Une fuite facilite le retour des protons et tend à dissiper le gradient, pas à l’accroître."
      ]
    },
    {
      "reason": "En phosphorylation oxydative, les complexes I, III et IV déplacent des protons vers l’espace intermembranaire ; l’ATP synthase exploite leur retour.",
      "options": [
        "Oui, l’ATP synthase crée le gradient tout en synthétisant l’ATP dans le même cycle.",
        "Non, seul le complexe II pompe des protons.",
        "Non, le gradient provient uniquement de la différence de volume des compartiments."
      ],
      "why": [
        "Dans son fonctionnement de synthèse, l’enzyme utilise le gradient ; un fonctionnement inverse peut hydrolyser l’ATP pour pomper des protons.",
        "Le complexe II transfère des électrons à l’ubiquinone sans pompage protonique.",
        "La force proton-motrice est entretenue par des transferts énergétiques, non par la seule géométrie des compartiments."
      ]
    }
  ]
}
export const biochemistryQuestions: Question[] = biochemistryCourses.flatMap(c => prompts[c.id].map((prompt, qi) => {
 const item = reviewedChoices[c.id][qi]
 return {id: `${c.id}-q${qi + 1}`, course: c.id, topic: c.category, prompt,
 options: [correctText[c.id][qi], ...item.options], correct: [0], why: [item.reason, ...item.why],
 difficulty: qi < 2 ? 'essentiel' as const : 'application' as const, format: 'single' as const}
}))
