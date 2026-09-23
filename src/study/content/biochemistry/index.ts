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
    source: '6-3-introduction-to-metabolism', glossary: [['Phosphorylation au niveau du substrat', 'Formation d’ATP par transfert direct d’un phosphate depuis un intermédiaire.'], ['NADH', 'Forme réduite du coenzyme NAD⁺, transporteur d’électrons.'], ['Fermentation lactique', 'Réduction du pyruvate en lactate qui réoxyde le NADH en NAD⁺.']],
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
    source: '6-3-lipid-metabolism', glossary: [['Acyl-CoA', 'Acide gras activé et lié au coenzyme A.'], ['CPT-I', 'Enzyme de la membrane mitochondriale externe régulant l’entrée des acides gras longs.'], ['Corps cétonique', 'Métabolite hydrosoluble produit par le foie à partir de l’acétyl-CoA.']],
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
    recall: 'Pourquoi le FADH₂ alimente-t-il généralement moins de synthèse d’ATP que le NADH ?',
    answer: 'Ses électrons entrent au niveau du complexe II et contournent le complexe I, ce qui réduit le nombre total de protons pompés.',
    source: '6-5-oxidative-phosphorylation', glossary: [['Force proton-motrice', 'Gradient électrochimique à travers la membrane interne mitochondriale.'], ['Accepteur terminal', 'Molécule recevant les électrons en fin de chaîne, ici l’oxygène.'], ['Découplant', 'Agent dissipant le gradient protonique sans produire directement l’ATP correspondant.']],
    caseStudy: { prompt: 'Une molécule découplante dissipe le gradient protonique. Quel effet attendre sur la synthèse d’ATP et la production de chaleur ?', answer: 'La phosphorylation oxydative produit moins d’ATP et une plus grande part de l’énergie est dissipée sous forme de chaleur.' }
  }),
]

const prompts: Record<string, [string, string, string, string, string]> = {
  'biochem-amino-acids-properties': ['Quel niveau décrit la séquence N- vers C-terminale ?', 'Quelles interactions stabilisent principalement une hélice alpha ?', 'Quel résidu peut former un pont disulfure ?', 'Que signifie dénaturer une protéine sans hydrolyse ?', 'Pourquoi une chaîne latérale hydrophobe est-elle souvent enfouie ?'],
  'biochem-enzymes-kinetics': ['Quel effet une enzyme exerce-t-elle sur l’énergie d’activation ?', 'Dans le modèle simple, que vaut v quand [S] = Km ?', 'Quel paramètre diminue avec une inhibition non compétitive pure ?', 'Une enzyme déplace-t-elle la position de l’équilibre ?', 'Quel rôle joue une rétro-inhibition métabolique ?'],
  'biochem-bioenergetics': ['Que signifie un ΔG négatif ?', 'Comment le couplage énergétique rend-il possible une étape défavorable ?', 'Quel gradient alimente directement l’ATP synthase mitochondriale ?', 'Quel accepteur reçoit les électrons à la fin de la chaîne respiratoire mitochondriale ?', 'Un processus favorable est-il nécessairement rapide ?'],
  'biochem-carbohydrate': ['Dans quel compartiment se déroule la glycolyse ?', 'Quel est son gain net classique en ATP par glucose ?', 'Quel coenzyme est réduit lors de l’oxydation du glycéraldéhyde-3-phosphate ?', 'Que fait la fermentation lactique au NADH ?', 'La glycolyse requiert-elle directement l’oxygène ?'],
  'biochem-fatty-acid-oxidation-ketogenesis': ['Quel est le produit carboné récurrent de la bêta-oxydation ?', 'Quel transporteur aide les acides gras longs à entrer dans la matrice mitochondriale ?', 'Quel inhibiteur physiologique freine CPT-I ?', 'Quel cofacteur réducteur soutient la synthèse des acides gras ?', 'Le foie exporte-t-il ses corps cétoniques comme carburant ?'],
    'biochem-oxidative-phosphorylation': ['Quel gradient traverse directement l’ATP synthase mitochondriale ?', 'Où se situe la chaîne respiratoire mitochondriale ?', 'Quel est l’accepteur terminal des électrons en respiration aérobie ?', 'Que se passe-t-il si la membrane interne devient perméable aux protons ?', 'Le gradient de protons est-il créé par l’ATP synthase ?'],
}
const correctText: Record<string, string[]> = {
  'biochem-amino-acids-properties': ['La structure primaire.', 'Des liaisons hydrogène entre groupes du squelette peptidique.', 'La cystéine.', 'Perdre des conformations supérieures sans couper nécessairement les liaisons peptidiques.', 'L’enfouissement limite leur contact avec l’eau et contribue à l’effet hydrophobe.'],
  'biochem-enzymes-kinetics': ['Elle l’abaisse en stabilisant l’état de transition.', 'La moitié de Vmax.', 'La Vmax, vitesse maximale lorsque l’enzyme est saturée.', 'Non, elle accélère l’atteinte de l’équilibre sans modifier sa position.', 'Elle adapte le flux en freinant une étape lorsque le produit final est suffisamment abondant.'],
  'biochem-bioenergetics': ['Le processus est favorable dans les conditions considérées, mais sa vitesse n’est pas déterminée par ce seul signe.', 'Le bilan des ΔG devient négatif si les étapes sont mécanistiquement liées.', 'Le gradient électrochimique de protons.', 'L’oxygène, réduit en eau.', 'Non, la vitesse dépend aussi de la barrière d’activation et de la catalyse.'],
  'biochem-carbohydrate': ['Le cytosol, compartiment où se déroulent ses dix réactions.', 'Deux ATP nets.', 'Le NAD⁺, réduit en NADH.', 'Elle réoxyde le NADH en NAD⁺.', 'Non, la voie n’utilise pas directement l’oxygène.'],
  'biochem-fatty-acid-oxidation-ketogenesis': ['L’acétyl-CoA.', 'La navette carnitine.', 'Le malonyl-CoA.', 'Le NADPH, cofacteur réducteur utilisé lors de la synthèse lipidique.', 'Oui, ils peuvent être utilisés par plusieurs tissus après adaptation.'],
  'biochem-oxidative-phosphorylation': ['Le gradient électrochimique de protons entre espace intermembranaire et matrice.', 'La membrane interne de la mitochondrie.', 'L’oxygène, qui est réduit en eau.', 'Le gradient se dissipe et la synthèse d’ATP peut diminuer malgré une respiration accrue.', 'Non, les complexes de la chaîne respiratoire contribuent à le créer.'],
}
const distractors = ['Elle coupe directement les liaisons peptidiques.', 'Elle consomme obligatoirement un ATP à chaque étape.', 'Elle se déroule uniquement dans le noyau.', 'Elle change nécessairement l’équilibre chimique final.']
export const biochemistryQuestions: Question[] = biochemistryCourses.flatMap((c, index) => prompts[c.id].map((prompt, qIndex) => {
  const answer = correctText[c.id][qIndex]
  const options = [answer, distractors[(qIndex + index) % distractors.length], distractors[(qIndex + index + 1) % distractors.length], distractors[(qIndex + index + 2) % distractors.length]]
  const correct = [0]
  return { id: `${c.id}-q${qIndex + 1}`, course: c.id, topic: c.category, prompt, options, correct,
    why: options.map((option, optionIndex) => optionIndex === 0 ? answer : `${option} Cette proposition ne correspond pas au mécanisme décrit dans le cours.`), difficulty: qIndex < 2 ? 'essentiel' as const : 'application' as const, format: 'single' as const }
}))
