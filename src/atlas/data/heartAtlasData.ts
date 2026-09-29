import type { AtlasDefinition } from '../types'

export const heartAtlasData: AtlasDefinition = {
  id: 'heart',
  title: 'Cardiologie & Cœur',
  subtitle: 'Atlas morphologique, cavitaire, coronaire, électrique et auscultatoire',
  category: 'Cardiologie & Angiologie',
  description: 'Exploration anatomique détaillée des 4 cavités cardiaques, de l’appareil valvulaire, de la vascularisation coronaire, du tissu nodal avec corrélation ECG et des foyers cliniques d’auscultation.',
  iconName: 'Heart',
  defaultViewId: 'chambers_valves',
  modes: ['explore', 'learn', 'pathway', 'clinical', 'test'],
  views: [
    {
      id: 'morphology_anterior',
      name: 'Vue antérieure externe',
      shortName: 'Morphologie externe',
      description: 'Orientation sterno-costale du cœur, émergence des gros vaisseaux (aorte, tronc pulmonaire, VCS) et sillon interventriculaire antérieur.',
      structures: [
        {
          id: 'aorta_ascending',
          name: 'Aorte ascendante & Crosse',
          latinName: 'Aorta ascendens & Arcus aortae',
          category: 'Grands vaisseaux',
          viewId: 'morphology_anterior',
          coordinates: { x: 48, y: 18 },
          description: 'Plus grosse artère de l’organisme issue du ventricule gauche, donnant les artères coronaires à sa base puis le tronc brachio-céphalique, la carotide commune gauche et la subclavière gauche.',
          function: 'Conduction du sang oxygéné sous haute pression vers l’ensemble de la grande circulation systémique.',
          clinicalPearl: 'Dissection aortique aiguë de type A de Stanford : urgence chirurgicale vitale avec douleur thoracique transfixiante et asymétrie tensionnelle.',
          examHighYield: 'La crosse aortique enjambe la bronche principale gauche et l’artère pulmonaire gauche.',
          relatedCourseId: 'physio-cardio',
          relatedCourseTitle: 'Physiologie cardiovasculaire'
        },
        {
          id: 'pulmonary_trunk',
          name: 'Tronc pulmonaire',
          latinName: 'Truncus pulmonalis',
          category: 'Grands vaisseaux',
          viewId: 'morphology_anterior',
          coordinates: { x: 62, y: 24 },
          description: 'Vaisseau artériel né du ventricule droit (infundibulum) qui croise la face antérieure de l’aorte ascendante avant de se diviser en artères pulmonaires droite et gauche.',
          function: 'Acheminement du sang désoxygéné vers les poumons pour hématose alvéolo-capillaire.',
          clinicalPearl: 'Embolie pulmonaire massive : obstruction aiguë du tronc ou de ses branches provoquant un cœur pulmonaire aigu avec défaillance du VD.',
          examHighYield: 'Relié à la crosse de l’aorte par le ligament artériel (reliquat du canal artériel de Botal).'
        },
        {
          id: 'right_atrium_ext',
          name: 'Oreillette droite (Atrium droit)',
          latinName: 'Atrium dextrum',
          category: 'Cavités cardiaques',
          viewId: 'morphology_anterior',
          coordinates: { x: 30, y: 52 },
          description: 'Cavité formant le bord droit du cœur recevant la veine cave supérieure, la veine cave inférieure et le sinus coronaire.',
          function: 'Réservoir de retour veineux systémique avant passage dans le ventricule droit.',
          clinicalPearl: 'Thrombus de l’auricule droit ou communication interauriculaire (CIA) avec risque d’embolie paradoxale.'
        },
        {
          id: 'left_ventricle_ext',
          name: 'Ventricule gauche (Apex)',
          latinName: 'Ventriculus sinister',
          category: 'Cavités cardiaques',
          viewId: 'morphology_anterior',
          coordinates: { x: 68, y: 70 },
          description: 'Pointe et bord gauche du cœur à paroi musculaire très épaisse, propulsant le sang oxygéné dans l’aorte.',
          function: 'Génération de la pression systolique (120 mmHg) et éjection systolique.',
          clinicalPearl: 'Choc de pointe ressenti à la palpation au niveau du 5e espace intercostal gauche sur la ligne médioclaviculaire.'
        }
      ]
    },
    {
      id: 'chambers_valves',
      name: 'Coupe 4 cavités & Appareil valvulaire',
      shortName: '4 cavités & valves',
      description: 'Coupe frontale exposant les 4 cavités, le septum interventriculaire, les valves atrio-ventriculaires et sigmoïdes, et les cordages tendineux.',
      structures: [
        {
          id: 'left_ventricle',
          name: 'Ventricule gauche',
          latinName: 'Ventriculus sinister',
          category: 'Cavités cardiaques',
          viewId: 'chambers_valves',
          coordinates: { x: 64, y: 65 },
          description: 'Cavité conique à paroi épaisse (8 à 11 mm chez l’adulte sain, soit 3 fois plus que le VD) supportant des régimes de haute pression systémique.',
          location: 'Partie postéro-inférieure gauche du cœur.',
          anatomicalRelations: 'Séparé du VD par le septum interventriculaire ; surmonté par l’atrium gauche et l’orifice aortique.',
          vascularization: 'Artère interventriculaire antérieure (IVA) et Artère circonflexe (Cx).',
          function: 'Éjection du volume d’éjection systolique (VES ~ 70 mL) à une pression de 120/80 mmHg.',
          clinicalPearl: 'Insuffisance cardiaque gauche à fraction d’éjection réduite (IC-FER < 40 %) : dyspnée d’effort, orthopnée, crépitants pulmonaires et œdème aigu du poumon (OAP).',
          examHighYield: 'Épaisseur pariétale normale : 8–11 mm. Une épaisseur > 15 mm signe une hypertrophie ventriculaire gauche (HVG).',
          relatedCourseId: 'physio-cardio',
          relatedCourseTitle: 'Physiologie cardiovasculaire'
        },
        {
          id: 'right_ventricle',
          name: 'Ventricule droit',
          latinName: 'Ventriculus dexter',
          category: 'Cavités cardiaques',
          viewId: 'chambers_valves',
          coordinates: { x: 38, y: 64 },
          description: 'Cavité en croissant moulée sur le ventricule gauche, à paroi mince (3 à 5 mm), travaillant à basse pression.',
          function: 'Propulsion du sang veineux dans l’artère pulmonaire à basse pression (25/10 mmHg).',
          clinicalPearl: 'Insuffisance ventriculaire droite : turgescence jugulaire, reflux hépato-jugulaire, hépatomégalie douloureuse et œdèmes des membres inférieurs (OMI).',
          examHighYield: 'Contient la trabécule septo-marginale (bandelette modératrice) qui conduit la branche droite du faisceau de His.'
        },
        {
          id: 'aortic_valve',
          name: 'Valve aortique',
          latinName: 'Valva aortae',
          category: 'Appareil valvulaire',
          viewId: 'chambers_valves',
          coordinates: { x: 52, y: 44 },
          description: 'Valve sigmoïde / semi-lunaire constituée de 3 valvules (cuspides coronaire droite, coronaire gauche et non-coronaire) avec les sinus de Valsalva.',
          function: 'Prévention du reflux de sang de l’aorte vers le VG pendant la diastole.',
          clinicalPearl: 'Rétrécissement aortique calcifié (RAC) : souffle systolique éjectionnel râpeux au 2e EIC droit irradiant aux carotides, avec risque de syncope d’effort et d’angor.',
          examHighYield: 'Surface aortique normale : 3 à 4 cm². RAC serré si surface < 1 cm² (< 0.6 cm²/m²).'
        },
        {
          id: 'mitral_valve',
          name: 'Valve mitrale',
          latinName: 'Valva mitralis / Valva bicuspidalis',
          category: 'Appareil valvulaire',
          viewId: 'chambers_valves',
          coordinates: { x: 62, y: 48 },
          description: 'Valve atrio-ventriculaire gauche bicuspide (cuspide antérieure/grande valve et cuspide postérieure/petite valve) amarrée par des cordages aux muscles papillaires.',
          function: 'Fermeture étanche pendant la systole ventriculaire (composante M1 du 1er bruit du cœur B1).',
          clinicalPearl: 'Insuffisance mitrale (IM) : souffle holosystolique en jet de vapeur à l’apex irradiant vers l’aisselle gauche.',
          examHighYield: 'La rupture de cordage mitral sur endocardite ou ischémie de pilier entraîne une IM aiguë massive avec OAP foudroyant.'
        },
        {
          id: 'tricuspid_valve',
          name: 'Valve tricuspide',
          latinName: 'Valva tricuspidalis',
          category: 'Appareil valvulaire',
          viewId: 'chambers_valves',
          coordinates: { x: 36, y: 49 },
          description: 'Valve atrio-ventriculaire droite composée de 3 cuspides (antérieure, postérieure et septale).',
          function: 'Contrôle du flux unidirectionnel de l’atrium droit vers le ventricule droit.',
          clinicalPearl: 'Signe de Carvallo : majoration du souffle d’insuffisance tricuspidienne à l’inspiration profonde (augmentation du retour veineux).'
        },
        {
          id: 'interventricular_septum',
          name: 'Septum interventriculaire',
          latinName: 'Septum interventriculare',
          category: 'Paroi cardiaque',
          viewId: 'chambers_valves',
          coordinates: { x: 49, y: 66 },
          description: 'Cloison épaisse musculaire dans sa majeure partie et membraneuse à sa partie supérieure séparant les deux ventricules.',
          function: 'Participation active à la contraction ventriculaire globale et support des voies de conduction (branches de His).',
          clinicalPearl: 'Communication interventriculaire (CIV) : cardiopathie congénitale avec souffle holosystolique en rayon de roue méso-cardiaque.'
        }
      ]
    },
    {
      id: 'coronary_tree',
      name: 'Réseau coronaire & Territoires SCA',
      shortName: 'Réseau coronaire',
      description: 'Arborescence des artères coronaires droite et gauche, distribution myocardique et correspondance avec les dérivations ECG.',
      structures: [
        {
          id: 'lad_artery',
          name: 'Artère Interventriculaire Antérieure (IVA / LAD)',
          latinName: 'Ramus interventricularis anterior (LAD)',
          category: 'Artères coronaires',
          viewId: 'coronary_tree',
          coordinates: { x: 54, y: 55 },
          description: 'Branche majeure du tronc commun de la coronaire gauche cheminant dans le sillon interventriculaire antérieur vers l’apex. Donne les artères diagonales et septales.',
          function: 'Irrigation de la paroi antérieure du VG, des 2/3 antérieurs du septum interventriculaire et de l’apex.',
          clinicalPearl: 'Occlusion aiguë de l’IVA : Infarctus du myocarde antérieur étendu (dérivations V1 à V4/V6) avec risque élevé de choc cardiogénique et de rupture septale.',
          examHighYield: 'Territoire électrique ECG : V1-V2 (septal), V3-V4 (apical/antérieur), V5-V6 (latéral bas).'
        },
        {
          id: 'cx_artery',
          name: 'Artère Circonflexe (Cx)',
          latinName: 'Ramus circumflexus',
          category: 'Artères coronaires',
          viewId: 'coronary_tree',
          coordinates: { x: 68, y: 40 },
          description: 'Branche du tronc commun coronaire gauche contournant le bord gauche du cœur dans le sillon atrio-ventriculaire. Donne les artères marginales.',
          function: 'Irrigation de la paroi latérale et postéro-latérale du ventricule gauche.',
          clinicalPearl: 'Territoire ECG latéral haut (D1, aVL) et latéral bas (V5, V6).'
        },
        {
          id: 'rca_artery',
          name: 'Artère Coronaire Droite (CD / RCA)',
          latinName: 'Arteria coronaria dextra',
          category: 'Artères coronaires',
          viewId: 'coronary_tree',
          coordinates: { x: 30, y: 48 },
          description: 'Naît du sinus de Valsalva droit, chemine dans le sillon atrio-ventriculaire droit et donne l’artère du nœud sino-atrial, l’artère marginale droite et se termine le plus souvent en IVP.',
          function: 'Irrigation du ventricule droit, de l’atrium droit, du nœud sinusal (60 %), du nœud AV (90 %) et de la paroi inférieure du VG.',
          clinicalPearl: 'Infarctus inférieur (dérivations D2, D3, aVF) : complications fréquentes par bradycardie vagale, bloc atrio-ventriculaire (BAV) et extension au ventricule droit (V4R).',
          examHighYield: 'Dominance coronaire droite dans 85 % des cas (la CD donne l’artère interventriculaire postérieure IVP et rétro-ventriculaire gauche).'
        }
      ]
    },
    {
      id: 'conduction_ecg',
      name: 'Tissu nodal & Conduction ECG',
      shortName: 'Tissu nodal & ECG',
      description: 'Système cardionecteur assurant la genèse et la propagation synchronisée du potentiel d’action avec corrélation sur le tracé ECG.',
      structures: [
        {
          id: 'sa_node',
          name: 'Nœud sino-atrial (Sinusal / Keith & Flack)',
          latinName: 'Nodus sinuatrialis',
          category: 'Tissu cardionecteur',
          viewId: 'conduction_ecg',
          coordinates: { x: 32, y: 32 },
          description: 'Amas sous-épicardique de cellules pacemakers situé à la jonction de la veine cave supérieure et de l’oreillette droite.',
          function: 'Pacemaker physiologique primaire du cœur imposant le rythme sinusal (automatisme intrinsèque de 60 à 100 bpm par pente de dépolarisation diastolique spontanée If).',
          clinicalPearl: 'Dysfonction sinusale / Maladie de l’oreillette : pauses sinusales, bradycardie inappropriée ou syndrome tachycardie-bradycardie.',
          examHighYield: 'La dépolarisation atriale issue du nœud sinusal engendre l’ONDE P sur l’électrocardiogramme.'
        },
        {
          id: 'av_node',
          name: 'Nœud atrio-ventriculaire (Aschoff-Tawara)',
          latinName: 'Nodus atrioventricularis',
          category: 'Tissu cardionecteur',
          viewId: 'conduction_ecg',
          coordinates: { x: 46, y: 46 },
          description: 'Situé dans le triangle de Koch au bas du septum interatrial, au-dessus de l’insertion de la valve tricuspide.',
          function: 'Ralentissement physiologique de la conduction de l’influx (0.08 à 0.12 s) permettant le remplissage ventriculaire optimal avant la systole.',
          clinicalPearl: 'Bloc auriculo-ventriculaire (BAV) : BAV 1 (PR allongé > 200 ms), BAV 2 (Mobitz I Luciani-Wenckebach ou Mobitz II), BAV 3 complet avec dissociation auriculo-ventriculaire.',
          examHighYield: 'Le délai nodal correspond au segment isoélectrique PR sur l’ECG.'
        },
        {
          id: 'his_purkinje',
          name: 'Faisceau de His & Réseau de Purkinje',
          latinName: 'Fasciculus atrioventricularis & Rami subendocardiales',
          category: 'Tissu cardionecteur',
          viewId: 'conduction_ecg',
          coordinates: { x: 50, y: 65 },
          description: 'Tronc commun traversant le squelette fibreux, se divisant en branche droite (pour le VD) et branche gauche (se subdivisant en hémibranches antérieure et postérieure), puis en réseau sous-endocardique de Purkinje.',
          function: 'Conduction rapide (2 à 4 m/s) déclenchant la dépolarisation quasi synchrone des deux ventricules de l’apex vers la base.',
          clinicalPearl: 'Bloc de branche gauche (BBG) ou bloc de branche droit (BBD) avec élargissement du complexe QRS > 120 ms.',
          examHighYield: 'La dépolarisation ventriculaire génère le COMPLEXE QRS ; la repolarisation ventriculaire génère l’ONDE T.'
        }
      ]
    },
    {
      id: 'auscultation',
      name: 'Foyers d’Auscultation Cardiaque',
      shortName: 'Foyers d’auscultation',
      description: 'Projection clinique des 4 foyers auscultatoires de référence sur la paroi thoracique antérieure.',
      structures: [
        {
          id: 'aortic_focus',
          name: 'Foyer aortique',
          category: 'Auscultation clinique',
          viewId: 'auscultation',
          coordinates: { x: 44, y: 38 },
          description: '2e espace intercostal droit au bord sternal (ligne parasternale droite).',
          function: 'Auscultation préférentielle des bruits de la valve aortique.',
          clinicalPearl: 'Souffle systolique éjectionnel râpeux de sténose aortique irradiant aux vaisseaux du cou.'
        },
        {
          id: 'pulmonary_focus',
          name: 'Foyer pulmonaire',
          category: 'Auscultation clinique',
          viewId: 'auscultation',
          coordinates: { x: 56, y: 38 },
          description: '2e espace intercostal gauche au bord sternal (ligne parasternale gauche).',
          function: 'Auscultation de la valve pulmonaire et dédoublement physiologique du deuxième bruit (B2).',
          clinicalPearl: 'Dédoublement large et fixe de B2 dans la communication interauriculaire (CIA).'
        },
        {
          id: 'tricuspid_focus',
          name: 'Foyer tricuspide (Xiphoïdien)',
          category: 'Auscultation clinique',
          viewId: 'auscultation',
          coordinates: { x: 46, y: 64 },
          description: '4e et 5e espaces intercostaux gauches près du sternum et appendice xiphoïde.',
          function: 'Auscultation de la valve tricuspide.',
          clinicalPearl: 'Insuffisance tricuspidienne fonctionnelle sur dilatation droite (signe de Carvallo positif).'
        },
        {
          id: 'mitral_focus',
          name: 'Foyer mitral (Apexien)',
          category: 'Auscultation clinique',
          viewId: 'auscultation',
          coordinates: { x: 65, y: 72 },
          description: '5e espace intercostal gauche sur la ligne médioclaviculaire (au niveau du choc de pointe).',
          function: 'Auscultation de la valve mitrale et du premier bruit B1.',
          clinicalPearl: 'Roulement diastolique avec éclat de B1 dans le rétrécissement mitral (RM) ; souffle de régurgitation holosystolique dans l’insuffisance mitrale.'
        }
      ]
    }
  ],
  pathways: [
    {
      id: 'cardiac_circuit',
      name: 'Circulation cardio-pulmonaire & systémique',
      shortDescription: 'Circuit complet du sang désoxygéné vers les poumons et propulsion du sang hématosé vers l’aorte.',
      category: 'Hémodynamique',
      steps: [
        {
          index: 1,
          title: 'Retour veineux dans l’Atrium droit',
          structureId: 'right_atrium_ext',
          viewId: 'morphology_anterior',
          description: 'Arrivée du sang désoxygéné par les veines caves supérieure et inférieure.'
        },
        {
          index: 2,
          title: 'Passage valvulaire tricuspide & Ventricule droit',
          structureId: 'right_ventricle',
          viewId: 'chambers_valves',
          description: 'Remplissage diastolique du VD à basse pression à travers la valve tricuspide.'
        },
        {
          index: 3,
          title: 'Éjection dans le Tronc Pulmonaire',
          structureId: 'pulmonary_trunk',
          viewId: 'morphology_anterior',
          description: 'Systole du VD ouvrant la valve pulmonaire vers les artères pulmonaires pour oxygénation alvéolaire.'
        },
        {
          index: 4,
          title: 'Atrium gauche & Valve mitrale',
          structureId: 'mitral_valve',
          viewId: 'chambers_valves',
          description: 'Retour du sang oxygéné par les 4 veines pulmonaires dans l’atrium gauche puis écoulement vers le VG.'
        },
        {
          index: 5,
          title: 'Systole du Ventricule gauche & Aorte',
          structureId: 'left_ventricle',
          viewId: 'chambers_valves',
          description: 'Contraction isovolumétrique puis éjection puissante à travers la valve aortique ouverte.'
        }
      ]
    },
    {
      id: 'conduction_circuit',
      name: 'Genèse & Propagation du Potentiel d’Action Cardiaque',
      shortDescription: 'Trajet de l’onde électrique du nœud sinusal jusqu’au réseau de Purkinje avec onde ECG associée.',
      category: 'Électrophysiologie',
      steps: [
        {
          index: 1,
          title: 'Dépolarisation du Nœud Sinusal (Onde P)',
          structureId: 'sa_node',
          viewId: 'conduction_ecg',
          description: 'Potentiel pacemaker spontané initiant la dépolarisation des oreillettes (Onde P sur l’ECG, durée < 120 ms).'
        },
        {
          index: 2,
          title: 'Temporisation du Nœud AV (Segment PR)',
          structureId: 'av_node',
          viewId: 'conduction_ecg',
          description: 'Freinage de l’influx pour synchroniser systole atriale et fermeture atrio-ventriculaire (Intervalle PR : 120-200 ms).'
        },
        {
          index: 3,
          title: 'Conduction rapide His-Purkinje (Complexe QRS)',
          structureId: 'his_purkinje',
          viewId: 'conduction_ecg',
          description: 'Propagation foudroyante dans les branches droite et gauche dépolarisant le myocarde ventriculaire (QRS < 100 ms).'
        }
      ]
    }
  ],
  clinicalScenarios: [
    {
      id: 'stemi_anterior',
      title: 'Infarctus du Myocarde Antérieur (STEMI)',
      subtitle: 'Syndrome coronarien aigu ST+ par occlusion de l’IVA proximale',
      badge: 'Urgence Cardiologique',
      severity: 'critical',
      vignette: 'Homme de 56 ans, tabagique et hypertendu, ressentant brutalement au repos depuis 1 heure une douleur rétrosternale constrictive intense irradiant dans la mâchoire et le bras gauche, angoissante et résistante à la trinitrine.',
      affectedStructureIds: ['lad_artery', 'left_ventricle', 'interventricular_septum'],
      primaryViewId: 'coronary_tree',
      pathophysiology: 'Rupture d’une plaque d’athérome instable avec thrombose occlusive aiguë et totale de l’artère interventriculaire antérieure (IVA), entraînant une nécrose ischémique transmurale transmural du myocarde antérieur et septal.',
      clinicalSigns: [
        'Douleur thoracique constrictive typique',
        'Sueurs froides, pâleur, angoisse de mort imminente',
        'Galop protodiastolique B3 en cas de dysfonction VG aiguë'
      ],
      ecgOrImagingFindings: 'ECG 12 dérivations : Sus-décalage du segment ST convexe vers le haut (onde de Pardee) ≥ 2 mm dans les dérivations antéro-septales V1-V4 avec miroir inférieur (D2, D3, aVF).',
      managementKey: 'Appel immédiat du SAMU (15), coronarographie en urgence pour angioplastie primaire avec stent actif (délai premier contact médical - ballon < 90 min) + double anti-agrégation plaquettaire (Aspirine + Ticagrélor) et héparine.',
      quizQuestion: {
        question: 'Quel territoire myocardique est menacé de nécrose en cas d’occlusion proximale de l’IVA ?',
        options: [
          'Paroi antérieure du VG et 2/3 antérieurs du septum interventriculaire',
          'Paroi inférieure du VG et atrium droit',
          'Paroi latérale haute uniquement',
          'Ventricule droit exclusif'
        ],
        correctIndex: 0,
        explanation: 'L’IVA vascularise la face antérieure du ventricule gauche ainsi que les deux tiers antérieurs du septum interventriculaire.'
      }
    },
    {
      id: 'aortic_stenosis',
      title: 'Rétrécissement Aortique Serré (RAC)',
      subtitle: 'Valvulopathie dégénérative calcifiée de Mönckeberg',
      badge: 'Valvulopathie',
      severity: 'high',
      vignette: 'Patient de 78 ans présentant des épisodes d’étourdissements et un malaise syncopal à l’effort lors de la montée d’escaliers, avec essoufflement d’effort progressif.',
      affectedStructureIds: ['aortic_valve', 'left_ventricle', 'aortic_focus'],
      primaryViewId: 'chambers_valves',
      pathophysiology: 'Calcification progressive et fusion des cuspides aortiques réduisant l’orifice valvulaire (< 1.0 cm²), augmentant la post-charge du VG et induisant une hypertrophie ventriculaire gauche concentrique compensatrice.',
      clinicalSigns: [
        'Triade fonctionnelle : Angor d’effort, Syncope d’effort, Dyspnée d’effort',
        'Souffle mésosystolique éjectionnel rugueux au 2e EIC droit irradiant aux carotides',
        'Diminution ou abolition du 2e bruit B2 au foyer aortique'
      ],
      ecgOrImagingFindings: 'Échocardiographie Doppler transthoracique : Surface aortique < 1.0 cm² (< 0.6 cm²/m²), Gradient moyen VG-Aorte > 40 mmHg, Vitesse maximale Vmax > 4.0 m/s.',
      managementKey: 'Remplacement valvulaire aortique chirurgical ou par voie percutanée (TAVI) dès l’apparition des symptômes ou si FEVG < 50 %.',
      quizQuestion: {
        question: 'Quelle irradiation caractéristique du souffle de rétrécissement aortique permet de le différencier d’une insuffisance mitrale ?',
        options: [
          'Irradiation vers les artères carotides bilatérales',
          'Irradiation vers l’aisselle gauche',
          'Irradiation dans le dos',
          'Irradiation vers la fosse iliaque droite'
        ],
        correctIndex: 0,
        explanation: 'Le souffle éjectionnel de RAC irradie préférentiellement vers les vaisseaux du cou (artères carotides), dans le sens du flux d’éjection aortique.'
      }
    }
  ],
  quizQuestions: [
    {
      id: 'heart_q1',
      type: 'identify',
      viewId: 'chambers_valves',
      targetStructureId: 'left_ventricle',
      prompt: 'Identifiez la cavité cardiaque dotée de la paroi musculaire la plus épaisse.',
      explanation: 'Le ventricule gauche possède une épaisseur pariétale normale de 8 à 11 mm pour propulser le sang dans la circulation systémique à haute pression.',
      hint: 'Cavité inférieure située à droite sur l’image (gauche anatomique du patient).'
    },
    {
      id: 'heart_q2',
      type: 'identify',
      viewId: 'auscultation',
      targetStructureId: 'aortic_focus',
      prompt: 'Repérez le foyer auscultatoire aortique sur la paroi thoracique.',
      explanation: 'Le foyer aortique se projette au 2e espace intercostal droit, au bord sternal droit.',
      hint: 'En haut à droite sur le thorax (2e EIC droit).'
    },
    {
      id: 'heart_q3',
      type: 'mcq',
      viewId: 'coronary_tree',
      prompt: 'Dans quel territoire électrique de l’ECG se traduit une ischémie aiguë de l’artère circonflexe (Cx) ?',
      options: [
        'Territoire latéral (D1, aVL, V5, V6)',
        'Territoire antérieur étendu (V1 à V4)',
        'Territoire inférieur (D2, D3, aVF)',
        'Dérivations droites exclusives (V3R, V4R)'
      ],
      correctOptionIndex: 0,
      explanation: 'L’artère circonflexe irrigue la paroi latérale du ventricule gauche, explorée électriquement par les dérivations latérales D1, aVL, V5 et V6.'
    },
    {
      id: 'heart_q4',
      type: 'mcq',
      viewId: 'conduction_ecg',
      prompt: 'Quel événement électrophysiologique correspond à l’onde P sur le tracé ECG de surface ?',
      options: [
        'La dépolarisation des atriums (oreillettes)',
        'La repolarisation des ventricules',
        'La dépolarisation rapide du septum interventriculaire',
        'Le temps de conduction dans le réseau de Purkinje'
      ],
      correctOptionIndex: 0,
      explanation: 'L’onde P reflète la dépolarisation des oreillettes droite et gauche, initiée par le nœud sino-atrial.'
    }
  ]
}
