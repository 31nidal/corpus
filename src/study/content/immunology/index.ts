import type { Course } from '../../curriculum'
import type { Question } from '../../questions'
import { canonicalCourses } from '../../taxonomy/canonicalCourses'

const metadata = new Map(canonicalCourses.filter(item => item.subject === 'Immunologie').map(item => [item.id, item]))
type Draft = { objectives: string[]; sections: Course['sections']; trap: string; recall: string; answer: string; source: string; caseStudy: NonNullable<Course['caseStudy']>; glossary: NonNullable<Course['glossary']> }
const s = (title: string, text: string, bullets?: string[]) => ({ title, text, ...(bullets ? { bullets } : {}) })
function course(id: string, d: Draft): Course {
  const c = metadata.get(id)
  if (!c) throw new Error(`Chapitre canonique d’immunologie introuvable : ${id}`)
  return { id, title: c.title, category: c.subject, tag: c.module, minutes: 14, structure: null,
    objectives: d.objectives, sections: d.sections, trap: d.trap, recall: d.recall, answer: d.answer,
    source: d.source, sources: [{ label: d.source.includes('cdc.gov') ? 'CDC · Principles of Vaccination' : 'NCBI Bookshelf · Immunobiology / Medical Microbiology', url: d.source }],
    prerequisites: ['Cellules et médiateurs de l’immunité', 'Notions d’antigène et de reconnaissance moléculaire'],
    glossary: d.glossary, caseStudy: d.caseStudy, review: { status: 'unreviewed', updatedAt: '2026-09-23', sourcesUpdatedAt: '2026-09-23' } }
}
export const immunologyCourses: Course[] = [
  course('immuno-innate', {
    objectives: ['Identifier les barrières de l’immunité innée', 'Expliquer la reconnaissance par les PRR', 'Relier inflammation et recrutement cellulaire'],
    sections: [
      s('Une défense rapide et distribuée', 'L’immunité innée répond rapidement à des motifs associés aux microbes ou aux dommages tissulaires. Elle comprend les barrières épithéliales, des protéines solubles et des cellules sentinelles ou effectrices. Elle ne requiert pas de rencontre préalable avec un antigène et contribue à orienter la réponse adaptative.'),
      s('Barrières physiques et chimiques', 'La peau forme une barrière kératinisée et les muqueuses utilisent jonctions cellulaires, mucus et clairance mécanique. Acidité gastrique, enzymes, peptides antimicrobiens et microbiote limitent la colonisation. Une barrière ne fonctionne pas seule : son renouvellement, son hydratation et les comportements mécaniques comme le battement ciliaire participent à sa protection.'),
      s('Reconnaissance par les PRR', 'Les récepteurs de reconnaissance de motifs détectent des structures conservées de microbes, les PAMP, et des signaux de dommage, les DAMP. Les récepteurs TLR, NLR et autres familles sont exprimés selon les cellules et compartiments. Leur activation déclenche des voies de signalisation qui produisent cytokines, chimiokines et médiateurs antimicrobiens.'),
      s('Inflammation locale', 'Vasodilatation et augmentation de perméabilité facilitent l’arrivée de protéines plasmatiques et de leucocytes. Les chimiokines guident le recrutement ; neutrophiles et monocytes traversent l’endothélium puis phagocytent ou libèrent des molécules effectrices. Rougeur, chaleur, douleur et œdème résultent de mécanismes locaux et n’identifient pas à eux seuls une cause infectieuse.'),
      s('Complément et cellules effectrices', 'Le complément est activé par plusieurs voies et converge vers le dépôt de C3b, l’inflammation et, pour certaines cibles, la formation du complexe d’attaque membranaire. Macrophages, neutrophiles, cellules NK et dendritiques ont des fonctions distinctes. Les cellules dendritiques relient détection innée et activation de lymphocytes en présentant des antigènes dans un contexte de co-stimulation.'),
    ], trap: 'L’immunité innée reconnaît des motifs et contextes de danger ; elle ne signifie pas une absence totale de spécificité moléculaire.', recall: 'Que détectent les PRR et quelles réponses peuvent-ils déclencher ?', answer: 'Ils reconnaissent des PAMP microbiens ou DAMP liés à des dommages, activant notamment cytokines, chimiokines, inflammation et fonctions antimicrobiennes.', source: 'https://www.ncbi.nlm.nih.gov/books/NBK7795/', glossary: [['PAMP', 'Motif moléculaire conservé associé à des microorganismes.'], ['DAMP', 'Signal moléculaire libéré ou exposé lors de dommages cellulaires.'], ['PRR', 'Récepteur inné détectant des motifs microbiens ou de dommage.']], caseStudy: { prompt: 'Une bactérie franchit un épithélium et active des cellules sentinelles. Quel type de signaux facilite le recrutement des neutrophiles ?', answer: 'Les chimiokines produites localement établissent des signaux de recrutement et de chimiotactisme ; les molécules endothéliales favorisent adhésion et transmigration.' } }),
  course('immuno-adaptive', {
    objectives: ['Distinguer fonctions des lymphocytes B et T', 'Expliquer sélection clonale et mémoire', 'Décrire la présentation de l’antigène par CMH I et II'],
    sections: [
      s('Spécificité et clones', 'L’immunité adaptative repose sur des récepteurs diversifiés des lymphocytes B et T. Chaque clone exprime un récepteur de spécificité donnée ; la sélection et l’expansion clonales augmentent les cellules capables de répondre à l’antigène. Après la réponse, des cellules mémoire persistent et réagissent plus rapidement lors d’une exposition ultérieure.'),
      s('Lymphocytes B et anticorps', 'Un lymphocyte B reconnaît directement certaines formes natives d’antigène via son récepteur. Avec l’aide de lymphocytes T auxiliaires dans de nombreuses réponses, il prolifère et se différencie en plasmocytes producteurs d’anticorps et cellules mémoire. Les anticorps neutralisent, opsonisent ou activent le complément ; leurs fonctions varient selon la classe.'),
      s('Lymphocytes T et présentation', 'Les lymphocytes T reconnaissent un peptide présenté par une molécule du complexe majeur d’histocompatibilité. Le CMH I présente surtout des peptides issus de protéines cytosoliques aux T CD8 ; le CMH II présente surtout des antigènes internalisés aux T CD4. Ces règles générales comportent des mécanismes spécialisés, comme la présentation croisée.'),
      s('Activation et co-stimulation', 'La reconnaissance du complexe peptide-CMH est un signal nécessaire mais souvent insuffisant. Les cellules présentatrices professionnelles fournissent co-stimulation et cytokines, qui orientent prolifération et différenciation. L’absence de signaux adéquats peut entraîner anergie ou tolérance plutôt qu’une activation complète, ce qui participe à prévenir des réponses inappropriées.'),
      s('Réponse et mémoire', 'Les T CD4 coordonnent d’autres cellules par cytokines ; les T CD8 peuvent tuer des cellules infectées ou anormales. La réponse primaire comporte une phase de latence puis expansion ; des plasmocytes à longue durée de vie et lymphocytes mémoire persistent. La mémoire améliore souvent rapidité et ampleur sans garantir une protection absolue contre toute variante d’agent.'),
    ], trap: 'Le lymphocyte T ne reconnaît généralement pas l’antigène soluble natif : son récepteur reconnaît un peptide associé au CMH.', recall: 'Quel couple CMH / sous-population T associer aux peptides cytosoliques ?', answer: 'Le CMH I présente surtout des peptides cytosoliques aux lymphocytes T CD8.', source: 'https://www.ncbi.nlm.nih.gov/books/NBK27098/', glossary: [['Sélection clonale', 'Expansion des lymphocytes portant un récepteur adapté à l’antigène rencontré.'], ['Opsonisation', 'Marquage d’une cible facilitant sa phagocytose.'], ['Co-stimulation', 'Signal supplémentaire nécessaire à l’activation complète de nombreux lymphocytes T.']], caseStudy: { prompt: 'Une cellule infectée présente un peptide viral sur CMH I. Quelle population lymphocytaire peut reconnaître ce complexe ?', answer: 'Les lymphocytes T CD8, qui peuvent ensuite exercer une fonction cytotoxique après activation appropriée.' } }),
  course('immuno-clinical', {
    objectives: ['Comparer immunisation active et passive', 'Distinguer détection d’anticorps et d’antigène', 'Interpréter limites d’une sérologie selon le délai'],
    sections: [
      s('Immunisation active', 'La vaccination expose le système immunitaire à un antigène ou à son information sans reproduire nécessairement la maladie. Elle active des lymphocytes spécifiques et peut créer des cellules mémoire. La réponse dépend de la plateforme, du schéma, de l’âge, de l’immunité de départ et des rappels ; protection individuelle et réduction de transmission ne sont pas identiques.'),
      s('Immunisation passive', 'Une immunisation passive fournit directement des anticorps ou immunoglobulines. La protection peut être immédiate mais décroît au cours du temps et ne crée généralement pas la même mémoire immunitaire. Les indications, produits, risques et durées varient ; une décision clinique relève des recommandations en vigueur et du contexte individuel.'),
      s('Antigènes et anticorps en sérologie', 'Un test peut détecter un antigène du microorganisme, des anticorps de l’hôte ou un autre marqueur. Un résultat positif indique uniquement que le seuil et la cible du test sont satisfaits dans les conditions de validation. Sensibilité, spécificité, prévalence et fenêtre diagnostique influencent l’interprétation.'),
      s('Fenêtre et cinétique', 'Après une infection ou vaccination, les marqueurs apparaissent et évoluent selon des délais distincts. Un test d’anticorps négatif trop tôt n’exclut pas toujours une exposition récente ; un anticorps persistant ne prouve pas nécessairement une infection active. Répéter, associer plusieurs marqueurs ou utiliser une méthode directe peut être indiqué selon la question clinique.'),
      s('Faux résultats et décision', 'Réactions croisées, prélèvement, traitement, immunodépression et caractéristiques de population peuvent modifier les performances. La valeur prédictive positive dépend de la probabilité prétest : un même test peut avoir des implications différentes selon le contexte. Aucun résultat sérologique isolé ne remplace l’interprétation clinique ni le conseil professionnel.'),
    ], trap: 'Un anticorps détecté ne signifie pas toujours une infection active : il peut persister après guérison ou vaccination.', recall: 'Quelle différence entre immunisation active et passive concernant la mémoire ?', answer: 'L’immunisation active stimule la réponse propre et peut créer une mémoire ; l’immunisation passive apporte des anticorps préformés, agit rapidement mais ne crée généralement pas la même mémoire.', source: 'https://www.cdc.gov/pinkbook/hcp/table-of-contents/chapter-1-principles-of-vaccination.html', glossary: [['Immunisation active', 'Stimulation de la réponse immunitaire propre par un antigène ou une vaccination.'], ['Immunisation passive', 'Apport direct d’anticorps préformés.'], ['Fenêtre sérologique', 'Période durant laquelle un marqueur peut ne pas encore être détectable.']], caseStudy: { prompt: 'Une sérologie est négative quelques jours après une exposition suspectée. Pourquoi ce résultat peut-il être insuffisant ?', answer: 'Les anticorps peuvent ne pas avoir atteint le seuil de détection ; il faut tenir compte du délai, du test, de la probabilité prétest et des autres méthodes disponibles.' } }),
]
const prompts: Record<string, string[]> = {
  'immuno-innate': ['Que détectent les récepteurs PRR ?', 'Quelle cellule peut relier immunité innée et activation adaptative par présentation antigénique ?', 'Quel médiateur guide le chimiotactisme des leucocytes ?', 'Le complément participe-t-il à l’opsonisation ?', 'L’inflammation prouve-t-elle à elle seule une infection ?'],
  'immuno-adaptive': ['Que reconnaît un TCR αβ conventionnel dans la présentation antigénique classique ?', 'Quel corécepteur lymphocytaire T est classiquement associé au CMH I ?', 'Quelles cellules produisent des anticorps ?', 'Quel processus augmente les lymphocytes spécifiques après exposition ?', 'La mémoire immunitaire assure-t-elle une protection absolue contre toute variante ?'],
  'immuno-clinical': ['Quelle forme d’immunisation tend à créer une mémoire ?', 'L’immunisation passive fournit-elle des anticorps préformés ?', 'Un anticorps positif démontre-t-il toujours une infection active ?', 'Que peut signifier une sérologie négative très précoce ?', 'De quoi dépend la valeur prédictive positive d’un test ?'],
}
const answers: Record<string, string[]> = {
  'immuno-innate': ['Des motifs microbiens conservés et des signaux de dommage, PAMP et DAMP.', 'La cellule dendritique.', 'Les chimiokines.', 'Oui, C3b peut opsoniser des cibles.', 'Non, elle peut avoir plusieurs causes et s’interprète dans son contexte.'],
  'immuno-adaptive': ['Un peptide présenté par une molécule du CMH.', 'CMH I et lymphocyte T CD8.', 'Les plasmocytes issus de lymphocytes B activés.', 'La sélection et l’expansion clonales.', 'Non, une protection peut diminuer ou varier selon les antigènes et les personnes.'],
  'immuno-clinical': ['L’immunisation active, qui stimule les lymphocytes et la mémoire.', 'Oui, elle apporte directement des immunoglobulines.', 'Non, il peut persister après une infection résolue ou une vaccination.', 'Les anticorps peuvent ne pas être encore détectables pendant la fenêtre sérologique.', 'De la sensibilité, spécificité et probabilité prétest ou prévalence dans la population testée.'],
}
const reviewedChoices: Record<string, {reason: string; options: string[]; why: string[]}[]> = {
  "immuno-innate": [
    {
      "reason": "Les PRR reconnaissent des motifs moléculaires partagés, microbiens ou associés à des dommages ; ils ne reposent pas sur un réarrangement clonotypique de type TCR/BCR.",
      "options": [
        "Uniquement des peptides présentés par le CMH I.",
        "Uniquement la région Fc des immunoglobulines.",
        "Des séquences produites par le réarrangement somatique de chaque PRR."
      ],
      "why": [
        "La reconnaissance peptide-CMH I caractérise les TCR de lymphocytes T CD8 conventionnels ; les PRR couvrent d’autres motifs.",
        "Les récepteurs Fc lient les anticorps ; ils ne définissent pas la famille des PRR.",
        "Les PRR sont codés dans la lignée germinale ; leur diversité n’est pas produite par le réarrangement V(D)J."
      ]
    },
    {
      "reason": "Les cellules dendritiques capturent des antigènes, migrent vers les organes lymphoïdes et peuvent activer des lymphocytes T naïfs avec co-stimulation.",
      "options": [
        "L’érythrocyte mature.",
        "La plaquette.",
        "Le plasmocyte."
      ],
      "why": [
        "L’érythrocyte mature humain ne réalise pas la présentation antigénique professionnelle aux lymphocytes T naïfs.",
        "La plaquette participe principalement à l’hémostase et à des interactions inflammatoires ; elle n’est pas la cellule professionnelle attendue pour amorcer les T naïfs.",
        "Le plasmocyte est spécialisé dans la sécrétion d’anticorps, en aval de l’activation des lymphocytes B."
      ]
    },
    {
      "reason": "Un gradient de chimiokines oriente la migration de leucocytes exprimant les récepteurs correspondants.",
      "options": [
        "Les perforines comme principal signal chimiotactique soluble.",
        "Les immunoglobulines comme unique gradient d’attraction.",
        "Le collagène comme cytokine circulante."
      ],
      "why": [
        "La perforine intervient dans la cytotoxicité ; elle n’est pas une chimiokine dirigeant la migration.",
        "Les anticorps peuvent opsoniser et activer des voies effectrices, mais ne constituent pas la famille des chimiokines.",
        "Le collagène est une protéine matricielle, pas une cytokine de chimiotactisme."
      ]
    },
    {
      "reason": "Des fragments de C3 déposés sur une cible sont reconnus par des récepteurs du complément et facilitent sa phagocytose.",
      "options": [
        "Oui, uniquement parce que C3b forme directement le pore terminal.",
        "Non, le complément est exclusivement un système de lyse.",
        "Non, seuls les anticorps peuvent opsoniser."
      ],
      "why": [
        "Le complexe C5b-9 forme le complexe d’attaque membranaire ; C3b intervient notamment dans l’opsonisation.",
        "Le complément possède plusieurs fonctions : opsonisation, inflammation et parfois lyse, selon les fragments et la cible.",
        "Des protéines du complément sont aussi des opsonines ; cette fonction ne se limite pas aux immunoglobulines."
      ]
    },
    {
      "reason": "Une lésion stérile, une réaction auto-immune ou un dépôt cristallin peuvent déclencher une inflammation sans agent infectieux.",
      "options": [
        "Oui, puisque des leucocytes ne sont recrutés que par des microbes.",
        "Oui, si les quatre signes cardinaux sont présents.",
        "Non, car une infection ne déclenche jamais d’inflammation."
      ],
      "why": [
        "Des signaux de dommage tissulaire peuvent recruter des leucocytes en l’absence de microbe.",
        "Rougeur, chaleur, douleur et tuméfaction décrivent une réaction inflammatoire, sans identifier seuls sa cause.",
        "Les infections sont des causes importantes d’inflammation, mais elles ne sont pas les seules."
      ]
    }
  ],
  "immuno-adaptive": [
    {
      "reason": "Le TCR αβ conventionnel reconnaît une surface combinant peptide et molécule de CMH ; le BCR peut reconnaître un antigène natif.",
      "options": [
        "Un antigène protéique libre de toute molécule présentatrice, comme un anticorps.",
        "La seule région Fc d’un anticorps.",
        "Uniquement une molécule de CMH dépourvue de peptide."
      ],
      "why": [
        "Cette reconnaissance directe d’antigène natif caractérise le BCR ; le TCR αβ conventionnel est restreint au peptide-CMH.",
        "Les régions Fc sont reconnues par des récepteurs Fc, pas par la reconnaissance antigénique conventionnelle du TCR.",
        "La reconnaissance physiologique porte sur le complexe peptide-CMH, pas sur le CMH vide."
      ]
    },
    {
      "reason": "Le corécepteur CD8 se lie au CMH I et participe à la reconnaissance par les T CD8 conventionnels.",
      "options": [
        "CMH I et lymphocyte T CD4 conventionnel.",
        "CMH I et BCR soluble.",
        "CMH I et récepteur de chimiokine CCR7."
      ],
      "why": [
        "Le corécepteur CD4 est classiquement associé à la reconnaissance du CMH II.",
        "Le BCR est membranaire ; ni lui ni l’anticorps sécrété ne définissent l’association de corécepteur demandée.",
        "CCR7 dirige notamment la migration lymphocytaire ; il n’est pas le corécepteur du CMH I."
      ]
    },
    {
      "reason": "La différenciation de lymphocytes B activés donne des plasmablastes puis des plasmocytes spécialisés dans la sécrétion d’immunoglobulines.",
      "options": [
        "Les lymphocytes T CD8 effecteurs.",
        "Les cellules NK.",
        "Les neutrophiles."
      ],
      "why": [
        "Les T CD8 assurent notamment une cytotoxicité antigène-spécifique ; ils ne sécrètent pas d’anticorps.",
        "Les cellules NK exercent des fonctions cytotoxiques et cytokiniques, sans produire d’immunoglobulines.",
        "Les neutrophiles sont des phagocytes de l’immunité innée, pas des cellules productrices d’anticorps."
      ]
    },
    {
      "reason": "L’antigène favorise l’activation de clones préexistants pertinents ; leur prolifération augmente le nombre de cellules de cette spécificité.",
      "options": [
        "L’expansion identique de tous les clones, indépendamment de leur récepteur.",
        "La conversion de tous les neutrophiles en lymphocytes spécifiques.",
        "La fabrication par l’antigène du premier TCR de chaque cellule mature."
      ],
      "why": [
        "La sélection antigénique enrichit certains clones ; elle n’implique pas une expansion identique de tous.",
        "Les lignées cellulaires ne se convertissent pas ainsi ; des lymphocytes préexistants prolifèrent.",
        "Le réarrangement des récepteurs précède cette sélection ; l’antigène ne dicte pas la séquence initiale du TCR mature."
      ]
    },
    {
      "reason": "La mémoire facilite une réponse secondaire, mais la durée de protection et la reconnaissance de variants dépendent de l’antigène, de l’hôte et du type de réponse.",
      "options": [
        "Oui, dès qu’un clone mémoire existe, toutes les variantes sont reconnues.",
        "Oui, parce que la mémoire dispense de toute reconnaissance antigénique.",
        "Non, parce que les cellules mémoire disparaissent immédiatement après la réponse primaire."
      ],
      "why": [
        "Un variant peut modifier des épitopes ; l’existence d’un clone mémoire ne garantit pas une reconnaissance universelle.",
        "Les cellules mémoire conservent une spécificité et doivent être activées par des signaux appropriés.",
        "Certaines cellules mémoire persistent longtemps ; l’absence de garantie absolue n’implique pas leur disparition immédiate."
      ]
    }
  ],
  "immuno-clinical": [
    {
      "reason": "Une immunisation active mobilise la réponse propre du sujet et peut établir des populations mémoire ; l’apport d’anticorps seuls ne les crée pas de la même façon.",
      "options": [
        "L’apport d’anticorps préformés comme seul mécanisme.",
        "La transfusion d’érythrocytes comme mécanisme vaccinal.",
        "L’administration d’un antibiotique comme immunisation active."
      ],
      "why": [
        "Il s’agit d’immunisation passive ; la protection ne repose pas sur l’induction de nouveaux clones mémoire par cet apport.",
        "Les érythrocytes ne constituent pas une stratégie d’induction de mémoire vaccinale.",
        "Un antibiotique agit sur une cible microbienne ; il n’est pas en lui-même une vaccination."
      ]
    },
    {
      "reason": "L’immunisation passive transfère des anticorps disponibles immédiatement, dont la concentration décroît ensuite selon leur cinétique.",
      "options": [
        "Non, elle apporte uniquement des antigènes pour sélectionner des clones.",
        "Non, elle consiste exclusivement à détruire les lymphocytes B.",
        "Oui, et cet apport induit nécessairement une mémoire durable sans antigène."
      ],
      "why": [
        "L’apport antigénique destiné à induire une réponse relève de l’immunisation active, pas du transfert d’anticorps.",
        "La déplétion des B est une intervention immunomodulatrice ; elle ne définit pas l’immunisation passive.",
        "Le transfert d’anticorps peut protéger rapidement sans induire par lui-même une mémoire spécifique durable."
      ]
    },
    {
      "reason": "La présence d’anticorps peut refléter une réponse ancienne ou vaccinale ; la cible, la classe, la cinétique et le contexte guident l’interprétation.",
      "options": [
        "Oui, tout anticorps détecté prouve la réplication actuelle du pathogène.",
        "Oui, même si l’anticorps ciblé est attendu après vaccination.",
        "Non, car une infection active ne produit jamais d’anticorps."
      ],
      "why": [
        "Les anticorps peuvent persister lorsque le pathogène n’est plus présent.",
        "Une vaccination peut rendre positive une sérologie dirigée contre un antigène vaccinal sans infection active.",
        "Des anticorps peuvent apparaître pendant une infection ; leur présence seule ne suffit pas à en établir l’activité."
      ]
    },
    {
      "reason": "Pendant la fenêtre sérologique, la réponse peut être absente ou sous le seuil de détection ; une négativité précoce n’exclut pas seule l’infection.",
      "options": [
        "L’exposition est exclue quelle que soit la date du prélèvement.",
        "Le sujet est obligatoirement immunodéprimé.",
        "La sensibilité du test vaut nécessairement 100 % à ce stade."
      ],
      "why": [
        "La date du prélèvement est déterminante lorsque le marqueur recherché apparaît avec un délai.",
        "Une réponse non encore détectable peut être physiologique au début ; elle ne démontre pas une immunodépression.",
        "La sensibilité dépend notamment du stade et de la cible recherchée ; elle peut être faible très tôt."
      ]
    },
    {
      "reason": "La VPP dépend du nombre relatif de vrais et de faux positifs, donc des performances du test et de la fréquence préalable de la maladie.",
      "options": [
        "De la sensibilité uniquement.",
        "De la spécificité uniquement, indépendamment de la population.",
        "Du seul nombre total de prélèvements, à performances et prévalence fixées."
      ],
      "why": [
        "La spécificité influe sur les faux positifs et la probabilité prétest influe sur leur poids relatif.",
        "Même à spécificité constante, la prévalence et la sensibilité modifient la proportion de vrais positifs.",
        "L’effectif influe sur la précision de l’estimation ; la VPP théorique est déterminée par les probabilités, non par l’effectif seul."
      ]
    }
  ]
}
export const immunologyQuestions: Question[] = immunologyCourses.flatMap(c => prompts[c.id].map((prompt, qi) => {
 const item = reviewedChoices[c.id][qi]
 return {id: `${c.id}-q${qi + 1}`, course: c.id, topic: c.category, prompt,
 options: [answers[c.id][qi], ...item.options], correct: [0], why: [item.reason, ...item.why],
 difficulty: qi < 2 ? 'essentiel' as const : 'application' as const, format: 'single' as const}
}))
