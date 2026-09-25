import type {Question} from '../../questions'
import {supplementalQuestionIds} from '../supplementalQuestionIds'

type Draft = Pick<Question, 'prompt' | 'options' | 'correct' | 'why' | 'format'>
const bank: Record<string, [string, string[], string[]][]> = {
  "FMA7088": [
    [
      "Quelle cavité contribue le plus à la face sternocostale du cœur ?",
      [
        "Le ventricule droit.",
        "L’atrium gauche.",
        "Le ventricule gauche."
      ],
      [
        "Le ventricule droit est principalement antérieur, derrière le sternum.",
        "L’atrium gauche constitue surtout la base postérieure du cœur.",
        "Il forme notamment l’apex et une grande partie de la face gauche, pas l’essentiel de la face sternocostale."
      ]
    ],
    [
      "Quelle valve est franchie entre atrium gauche et ventricule gauche ?",
      [
        "La mitrale.",
        "La tricuspide.",
        "L’aortique."
      ],
      [
        "La mitrale est la valve atrioventriculaire gauche.",
        "La tricuspide sépare atrium droit et ventricule droit.",
        "La valve aortique se situe à la sortie du ventricule gauche, vers l’aorte."
      ]
    ],
    [
      "Quel vaisseau rejoint normalement l’atrium droit ?",
      [
        "La veine cave supérieure.",
        "Une veine pulmonaire.",
        "L’aorte ascendante."
      ],
      [
        "Elle y apporte le retour veineux systémique de la partie supérieure du corps.",
        "Les veines pulmonaires se terminent normalement dans l’atrium gauche.",
        "L’aorte reçoit l’éjection du ventricule gauche ; elle n’est pas une afférence atriale."
      ]
    ],
    [
      "Quel rôle ont les cordages tendineux pendant la systole ventriculaire ?",
      [
        "Limiter le prolapsus des valves atrioventriculaires vers les atriums.",
        "Ouvrir activement les valves atrioventriculaires.",
        "Ouvrir les valves aortique et pulmonaire."
      ],
      [
        "La tension transmise par les muscles papillaires stabilise les feuillets fermés.",
        "Leur ouverture dépend du gradient de pression, pas d’une traction des cordages.",
        "Les valves semi-lunaires n’ont pas d’appareil de cordages."
      ]
    ],
    [
      "Quelle condition ouvre la valve aortique ?",
      [
        "Une pression ventriculaire gauche supérieure à la pression aortique.",
        "Une pression atriale droite supérieure à la pression aortique.",
        "Une pression aortique supérieure à la pression ventriculaire gauche."
      ],
      [
        "Le gradient dirigé vers l’aorte permet l’ouverture passive et l’éjection.",
        "L’atrium droit n’est pas en amont immédiat de cette valve.",
        "Ce gradient tend au contraire à fermer la valve aortique."
      ]
    ],
    [
      "À l’état stable, comment se comparent les débits moyens des deux ventricules ?",
      [
        "Ils sont égaux, les deux circulations étant en série.",
        "Le débit gauche est nécessairement deux fois le débit droit.",
        "Le débit droit est nul pendant toute la systole gauche."
      ],
      [
        "Un déséquilibre durable accumulerait du sang dans un territoire ; les pressions peuvent néanmoins être différentes.",
        "La plus grande pression systémique n’implique pas un doublement du débit.",
        "Les éjections droite et gauche se produisent durant la systole ; les circuits fonctionnent en série."
      ]
    ],
    [
      "D’où naissent habituellement les artères coronaires ?",
      [
        "De l’aorte ascendante au niveau des sinus aortiques.",
        "Du tronc pulmonaire.",
        "Du sinus coronaire."
      ],
      [
        "Elles apportent une irrigation propre au myocarde à partir de la racine aortique.",
        "Le tronc pulmonaire dirige l’éjection droite vers les poumons, pas l’irrigation coronaire habituelle.",
        "Le sinus coronaire est un collecteur veineux qui se jette dans l’atrium droit."
      ]
    ],
    [
      "Pourquoi le myocarde ventriculaire gauche est-il plus épais que le droit ?",
      [
        "Il éjecte contre une pression systémique plus élevée.",
        "Il éjecte normalement un volume moyen deux fois plus élevé.",
        "Il est le seul ventricule irrigué par les coronaires."
      ],
      [
        "La différence d’épaisseur est liée notamment à la charge mécanique de pression.",
        "À l’état stable les deux débits moyens sont égaux ; c’est surtout la charge de pression qui diffère.",
        "Les deux ventricules reçoivent une irrigation coronaire."
      ]
    ],
    [
      "Quel ordre suit le sang après le ventricule droit ?",
      [
        "Valve pulmonaire, poumons, atrium gauche.",
        "Valve aortique, aorte, atrium gauche.",
        "Valve mitrale, poumons, atrium droit."
      ],
      [
        "Le sang emprunte le tronc et les artères pulmonaires, puis revient par les veines pulmonaires.",
        "La valve aortique est la sortie du ventricule gauche, non celle du droit.",
        "La mitrale sépare les cavités gauches et ne précède pas le trajet pulmonaire."
      ]
    ],
    [
      "À 70 battements/min et 70 mL éjectés par battement, quel est le débit cardiaque ?",
      [
        "4,9 L/min.",
        "49 L/min.",
        "1 L/min."
      ],
      [
        "70×70=4 900 mL/min, soit 4,9 L/min.",
        "La conversion de 4 900 mL en litres donne 4,9, non 49.",
        "Diviser volume par fréquence ne donne pas le débit ; il faut les multiplier."
      ]
    ]
  ],
  "FMA7309": [
    [
      "À quel lobe appartient la lingula ?",
      [
        "Au lobe supérieur gauche.",
        "Au lobe moyen gauche.",
        "Au lobe inférieur droit."
      ],
      [
        "La lingula est une partie du lobe supérieur gauche, pas un lobe moyen indépendant.",
        "Le poumon gauche n’a pas de lobe moyen dans l’organisation habituelle.",
        "La lingula est située à gauche et appartient au lobe supérieur."
      ]
    ],
    [
      "Quel élément distingue classiquement bronches et bronchioles ?",
      [
        "Le cartilage est présent dans les bronches mais absent des bronchioles.",
        "Les bronchioles sont les seules voies pourvues de cartilage.",
        "Les bronches n’ont pas d’épithélium."
      ],
      [
        "La paroi bronchiolaire reste musculaire et épithéliale sans plaques cartilagineuses.",
        "La distribution est inverse : le cartilage caractérise les bronches.",
        "Les bronches sont tapissées d’un épithélium, comme les autres voies conductrices."
      ]
    ],
    [
      "Quel segment termine la zone purement conductrice ?",
      [
        "La bronchiole terminale.",
        "La bronchiole respiratoire.",
        "Le sac alvéolaire."
      ],
      [
        "Les bronchioles respiratoires qui suivent portent déjà des alvéoles.",
        "Elle appartient à la zone respiratoire parce que des alvéoles s’ouvrent dans sa paroi.",
        "Le sac alvéolaire est une structure d’échange, non la fin de la zone conductrice."
      ]
    ],
    [
      "Quelles cellules sécrètent le surfactant pulmonaire ?",
      [
        "Les pneumocytes de type II.",
        "Les pneumocytes de type I.",
        "Les cellules endothéliales capillaires."
      ],
      [
        "Le surfactant réduit la tension superficielle à l’interface alvéolaire.",
        "Ils forment une grande partie de la fine surface d’échange, sans être les producteurs principaux du surfactant.",
        "Elles constituent la paroi vasculaire de la barrière, pas la source épithéliale du surfactant."
      ]
    ],
    [
      "Quelle couche pleurale recouvre directement le poumon ?",
      [
        "La plèvre viscérale.",
        "La plèvre pariétale costale.",
        "Le péricarde pariétal."
      ],
      [
        "Elle adhère à la surface pulmonaire et pénètre dans les scissures.",
        "Elle tapisse la paroi thoracique, de l’autre côté de la cavité pleurale.",
        "Le péricarde entoure le cœur, pas la surface des poumons."
      ]
    ],
    [
      "Une région alvéolaire est ventilée mais n’est plus perfusée. Quel effet prédomine ?",
      [
        "Un espace mort alvéolaire.",
        "Un shunt intrapulmonaire pur.",
        "Une augmentation certaine de son transfert d’oxygène vers le sang."
      ],
      [
        "La ventilation de cette région ne participe plus à un échange avec un débit sanguin.",
        "Un shunt correspond à du sang perfusant une région non ventilée, soit le déséquilibre inverse.",
        "Sans perfusion, il n’y a pas de débit sanguin pour recueillir l’oxygène dans cette région."
      ]
    ],
    [
      "Quelle structure occupe le hile pulmonaire ?",
      [
        "Des bronches et des vaisseaux constituant la racine pulmonaire.",
        "Le dôme diaphragmatique au centre de chaque poumon.",
        "Le lobe moyen dans les deux poumons."
      ],
      [
        "Le hile correspond à leur passage sur la face médiastinale.",
        "Le diaphragme est en rapport avec la base, pas contenu dans le hile.",
        "Un lobe n’est pas un contenu du hile et le lobe moyen est normalement droit."
      ]
    ],
    [
      "Quelles scissures délimitent habituellement les trois lobes droits ?",
      [
        "Une scissure oblique et une horizontale.",
        "Deux scissures horizontales.",
        "Une seule scissure oblique."
      ],
      [
        "Le lobe moyen droit se situe entre leurs limites.",
        "L’une des deux scissures droites est oblique, non horizontale.",
        "Une seule scissure oblique correspond au partage habituel du poumon gauche en deux lobes."
      ]
    ],
    [
      "Quel mécanisme assure directement le passage d’O₂ de l’alvéole au capillaire ?",
      [
        "La diffusion suivant un gradient de pression partielle.",
        "Un transport actif consommant de l’ATP par chaque pneumocyte.",
        "Le déplacement des érythrocytes dans la lumière alvéolaire."
      ],
      [
        "La barrière mince et la surface d’échange facilitent ce transfert passif.",
        "L’oxygène diffuse à travers la barrière ; son transfert n’exige pas une pompe ATP-dépendante.",
        "Les érythrocytes restent normalement dans les capillaires, séparés de l’air alvéolaire."
      ]
    ],
    [
      "Pourquoi un pneumothorax peut-il entraîner une rétraction pulmonaire ?",
      [
        "L’air pleural perturbe le couplage entre paroi et poumon.",
        "L’air occupe physiologiquement les deux feuillets pleuraux à chaque inspiration.",
        "La plèvre viscérale devient instantanément du tissu musculaire contractile."
      ],
      [
        "Le recul élastique pulmonaire n’est plus compensé de la même façon par la pression transpulmonaire.",
        "La cavité pleurale normale contient un mince film liquidien, pas une entrée cyclique d’air.",
        "La rétraction relève des propriétés mécaniques et des pressions, pas d’une transformation tissulaire."
      ]
    ]
  ],
  "FMA7148": [
    [
      "Quelle région gastrique forme le dôme situé au-dessus du cardia ?",
      [
        "Le fundus.",
        "L’antre pylorique.",
        "Le pylore."
      ],
      [
        "Le fundus est la partie supérieure en dôme de l’estomac.",
        "L’antre est situé vers la sortie gastrique, avant le canal pylorique.",
        "Le pylore marque la jonction de sortie vers le duodénum."
      ]
    ],
    [
      "Quelle population cellulaire sécrète HCl et facteur intrinsèque ?",
      [
        "Les cellules pariétales.",
        "Les cellules principales.",
        "Les cellules G."
      ],
      [
        "Leurs sécrétions participent respectivement au milieu acide et à l’absorption ultérieure de B12.",
        "Elles produisent notamment le pepsinogène, pas le facteur intrinsèque.",
        "Elles sécrètent la gastrine, hormone régulatrice de la fonction gastrique."
      ]
    ],
    [
      "Quelle substance est un précurseur enzymatique sécrété par les cellules principales ?",
      [
        "Le pepsinogène.",
        "La gastrine.",
        "Le facteur intrinsèque."
      ],
      [
        "Il est activé en pepsine dans le milieu gastrique acide.",
        "La gastrine est une hormone des cellules G, pas un précurseur de protéase.",
        "C’est une protéine de liaison impliquée dans l’absorption de B12, non un zymogène."
      ]
    ],
    [
      "Quel élément participe directement à la protection de la surface gastrique ?",
      [
        "Le mucus avec une sécrétion de bicarbonate.",
        "La suppression permanente de toute sécrétion acide.",
        "L’absence de renouvellement des cellules épithéliales."
      ],
      [
        "Cette barrière contribue à limiter l’exposition de l’épithélium au contenu acide.",
        "La protection normale coexiste avec la sécrétion acide physiologique.",
        "Le renouvellement épithélial participe à l’intégrité de la muqueuse, il n’est pas absent."
      ]
    ],
    [
      "Où le complexe vitamine B12–facteur intrinsèque est-il principalement absorbé ?",
      [
        "Dans l’iléon terminal.",
        "Dans le fundus gastrique.",
        "Dans le côlon sigmoïde."
      ],
      [
        "Le facteur intrinsèque provient de l’estomac, mais l’absorption spécialisée a lieu en aval.",
        "Le fundus contribue à la sécrétion du facteur intrinsèque, pas au site spécialisé d’absorption du complexe.",
        "Le site d’absorption spécialisé est l’iléon terminal, non le sigmoïde."
      ]
    ],
    [
      "Quel rôle joue la rétropulsion antrale ?",
      [
        "Brasser et fragmenter le contenu gastrique.",
        "Transférer directement les nutriments dans la veine porte.",
        "Propulser normalement tout le repas dans l’œsophage."
      ],
      [
        "Une partie du contenu est renvoyée vers l’amont de l’antre lors des contractions contre une sortie limitée.",
        "La rétropulsion est un mouvement de mélange, pas un transport transépithélial.",
        "Le mélange intragastrique ne correspond pas au reflux massif vers l’œsophage."
      ]
    ],
    [
      "Quelle structure fait suite au pylore ?",
      [
        "Le duodénum.",
        "Le jéjunum.",
        "Le cæcum."
      ],
      [
        "Le pylore règle le passage entre estomac et première partie de l’intestin grêle.",
        "Le jéjunum suit le duodénum ; il n’est pas au contact direct de la sortie pylorique.",
        "Le cæcum reçoit l’iléon à l’autre extrémité du grêle."
      ]
    ],
    [
      "Quel effet l’arrivée de lipides dans le duodénum peut-elle exercer sur la vidange gastrique ?",
      [
        "La ralentir par des signaux régulateurs.",
        "L’accélérer pour livrer plus rapidement les lipides à l’intestin.",
        "Ne produire aucun signal régulateur de la vidange."
      ],
      [
        "Cette rétroaction adapte l’arrivée de chyme aux capacités de traitement intestinal.",
        "La rétroaction duodénale adapte et ralentit souvent l’arrivée d’un contenu lipidique, plutôt que de l’accélérer.",
        "La présence de lipides participe à des signaux nerveux et hormonaux influençant la vidange."
      ]
    ],
    [
      "Quelle hormone est sécrétée notamment par les cellules G antrales ?",
      [
        "La gastrine.",
        "La sécrétine.",
        "L’insuline."
      ],
      [
        "Elle participe à la régulation de la sécrétion acide et d’autres fonctions gastriques.",
        "La sécrétine est principalement sécrétée par les cellules S duodénales en réponse à l’acidité.",
        "L’insuline est sécrétée par les cellules β pancréatiques."
      ]
    ],
    [
      "Quelle proposition distingue correctement digestion et absorption gastriques ?",
      [
        "L’estomac participe à la digestion sans être le site majeur d’absorption des nutriments.",
        "Toute molécule digérée dans l’estomac est nécessairement absorbée sur place.",
        "L’acide gastrique remplace à lui seul toutes les enzymes intestinales."
      ],
      [
        "Le brassage et la pepsine préparent le contenu ; l’essentiel de l’absorption nutritive se fait dans le grêle.",
        "Le lieu de transformation chimique et le lieu d’absorption peuvent différer.",
        "L’acidité facilite certaines étapes, mais ne réalise pas l’ensemble des hydrolyses digestives."
      ]
    ],
    [
      "Quel organe se situe en arrière de l’estomac, au-delà de la bourse omentale ?",
      [
        "Le pancréas.",
        "Le lobe gauche du foie.",
        "Le côlon transverse."
      ],
      [
        "Le corps pancréatique appartient aux rapports postérieurs de l’estomac.",
        "Le lobe gauche du foie est surtout un rapport antérieur de l’estomac.",
        "Le côlon transverse est surtout un rapport inférieur, en lien avec le mésocôlon transverse."
      ]
    ]
  ],
  "FMA7200": [
    [
      "Quel segment du grêle est en grande partie secondairement rétropéritonéal ?",
      [
        "Le duodénum.",
        "Le jéjunum.",
        "L’iléon."
      ],
      [
        "La majeure partie du duodénum est fixée à la paroi postérieure ; sa portion proximale conserve une mobilité relative.",
        "Les anses jéjunales sont suspendues par le mésentère et sont intrapéritonéales.",
        "L’iléon est également porté par le mésentère, hors son abouchement terminal."
      ]
    ],
    [
      "Quelle structure comprend à la fois muqueuse et sous-muqueuse ?",
      [
        "Un pli circulaire.",
        "Une villosité.",
        "Une microvillosité."
      ],
      [
        "Les plis circulaires soulèvent ces deux couches de la paroi.",
        "Une villosité est une projection de la muqueuse, sans axe sous-muqueux.",
        "Une microvillosité est un prolongement apical d’un entérocyte, à l’échelle cellulaire."
      ]
    ],
    [
      "Où sont situées les microvillosités absorbantes ?",
      [
        "Au pôle apical des entérocytes.",
        "Dans la lumière des capillaires villositaires.",
        "Dans la couche musculaire longitudinale externe."
      ],
      [
        "Elles forment la bordure en brosse et augmentent la surface de membrane exposée à la lumière.",
        "Les capillaires sont des voies sanguines dans l’axe villositaire ; ils ne portent pas la bordure en brosse.",
        "La musculeuse participe aux mouvements ; les microvillosités sont épithéliales."
      ]
    ],
    [
      "Quel type cellulaire intestinal sécrète du mucus ?",
      [
        "La cellule caliciforme.",
        "La cellule de Paneth comme fonction principale.",
        "L’entérocyte comme principale cellule mucosécrétrice."
      ],
      [
        "Les mucines sécrétées s’hydratent et participent à la protection de la surface.",
        "Les cellules de Paneth sécrètent surtout des produits de défense antimicrobienne au fond des cryptes.",
        "L’entérocyte est surtout spécialisé dans l’absorption et la digestion terminale ; la sécrétion de mucus caractérise les cellules caliciformes."
      ]
    ],
    [
      "Quel est le trajet initial habituel des chylomicrons après leur sortie des entérocytes ?",
      [
        "Les chylifères lymphatiques.",
        "Les capillaires sanguins puis immédiatement la veine porte.",
        "La lumière intestinale par sécrétion apicale."
      ],
      [
        "Ces particules lipidiques rejoignent la lymphe avant la circulation veineuse.",
        "Ce trajet concerne notamment les acides aminés et monosaccharides, pas la voie initiale majoritaire des chylomicrons.",
        "L’exportation des chylomicrons absorbés se fait du côté basolatéral vers le milieu intérieur."
      ]
    ],
    [
      "Quelle substance rejoint principalement le sang portal après absorption ?",
      [
        "Les acides aminés.",
        "Les chylomicrons nouvellement formés.",
        "Les grosses gouttelettes de triglycérides intactes du repas."
      ],
      [
        "Ils traversent l’épithélium puis rejoignent les capillaires sanguins intestinaux.",
        "Leur voie initiale est principalement lymphatique.",
        "La digestion et le transport épithélial précèdent l’exportation ; ces gouttelettes ne franchissent pas directement les capillaires."
      ]
    ],
    [
      "Quelle région absorbe spécifiquement le complexe B12–facteur intrinsèque ?",
      [
        "L’iléon terminal.",
        "Le duodénum proximal.",
        "Le côlon ascendant."
      ],
      [
        "Ce mécanisme spécialisé explique les conséquences possibles d’une atteinte ou d’une résection de cette région.",
        "Le complexe doit atteindre un site d’absorption en aval, dans l’iléon terminal.",
        "Le côlon n’est pas le site spécialisé de cette absorption."
      ]
    ],
    [
      "Quel rôle jouent les sels biliaires dans la digestion des lipides ?",
      [
        "Ils facilitent l’émulsification et la formation de micelles.",
        "Ils hydrolysent les triglycérides par une activité de lipase.",
        "Ils transforment tous les acides gras en acides aminés."
      ],
      [
        "Ils aident à disperser les lipides et à présenter les produits de digestion à la surface absorbante.",
        "L’hydrolyse est enzymatique ; les sels biliaires ne sont pas des lipases.",
        "Ils participent au traitement physique des lipides, sans réaliser cette conversion chimique."
      ]
    ],
    [
      "Quel mouvement favorise surtout le mélange du chyme au contact de la muqueuse ?",
      [
        "La segmentation.",
        "Le transport par les microvillosités comme moteur musculaire.",
        "Le passage à travers la valvule iléocæcale dans les deux sens."
      ],
      [
        "Les contractions locales redistribuent le contenu et favorisent son contact avec les sécrétions et l’épithélium.",
        "Les microvillosités augmentent la surface ; elles ne remplacent pas les contractions de la musculeuse.",
        "Cette jonction ne constitue pas le mécanisme de mélange segmentaire du grêle."
      ]
    ],
    [
      "Quel mésentère suspend les anses jéjuno-iléales ?",
      [
        "Le mésentère de l’intestin grêle.",
        "Le mésocôlon transverse.",
        "Le petit omentum."
      ],
      [
        "Il relie les anses à la paroi postérieure et véhicule vaisseaux, nerfs et lymphatiques.",
        "Il suspend le côlon transverse, pas les anses jéjuno-iléales.",
        "Il relie principalement foie, petite courbure gastrique et duodénum proximal."
      ]
    ],
    [
      "À quel niveau le grêle débouche-t-il dans le gros intestin ?",
      [
        "À la jonction iléocæcale.",
        "À l’angle colique gauche.",
        "Au pylore."
      ],
      [
        "L’iléon terminal s’ouvre dans le cæcum, première partie du gros intestin.",
        "L’angle gauche unit côlon transverse et descendant, en aval du cæcum.",
        "Le pylore est l’entrée du duodénum, au début du grêle."
      ]
    ]
  ],
  "FMA7197": [
    [
      "Quel vaisseau apporte au foie du sang provenant notamment du tube digestif ?",
      [
        "La veine porte.",
        "Une veine hépatique.",
        "La veine cave inférieure comme afférence portale."
      ],
      [
        "Elle collecte les territoires splanchniques avant le passage dans les sinusoïdes hépatiques.",
        "Les veines hépatiques sont des voies de sortie vers la veine cave inférieure.",
        "La veine cave reçoit le drainage hépatique ; elle ne constitue pas l’afférence portale."
      ]
    ],
    [
      "Quel ensemble correspond à la triade portale microscopique classique ?",
      [
        "Une branche portale, une branche artérielle et un canal biliaire.",
        "Une veine centrolobulaire, une veine hépatique et l’aorte.",
        "Trois canaux biliaires sans élément vasculaire."
      ],
      [
        "Ces éléments cheminent ensemble dans les espaces portes.",
        "La veine centrolobulaire est au centre du lobule classique et non dans une triade portale.",
        "Le terme triade associe des composantes vasculaires et biliaire, pas trois canaux identiques."
      ]
    ],
    [
      "Vers quelle structure le sang converge-t-il dans le lobule hépatique classique ?",
      [
        "La veine centrolobulaire.",
        "Le canal biliaire de l’espace porte.",
        "La lumière des canalicules biliaires."
      ],
      [
        "Le sang des afférences périphériques traverse les sinusoïdes vers cette veine centrale.",
        "Le canal transporte de la bile, pas le sang sinusoïdal.",
        "Le réseau canaliculaire est distinct du compartiment sanguin."
      ]
    ],
    [
      "Comment se comparent les sens d’écoulement du sang et de la bile dans le lobule classique ?",
      [
        "Ils sont globalement opposés.",
        "Ils vont tous deux vers la veine centrolobulaire.",
        "La bile circule dans les sinusoïdes en sens variable."
      ],
      [
        "Le sang va vers la veine centrale ; la bile rejoint les ductules périphériques.",
        "La bile ne se draine pas dans la veine centrolobulaire.",
        "Les sinusoïdes sont vasculaires ; la bile utilise un réseau séparé."
      ]
    ],
    [
      "Quelle cellule réalise la sécrétion initiale de bile dans les canalicules ?",
      [
        "L’hépatocyte.",
        "La cellule de Kupffer.",
        "L’érythrocyte."
      ],
      [
        "Les canalicules sont délimités par les membranes de cellules hépatiques voisines.",
        "C’est un macrophage résident, non la cellule sécrétrice principale de bile.",
        "L’érythrocyte transporte les gaz ; il ne sécrète pas de bile."
      ]
    ],
    [
      "Quel est le rôle principal de la vésicule biliaire dans ce système ?",
      [
        "Stocker et concentrer une partie de la bile.",
        "Synthétiser toute la bile à partir du sang portal.",
        "Évacuer directement la bile dans le jéjunum par un conduit propre."
      ],
      [
        "La bile est produite par le foie ; la vésicule module sa disponibilité digestive.",
        "La synthèse initiale relève des hépatocytes.",
        "Le conduit cystique rejoint la voie biliaire principale ; la bile est délivrée dans le duodénum, pas directement dans le jéjunum."
      ]
    ],
    [
      "Quelle voie assure le drainage veineux final du foie ?",
      [
        "Les veines hépatiques vers la veine cave inférieure.",
        "La veine porte vers le duodénum.",
        "Le cholédoque vers la veine cave."
      ],
      [
        "Elles recueillent le sang après son passage dans le parenchyme.",
        "Le flux portal physiologique se dirige vers le foie ; le duodénum n’est pas son exutoire.",
        "Le cholédoque transporte la bile vers le duodénum, non le sang vers la veine cave."
      ]
    ],
    [
      "Quelle description de l’oxygénation du sang portal est correcte ?",
      [
        "Il contient de l’oxygène et contribue à l’apport hépatique.",
        "Il est toujours totalement dépourvu d’oxygène.",
        "Il possède nécessairement la même teneur en oxygène que l’artère hépatique."
      ],
      [
        "Le sang veineux splanchnique n’est pas dépourvu d’oxygène ; l’apport artériel le complète.",
        "Une teneur plus faible que celle du sang artériel ne signifie pas une teneur nulle.",
        "Les territoires splanchniques ont extrait de l’oxygène avant le retour portal."
      ]
    ],
    [
      "Que représentent les cellules de Kupffer ?",
      [
        "Des macrophages résidents associés aux sinusoïdes.",
        "Les cellules endocrines des îlots pancréatiques.",
        "Les cellules épithéliales des conduits biliaires."
      ],
      [
        "Elles contribuent à la surveillance et à la phagocytose dans le foie.",
        "Ces cellules appartiennent au pancréas, non au réseau macrophagique hépatique.",
        "L’épithélium biliaire est constitué de cholangiocytes, distincts des cellules de Kupffer."
      ]
    ],
    [
      "Pourquoi ne faut-il pas assimiler lobes morphologiques et segmentation fonctionnelle du foie ?",
      [
        "Les limites de surface ne coïncident pas toutes avec les territoires vasculobiliaires.",
        "Les lobes de surface et les territoires portaux ont exactement les mêmes limites.",
        "La segmentation fonctionnelle repose uniquement sur les attaches péritonéales."
      ],
      [
        "La segmentation fonctionnelle suit la distribution des pédicules et les plans vasculaires.",
        "La séparation morphologique ne se superpose pas exactement au partage fonctionnel par les pédicules.",
        "Les attaches péritonéales donnent des repères de surface, mais la segmentation fonctionnelle repose sur l’organisation vasculobiliaire."
      ]
    ],
    [
      "Quelle zone de l’acinus reçoit normalement le sang le moins oxygéné, après le trajet sinusoïdal ?",
      [
        "La zone 3 centrolobulaire.",
        "La zone 1 périportale.",
        "La zone 2 comme région recevant directement les afférences."
      ],
      [
        "La région centrolobulaire est la plus en aval des afférences et reçoit du sang déjà appauvri en oxygène.",
        "La zone périportale est proche des arrivées artérielle et portale et bénéficie d’une oxygénation plus élevée.",
        "La zone 2 est intermédiaire ; les afférences sont du côté périportal, non au centre de cette zone."
      ]
    ]
  ],
  "FMA7198": [
    [
      "Quelle partie du pancréas est encadrée par le duodénum ?",
      [
        "La tête.",
        "La queue.",
        "Le col."
      ],
      [
        "Le cadre duodénal entoure la tête pancréatique à droite.",
        "La queue se dirige vers le hile splénique, à gauche.",
        "Le col est la portion de transition entre tête et corps ; le cadre duodénal entoure surtout la tête."
      ]
    ],
    [
      "Quelles veines se réunissent habituellement derrière le col du pancréas pour former la veine porte ?",
      [
        "La splénique et la mésentérique supérieure.",
        "La mésentérique inférieure et la veine cave inférieure.",
        "La gastrique gauche et une veine hépatique."
      ],
      [
        "La confluence splénomésentérique se situe classiquement derrière le col ; l’abouchement de la mésentérique inférieure est variable.",
        "La mésentérique inférieure rejoint souvent la splénique ; la veine cave ne constitue pas cette confluence portale.",
        "La gastrique gauche est une afférence portale ; les veines hépatiques drainent le foie vers la veine cave."
      ]
    ],
    [
      "Quel produit est majoritairement associé aux cellules canalaires pancréatiques ?",
      [
        "Une sécrétion riche en bicarbonate.",
        "L’insuline.",
        "Le pepsinogène."
      ],
      [
        "Elle contribue à neutraliser le contenu acide arrivant dans le duodénum.",
        "L’insuline provient des cellules β des îlots endocrines.",
        "Le pepsinogène est un produit des cellules principales gastriques."
      ]
    ],
    [
      "Quelle structure produit les enzymes digestives pancréatiques ?",
      [
        "Les acini exocrines.",
        "Les îlots endocrines.",
        "Les cellules canalaires comme source principale de protéases."
      ],
      [
        "Les cellules acineuses élaborent les enzymes ou leurs précurseurs, évacués dans les conduits.",
        "Les îlots libèrent des hormones vers le sang, non le suc digestif dans les conduits.",
        "Les cellules canalaires assurent surtout la composante hydro-bicarbonatée ; les enzymes proviennent principalement des cellules acineuses."
      ]
    ],
    [
      "Quelle cellule pancréatique sécrète l’insuline ?",
      [
        "La cellule β.",
        "La cellule α.",
        "La cellule δ."
      ],
      [
        "Les cellules β des îlots libèrent l’insuline en réponse notamment aux variations de glucose.",
        "Les cellules α sécrètent principalement le glucagon.",
        "Les cellules δ sécrètent principalement la somatostatine."
      ]
    ],
    [
      "Quel trajet emprunte normalement l’insuline après sa sécrétion ?",
      [
        "Interstitium puis capillaires sanguins.",
        "Conduit pancréatique puis lumière duodénale.",
        "Canalicules biliaires puis cholédoque."
      ],
      [
        "Il s’agit d’une sécrétion endocrine agissant à distance et localement.",
        "Ce trajet est celui de la composante exocrine digestive.",
        "L’insuline n’est pas évacuée par les voies biliaires."
      ]
    ],
    [
      "Quelle enzyme déclenche physiologiquement l’activation du trypsinogène dans le duodénum ?",
      [
        "L’entéropeptidase.",
        "La pepsine gastrique arrivée dans le duodénum.",
        "La chymotrypsine pancréatique."
      ],
      [
        "Elle produit de la trypsine, qui active ensuite d’autres précurseurs protéolytiques.",
        "L’activation initiale du trypsinogène est réalisée par l’entéropeptidase duodénale, non par la pepsine gastrique.",
        "La chymotrypsine provient du chymotrypsinogène activé par la trypsine ; elle n’initie pas la cascade physiologique."
      ]
    ],
    [
      "Pourquoi sécréter des protéases sous forme de zymogènes ?",
      [
        "Limiter une activité protéolytique prématurée dans la glande.",
        "Permettre leur activité maximale avant la sortie de l’acinus.",
        "Empêcher toute activité enzymatique dans l’intestin."
      ],
      [
        "L’activation principalement intestinale participe à la protection contre l’autodigestion.",
        "L’objectif est justement de limiter cette activité prématurée.",
        "Les précurseurs doivent être activés en aval pour participer à la digestion."
      ]
    ],
    [
      "Quelle affirmation distingue correctement les enzymes pancréatiques ?",
      [
        "Toutes ne sont pas sécrétées sous forme inactive.",
        "L’amylase doit être activée en trypsine avant d’agir.",
        "L’amylase et la lipase sont des zymogènes activés par la pepsine."
      ],
      [
        "L’amylase et la lipase sont notamment sécrétées sous forme active, contrairement à plusieurs protéases.",
        "Amylase et trypsine sont des enzymes distinctes avec des substrats différents.",
        "Ces deux enzymes sont sécrétées sous forme active ; la pepsine n’est pas leur activateur physiologique."
      ]
    ],
    [
      "Quelle hormone stimule surtout la sécrétion pancréatique de bicarbonate en réponse à l’acidité duodénale ?",
      [
        "La sécrétine.",
        "La gastrine comme signal duodénal principal de cette réponse.",
        "Le glucagon comme hormone exocrine duodénale."
      ],
      [
        "Ce signal favorise la composante hydro-bicarbonatée de la sécrétion.",
        "La gastrine est surtout impliquée dans les fonctions gastriques ; la réponse bicarbonatée à l’acidité mobilise la sécrétine.",
        "Le glucagon est une hormone endocrine pancréatique, pas le signal duodénal demandé."
      ]
    ],
    [
      "Pourquoi qualifie-t-on le pancréas de glande mixte ?",
      [
        "Il associe composantes exocrine et endocrine aux voies de sortie différentes.",
        "Chaque produit est envoyé en quantité égale dans le sang et dans le conduit.",
        "Ses acini endocrines sont les seuls éléments fonctionnels."
      ],
      [
        "Le suc digestif rejoint le duodénum ; les hormones des îlots rejoignent le sang.",
        "Le qualificatif mixte décrit deux fonctions organisées, pas un partage égal de chaque produit.",
        "Les acini sont exocrines et coexistent avec des îlots endocrines fonctionnels."
      ]
    ]
  ],
  "FMA7204": [
    [
      "Quelle est la position péritonéale habituelle des reins ?",
      [
        "Rétropéritonéale.",
        "Intrapéritonéale, suspendue par un mésentère.",
        "Dans la lumière du sac péritonéal, sans enveloppe adipeuse."
      ],
      [
        "Ils sont situés en arrière du péritoine pariétal postérieur.",
        "Les reins ne sont pas suspendus dans la cavité péritonéale par un mésentère.",
        "Ils sont extrapéritonéaux et entourés notamment de graisse et de fascias."
      ]
    ],
    [
      "Quel ordre antéropostérieur décrit classiquement le hile rénal ?",
      [
        "Veine, artère, pelvis rénal.",
        "Pelvis rénal, veine, artère.",
        "Artère, pelvis rénal, veine."
      ],
      [
        "Cet ordre constitue un repère topographique, sous réserve des variantes vasculaires.",
        "Le pelvis est habituellement le plus postérieur des trois éléments principaux.",
        "La veine est classiquement antérieure, non en arrière du pelvis."
      ]
    ],
    [
      "Dans quelle région se trouvent les corpuscules rénaux ?",
      [
        "Le cortex.",
        "Les papilles médullaires.",
        "La paroi du pelvis rénal."
      ],
      [
        "Les glomérules et capsules rénales appartiennent au cortex, y compris près de la jonction corticomédullaire.",
        "Les papilles correspondent à l’extrémité des pyramides et à la sortie des conduits papillaires.",
        "Le pelvis collecte l’urine et ne contient pas les corpuscules filtrants."
      ]
    ],
    [
      "Quel trajet suit l’urine après les papilles ?",
      [
        "Calices mineurs, calices majeurs, pelvis, uretère.",
        "Pelvis, calices mineurs, uretère, calices majeurs.",
        "Uretère, pelvis, calices majeurs, calices mineurs."
      ],
      [
        "Les voies collectrices convergent progressivement vers l’uretère.",
        "Cet ordre inverse les étapes de convergence et place les grands calices après l’uretère.",
        "Il s’agit du sens opposé à l’écoulement physiologique vers la vessie."
      ]
    ],
    [
      "Quel vaisseau sort du glomérule ?",
      [
        "L’artériole efférente.",
        "L’artériole afférente.",
        "Une veinule directement reliée au glomérule."
      ],
      [
        "Elle précède les réseaux péritubulaires ou les vasa recta selon le néphron.",
        "L’artériole afférente amène le sang au glomérule.",
        "Le glomérule se situe entre deux artérioles ; le drainage veineux intervient après les réseaux capillaires suivants."
      ]
    ],
    [
      "Une substance est filtrée à 100 mg/min, réabsorbée à 60 et sécrétée à 10. Quel est son débit d’excrétion ?",
      [
        "50 mg/min.",
        "30 mg/min.",
        "170 mg/min."
      ],
      [
        "Le bilan est filtration − réabsorption + sécrétion, soit 100−60+10.",
        "Ce résultat soustrait à tort la sécrétion, qui ajoute la substance au contenu tubulaire.",
        "Additionner la réabsorption inverse son sens : elle retire la substance du tubule."
      ]
    ],
    [
      "Une clairance est calculée par U×V/P. Si U=20 mg/mL, V=1 mL/min et P=0,2 mg/mL, quelle valeur obtient-on ?",
      [
        "100 mL/min.",
        "100 mg/min.",
        "4 mL/min."
      ],
      [
        "U×V vaut 20 mg/min ; diviser par 0,2 mg/mL donne 100 mL/min.",
        "Le résultat d’une clairance est un volume par unité de temps ; les unités de masse se simplifient.",
        "Multiplier U par P au lieu de diviser ne respecte ni la formule ni les dimensions."
      ]
    ],
    [
      "Quel effet l’ADH exerce-t-elle sur les cellules principales du système collecteur ?",
      [
        "Elle favorise l’insertion apicale d’aquaporines-2 et augmente la perméabilité à l’eau.",
        "Elle réduit l’insertion apicale d’aquaporines-2.",
        "Elle agit sur la filtration glomérulaire sans modifier la perméabilité du collecteur."
      ],
      [
        "Cela permet une réabsorption d’eau selon le gradient osmotique médullaire.",
        "L’ADH favorise au contraire l’insertion apicale d’aquaporines-2.",
        "L’action antidiurétique majeure étudiée ici est tubulaire et modifie la perméabilité à l’eau du système collecteur."
      ]
    ],
    [
      "Quelle distinction entre sécrétion et réabsorption tubulaires est correcte ?",
      [
        "La sécrétion ajoute au tubule, la réabsorption ramène vers le sang.",
        "Les deux termes désignent seulement la filtration glomérulaire.",
        "La sécrétion ramène au sang et la réabsorption ajoute à l’urine."
      ],
      [
        "Ces deux flux s’opposent dans le bilan d’excrétion d’une même substance.",
        "La filtration précède les échanges tubulaires ; les trois mécanismes sont distincts.",
        "Les deux directions sont inversées dans cette proposition."
      ]
    ],
    [
      "Quelle hormone produite principalement par le rein stimule l’érythropoïèse ?",
      [
        "L’érythropoïétine.",
        "L’aldostérone.",
        "L’ADH."
      ],
      [
        "Sa production augmente en réponse à une baisse de disponibilité en oxygène.",
        "L’aldostérone est produite par le cortex surrénalien et agit sur les transports ioniques distaux.",
        "L’ADH est synthétisée dans l’hypothalamus et libérée par la neurohypophyse ; elle règle surtout l’économie d’eau."
      ]
    ]
  ],
  "FMA24474": [
    [
      "Sur un fémur isolé, quelle orientation donne la tête ?",
      [
        "Elle regarde médialement, vers le haut et légèrement en avant.",
        "Elle regarde latéralement, vers le bas et en arrière.",
        "Elle est située à l’extrémité distale, entre les condyles."
      ],
      [
        "La tête se dirige vers l’acétabulum ; son orientation aide à déterminer le côté.",
        "Cette orientation est opposée aux repères habituels de la tête fémorale.",
        "La tête appartient à l’extrémité proximale, distincte des condyles distaux."
      ]
    ],
    [
      "Où se situe la ligne âpre ?",
      [
        "Sur la face postérieure de la diaphyse.",
        "Sur la surface articulaire de la tête.",
        "Sur la surface patellaire antérieure."
      ],
      [
        "Ce relief fournit plusieurs zones d’insertion musculaire.",
        "La tête porte du cartilage articulaire et la fovéa, pas la ligne âpre.",
        "La surface patellaire est distale et articulaire ; la ligne âpre est diaphysaire et postérieure."
      ]
    ],
    [
      "Quel relief reçoit l’insertion de l’iliopsoas ?",
      [
        "Le petit trochanter.",
        "La surface patellaire.",
        "La fosse intercondylaire."
      ],
      [
        "Son insertion au petit trochanter participe notamment à la flexion de hanche.",
        "Cette surface reçoit la patella et n’est pas l’insertion de l’iliopsoas.",
        "Cette fosse distale accueille notamment les insertions fémorales des ligaments croisés."
      ]
    ],
    [
      "Quelle distinction entre ligne et crête intertrochantériques est correcte ?",
      [
        "La ligne est antérieure et la crête postérieure.",
        "La ligne est postérieure et la crête antérieure.",
        "Les deux sont situées sur la surface articulaire de la tête."
      ],
      [
        "Ces repères relient la région des trochanters de part et d’autre du col.",
        "Les positions antérieure et postérieure sont inversées.",
        "Elles appartiennent à la région trochantérique, hors de la surface céphalique articulaire."
      ]
    ],
    [
      "Avec quel os les condyles fémoraux s’articulent-ils directement au genou ?",
      [
        "Le tibia.",
        "La fibula.",
        "Le talus."
      ],
      [
        "Les plateaux tibiaux reçoivent les condyles avec l’interposition des ménisques.",
        "La fibula s’articule proximalement avec le tibia, pas directement avec le fémur.",
        "Le talus appartient à la cheville, sans articulation directe avec le fémur."
      ]
    ],
    [
      "Quelle surface fémorale reçoit la patella ?",
      [
        "La surface patellaire antérieure distale.",
        "La fosse intercondylaire postérieure.",
        "Le petit trochanter."
      ],
      [
        "Elle guide la patella lors de la flexion-extension du genou.",
        "La fosse reçoit notamment les ligaments croisés, pas la patella.",
        "Ce relief proximal reçoit une insertion musculaire et n’est pas une surface fémoropatellaire."
      ]
    ],
    [
      "Quel apport artériel est particulièrement important pour la tête fémorale adulte ?",
      [
        "Les branches rétinaculaires, notamment issues de la circonflexe fémorale médiale.",
        "L’artère du ligament de la tête comme source majoritaire constante.",
        "Les artères tibiales antérieure et postérieure directement dans la tête."
      ],
      [
        "Leur trajet au voisinage du col explique la vulnérabilité de la tête dans certaines fractures cervicales.",
        "Sa contribution varie et n’est généralement pas la source dominante chez l’adulte.",
        "Ces artères vascularisent surtout la jambe et ne fournissent pas directement l’apport rétinaculaire céphalique."
      ]
    ],
    [
      "Quel risque anatomique peut accompagner une fracture déplacée du col fémoral ?",
      [
        "Une atteinte de la vascularisation de la tête.",
        "Une interruption obligatoire de toute vascularisation du tibia.",
        "Une rupture systématique du ligament croisé antérieur."
      ],
      [
        "La fracture peut léser les vaisseaux rétinaculaires cheminant au voisinage du col.",
        "La lésion cervicale ne coupe pas nécessairement les axes artériels destinés à la jambe.",
        "Le ligament croisé est au genou ; sa rupture n’est pas une conséquence obligatoire d’une fracture du col."
      ]
    ],
    [
      "Quelle affirmation distingue condyle et épicondyle ?",
      [
        "Le condyle comporte une surface articulaire, l’épicondyle est un relief voisin extra-articulaire.",
        "L’épicondyle est la tête proximale du fémur.",
        "Le condyle est un tendon et l’épicondyle une capsule."
      ],
      [
        "Les deux termes ne désignent pas la même structure ni la même fonction.",
        "Les épicondyles fémoraux sont distaux, au voisinage des condyles.",
        "Ce sont tous deux des reliefs osseux, avec des rapports et fonctions différents."
      ]
    ],
    [
      "Pourquoi le grand trochanter est-il important pour la mécanique de hanche ?",
      [
        "Il offre des insertions musculaires et contribue aux bras de levier.",
        "Il constitue la principale surface de contact avec l’acétabulum.",
        "Il remplace le cartilage de la tête lors des mouvements."
      ],
      [
        "Les forces appliquées à distance du centre articulaire produisent des moments de force.",
        "C’est la tête fémorale qui s’articule avec l’acétabulum, non le grand trochanter.",
        "C’est un relief d’insertion ; il ne se substitue pas au cartilage articulaire."
      ]
    ],
    [
      "Quel repère permet de distinguer l’avant de l’arrière à l’extrémité distale ?",
      [
        "La surface patellaire en avant et la fosse intercondylaire en arrière.",
        "La fosse intercondylaire en avant et la surface patellaire en arrière.",
        "La tête en avant et le petit trochanter en arrière de chaque condyle."
      ],
      [
        "Ces reliefs complètent l’orientation donnée par la ligne âpre et la tête.",
        "Leurs positions sont inversées.",
        "Ces repères appartiennent à l’extrémité proximale, non à la région condylaire distale."
      ]
    ]
  ],
  "FMA50801": [
    [
      "Quelle distinction entre cerveau et encéphale est utile en anatomie ?",
      [
        "L’encéphale comprend aussi le tronc cérébral et le cervelet.",
        "L’encéphale désigne uniquement les deux hémisphères corticaux.",
        "Le cerveau est situé dans le canal vertébral tandis que l’encéphale est crânien."
      ],
      [
        "Le terme encéphale désigne l’ensemble intracrânien du système nerveux central.",
        "Cette définition exclurait à tort d’autres structures intracrâniennes.",
        "La moelle épinière occupe le canal vertébral ; le cerveau est intracrânien."
      ]
    ],
    [
      "Quel sillon sépare classiquement lobes frontal et pariétal ?",
      [
        "Le sillon central.",
        "Le sillon latéral.",
        "La fissure longitudinale."
      ],
      [
        "Le gyrus précentral est en avant et le postcentral en arrière.",
        "Il sépare surtout le lobe temporal des régions frontale et pariétale sus-jacentes.",
        "Elle sépare les deux hémisphères, pas les lobes frontal et pariétal d’un même côté."
      ]
    ],
    [
      "Où se situe le cortex moteur primaire ?",
      [
        "Dans le gyrus précentral.",
        "Dans le gyrus postcentral.",
        "Dans le cortex occipital autour de la scissure calcarine."
      ],
      [
        "Ce gyrus appartient au lobe frontal, en avant du sillon central.",
        "Le postcentral porte le cortex somatosensoriel primaire, en arrière du sillon central.",
        "Cette région est associée au cortex visuel primaire."
      ]
    ],
    [
      "Quelle fonction primaire est associée au gyrus postcentral ?",
      [
        "La sensibilité somatique.",
        "La commande motrice volontaire primaire.",
        "La vision primaire."
      ],
      [
        "Le cortex somatosensoriel primaire reçoit et traite des informations du corps.",
        "Le cortex moteur primaire est situé dans le gyrus précentral.",
        "Le cortex visuel primaire est occipital, non postcentral."
      ]
    ],
    [
      "Où se trouve l’insula ?",
      [
        "En profondeur dans le sillon latéral.",
        "Sur la face médiale du cervelet.",
        "Au centre de la lumière du troisième ventricule."
      ],
      [
        "Les opercules frontaux, pariétaux et temporaux la recouvrent partiellement.",
        "L’insula est une région corticale hémisphérique, pas cérébelleuse.",
        "Elle n’est pas une structure intraventriculaire ; elle est latérale et corticale."
      ]
    ],
    [
      "Quelle structure relie largement les deux hémisphères ?",
      [
        "Le corps calleux.",
        "La capsule interne seule.",
        "Le pédoncule cérébelleux moyen."
      ],
      [
        "C’est une grande commissure de substance blanche interhémisphérique.",
        "La capsule interne contient surtout des fibres de projection entre cortex et structures sous-corticales.",
        "Il relie le pont au cervelet ; il n’est pas la grande commissure des hémisphères cérébraux."
      ]
    ],
    [
      "La substance grise est-elle limitée à la surface du cerveau ?",
      [
        "Non, elle forme aussi des noyaux profonds.",
        "Oui, toute structure profonde est exclusivement de la substance blanche.",
        "Non, parce que le corps calleux est principalement un noyau gris."
      ],
      [
        "Cortex et noyaux sous-corticaux représentent deux dispositions de substance grise.",
        "Des noyaux gris se trouvent au sein des régions profondes.",
        "Le corps calleux est une commissure de substance blanche, pas un noyau gris."
      ]
    ],
    [
      "À quelle grande subdivision appartient le thalamus ?",
      [
        "Au diencéphale.",
        "Au mésencéphale.",
        "Au cervelet."
      ],
      [
        "Il participe à de nombreux relais et circuits en relation avec le cortex.",
        "Le mésencéphale est une portion du tronc cérébral située plus caudalement.",
        "Le cervelet est une structure distincte du diencéphale."
      ]
    ],
    [
      "Quel compartiment contient normalement du liquide cérébrospinal autour de l’encéphale ?",
      [
        "L’espace sous-arachnoïdien.",
        "L’espace sous-dural comme réservoir physiologique principal.",
        "L’intérieur des sinus veineux duraux."
      ],
      [
        "Il se situe entre arachnoïde et pie-mère et contient aussi des vaisseaux.",
        "L’espace sous-dural est potentiel ; il n’est pas le compartiment normal de circulation du LCS.",
        "Les sinus contiennent du sang veineux, même si la résorption du LCS est en relation avec ce drainage."
      ]
    ],
    [
      "Pourquoi une lésion limitée de la capsule interne peut-elle avoir des effets moteurs étendus ?",
      [
        "Des fibres de projection y cheminent de façon compacte.",
        "Parce qu’elle contient tous les corps cellulaires moteurs corticaux.",
        "Parce qu’elle produit directement le liquide cérébrospinal."
      ],
      [
        "Une petite zone peut intéresser de nombreuses fibres réunies dans un espace restreint.",
        "Les corps cellulaires corticaux se trouvent dans la substance grise du cortex, non dans la capsule interne.",
        "La production de LCS ne constitue pas la fonction des faisceaux de la capsule interne."
      ]
    ],
    [
      "Quelles artères se réunissent habituellement pour former l’artère basilaire ?",
      [
        "Les deux artères vertébrales.",
        "Les deux artères carotides internes.",
        "Les deux artères cérébrales moyennes."
      ],
      [
        "Les vertébrales se réunissent à la jonction bulbopontique ; la basilaire chemine ensuite à la face antérieure du pont.",
        "Les carotides internes alimentent le système carotidien cérébral, sans se réunir pour former la basilaire.",
        "Les cérébrales moyennes sont des branches du système carotidien ; elles ne constituent pas l’origine de la basilaire."
      ]
    ]
  ]
}
export const organQuestionRevisions: Record<string, Draft> = Object.fromEntries(
 Object.entries(bank).flatMap(([course, rows]) => {
  const ids = supplementalQuestionIds[course]
  if (ids?.length !== rows.length) throw new Error(`Révision QCM incomplète : ${course}`)
  return rows.map(([prompt, options, why], i) => [ids[i], {prompt, options, why, correct: [0], format: 'single'}])
 })
)
