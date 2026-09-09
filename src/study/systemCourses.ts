import type {Course} from './curriculum'
import type {Diagram} from './diagrams'
import type {Question} from './questions'
import {courseSupport} from './courseSupport'

const base='https://openstax.org/books/anatomy-and-physiology-2e/pages/'
type Draft=Omit<Course,'category'|'minutes'|'structure'|'sections'|'source'|'sources'>&{sections:[string,string][];references:[string,string][]}
const makeCourse=({references,sections,...course}:Draft):Course=>({...course,category:'Anatomie',structure:null,minutes:Math.ceil(sections.reduce((n,s)=>n+s[1].split(/\s+/).length,0)/120)+10,sections:sections.map(([title,text])=>({title,text})),source:base+references[0][1],sources:references.map(([label,page])=>({label:'OpenStax · '+label,url:base+page}))})

// Textes et exercices originaux ; les références documentent les notions.
const drafts:Draft[]=[
  {
    "id": "anat-neck",
    "title": "Cou : pharynx, larynx et région thyroïdienne",
    "tag": "Tête et cou",
    "objectives": [
      "Reconstruire les voies aérienne et digestive en coupe sagittale",
      "Distinguer cartilages laryngés et glande thyroïde",
      "Situer les principaux rapports vasculaires et nerveux du cou"
    ],
    "sections": [
      [
        "Organiser une région de passage",
        "Le cou relie la tête au thorax. Pour le comprendre, placez d’abord la colonne cervicale en arrière, puis le pharynx et l’œsophage devant elle, et enfin le larynx et la trachée plus en avant. Cette organisation est une première carte : elle ne signifie pas que tous les éléments restent exactement médians à toutes les hauteurs. Les vaisseaux et les nerfs cheminent aussi dans des espaces latéraux.\n\nLe muscle sternocléidomastoïdien fournit un repère superficiel et sépare des triangles cervicaux. Les fascias enveloppent les muscles et délimitent des espaces de glissement. Un fascia n’est ni un muscle ni une cavité libre. Pour lire une coupe, identifiez systématiquement la lumière du conduit, sa paroi et les structures voisines avant de chercher les petits détails."
      ],
      [
        "Les trois étages du pharynx",
        "Le nasopharynx se trouve derrière les fosses nasales et au-dessus du voile du palais. Il communique avec l’oreille moyenne par les trompes auditives. L’oropharynx est situé derrière la cavité orale. Le laryngopharynx descend derrière le larynx et se poursuit par l’œsophage. Ces noms indiquent leurs rapports : ils ne désignent pas trois organes complètement indépendants.\n\nL’air parcourt les étages pharyngés pour gagner le larynx. Le bol alimentaire traverse surtout l’oropharynx puis le laryngopharynx avant l’œsophage. La déglutition coordonne le déplacement de la langue, du voile, du pharynx et du larynx. La protection des voies aériennes repose sur plusieurs mouvements ; réduire toute la fonction à un simple clapet épiglottique empêche de comprendre cette coordination."
      ],
      [
        "La charpente et la lumière du larynx",
        "Le cartilage thyroïde forme une partie importante de la paroi antérieure. Le cricoïde constitue un anneau situé plus bas. L’épiglotte surplombe l’entrée laryngée, et les aryténoïdes participent à la mobilité des plis vocaux. Le cartilage thyroïde ne doit jamais être confondu avec la glande thyroïde : même région et nom voisin, mais nature et fonction différentes.\n\nLes plis vocaux bordent l’ouverture glottique. Le passage d’air et la tension des tissus interviennent dans la production vocale. Les muscles intrinsèques règlent la position des cartilages ; les muscles extrinsèques déplacent l’ensemble laryngé. Un mouvement global pendant la déglutition et un réglage fin de la phonation ne correspondent donc pas à la même action anatomique."
      ],
      [
        "Trachée, œsophage et glande thyroïde",
        "La trachée poursuit le conduit aérien sous le larynx. Sa paroi comporte des pièces cartilagineuses ouvertes en arrière et une portion postérieure plus souple, proche de l’œsophage. Celui-ci constitue un tube musculaire distinct. L’air inspiré ne traverse pas la lumière œsophagienne et les aliments ne transitent normalement pas par la trachée.\n\nLa thyroïde présente habituellement deux lobes réunis par un isthme en avant de la trachée cervicale. Les parathyroïdes sont de petites glandes généralement situées sur sa face postérieure, avec des variations de nombre et de position. Une description anatomique indique ces rapports ; elle ne permet pas de déduire la fonction hormonale d’une glande à partir de sa seule taille visible."
      ],
      [
        "Les axes vasculaires et les nerfs",
        "De chaque côté, la région carotidienne rassemble des éléments destinés à la tête et au cou. La carotide commune se divise en carotides interne et externe : l’interne participe notamment à l’apport cérébral, l’externe dessert largement les territoires extracrâniens. La veine jugulaire interne assure une voie majeure du retour veineux. Il faut distinguer un vaisseau qui traverse une région d’une branche qui la vascularise directement.\n\nLe nerf vague descend dans le cou et donne des branches laryngées. Les nerfs laryngés récurrents ont des trajets droit et gauche différents avant de remonter. Le nerf phrénique se dirige vers le diaphragme. Retenez les fonctions et les rapports principaux avant les détails de branchement, qui demandent une étude plus fine des coupes et des variantes."
      ],
      [
        "Reconstituer les rapports",
        "Dessinez une coupe sagittale simplifiée et placez cinq éléments : rachis, pharynx, œsophage, larynx, trachée. Tracez ensuite deux parcours de couleurs différentes, l’un pour l’air et l’autre pour les aliments. Ils partagent une région de passage mais se séparent vers deux conduits. Ajoutez la thyroïde à l’extérieur de la trachée ; elle n’est pas un contenu de la voie aérienne.\n\nPassez ensuite à une coupe transversale et ajoutez les axes vasculaires latéraux. Cette seconde vue teste la compréhension spatiale : une structure postérieure sur une coupe sagittale ne devient pas automatiquement médiale sur une coupe transversale. La position dépend de l’axe décrit. Pour chaque nom, formulez une phrase complète contenant un voisin, une direction et une fonction."
      ]
    ],
    "trap": "La glande thyroïde et le cartilage thyroïde sont deux structures différentes.",
    "recall": "Pourquoi air et aliments peuvent-ils partager une région sans suivre ensuite le même conduit ?",
    "answer": "Ils passent par des portions communes du pharynx ; la déglutition coordonne leur orientation. Le larynx et la trachée conduisent l’air, tandis que l’œsophage conduit le bol alimentaire.",
    "glossary": [
      [
        "Pharynx",
        "Conduit musculomembraneux commun à plusieurs fonctions respiratoires et digestives."
      ],
      [
        "Glotte",
        "Région des plis vocaux et de l’ouverture située entre eux."
      ],
      [
        "Isthme thyroïdien",
        "Pont de tissu reliant habituellement les deux lobes de la thyroïde."
      ],
      [
        "Fascia",
        "Lame de tissu conjonctif entourant ou séparant des structures."
      ]
    ],
    "caseStudy": {
      "prompt": "Sur une coupe du cou, un conduit est situé derrière la trachée. Un étudiant le nomme « glande thyroïde ». Que faut-il corriger ?",
      "answer": "Le conduit postérieur est l’œsophage. La thyroïde est une glande située surtout en avant et sur les côtés de la trachée cervicale ; elle ne possède pas une lumière de transit alimentaire."
    },
    "references": [
      [
        "Voies respiratoires",
        "22-1-organs-and-structures-of-the-respiratory-system"
      ],
      [
        "Région thyroïdienne",
        "17-4-the-thyroid-gland"
      ],
      [
        "Muscles du cou",
        "11-3-axial-muscles-of-the-head-neck-and-back"
      ],
      [
        "Voies vasculaires",
        "20-5-circulatory-pathways"
      ]
    ]
  },
  {
    "id": "anat-mediastinum",
    "title": "Médiastin, péricarde et grands vaisseaux",
    "tag": "Thorax",
    "objectives": [
      "Délimiter le médiastin par rapport aux poumons",
      "Suivre les grands axes artériels et veineux",
      "Distinguer les enveloppes péricardiques des cavités cardiaques"
    ],
    "sections": [
      [
        "Un espace central du thorax",
        "Le médiastin est la région centrale située entre les deux compartiments pleuropulmonaires. Il s’étend de l’ouverture supérieure du thorax au diaphragme, entre le sternum et le rachis thoracique. Il contient le cœur mais ne se réduit pas au cœur : des voies aériennes, digestives, vasculaires, lymphatiques et nerveuses le traversent aussi.\n\nLa subdivision anatomique classique distingue un médiastin supérieur et un inférieur, ce dernier partagé en parties antérieure, moyenne et postérieure. Le cœur et son péricarde occupent principalement la partie moyenne. Ces compartiments sont des repères descriptifs, sans cloisons hermétiques entre eux. Pour les mémoriser, reliez chaque nom à un contenu et à une limite plutôt qu’à une couleur arbitraire sur un schéma."
      ],
      [
        "Les enveloppes du cœur",
        "Le péricarde fibreux forme une enveloppe résistante. À sa face interne s’applique le feuillet pariétal du péricarde séreux. Le feuillet viscéral, également nommé épicarde, adhère à la surface du cœur. Entre les deux feuillets séreux, l’espace péricardique contient normalement une petite quantité de liquide facilitant le glissement pendant les mouvements cardiaques.\n\nCet espace n’est pas une cinquième cavité du cœur : le sang propulsé par les ventricules ne circule pas dedans. Une coupe dessinée de dehors en dedans doit donc séparer enveloppe fibreuse, séreuse pariétale, espace liquidien, séreuse viscérale et myocarde. Les réflexions de la séreuse autour des racines vasculaires expliquent pourquoi les enveloppes changent de direction au voisinage des gros vaisseaux."
      ],
      [
        "L’aorte et les branches de sa crosse",
        "L’aorte commence au ventricule gauche, monte puis décrit une crosse avant de descendre dans le thorax. Dans la disposition habituelle, trois branches naissent de la crosse : tronc brachiocéphalique, carotide commune gauche et subclavière gauche. Le tronc brachiocéphalique se divise ensuite en carotide commune droite et subclavière droite. Cette asymétrie explique que les deux côtés n’aient pas un trajet proximal identique.\n\nL’aorte thoracique descendante se situe dans le médiastin postérieur et traverse le diaphragme pour devenir abdominale. Les artères coronaires naissent près de l’origine aortique et irriguent le myocarde. Le nom d’une artère indique son trajet ou son territoire, mais sa classification comme artère dépend du sens de circulation depuis le cœur, pas de sa couleur dans l’atlas."
      ],
      [
        "Retours veineux et circulation pulmonaire",
        "Les veines brachiocéphaliques droite et gauche se réunissent pour former la veine cave supérieure. La gauche traverse plus longuement la région supérieure du thorax. La veine cave inférieure rejoint le cœur depuis l’abdomen à travers le diaphragme. Le système azygos collecte une partie du retour veineux de la paroi thoracique et rejoint la circulation cave supérieure.\n\nLe tronc pulmonaire part du ventricule droit et se divise vers les deux poumons. Les veines pulmonaires reviennent vers l’atrium gauche. Les qualifier d’artères ou de veines ne renseigne pas directement sur leur teneur en oxygène. Sur un schéma fonctionnel, tracez la flèche de circulation avant d’appliquer une couleur : cette méthode empêche de confondre circulation systémique et pulmonaire."
      ],
      [
        "Voies de passage et rapports nerveux",
        "La trachée descend dans le médiastin puis se divise en bronches principales. L’œsophage poursuit son trajet vers le diaphragme en arrière de la voie aérienne. Leur proximité n’implique aucune communication normale de leurs lumières. Les racines pulmonaires réunissent bronches, vaisseaux et nerfs au voisinage des hiles, mais le hile lui-même appartient à la surface du poumon.\n\nLes nerfs phréniques descendent en avant des racines pulmonaires, vers le diaphragme. Les vagues passent en arrière de ces racines et contribuent notamment aux plexus viscéraux. Le conduit thoracique remonte dans le thorax avant de rejoindre le réseau veineux à gauche. Il transporte de la lymphe : ce n’est ni un vaisseau pulmonaire ni un conduit aérien."
      ],
      [
        "Lire une coupe et distinguer les espaces",
        "Pour analyser une coupe thoracique, commencez par l’orientation : sternum en avant, corps vertébral en arrière, poumons latéraux. Identifiez ensuite les structures centrales selon leur continuité sur les coupes voisines. Un vaisseau rond sur une coupe peut devenir oblique plus haut ; une image isolée ne décrit jamais tout son trajet. La position du cœur change aussi avec son obliquité propre.\n\nComparez trois espaces : les cavités cardiaques contiennent du sang, l’espace péricardique facilite le glissement des feuillets, et les espaces pleuraux séparent les feuillets autour des poumons. Les confondre mène à une fausse carte du thorax. Pour réviser, expliquez comment un élément rejoint l’abdomen ou le cou, plutôt que de seulement réciter son nom."
      ]
    ],
    "trap": "Le médiastin ne correspond ni à une cavité pulmonaire ni à la seule silhouette du cœur.",
    "recall": "D’où viennent les artères carotides communes droite et gauche dans la disposition habituelle ?",
    "answer": "La droite naît du tronc brachiocéphalique ; la gauche naît directement de la crosse aortique.",
    "glossary": [
      [
        "Médiastin",
        "Région thoracique centrale entre les compartiments pleuropulmonaires."
      ],
      [
        "Péricarde",
        "Ensemble des enveloppes fibreuse et séreuse du cœur."
      ],
      [
        "Crosse aortique",
        "Segment courbe entre aorte ascendante et descendante."
      ],
      [
        "Hile pulmonaire",
        "Zone de la surface pulmonaire où passent les éléments de la racine."
      ]
    ],
    "caseStudy": {
      "prompt": "Un schéma place les veines pulmonaires dans l’atrium droit et le liquide péricardique dans un ventricule. Comment rectifier les deux erreurs ?",
      "answer": "Les veines pulmonaires rejoignent l’atrium gauche. Le liquide péricardique est situé entre les feuillets séreux, en dehors des cavités sanguines."
    },
    "references": [
      [
        "Cœur et péricarde",
        "19-1-heart-anatomy"
      ],
      [
        "Grands axes vasculaires",
        "20-5-circulatory-pathways"
      ],
      [
        "Voies respiratoires",
        "22-1-organs-and-structures-of-the-respiratory-system"
      ],
      [
        "Circulation lymphatique",
        "21-1-anatomy-of-the-lymphatic-and-immune-systems"
      ]
    ]
  },
  {
    "id": "anat-peritoneum",
    "title": "Abdomen : régions, péritoine et mésentères",
    "tag": "Abdomen",
    "objectives": [
      "Passer des neuf régions de surface aux organes profonds",
      "Expliquer les rapports intra- et rétropéritonéaux",
      "Suivre un pédicule digestif dans un méso"
    ],
    "sections": [
      [
        "Deux cartes de surface complémentaires",
        "L’abdomen peut être décrit en quatre quadrants : supérieur droit, supérieur gauche, inférieur droit et inférieur gauche. Une carte plus détaillée comporte neuf régions : hypochondres droit et gauche autour de l’épigastre, flancs autour de la région ombilicale, fosses iliaques autour de l’hypogastre. Ces subdivisions localisent une projection ; elles ne constituent pas des boîtes séparant les organes.\n\nLe foie déborde son hypochondre, l’intestin occupe plusieurs régions et le remplissage des viscères change leur forme. Une localisation de surface n’autorise donc pas à identifier automatiquement l’organe sous-jacent. Dans un exercice, ajoutez toujours une profondeur et un rapport à la région citée. Le vocabulaire anatomique décrit une géométrie, tandis qu’un raisonnement clinique demanderait des informations supplémentaires."
      ],
      [
        "Les deux feuillets péritonéaux",
        "Le péritoine est une membrane séreuse. Son feuillet pariétal tapisse la paroi de la cavité abdominopelvienne ; son feuillet viscéral recouvre des surfaces d’organes. L’espace entre les feuillets comporte normalement un film liquidien qui facilite les déplacements relatifs. Un organe dit intrapéritonéal n’est pas librement plongé dans une grande poche de liquide : il est largement recouvert de péritoine et relié à des attaches.\n\nImaginez une surface continue qui se réfléchit d’une paroi vers un viscère. Cette continuité explique les replis et leurs deux faces. Le terme « cavité péritonéale » ne désigne ni la lumière intestinale ni l’ensemble du volume abdominal. Sur votre schéma, dessinez donc séparément la paroi du tube digestif et la séreuse qui le recouvre."
      ],
      [
        "Mésentères, épiploons et ligaments",
        "Un méso associe des feuillets péritonéaux reliant une portion digestive à la paroi. Il constitue une voie de passage pour les artères, les veines, les lymphatiques et les nerfs. Le mésentère du jéjunum et de l’iléon soutient des anses mobiles, sans supprimer leurs mouvements. Les mésocôlons rattachent certaines portions du côlon selon une organisation différente.\n\nLes épiploons, ou omentums, sont des replis associés à l’estomac et aux structures voisines. Le grand épiploon descend devant les anses intestinales ; le petit épiploon relie notamment foie, estomac et duodénum. Un ligament péritonéal est un repli de séreuse : il n’a pas automatiquement la même structure ou fonction qu’un ligament fibreux stabilisant une articulation."
      ],
      [
        "Intrapéritonéal et rétropéritonéal",
        "Les reins et les uretères occupent une situation rétropéritonéale : ils sont en arrière du péritoine pariétal postérieur. Une grande partie du duodénum et du pancréas est également fixée dans un plan postérieur, selon une histoire de développement différente. À l’inverse, l’estomac et les anses jéjuno-iléales possèdent des rapports péritonéaux leur permettant une mobilité plus importante.\n\nIl faut éviter les formules absolues : le pancréas présente des particularités vers sa queue, et les portions d’un même organe peuvent avoir des rapports distincts. Le côlon transverse et le sigmoïde possèdent des mésos, contrairement à la fixation habituelle des côlons ascendant et descendant. Apprenez une carte régionale avec ses exceptions, plutôt qu’une étiquette unique attribuée à tout le tube digestif."
      ],
      [
        "Pédicules digestifs et retour portal",
        "Les territoires digestifs reçoivent notamment des branches du tronc cœliaque et des artères mésentériques supérieure et inférieure. Ces axes naissent de l’aorte abdominale et se distribuent par des branches, souvent reliées entre elles. Les vaisseaux cheminent dans les attaches et rejoignent la paroi des organes. Une anastomose est une connexion vasculaire ; ce n’est pas un nouveau type d’organe.\n\nUne grande partie du sang veineux provenant du tube digestif passe par la veine porte avant de traverser le foie et de rejoindre les veines hépatiques. Il faut donc distinguer apport artériel digestif, retour veineux portal et drainage lymphatique. Dans un dessin, utilisez trois tracés différents. La lymphe intestinale ne rejoint pas directement la lumière du côlon."
      ],
      [
        "Lire les continuités et les limites du modèle",
        "Pour reconstruire la région, partez du diaphragme et suivez l’œsophage vers l’estomac, puis le duodénum, le jéjunum, l’iléon et le côlon. Ajoutez ensuite foie, voies biliaires et pancréas comme organes associés, en distinguant leurs conduits de leur vascularisation. Enfin, replacez les reins dans le plan postérieur : leur voisinage avec l’intestin ne les intègre pas au tube digestif.\n\nUne vue 3D centrée sur les seuls organes peut masquer les replis péritonéaux si ceux-ci ne figurent pas dans les maillages disponibles. L’absence visuelle d’un méso ne prouve pas son absence anatomique. Le texte et le schéma fonctionnel complètent l’atlas. L’objectif de cette lecture est de restituer des continuités réelles, sans inventer les structures que le modèle ne montre pas."
      ]
    ],
    "trap": "Intrapéritonéal ne signifie pas « à l’intérieur de la lumière digestive » ni « flottant librement ».",
    "recall": "Pourquoi un méso est-il important au-delà du simple maintien d’une anse ?",
    "answer": "Il constitue un support de passage pour les vaisseaux, les lymphatiques et les nerfs destinés à cette portion digestive.",
    "glossary": [
      [
        "Péritoine",
        "Membrane séreuse pariétale et viscérale de la région abdominopelvienne."
      ],
      [
        "Méso",
        "Repli péritonéal reliant un viscère digestif à la paroi et portant son pédicule."
      ],
      [
        "Rétropéritonéal",
        "Situé en arrière du péritoine pariétal postérieur."
      ],
      [
        "Système porte",
        "Circulation veineuse reliant deux réseaux capillaires en série."
      ]
    ],
    "caseStudy": {
      "prompt": "Un étudiant place le rein au milieu des anses mobiles, suspendu au mésentère du grêle. Quelle relation anatomique doit-il revoir ?",
      "answer": "Le rein est rétropéritonéal, dans un plan postérieur. Le mésentère du grêle porte le pédicule des anses jéjuno-iléales, pas celui du rein."
    },
    "references": [
      [
        "Organisation digestive et péritoine",
        "23-1-overview-of-the-digestive-system"
      ],
      [
        "Régions anatomiques",
        "1-6-anatomical-terminology"
      ],
      [
        "Vascularisation abdominale",
        "20-5-circulatory-pathways"
      ],
      [
        "Anatomie rénale",
        "25-3-gross-anatomy-of-the-kidney"
      ]
    ]
  },
  {
    "id": "anat-urinary-pelvis",
    "title": "Voies urinaires : uretères, vessie et urètre",
    "tag": "Pelvis et périnée",
    "objectives": [
      "Suivre le trajet de l’urine après le rein",
      "Comparer les rapports pelviens de la vessie et de l’urètre",
      "Relier stockage, sphincters et commande de la miction"
    ],
    "sections": [
      [
        "De la formation au transport de l’urine",
        "Le rein transforme le filtrat au cours de son passage dans le néphron et les conduits collecteurs. L’urine rejoint ensuite les calices, le pelvis rénal puis l’uretère. À ce stade, on étudie surtout le transport vers un réservoir et l’évacuation, non les mécanismes de filtration glomérulaire détaillés dans le chapitre rénal. Séparer ces étapes permet d’attribuer chaque fonction au bon organe.\n\nChaque uretère relie un rein à la vessie. L’urètre part de la vessie vers l’extérieur. Une seule lettre change, mais leurs points de départ et d’arrivée diffèrent complètement. Pour retenir cette distinction, tracez un parcours continu sur un dessin puis nommez chacun des conduits. Le nombre habituel de deux uretères ne signifie pas deux urètres."
      ],
      [
        "Un trajet urétéral abdominal puis pelvien",
        "Les uretères descendent en position rétropéritonéale le long de la paroi postérieure de l’abdomen, franchissent la région du détroit supérieur et gagnent les parois pelviennes avant de rejoindre la vessie. Leur paroi contient du muscle lisse ; des ondes péristaltiques participent à la progression de l’urine. Le transport ne dépend donc pas uniquement de la gravité ou d’une posture verticale.\n\nL’entrée dans la paroi vésicale suit un trajet oblique qui contribue à limiter le reflux lors du remplissage et des variations de pression. Cette organisation n’est pas une valve cardiaque et ne doit pas être dessinée comme deux battants. Les rapports pelviens de l’uretère changent selon les organes reproducteurs présents, ce qui justifie une lecture régionale précise."
      ],
      [
        "La vessie comme réservoir distensible",
        "La vessie se situe derrière la symphyse pubienne. Son volume et son extension supérieure varient selon son remplissage. Le trigone est délimité par les deux orifices urétéraux et l’orifice interne de l’urètre. Le détrusor désigne l’ensemble musculaire lisse de sa paroi ; l’urothélium forme un revêtement spécialisé adapté aux changements de distension.\n\nLe stockage demande que la paroi accueille un volume croissant tout en maintenant une pression appropriée, et que la voie de sortie reste fermée. Il ne se résume pas à une vessie constamment contractée. La miction associe ensuite contraction du détrusor et réduction coordonnée de la résistance urétrale. Une contraction du réservoir avec une sortie fermée ne décrit pas une vidange normale efficace."
      ],
      [
        "Rapports pelviens et différences urétrales",
        "Dans la disposition anatomique féminine habituelle, la vessie est en avant de l’utérus et du vagin. L’urètre, court, rejoint un orifice distinct de l’orifice vaginal, dans le vestibule. Le vagin ne transporte pas l’urine. Dans la disposition masculine habituelle, la prostate se situe sous la vessie et entoure la portion prostatique de l’urètre ; le rectum est plus postérieur.\n\nL’urètre masculin comporte notamment des portions prostatique, membraneuse et spongieuse. La portion spongieuse chemine dans le corps spongieux du pénis. Le même conduit terminal participe aux voies urinaire et génitale, mais les mécanismes de coordination distinguent leurs fonctions. Une coupe sagittale doit donc montrer les continuités, pas simplement aligner plusieurs organes sans relier leurs lumières."
      ],
      [
        "Sphincters, plancher pelvien et commande nerveuse",
        "Les mécanismes de fermeture urétrale font intervenir du muscle lisse et un sphincter strié externe, avec une organisation qui varie selon l’anatomie. Le sphincter strié reçoit une commande somatique, notamment par le nerf pudendal. Les voies autonomes participent à la régulation du détrusor et du col vésical. Le plancher pelvien assure aussi un soutien mécanique des organes.\n\nLa sensation de remplissage provient d’informations afférentes ; elle n’est pas créée par une mesure consciente de volume. Des circuits médullaires et des centres supérieurs coordonnent stockage et vidange. Pour un raisonnement de première année, distinguez donc capteur, voies afférentes, intégration, commandes efférentes et effecteurs. Cette distinction reste valable même si plusieurs nerfs ou muscles participent à une même étape."
      ],
      [
        "Construire un raisonnement anatomofonctionnel",
        "Comparez deux situations pédagogiques : un conduit de transport en amont du réservoir et une résistance accrue à la sortie du réservoir. Dans la première, la continuité rein–vessie est concernée ; dans la seconde, l’écoulement vessie–extérieur est concerné. Les deux peuvent modifier les pressions mais ne sont pas anatomiquement équivalentes. N’attribuez pas automatiquement une gêne fonctionnelle à un organe sans décrire le trajet.\n\nSur votre schéma, utilisez des flèches pleines pour l’urine et des flèches distinctes pour les informations nerveuses. Les nerfs ne contiennent pas d’urine, et l’uretère ne véhicule pas une commande motrice. Répétez ensuite le parcours en sens inverse pour vérifier les rapports, tout en conservant le sens normal du flux dans votre explication finale."
      ]
    ],
    "trap": "Uretère : rein vers vessie. Urètre : vessie vers extérieur.",
    "recall": "Quels changements doivent être coordonnés pour vider la vessie ?",
    "answer": "La contraction du détrusor doit s’accompagner d’une diminution de la résistance à la sortie, notamment par la relaxation coordonnée des mécanismes sphinctériens.",
    "glossary": [
      [
        "Urothélium",
        "Épithélium spécialisé des voies urinaires, adapté à la distension."
      ],
      [
        "Détrusor",
        "Muscle lisse de la paroi vésicale."
      ],
      [
        "Trigone",
        "Région entre les orifices urétéraux et l’orifice urétral interne."
      ],
      [
        "Miction",
        "Évacuation de l’urine contenue dans la vessie."
      ]
    ],
    "caseStudy": {
      "prompt": "Un schéma fait descendre l’urine du rein directement dans l’urètre et place le sphincter strié dans chaque uretère. Que corriger ?",
      "answer": "L’urine rejoint la vessie par l’uretère, puis sort par l’urètre. Le sphincter strié externe participe à la fermeture urétrale ; la paroi des uretères propulse l’urine par du muscle lisse."
    },
    "references": [
      [
        "Transport urinaire et miction",
        "25-2-gross-anatomy-of-urine-transport"
      ],
      [
        "Rein et voies excrétrices",
        "25-3-gross-anatomy-of-the-kidney"
      ],
      [
        "Organisation autonome",
        "15-1-divisions-of-the-autonomic-nervous-system"
      ],
      [
        "Muscles pelviens",
        "11-4-axial-muscles-of-the-abdominal-wall-and-thorax"
      ]
    ]
  }
]

export const systemCourses:Course[]=drafts.map(makeCourse)
const support=courseSupport(systemCourses)
export const systemDiagrams:Record<string,Diagram>=support.diagrams
export const systemQuestions:Question[]=support.questions
