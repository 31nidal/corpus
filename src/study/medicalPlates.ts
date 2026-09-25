export interface DiagramPoint {
  id?: string
  name: string
  detail: string
  x: number
  y: number
  category?: string
  clinicalNote?: string
}

export interface MedicalPlate {
  title: string
  caption: string
  category?: string
  points: DiagramPoint[]
}

export const medicalPlates: Record<string, MedicalPlate> = {
  // 1. Boucle Pression-Volume du ventricule gauche
  'phys-cardiac-cycle': {
    title: 'La boucle pression-volume du ventricule gauche',
    caption:
      'Tracé hémodynamique complet du ventricule gauche (courbe de Wiggers). Pression ventriculaire en mmHg en ordonnée, volume en mL en abscisse. Les 4 repères correspondent aux transitions valvulaires clés suivant le cycle dans le sens antihoraire.',
    category: 'Cardiologie & Physiologie',
    points: [
      {
        name: 'Ouverture de la mitrale',
        x: 180,
        y: 320,
        category: 'Diastole',
        detail:
          'La pression ventriculaire devient inférieure à la pression atriale. Le remplissage commence au volume télésystolique ; le tracé part vers la droite.',
        clinicalNote: 'Une sténose mitrale gêne ce remplissage et majore la pression dans l’atrium gauche.'
      },
      {
        name: 'Fermeture de la mitrale',
        x: 470,
        y: 300,
        category: 'Systole',
        detail:
          'Le remplissage atteint le volume télédiastolique. La pression ventriculaire dépasse la pression atriale : la mitrale se ferme et la contraction isovolumétrique commence.',
        clinicalNote: 'Le volume télédiastolique détermine la précharge (loi de Frank-Starling).'
      },
      {
        name: 'Ouverture de la valve aortique',
        x: 470,
        y: 140,
        category: 'Systole',
        detail:
          'La pression ventriculaire dépasse la pression aortique. L’éjection fait diminuer le volume ; le tracé se dirige vers la gauche.',
        clinicalNote: 'La postcharge correspond à la force s’opposant à cette ouverture et à l’éjection.'
      },
      {
        name: 'Fermeture de la valve aortique',
        x: 180,
        y: 100,
        category: 'Diastole',
        detail:
          'La pression ventriculaire devient inférieure à la pression aortique. La valve se ferme. La relaxation isovolumétrique suit, verticalement vers le bas.',
        clinicalNote: 'Le volume d’éjection systolique (VES) vaut VTD − VTS = 120 − 50 = 70 mL.'
      }
    ]
  },

  // 2. Anatomie interne et cavités du cœur
  'FMA7088': {
    title: 'Anatomie interne du cœur : cavités, valves et flux sanguin',
    caption:
      'Coupe frontale schématique montrant les 4 cavités cardiaques, les valves atrioventriculaires et sigmoïdes, ainsi que la séparation stricte par les septums interatrial et interventriculaire.',
    category: 'Anatomie cardiovasculaire',
    points: [
      {
        name: 'Atrium droit',
        x: 175,
        y: 155,
        category: 'Cavités droites',
        detail:
          'Cavité à paroi mince recevant le sang désoxygéné de l’organisme via la veine cave supérieure, la veine cave inférieure et le sinus coronaire.',
        clinicalNote: 'Le nœud sinusal (pacemaker physiologique) se situe au sommet de l’atrium droit.'
      },
      {
        name: 'Ventricule droit',
        x: 230,
        y: 285,
        category: 'Cavités droites',
        detail:
          'Cavité antérieure et inférieure propulsant le sang vers les poumons à basse pression via le tronc pulmonaire.',
        clinicalNote: 'Sa paroi est plus fine (3-5 mm) que celle du ventricule gauche.'
      },
      {
        name: 'Valve tricuspide',
        x: 195,
        y: 215,
        category: 'Valves atrioventriculaires',
        detail:
          'Valve à trois cuspides reliant l’atrium droit au ventricule droit, amarrée par des cordages tendineux aux muscles papillaires.',
        clinicalNote: 'Empêche le reflux sanguin vers l’atrium droit lors de la systole ventriculaire.'
      },
      {
        name: 'Tronc pulmonaire',
        x: 275,
        y: 90,
        category: 'Grands vaisseaux',
        detail:
          'Artère volumineuse naissant du ventricule droit et se divisant rapidement sous la crosse aortique en artères pulmonaires droite et gauche.',
        clinicalNote: 'Protégé par la valve pulmonaire sigmoïde (3 valvules semi-lunaires).'
      },
      {
        name: 'Atrium gauche',
        x: 435,
        y: 145,
        category: 'Cavités gauches',
        detail:
          'Cavité postérieure recevant le sang oxygéné en provenance des 4 veines pulmonaires.',
        clinicalNote: 'L’auricule gauche peut être le siège de thrombus en cas de fibrillation atriale.'
      },
      {
        name: 'Ventricule gauche',
        x: 410,
        y: 295,
        category: 'Cavités gauches',
        detail:
          'Cavité conique à paroi myocardique très épaisse (8-12 mm) développant de hautes pressions pour l’éjection systémique.',
        clinicalNote: 'Représente le moteur principal de la circulation systémique générale.'
      },
      {
        name: 'Valve mitrale',
        x: 395,
        y: 215,
        category: 'Valves atrioventriculaires',
        detail:
          'Valve bicuspide (antérieure et postérieure) séparant l’atrium gauche du ventricule gauche.',
        clinicalNote: 'Les cordages et piliers évitent le prolapsus valvulaire en systole.'
      },
      {
        name: 'Aorte ascendante et crosse',
        x: 345,
        y: 65,
        category: 'Grands vaisseaux',
        detail:
          'Plus grande artère de l’organisme naissant du ventricule gauche et donnant le tronc brachiocéphalique, la carotide commune gauche et la sous-clavière gauche.',
        clinicalNote: 'Les ostiums des artères coronaires droite et gauche naissent des sinus de Valsalva.'
      },
      {
        name: 'Septum interventriculaire',
        x: 310,
        y: 270,
        category: 'Paroi myocardique',
        detail:
          'Cloison épaisse musculeuse et membraneuse séparant hermétiquement les deux ventricules.',
        clinicalNote: 'Une communication interventriculaire (CIV) crée un shunt gauche-droite.'
      }
    ]
  },
  'anat-heart-chambers-valves': {
    title: 'Anatomie interne du cœur : cavités, valves et flux sanguin',
    caption:
      'Coupe frontale schématique montrant les 4 cavités cardiaques, les valves atrioventriculaires et sigmoïdes, ainsi que la séparation stricte par les septums interatrial et interventriculaire.',
    category: 'Anatomie cardiovasculaire',
    points: [
      {
        name: 'Atrium droit',
        x: 175,
        y: 155,
        category: 'Cavités droites',
        detail:
          'Cavité à paroi mince recevant le sang désoxygéné de l’organisme via la veine cave supérieure, la veine cave inférieure et le sinus coronaire.',
        clinicalNote: 'Le nœud sinusal (pacemaker physiologique) se situe au sommet de l’atrium droit.'
      },
      {
        name: 'Ventricule droit',
        x: 230,
        y: 285,
        category: 'Cavités droites',
        detail:
          'Cavité antérieure et inférieure propulsant le sang vers les poumons à basse pression via le tronc pulmonaire.',
        clinicalNote: 'Sa paroi est plus fine (3-5 mm) que celle du ventricule gauche.'
      },
      {
        name: 'Valve tricuspide',
        x: 195,
        y: 215,
        category: 'Valves atrioventriculaires',
        detail:
          'Valve à trois cuspides reliant l’atrium droit au ventricule droit, amarrée par des cordages tendineux aux muscles papillaires.',
        clinicalNote: 'Empêche le reflux sanguin vers l’atrium droit lors de la systole ventriculaire.'
      },
      {
        name: 'Tronc pulmonaire',
        x: 275,
        y: 90,
        category: 'Grands vaisseaux',
        detail:
          'Artère volumineuse naissant du ventricule droit et se divisant rapidement sous la crosse aortique en artères pulmonaires droite et gauche.',
        clinicalNote: 'Protégé par la valve pulmonaire sigmoïde (3 valvules semi-lunaires).'
      },
      {
        name: 'Atrium gauche',
        x: 435,
        y: 145,
        category: 'Cavités gauches',
        detail:
          'Cavité postérieure recevant le sang oxygéné en provenance des 4 veines pulmonaires.',
        clinicalNote: 'L’auricule gauche peut être le siège de thrombus en cas de fibrillation atriale.'
      },
      {
        name: 'Ventricule gauche',
        x: 410,
        y: 295,
        category: 'Cavités gauches',
        detail:
          'Cavité conique à paroi myocardique très épaisse (8-12 mm) développant de hautes pressions pour l’éjection systémique.',
        clinicalNote: 'Représente le moteur principal de la circulation systémique générale.'
      },
      {
        name: 'Valve mitrale',
        x: 395,
        y: 215,
        category: 'Valves atrioventriculaires',
        detail:
          'Valve bicuspide (antérieure et postérieure) séparant l’atrium gauche du ventricule gauche.',
        clinicalNote: 'Les cordages et piliers évitent le prolapsus valvulaire en systole.'
      },
      {
        name: 'Aorte ascendante et crosse',
        x: 345,
        y: 65,
        category: 'Grands vaisseaux',
        detail:
          'Plus grande artère de l’organisme naissant du ventricule gauche et donnant le tronc brachiocéphalique, la carotide commune gauche et la sous-clavière gauche.',
        clinicalNote: 'Les ostiums des artères coronaires droite et gauche naissent des sinus de Valsalva.'
      },
      {
        name: 'Septum interventriculaire',
        x: 310,
        y: 270,
        category: 'Paroi myocardique',
        detail:
          'Cloison épaisse musculeuse et membraneuse séparant hermétiquement les deux ventricules.',
        clinicalNote: 'Une communication interventriculaire (CIV) crée un shunt gauche-droite.'
      }
    ]
  },

  // 3. Néphron & Filtration rénale
  'phys-renal': {
    title: 'Néphron : distinguer le filtrat et le sang',
    caption:
      'Schéma fonctionnel simplifié, non à l’échelle. Bleu : liquide tubulaire ; rouge : réseau sanguin ; vert : récupération vers le milieu intérieur. Les trajets sont déployés pour la lecture.',
    category: 'Physiologie rénale',
    points: [
      {
        name: 'Glomérule et capsule',
        x: 125,
        y: 100,
        category: 'Filtration',
        detail:
          'Le plasma est filtré à travers la barrière glomérulaire vers l’espace capsulaire. Le sang reste dans les capillaires et ressort par l’artériole efférente.',
        clinicalNote: 'Le débit de filtration glomérulaire (DFG) physiologique est d’environ 120 mL/min.'
      },
      {
        name: 'Tubule proximal',
        x: 250,
        y: 110,
        category: 'Réabsorption',
        detail:
          'Il récupère une grande part du sodium et de l’eau filtrés. Les cotransports apicaux utilisent notamment le gradient entretenu par la Na+/K+-ATPase basolatérale.',
        clinicalNote: 'Moteur énergétique assuré par la Na+/K+-ATPase basolatérale.'
      },
      {
        name: 'Branche descendante',
        x: 285,
        y: 270,
        category: 'Concentration',
        detail:
          'Elle est perméable à l’eau. Le gradient médullaire peut faire sortir de l’eau du tubule ; le filtrat se concentre le long du trajet.',
        clinicalNote: 'Participe au mécanisme de multiplication à contre-courant.'
      },
      {
        name: 'Branche ascendante',
        x: 365,
        y: 270,
        category: 'Dilution',
        detail:
          'La portion épaisse récupère des sels mais est très peu perméable à l’eau. Elle contribue au gradient médullaire et dilue le liquide tubulaire.',
        clinicalNote: 'Cible pharmacologique des diurétiques de l’anse (ex : furosémide).'
      },
      {
        name: 'Tube collecteur',
        x: 520,
        y: 270,
        category: 'Ajustement final',
        detail:
          'L’ADH augmente la perméabilité à l’eau de ce segment. La récupération dépend aussi du gradient médullaire disponible.',
        clinicalNote: 'Permet d’ajuster l’osmolarité urinaire entre 50 et 1200 mOsm/kg.'
      }
    ]
  },
  'FMA7204': {
    title: 'Anatomie du rein : cortex, médullaire et voies excrétrices',
    caption:
      'Coupe coronale schématique du parenchyme rénal montrant la disposition concentrique du cortex externe, des pyramides médullaires de Malpighi et de l’arbre caliciel conduisant l’urine au bassinet.',
    category: 'Anatomie urogénitale',
    points: [
      {
        name: 'Cortex rénal',
        x: 140,
        y: 85,
        category: 'Parenchyme',
        detail:
          'Couche superficielle granuleuse contenant les corpuscules de Malpighi (glomérules) et les tubules contournés proximaux et distaux.',
        clinicalNote: 'Les colonnes rénales de Bertin s’insinuent entre les pyramides médullaires.'
      },
      {
        name: 'Pyramides médullaires de Malpighi',
        x: 230,
        y: 190,
        category: 'Parenchyme',
        detail:
          'Formations triangulaires striées contenant les anses de Henle et les canaux collecteurs de Bellini.',
        clinicalNote: 'Leur sommet forme la papille rénale qui perfore l’arbre caliciel.'
      },
      {
        name: 'Petits et grands calices',
        x: 360,
        y: 200,
        category: 'Voies excrétrices',
        detail:
          'Entonnoirs membraneux collectant l’urine émise par les papilles rénales pour former 2 à 3 grands calices.',
        clinicalNote: 'Siège fréquent de micro-lithiases urinaires.'
      },
      {
        name: 'Bassinet (pyélon)',
        x: 430,
        y: 230,
        category: 'Voies excrétrices',
        detail:
          'Réservoir en entonnoir situé dans le sinus du rein qui recueille l’urine des grands calices et se poursuit par l’uretère.',
        clinicalNote: 'La jonction pyélo-urétérale constitue une zone de rétrécissement anatomique.'
      },
      {
        name: 'Uretère',
        x: 460,
        y: 350,
        category: 'Voies excrétrices',
        detail:
          'Conduit musculo-membraneux acheminant l’urine par péristaltisme depuis le bassinet jusqu’à la vessie.',
        clinicalNote: 'L’obstruction par un calcul entraîne la colique néphrétique aiguë.'
      },
      {
        name: 'Artère et veine rénales',
        x: 480,
        y: 150,
        category: 'Vascularisation',
        detail:
          'Vaisseaux volumineux du hile rénal assurant un débit sanguin de 1 à 1,2 L/min (20-25% du débit cardiaque).',
        clinicalNote: 'L’artère rénale droite passe derrière la veine cave inférieure.'
      }
    ]
  },

  // 4. Échanges gazeux alvéolocapillaires & Poumons
  'phys-gas-exchange': {
    title: 'Alvéole et capillaire : deux flux, une barrière',
    caption:
      'Coupe schématique sans échelle. Le capillaire est représenté en rose. Les flèches montrent le sens habituel des échanges gazeux selon les gradients de pression partielle.',
    category: 'Physiologie respiratoire',
    points: [
      {
        name: 'Air alvéolaire',
        x: 305,
        y: 105,
        category: 'Ventilation',
        detail:
          'La ventilation renouvelle l’air. Son débit utile dépend du volume courant, de la fréquence et de l’espace mort.',
        clinicalNote: 'L’espace mort anatomique ne participe pas à ces échanges utiles.'
      },
      {
        name: 'Barrière alvéolocapillaire',
        x: 190,
        y: 240,
        category: 'Membrane d’échange',
        detail:
          'Les gaz diffusent à travers une paroi très fine. Une augmentation d’épaisseur ou une réduction de surface diminue le transfert, à autres conditions comparables.',
        clinicalNote: 'La loi de Fick régit la diffusion : un œdème interstitiel épaissit la barrière et réduit le transfert.'
      },
      {
        name: 'Oxygène vers le sang',
        x: 267,
        y: 290,
        category: 'Diffusion',
        detail:
          'Dans la situation habituelle, la pression partielle en O₂ est plus élevée dans l’alvéole que dans le sang entrant. L’oxygène diffuse vers le sang.',
        clinicalNote: 'La quasi-totalité de l’O₂ sanguin est fixée à l’hémoglobine des hématies.'
      },
      {
        name: 'Dioxyde de carbone vers l’alvéole',
        x: 425,
        y: 255,
        category: 'Diffusion',
        detail:
          'Le CO₂ suit son propre gradient de pression partielle, du sang vers l’air alvéolaire. Il sera éliminé avec la ventilation.',
        clinicalNote: 'L’élimination du CO₂ est directement régulée par la ventilation alvéolaire.'
      },
      {
        name: 'Sang capillaire',
        x: 505,
        y: 335,
        category: 'Perfusion',
        detail:
          'La perfusion apporte le sang. L’hémoglobine en transporte une grande partie de l’oxygène ; contenu et pression partielle restent deux grandeurs différentes.',
        clinicalNote: 'L’adéquation du rapport ventilation/perfusion (VA/Q) est la clé d’une hématose optimale.'
      }
    ]
  },
  'FMA7309': {
    title: 'Anatomie des poumons : lobes, scissures et arbre bronchique',
    caption:
      'Vue antérieure schématique des deux poumons montrant la lobation asymétrique (3 lobes à droite, 2 lobes à gauche avec incisure cardiaque) et la bifurcation trachéobronchique.',
    category: 'Anatomie respiratoire',
    points: [
      {
        name: 'Trachée et carène',
        x: 320,
        y: 70,
        category: 'Voies aériennes',
        detail:
          'Conduit cartilagineux descendant dans le médiastin et se bifurquant au niveau de T4-T5 (angle de Louis) à la carène.',
        clinicalNote: 'La carène est richement innervée et déclenche le réflexe de toux.'
      },
      {
        name: 'Poumon droit (3 lobes)',
        x: 180,
        y: 190,
        category: 'Lobation',
        detail:
          'Plus volumineux que le gauche, divisé en 3 lobes (supérieur, moyen, inférieur) par deux scissures : la grande scissure oblique et la petite scissure horizontale.',
        clinicalNote: 'La bronche souche droite est plus verticale, large et courte que la gauche (inhalation de corps étranger).'
      },
      {
        name: 'Poumon gauche (2 lobes)',
        x: 460,
        y: 190,
        category: 'Lobation',
        detail:
          'Divisé en 2 lobes (supérieur et inférieur) par la scissure oblique. Le lobe supérieur présente la lingula et l’incisure cardiaque.',
        clinicalNote: 'L’incisure cardiaque répond à la masse du ventricule gauche.'
      },
      {
        name: 'Plèvre viscérale et pariétale',
        x: 100,
        y: 280,
        category: 'Enveloppe pleurale',
        detail:
          'Double feuillet séreux délimitant une cavité virtuelle sous pression négative permettant la transmission des mouvements thoraciques.',
        clinicalNote: 'L’entrée d’air dans la cavité pleurale provoque un pneumothorax.'
      },
      {
        name: 'Hile pulmonaire',
        x: 270,
        y: 220,
        category: 'Pédicule pulmonaire',
        detail:
          'Zone de réflexion pleurale où pénètrent la bronche principale, les branches de l’artère pulmonaire, les deux veines pulmonaires et les lymphatiques.',
        clinicalNote: 'À droite, l’artère pulmonaire est antérieure à la bronche ; à gauche, elle est supérieure.'
      }
    ]
  },

  // 5. Cerveau & Hémisphères cérébraux
  'FMA50801': {
    title: 'Hémisphère cérébral : lobes, sillons majeurs et tronc cérébral',
    caption:
      'Vue latérale gauche schématique de l’encéphale mettant en évidence les 4 lobes cérébraux externes, les sillons délimitants (Rolando et Sylvius), le cervelet et le tronc cérébral.',
    category: 'Neuroanatomie',
    points: [
      {
        name: 'Lobe frontal',
        x: 205,
        y: 140,
        category: 'Lobes télencéphaliques',
        detail:
          'Lobe antérieur délimité en arrière par le sillon central. Comprend le gyrus précentral (cortex moteur primaire M1), l’aire motrice du langage de Broca et le cortex préfrontal.',
        clinicalNote: 'Impliqué dans la motricité volontaire, la planification, le raisonnement et la personnalité.'
      },
      {
        name: 'Sillon central (de Rolando)',
        x: 320,
        y: 110,
        category: 'Sillons principaux',
        detail:
          'Sillon profond oblique séparant le lobe frontal en avant (gyrus précentral moteur) du lobe pariétal en arrière (gyrus postcentral sensitif).',
        clinicalNote: 'Repère chirurgical et fonctionnel majeur de la somatotopie (homunculus).'
      },
      {
        name: 'Lobe pariétal',
        x: 410,
        y: 130,
        category: 'Lobes télencéphaliques',
        detail:
          'Situé derrière le sillon central. Comprend le gyrus postcentral (cortex somesthésique primaire S1) et les aires d’intégration sensorielle et spatiale.',
        clinicalNote: 'Une lésion pariétale droite peut entraîner une héminégligence controlatérale.'
      },
      {
        name: 'Sillon latéral (de Sylvius)',
        x: 290,
        y: 205,
        category: 'Sillons principaux',
        detail:
          'Scissure profonde horizontale séparant les lobes frontal et pariétal du lobe temporal sous-jacent. Au fond du sillon se cache le lobe de l’insula.',
        clinicalNote: 'Contient l’artère cérébrale moyenne (sylvienne), artère la plus fréquemment occluse lors d’un AVC.'
      },
      {
        name: 'Lobe temporal',
        x: 280,
        y: 270,
        category: 'Lobes télencéphaliques',
        detail:
          'Lobe inférieur abritant le cortex auditif primaire, l’aire de compréhension du langage de Wernicke et les structures limbiques profondes (hippocampe, amygdale).',
        clinicalNote: 'Essentiel pour la mémoire déclarative et l’audition.'
      },
      {
        name: 'Lobe occipital',
        x: 520,
        y: 200,
        category: 'Lobes télencéphaliques',
        detail:
          'Pôle postérieur du cerveau recevant les radiations optiques autour de la scissure calcarine (cortex visuel primaire V1).',
        clinicalNote: 'Une lésion unilatérale provoque une hémianopsie latérale homonyme.'
      },
      {
        name: 'Cervelet',
        x: 465,
        y: 325,
        category: 'Fosse postérieure',
        detail:
          'Organe situé sous la tente du cervelet dans la fosse postérieure, responsable de la coordination motrice fine, de l’équilibre et du tonus postural.',
        clinicalNote: 'Un syndrome cérébelleux associe ataxie, dysmétrie, adiadococinésie et tremblement d’action.'
      },
      {
        name: 'Tronc cérébral',
        x: 380,
        y: 355,
        category: 'Tronc cérébral',
        detail:
          'Composé du mésencéphale, du pont et du bulbe rachidien. Lieu d’émergence des nerfs crâniens et siège des centres végétatifs vitaux (respiratoire, cardiovasculaire).',
        clinicalNote: 'Contient les voies motrices pyramidales et la formation réticulée activatrice ascendante.'
      }
    ]
  },

  // 6. Œil et globe oculaire
  'anat-eye': {
    title: 'Globe oculaire : tuniques, milieux transparents et rétine',
    caption:
      'Coupe horizontale sagittale du globe oculaire montrant les 3 tuniques concentriques (sclère, choroïde, rétine) et les 4 milieux transparents réfringents (cornée, humeur aqueuse, cristallin, corps vitré).',
    category: 'Organes des sens',
    points: [
      {
        name: 'Cornée',
        x: 135,
        y: 205,
        category: 'Dioptres oculaires',
        detail:
          'Calotte antérieure transparente, non vascularisée et très richement innervée (nerf V1), assurant les 2/3 de la puissance réfractive de l’œil (≈ 42 dioptries).',
        clinicalNote: 'Nourrie par imbibition à partir de l’humeur aqueuse et du film lacrymal.'
      },
      {
        name: 'Chambre antérieure et humeur aqueuse',
        x: 180,
        y: 205,
        category: 'Milieux transparents',
        detail:
          'Espace compris entre la face postérieure de la cornée et l’iris, rempli d’humeur aqueuse produite par les procès ciliaires et résorbée dans le canal de Schlemm.',
        clinicalNote: 'Un blocage de l’angle iridocornéen déclenche un glaucome aigu à angle fermé.'
      },
      {
        name: 'Iris et pupille',
        x: 215,
        y: 155,
        category: 'Tunique vasculaire (uvée)',
        detail:
          'Diaphragme circulaire pigmenté percé de la pupille, régulant la quantité de lumière entrant dans l’œil via le sphincter pupillaire (parasympathique) et le dilatateur (sympathique).',
        clinicalNote: 'Le réflexe photomoteur teste l’intégrité des voies optiques (II) et motrices oculaires (III).'
      },
      {
        name: 'Cristallin et corps ciliaire',
        x: 250,
        y: 205,
        category: 'Système d’accommodation',
        detail:
          'Lentille biconvexe élastique suspendue au corps ciliaire par la zonule de Zinn, modifiant sa courbure pour la mise au point nette des objets proches (accommodation).',
        clinicalNote: 'L’opacification du cristallin définit la cataracte ; la perte d’élasticité avec l’âge crée la presbytie.'
      },
      {
        name: 'Corps vitré',
        x: 360,
        y: 205,
        category: 'Milieux transparents',
        detail:
          'Gel transparent hydrophile (99% d’eau et collagène) remplissant les 4/5 postérieurs du globe oculaire et maintenant la rétine appliquée contre la choroïde.',
        clinicalNote: 'Le décollement postérieur du vitré peut occasionner des myodésopsies (mouches volantes).'
      },
      {
        name: 'Rétine et fovéa',
        x: 485,
        y: 185,
        category: 'Tunique nerveuse',
        detail:
          'Tunique interne neurosensorielle tapissée de photorécepteurs (bâtonnets périphériques et cônes centraux). La fovéa (macula) est le siège de la vision des détails et des couleurs.',
        clinicalNote: 'Une atteinte maculaire (DMLA) altère la vision centrale fine.'
      },
      {
        name: 'Choroïde et Sclère',
        x: 505,
        y: 110,
        category: 'Tuniques externes',
        detail:
          'La choroïde est la membrane intermédiaire hautement vascularisée et nourricière. La sclère est la coque fibreuse blanche protectrice externe.',
        clinicalNote: 'La sclère donne insertion aux 6 muscles oculomoteurs extrinsèques.'
      },
      {
        name: 'Papille optique et Nerf optique (CN II)',
        x: 540,
        y: 245,
        category: 'Voies visuelles',
        detail:
          'Zone d’émergence des axones des cellules ganglionnaires formant le nerf optique et point d’entrée de l’artère centrale de la rétine. Dépourvue de photorécepteurs (tache aveugle).',
        clinicalNote: 'Un œdème papillaire au fond d’œil témoigne d’une hypertension intracrânienne (HTIC).'
      }
    ]
  },

  // 7. Estomac et Duodénum
  'FMA7148': {
    title: 'Configuration de l’estomac : courbures, loge gastrique et pylore',
    caption:
      'Vue antérieure schématique de l’estomac montrant ses subdivisions anatomofonctionnelles (cardia, fundus, corps, antre, pylore) et sa continuité avec le cadre duodénal.',
    category: 'Anatomie digestive',
    points: [
      {
        name: 'Cardia',
        x: 235,
        y: 115,
        category: 'Jonction œsogastrique',
        detail:
          'Orifice d’abouchement de l’œsophage abdominal dans l’estomac à hauteur de T11, marqué par l’angle de His (incisure cardiale).',
        clinicalNote: 'La défaillance du sphincter inférieur de l’œsophage favorise le reflux gastro-œsophagien (RGO).'
      },
      {
        name: 'Fundus gastrique (grosse tubérosité)',
        x: 320,
        y: 80,
        category: 'Poches gastriques',
        detail:
          'Coupole supérieure convexe située sous la coupole diaphragmatique gauche, contenant physiologiquement la poche à air gastrique visible sur l’ASP.',
        clinicalNote: 'Riche en cellules pariétales sécrétant l’acide chlorhydrique (HCl) et le facteur intrinsèque.'
      },
      {
        name: 'Corps de l’estomac',
        x: 360,
        y: 200,
        category: 'Poches gastriques',
        detail:
          'Partie moyenne verticale la plus étendue présentant de volumineux plis muqueux longitudinaux favorisant le brassage du bol alimentaire.',
        clinicalNote: 'Siège principal de la digestion enzymatique par la pepsine.'
      },
      {
        name: 'Petite et Grande courbures',
        x: 260,
        y: 210,
        category: 'Bords et insertions péritonéales',
        detail:
          'La petite courbure (médiale) donne insertion au petit omentum avec le pédicule hépatique ; la grande courbure (latérale gauche) donne insertion au grand omentum et au ligament gastro-splénique.',
        clinicalNote: 'L’incisure angulaire sur la petite courbure marque la frontière entre le corps et l’antre.'
      },
      {
        name: 'Antre gastrique',
        x: 275,
        y: 310,
        category: 'Segment distal',
        detail:
          'Portion horizontale terminale à paroi musculaire puissante assurant le broyage mécanique et contenant les cellules G sécrétrices de gastrine.',
        clinicalNote: 'Zone de prédilection de la colonisation par Helicobacter pylori et des ulcères gastriques.'
      },
      {
        name: 'Pylore et sphincter pylorique',
        x: 185,
        y: 290,
        category: 'Sphincter distal',
        detail:
          'Épaississement annulaire musculeux lisse régulant la vidange gastrique millimétrée du chyme vers le duodénum.',
        clinicalNote: 'La sténose hypertrophique du pylore est une cause classique de vomissements chez le nourrisson.'
      },
      {
        name: 'Duodénum (cadre duodénal)',
        x: 130,
        y: 270,
        category: 'Intestin grêle initial',
        detail:
          'Premier segment fixe de l’intestin grêle en forme de C entourant la tête du pancréas. Le deuxième duodénum (D2) reçoit la bile et le suc pancréatique à la papille majeure.',
        clinicalNote: 'Le bulbe duodénal (D1) est le siège le plus fréquent des ulcères peptiques.'
      }
    ]
  },

  // 8. Colonne vertébrale & Disque intervertébral
  'anat-spine': {
    title: 'Colonne vertébrale : courbures physiologiques, disque et vertèbre',
    caption:
      'Vue de profil sagittal du rachis complet avec ses 4 courbures physiologiques (lordoses cervicale et lombaire, cyphoses thoracique et sacrée) et coupe détaillée de l’unité fonctionnelle disque-vertèbre.',
    category: 'Squelette axial',
    points: [
      {
        name: 'Rachis cervical (lordose, C1-C7)',
        x: 160,
        y: 75,
        category: 'Segments vertébraux',
        detail:
          'Segment très mobile de 7 vertèbres caractérisé par la présence des foramens transversaires (passage de l’artère vertébrale) et l’articulation craniocervicale atlas (C1) - axis (C2).',
        clinicalNote: 'La lordose cervicale compense le poids et l’orientation du regard.'
      },
      {
        name: 'Rachis thoracique (cyphose, T1-T12)',
        x: 185,
        y: 175,
        category: 'Segments vertébraux',
        detail:
          'Segment rigide de 12 vertèbres portant les facettes articulaires costales et formant la paroi postérieure de la cage thoracique.',
        clinicalNote: 'Sa rigidité protège les viscères thoraciques mais limite les mouvements de flexion/extension.'
      },
      {
        name: 'Rachis lombaire (lordose, L1-L5)',
        x: 155,
        y: 280,
        category: 'Segments vertébraux',
        detail:
          'Segment composé de 5 vertèbres massives à corps vertébral réniforme et volumineux supportant l’essentiel du poids corporel.',
        clinicalNote: 'Les étages L4-L5 et L5-S1 subissent les contraintes mécaniques maximales (hernie discale).'
      },
      {
        name: 'Sacrum et Coccyx',
        x: 190,
        y: 360,
        category: 'Segments vertébraux',
        detail:
          'Bloc osseux triangulaire formé par la fusion de 5 vertèbres sacrées et 3-5 pièces coccygiennes articulé avec les os iliaques au niveau des sacro-iliaques.',
        clinicalNote: 'Le promontoire sacré forme l’entrée supérieure du petit bassin obstétrical.'
      },
      {
        name: 'Corps vertébral',
        x: 410,
        y: 140,
        category: 'Unité fonctionnelle vertébrale',
        detail:
          'Cylindre osseux antérieur composé d’os spongieux trabéculaire bordé d’une corticale résistante et des plateaux vertébraux cartilagineux.',
        clinicalNote: 'L’ostéoporose expose aux tassements vertébraux par fragilisation des travées osseuses.'
      },
      {
        name: 'Disque intervertébral',
        x: 410,
        y: 220,
        category: 'Unité fonctionnelle vertébrale',
        detail:
          'Amortisseur fibrocartilagineux constitué d’un anneau fibreux périphérique (annulus fibrosus) retenant un noyau gélatineux hydrophile central (nucleus pulposus).',
        clinicalNote: 'Une rupture de l’annulus permet au nucleus d’exclure une hernie venant comprimer une racine nerveuse.'
      },
      {
        name: 'Canal vertébral et Moelle spinale',
        x: 490,
        y: 200,
        category: 'Structures neurales',
        detail:
          'Canal ostéoligamentaire protecteur formé par la succession des foramens vertébraux, abritant la moelle spinale (jusqu’en L1-L2), le fourreau dural et les racines de la queue de cheval.',
        clinicalNote: 'Un canal lombaire étroit constitutionnel ou arthrosique entraîne une claudication neurogène.'
      }
    ]
  },
  'anat-cervical': {
    title: 'Colonne vertébrale : courbures physiologiques, disque et vertèbre',
    caption:
      'Vue de profil sagittal du rachis complet avec ses 4 courbures physiologiques (lordoses cervicale et lombaire, cyphoses thoracique et sacrée) et coupe détaillée de l’unité fonctionnelle disque-vertèbre.',
    category: 'Squelette axial',
    points: [
      {
        name: 'Rachis cervical (lordose, C1-C7)',
        x: 160,
        y: 75,
        category: 'Segments vertébraux',
        detail:
          'Segment très mobile de 7 vertèbres caractérisé par la présence des foramens transversaires (passage de l’artère vertébrale) et l’articulation craniocervicale atlas (C1) - axis (C2).',
        clinicalNote: 'La lordose cervicale compense le poids et l’orientation du regard.'
      },
      {
        name: 'Rachis thoracique (cyphose, T1-T12)',
        x: 185,
        y: 175,
        category: 'Segments vertébraux',
        detail:
          'Segment rigide de 12 vertèbres portant les facettes articulaires costales et formant la paroi postérieure de la cage thoracique.',
        clinicalNote: 'Sa rigidité protège les viscères thoraciques mais limite les mouvements de flexion/extension.'
      },
      {
        name: 'Rachis lombaire (lordose, L1-L5)',
        x: 155,
        y: 280,
        category: 'Segments vertébraux',
        detail:
          'Segment composé de 5 vertèbres massives à corps vertébral réniforme et volumineux supportant l’essentiel du poids corporel.',
        clinicalNote: 'Les étages L4-L5 et L5-S1 subissent les contraintes mécaniques maximales (hernie discale).'
      },
      {
        name: 'Sacrum et Coccyx',
        x: 190,
        y: 360,
        category: 'Segments vertébraux',
        detail:
          'Bloc osseux triangulaire formé par la fusion de 5 vertèbres sacrées et 3-5 pièces coccygiennes articulé avec les os iliaques au niveau des sacro-iliaques.',
        clinicalNote: 'Le promontoire sacré forme l’entrée supérieure du petit bassin obstétrical.'
      },
      {
        name: 'Corps vertébral',
        x: 410,
        y: 140,
        category: 'Unité fonctionnelle vertébrale',
        detail:
          'Cylindre osseux antérieur composé d’os spongieux trabéculaire bordé d’une corticale résistante et des plateaux vertébraux cartilagineux.',
        clinicalNote: 'L’ostéoporose expose aux tassements vertébraux par fragilisation des travées osseuses.'
      },
      {
        name: 'Disque intervertébral',
        x: 410,
        y: 220,
        category: 'Unité fonctionnelle vertébrale',
        detail:
          'Amortisseur fibrocartilagineux constitué d’un anneau fibreux périphérique (annulus fibrosus) retenant un noyau gélatineux hydrophile central (nucleus pulposus).',
        clinicalNote: 'Une rupture de l’annulus permet au nucleus d’exclure une hernie venant comprimer une racine nerveuse.'
      },
      {
        name: 'Canal vertébral et Moelle spinale',
        x: 490,
        y: 200,
        category: 'Structures neurales',
        detail:
          'Canal ostéoligamentaire protecteur formé par la succession des foramens vertébraux, abritant la moelle spinale (jusqu’en L1-L2), le fourreau dural et les racines de la queue de cheval.',
        clinicalNote: 'Un canal lombaire étroit constitutionnel ou arthrosique entraîne une claudication neurogène.'
      }
    ]
  },

  // 9. Nerfs crâniens et Tronc cérébral
  'anat-cranial-nerves': {
    title: 'Émergence des 12 paires de nerfs crâniens sur le tronc cérébral',
    caption:
      'Vue ventrale schématique du tronc cérébral (mésencéphale, pont, bulbe) illustrant l’origine apparente des 12 paires de nerfs crâniens (I à XII).',
    category: 'Neuroanatomie',
    points: [
      {
        name: 'Nerfs I (Olfactif) et II (Optique)',
        x: 320,
        y: 50,
        category: 'Nerfs sensoriels antérieurs',
        detail:
          'Expansions directes du télencéphale et du diencéphale. Le nerf optique converge au chiasma optique avant de former les tractus optiques.',
        clinicalNote: 'Ces deux nerfs sont myélinisés par des oligodendrocytes (sensibles à la sclérose en plaques).'
      },
      {
        name: 'Mésencéphale : Nerfs III et IV',
        x: 320,
        y: 115,
        category: 'Nerfs oculomoteurs',
        detail:
          'Le nerf oculomoteur (III) naît dans l’espace interpédonculaire ; le nerf trochléaire (IV) est le seul nerf à émergence postérieure (croise et innerve le muscle oblique supérieur).',
        clinicalNote: 'Une atteinte du III provoque ptosis, mydriase et strabisme divergent.'
      },
      {
        name: 'Pont : Nerf trijumeau (V)',
        x: 210,
        y: 175,
        category: 'Nerf mixte de la face',
        detail:
          'Émerge de la face antérolatérale du pont avec une volumineuse racine sensitive (V1 ophtalmique, V2 maxillaire, V3 mandibulaire) et une petite racine motrice (muscles masticateurs).',
        clinicalNote: 'La névralgie du trijumeau se traduit par des décharges électriques fulgurantes dans un territoire facial.'
      },
      {
        name: 'Sillon bulbopontique : Nerfs VI, VII et VIII',
        x: 320,
        y: 235,
        category: 'Sillon bulbopontique',
        detail:
          'Du centre vers la périphérie : Nerf abducens (VI - muscle droit latéral), Nerf facial (VII et VII bis - motricité de la mimique et goût des 2/3 antérieurs de langue) et Nerf vestibulocochléaire (VIII - équilibre et audition).',
        clinicalNote: 'Une paralysie faciale périphérique atteint l’hémiface supérieure et inférieure.'
      },
      {
        name: 'Bulbe : Nerfs IX, X et XI (sillon rétro-olivaire)',
        x: 230,
        y: 295,
        category: 'Nerfs mixtes bulbaires',
        detail:
          'Nerf glossopharyngien (IX), Nerf vague (X - principal contingent parasympathique viscéral thorax-abdomen) et Nerf accessoire (XI - SCOM et trapèze).',
        clinicalNote: 'Le nerf vague régule la fréquence cardiaque, la motricité gastrique et innerve le larynx via les nerfs récurrents.'
      },
      {
        name: 'Bulbe : Nerf hypoglosse (XII - sillon pré-olivaire)',
        x: 390,
        y: 315,
        category: 'Nerf moteur de la langue',
        detail:
          'Filets émergeant dans le sillon pré-olivaire entre la pyramide bulbaire et l’olive, assurant l’innervation motrice de tous les muscles de la langue.',
        clinicalNote: 'Une lésion du XII fait dévier la langue protractée vers le côté lésé.'
      }
    ]
  },

  // 10. Gastrulation
  'embryo-weeks-one-three': {
    title: 'Gastrulation : les cellules changent de position',
    caption:
      'Coupe transversale conceptuelle au niveau de la ligne primitive (3ème semaine). Les flèches représentent l’ingression des cellules épiblastiques qui mettent en place l’endoderme définitif puis le mésoderme intraembryonnaire.',
    category: 'Embryologie humaine',
    points: [
      {
        name: 'Épiblaste restant : ectoderme',
        x: 150,
        y: 130,
        category: 'Feuillet embryonnaire',
        detail:
          'Les cellules épiblastiques demeurant à la surface après l’ingression deviennent l’ectoderme de surface et le neuroectoderme (système nerveux, épiderme).',
        clinicalNote: 'L’induction neurale par la chorde transforme l’ectoderme médian en plaque neurale.'
      },
      {
        name: 'Ingression par la ligne primitive',
        x: 320,
        y: 155,
        category: 'Dynamique cellulaire',
        detail:
          'Transition épithélio-mésenchymateuse : les cellules épiblastiques s’invaginent par le sillon primitif pour coloniser les couches profondes.',
        clinicalNote: 'Le nœud primitif de Hensen à l’extrémité crâniale est l’organisateur clé de la symétrie droite-gauche.'
      },
      {
        name: 'Mésoderme intraembryonnaire',
        x: 455,
        y: 235,
        category: 'Feuillet embryonnaire',
        detail:
          'Feuillet intermédiaire se divisant en mésoderme paraxial (somites), intermédiaire (appareil urogénital) et latéral (somatopleure et splanchnopleure).',
        clinicalNote: 'À l’origine des muscles, du squelette, du derme, des vaisseaux et du rein.'
      },
      {
        name: 'Endoderme définitif',
        x: 185,
        y: 295,
        category: 'Feuillet embryonnaire',
        detail:
          'Première vague cellulaire ingrédiente qui refoule et remplace totalement l’hypoblaste initial au plafond de la vésicule vitelline.',
        clinicalNote: 'Donnera l’épithélium de tout le tractus digestif, du foie, du pancréas et de l’arbre respiratoire.'
      }
    ]
  },

  // 11. Immunité adaptative
  'immuno-adaptive': {
    title: 'Reconnaître, activer, puis produire des effecteurs',
    caption:
      'Interactions cellulaires de la réponse immunitaire adaptative. À gauche : présentation du peptide antigénique sur CMH II à un lymphocyte T CD4 naïf. À droite : reconnaissance de l’antigène natif par le BCR du lymphocyte B, coopération T-B et différenciation en plasmocyte sécréteur.',
    category: 'Immunologie fondamentale',
    points: [
      {
        name: 'Cellule présentatrice d’antigène',
        x: 100,
        y: 155,
        category: 'Phase d’initiation',
        detail:
          'Cellule dendritique mature exprimant fortement le CMH II, les molécules de co-stimulation (CD80/CD86) et sécrétant des cytokines polarisantes.',
        clinicalNote: 'Fait le pont indispensable entre immunité innée et immunité adaptative.'
      },
      {
        name: 'Peptide-CMH II et TCR',
        x: 230,
        y: 185,
        category: 'Synapse immunologique',
        detail:
          'Le récepteur T (TCR) reconnaît spécifiquement le complexe peptide-CMH II, stabilisé par le corécepteur CD4.',
        clinicalNote: 'Le signal 1 antigénique sans signal 2 de co-stimulation (CD28) conduit à l’anergie lymphocytaire.'
      },
      {
        name: 'Lymphocyte T CD4',
        x: 320,
        y: 155,
        category: 'Cellule régulatrice',
        detail:
          'Lymphocyte auxiliaire (T helper) activé qui se polarise (Th1, Th2, Th17, Tfh) pour coordonner la réponse immunitaire globale.',
        clinicalNote: 'Les lymphocytes Tfh (follicular helper) sont les partenaires exclusifs de l’activation B dans les centres germinatifs.'
      },
      {
        name: 'Lymphocyte B et BCR',
        x: 520,
        y: 115,
        category: 'Immunité humorale',
        detail:
          'Reconnaît l’antigène sous sa conformation spatiale native via ses immunoglobulines de membrane (BCR : IgM/IgD).',
        clinicalNote: 'Reçoit le signal d’aide T dépendant via le contact CD40L-CD40 et les interleukines (IL-4, IL-21).'
      },
      {
        name: 'Plasmocyte sécréteur',
        x: 505,
        y: 320,
        category: 'Cellule effectrice',
        detail:
          'Stade terminal de différenciation B spécialisé dans la production massive et la sécrétion d’anticorps solubles (plusieurs milliers d’Ig par seconde).',
        clinicalNote: 'Ne possède plus de BCR membranaire et ne se divise plus.'
      }
    ]
  }
}
