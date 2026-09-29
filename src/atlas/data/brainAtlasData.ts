import type { AtlasDefinition } from '../types'

export const brainAtlasData: AtlasDefinition = {
  id: 'brain',
  title: 'Neuroanatomie & Cerveau',
  subtitle: 'Atlas interactif haute fidélité du système nerveux central',
  category: 'Neurologie & Neurosciences',
  description: 'Exploration complète de la morphologie cérébrale, des coupes frontales de Charcot, des noyaux gris centraux, des 12 paires de nerfs crâniens, de la vascularisation du polygone de Willis et des grands faisceaux fonctionnels.',
  iconName: 'Brain',
  defaultViewId: 'lateral',
  modes: ['explore', 'learn', 'pathway', 'clinical', 'test', 'neuro'],
  views: [
    {
      id: 'lateral',
      name: 'Vue latérale externe',
      shortName: 'Vue latérale',
      description: 'Morphologie des hémisphères cérébraux, lobes, sillons principaux et aires corticales fonctionnelles de Brodmann.',
      structures: [
        {
          id: 'frontal_lobe',
          name: 'Lobe frontal',
          latinName: 'Lobus frontalis',
          category: 'Cortex cérébral',
          viewId: 'lateral',
          coordinates: { x: 30, y: 35 },
          svgSelector: '#brain-frontal-lobe',
          description: 'Plus grand lobe cérébral situé en avant du sillon central (Rolando). Il abrite le cortex moteur primaire, le cortex préfrontal (fonctions exécutives) et l’aire motrice du langage (Broca).',
          location: 'Fosse crânienne antérieure et moyenne, en avant du sillon central.',
          anatomicalRelations: 'Séparé du lobe pariétal par le sillon central et du lobe temporal par le sillon latéral (Sylvius).',
          vascularization: 'Artère cérébrale antérieure (face médiale) et Artère cérébrale moyenne (face latérale).',
          function: 'Planification motrice, motricité volontaire, prise de décision, personnalité, jugement et production du langage articulé.',
          clinicalPearl: 'Syndrome frontal : désinhibition, apathie, moria, grasping reflex, anosognosie et persévérations motrices.',
          examHighYield: 'Aire motrice primaire (aire 4 de Brodmann) située dans le gyrus précentral, responsable de l’homonculus moteur.',
          relatedCourseId: 'physio-neuro',
          relatedCourseTitle: 'Physiologie du système nerveux',
          relatedStructures: ['precentral_gyrus', 'broca_area', 'temporal_lobe']
        },
        {
          id: 'parietal_lobe',
          name: 'Lobe pariétal',
          latinName: 'Lobus parietalis',
          category: 'Cortex cérébral',
          viewId: 'lateral',
          coordinates: { x: 62, y: 28 },
          svgSelector: '#brain-parietal-lobe',
          description: 'Lobe sensoriel situé en arrière du sillon central et au-dessus du sillon latéral. Il héberge le cortex somatosensoriel primaire (S1).',
          location: 'Partie supéro-postérieure de l’hémisphère cérébral.',
          anatomicalRelations: 'Délimité en avant par le sillon central, en bas par le sillon latéral, en arrière par le sillon pariéto-occipital.',
          vascularization: 'Artère cérébrale moyenne (face latérale) et Artère cérébrale antérieure (partie supérieure médiale).',
          function: 'Intégration somesthésique, schéma corporel, stéréognosie, praxies et repérage spatial visuo-moteur.',
          clinicalPearl: 'Lésion de l’hémisphère mineur (droit) : héminégligence gauche et asomatognosie. Syndrome de Gerstmann si atteinte du gyrus angulaire gauche (acalculie, agraphie, agnosie digitale, désorientation droite-gauche).',
          examHighYield: 'Gyrus postcentral = aires 3, 1, 2 de Brodmann (homonculus sensitif de Penfield).',
          relatedCourseId: 'physio-neuro',
          relatedCourseTitle: 'Physiologie du système nerveux'
        },
        {
          id: 'temporal_lobe',
          name: 'Lobe temporal',
          latinName: 'Lobus temporalis',
          category: 'Cortex cérébral',
          viewId: 'lateral',
          coordinates: { x: 45, y: 62 },
          svgSelector: '#brain-temporal-lobe',
          description: 'Lobe inférieur séparé des lobes frontal et pariétal par la scissure de Sylvius. Contient le cortex auditif primaire et l’aire de Wernicke (compréhension du langage).',
          location: 'Fosse crânienne moyenne.',
          vascularization: 'Artère cérébrale moyenne (gyri T1, T2) et artère cérébrale postérieure (face inférieure T3, T4, gyrus parahippocampique).',
          function: 'Audition, compréhension du langage oral (Wernicke), mémoire sémantique et épisodique (via hippocampe médial), émotions.',
          clinicalPearl: 'Aphasie de Wernicke : fluence conservée, jargonaphasie, anosognosie et trouble massif de la compréhension.',
          examHighYield: 'Crises d’épilepsie temporale mésiale avec aura épigastrique, état de déjà-vu et hallucinations gustatives/olfactives.',
          relatedCourseId: 'physio-neuro',
          relatedCourseTitle: 'Physiologie du système nerveux'
        },
        {
          id: 'occipital_lobe',
          name: 'Lobe occipital',
          latinName: 'Lobus occipitalis',
          category: 'Cortex cérébral',
          viewId: 'lateral',
          coordinates: { x: 84, y: 52 },
          svgSelector: '#brain-occipital-lobe',
          description: 'Pôle postérieur du cerveau dédié au traitement visuel. Contient le cortex visuel primaire V1 (aire 17) autour de la scissure calcarine.',
          location: 'Fosse crânienne postérieure, au-dessus de la tente du cervelet.',
          vascularization: 'Artère cérébrale postérieure (ACP).',
          function: 'Perception et intégration des stimuli visuels (formes, couleurs, mouvements, reconnaissance des visages via voie ventrale).',
          clinicalPearl: 'Infarctus de l’ACP : Hémianopsie latérale homonyme (HLH) controlatérale avec épargne maculaire relative.',
          examHighYield: 'La fovéa (vision centrale) projette sur la partie la plus postérieure du pôle occipital.',
          relatedCourseId: 'physio-neuro',
          relatedCourseTitle: 'Physiologie du système nerveux'
        },
        {
          id: 'cerebellum',
          name: 'Cervelet',
          latinName: 'Cerebellum',
          category: 'Cervelet & Fosse postérieure',
          viewId: 'lateral',
          coordinates: { x: 74, y: 78 },
          svgSelector: '#brain-cerebellum',
          description: 'Structure située dans la fosse crânienne postérieure sous la tente du cervelet, formée de deux hémisphères réunis par le vermis.',
          location: 'Fosse crânienne postérieure, en arrière du tronc cérébral.',
          vascularization: 'Artères cérébelleuses PICA, AICA et SCA (branche du tronc basilaire).',
          function: 'Coordination motrice, régulation du tonus postural, synchronisation des mouvements volontaires et apprentissage moteur.',
          clinicalPearl: 'Syndrome cérébelleux : ataxie statique et cinétique, dysmétrie (épreuve doigt-nez), adiadococinésie, tremblement d’action intentionnel et nystagmus.',
          examHighYield: 'Le cervelet contrôle l’hémicorps HOMOLATÉRAL (contrairement au cortex cérébral controlatéral).',
          relatedCourseId: 'physio-neuro',
          relatedCourseTitle: 'Physiologie du système nerveux'
        },
        {
          id: 'brainstem',
          name: 'Tronc cérébral',
          latinName: 'Truncus encephalicus',
          category: 'Tronc cérébral',
          viewId: 'lateral',
          coordinates: { x: 52, y: 82 },
          svgSelector: '#brain-brainstem',
          description: 'Segment reliant les hémisphères cérébraux à la moelle spinale, constitué du mésencéphale, du pont et de la moelle allongée (bulbe).',
          location: 'Partie centrale de la fosse crânienne postérieure.',
          vascularization: 'Artères vertébrales et tronc basilaire (système vertébro-basilaire).',
          function: 'Centres vitaux respiratoires et cardiovasculaires, noyaux des nerfs crâniens III à XII, réticulée activatrice ascendante (vigilance).',
          clinicalPearl: 'Syndromes alternes du tronc : déficit d’un nerf crânien homolatéral associé à un déficit sensitif/moteur controlatéral.',
          examHighYield: 'La décussation des pyramides à la jonction bulbo-médullaire explique le contrôle moteur croisé.'
        }
      ]
    },
    {
      id: 'sagittal',
      name: 'Vue sagittale médiane',
      shortName: 'Vue sagittale',
      description: 'Coupe hémisphérique médiane mettant en valeur le système limbique, le diencéphale, le corps calleux et les cavités ventriculaires.',
      structures: [
        {
          id: 'corpus_callosum',
          name: 'Corps calleux',
          latinName: 'Corpus callosum',
          category: 'Commissures interhémisphériques',
          viewId: 'sagittal',
          coordinates: { x: 48, y: 35 },
          description: 'Plus volumineuse commissure interhémisphérique de substance blanche reliant les néocortex gauche et droit (bec, genou, corps et splénium).',
          function: 'Transmission et coordination des informations cognitives, sensorielles et motrices entre les deux hémisphères.',
          clinicalPearl: 'Syndrome de déconnexion calleuse (split-brain) : alexie sans agraphie gauche, apraxie idéomotrice gauche.',
          examHighYield: 'Le splénium du corps calleux est vascularisé par les branches de l’artère cérébrale postérieure.'
        },
        {
          id: 'thalamus',
          name: 'Thalamus',
          latinName: 'Thalamus',
          category: 'Diencéphale',
          viewId: 'sagittal',
          coordinates: { x: 50, y: 48 },
          description: 'Masse paire d’ovocytes de substance grise du diencéphale entourant le 3e ventricule.',
          function: 'Relais synaptique majeur de toutes les voies sensitives et sensorielles (sauf l’olfaction) vers le cortex cérébral.',
          clinicalPearl: 'Syndrome thalamique de Déjerine-Roussy : anesthésie controlatérale suivie d’hyperpathie et de douleurs thalamiques intraitables.',
          examHighYield: 'Le corps genouillé latéral (CGL) est le relais thalamique de la vision ; le corps genouillé médial (CGM) relaie l’audition.'
        },
        {
          id: 'hypothalamus',
          name: 'Hypothalamus',
          latinName: 'Hypothalamus',
          category: 'Diencéphale & Neuroendocrinologie',
          viewId: 'sagittal',
          coordinates: { x: 44, y: 55 },
          description: 'Structure neuroendocrinienne située sous le thalamus formant le plancher du 3e ventricule, reliée à l’hypophyse par la tige pituitaire.',
          function: 'Régulation de l’homéostasie : thermorégulation, soif, faim, rythmes circadiens (noyau suprachiasmatique) et axe hypophysaire.',
          clinicalPearl: 'Diabète insipide central par défaut de sécrétion d’ADH (vasopressine) par les noyaux supra-optique et paraventriculaire.',
          examHighYield: 'Contrôle à la fois le système nerveux autonome (SNA) et le système endocrinien périphérique.'
        },
        {
          id: 'fourth_ventricle',
          name: 'Quatrième ventricule (V4)',
          latinName: 'Ventriculus quartus',
          category: 'Système ventriculaire',
          viewId: 'sagittal',
          coordinates: { x: 62, y: 72 },
          description: 'Cavité losangique située entre le pont/bulbe en avant et le cervelet en arrière, contenant le liquide cérébro-spinal (LCR).',
          function: 'Drainage du LCR venant de l’aqueduc de Sylvius vers l’espace sous-arachnoïdien via les foramens de Luschka et Magendie.',
          clinicalPearl: 'Tumeurs de la fosse postérieure (médulloblastome) comprimant le V4 → Hydrocéphalie obstructive aiguë avec hypertension intracrânienne (HTIC).',
          examHighYield: 'Les foramens latéraux de Luschka et le foramen médian de Magendie permettent la sortie du LCR.'
        }
      ]
    },
    {
      id: 'coronal_charcot',
      name: 'Coupe frontale de Charcot',
      shortName: 'Coupe Charcot',
      description: 'Coupe coronale de référence passant par les corps mamillaires, révélant les noyaux gris centraux, la capsule interne et les ventricules latéraux.',
      structures: [
        {
          id: 'caudate_nucleus',
          name: 'Noyau caudé',
          latinName: 'Nucleus caudatus',
          category: 'Noyaux gris centraux (Ganglions de la base)',
          viewId: 'coronal_charcot',
          coordinates: { x: 38, y: 40 },
          description: 'Structure arquée en forme de virgule longeant la paroi externe des ventricules latéraux (tête, corps et queue). Fait partie du striatum.',
          function: 'Planification cognitive des séquences motrices, fonctions exécutives et motivation.',
          clinicalPearl: 'Atrophie de la tête du noyau caudé dans la Chorée de Huntington (transmission autosomique dominante avec répétitions CAG).',
          examHighYield: 'Le striatum dorsal est constitué de l’association du noyau caudé et du putamen.'
        },
        {
          id: 'internal_capsule',
          name: 'Capsule interne',
          latinName: 'Capsula interna',
          category: 'Substance blanche sous-corticale',
          viewId: 'coronal_charcot',
          coordinates: { x: 34, y: 52 },
          description: 'Épais faisceau de fibres myélinisées en forme de V ouvert vers l’extérieur, séparant le thalamus et le noyau caudé du noyau lenticulaire.',
          function: 'Passage du faisceau cortico-spinal (voie pyramidale motrice) dans son bras postérieur et des radiations thalamo-corticales.',
          clinicalPearl: 'Infarctus lacunaire capsulaire pur : hémiplégie motrice pure controlatérale proportionnelle (face, membre supérieur, membre inférieur).',
          examHighYield: 'Vascularisée principalement par les artères lenticulo-striées (branches perforantes de l’ACM).'
        },
        {
          id: 'putamen_globus',
          name: 'Noyau lenticulaire (Putamen & Globus Pallidus)',
          latinName: 'Nucleus lentiformis',
          category: 'Noyaux gris centraux',
          viewId: 'coronal_charcot',
          coordinates: { x: 26, y: 54 },
          description: 'Masse biconvexe composée latéralement du Putamen et médialement du Globus Pallidus (interne GPi et externe GPe).',
          function: 'Boucle cortico-striato-pallido-thalamo-corticale : modulation et fluidité du mouvement volontaire.',
          clinicalPearl: 'Maladie de Parkinson : dégénérescence des neurones dopaminergiques de la substance noire (locus niger) projetant sur le striatum.',
          examHighYield: 'GPi est la principale voie de sortie inhibitrice (GABAergique) des ganglions de la base vers le thalamus.'
        },
        {
          id: 'hippocampus',
          name: 'Hippocampe',
          latinName: 'Hippocampus',
          category: 'Système limbique',
          viewId: 'coronal_charcot',
          coordinates: { x: 35, y: 76 },
          description: 'Structure bilatérale enroulée dans la corne temporale du ventricule latéral, essentielle à la consolidation mnésique.',
          function: 'Mémoire déclarative épisodique à long terme et navigation spatiale.',
          clinicalPearl: 'Atrophie hippocampique bilatérale précoce mesurée au score de Scheltens dans la maladie d’Alzheimer.',
          examHighYield: 'Circuit de Papez : Hippocampe → Fornix → Corps mamillaire → Tractus mamillo-thalamique → Thalamus antérieur → Cortex cingulaire.'
        }
      ]
    },
    {
      id: 'base_cranial',
      name: 'Base du crâne & Nerfs Crâniens (I à XII)',
      shortName: 'Base du crâne',
      description: 'Vue inférieure de la base du crâne et émergence des 12 paires de nerfs crâniens du tronc cérébral.',
      structures: [
        {
          id: 'cn_2_optic',
          name: 'Nerf Optique (II) & Chiasma',
          latinName: 'Nervus opticus (NC II)',
          category: 'Nerfs sensoriels',
          viewId: 'base_cranial',
          coordinates: { x: 50, y: 38 },
          description: 'Nerf sensoriel issu des cellules ganglionnaires rétiniennes qui s’entrecroisent partiellement au chiasma optique.',
          function: 'Transmission de l’information visuelle et voie afférente du réflexe photomoteur.',
          clinicalPearl: 'Adénome hypophysaire comprimant le chiasma optique par en dessous → Hémianopsie bitemporale progressive.',
          examHighYield: 'Les fibres nasales décussent au chiasma optique (champ visuel temporal), les fibres temporales restent homolatérales.'
        },
        {
          id: 'cn_5_trigeminal',
          name: 'Nerf Trijumeau (V)',
          latinName: 'Nervus trigeminus (NC V)',
          category: 'Nerfs mixtes',
          viewId: 'base_cranial',
          coordinates: { x: 32, y: 55 },
          description: 'Plus volumineux nerf crânien, émergeant de la face antéro-latérale du pont avec 3 branches : V1 (ophtalmique), V2 (maxillaire), V3 (mandibulaire).',
          function: 'Sensibilité cutanée de la face, des 2/3 antérieurs de la langue, et motricité des muscles masticateurs (V3).',
          clinicalPearl: 'Névralgie essentielle du trijumeau : décharges électriques paroxystiques intenses déclenchées par une zone gâchette.',
          examHighYield: 'Afférence du réflexe cornéen (V1) ; la réponse motrice efférente est portée par le nerf facial (VII).'
        },
        {
          id: 'cn_7_facial',
          name: 'Nerf Facial (VII)',
          latinName: 'Nervus facialis (NC VII)',
          category: 'Nerfs mixtes',
          viewId: 'base_cranial',
          coordinates: { x: 34, y: 68 },
          description: 'Émerge du sillon bulbo-pontique dans l’angle ponto-cérébelleux avec le nerf VIII.',
          function: 'Motricité des muscles de l’expression faciale, goût des 2/3 antérieurs de la langue (corde du tympan), sécrétions lacrymales et salivaires.',
          clinicalPearl: 'Paralysie faciale périphérique (a frigore) : atteinte des territoires supérieur ET inférieur de la face (signe de Charles Bell), contrairement à l’atteinte centrale respectant le front.',
          examHighYield: 'Traverse le canal facial dans le rocher puis émerge par le foramen stylomastoïdien.'
        },
        {
          id: 'cn_10_vagus',
          name: 'Nerf Vague / Pneumogastrique (X)',
          latinName: 'Nervus vagus (NC X)',
          category: 'Nerfs autonomes & mixtes',
          viewId: 'base_cranial',
          coordinates: { x: 38, y: 82 },
          description: 'Principal nerf du système parasympathique émergeant du sillon rétro-olivaire de la moelle allongée.',
          function: 'Innervation parasympathique viscérale cardio-thoraco-abdominale, motricité pharyngo-laryngée (déglutition, phonation).',
          clinicalPearl: 'Lésion du nerf récurrent (branche du X) lors d’une chirurgie thyroïdienne → Dysphonie bitonale par paralysie de corde vocale.',
          examHighYield: 'Traverse la base du crâne par le foramen jugulaire (trou déchiré postérieur) avec les nerfs IX et XI.'
        }
      ]
    },
    {
      id: 'vascular_willis',
      name: 'Polygone de Willis & Vascularisation',
      shortName: 'Polygone de Willis',
      description: 'Anastomose artérielle à la base du cerveau unissant le système carotidien antérieur et le système vertébro-basilaire postérieur.',
      structures: [
        {
          id: 'mca_artery',
          name: 'Artère Cérébrale Moyenne (Sylvienne)',
          latinName: 'Arteria cerebri media',
          category: 'Vascularisation artérielle',
          viewId: 'vascular_willis',
          coordinates: { x: 28, y: 44 },
          description: 'Branche de division externe de l’artère carotide interne, cheminant dans le sillon latéral (scissure de Sylvius).',
          function: 'Irrigation de la majeure partie de la face convexe externe de l’hémisphère (lobes frontal, pariétal et temporal supérieur).',
          clinicalPearl: 'AVC ischémique sylvien malin : hémiplégie et hémianesthésie massives controlatérales à prédominance brachio-faciale, aphasie (si hémisphère dominant).',
          examHighYield: 'Territoire superficiel (cortex) + territoire profond (capsule interne et striatum via les artères lenticulo-striées).'
        },
        {
          id: 'aca_artery',
          name: 'Artère Cérébrale Antérieure (ACA)',
          latinName: 'Arteria cerebri anterior',
          category: 'Vascularisation artérielle',
          viewId: 'vascular_willis',
          coordinates: { x: 48, y: 22 },
          description: 'Branche médiale de la carotide interne, contournant le genou du corps calleux.',
          function: 'Irrigation de la face médiale des lobes frontal et pariétal.',
          clinicalPearl: 'AVC ischémique de l’ACA : déficit moteur et sensitif à prédominance crurale (membre inférieur) + syndrome frontal / akinésie.',
          examHighYield: 'Les deux ACA sont réunies par l’artère communicante antérieure (AComA), site le plus fréquent d’anévrisme intracrânien.'
        },
        {
          id: 'basilar_artery',
          name: 'Tronc Basilaire',
          latinName: 'Arteria basilaris',
          category: 'Système vertébro-basilaire',
          viewId: 'vascular_willis',
          coordinates: { x: 50, y: 72 },
          description: 'Tronc artériel impair né de la convergence des deux artères vertébrales sur la face ventrale du pont.',
          function: 'Irrigation du tronc cérébral, du cervelet et division terminale en artères cérébrales postérieures (ACP).',
          clinicalPearl: 'Thrombose du tronc basilaire : Locked-in syndrome (tétraplégie + diplégie faciale avec motricité oculaire verticale préservée) ou coma foudroyant.',
          examHighYield: 'Donne les artères cérébelleuses antéro-inférieure (AICA) et supérieure (SCA) avant sa bifurcation en ACP.'
        }
      ]
    }
  ],
  pathways: [
    {
      id: 'corticospinal_tract',
      name: 'Voie cortico-spinale motrice (Pyramidale)',
      shortDescription: 'Circuit de la commande motrice volontaire depuis le cortex moteur M1 jusqu’au motoneurone spinal.',
      category: 'Système moteur',
      steps: [
        {
          index: 1,
          title: 'Cortex moteur primaire (M1)',
          structureId: 'frontal_lobe',
          viewId: 'lateral',
          description: 'Génération de l’influx moteur volontaire au niveau des cellules pyramidales géantes de Betz (gyrus précentral).',
          physiologicalRole: 'Déclenchement et encodage de la force motrice'
        },
        {
          index: 2,
          title: 'Corona radiata & Bras postérieur de la capsule interne',
          structureId: 'internal_capsule',
          viewId: 'coronal_charcot',
          description: 'Convergence et somatotopie étroite des axones myélinisés descendant dans le bras postérieur.',
          clinicalNote: 'Une lésion millimétrique entraîne ici une hémiplégie motrice totale et pure.'
        },
        {
          index: 3,
          title: 'Pédoncules cérébraux du mésencéphale',
          structureId: 'brainstem',
          viewId: 'lateral',
          description: 'Passage dans les 3/5 moyens du pied du pédoncule cérébral.'
        },
        {
          index: 4,
          title: 'Décussation pyramidale (Bulbe inférieur)',
          structureId: 'brainstem',
          viewId: 'lateral',
          description: '85 % à 90 % des fibres croisent la ligne médiane pour former le tractus cortico-spinal latéral dans le cordon spinal controlatéral.',
          clinicalNote: 'Explique que le cortex gauche commande l’hémicorps droit.'
        }
      ]
    },
    {
      id: 'visual_pathway',
      name: 'Voie visuelle primaire',
      shortDescription: 'Trajet du signal rétinien jusqu’au cortex visuel calcarin via le chiasma optique et le thalamus.',
      category: 'Système sensoriel',
      steps: [
        {
          index: 1,
          title: 'Nerf optique & Rétine',
          structureId: 'cn_2_optic',
          viewId: 'base_cranial',
          description: 'Phototransduction rétinienne et axones des cellules ganglionnaires formant le nerf optique.'
        },
        {
          index: 2,
          title: 'Chiasma optique',
          structureId: 'cn_2_optic',
          viewId: 'base_cranial',
          description: 'Décussation des fibres de l’hémirétine nasale (champ visuel temporal) ; trajet direct des fibres temporales.',
          clinicalNote: 'Lésion chiasmatique → Hémianopsie bitemporale.'
        },
        {
          index: 3,
          title: 'Corps genouillé latéral (Thalamus)',
          structureId: 'thalamus',
          viewId: 'sagittal',
          description: 'Relais synaptique thalamique à 6 couches organisées selon la provenance oculaire et magnocellulaire/parvocellulaire.'
        },
        {
          index: 4,
          title: 'Radiations optiques de Gratiolet vers V1',
          structureId: 'occipital_lobe',
          viewId: 'lateral',
          description: 'Boucle de Meyer temporale et radiations pariétales projetant sur les berges de la scissure calcarine (aire 17).',
          clinicalNote: 'Lésion calcarine → Hémianopsie latérale homonyme (HLH).'
        }
      ]
    },
    {
      id: 'csf_circulation',
      name: 'Circulation du Liquide Cérébro-Spinal (LCR)',
      shortDescription: 'Production dans les plexus choroïdes, flux ventriculaire et résorption dans les granulations arachnoïdiennes.',
      category: 'Dynamique des fluides',
      steps: [
        {
          index: 1,
          title: 'Plexus choroïdes ventriculaires',
          structureId: 'corpus_callosum',
          viewId: 'sagittal',
          description: 'Sécrétion active de 500 mL/jour de LCR clair comme de l’eau de roche.'
        },
        {
          index: 2,
          title: 'Troisième ventricule & Aqueduc de Sylvius',
          structureId: 'thalamus',
          viewId: 'sagittal',
          description: 'Passage par les foramens interventriculaires de Monro vers le 3e ventricule puis l’aqueduc mésencéphalique.'
        },
        {
          index: 3,
          title: 'Quatrième ventricule & Foramens de sortie',
          structureId: 'fourth_ventricle',
          viewId: 'sagittal',
          description: 'Écoulement vers les citernes sous-arachnoïdiennes par les foramens de Luschka et de Magendie.'
        },
        {
          index: 4,
          title: 'Résorption veineuse (Granulations de Pacchioni)',
          structureId: 'parietal_lobe',
          viewId: 'lateral',
          description: 'Résorption passive unidirectionnelle du LCR vers le sinus sagittal supérieur sous l’effet du gradient de pression.'
        }
      ]
    }
  ],
  clinicalScenarios: [
    {
      id: 'mca_stroke',
      title: 'AVC Ischémique Sylvien (ACM)',
      subtitle: 'Occlusion proximale de l’artère cérébrale moyenne gauche',
      badge: 'Urgence Neuro-Vasculaire',
      severity: 'critical',
      vignette: 'Patient de 68 ans présentant brutalement à 14h00 une hémiplégie droite proportionnelle, une déviation conjuguée de la tête et des yeux vers la gauche et une impossibilité totale de s’exprimer (aphasie globale). Score NIHSS = 18.',
      affectedStructureIds: ['mca_artery', 'frontal_lobe', 'temporal_lobe', 'internal_capsule'],
      primaryViewId: 'vascular_willis',
      pathophysiology: 'Thrombose ou embolie de l’artère sylvienne M1 entraînant une hypoperfusion critique du cortex fronto-temporo-pariétal gauche et de la capsule interne.',
      clinicalSigns: [
        'Hémiplégie brachio-faciale droite',
        'Hémianesthésie droite',
        'Aphasie globale (Broca + Wernicke)',
        'Hémianopsie latérale homonyme droite',
        'Déviation de la tête et du regard vers la lésion (vers la gauche)'
      ],
      ecgOrImagingFindings: 'Angio-IRM cérébrale : occlusion M1 gauche avec mismatch diffusion/perfusion (pénombre ischémique traitable).',
      managementKey: 'Thrombolyse intraveineuse par rt-PA dans les 4h30 et/ou thrombectomie mécanique endovasculaire jusqu’à 6h (voire 24h selon imagerie de perfusion).',
      quizQuestion: {
        question: 'Quelle structure anatomique responsable de l’aphasie motrice est compromise lors d’une ischémie de la branche supérieure de l’ACM gauche ?',
        options: [
          'Aire de Broca (Gyrus frontal inférieur gauche)',
          'Aire de Wernicke (Gyrus temporal supérieur gauche)',
          'Gyrus postcentral droit',
          'Noyau caudé droit'
        ],
        correctIndex: 0,
        explanation: 'L’aire de Broca (aires 44 et 45 de Brodmann) est située dans le gyrus frontal inférieur de l’hémisphère dominant et est irriguée par les branches antéro-supérieures de l’ACM.'
      }
    },
    {
      id: 'nph_hydrocephalus',
      title: 'Hydrocéphalie à Pression Normale (HPN)',
      subtitle: 'Trouble de résorption du LCR chez le sujet âgé (Syndrome d’Adams et Hakim)',
      badge: 'Neuro-Gériatrie',
      severity: 'medium',
      vignette: 'Patiente de 74 ans consultant pour des chutes répétées avec marche à petits pas magnétiques (aimantée au sol), des fuites urinaires involontaires et un ralentissement cognitif progressif.',
      affectedStructureIds: ['fourth_ventricle', 'corpus_callosum'],
      primaryViewId: 'sagittal',
      pathophysiology: 'Dilatation quadriventriculaire sans obstacle visible par diminution de la compliance arachnoïdienne et de la résorption du LCR, étirant les fibres fronto-sous-corticales périventriculaires.',
      clinicalSigns: [
        'Triade d’Adams et Hakim : Troubles de la marche (ataxie frontale)',
        'Incontinence urinaire par impériosité',
        'Démence sous-cortico-frontale (ralentissement idéo-moteur)'
      ],
      ecgOrImagingFindings: 'IRM encéphalique : dilatation ventriculaire disproportionnée par rapport aux sillons corticaux avec indice d’Evans > 0.30.',
      managementKey: 'Test de ponction lombaire soustractive (40 mL) avec évaluation motrice avant/après, puis dérivation ventriculo-péritonéale (DVP) si test positif.',
      quizQuestion: {
        question: 'Quel signe de la triade d’Adams et Hakim est généralement le plus précocement amélioré après une dérivation ventriculo-péritonéale ?',
        options: [
          'Les troubles de la marche et de l’équilibre',
          'La mémoire épisodique',
          'L’anosmie',
          'Le réflexe cornéen'
        ],
        correctIndex: 0,
        explanation: 'La marche est le premier symptôme à s’améliorer de façon spectaculaire après la ponction évacuatrice ou la pose d’une dérivation.'
      }
    }
  ],
  neuroDomains: [
    {
      id: 'motor',
      name: 'Fonction Motrice & Posture',
      icon: 'Activity',
      description: 'Organisation hiérarchique de l’action motrice : planification préfrontale, commande M1, modulation des ganglions de la base et coordination cérébelleuse.',
      associatedStructureIds: ['frontal_lobe', 'internal_capsule', 'cerebellum', 'putamen_globus'],
      primaryViewId: 'lateral',
      circuits: [
        {
          name: 'Boucle cortico-striatale',
          mechanism: 'Modulation dopaminergique de l’initiation motrice par le striatum et le globus pallidus.',
          pathologies: 'Syndrome parkinsonien (akinésie), chorées, dystonies.'
        },
        {
          name: 'Voie cortico-cérébello-corticale',
          mechanism: 'Contrôle en temps réel et correction des erreurs de trajectoire par le néocervelet.',
          pathologies: 'Ataxie cinétique, dysmétrie, tremblement intentionnel.'
        }
      ]
    },
    {
      id: 'language',
      name: 'Langage & Communication',
      icon: 'MessageSquare',
      description: 'Réseau pérysylvien de l’hémisphère dominant (gauche chez 95 % des droitiers) reliant la compréhension auditive à l’articulation motrice.',
      associatedStructureIds: ['frontal_lobe', 'temporal_lobe'],
      primaryViewId: 'lateral',
      circuits: [
        {
          name: 'Faisceau arqué',
          mechanism: 'Tractus de substance blanche reliant l’aire de Wernicke (pariéto-temporale) à l’aire de Broca (frontale).',
          pathologies: 'Aphasie de conduction (répétition impossible, compréhension et fluence préservées).'
        }
      ]
    },
    {
      id: 'memory',
      name: 'Mémoire & Émotions (Limbique)',
      icon: 'Bookmark',
      description: 'Architecture hippocampo-amygdalienne dédiée à l’encodage mnésique et à la coloration affective des expériences.',
      associatedStructureIds: ['hippocampus', 'thalamus'],
      primaryViewId: 'coronal_charcot',
      circuits: [
        {
          name: 'Circuit de Papez',
          mechanism: 'Boucle de consolidation reliant hippocampe, fornix, corps mamillaires et thalamus antérieur.',
          pathologies: 'Amnésie antérograde de Korsakoff, maladie d’Alzheimer.'
        }
      ]
    },
    {
      id: 'vision',
      name: 'Vision & Perception Spatiale',
      icon: 'Eye',
      description: 'Du récepteur rétinien au cortex strié V1 et aux voies visuelles d’intégration dorsale (« Où ? ») et ventrale (« Quoi ? »).',
      associatedStructureIds: ['cn_2_optic', 'thalamus', 'occipital_lobe', 'parietal_lobe'],
      primaryViewId: 'lateral',
      circuits: [
        {
          name: 'Voie ventrale occipito-temporale',
          mechanism: 'Reconnaissance des visages et des formes complexes.',
          pathologies: 'Prosopagnosie, agnosie visuelle.'
        }
      ]
    }
  ],
  quizQuestions: [
    {
      id: 'brain_q1',
      type: 'identify',
      viewId: 'lateral',
      targetStructureId: 'frontal_lobe',
      prompt: 'Identifiez le lobe cérébral hébergeant le cortex moteur primaire et l’aire de Broca.',
      explanation: 'Le lobe frontal est situé en avant du sillon central (Rolando) et contrôle la motricité volontaire ainsi que les fonctions exécutives.',
      hint: 'Cliquez sur la région antérieure la plus vaste de l’hémisphère.'
    },
    {
      id: 'brain_q2',
      type: 'identify',
      viewId: 'coronal_charcot',
      targetStructureId: 'internal_capsule',
      prompt: 'Sur cette coupe de Charcot, repérez le bras postérieur de la capsule interne.',
      explanation: 'La capsule interne est le carrefour de substance blanche où transite le faisceau cortico-spinal entre le thalamus et le noyau lenticulaire.',
      hint: 'Zone blanche biconvexe en V située entre le thalamus et le putamen.'
    },
    {
      id: 'brain_q3',
      type: 'mcq',
      viewId: 'vascular_willis',
      prompt: 'Quelle artère réunit les deux artères cérébrales antérieures au sommet du polygone de Willis ?',
      options: [
        'Artère communicante antérieure',
        'Artère communicante postérieure',
        'Artère basilaire',
        'Artère cérébelleuse supérieure'
      ],
      correctOptionIndex: 0,
      explanation: 'L’artère communicante antérieure (AComA) est un court segment transversal reliant les deux artères cérébrales antérieures (A1).'
    },
    {
      id: 'brain_q4',
      type: 'mcq',
      viewId: 'lateral',
      prompt: 'Quel signe clinique caractérise une atteinte hémisphérique cérébelleuse droite ?',
      options: [
        'Ataxie et dysmétrie de l’hémicorps droit',
        'Hémiplégie motrice gauche',
        'Aphasie de Broca',
        'Hémianopsie latérale homonyme gauche'
      ],
      correctOptionIndex: 0,
      explanation: 'Le cervelet contrôle la coordination motrice du côté HOMOLATÉRAL : une atteinte de l’hémisphère droit provoque un syndrome cérébelleux droit.'
    }
  ]
}
