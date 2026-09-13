type Point={name:string;detail:string;x:number;y:number}
type Plate={title:string;caption:string;points:Point[]}
export const medicalPlates:Record<string,Plate>={
 'phys-cardiac-cycle':{title:'La boucle pression-volume du ventricule gauche',caption:'Tracé pédagogique : volume en mL, pression en mmHg. Les quatre repères suivent les transitions valvulaires dans le sens antihoraire. Les valeurs sont illustratives.',points:[
 {name:'Ouverture de la mitrale',x:180,y:320,detail:'La pression ventriculaire devient inférieure à la pression atriale. Le remplissage commence au volume télésystolique ; le tracé part vers la droite.'},
 {name:'Fermeture de la mitrale',x:470,y:300,detail:'Le remplissage atteint le volume télédiastolique. La pression ventriculaire dépasse la pression atriale : la mitrale se ferme et la contraction isovolumétrique commence.'},
 {name:'Ouverture de la valve aortique',x:470,y:140,detail:'La pression ventriculaire dépasse la pression aortique. L’éjection fait diminuer le volume ; le tracé se dirige vers la gauche.'},
 {name:'Fermeture de la valve aortique',x:180,y:100,detail:'La pression ventriculaire devient inférieure à la pression aortique. La valve se ferme. La relaxation isovolumétrique suit, verticalement vers le bas.'}]},
 'phys-renal':{title:'Néphron : distinguer le filtrat et le sang',caption:'Schéma fonctionnel simplifié, non à l’échelle. Bleu : liquide tubulaire ; rouge : réseau sanguin ; vert : récupération vers le milieu intérieur. Les trajets sont déployés pour la lecture.',points:[
 {name:'Glomérule et capsule',x:125,y:100,detail:'Le plasma est filtré à travers la barrière glomérulaire vers l’espace capsulaire. Le sang reste dans les capillaires et ressort par l’artériole efférente.'},
 {name:'Tubule proximal',x:250,y:110,detail:'Il récupère une grande part du sodium et de l’eau filtrés. Les cotransports apicaux utilisent notamment le gradient entretenu par la Na+/K+-ATPase basolatérale.'},
 {name:'Branche descendante',x:285,y:270,detail:'Elle est perméable à l’eau. Le gradient médullaire peut faire sortir de l’eau du tubule ; le filtrat se concentre le long du trajet.'},
 {name:'Branche ascendante',x:365,y:270,detail:'La portion épaisse récupère des sels mais est très peu perméable à l’eau. Elle contribue au gradient médullaire et dilue le liquide tubulaire.'},
 {name:'Tube collecteur',x:520,y:270,detail:'L’ADH augmente la perméabilité à l’eau de ce segment. La récupération dépend aussi du gradient médullaire disponible.'}]},
 ventilation:{title:'Alvéole et capillaire : deux flux, une barrière',caption:'Coupe schématique sans échelle. Le capillaire est représenté en rose. Les flèches montrent le sens habituel des échanges gazeux selon les gradients de pression partielle.',points:[
 {name:'Air alvéolaire',x:305,y:105,detail:'La ventilation renouvelle l’air. Son débit utile dépend du volume courant, de la fréquence et de l’espace mort.'},
 {name:'Barrière alvéolocapillaire',x:190,y:240,detail:'Les gaz diffusent à travers une paroi très fine. Une augmentation d’épaisseur ou une réduction de surface diminue le transfert, à autres conditions comparables.'},
 {name:'Oxygène vers le sang',x:267,y:290,detail:'Dans la situation habituelle, la pression partielle en O₂ est plus élevée dans l’alvéole que dans le sang entrant. L’oxygène diffuse vers le sang.'},
 {name:'Dioxyde de carbone vers l’alvéole',x:425,y:255,detail:'Le CO₂ suit son propre gradient de pression partielle, du sang vers l’air alvéolaire. Il sera éliminé avec la ventilation.'},
 {name:'Sang capillaire',x:505,y:335,detail:'La perfusion apporte le sang. L’hémoglobine en transporte une grande partie de l’oxygène ; contenu et pression partielle restent deux grandeurs différentes.'}]},
 'embryo-weeks-one-three':{title:'Gastrulation : les cellules changent de position',caption:'Coupe transversale conceptuelle au niveau de la ligne primitive. Les flèches représentent l’ingression de cellules épiblastiques : elles mettent en place endoderme définitif puis mésoderme. Le dessin ne constitue pas une coupe histologique.',points:[
 {name:'Épiblaste restant : ectoderme',x:150,y:130,detail:'Les cellules demeurant à la surface de l’épiblaste deviennent l’ectoderme. Elles ont la même origine épiblastique que les cellules qui ont migré.'},
 {name:'Ingression par la ligne primitive',x:320,y:155,detail:'Des cellules de l’épiblaste convergent et ingressent. Leur déplacement établit des couches nouvelles, pas de simples espaces entre des tissus préexistants.'},
 {name:'Mésoderme intraembryonnaire',x:455,y:235,detail:'Une partie des cellules ingressées se place entre ectoderme et endoderme. Les régions de ce feuillet auront des devenirs distincts.'},
 {name:'Endoderme définitif',x:185,y:295,detail:'Des cellules de l’épiblaste ingressent et remplacent l’hypoblaste au niveau du disque embryonnaire. L’endoderme définitif ne doit pas être confondu avec l’hypoblaste initial.'}]},
 'immuno-adaptive':{title:'Reconnaître, activer, puis produire des effecteurs',caption:'Interactions cellulaires simplifiées. À gauche : reconnaissance peptide-CMH II par un T CD4. À droite : reconnaissance de l’antigène natif par un B, puis plasmocyte. L’aide T aux B est représentée par une flèche fonctionnelle.',points:[
 {name:'Cellule présentatrice d’antigène',x:100,y:155,detail:'Une cellule dendritique peut présenter un peptide aux lymphocytes naïfs, avec co-stimulation et cytokines. Capter un antigène ne garantit pas à soi seul une activation.'},
 {name:'Peptide-CMH II et TCR',x:230,y:185,detail:'Le TCR reconnaît le complexe peptide-CMH. Le corécepteur CD4 accompagne la reconnaissance du CMH II dans le schéma classique.'},
 {name:'Lymphocyte T CD4',x:320,y:155,detail:'La reconnaissance, la co-stimulation et les cytokines déterminent l’activation. Certains effecteurs CD4 apportent ensuite une aide aux lymphocytes B.'},
 {name:'Lymphocyte B et BCR',x:520,y:115,detail:'Le BCR reconnaît une forme native de l’antigène. L’aide T favorise de nombreuses réponses contre les antigènes protéiques.'},
 {name:'Plasmocyte sécréteur',x:505,y:320,detail:'Le plasmocyte est une cellule différenciée qui sécrète des anticorps. Les petites formes en Y représentent les molécules libérées, pas de nouveaux lymphocytes.'}]}
}
