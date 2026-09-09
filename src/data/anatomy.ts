import frenchLabels from './french-labels.json'
import femaleLabels from './female-labels.json'
/** Concise original French educational summaries. References are listed in /SOURCES.md. */
export type AnatomyDescription = {
  name: string
  system: string
  role: string
  description: string
  fact?: string
  source: { label: string; url: string }
  keywords: string[]
}

const openStax = (chapter: string, label: string) => ({
  label: `OpenStax · ${label}`,
  url: `https://openstax.org/books/anatomy-and-physiology-2e/pages/${chapter}`,
})

const sources = {
  heart: openStax('19-1-heart-anatomy', 'Anatomie du cœur'),
  brain: openStax('13-2-the-central-nervous-system', 'Système nerveux central'),
  skull: openStax('7-2-the-skull', 'Crâne'),
  spine: openStax('7-3-the-vertebral-column', 'Colonne vertébrale'),
  thorax: openStax('7-4-the-thoracic-cage', 'Cage thoracique'),
  shoulder: openStax('8-1-the-pectoral-girdle', 'Ceinture scapulaire'),
  arm: openStax('8-2-bones-of-the-upper-limb', 'Membre supérieur'),
  pelvis: openStax('8-3-the-pelvic-girdle-and-pelvis', 'Bassin'),
  leg: openStax('8-4-bones-of-the-lower-limb', 'Membre inférieur'),
  skin: openStax('5-3-functions-of-the-integumentary-system', 'Fonctions de la peau'),
  immune: openStax('21-1-anatomy-of-the-lymphatic-and-immune-systems', 'Système lymphatique'),
  glands: openStax('23-6-accessory-organs-in-digestion-the-liver-pancreas-and-gallbladder', 'Foie, pancréas et vésicule biliaire'),
  stomach: openStax('23-4-the-stomach', 'Estomac'),
  digestion: { label: 'NIH · Le système digestif', url: 'https://www.niddk.nih.gov/health-information/digestive-diseases/digestive-system-how-it-works' },
  kidneys: { label: 'NIH · Le fonctionnement des reins', url: 'https://www.niddk.nih.gov/health-information/kidney-disease/kidneys-how-they-work' },
  urinary: { label: 'NIH · Les voies urinaires', url: 'https://www.niddk.nih.gov/health-information/urologic-diseases/urinary-tract-how-it-works' },
  lungs: { label: 'NIH · Le fonctionnement des poumons', url: 'https://www.nhlbi.nih.gov/health/lungs' },
  breathing: { label: 'NIH · Les échanges respiratoires', url: 'https://www.nhlbi.nih.gov/health/lungs/breathing-benefits' },
  diaphragm: { label: 'NIH · La commande de la respiration', url: 'https://www.nhlbi.nih.gov/health/lungs/body-controls-breathing' },
}

type Rule = {
  match: RegExp
  name: string
  system: string
  role: string
  description: string
  source: AnatomyDescription['source']
  keywords: string[]
  fact?: string
  gender?: 'f' | 'm'
}

const rules: Rule[] = [
 {match:/^female pelvic region$/,name:'Bassin féminin',system:'Anatomie féminine',role:'Situer les organes dans leur cadre osseux',description:'Cette vue réunit les os pelviens, les structures reproductrices et la vessie disponibles dans la référence féminine HRA. Faites tourner la région pour comparer leurs rapports, puis sélectionnez un élément pour le détailler. Il s’agit d’une sélection régionale, pas d’un bassin exhaustif.',source:sources.pelvis,keywords:['bassin','pelvis','femme']},
 {match:/^female reproductive organs$/,name:'Appareil reproducteur féminin',system:'Anatomie féminine',role:'Relier ovaires, trompes, utérus et vagin',description:'Explorez les organes et leurs attaches dans leur position de référence. Sélectionnez l’utérus, une trompe ou un ovaire pour passer de l’ensemble au détail. Le cours associé distingue les rapports anatomiques et les étapes du fonctionnement reproducteur.',source:openStax('27-2-anatomy-and-physiology-of-the-ovarian-reproductive-system','Appareil reproducteur féminin'),keywords:['reproduction','ovaires','trompes']},
 {match:/^mammary glands$/,name:'Seins et glandes mammaires',system:'Anatomie féminine',role:'Distinguer les tissus et les voies de sécrétion',description:'Cette vue rassemble les structures mammaires féminines disponibles : tissus adipeux, lobes, conduits, mamelons et aréoles. Sélectionnez puis masquez un élément pour découvrir les structures plus profondes. La forme de ce modèle ne représente pas toutes les variations individuelles.',source:openStax('28-6-lactation','Glande mammaire et lactation'),keywords:['sein','seins','glandes mammaires']},
  {match:/uterus|uterine cervix|cervicovaginal|cervical os/,name:'Utérus',system:'Appareil reproducteur féminin',role:'Accueillir l’implantation et participer à la gestation',description:'L’utérus est un organe musculaire pelvien situé entre vessie et rectum. Sa cavité est tapissée par l’endomètre ; le col communique avec le vagin. Le corps, le col et les tissus de soutien ont des fonctions différentes. Le modèle montre une référence anatomique, sans représenter toutes les variations individuelles.',source:openStax('27-2-anatomy-and-physiology-of-the-ovarian-reproductive-system','Appareil reproducteur féminin'),keywords:['utérus','col','endomètre','myomètre','femme']},
  {match:/ovary|ovarian/,name:'Ovaire',system:'Appareil reproducteur féminin',role:'Participer à la production des ovocytes et des hormones',description:'Les ovaires sont des gonades. Les follicules associent un ovocyte à des cellules de soutien ; leur maturation et le corps jaune participent à la sécrétion hormonale. Leurs rapports avec trompes et ligaments aident à comprendre leur position pelvienne.',source:openStax('27-2-anatomy-and-physiology-of-the-ovarian-reproductive-system','Ovaires'),keywords:['ovaire','ovocyte','follicule','femme']},
  {match:/uterine tube|fallopian/,name:'Trompe utérine',system:'Appareil reproducteur féminin',role:'Recueillir et transporter l’ovocyte',description:'La trompe utérine relie la région proche de l’ovaire à l’utérus, sans former une continuité fermée avec l’ovaire. Elle comprend notamment pavillon, ampoule et isthme. Les mouvements ciliaires et musculaires contribuent au transport ; la fécondation a habituellement lieu dans l’ampoule.',source:openStax('27-2-anatomy-and-physiology-of-the-ovarian-reproductive-system','Trompes utérines'),keywords:['trompe','ampoule','pavillon','fécondation']},
  {match:/mammary|lactiferous|nipple|areola/,name:'Glande mammaire',system:'Glandes mammaires',role:'Produire et conduire le lait pendant la lactation',description:'La glande mammaire associe des unités sécrétrices et des conduits, au sein de tissus adipeux et de soutien. Les conduits lactifères convergent vers le mamelon ; l’aréole est la région cutanée qui l’entoure. Le modèle permet de distinguer ces tissus sans simuler une lactation.',source:openStax('28-6-lactation','Lactation'),keywords:['sein','mammaire','mamelon','aréole','lactation']},
  { match: /bones of .* hand/, name: 'Os de la main', system: 'Squelette', role: 'Associer précision et mobilité', description: 'Les os du poignet, de la paume et des doigts forment un ensemble articulé. Ils permettent de saisir, de soutenir et de manipuler des objets.', source: sources.arm, keywords: ['main', 'doigts', 'carpe', 'métacarpe', 'phalanges'], gender: 'f' },
  { match: /bones of .* foot/, name: 'Os du pied', system: 'Squelette', role: 'Soutenir les appuis de la marche', description: 'Les os du tarse, du métatarse et des orteils répartissent les charges et forment les voûtes du pied. Leurs articulations accompagnent chaque pas.', source: sources.leg, keywords: ['pied', 'orteils', 'tarse', 'métatarse', 'marche'], gender: 'm' },
  { match: /vertebral column/, name: 'Colonne vertébrale', system: 'Squelette', role: 'Soutenir le tronc et protéger la moelle', description: 'Les vertèbres s’articulent en une colonne qui porte la tête et le tronc, protège la moelle épinière et permet les mouvements du dos. Le sacrum est sélectionnable séparément dans cet atlas.', source: sources.spine, keywords: ['colonne', 'rachis', 'dos', 'vertèbres'] },
  { match: /side of rib cage/, name: 'Cage thoracique', system: 'Squelette', role: 'Protéger le cœur et les poumons', description: 'Les côtes et leurs cartilages forment les côtés de la cage thoracique. Leurs mouvements accompagnent la respiration. Le sternum et la colonne sont sélectionnables séparément.', source: sources.thorax, keywords: ['côtes', 'thorax', 'poitrine'], gender: 'f' },
  { match: /gall\s*bladder/, name: 'Vésicule biliaire', system: 'Système digestif', role: 'Conserver la bile', description: 'Cette petite poche sous le foie stocke et concentre la bile. Elle la libère dans l’intestin grêle au cours de la digestion.', source: sources.glands, keywords: ['bile', 'digestion'] },
  { match: /urinary bladder|\bbladder\b/, name: 'Vessie', system: 'Système urinaire', role: 'Stocker l’urine', description: 'Située dans le bassin, la vessie se dilate lorsqu’elle se remplit. Sa paroi musculaire se contracte pour évacuer l’urine par l’urètre.', source: sources.urinary, keywords: ['urine', 'bassin'] },
  { match: /heart|myocardium/, name: 'Cœur', system: 'Système cardiovasculaire', role: 'Mettre le sang en mouvement', description: 'Ce muscle creux fonctionne comme une double pompe : le côté droit envoie le sang vers les poumons, le côté gauche vers le reste du corps.', fact: 'Quatre cavités travaillent ensemble : deux oreillettes et deux ventricules.', source: sources.heart, keywords: ['coeur', 'sang', 'circulation', 'cardiaque'] },
  { match: /cerebellum/, name: 'Cervelet', system: 'Système nerveux', role: 'Ajuster les mouvements', description: 'À l’arrière de l’encéphale, le cervelet compare les mouvements prévus aux informations reçues du corps. Il contribue à leur précision et à l’équilibre.', source: sources.brain, keywords: ['cerveau', 'équilibre', 'coordination'] },
  { match: /spinal cord/, name: 'Moelle épinière', system: 'Système nerveux', role: 'Relier le cerveau au corps', description: 'Protégée dans la colonne vertébrale, elle fait circuler des messages nerveux et participe aux réflexes.', source: sources.brain, keywords: ['nerfs', 'réflexe', 'colonne'] },
  { match: /brain|cerebrum|encephalon|cerebral hemisphere/, name: 'Cerveau', system: 'Système nerveux', role: 'Intégrer et coordonner', description: 'Il rassemble les informations des sens et organise les réponses du corps. Ses différentes régions participent au mouvement, à la mémoire, au langage et aux émotions.', fact: 'Avec la moelle épinière, il forme le système nerveux central.', source: sources.brain, keywords: ['encéphale', 'cerveau', 'neurones', 'pensée'], gender: 'm' },
  { match: /lung|pulmon/, name: 'Poumon', system: 'Système respiratoire', role: 'Échanger les gaz avec le sang', description: 'À l’inspiration, l’air apporte de l’oxygène aux poumons. Celui-ci passe dans le sang, tandis que le dioxyde de carbone suit le trajet inverse puis est expiré.', source: sources.lungs, keywords: ['poumons', 'respiration', 'oxygène', 'thorax'], gender: 'm' },
  { match: /trachea/, name: 'Trachée', system: 'Système respiratoire', role: 'Conduire l’air aux bronches', description: 'Ce conduit relie les voies respiratoires du cou aux bronches. L’air le traverse avant d’atteindre les poumons.', source: sources.breathing, keywords: ['air', 'respiration', 'bronches'] },
  { match: /bronch/, name: 'Bronche', system: 'Système respiratoire', role: 'Distribuer l’air dans le poumon', description: 'Les bronches se ramifient à partir de la trachée. Elles conduisent l’air vers des voies de plus en plus fines, jusqu’aux alvéoles où ont lieu les échanges gazeux.', source: sources.breathing, keywords: ['trachée', 'poumon', 'air'], gender: 'f' },
  { match: /diaphragm/, name: 'Diaphragme', system: 'Système respiratoire', role: 'Permettre l’inspiration', description: 'Ce muscle en forme de coupole sépare le thorax de l’abdomen. Sa contraction agrandit la cavité thoracique et permet à l’air d’entrer dans les poumons.', source: sources.diaphragm, keywords: ['muscle', 'respiration', 'thorax'] },
  { match: /liver/, name: 'Foie', system: 'Système digestif', role: 'Transformer, stocker et produire', description: 'Le foie transforme les nutriments absorbés par l’intestin et en met certains en réserve. Il produit aussi la bile, qui facilite la digestion des graisses.', source: sources.glands, keywords: ['digestion', 'bile', 'nutriments'] },
  { match: /stomach/, name: 'Estomac', system: 'Système digestif', role: 'Brasser et commencer la digestion', description: 'Sa paroi musculaire mélange les aliments aux sucs gastriques. L’acidité et les enzymes commencent notamment à décomposer les protéines, avant le passage vers l’intestin grêle.', source: sources.stomach, keywords: ['digestion', 'aliments', 'ventre'] },
  { match: /kidney|renal parenchyma/, name: 'Rein', system: 'Système urinaire', role: 'Filtrer et équilibrer', description: 'Les reins retirent du sang des déchets et l’excès d’eau pour former l’urine. Ils ajustent aussi l’équilibre en eau et en sels minéraux du corps.', fact: 'Chaque rein contient environ un million de petites unités filtrantes : les néphrons.', source: sources.kidneys, keywords: ['reins', 'urine', 'filtration', 'néphron'], gender: 'm' },
  { match: /ureter(?!hra)/, name: 'Uretère', system: 'Système urinaire', role: 'Acheminer l’urine', description: 'Ce fin tube musculaire transporte l’urine du rein jusqu’à la vessie. Il existe un uretère pour chaque rein.', source: sources.urinary, keywords: ['rein', 'vessie', 'urine'], gender: 'm' },
  { match: /urethra/, name: 'Urètre', system: 'Système urinaire', role: 'Évacuer l’urine', description: 'L’urètre conduit l’urine de la vessie vers l’extérieur du corps au moment d’uriner.', source: sources.urinary, keywords: ['vessie', 'urine'] },
  { match: /pancreas/, name: 'Pancréas', system: 'Système digestif', role: 'Fournir des enzymes digestives', description: 'Le pancréas libère dans l’intestin des substances qui décomposent les aliments. Il produit aussi des hormones, dont l’insuline, impliquées dans la régulation du sucre sanguin.', source: sources.glands, keywords: ['digestion', 'insuline', 'enzymes'] },
  { match: /spleen/, name: 'Rate', system: 'Système lymphatique', role: 'Surveiller et filtrer le sang', description: 'La rate participe aux défenses immunitaires. Elle filtre le sang et contribue à éliminer les globules rouges vieillissants.', source: sources.immune, keywords: ['immunité', 'sang', 'lymphatique'] },
  { match: /esophagus|oesophagus/, name: 'Œsophage', system: 'Système digestif', role: 'Faire avancer les aliments', description: 'Ce tube musculaire relie la gorge à l’estomac. Ses contractions successives poussent les aliments avalés vers le bas.', source: sources.digestion, keywords: ['oesophage', 'déglutition', 'digestion'] },
  { match: /duodenum/, name: 'Duodénum', system: 'Système digestif', role: 'Poursuivre la digestion', description: 'Cette première partie de l’intestin grêle reçoit le contenu de l’estomac et les sécrétions digestives du foie et du pancréas.', source: sources.digestion, keywords: ['intestin', 'digestion'] },
  { match: /jejunum|ileum|small intestine/, name: 'Intestin grêle', system: 'Système digestif', role: 'Absorber les nutriments', description: 'Ce long tube replié poursuit la digestion. Sa paroi fait passer la plupart des nutriments vers le sang ou la lymphe.', source: sources.digestion, keywords: ['intestin', 'jéjunum', 'iléon', 'digestion', 'absorption'] },
  { match: /rectum/, name: 'Rectum', system: 'Système digestif', role: 'Retenir les selles avant leur évacuation', description: 'Cette dernière partie du gros intestin conserve les selles avant leur passage par l’anus.', source: sources.digestion, keywords: ['intestin', 'transit'] },
  { match: /colon|large intestine|caecum|cecum/, name: 'Gros intestin', system: 'Système digestif', role: 'Récupérer l’eau et former les selles', description: 'Le gros intestin récupère de l’eau dans les résidus de la digestion. Ceux-ci progressent ensuite vers le rectum.', source: sources.digestion, keywords: ['côlon', 'colon', 'intestin', 'transit'] },
  { match: /skin|integument|body surface|body envelope/, name: 'Enveloppe corporelle', system: 'Système tégumentaire', role: 'Protéger et percevoir', description: 'La peau forme une barrière avec le milieu extérieur. Elle limite la perte d’eau, participe au contrôle de la température et transmet des sensations comme le toucher.', fact: 'Le modèle montre la surface du corps ; les couleurs et la transparence facilitent l’exploration.', source: sources.skin, keywords: ['peau', 'corps', 'surface', 'enveloppe'] },
  { match: /mandible/, name: 'Mandibule', system: 'Squelette', role: 'Mobiliser la mâchoire', description: 'L’os de la mâchoire inférieure porte les dents du bas et permet la mastication.', source: sources.skull, keywords: ['mâchoire', 'crâne', 'dents'] },
  { match: /maxilla/, name: 'Maxillaire', system: 'Squelette', role: 'Former la mâchoire supérieure', description: 'Cet os porte les dents supérieures et contribue aux parois du nez et des orbites.', source: sources.skull, keywords: ['mâchoire', 'crâne', 'dents'], gender: 'm' },
  { match: /frontal bone/, name: 'Os frontal', system: 'Squelette', role: 'Protéger l’avant du cerveau', description: 'Il forme le front et une partie du toit des orbites.', source: sources.skull, keywords: ['crâne', 'front'] },
  { match: /parietal bone/, name: 'Os pariétal', system: 'Squelette', role: 'Constituer la voûte du crâne', description: 'Les deux os pariétaux forment une grande partie du haut et des côtés du crâne.', source: sources.skull, keywords: ['crâne', 'tête'], gender: 'm' },
  { match: /temporal bone/, name: 'Os temporal', system: 'Squelette', role: 'Former le côté du crâne', description: 'Cet os participe à la base du crâne et abrite les structures de l’oreille moyenne et interne.', source: sources.skull, keywords: ['crâne', 'oreille'], gender: 'm' },
  { match: /occipital/, name: 'Os occipital', system: 'Squelette', role: 'Protéger l’arrière du cerveau', description: 'Il ferme l’arrière du crâne. Son ouverture inférieure laisse passer la jonction avec la moelle épinière.', source: sources.skull, keywords: ['crâne', 'nuque'] },
  { match: /hyoid/, name: 'Os hyoïde', system: 'Squelette', role: 'Offrir des attaches aux muscles du cou', description: 'Cet os du cou soutient la langue par ses attaches musculaires.', source: sources.skull, keywords: ['cou', 'langue'] },
  { match: /sphenoid|ethmoid|zygomatic|nasal bone|lacrimal|palatine|vomer|nasal concha|cranium|skull/, name: 'Os du crâne', system: 'Squelette', role: 'Protéger et structurer la tête', description: 'Les os du crâne entourent le cerveau et forment l’architecture osseuse du visage.', source: sources.skull, keywords: ['crâne', 'tête', 'visage'], gender: 'm' },
  { match: /sacrum/, name: 'Sacrum', system: 'Squelette', role: 'Relier la colonne au bassin', description: 'Cet os résulte de vertèbres soudées. Il transmet une partie du poids du tronc aux os du bassin.', source: sources.spine, keywords: ['colonne', 'bassin', 'dos'] },
  { match: /coccyx/, name: 'Coccyx', system: 'Squelette', role: 'Terminer la colonne vertébrale', description: 'Le coccyx est formé de petites vertèbres soudées à l’extrémité inférieure de la colonne.', source: sources.spine, keywords: ['colonne', 'bassin'] },
  { match: /vertebr|atlas|axis|spine/, name: 'Vertèbre', system: 'Squelette', role: 'Soutenir le tronc et protéger la moelle', description: 'Empilées, les vertèbres composent la colonne. Leur assemblage associe soutien du corps et mobilité du dos.', source: sources.spine, keywords: ['colonne', 'rachis', 'dos', 'cervical', 'lombaire', 'thoracique'] },
  { match: /sternum|manubrium|xiphoid/, name: 'Sternum', system: 'Squelette', role: 'Fermer l’avant du thorax', description: 'Cet os plat au centre de la poitrine reçoit les cartilages de plusieurs côtes et participe à la protection du cœur.', source: sources.thorax, keywords: ['poitrine', 'thorax', 'cage thoracique'] },
  { match: /costal cartilage/, name: 'Cartilage costal', system: 'Squelette', role: 'Assouplir la cage thoracique', description: 'Le cartilage prolonge les côtes à l’avant du thorax. Sa souplesse accompagne les mouvements respiratoires.', source: sources.thorax, keywords: ['côte', 'thorax', 'respiration'], gender: 'm' },
  { match: /\brib\b|ribs|costa/, name: 'Côte', system: 'Squelette', role: 'Protéger le thorax', description: 'Les côtes dessinent une cage autour du cœur et des poumons. Leurs mouvements participent à la respiration.', fact: 'Le thorax humain comporte habituellement douze paires de côtes.', source: sources.thorax, keywords: ['côtes', 'thorax', 'cage thoracique'], gender: 'f' },
  { match: /clavicle|clavicula/, name: 'Clavicule', system: 'Squelette', role: 'Soutenir l’épaule', description: 'Cet os relie le sternum à la scapula. Il maintient l’épaule à distance du thorax et transmet les forces du bras vers le tronc.', source: sources.shoulder, keywords: ['épaule', 'bras'], gender: 'f' },
  { match: /scapula/, name: 'Scapula', system: 'Squelette', role: 'Accompagner les mouvements de l’épaule', description: 'Aussi appelée omoplate, cet os plat dans le haut du dos s’articule avec l’humérus et fournit des attaches à de nombreux muscles.', source: sources.shoulder, keywords: ['omoplate', 'épaule', 'dos'], gender: 'f' },
  { match: /humerus/, name: 'Humérus', system: 'Squelette', role: 'Relier l’épaule au coude', description: 'L’os du bras s’articule en haut avec la scapula et en bas avec les deux os de l’avant-bras.', source: sources.arm, keywords: ['bras', 'coude', 'épaule'], gender: 'm' },
  { match: /radius/, name: 'Radius', system: 'Squelette', role: 'Permettre la rotation de l’avant-bras', description: 'Du côté du pouce, le radius tourne autour de l’ulna lorsque la paume change d’orientation.', source: sources.arm, keywords: ['avant-bras', 'poignet'], gender: 'm' },
  { match: /ulna/, name: 'Ulna', system: 'Squelette', role: 'Former l’appui du coude', description: 'Anciennement appelé cubitus, cet os de l’avant-bras forme la pointe du coude et s’articule avec l’humérus.', source: sources.arm, keywords: ['cubitus', 'avant-bras', 'coude'], gender: 'm' },
  { match: /metacarp/, name: 'Métacarpien', system: 'Squelette', role: 'Structurer la paume', description: 'Les cinq métacarpiens relient le poignet aux doigts et forment la charpente de la paume.', source: sources.arm, keywords: ['main', 'paume'], gender: 'm' },
  { match: /carpal|scaphoid|lunate|triquetr|pisiform|trapez|capitate|hamate/, name: 'Os du carpe', system: 'Squelette', role: 'Articuler le poignet', description: 'Huit petits os répartis en deux rangées forment le carpe, entre l’avant-bras et la main.', source: sources.arm, keywords: ['main', 'poignet'] },
  { match: /hip bone|coxal|pelvi|ilium|ischium|pubis/, name: 'Os coxal', system: 'Squelette', role: 'Transmettre le poids vers les jambes', description: 'Avec son homologue et le sacrum, il forme le bassin. Il protège les organes pelviens et accueille la tête du fémur.', source: sources.pelvis, keywords: ['bassin', 'hanche', 'pelvis'], gender: 'm' },
  { match: /femur/, name: 'Fémur', system: 'Squelette', role: 'Porter la cuisse', description: 'Le fémur relie la hanche au genou et transmet le poids du corps vers la jambe.', source: sources.leg, keywords: ['cuisse', 'jambe', 'hanche'], gender: 'm' },
  { match: /patella/, name: 'Patella', system: 'Squelette', role: 'Faciliter l’extension du genou', description: 'Aussi appelée rotule, elle se trouve dans le tendon à l’avant du genou.', source: sources.leg, keywords: ['rotule', 'genou'], gender: 'f' },
  { match: /tibia/, name: 'Tibia', system: 'Squelette', role: 'Supporter le poids dans la jambe', description: 'Le tibia est le principal os porteur entre le genou et la cheville.', source: sources.leg, keywords: ['jambe', 'genou', 'cheville'], gender: 'm' },
  { match: /fibula/, name: 'Fibula', system: 'Squelette', role: 'Stabiliser la cheville', description: 'Anciennement appelée péroné, elle longe le tibia sur le côté extérieur de la jambe.', source: sources.leg, keywords: ['péroné', 'jambe', 'cheville'], gender: 'f' },
  { match: /calcaneus|calcaneum/, name: 'Calcanéus', system: 'Squelette', role: 'Former le talon', description: 'Le plus volumineux des os du pied reçoit l’attache du tendon d’Achille.', source: sources.leg, keywords: ['pied', 'talon'], gender: 'm' },
  { match: /metatars/, name: 'Métatarsien', system: 'Squelette', role: 'Structurer l’avant du pied', description: 'Les cinq métatarsiens relient le tarse aux orteils.', source: sources.leg, keywords: ['pied', 'orteil'], gender: 'm' },
  { match: /tarsal|talus|navicular|cuboid|cuneiform/, name: 'Os du tarse', system: 'Squelette', role: 'Soutenir l’arrière du pied', description: 'Le tarse relie la jambe à l’avant-pied et contribue aux appuis de la marche.', source: sources.leg, keywords: ['pied', 'cheville'] },
  { match: /phalanx|phalange/, name: 'Phalange', system: 'Squelette', role: 'Articuler les doigts ou les orteils', description: 'Les phalanges sont les petits os alignés dans les doigts et les orteils.', source: sources.arm, keywords: ['doigt', 'orteil', 'main', 'pied'], gender: 'f' },
]

const ordinalNumbers: Record<string, string> = { first: '1', second: '2', third: '3', fourth: '4', fifth: '5', sixth: '6', seventh: '7', eighth: '8', ninth: '9', tenth: '10', eleventh: '11', twelfth: '12' }
const normalize = (name: string) => name.toLowerCase().replace(/[_.-]/g, ' ').replace(/\b(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|eleventh|twelfth)\b/g, (word) => ordinalNumbers[word]).replace(/\s+/g, ' ').trim()

const preciseBoneNames: [RegExp, string][] = [
  [/sphenoid/, 'Os sphénoïde'], [/ethmoid/, 'Os ethmoïde'], [/zygomatic/, 'Os zygomatique'],
  [/nasal bone/, 'Os nasal'], [/lacrimal/, 'Os lacrymal'], [/palatine/, 'Os palatin'], [/vomer/, 'Vomer'],
  [/nasal concha/, 'Cornet nasal inférieur'], [/scaphoid/, 'Scaphoïde'], [/lunate/, 'Lunatum'],
  [/triquetr/, 'Triquétrum'], [/pisiform/, 'Pisiforme'], [/trapezium/, 'Trapèze'], [/trapezoid/, 'Trapézoïde'],
  [/capitate/, 'Capitatum'], [/hamate/, 'Hamatum'], [/talus/, 'Talus'], [/navicular/, 'Naviculaire'],
  [/cuboid/, 'Cuboïde'], [/medial cuneiform/, 'Cunéiforme médial'], [/intermediate cuneiform/, 'Cunéiforme intermédiaire'], [/lateral cuneiform/, 'Cunéiforme latéral'],
]

/** Match source terminology without changing mesh IDs, which remain owned by the asset manifest. */
function describeKnownStructure(originalName: string, group: string): AnatomyDescription {
  const normalized = normalize(originalName)
  const rule = rules.find((candidate) => candidate.match.test(normalized))
  if (rule) {
    let name = preciseBoneNames.find(([pattern]) => pattern.test(normalized))?.[1] ?? rule.name
    const side = /\bleft\b/.test(normalized) || /[_.]l$/i.test(originalName) ? 'gauche' : /\bright\b/.test(normalized) || /[_.]r$/i.test(originalName) ? (rule.gender === 'f' ? 'droite' : 'droit') : ''
    if ((rule.gender || rule.name === 'Os du carpe' || rule.name === 'Os du tarse') && side) name += ` ${side}`
    if (rule.name === 'Métacarpien' || rule.name === 'Métatarsien') {
      const number = normalized.match(/\d+/)?.[0]
      if (number) name += ` · ${number}`
    }
    if (rule.name === 'Phalange') {
      const segment = /proximal/.test(normalized) ? 'proximale' : /middle phalan|intermediate/.test(normalized) ? 'intermédiaire' : /distal/.test(normalized) ? 'distale' : ''
      const digit = /thumb/.test(normalized) ? 'du pouce' : /index/.test(normalized) ? 'de l’index' : /middle finger/.test(normalized) ? 'du majeur' : /ring/.test(normalized) ? 'de l’annulaire' : /little finger/.test(normalized) ? 'de l’auriculaire' : /big toe|great toe/.test(normalized) ? 'du gros orteil' : /toe/.test(normalized) ? 'de l’orteil' : /finger/.test(normalized) ? 'du doigt' : ''
      const number = normalized.match(/\d+/)?.[0]
      name = ['Phalange', segment, digit, side ? `(${side})` : '', number ? `· ${number}` : ''].filter(Boolean).join(' ')
    }
    if (rule.name === 'Côte') {
      const ribNumber = normalized.match(/(?:rib\s*(\d+)|(\d+)(?:st|nd|rd|th)?\s*rib)/)
      if (ribNumber) name += ` · ${ribNumber[1] || ribNumber[2]}`
    }
    if (rule.name === 'Vertèbre') {
      const region = /cervical/.test(normalized) ? 'cervicale' : /thoracic/.test(normalized) ? 'thoracique' : /lumbar/.test(normalized) ? 'lombaire' : ''
      const number = normalized.match(/\d+/)?.[0]
      if (region) name += ` ${region}`
      if (number) name += ` ${number}`
      if (/\batlas\b/.test(normalized)) name = 'Atlas · C1'
      if (/\baxis\b/.test(normalized)) name = 'Axis · C2'
    }
    return { name, system: rule.system, role: rule.role, description: rule.description, fact: rule.fact, source: rule.source, keywords: [...rule.keywords, originalName] }
  }

  // Unknown source names are kept searchable; the interface never invents a specific identification.
  const isSkeleton = /skeleton|skelet|bone|os/.test(group.toLowerCase())
  return {
    name: isSkeleton ? 'Structure du squelette' : 'Structure anatomique',
    system: isSkeleton ? 'Squelette' : 'Anatomie générale',
    role: 'Situer la structure dans le corps',
    description: 'Explorez sa forme et sa position. La fiche détaillée de cette structure n’est pas encore disponible dans cette première édition.',
    source: isSkeleton ? sources.spine : sources.skin,
    keywords: [originalName],
  }
}

/** French labels cover every shipped structure; source names stay in the manifest. */
export function translateAnatomyName(original: string): string | null {
  return (frenchLabels as Record<string, string>)[original] ?? (femaleLabels as Record<string,string>)[original] ?? null
}
const generalDescriptions: Record<string, Omit<AnatomyDescription, 'name' | 'keywords'>> = {
  muscles: {system:'Système musculaire', role:'Produire une force et accompagner le mouvement', description:'Un muscle squelettique se contracte et transmet une force à ses attaches. Selon sa position, il contribue aux mouvements ou au maintien d’une posture. Ce repère décrit le groupe musculaire ; les actions précises de ce muscle ne sont pas détaillées dans cette fiche.',source:openStax('11-2-naming-skeletal-muscles','Muscles squelettiques')},
  arteries: {system:'Réseau artériel',role:'Conduire le sang depuis le cœur',description:'Les artères distribuent le sang depuis le cœur vers les territoires du corps. Leurs branches deviennent progressivement plus fines. Cette fiche donne un repère général ; elle ne détaille pas le territoire propre à cette branche.',source:openStax('20-1-structure-and-function-of-blood-vessels','Vaisseaux sanguins')},
  veins: {system:'Réseau veineux',role:'Ramener le sang vers le cœur',description:'Les veines recueillent le sang provenant des tissus et le ramènent vers le cœur. Le trajet visible permet d’observer leurs relations avec les structures voisines. Les particularités de cette branche ne sont pas détaillées ici.',source:openStax('20-1-structure-and-function-of-blood-vessels','Vaisseaux sanguins')},
  nerves: {system:'Système nerveux',role:'Transmettre des informations nerveuses',description:'Les nerfs relient des régions du corps au système nerveux central. Ils transportent des informations sensitives ou des commandes motrices selon les fibres présentes. Cette fiche générale ne précise pas la fonction de chaque faisceau.',source:openStax('13-4-the-peripheral-nervous-system','Système nerveux périphérique')},
  joints: {system:'Articulations et tissus de soutien',role:'Relier, stabiliser ou accompagner une articulation',description:'Les cartilages, ligaments et autres tissus de soutien participent à l’organisation des articulations. Leur rôle dépend de leur nature et de leur emplacement. Cette fiche fournit un repère de groupe ; la fonction exacte de cette structure n’est pas détaillée.',source:openStax('9-1-classification-of-joints','Articulations')},
}
const descriptionCache = new Map<string, AnatomyDescription>()
export function describeStructure(originalName: string, group: string): AnatomyDescription {
  const key = `${group}:${originalName}`
  const cached = descriptionCache.get(key)
  if (cached) return cached
  const known = describeKnownStructure(originalName, group)
  const translated = translateAnatomyName(originalName)
  const generic = generalDescriptions[group]
  const result: AnatomyDescription = {
    ...(generic ?? known),
    name: translated ?? known.name,
    keywords: [...known.keywords, originalName, group, generic?.system ?? '', translated ?? ''],
  }
  // Keep the accessible everyday names for these whole structures.
  if (/^(skin|heart|brain|right lung|left lung|liver|stomach|pancreas|small intestine|large intestine|right kidney|left kidney|urinary bladder)$/.test(originalName)) result.name = known.name
  descriptionCache.set(key, result)
  return result
}
