import type { Course } from '../../curriculum'
import type { Question } from '../../questions'
import { canonicalCourses } from '../../taxonomy/canonicalCourses'

const metadata = new Map(canonicalCourses.filter(item => item.subject === 'Histologie').map(item => [item.id, item]))
const base = 'https://openstax.org/books/anatomy-and-physiology-2e/pages/'
type Draft = { objectives: string[]; sections: Course['sections']; trap: string; recall: string; answer: string; source: string; caseStudy: NonNullable<Course['caseStudy']>; glossary: NonNullable<Course['glossary']> }
const s = (title: string, text: string, bullets?: string[]) => ({ title, text, ...(bullets ? { bullets } : {}) })
function course(id: string, d: Draft): Course {
  const c = metadata.get(id)
  if (!c) throw new Error(`Chapitre canonique d’histologie introuvable : ${id}`)
  return { id, title: c.title, category: c.subject, tag: c.module, minutes: 13, structure: null, objectives: d.objectives,
    sections: d.sections, trap: d.trap, recall: d.recall, answer: d.answer, source: base + d.source,
    sources: [{ label: 'OpenStax · Anatomy & Physiology 2e', url: base + d.source }],
    prerequisites: ['Les quatre familles tissulaires', 'Organisation cellulaire et matrice extracellulaire'], glossary: d.glossary, caseStudy: d.caseStudy,
    review: { status: 'unreviewed', updatedAt: '2026-09-23', sourcesUpdatedAt: '2026-09-23' } }
}
export const histologyCourses: Course[] = [
  course('histo-blood-cells', {
    objectives: ['Distinguer plasma et éléments figurés du sang', 'Identifier les grandes lignées cellulaires sanguines', 'Relier hématopoïèse et fonctions de transport ou défense'],
    sections: [
      s('Le sang comme tissu conjonctif spécialisé', 'Le sang comprend une matrice extracellulaire liquide, le plasma, et des éléments figurés : érythrocytes, leucocytes et plaquettes. Il transporte gaz, nutriments, déchets, hormones et chaleur tout en participant à l’hémostase et à la défense. L’hématocrite correspond à la fraction volumique occupée principalement par les globules rouges.'),
      s('Plasma et sérum', 'Le plasma contient eau, électrolytes, nutriments, déchets et protéines, dont albumine, globulines et fibrinogène. L’albumine contribue fortement à la pression oncotique et transporte diverses molécules ; le fibrinogène intervient dans la coagulation. Le sérum est le liquide obtenu après coagulation et ne contient plus le fibrinogène consommé dans le caillot.'),
      s('Érythrocytes', 'Les globules rouges matures humains n’ont pas de noyau et sont riches en hémoglobine. Leur forme biconcave facilite les échanges et leur déformabilité permet le passage dans les capillaires. Ils transportent l’oxygène et contribuent au transport du dioxyde de carbone et au tamponnement acido-basique. Leur durée de vie moyenne est d’environ 120 jours.'),
      s('Leucocytes et plaquettes', 'Les leucocytes comprennent granulocytes, monocytes et lymphocytes, aux rôles complémentaires dans inflammation, immunité innée et adaptative. Les plaquettes sont des fragments cytoplasmiques dérivés des mégacaryocytes et participent au clou plaquettaire puis à la coagulation. Les proportions varient selon l’âge, l’état physiologique et les maladies.'),
      s('Hématopoïèse et lecture biologique', 'Les cellules sanguines dérivent de cellules souches hématopoïétiques médullaires qui s’engagent dans des lignées myéloïdes ou lymphoïdes. La production est régulée par cytokines et facteurs de croissance, notamment l’érythropoïétine dans l’érythropoïèse. Une numération s’interprète avec indices, contexte clinique, hydratation et intervalles adaptés au laboratoire.'),
    ], trap: 'Le plasma est prélevé sur sang anticoagulé ; le sérum est obtenu après coagulation et diffère notamment par le fibrinogène.', recall: 'Quels éléments figurés retrouve-t-on dans le sang ?', answer: 'Érythrocytes, leucocytes et plaquettes, baignés dans le plasma.', source: '18-1-an-overview-of-blood', glossary: [['Hématocrite', 'Fraction volumique du sang occupée principalement par les érythrocytes.'], ['Sérum', 'Fraction liquide après coagulation, appauvrie en fibrinogène.'], ['Mégacaryocyte', 'Grande cellule médullaire dont des fragments cytoplasmiques forment les plaquettes.']], caseStudy: { prompt: 'Pourquoi une numération érythrocytaire ne suffit-elle pas à caractériser une anémie ?', answer: 'Il faut aussi examiner hémoglobine, hématocrite, indices érythrocytaires, réticulocytes, contexte clinique et seuils adaptés.' } }),
  course('histo-bone-architecture', {
    objectives: ['Comparer cartilage et tissu osseux', 'Décrire les composants de leur matrice extracellulaire', 'Relier les cellules osseuses au remodelage'],
    sections: [
      s('Deux tissus conjonctifs spécialisés', 'Cartilage et os associent des cellules à une matrice extracellulaire abondante mais ont des propriétés différentes. Le cartilage est avasculaire et possède une matrice hydratée déformable ; l’os est vascularisé, minéralisé et remodelé continuellement. Leur architecture reflète les contraintes mécaniques auxquelles ils répondent.'),
      s('Cartilage et chondrocytes', 'Les chondroblastes synthétisent la matrice puis deviennent des chondrocytes logés dans des lacunes. Collagène, protéoglycanes et eau donnent au cartilage résistance à la compression et élasticité variable selon le type. Cartilages hyalin, élastique et fibreux diffèrent par leur organisation et leurs fibres dominantes. La nutrition des chondrocytes dépend surtout de la diffusion.'),
      s('Matrice osseuse', 'La matrice organique, riche en collagène de type I et protéines non collagéniques, confère une résistance à la traction ; les cristaux minéraux, surtout hydroxyapatite, apportent rigidité et résistance à la compression. L’os compact s’organise en ostéons dans de nombreux os longs, tandis que l’os spongieux présente des travées et des espaces médullaires.'),
      s('Cellules osseuses', 'Les ostéoblastes déposent la matrice ostéoïde et favorisent sa minéralisation. Certains deviennent des ostéocytes emprisonnés dans la matrice, connectés par des canalicules et capables de détecter les contraintes. Les ostéoclastes multinucléés résorbent l’os dans un microenvironnement acide et enzymatique. L’équilibre entre formation et résorption adapte le squelette.'),
      s('Remodelage et réparation', 'Le remodelage associe résorption puis formation dans des unités fonctionnelles, sous influence mécanique, hormonale et locale. Il participe à l’homéostasie du calcium et au renouvellement de l’os. Une fracture déclenche hématome, cal fibrocartilagineux, cal osseux puis remodelage ; les délais dépendent du site, de l’âge, de la vascularisation et des conditions cliniques.'),
    ], trap: 'Le cartilage n’est pas directement vascularisé : ses cellules reçoivent les nutriments principalement par diffusion à travers la matrice.', recall: 'Quelle cellule résorbe l’os et laquelle dépose la matrice osseuse ?', answer: 'L’ostéoclaste résorbe l’os ; l’ostéoblaste synthétise la matrice ostéoïde et favorise sa minéralisation.', source: '6-3-bone-structure', glossary: [['Ostéoïde', 'Matrice organique osseuse non encore minéralisée.'], ['Ostéon', 'Unité structurale concentrique de l’os compact.'], ['Lacune', 'Logette matricielle occupée notamment par un chondrocyte ou un ostéocyte.']], caseStudy: { prompt: 'Pourquoi une matrice cartilagineuse riche en protéoglycanes résiste-t-elle à la compression ?', answer: 'Les glycosaminoglycanes chargés retiennent l’eau et créent une matrice hydratée qui s’oppose à la compression, en coopération avec le réseau de collagène.' } }),
  course('histo-glands-exocrine-endocrine', {
    objectives: ['Distinguer glandes endocrines et exocrines', 'Décrire les modes de sécrétion', 'Relier organisation glandulaire au produit libéré'],
    sections: [
      s('Épithélium glandulaire', 'Les glandes sont formées de cellules épithéliales spécialisées dans la synthèse et la libération d’un produit. Elles peuvent provenir d’un bourgeonnement épithélial qui conserve ou perd sa connexion avec la surface. L’unité sécrétrice peut être unicellulaire, comme une cellule caliciforme, ou former un organe glandulaire complexe.'),
      s('Glandes exocrines', 'Les glandes exocrines conservent un conduit qui déverse leur sécrétion à la surface du corps ou dans une lumière. Elles sont classées par architecture simple ou composée, forme tubulaire ou acineuse, et nature séreuse, muqueuse ou mixte du produit. La polarité cellulaire organise synthèse, maturation et exocytose vers la lumière.'),
      s('Glandes endocrines', 'Les glandes endocrines n’ont pas de conduit excréteur et libèrent des hormones dans le milieu interstitiel puis le sang. Elles sont souvent richement vascularisées pour distribuer rapidement leurs produits. Les hormones hydrosolubles sont stockées dans des vésicules ; les stéroïdes diffusent après leur synthèse et circulent fréquemment liés à des protéines.'),
      s('Modes de sécrétion', 'La sécrétion mérocrine libère le produit par exocytose sans perte majeure de cytoplasme. La sécrétion apocrine emporte une portion apicale de cytoplasme ; la sécrétion holocrine libère le contenu lors de la désintégration de la cellule, ensuite renouvelée. Les glandes peuvent associer plusieurs produits et modes selon le tissu et l’état fonctionnel.'),
      s('Régulation et histologie fonctionnelle', 'La sécrétion peut être régulée par influx nerveux, hormones, facteurs locaux ou composition du contenu luminal. Au microscope, on repère la lumière, les unités sécrétrices, les conduits et l’organisation des noyaux, mais la coloration seule ne prouve pas une fonction moléculaire précise. Le prélèvement et l’orientation tissulaire influencent l’aspect observé.'),
    ], trap: 'La classification endocrine/exocrine dépend de la voie de libération et de la présence d’un conduit, pas seulement de la nature du produit.', recall: 'Quelle différence fondamentale distingue une glande endocrine d’une glande exocrine ?', answer: 'La glande endocrine déverse ses hormones vers le milieu interstitiel et le sang sans conduit ; la glande exocrine évacue son produit par un conduit vers une surface ou une lumière.', source: '4-2-epithelial-tissue', glossary: [['Acinus', 'Unité glandulaire sécrétrice arrondie autour d’une petite lumière.'], ['Mérocrine', 'Sécrétion par exocytose sans perte significative de cytoplasme.'], ['Cellule caliciforme', 'Cellule épithéliale unicellulaire sécrétrice de mucus.']], caseStudy: { prompt: 'Une glande déverse une enzyme digestive dans la lumière intestinale par un réseau de conduits. De quel type général s’agit-il ?', answer: 'Une glande exocrine, dont le produit rejoint une lumière par un conduit.' } }),
  course('histo-connective-tissues', {
    objectives: ['Identifier cellules et matrice des tissus conjonctifs', 'Comparer tissu adipeux blanc et brun', 'Expliquer le rôle des fibres et de la substance fondamentale'],
    sections: [
      s('Une matrice extracellulaire abondante', 'Les tissus conjonctifs associent cellules dispersées, fibres et substance fondamentale extracellulaire. Les fibroblastes synthétisent plusieurs composants matriciels ; macrophages, mastocytes et autres cellules participent défense et remodelage. La composition varie selon l’organe et les forces mécaniques ou besoins de transport.'),
      s('Fibres et substance fondamentale', 'Les fibres de collagène résistent à la traction, les fibres élastiques permettent déformation et retour, et les fibres réticulaires forment des réseaux fins. La substance fondamentale contient glycosaminoglycanes, protéoglycanes et glycoprotéines d’adhérence, qui organisent hydratation, diffusion et interactions cellulaires. Les proportions déterminent des propriétés tissulaires distinctes.'),
      s('Tissu adipeux blanc', 'Les adipocytes blancs possèdent généralement une grande goutte lipidique, un noyau repoussé à la périphérie et un cytoplasme peu abondant. Ils stockent les triacylglycérols, libèrent des acides gras selon les besoins et sécrètent des adipokines. Le tissu adipeux joue aussi un rôle endocrine et contribue isolation, protection mécanique et réserve énergétique.'),
      s('Tissu adipeux brun', 'Les adipocytes bruns contiennent plusieurs petites gouttelettes lipidiques et de nombreuses mitochondries, d’où leur aspect plus coloré. La protéine découplante UCP1 dissipe le gradient de protons et permet une thermogenèse sans frisson. Le tissu brun est particulièrement développé chez le nouveau-né ; sa présence et son activité persistent à des degrés variables chez l’adulte.'),
      s('Réparation et inflammation', 'Les cellules conjonctives répondent aux lésions en recrutant cellules immunitaires, remodelant matrice et déposant collagène. Une cicatrice mature restaure une continuité mécanique mais ne reproduit pas toujours l’organisation fonctionnelle initiale. Fibrose, inflammation chronique et défaut de matrice perturbent les échanges et les propriétés des tissus.'),
    ], trap: 'Les adipocytes ne sont pas de simples cellules passives de stockage : ils sécrètent des médiateurs et influencent le métabolisme systémique.', recall: 'Quelle molécule permet au tissu adipeux brun de produire de la chaleur en découplant la phosphorylation oxydative ?', answer: 'UCP1, aussi appelée thermogénine, dissipe une partie du gradient protonique sous forme de chaleur.', source: '4-3-connective-tissue-supporting-tissues', glossary: [['Substance fondamentale', 'Partie hydratée non fibrillaire de la matrice extracellulaire.'], ['Adipokine', 'Médiateur sécrété par le tissu adipeux.'], ['UCP1', 'Protéine mitochondriale de découplage impliquée dans la thermogenèse du tissu brun.']], caseStudy: { prompt: 'Pourquoi une cicatrice peut-elle être mécaniquement solide mais moins fonctionnelle que le tissu initial ?', answer: 'Le dépôt de collagène restaure une continuité, mais l’architecture spécialisée, les cellules et les propriétés élastiques ou fonctionnelles peuvent ne pas être entièrement reconstituées.' } }),
]
const prompts: Record<string, string[]> = {
  'histo-blood-cells': ['Quels éléments composent les éléments figurés du sang ?', 'Quelle protéine plasmatique contribue fortement à la pression oncotique ?', 'Qu’est-ce qui distingue sérum et plasma ?', 'Quelle est la forme des globules rouges humains matures ?', 'De quelles cellules dérivent les plaquettes ?'],
  'histo-bone-architecture': ['Quel type cellulaire dépose l’ostéoïde ?', 'Quel type cellulaire résorbe l’os ?', 'Pourquoi le cartilage dépend-il de la diffusion pour sa nutrition ?', 'Quel composant organique majeur contribue à la résistance à la traction de l’os ?', 'Que désigne un ostéon ?'],
  'histo-glands-exocrine-endocrine': ['Une glande endocrine possède-t-elle un conduit excréteur ?', 'Quel mode de sécrétion utilise l’exocytose ?', 'Quel produit une cellule caliciforme libère-t-elle ?', 'Quel est le trajet habituel d’une sécrétion exocrine dans une glande pluricellulaire ?', 'À quoi correspond la sécrétion holocrine ?'],
  'histo-connective-tissues': ['Quelle fonction mécanique assure principalement le collagène ?', 'Quelle protéine découplante participe à la thermogenèse du tissu brun ?', 'Quel aspect lipidique caractérise souvent un adipocyte blanc ?', 'Citez un rôle endocrine du tissu adipeux.', 'Une cicatrice restaure-t-elle toujours l’architecture initiale ?'],
}
const answers: Record<string, string[]> = {
  'histo-blood-cells': ['Érythrocytes, leucocytes et plaquettes.', 'L’albumine, protéine majoritaire contribuant à la pression oncotique.', 'Le sérum est obtenu après coagulation et contient beaucoup moins de fibrinogène que le plasma.', 'Une forme biconcave, sans noyau.', 'Des fragments cytoplasmiques de mégacaryocytes.'],
  'histo-bone-architecture': ['L’ostéoblaste.', 'L’ostéoclaste.', 'Il est avasculaire et les nutriments diffusent dans sa matrice hydratée.', 'Le collagène de type I.', 'Une unité structurale concentrique de l’os compact.'],
  'histo-glands-exocrine-endocrine': ['Non, elle libère vers le milieu interstitiel puis le sang.', 'La sécrétion mérocrine.', 'Du mucus, qui protège et lubrifie les surfaces épithéliales.', 'Par un conduit vers une surface ou une lumière.', 'La libération du produit lors de la désintégration de la cellule sécrétrice.'],
  'histo-connective-tissues': ['Résister aux forces de traction.', 'UCP1, ou thermogénine.', 'Une grande goutte lipidique unique qui repousse le noyau vers la périphérie.', 'Il sécrète des adipokines qui modulent notamment métabolisme et signaux endocriniens.', 'Non, la cicatrice peut restaurer la continuité sans reconstituer la spécialisation d’origine.'],
}
const reviewedChoices: Record<string, {reason: string; options: string[]; why: string[]}[]> = {
  "histo-blood-cells": [
    {
      "reason": "Les éléments figurés comprennent les cellules sanguines et les plaquettes, qui sont des fragments cellulaires.",
      "options": [
        "Érythrocytes, albumine et fibrinogène.",
        "Leucocytes, plaquettes et lipoprotéines.",
        "Érythrocytes, leucocytes et sérum."
      ],
      "why": [
        "Albumine et fibrinogène sont des protéines plasmatiques, pas des éléments figurés.",
        "Les lipoprotéines circulent dans le plasma ; elles ne sont pas comptées comme éléments figurés.",
        "Le sérum est la phase liquide obtenue après coagulation, non un élément figuré."
      ]
    },
    {
      "reason": "L’albumine est abondante dans le plasma et contribue fortement à la pression osmotique exercée par ses protéines.",
      "options": [
        "L’hémoglobine libre.",
        "Le collagène I.",
        "La myosine."
      ],
      "why": [
        "L’hémoglobine est normalement intracellulaire dans les érythrocytes ; elle n’est pas la principale protéine oncotique du plasma.",
        "Le collagène est surtout une protéine structurale de matrice extracellulaire, non la principale protéine soluble plasmatique.",
        "La myosine participe à la contraction cellulaire ; elle n’assure pas la pression oncotique plasmatique."
      ]
    },
    {
      "reason": "La coagulation consomme notamment le fibrinogène en formant la fibrine ; le sérum ne doit pas être décrit comme du plasma simplement dépourvu de cellules.",
      "options": [
        "Le sérum contient davantage de fibrinogène que le plasma.",
        "Le plasma est obtenu uniquement après coagulation complète.",
        "Le sérum contient les érythrocytes, contrairement au plasma."
      ],
      "why": [
        "Le fibrinogène est consommé lors de la coagulation qui permet d’obtenir le sérum.",
        "Le plasma est isolé sur sang anticoagulé ; après coagulation, on obtient du sérum.",
        "Après séparation, ni le plasma ni le sérum ne sont définis par la présence d’érythrocytes."
      ]
    },
    {
      "reason": "La biconcavité et la déformabilité facilitent les échanges et le passage capillaire ; l’érythrocyte mature est anucléé chez l’humain.",
      "options": [
        "Un disque biconcave avec noyau central.",
        "Une cellule sphérique riche en mitochondries.",
        "Une cellule à noyau polylobé et granulations."
      ],
      "why": [
        "Le noyau est expulsé pendant la maturation érythroïde ; il n’est pas présent dans l’érythrocyte mature humain.",
        "L’érythrocyte mature a perdu ses mitochondries ; la forme physiologique est un disque biconcave.",
        "Cette description correspond à certains granulocytes, notamment le neutrophile, pas à l’érythrocyte."
      ]
    },
    {
      "reason": "Les mégacaryocytes médullaires libèrent des fragments cytoplasmiques formant les plaquettes, impliquées dans l’hémostase.",
      "options": [
        "Des érythroblastes.",
        "Des monocytes.",
        "Des lymphoblastes."
      ],
      "why": [
        "Les érythroblastes appartiennent à la lignée érythrocytaire et ne produisent pas les plaquettes.",
        "Les monocytes sont des leucocytes de la lignée myéloïde ; ils ne se fragmentent pas physiologiquement en plaquettes.",
        "Les lymphoblastes donnent des cellules lymphoïdes ; la lignée mégacaryocytaire produit les plaquettes."
      ]
    }
  ],
  "histo-bone-architecture": [
    {
      "reason": "L’ostéoblaste synthétise la matrice organique non encore minéralisée, notamment son collagène I : l’ostéoïde.",
      "options": [
        "L’ostéoclaste.",
        "Le chondrocyte.",
        "Le mégacaryocyte."
      ],
      "why": [
        "L’ostéoclaste résorbe la matrice osseuse par acidification et enzymes, plutôt qu’il ne dépose l’ostéoïde.",
        "Le chondrocyte entretient la matrice du cartilage ; il n’est pas la cellule de dépôt de l’ostéoïde.",
        "Le mégacaryocyte produit des plaquettes dans la moelle ; il ne synthétise pas la matrice osseuse."
      ]
    },
    {
      "reason": "L’ostéoclaste, issu de précurseurs hématopoïétiques, résorbe l’os dans un compartiment acidifié au contact de la matrice.",
      "options": [
        "L’ostéoblaste.",
        "Le chondroblaste.",
        "Le fibroblaste."
      ],
      "why": [
        "L’ostéoblaste synthétise l’ostéoïde ; il intervient dans la régulation du remodelage, mais pas comme cellule résorptive principale.",
        "Le chondroblaste produit la matrice cartilagineuse, distincte de la résorption de l’os.",
        "Le fibroblaste élabore la matrice de tissus conjonctifs ; la résorption osseuse spécialisée relève des ostéoclastes."
      ]
    },
    {
      "reason": "Le cartilage ne contient pas de vaisseaux : les nutriments diffusent à travers la matrice depuis le périchondre ou le liquide synovial selon le site.",
      "options": [
        "Ses chondrocytes sont directement entourés de capillaires.",
        "Sa matrice minéralisée transporte activement les nutriments.",
        "Tous les cartilages sont nourris exclusivement par le périchondre."
      ],
      "why": [
        "Le cartilage est avasculaire ; les capillaires se trouvent dans les tissus voisins lorsqu’ils sont présents.",
        "La nutrition repose sur la diffusion, non sur un transport actif par une matrice ; la plupart des cartilages ne sont pas minéralisés.",
        "Le cartilage articulaire n’a pas de périchondre et reçoit notamment des nutriments du liquide synovial."
      ]
    },
    {
      "reason": "Les fibres de collagène I contribuent à la résistance à la traction ; la phase minérale apporte surtout rigidité et résistance à la compression.",
      "options": [
        "Le collagène II.",
        "L’hydroxyapatite comme constituant organique.",
        "L’élastine comme protéine majoritaire."
      ],
      "why": [
        "Le collagène II est caractéristique de la matrice de nombreux cartilages ; le collagène osseux prédominant est de type I.",
        "L’hydroxyapatite est un constituant minéral, et non organique, de l’os.",
        "L’élastine favorise le retour élastique de certains tissus ; elle n’est pas la principale protéine de l’os."
      ]
    },
    {
      "reason": "L’ostéon comprend des lamelles osseuses concentriques autour d’un canal central contenant des vaisseaux et des nerfs.",
      "options": [
        "Une travée isolée entourée de cartilage.",
        "Une cellule osseuse logée dans une lacune.",
        "Un canal transversal dépourvu de lamelles concentriques propres."
      ],
      "why": [
        "L’os trabéculaire forme des travées ; celles-ci ne sont pas des ostéons recouverts de cartilage.",
        "La cellule dans la lacune est un ostéocyte ; l’ostéon est une organisation multicellulaire et matricielle.",
        "Cette description évoque un canal perforant de Volkmann ; l’ostéon s’organise autour d’un canal de Havers."
      ]
    }
  ],
  "histo-glands-exocrine-endocrine": [
    {
      "reason": "Les produits endocrines sont libérés au pôle basal vers l’interstitium puis les capillaires ; il n’existe pas de conduit excréteur pour cette sécrétion.",
      "options": [
        "Oui, un canal conduit ses hormones jusqu’à la surface épithéliale.",
        "Oui, les capillaires sont ses conduits excréteurs.",
        "Non, parce que son produit reste stocké définitivement dans la cellule."
      ],
      "why": [
        "Un conduit vers une surface ou une lumière caractérise la voie exocrine, pas endocrine.",
        "Les capillaires transportent le sang après passage de l’hormone dans l’interstitium ; ils ne sont pas des canaux excréteurs épithéliaux.",
        "L’absence de conduit ne signifie pas absence de libération : les hormones rejoignent le milieu extracellulaire."
      ]
    },
    {
      "reason": "Dans la sécrétion mérocrine, les vésicules fusionnent avec la membrane sans perte majeure de cytoplasme ni destruction cellulaire.",
      "options": [
        "La sécrétion holocrine.",
        "La sécrétion apocrine.",
        "La desquamation épithéliale."
      ],
      "why": [
        "En holocrinie, le produit est libéré avec la désintégration de la cellule, comme dans les glandes sébacées.",
        "La sécrétion apocrine emporte une portion apicale du cytoplasme ; elle se distingue de l’exocytose mérocrine.",
        "La desquamation est une perte de cellules superficielles, pas un mécanisme d’exocytose sécrétoire."
      ]
    },
    {
      "reason": "Les cellules caliciformes libèrent des mucines qui s’hydratent et participent au mucus des surfaces respiratoires ou digestives.",
      "options": [
        "Du collagène I organisé en faisceaux.",
        "Une sécrétion lipidique de type sébum.",
        "Une sécrétion majoritairement riche en pepsinogène."
      ],
      "why": [
        "Les fibres de collagène sont principalement produites par des cellules conjonctives ; elles ne sont pas le produit des cellules caliciformes.",
        "Le sébum est associé aux glandes sébacées, à sécrétion holocrine.",
        "Le pepsinogène est produit par les cellules principales gastriques, pas par les cellules caliciformes."
      ]
    },
    {
      "reason": "Une sécrétion exocrine rejoint une surface ou une lumière ; les glandes pluricellulaires utilisent généralement un conduit, contrairement aux cellules caliciformes isolées.",
      "options": [
        "Vers les capillaires après passage interstitiel, sans débouché de surface.",
        "Vers le noyau de la cellule sécrétrice.",
        "Uniquement vers une autre cellule par jonction communicante."
      ],
      "why": [
        "Ce trajet définit la sécrétion endocrine, non la voie exocrine.",
        "Le produit exocrine est destiné au milieu extracellulaire, pas à l’accumulation intranucléaire.",
        "Une jonction communicante permet un passage intercellulaire de petites molécules ; ce n’est pas un canal excréteur glandulaire."
      ]
    },
    {
      "reason": "La cellule entière se désintègre et contribue à la sécrétion ; le renouvellement de la glande remplace les cellules perdues.",
      "options": [
        "Une exocytose laissant intacte la cellule.",
        "La perte du seul pôle apical de la cellule.",
        "Une diffusion hormonale à travers la membrane basale."
      ],
      "why": [
        "C’est le mécanisme mérocrine ; l’holocrinie implique la perte de la cellule sécrétrice.",
        "La perte apicale caractérise l’apocrinie ; l’holocrinie engage la cellule entière.",
        "Ce trajet décrit une libération endocrine, pas la désintégration cellulaire holocrine."
      ]
    }
  ],
  "histo-connective-tissues": [
    {
      "reason": "Les fibrilles de collagène s’assemblent en fibres qui limitent l’étirement et résistent à la traction.",
      "options": [
        "Assurer principalement le retour élastique après étirement.",
        "Former directement la phase minérale de l’os.",
        "Produire une contraction dépendante de l’actine-myosine."
      ],
      "why": [
        "Cette fonction dépend surtout des fibres élastiques ; le collagène limite l’extension et résiste à la traction.",
        "Le collagène est une protéine organique ; l’hydroxyapatite constitue la phase minérale.",
        "Le collagène est extracellulaire et ne constitue pas l’appareil contractile actine-myosine."
      ]
    },
    {
      "reason": "UCP1 facilite le retour des protons vers la matrice mitochondriale en contournant l’ATP synthase ; l’énergie est dissipée sous forme de chaleur.",
      "options": [
        "L’ATP synthase seule.",
        "La myoglobine.",
        "Le collagène IV."
      ],
      "why": [
        "L’ATP synthase couple le retour des protons à la synthèse d’ATP ; UCP1 permet le découplage thermogène.",
        "La myoglobine lie l’oxygène dans le muscle ; elle n’est pas le canal protonique thermogène du tissu brun.",
        "Le collagène IV forme des réseaux dans les lames basales ; il n’est pas une protéine de découplage mitochondrial."
      ]
    },
    {
      "reason": "L’adipocyte blanc est typiquement uniloculaire ; sa grande vacuole lipidique refoule le cytoplasme et le noyau.",
      "options": [
        "De nombreuses petites gouttelettes et un noyau plutôt central.",
        "Un noyau polylobé entouré de granulations.",
        "Une cellule sans noyau remplie d’hémoglobine."
      ],
      "why": [
        "Cette organisation multiloculaire est caractéristique du tissu adipeux brun plutôt que de l’adipocyte blanc typique.",
        "Cette morphologie évoque un granulocyte ; l’adipocyte possède un noyau unique souvent aplati en périphérie.",
        "Cette description correspond à l’érythrocyte mature, pas à une cellule adipeuse."
      ]
    },
    {
      "reason": "La leptine et l’adiponectine sont des adipokines ; le tissu adipeux participe ainsi à la régulation métabolique et ne fait pas que stocker des lipides.",
      "options": [
        "Il produit l’insuline comme les cellules β pancréatiques.",
        "Il est dépourvu d’activité sécrétoire car sa vacuole occupe tout le cytoplasme.",
        "Il sécrète la bile dans des canalicules."
      ],
      "why": [
        "L’insuline est principalement sécrétée par les cellules β des îlots pancréatiques ; l’adipocyte est notamment une cellule cible.",
        "L’adipocyte conserve des organites et une activité sécrétoire, malgré la grande place de sa vacuole lipidique.",
        "La bile est produite par les hépatocytes ; les adipokines sont les médiateurs caractéristiques du tissu adipeux."
      ]
    },
    {
      "reason": "La réparation par fibrose rétablit une continuité, mais peut remplacer des structures spécialisées par une matrice riche en collagène.",
      "options": [
        "Oui, un dépôt de collagène prouve la régénération complète du tissu.",
        "Oui, dès que la surface de la plaie est refermée.",
        "Non, car une cicatrice ne contient aucune matrice extracellulaire."
      ],
      "why": [
        "Un dépôt de collagène signe une réparation matricielle, pas nécessairement le retour des cellules et fonctions spécialisées.",
        "La fermeture de surface ne garantit ni organisation profonde ni récupération fonctionnelle complète.",
        "La cicatrice contient au contraire une matrice abondante, dont la composition et l’organisation diffèrent du tissu initial."
      ]
    }
  ]
}
export const histologyQuestions: Question[] = histologyCourses.flatMap(c => prompts[c.id].map((prompt, qi) => {
 const item = reviewedChoices[c.id][qi]
 return {id: `${c.id}-q${qi + 1}`, course: c.id, topic: c.category, prompt,
 options: [answers[c.id][qi], ...item.options], correct: [0], why: [item.reason, ...item.why],
 difficulty: qi < 2 ? 'essentiel' as const : 'application' as const, format: 'single' as const}
}))
