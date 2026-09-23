import type { Course } from '../../curriculum'
import type { Question } from '../../questions'
import { canonicalCourses } from '../../taxonomy/canonicalCourses'

const meta = new Map(canonicalCourses.filter(item => item.subject === 'Anatomie').map(item => [item.id, item]))
const refs: Record<string, string> = {
  'anat-rotator-cuff': 'https://openstax.org/books/anatomy-and-physiology-2e/pages/11-5-muscles-of-the-pectoral-girdle-and-upper-limbs',
  'anat-arm-compartments': 'https://openstax.org/books/anatomy-and-physiology-2e/pages/11-5-muscles-of-the-pectoral-girdle-and-upper-limbs',
  'anat-forearm-compartments': 'https://openstax.org/books/anatomy-and-physiology-2e/pages/11-5-muscles-of-the-pectoral-girdle-and-upper-limbs',
  'anat-wrist-carpal-tunnel': 'https://openstax.org/books/anatomy-and-physiology-2e/pages/8-2-bones-of-the-upper-limb',
  'anat-brachial-plexus': 'https://openstax.org/books/anatomy-and-physiology-2e/pages/13-4-the-peripheral-nervous-system'
}
type Draft = { objectives: string[]; sections: Course['sections']; trap: string; recall: string; answer: string; glossary: NonNullable<Course['glossary']>; caseStudy: NonNullable<Course['caseStudy']> }
const s = (title: string, text: string, bullets?: string[]) => ({ title, text, ...(bullets ? { bullets } : {}) })
const make = (id: string, d: Draft): Course => {
  const c = meta.get(id)
  if (!c) throw new Error(`Identifiant anatomique canonique absent : ${id}`)
  return { id, title: c.title, category: c.subject, tag: c.module, minutes: 15, structure: null,
    objectives: d.objectives, sections: d.sections, trap: d.trap, recall: d.recall, answer: d.answer,
    source: refs[id], sources: [{ label: 'OpenStax · Anatomy & Physiology 2e', url: refs[id] }],
    prerequisites: ['Repères anatomiques et position anatomique', 'Ostéologie fonctionnelle du membre supérieur'],
    glossary: d.glossary, caseStudy: d.caseStudy,
    review: { status: 'unreviewed', updatedAt: '2026-09-23', sourcesUpdatedAt: '2026-09-23' } }
}
export const upperLimbCourses: Course[] = [
  make('anat-rotator-cuff', {
    objectives: ['Nommer les quatre muscles de la coiffe et leurs insertions communes', 'Relier chaque muscle à son action dominante', 'Expliquer la stabilité glénohumérale et les rapports sous-acromiaux'],
    sections: [
      s('Cadre scapulaire et glénohuméral', 'La coiffe des rotateurs unit la scapula à l’humérus autour de l’articulation glénohumérale. Elle comprend supra-épineux, infra-épineux, petit rond et subscapulaire. Leurs tendons s’intègrent à la capsule et se fixent autour du tubercule majeur, sauf le subscapulaire qui rejoint le tubercule mineur.'),
      s('Faces postérieure et supérieure', 'Le supra-épineux naît de la fosse supra-épineuse, passe sous l’arche coraco-acromiale et s’insère sur la facette supérieure du tubercule majeur ; il contribue au démarrage de l’abduction et comprime la tête humérale dans la glène. L’infra-épineux et le petit rond, issus des fosses correspondantes, s’insèrent sur les facettes postérieure et inférieure du tubercule majeur et participent à la rotation latérale.'),
      s('Face antérieure', 'Le subscapulaire recouvre la face antérieure de la scapula, traverse en avant l’articulation et s’insère sur le tubercule mineur et la capsule. Il est un puissant rotateur médial et participe à l’adduction. Son tendon passe en avant de l’articulation, contrairement aux tendons postérieurs de l’infra-épineux et du petit rond.'),
      s('Stabilité dynamique et rapports', 'Les tendons exercent une coaptation de la tête humérale dans la cavité glénoïdale pendant les mouvements. Le supra-épineux passe sous l’acromion et le ligament coraco-acromial ; la bourse sous-acromio-deltoïdienne facilite le glissement. L’arche, la scapula et le deltoïde modulent les contraintes ; la stabilité dépend aussi du labrum, de la capsule et des ligaments.'),
      s('Innervation et repères cliniques', 'Le supra-épineux et l’infra-épineux sont innervés par le nerf supra-scapulaire ; le petit rond par le nerf axillaire ; le subscapulaire par les nerfs subscapulaires supérieur et inférieur. La douleur ou faiblesse d’abduction contre résistance peut orienter vers une atteinte, mais l’examen clinique doit distinguer tendon, nerf, articulation et douleur référée.'),
    ], trap: 'Le deltoïde n’appartient pas à la coiffe ; il mobilise le bras tandis que les tendons de la coiffe contribuent à centrer la tête humérale.', recall: 'Quel tendon de la coiffe passe en avant et sur quel tubercule s’insère-t-il ?', answer: 'Le tendon du subscapulaire passe en avant de l’articulation glénohumérale et s’insère sur le tubercule mineur.', glossary: [['Coiffe des rotateurs', 'Ensemble des tendons supra-épineux, infra-épineux, petit rond et subscapulaire.'], ['Coaptation', 'Maintien de surfaces articulaires en contact par des forces de compression et de contrôle.'], ['Bourse sous-acromiale', 'Cavité synoviale facilitant le glissement des tendons sous l’arche acromiale.']], caseStudy: { prompt: 'Une lésion isolée du nerf supra-scapulaire touche surtout deux muscles de la coiffe. Lesquels ?', answer: 'Supra-épineux et infra-épineux, innervés par des branches du nerf supra-scapulaire.' }
  }),
  make('anat-arm-compartments', {
    objectives: ['Décrire les limites et le contenu des loges brachiales', 'Associer muscles, actions et nerfs', 'Suivre le paquet vasculonerveux du bras'],
    sections: [
      s('Organisation fasciale', 'Le fascia brachial entoure le bras et envoie des septums intermusculaires médial et latéral jusqu’à l’humérus. Ils séparent une loge antérieure fléchisseuse d’une loge postérieure extenseuse. L’humérus complète leurs limites profondes ; le fascia se poursuit avec ceux de l’épaule et de l’avant-bras.'),
      s('Loge antérieure', 'Le biceps brachial possède deux chefs issus de la scapula et se termine par une tubérosité radiale et une aponévrose bicipitale ; il fléchit le coude et supine l’avant-bras. Le brachial s’insère sur l’ulna et demeure un fléchisseur puissant. Le coracobrachial agit sur l’épaule. Ces muscles sont principalement innervés par le nerf musculocutané.'),
      s('Loge postérieure', 'Le triceps brachial comporte des chefs long, latéral et médial ; il se termine sur l’olécrâne et étend le coude. Le chef long naît de la scapula et participe aussi à l’extension et l’adduction de l’épaule. Le nerf radial traverse la loge postérieure et innerve le triceps ainsi que des muscles de l’avant-bras.'),
      s('Artère et nerfs principaux', 'L’artère brachiale prolonge l’artère axillaire à partir du bord inférieur du grand rond, chemine dans le bras puis se divise près de la fosse cubitale en artères radiale et ulnaire. Le nerf médian accompagne souvent l’artère, changeant de rapport au cours du trajet ; le nerf ulnaire rejoint la face postérieure de l’épicondyle médial.'),
      s('Fosse cubitale et application', 'La fosse cubitale est limitée latéralement par le brachioradial et médialement par le rond pronateur ; le tendon bicipital, l’artère brachiale et le nerf médian sont ses principaux éléments profonds, de latéral à médial selon leurs positions usuelles. Le nerf radial est plus latéral. Les variations anatomiques existent et les gestes invasifs requièrent repérage clinique adéquat.'),
    ], trap: 'Le biceps participe à la supination ; le brachial, qui s’insère sur l’ulna, reste un fléchisseur du coude quelle que soit la position de l’avant-bras.', recall: 'Quel nerf innerve principalement le triceps et quelle est son action au coude ?', answer: 'Le nerf radial innerve le triceps, principal extenseur du coude.', glossary: [['Fascia brachial', 'Enveloppe fibreuse du bras qui émet des septums intermusculaires.'], ['Aponévrose bicipitale', 'Expansion tendineuse du biceps vers le fascia antébrachial médial.'], ['Fosse cubitale', 'Dépression antérieure du coude contenant notamment tendon bicipital, artère brachiale et nerf médian.']], caseStudy: { prompt: 'Une fracture de la diaphyse humérale peut léser un nerf cheminant dans la loge postérieure. Quel nerf et quel déficit moteur distal sont à rechercher ?', answer: 'Le nerf radial ; rechercher notamment une faiblesse d’extension du poignet et des doigts selon le niveau lésionnel.' }
  }),
  make('anat-forearm-compartments', {
    objectives: ['Classer les muscles de l’avant-bras selon les loges', 'Associer les principaux tendons à leurs actions et nerfs', 'Décrire les rapports des artères radiale et ulnaire'],
    sections: [
      s('Fascia et organisation', 'Le fascia antébrachial et la membrane interosseuse organisent l’avant-bras en compartiments antérieur fléchisseur-pronateur et postérieur extenseur-supinateur. Un groupe latéral superficiel, souvent rattaché fonctionnellement aux extenseurs, comprend notamment brachioradial, long et court extenseurs radiaux du carpe. La membrane relie radius et ulna et transmet une partie des forces.'),
      s('Loge antérieure superficielle', 'Le rond pronateur, le fléchisseur radial du carpe, le long palmaire et le fléchisseur ulnaire du carpe forment le plan superficiel, avec variantes du long palmaire. Le fléchisseur superficiel des doigts occupe un plan intermédiaire et envoie des tendons aux doigts 2 à 5. Ces muscles fléchissent poignet et doigts et participent à la pronation.'),
      s('Plans profonds et nerfs', 'Le fléchisseur profond des doigts fléchit les interphalangiennes distales ; sa moitié latérale est généralement innervée par le nerf interosseux antérieur, branche du médian, et sa moitié médiale par le nerf ulnaire. Le long fléchisseur du pouce relève du nerf interosseux antérieur. Le carré pronateur termine la pronation distale et stabilise la radio-ulnaire.'),
      s('Loge postérieure', 'Le plan superficiel comprend extenseurs du carpe et des doigts, extenseur du petit doigt et ulnaire postérieur ; le plan profond contient supinateur, longs abducteur et extenseurs du pouce, et extenseur de l’index. Ils sont innervés par le nerf interosseux postérieur, branche motrice profonde du radial, avec des variations selon le muscle.'),
      s('Axes vasculaires et poignets', 'L’artère radiale longe le côté latéral de l’avant-bras et devient accessible près du poignet ; l’ulnaire chemine plus médialement et accompagne le nerf ulnaire dans une partie distale. Les deux contribuent aux arcades palmaires. Tendons et artères traversent des rétinaculums ; les rapports changent selon le niveau et la pronosupination.'),
    ], trap: 'Le fléchisseur profond des doigts a une innervation partagée entre nerf médian via l’interosseux antérieur et nerf ulnaire.', recall: 'Quel muscle fléchit principalement les articulations interphalangiennes distales des doigts 2 à 5 ?', answer: 'Le fléchisseur profond des doigts, dont les tendons s’attachent aux phalanges distales.', glossary: [['Membrane interosseuse', 'Lame fibreuse reliant radius et ulna et organisant les compartiments.'], ['Nerf interosseux antérieur', 'Branche motrice du nerf médian destinée à certains muscles profonds antérieurs.'], ['Nerf interosseux postérieur', 'Branche motrice profonde du radial destinée à la plupart des extenseurs.']], caseStudy: { prompt: 'Une atteinte du nerf interosseux antérieur gêne la pince pouce-index. Quels muscles peuvent expliquer ce signe ?', answer: 'Le long fléchisseur du pouce et la portion latérale du fléchisseur profond de l’index peuvent être faibles, limitant la flexion de leurs phalanges distales.' }
  }),
  make('anat-wrist-carpal-tunnel', {
    objectives: ['Décrire les limites du canal carpien', 'Énumérer son contenu et le distinguer du canal de Guyon', 'Relier compression et territoire sensitif du nerf médian'],
    sections: [
      s('Arc carpien et rétinaculum', 'Le canal carpien est un passage ostéofibreux à la face antérieure du poignet. Son plancher et ses parois sont formés par l’arche concave des os du carpe ; le rétinaculum des fléchisseurs ferme le toit. Le rétinaculum s’attache notamment aux reliefs scaphoïde-trapèze latéralement et pisiforme-hamulus de l’hamatum médialement.'),
      s('Contenu du canal', 'Le nerf médian traverse le canal avec neuf tendons fléchisseurs : quatre tendons du fléchisseur superficiel des doigts, quatre du fléchisseur profond et le tendon du long fléchisseur du pouce. Les tendons sont entourés de gaines synoviales. Le tendon du long palmaire passe superficiellement au rétinaculum lorsqu’il existe.'),
      s('Canal ulnaire de Guyon', 'Le canal de Guyon est un autre passage palmaire médial au poignet, entre pisiforme et hamulus de l’hamatum, sous un toit fibreux distinct. Il transmet le nerf ulnaire et l’artère ulnaire, tandis que ces structures ne traversent pas le canal carpien. L’organisation des branches superficielles et profondes explique des tableaux moteurs ou sensitifs variables.'),
      s('Territoires nerveux', 'Le nerf médian innerve la peau palmaire des trois doigts et demi latéraux et les extrémités dorsales correspondantes ; sa branche cutanée palmaire naît en amont et passe superficiellement au rétinaculum. Une compression intracarpienne peut donc préserver la sensibilité de l’éminence thénar. Le territoire exact et les anastomoses varient.'),
      s('Compression et examen', 'Une pression accrue dans le canal peut comprimer le nerf médian, provoquant paresthésies, douleur et, si atteinte avancée, faiblesse des muscles thénariens. Les symptômes nocturnes ou provoqués par certaines positions sont fréquents mais non spécifiques. Diagnostic et conduite se fondent sur histoire, examen et tests adaptés ; ce chapitre décrit l’anatomie, pas un auto-diagnostic.'),
    ], trap: 'L’artère et le nerf ulnaires cheminent dans le canal de Guyon, pas dans le canal carpien.', recall: 'Pourquoi l’éminence thénar peut-elle garder une sensibilité cutanée malgré une compression du nerf médian dans le canal carpien ?', answer: 'La branche cutanée palmaire du médian quitte le nerf en amont et passe superficiellement au rétinaculum, hors du canal.', glossary: [['Rétinaculum des fléchisseurs', 'Bande fibreuse fermant le canal carpien et maintenant les tendons.'], ['Canal de Guyon', 'Passage palmaire ulnaire transmettant le nerf et l’artère ulnaires.'], ['Branche cutanée palmaire', 'Branche sensitive du médian naissant avant le canal carpien.']], caseStudy: { prompt: 'Une lésion au canal de Guyon associe faiblesse des muscles intrinsèques ulnaires et hypoesthésie du bord médial de la main. Quel paquet est concerné ?', answer: 'Le nerf ulnaire dans le canal de Guyon ; l’artère ulnaire y chemine également.' }
  }),
  make('anat-brachial-plexus', {
    objectives: ['Suivre l’organisation racines-troncs-faisceaux-branches', 'Associer faisceaux aux rapports de l’artère axillaire', 'Relier les nerfs terminaux à leurs territoires principaux'],
    sections: [
      s('Racines et troncs', 'Le plexus brachial est formé principalement par les rameaux antérieurs des nerfs spinaux C5 à T1, avec contributions variables. Les racines émergent entre les muscles scalènes antérieur et moyen, puis s’unissent en trois troncs : supérieur C5-C6, moyen C7 et inférieur C8-T1. Les rapports avec la clavicule divisent le plexus en portions supraclaviculaire et infraclaviculaire.'),
      s('Divisions et faisceaux', 'Chaque tronc se divise en divisions antérieure et postérieure derrière la clavicule. Les divisions antérieures alimentent surtout les compartiments fléchisseurs, les postérieures les compartiments extenseurs. Elles se recombinent en faisceaux latéral, médial et postérieur, nommés selon leur position autour de la deuxième portion de l’artère axillaire.'),
      s('Branches terminales', 'Le faisceau latéral contribue aux nerfs musculocutané et médian ; le faisceau médial aux nerfs ulnaire et médian ; le faisceau postérieur aux nerfs axillaire et radial. Le nerf médian reçoit donc des racines des deux faisceaux antérieurs. Plusieurs branches collatérales naissent plus tôt, notamment nerfs thoracique long, supra-scapulaire et pectoraux.'),
      s('Territoires moteurs et sensitifs', 'Le musculocutané innerve surtout les fléchisseurs du bras et donne le nerf cutané latéral de l’avant-bras. Le radial innerve les extenseurs ; le médian les principaux fléchisseurs et muscles thénariens ; l’ulnaire une grande partie des intrinsèques de la main. L’axillaire dessert deltoïde et petit rond et la peau de la région deltoïdienne.'),
      s('Localisation lésionnelle', 'Une atteinte haute du tronc supérieur peut toucher notamment abduction et rotation latérale de l’épaule et flexion du coude ; une atteinte du tronc inférieur peut affecter davantage main et doigts. Une lésion d’un nerf terminal produit un profil différent. Les déficits varient avec le niveau, l’étendue, les anastomoses et la récupération ; l’examen complet est indispensable.'),
    ], trap: 'Les faisceaux sont nommés par rapport à la deuxième portion de l’artère axillaire ; les divisions, elles, sont situées en arrière de la clavicule.', recall: 'Quel est l’ordre classique des éléments du plexus brachial depuis la moelle jusqu’aux nerfs terminaux ?', answer: 'Racines (rameaux antérieurs) → troncs → divisions antérieures/postérieures → faisceaux → branches terminales.', glossary: [['Tronc supérieur', 'Union principalement des rameaux antérieurs C5 et C6.'], ['Faisceau postérieur', 'Faisceau constitué des divisions postérieures des trois troncs.'], ['Rameau antérieur', 'Branche ventrale d’un nerf spinal participant aux plexus des membres.']], caseStudy: { prompt: 'Une fracture du col chirurgical de l’humérus entraîne faiblesse d’abduction après les premiers degrés et hypoesthésie cutanée deltoïdienne. Quel nerf suspecter ?', answer: 'Le nerf axillaire, qui contourne le col chirurgical et innerve le deltoïde ainsi qu’une zone cutanée latérale de l’épaule.' }
  })
]
const qData: Record<string, [string, string, string, string, string]> = {
  'anat-rotator-cuff': ['Quels quatre muscles constituent la coiffe des rotateurs ?', 'Sur quel relief huméral s’insère le subscapulaire ?', 'Quel muscle de la coiffe initie notamment l’abduction et passe sous l’arche acromiale ?', 'Quels muscles sont principalement innervés par le nerf supra-scapulaire ?', 'Le deltoïde appartient-il à la coiffe ?'],
  'anat-arm-compartments': ['Quel septum sépare principalement les loges brachiales ?', 'Quel nerf innerve principalement la loge antérieure du bras ?', 'Quel est le principal extenseur du coude ?', 'Où devient l’artère axillaire l’artère brachiale ?', 'Quel nerf passe en arrière de l’épicondyle médial ?'],
  'anat-forearm-compartments': ['Quelle loge réalise principalement flexion et pronation ?', 'Quel muscle fléchit les interphalangiennes distales des doigts 2 à 5 ?', 'Quelle branche du médian innerve une partie de la loge profonde antérieure ?', 'Quel nerf innerve la plupart des extenseurs ?', 'Quelle artère est palpable sur le versant latéral du poignet ?'],
  'anat-wrist-carpal-tunnel': ['Quel nerf traverse le canal carpien ?', 'Combien de tendons fléchisseurs des doigts et du pouce traversent ce canal ?', 'Quel paquet traverse le canal de Guyon ?', 'Pourquoi la sensibilité cutanée thénar peut-elle être préservée lors d’une compression carpienne ?', 'Le tendon du long palmaire traverse-t-il le canal carpien ?'],
  'anat-brachial-plexus': ['Quelles racines forment le plexus brachial dans son schéma classique ?', 'Quel est l’ordre des niveaux d’organisation du plexus ?', 'Par rapport à quelle structure les faisceaux sont-ils nommés ?', 'De quels faisceaux provient le nerf médian ?', 'Quel nerf est vulnérable autour du col chirurgical de l’humérus ?']
}
const answerData: Record<string, string[]> = {
  'anat-rotator-cuff': ['Supra-épineux, infra-épineux, petit rond et subscapulaire.', 'Le tubercule mineur.', 'Le supra-épineux.', 'Supra-épineux et infra-épineux.', 'Non, il est superficiel à la coiffe et mobilise le bras.'],
  'anat-arm-compartments': ['Les septums intermusculaires médial et latéral du fascia brachial.', 'Le nerf musculocutané.', 'Le triceps brachial.', 'Au bord inférieur du grand rond.', 'Le nerf ulnaire.'],
  'anat-forearm-compartments': ['La loge antérieure, fléchisseuse-pronatrice.', 'Le fléchisseur profond des doigts.', 'Le nerf interosseux antérieur.', 'Le nerf interosseux postérieur, branche motrice profonde du radial.', 'L’artère radiale.'],
  'anat-wrist-carpal-tunnel': ['Le nerf médian.', 'Neuf tendons : huit fléchisseurs des doigts et un long fléchisseur du pouce.', 'Le nerf ulnaire et l’artère ulnaire.', 'Sa branche cutanée palmaire naît en amont et passe superficiellement au rétinaculum.', 'Non, il passe superficiellement au rétinaculum lorsqu’il est présent.'],
  'anat-brachial-plexus': ['C5 à T1, principalement via les rameaux antérieurs.', 'Racines, troncs, divisions, faisceaux et branches terminales.', 'La deuxième portion de l’artère axillaire.', 'Des faisceaux latéral et médial.', 'Le nerf axillaire.']
}
const explanations: Record<string, string[]> = {
  'anat-rotator-cuff': ['Ils entourent la tête humérale et s’intègrent à la capsule.', 'Son insertion antérieure correspond au tubercule mineur.', 'Son tendon passe sous l’arche coraco-acromiale et contribue au début de l’abduction.', 'Les deux muscles occupent les fosses supra- et infra-épineuses et reçoivent ce nerf.', 'Le deltoïde agit sur l’épaule mais ne fait pas partie des quatre tendons de la coiffe.'],
  'anat-arm-compartments': ['Les cloisons fasciales ancrées à l’humérus divisent les compartiments antérieur et postérieur.', 'Le musculocutané innerve le biceps, le brachial et le coracobrachial.', 'Le triceps s’insère sur l’olécrâne et étend le coude.', 'La continuité axillaire-brachiale est repérée au bord inférieur du grand rond.', 'Le nerf ulnaire passe derrière cet épicondyle dans la région du coude.'],
  'anat-forearm-compartments': ['Les fléchisseurs-pronateurs sont dans le compartiment antérieur.', 'Ses tendons se terminent sur les phalanges distales.', 'Il innerve le long fléchisseur du pouce et une partie du fléchisseur profond.', 'Il innerve la majorité des extenseurs distaux.', 'Elle chemine sur le côté radial et est accessible près du poignet.'],
  'anat-wrist-carpal-tunnel': ['Le médian traverse le canal avec les tendons fléchisseurs.', 'Quatre tendons superficiels, quatre profonds et un long fléchisseur du pouce.', 'Ces structures suivent le canal ulnaire médial, distinct du tunnel carpien.', 'Cette branche sensitive quitte le nerf avant le canal et reste hors de celui-ci.', 'Le long palmaire passe superficiellement au rétinaculum.'],
  'anat-brachial-plexus': ['Les racines proviennent principalement de C5, C6, C7, C8 et T1.', 'Les axones se redistribuent successivement dans ces cinq niveaux.', 'Leurs rapports sont décrits autour de l’artère axillaire.', 'Le médian reçoit des contributions antérieures latérale et médiale.', 'Le nerf axillaire contourne le col chirurgical et peut être étiré ou lésé.']
}
const wrongData: Record<string, string[][]> = {
  'anat-rotator-cuff': [
    ['Deltoïde, grand pectoral, grand dorsal et biceps.', 'Supra-épineux, deltoïde, petit rond et grand rond.', 'Subscapulaire, grand rond, deltoïde et infra-épineux.'],
    ['Tubercule majeur.', 'Épicondyle médial.', 'Bord latéral de la glène.'],
    ['Infra-épineux.', 'Subscapulaire.', 'Petit rond.'],
    ['Subscapulaire et petit rond.', 'Supra-épineux et subscapulaire.', 'Petit rond et deltoïde.'],
    ['Oui, car son tendon s’insère au tubercule majeur.', 'Oui, il forme le tendon postérieur de la capsule.', 'Oui, car il se confond avec le supra-épineux.']
  ],
  'anat-arm-compartments': [
    ['La membrane interosseuse.', 'Le ligament annulaire du radius.', 'Le rétinaculum des fléchisseurs.'],
    ['Le nerf radial.', 'Le nerf ulnaire.', 'Le nerf axillaire.'],
    ['Le biceps brachial.', 'Le brachial.', 'Le coracobrachial.'],
    ['Au bord inférieur du petit pectoral.', 'Au bord supérieur du grand rond.', 'Au col anatomique de l’humérus.'],
    ['Le nerf médian.', 'Le nerf radial.', 'Le nerf musculocutané.']
  ],
  'anat-forearm-compartments': [
    ['La loge postérieure, extenseuse-supinatrice.', 'La loge latérale, exclusivement supinatrice.', 'Le compartiment palmaire de la main.'],
    ['Le fléchisseur superficiel des doigts.', 'Le long fléchisseur du pouce.', 'Le fléchisseur radial du carpe.'],
    ['Le nerf interosseux postérieur.', 'Le nerf ulnaire uniquement.', 'Le nerf cutané latéral de l’avant-bras.'],
    ['Le nerf médian.', 'Le nerf ulnaire.', 'Le nerf musculocutané.'],
    ['L’artère ulnaire.', 'L’artère brachiale.', 'L’artère interosseuse postérieure.']
  ],
  'anat-wrist-carpal-tunnel': [
    ['Le nerf ulnaire.', 'Le nerf radial superficiel.', 'Le nerf interosseux antérieur.'],
    ['Sept tendons.', 'Dix tendons.', 'Quatre tendons.'],
    ['Le nerf médian et l’artère radiale.', 'Le nerf radial et l’artère brachiale.', 'Les tendons extenseurs et le nerf médian.'],
    ['La branche cutanée dorsale de l’ulnaire traverse le canal.', 'La branche motrice thénarienne naît au coude.', 'Les rameaux digitaux quittent le canal avant le poignet.'],
    ['Oui, il est entouré des tendons du fléchisseur profond.', 'Oui, il passe sous le rétinaculum avec le nerf médian.', 'Oui, il rejoint le canal de Guyon.']
  ],
  'anat-brachial-plexus': [
    ['C1 à C4.', 'C3 à C7.', 'T2 à T6.'],
    ['Troncs, racines, faisceaux, divisions, branches.', 'Racines, divisions, troncs, branches, faisceaux.', 'Racines, faisceaux, troncs, divisions, branches.'],
    ['La veine axillaire.', 'La clavicule.', 'Le muscle grand pectoral.'],
    ['Des faisceaux médial et postérieur.', 'Des faisceaux latéral et postérieur.', 'Uniquement du faisceau postérieur.'],
    ['Le nerf radial.', 'Le nerf musculocutané.', 'Le nerf médian.']
  ]
}
export const upperLimbQuestions: Question[] = upperLimbCourses.flatMap(course => qData[course.id].map((prompt, i) => {
  const answer = answerData[course.id][i]
  const options = [answer, ...wrongData[course.id][i]]
  return { id: `${course.id}-q${i + 1}`, course: course.id, topic: 'Anatomie', prompt, options, correct: [0], why: options.map((_, j) => j === 0 ? explanations[course.id][i] : 'Cette structure appartient à une autre région ou ne correspond pas au rapport anatomique décrit.'), difficulty: i < 2 ? 'essentiel' as const : 'application' as const, format: 'single' as const }
}))
