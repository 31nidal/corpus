import type { Course } from '../../curriculum'

// Editorial replacements for the introductory organ lessons. IDs, atlas links,
// supplementary sections and existing questions are retained by the catalogue.
type Revision = Pick<Course, 'objectives' | 'sections' | 'trap' | 'recall' | 'answer'>
const s = (title: string, text: string) => ({title, text})
export const organRevisions: Record<string, Revision> = {
 FMA7088: {
  objectives: ['Situer les cavités cardiaques et leurs principaux rapports', 'Reconstituer le trajet du sang à travers les quatre valves', 'Distinguer circulation intracardiaque et irrigation coronaire'],
  sections: [
   s('Situation et orientation', 'Le cœur occupe le médiastin moyen dans son sac péricardique. Son apex est dirigé vers le bas, l’avant et la gauche ; sa base regarde principalement en arrière. Le ventricule droit constitue l’essentiel de la face sternocostale, tandis que l’atrium gauche est surtout postérieur.'),
   s('Cavités et circuits en série', 'L’atrium droit reçoit notamment les veines caves et le sinus coronaire ; le ventricule droit éjecte vers le tronc pulmonaire. Les veines pulmonaires rejoignent l’atrium gauche, puis le ventricule gauche éjecte vers l’aorte. Le septum sépare les circulations droite et gauche après la naissance, hors communication anormale.'),
   s('Valves et appareil sous-valvulaire', 'La tricuspide sépare les cavités droites et la mitrale les cavités gauches. Leurs cordages et muscles papillaires limitent le prolapsus pendant la systole ; ils ne tirent pas les valves pour les ouvrir. Les valves pulmonaire et aortique, à la sortie des ventricules, ne possèdent pas de cordages.'),
   s('Pression et sens d’écoulement', 'Les valves s’ouvrent et se ferment passivement selon les gradients de pression. Pendant l’éjection, la pression ventriculaire dépasse celle de l’artère correspondante ; pendant le remplissage, elle devient inférieure à celle de l’atrium. Les deux ventricules ont, à l’état stable, des débits moyens égaux mais travaillent contre des pressions différentes.'),
   s('Paroi et vascularisation coronaire', 'La paroi comprend endocarde, myocarde et épicarde. Le myocarde ventriculaire gauche est plus épais, en rapport avec la charge de pression systémique. Son apport en oxygène dépend des artères coronaires issues de l’aorte ; le sang contenu dans les cavités ne suffit pas à nourrir toute son épaisseur.'),
  ],
  trap: 'Une artère est définie par son trajet depuis le cœur, pas par son oxygénation : les artères pulmonaires transportent normalement du sang moins oxygéné que les veines pulmonaires.',
  recall: 'Depuis les veines caves jusqu’à l’aorte, dans quel ordre le sang franchit-il les quatre valves ?',
  answer: 'Tricuspide, pulmonaire, puis après le passage pulmonaire, mitrale et aortique. Le trajet traverse successivement cœur droit, poumons et cœur gauche.',
 },
 FMA7309: {
  objectives: ['Comparer lobes et faces des deux poumons', 'Distinguer voies conductrices et zone respiratoire', 'Relier plèvre, ventilation et échanges alvéolocapillaires'],
  sections: [
   s('Situation et rapports', 'Chaque poumon occupe une cavité pleurale de part et d’autre du médiastin. L’apex dépasse l’orifice supérieur du thorax ; la base repose sur le diaphragme. La face médiastinale présente le hile, où passent bronches, vaisseaux, lymphatiques et nerfs constituant la racine pulmonaire.'),
   s('Lobes et segmentation', 'Le poumon droit comporte des lobes supérieur, moyen et inférieur, séparés par les scissures horizontale et oblique. Le gauche comporte deux lobes séparés par une scissure oblique ; la lingula appartient au lobe supérieur. Un segment bronchopulmonaire est associé à une bronche segmentaire et une branche artérielle pulmonaire.'),
   s('De la bronche à l’alvéole', 'Les bronches possèdent du cartilage ; les bronchioles en sont dépourvues. Les bronchioles terminales terminent la zone conductrice. Des alvéoles apparaissent dans la paroi des bronchioles respiratoires, puis deviennent nombreuses dans les conduits et sacs alvéolaires : les échanges commencent dans cette zone respiratoire.'),
   s('Barrière et circulations', 'L’oxygène et le CO₂ diffusent selon leurs gradients de pression partielle à travers la barrière alvéolocapillaire. Les pneumocytes I forment une grande partie de la surface mince d’échange ; les pneumocytes II sécrètent le surfactant. La circulation pulmonaire assure les échanges, tandis que la circulation bronchique contribue à la nutrition des voies aériennes.'),
   s('Plèvre et mécanique ventilatoire', 'La plèvre viscérale recouvre le poumon et la plèvre pariétale tapisse la paroi thoracique. Le mince film liquidien pleural réduit les frottements et participe au couplage mécanique. L’expansion thoracique permet l’expansion pulmonaire ; une rupture de ce couplage, comme dans un pneumothorax, peut favoriser la rétraction du poumon.'),
  ],
  trap: 'Ventilation, perfusion et diffusion sont distinctes : de l’air dans une alvéole ne garantit pas un échange si sa perfusion est interrompue.',
  recall: 'Pourquoi une région ventilée mais non perfusée ne contribue-t-elle pas normalement à l’oxygénation du sang ?',
  answer: 'L’air y arrive, mais aucun débit sanguin capillaire ne recueille l’oxygène : cette ventilation contribue à l’espace mort alvéolaire.',
 },
 FMA7148: {
  objectives: ['Identifier les régions et rapports principaux de l’estomac', 'Associer les cellules gastriques à leurs sécrétions', 'Expliquer brassage, protection muqueuse et vidange pylorique'],
  sections: [
   s('Topographie et rapports', 'L’estomac est une dilatation du tube digestif située surtout dans l’épigastre et l’hypochondre gauche. Il reçoit l’œsophage au cardia et se prolonge par le duodénum au pylore. Sa forme et sa position varient avec le remplissage ; le pancréas est situé en arrière, séparé par la bourse omentale.'),
   s('Régions et courbures', 'Le fundus forme le dôme supérieur, le corps la partie principale et la région pylorique comprend notamment l’antre puis le canal pylorique. La petite courbure est médiale ; la grande courbure décrit le bord convexe. Le pylore comporte un épaississement de la couche musculaire circulaire participant au contrôle de sortie.'),
   s('Cellules et sécrétions', 'Les cellules pariétales des glandes du corps et du fundus produisent l’acide chlorhydrique et le facteur intrinsèque. Les cellules principales libèrent du pepsinogène, précurseur de la pepsine. Les cellules G, surtout antrales, sécrètent la gastrine. Le mucus et le bicarbonate de surface participent à la protection épithéliale.'),
   s('Brassage et digestion', 'Les contractions de la musculeuse mélangent les aliments aux sécrétions et contribuent à former le chyme. L’acidité dénature des protéines et favorise l’activation de la pepsine ; elle n’assure pas à elle seule toute la digestion. La rétropulsion antrale aide à réduire et mélanger le contenu avant son passage pylorique.'),
   s('Vidange et régulation', 'La vidange dépend des propriétés du repas et de signaux nerveux et hormonaux, notamment d’origine duodénale. L’arrivée d’acide et de lipides dans le duodénum peut la ralentir. L’estomac prépare donc un apport progressif à l’intestin grêle ; l’absorption de la majorité des nutriments ne se fait pas dans l’estomac.'),
  ],
  trap: 'Le facteur intrinsèque est sécrété dans l’estomac, mais son complexe avec la vitamine B12 est absorbé dans l’iléon terminal.',
  recall: 'Quelles cellules sécrètent l’acide et le facteur intrinsèque, et lesquelles libèrent le pepsinogène ?',
  answer: 'Les cellules pariétales sécrètent HCl et facteur intrinsèque ; les cellules principales sécrètent le pepsinogène, activé en pepsine dans le milieu acide.',
 },
 FMA7200: {
  objectives: ['Suivre le duodénum, le jéjunum et l’iléon', 'Distinguer plis circulaires, villosités et microvillosités', 'Comparer les voies sanguine et lymphatique d’absorption'],
  sections: [
   s('Segments et péritoine', 'Le grêle s’étend du pylore à la jonction iléocæcale. Le duodénum entoure la tête du pancréas et est en grande partie secondairement rétropéritonéal. Le jéjunum et l’iléon forment des anses mobiles suspendues par le mésentère ; leur transition est progressive, sans limite externe brusque.'),
   s('Organisation de la paroi', 'La paroi associe muqueuse, sous-muqueuse, musculeuse et enveloppe externe. Les plis circulaires comprennent muqueuse et sous-muqueuse ; les villosités sont des projections muqueuses. Les microvillosités appartiennent à la membrane apicale des entérocytes : ces trois échelles ne doivent pas être confondues.'),
   s('Cryptes et renouvellement', 'Les cryptes abritent des cellules assurant le renouvellement de l’épithélium et plusieurs fonctions sécrétoires. Les entérocytes participent à la digestion terminale et à l’absorption ; les cellules caliciformes produisent du mucus. Les cellules de Paneth contribuent à la défense locale et les cellules entéroendocrines émettent des signaux régulateurs.'),
   s('Digestion et mouvements', 'Le chyme reçoit bile et sécrétions pancréatiques dans le duodénum. Les enzymes luminales et de bordure en brosse libèrent des molécules absorbables. Les mouvements segmentaires favorisent le mélange ; les séquences propulsives déplacent le contenu. Les sels biliaires facilitent le traitement des lipides sans les hydrolyser comme une enzyme.'),
   s('Absorption et drainage', 'Les monosaccharides et acides aminés rejoignent principalement les capillaires puis le système porte. Les lipides à longue chaîne sont majoritairement reconditionnés en chylomicrons et gagnent les chylifères lymphatiques. L’iléon terminal absorbe notamment les sels biliaires et le complexe vitamine B12–facteur intrinsèque ; toutes les absorptions ne sont donc pas uniformément réparties.'),
  ],
  trap: 'Une villosité est une structure tissulaire contenant des vaisseaux ; une microvillosité est un prolongement apical d’une cellule épithéliale.',
  recall: 'Après absorption intestinale, les acides aminés et les chylomicrons empruntent-ils immédiatement la même voie ?',
  answer: 'Non. Les acides aminés rejoignent surtout le sang portal ; les chylomicrons empruntent d’abord les vaisseaux lymphatiques avant de rejoindre la circulation veineuse.',
 },
 FMA7197: {
  objectives: ['Situer le foie et les éléments du pédicule hépatique', 'Distinguer afférences portale et artérielle du drainage veineux', 'Relier organisation hépatique, métabolisme et trajet biliaire'],
  sections: [
   s('Situation et repères de surface', 'Le foie se situe sous le diaphragme, surtout dans l’hypochondre droit, avec une extension vers l’épigastre et la gauche. Ses lobes morphologiques ne se superposent pas exactement aux territoires fonctionnels vasculaires. La face viscérale présente le hile hépatique et des rapports avec notamment la vésicule, le duodénum et le rein droit.'),
   s('Pédicule et double apport sanguin', 'La veine porte apporte du sang provenant notamment du tube digestif, de la rate et du pancréas ; ce sang contient aussi de l’oxygène. L’artère hépatique apporte du sang artériel. Les branches de ces deux systèmes accompagnent les voies biliaires dans les espaces portes, sans confondre apport sanguin et transport de bile.'),
   s('Sinusoïdes et drainage', 'Le sang portal et artériel rejoint les sinusoïdes au contact fonctionnel des hépatocytes, puis les veines centrolobulaires et finalement les veines hépatiques vers la veine cave inférieure. Les veines hépatiques ne font pas partie de la triade portale. Les cellules de Kupffer sont des macrophages résidents associés au réseau sinusoïdal.'),
   s('Production et trajet de la bile', 'Les hépatocytes sécrètent la bile dans des canalicules entre cellules. Elle rejoint les ductules puis les conduits biliaires, dans un sens opposé au trajet sanguin du lobule classique. La vésicule stocke et concentre une partie de la bile ; elle n’est pas l’organe qui la synthétise.'),
   s('Fonctions et compartimentation', 'Le foie intervient dans la gestion du glucose, des lipides et des acides aminés, ainsi que dans la synthèse de protéines plasmatiques et la transformation de nombreuses substances. Les fonctions ne sont pas distribuées uniformément dans l’acinus : les gradients d’apport et d’oxygénation contribuent à des différences entre régions périportales (zone 1) et centrolobulaires (zone 3).'),
  ],
  trap: 'La veine porte est une afférence du foie ; les veines hépatiques en assurent le drainage vers la veine cave inférieure.',
  recall: 'Quel trajet suit le sang entre les branches portales intrahépatiques et la veine cave inférieure ?',
  answer: 'Branches portales → sinusoïdes, où arrive aussi le sang artériel → veines centrolobulaires et collectrices → veines hépatiques → veine cave inférieure.',
 },
 FMA7198: {
  objectives: ['Décrire tête, col, corps et queue du pancréas', 'Comparer sécrétions exocrines et endocrines et leurs voies de sortie', 'Relier activation des enzymes et protection du tissu pancréatique'],
  sections: [
   s('Rapports et position', 'Le pancréas est situé en arrière de l’estomac, en grande partie secondairement rétropéritonéal. La tête est encadrée par le duodénum ; le corps se dirige vers la gauche et la queue vers le hile splénique. La confluence habituelle de la veine porte se situe derrière le col pancréatique.'),
   s('Acini et système canalaire', 'La composante exocrine est organisée en acini sécréteurs et conduits. Les cellules acineuses produisent des enzymes digestives ou leurs précurseurs ; les cellules canalaires fournissent notamment une sécrétion riche en bicarbonate. Le conduit principal rejoint habituellement le duodénum à la papille majeure, avec des variantes d’abouchement et de conduit accessoire.'),
   s('Îlots endocrines', 'Les îlots sont des groupes de cellules endocrines vascularisés, dispersés dans le parenchyme exocrine. Les cellules β produisent l’insuline, les α le glucagon et les δ la somatostatine. Leurs hormones gagnent l’interstitium puis le sang ; elles ne passent pas par le conduit pancréatique pour agir sur leurs cibles.'),
   s('Enzymes et activation', 'Des protéases sont sécrétées sous forme de précurseurs inactifs. Dans le duodénum, l’entéropeptidase active le trypsinogène ; la trypsine active ensuite d’autres zymogènes. Cette organisation limite l’autodigestion. Toutes les enzymes pancréatiques ne sont cependant pas des zymogènes : l’amylase et la lipase sont notamment sécrétées sous forme active.'),
   s('Régulation coordonnée', 'La sécrétine stimule surtout la sécrétion canalaire de bicarbonate en réponse à l’acidité duodénale. La cholécystokinine et les signaux vagaux favorisent notamment la sécrétion enzymatique. La sécrétion endocrine répond à d’autres signaux, dont la glycémie : fonctions endocrine et exocrine sont associées dans l’organe, mais leurs mécanismes et destinations diffèrent.'),
  ],
  trap: 'Le pancréas est une glande mixte : insuline vers le sang, suc pancréatique vers le duodénum. Mélanger ces trajets conduit à confondre deux fonctions.',
  recall: 'Quelle différence de trajet distingue l’insuline des enzymes pancréatiques digestives ?',
  answer: 'L’insuline est libérée par les cellules β vers la circulation ; les sécrétions des acini empruntent les conduits exocrines jusqu’au duodénum.',
 },
 FMA7204: {
  objectives: ['Situer les reins et distinguer cortex, médulla et voies excrétrices', 'Suivre le filtrat depuis le glomérule jusqu’à l’uretère', 'Établir le bilan entre filtration, réabsorption, sécrétion et excrétion'],
  sections: [
   s('Topographie et hile', 'Les reins sont rétropéritonéaux, de part et d’autre du rachis lombaire ; le droit est habituellement un peu plus bas que le gauche. Le hile médial donne accès au sinus rénal et aux vaisseaux et voies urinaires. Dans l’ordre antéropostérieur classique se trouvent veine rénale, artère rénale puis pelvis rénal.'),
   s('Cortex et médulla', 'Le cortex contient les corpuscules rénaux et de nombreux segments tubulaires contournés. La médulla est organisée en pyramides dont les papilles déversent l’urine dans les calices mineurs. Les calices majeurs rejoignent le pelvis rénal, prolongé par l’uretère. Les corpuscules rénaux ne sont pas situés dans les papilles.'),
   s('Néphron et réseaux vasculaires', 'L’artériole afférente alimente le glomérule et l’artériole efférente en sort. Elle contribue ensuite aux réseaux péritubulaires ou aux vasa recta selon le type de néphron. Le filtrat passe de l’espace capsulaire au tubule proximal, à l’anse du néphron puis au tubule distal, avant le système collecteur.'),
   s('Bilan d’une substance', 'La filtration transfère eau et petites molécules du plasma vers l’espace capsulaire. La réabsorption ramène des substances du tubule vers le sang ; la sécrétion les ajoute au contenu tubulaire. Pour une substance considérée, quantité excrétée = quantité filtrée − quantité réabsorbée + quantité sécrétée, sur la même durée.'),
   s('Régulations et fonctions endocrines', 'Le rein contribue à l’équilibre hydrique, électrolytique et acido-basique. L’ADH module la perméabilité à l’eau du système collecteur ; l’aldostérone intervient dans le transport distal de Na⁺ et K⁺. Le rein participe aussi à la sécrétion de rénine et d’érythropoïétine et à l’activation de la vitamine D.'),
  ],
  trap: 'Filtration et excrétion ne sont pas synonymes : une molécule filtrée peut être réabsorbée, et une molécule peut être ajoutée à l’urine par sécrétion tubulaire.',
  recall: 'Une substance est filtrée à 100 unités/min, réabsorbée à 60 et sécrétée à 10. Quel est son débit d’excrétion ?',
  answer: '100 − 60 + 10 = 50 unités/min, à condition de comparer les flux de la même substance sur la même durée.',
 },
 FMA24474: {
  objectives: ['Orienter un fémur isolé à partir de ses reliefs', 'Décrire ses articulations proximale et distales', 'Relier col, trochanters et diaphyse aux contraintes et insertions'],
  sections: [
   s('Orientation générale', 'Le fémur est l’os de la cuisse. Sa tête regarde médialement, vers le haut et légèrement vers l’avant ; la ligne âpre est postérieure. En distal, la surface patellaire est antérieure et la fosse intercondylaire postérieure. Ces repères permettent de déterminer le côté sans se fier à l’orientation de l’image.'),
   s('Extrémité proximale', 'La tête s’articule avec l’acétabulum et est reliée à la diaphyse par le col. Le grand trochanter se projette latéralement ; le petit trochanter est postéromédial. La ligne intertrochantérique est antérieure, la crête intertrochantérique postérieure. L’axe du col forme avec celui de la diaphyse un angle variable selon l’âge et la morphologie.'),
   s('Corps et insertions', 'La diaphyse présente une convexité antérieure et une ligne âpre postérieure servant à plusieurs insertions musculaires. Les trochanters sont des zones d’insertion et de bras de levier, pas des surfaces articulaires. L’iliopsoas se termine au petit trochanter ; plusieurs muscles fessiers ou rotateurs s’insèrent autour du grand trochanter.'),
   s('Extrémité distale', 'Les condyles fémoraux s’articulent avec le tibia ; leur surface antérieure se prolonge par la surface patellaire qui reçoit la patella. La fibula ne s’articule pas avec le fémur. Les épicondyles sont des reliefs extra-articulaires ; la fosse intercondylaire accueille notamment les insertions fémorales des ligaments croisés.'),
   s('Vascularisation et contraintes', 'Le tissu osseux reçoit un apport nourricier et périosté ; la tête fémorale adulte dépend surtout de branches rétinaculaires issues notamment de l’artère circonflexe fémorale médiale. Une fracture du col peut menacer cet apport. La géométrie trabéculaire et corticale distribue les charges, avec un remodelage dépendant des sollicitations.'),
  ],
  trap: 'Les condyles articulaires ne sont pas les épicondyles ; le grand trochanter n’est pas la tête fémorale. La fibula ne participe pas à une articulation directe avec le fémur.',
  recall: 'Quels repères orientent un fémur isolé : tête, ligne âpre et surface patellaire ?',
  answer: 'La tête est médiale, supérieure et légèrement antérieure ; la ligne âpre est postérieure ; la surface patellaire est antérieure à l’extrémité distale.',
 },
 FMA50801: {
  objectives: ['Distinguer hémisphères cérébraux, diencéphale, tronc et cervelet', 'Orienter les lobes à partir des sillons principaux', 'Relier substance grise, substance blanche et voies de communication'],
  sections: [
   s('Cerveau et encéphale', 'L’encéphale regroupe les structures intracrâniennes du système nerveux central, dont cerveau, tronc cérébral et cervelet. Les hémisphères cérébraux sont séparés par la fissure longitudinale et reliés par des commissures, notamment le corps calleux. Employer cerveau et encéphale comme synonymes stricts masque ces distinctions anatomiques.'),
   s('Lobes et sillons', 'Le sillon central sépare les lobes frontal et pariétal ; le sillon latéral marque notamment leur rapport avec le lobe temporal. Le lobe occipital est postérieur et l’insula profonde au sillon latéral. Le gyrus précentral porte le cortex moteur primaire et le gyrus postcentral le cortex somatosensoriel primaire.'),
   s('Substances grise et blanche', 'Le cortex forme une couche superficielle de substance grise ; des noyaux gris sont également profonds. La substance blanche contient des faisceaux reliant régions corticales, hémisphères et structures sous-corticales. Une fonction résulte de réseaux distribués : identifier un lobe ne suffit pas à attribuer toute une capacité à une zone unique.'),
   s('Structures profondes et connexions', 'Le thalamus appartient au diencéphale et participe à de nombreux relais et circuits corticaux. L’hypothalamus contribue aux régulations autonomes et endocrines. Les noyaux basaux participent notamment aux boucles motrices. La capsule interne contient des fibres de projection : une petite lésion peut y intéresser plusieurs voies rapprochées.'),
   s('Enveloppes, liquide et vascularisation', 'Dure-mère, arachnoïde et pie-mère entourent l’encéphale. Le liquide cérébrospinal circule dans les ventricules puis l’espace sous-arachnoïdien. Les artères vertébrales se réunissent en artère basilaire. Les réseaux carotidien interne et vertébrobasilaire alimentent les artères cérébrales ; la présence du cercle artériel de la base ne garantit pas une suppléance suffisante dans toutes les occlusions.'),
  ],
  trap: 'La substance grise n’est pas uniquement corticale : elle forme aussi des noyaux profonds. Une image anatomique ne montre pas directement l’activité fonctionnelle des réseaux.',
  recall: 'Où se trouvent les gyri précentral et postcentral, et quelles fonctions primaires leur sont associées ?',
  answer: 'De part et d’autre du sillon central : gyrus précentral dans le lobe frontal, cortex moteur primaire ; gyrus postcentral dans le lobe pariétal, cortex somatosensoriel primaire.',
 },
}
