import type {Question} from './questions'
type Exercise=[statement:string,correct:boolean,explanation:string]
const practice:Record<string,{topic:string;items:Exercise[]}>= {
 orientation:{topic:'Anatomie appliquée',items:[
 ['Le coude peut être distal à l’épaule tout en étant proximal au poignet.',true,'Proximal et distal expriment une relation avec un repère. Le point de comparaison change entre les deux propositions.'],
 ['Deux coupes sagittales parallèles montrent nécessairement les mêmes structures.',false,'Elles appartiennent à la même famille de plans, mais leur position diffère. Une coupe médiane et une coupe latérale ne traversent pas les mêmes éléments.'],
 ['Faire pivoter le corps de face à dos inverse les côtés anatomiques droit et gauche.',false,'La rotation change le point de vue de l’observateur, pas les côtés du sujet. Les relations anatomiques restent définies dans le repère du sujet.']]},
 homeostasis:{topic:'Physiologie',items:[
 ['Une variable peut fluctuer tout en restant régulée.',true,'L’homéostasie est dynamique. La régulation agit dans le temps et n’impose pas une valeur rigoureusement immobile.'],
 ['Un capteur qui détecte une variation réalise forcément lui-même la correction.',false,'La détection et l’action effectrice sont deux fonctions distinctes. Il faut identifier l’effecteur plutôt que les confondre.'],
 ['Pour expliquer complètement une boucle positive, il faut aussi préciser ce qui termine son amplification.',true,'L’amplification ne décrit pas son arrêt. Une limite ou un événement termine le processus dans les exemples physiologiques considérés.']]},
 membrane:{topic:'Biologie cellulaire',items:[
 ['Pour prédire le déplacement passif d’un ion, sa concentration suffit toujours.',false,'La charge électrique compte aussi. Le gradient électrochimique combine les contributions chimique et électrique.'],
 ['Dans un cotransport actif secondaire, un soluté peut suivre son gradient et fournir l’énergie du transport d’un autre.',true,'Le déplacement favorable est couplé au déplacement défavorable. Le gradient moteur doit être entretenu par d’autres mécanismes.'],
 ['La présence d’un transporteur membranaire démontre une consommation directe d’ATP par ce transport.',false,'La diffusion facilitée utilise un transporteur ou un canal sans hydrolyse directe d’ATP. Le mécanisme et le gradient doivent être précisés.']]},
 tissues:{topic:'Histologie',items:[
 ['La forme des cellules et le nombre de couches contribuent à décrire un épithélium.',true,'Ces critères décrivent son organisation. Les spécialisations et la localisation complètent ensuite l’interprétation fonctionnelle.'],
 ['La matrice extracellulaire est sans importance pour les propriétés d’un tissu conjonctif.',false,'Sa composition et l’organisation de ses fibres contribuent fortement aux propriétés mécaniques et au rôle du tissu.'],
 ['Une fonction dominante de contraction implique que l’organe ne contient aucun tissu nerveux.',false,'Un organe contractile associe plusieurs tissus, notamment pour la commande, les échanges et le soutien. Une fonction dominante n’est pas exclusive.']]},
 organelles:{topic:'Biologie cellulaire',items:[
 ['Une protéine détectée dans le réticulum mais absente à la surface peut présenter un défaut de transport ultérieur.',true,'Sa présence prouve qu’elle a commencé à être produite. Les étapes de maturation et de transport doivent ensuite être explorées.'],
 ['Toutes les protéines cellulaires doivent passer par le Golgi avant de fonctionner.',false,'Le trajet réticulum-Golgi concerne notamment la voie sécrétoire. Des protéines destinées au cytosol n’empruntent pas systématiquement ce trajet.'],
 ['Une augmentation du nombre de mitochondries suffit à identifier avec certitude le type d’une cellule.',false,'C’est un indice de besoins métaboliques. Il faut le combiner avec la forme, la localisation et d’autres caractéristiques.']]},
 'gene-expression':{topic:'Génétique',items:[
 ['L’épissage d’un pré-ARN supprime les introns correspondants dans l’ADN du gène.',false,'L’opération porte sur l’ARN. Elle ne découpe pas l’ADN du gène à chaque maturation d’un transcrit.'],
 ['Pour interpréter une séquence, il faut préciser s’il s’agit d’un ARN ou d’un brin d’ADN et son orientation.',true,'Nature et orientation déterminent la lecture. Pour l’ADN, distinguer brin matrice et brin codant évite une mauvaise transcription.'],
 ['Une modification d’un acide aminé prouve à elle seule une perte totale de fonction.',false,'L’effet dépend notamment de la position et du rôle de la région concernée. La variation de séquence et la conséquence fonctionnelle sont deux niveaux distincts.']]},
 'cell-cycle':{topic:'Génétique',items:[
 ['La phase S augmente la quantité d’ADN avant la séparation des chromatides sœurs.',true,'La réplication précède la distribution mitotique. En G2, chaque chromosome possède deux chromatides reliées.'],
 ['Une cellule en G0 est nécessairement une cellule morte.',false,'G0 correspond à une sortie du cycle prolifératif. La cellule peut continuer à exercer des fonctions spécialisées.'],
 ['Une réduction du nombre de cellules après une expérience prouve uniquement un défaut de réplication.',false,'Le résultat peut aussi dépendre d’un arrêt de cycle, d’un ralentissement ou d’une perte cellulaire. Une observation supplémentaire est nécessaire.']]},
 'neuronal-signal':{topic:'Neurophysiologie',items:[
 ['Une réponse postsynaptique peut modifier le potentiel sans atteindre le seuil de déclenchement.',true,'Les signaux gradués n’atteignent pas obligatoirement le seuil. Leur intégration participe à la décision de déclenchement.'],
 ['La courbe d’un potentiel d’action en un point représente directement le trajet spatial d’un ion le long de tout l’axone.',false,'Elle montre l’évolution du potentiel en fonction du temps au point étudié. Un axe temporel n’est pas un axe de distance.'],
 ['Un potentiel arrivant à la terminaison présynaptique garantit toujours une réponse postsynaptique normale.',false,'La libération du médiateur et le fonctionnement des récepteurs sont encore nécessaires. Ces étapes peuvent être perturbées séparément.']]},
 'muscle-contraction':{topic:'Physiologie',items:[
 ['Un sarcomère peut raccourcir alors que les longueurs de ses filaments restent constantes.',true,'Le changement de chevauchement rapproche les stries Z. C’est le modèle de glissement des filaments.'],
 ['La relaxation est indépendante de toute utilisation d’ATP.',false,'La recapture du calcium mobilise des pompes utilisant de l’ATP. La fixation d’ATP intervient aussi dans le détachement actine-myosine.'],
 ['Un défaut des protéines contractiles peut empêcher la force malgré la présence d’un signal électrique.',true,'Excitation, libération du calcium et fonctionnement des protéines constituent des étapes distinctes de la chaîne.']]},
 blood:{topic:'Hématologie',items:[
 ['Avec 40 unités de volume globulaire et 40 de plasma, la fraction globulaire vaut 50 %.',true,'Le volume total est 80 et la fraction est 40/80 = 0,5. L’exercice porte sur une proportion, pas sur un diagnostic.'],
 ['Une hausse de l’hématocrite prouve toujours une augmentation de la production de globules rouges.',false,'Une diminution du plasma peut augmenter la fraction sans production globulaire supplémentaire. Numérateur et dénominateur comptent.'],
 ['Un nombre de cellules circulantes dépend à la fois de leur production et de leur disparition.',true,'La quantité observée résulte d’un bilan. Elle ne mesure pas directement une seule composante du renouvellement.']]},
 hemodynamics:{topic:'Biophysique',items:[
 ['Si ΔP et R doublent simultanément, Q reste identique dans le modèle Q = ΔP/R.',true,'Le numérateur et le dénominateur sont multipliés par le même facteur. Leur rapport est donc inchangé.'],
 ['À débit constant, doubler la section totale traversée double la vitesse moyenne.',false,'Le débit est le produit de la section et de la vitesse moyenne. À débit constant, une section doublée divise la vitesse par deux.'],
 ['Une hausse du débit total impose la même hausse de débit dans chaque organe.',false,'Le réseau peut redistribuer les flux. Un débit total ne décrit pas directement la répartition entre tous les territoires.']]},
 ventilation:{topic:'Physiologie',items:[
 ['Avec 250 mL courants, 150 mL d’espace mort et 24 cycles/min, la ventilation alvéolaire vaut 2,4 L/min.',true,'(250 − 150) × 24 = 2 400 mL/min. La ventilation minute totale est 6 L/min, ce qui est une grandeur différente.'],
 ['Deux ventilations minutes identiques imposent deux ventilations alvéolaires identiques.',false,'La répartition entre volume courant et fréquence influence la part ventilant l’espace mort. Il faut calculer le volume utile.'],
 ['Quand la pression alvéolaire égale la pression atmosphérique, le flux d’air peut être nul malgré un volume pulmonaire non nul.',true,'Le flux dépend du gradient de pression, pas de la seule présence d’air dans les poumons.']]},
 'fluid-balance':{topic:'Physiologie',items:[
 ['Le plasma est un liquide intracellulaire puisqu’il se trouve à l’intérieur des vaisseaux.',false,'Le repère est la cellule. Le plasma se trouve dans les vaisseaux mais hors des cellules : il est extracellulaire.'],
 ['Un bilan d’eau négatif sur une période signifie que les sorties dépassent les entrées sur cette période.',true,'C’est la définition du bilan négatif. Cela ne donne pas à lui seul toutes les concentrations des électrolytes.'],
 ['Toute l’eau filtrée par le rein est nécessairement perdue dans l’urine finale.',false,'Une grande partie peut être réabsorbée. La filtration est une étape initiale ; elle ne correspond pas à l’excrétion définitive.']]},
 endocrine:{topic:'Endocrinologie',items:[
 ['Un récepteur et une hormone circulante représentent deux étapes différentes d’une même chaîne de signalisation.',true,'Le message doit être disponible puis reconnu et traité par la cible. Une mesure hormonale ne décrit pas toutes ces étapes.'],
 ['Dans une boucle négative, une hormone en aval peut augmenter tandis qu’une stimulation en amont diminue.',true,'L’augmentation en aval peut exercer un frein rétroactif sur sa stimulation. Toutes les composantes ne varient pas dans le même sens.'],
 ['L’amplification intracellulaire signifie que le signal ne peut jamais être arrêté.',false,'Une cascade peut amplifier le signal tout en possédant des mécanismes d’arrêt et de régulation.']]},
 immunity:{topic:'Immunologie',items:[
 ['Un anticorps est une cellule spécialisée issue d’un lymphocyte B.',false,'L’anticorps est une molécule. Le plasmocyte est la cellule spécialisée qui en sécrète.'],
 ['L’activation de l’immunité adaptative supprime tout rôle des mécanismes innés.',false,'Les deux ensembles coopèrent. La présentation de l’antigène et les signaux cellulaires relient notamment leurs activités.'],
 ['La sélection et l’expansion clonales contribuent à mobiliser les lymphocytes adaptés à un antigène.',true,'La reconnaissance sélectionne des clones et leur prolifération augmente leur nombre avant les fonctions effectrices.']]},
 metabolism:{topic:'Biochimie',items:[
 ['Deux quantités de produit accumulées à des durées différentes permettent seules de comparer des vitesses enzymatiques.',false,'Il faut tenir compte du temps et des autres conditions. Une accumulation supérieure peut simplement refléter une mesure plus longue.'],
 ['Une enzyme peut transformer plusieurs molécules de substrat successivement.',true,'Le catalyseur n’est pas consommé à chaque cycle. Il peut donc être réutilisé au cours du temps.'],
 ['Une cellule utilise l’ATP sans devoir le régénérer.',false,'L’ATP est consommé et renouvelé continuellement. Ce n’est pas une réserve énergétique infinie.']]},
 FMA7088:{topic:'Cardiovasculaire',items:[
 ['Le sang revenant des poumons par les veines pulmonaires rejoint l’atrium gauche.',true,'Ce retour alimente le côté gauche avant l’éjection dans la circulation systémique. Le sens du flux définit ici les veines.'],
 ['Les valves cardiaques sont des pompes musculaires qui fournissent l’essentiel de la propulsion.',false,'La propulsion vient du myocarde. Les valves orientent le flux selon les différences de pression.'],
 ['Un tracé électrique, une pression ventriculaire et un débit mesurent exactement la même grandeur.',false,'Ils décrivent des événements liés mais distincts. Il faut identifier les axes et les unités avant de les interpréter.']]},
 FMA7309:{topic:'Respiratoire',items:[
 ['Le poumon droit possède normalement trois lobes, le gauche deux.',true,'Cette asymétrie anatomique est un repère de base pour orienter l’observation des poumons.'],
 ['Le sang circule normalement librement dans la lumière des alvéoles pour y capter l’air.',false,'L’air et le sang sont séparés par la barrière alvéolocapillaire. Les gaz la franchissent par diffusion.'],
 ['La présence d’un poumon bien visible dans un atlas suffit à mesurer sa ventilation.',false,'L’atlas montre l’anatomie. La ventilation est une fonction dynamique qui nécessite d’autres données.']]},
 FMA7197:{topic:'Digestif',items:[
 ['La bile est une enzyme découpant elle-même tous les nutriments.',false,'La bile contribue notamment à la dispersion des lipides. Elle ne remplace pas les enzymes de digestion chimique.'],
 ['Production et stockage de bile doivent être attribués à des fonctions distinctes.',true,'Le foie produit la bile ; la vésicule la stocke et la concentre. Les conduits assurent son acheminement.'],
 ['Le foie est uniquement un conduit entre l’intestin et la circulation générale.',false,'Il réalise des transformations, des synthèses et des stockages. Son rôle métabolique dépasse un simple passage.']]},
 FMA7148:{topic:'Digestif',items:[
 ['Un contenu brassé dans l’estomac a nécessairement déjà franchi la paroi digestive.',false,'Le brassage a lieu dans la lumière. L’absorption implique un franchissement de paroi et constitue une autre étape.'],
 ['La région pylorique conduit le contenu gastrique vers le duodénum.',true,'Elle correspond à la sortie de l’estomac vers la portion initiale de l’intestin grêle.'],
 ['Comprendre l’estomac demande d’étudier à la fois la digestion et la protection de sa muqueuse.',true,'L’action du contenu digestif et les mécanismes protecteurs de la paroi sont complémentaires.']]},
 FMA7198:{topic:'Digestif',items:[
 ['L’insuline emprunte normalement les conduits exocrines pour agir dans la lumière du duodénum.',false,'L’insuline est une hormone endocrine libérée vers le milieu intérieur. La voie duodénale concerne les sécrétions exocrines.'],
 ['Les cellules bêta pancréatiques sécrètent l’insuline.',true,'Les cellules bêta des îlots sont associées à cette hormone ; les cellules alpha sont associées au glucagon.'],
 ['Une sécrétion fabriquée mais mal acheminée impose de distinguer production et transport.',true,'Un défaut de destination ne prouve pas une absence de synthèse. Il faut examiner la voie de sortie.']]},
 FMA7200:{topic:'Digestif',items:[
 ['Une villosité et une microvillosité correspondent au même niveau d’organisation.',false,'La villosité est un relief tissulaire. La microvillosité est une spécialisation de surface d’une cellule.'],
 ['Le repliement des anses change l’ordre duodénum, jéjunum, iléon.',false,'Il modifie leur disposition spatiale, pas la succession dans la continuité du tube digestif.'],
 ['Une molécule digérée mais encore dans la lumière intestinale n’est pas encore absorbée.',true,'La digestion transforme la molécule ; l’absorption lui fait franchir la paroi vers le milieu intérieur.']]},
 FMA7204:{topic:'Urinaire',items:[
 ['Avec 100 unités filtrées, 80 réabsorbées et 5 sécrétées, on excrète 25 unités.',true,'Le bilan est 100 − 80 + 5 = 25, pour une même substance et une même période.'],
 ['La réabsorption tubulaire déplace une substance du sang vers la lumière du tubule.',false,'C’est le sens de la sécrétion. La réabsorption ramène une substance du tubule vers le sang.'],
 ['On peut additionner directement une concentration et une quantité pour calculer l’excrétion.',false,'Les grandeurs doivent être cohérentes. Une concentration doit être reliée à un volume pour obtenir une quantité.']]},
 FMA50801:{topic:'Nerveux',items:[
 ['Le cortex est une couche superficielle de substance grise, mais toute la substance grise n’est pas superficielle.',true,'Des régions grises existent aussi en profondeur. Il faut distinguer organisation corticale et noyaux profonds.'],
 ['Une fonction complexe comme saisir un objet repose nécessairement sur une zone cérébrale unique et indépendante.',false,'Réception sensorielle, intégration, planification et commande mobilisent des réseaux en interaction.'],
 ['Zoomer davantage dans l’atlas révèle automatiquement chaque neurone du cerveau.',false,'Le zoom agrandit le maillage disponible. Il ne crée pas des structures microscopiques absentes du modèle.']]},
 FMA24474:{topic:'Locomoteur',items:[
 ['Les condyles fémoraux sont à l’extrémité proximale, du côté de la hanche.',false,'Les condyles sont distaux et participent au genou. La tête du fémur est proximale.'],
 ['L’os spongieux est organisé en travées.',true,'Cette organisation diffère des régions compactes et participe à l’architecture interne de l’os.'],
 ['Une vue isolée et une vue en contexte apportent des informations complémentaires sur le fémur.',true,'L’isolation facilite les reliefs propres de l’os ; le contexte montre ses rapports avec les structures voisines.']]},
}
export const reasoningQuestions:Question[]=Object.entries(practice).flatMap(([course,bank])=>bank.items.map(([prompt,correct,explanation],i)=>({id:course+'-reasoning-'+(i+1),course,topic:bank.topic,prompt,options:['Vrai','Faux'],correct:[correct?0:1],why:[(correct?'Exact. ':'Non. ')+explanation,(correct?'Non. ':'Exact. ')+explanation],difficulty:'application',format:'boolean'})))
