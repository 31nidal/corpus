"""French labels for HRA nodes, preserving the source nomenclature in provenance."""
from pathlib import Path
import json,re
ROOT=Path(__file__).resolve().parents[1]
p=ROOT/'scripts/complete-french.py';env={'__file__':str(p)}
exec(p.read_text().split('rows=json.loads')[0],env)
pairs='''female pelvic region|Bassin féminin
female reproductive organs|Appareil reproducteur féminin
mammary glands|Seins et glandes mammaires
skin of body|Enveloppe corporelle
interlobar adipose tissue of mammary gland|Tissu adipeux interlobaire mammaire
areolar tubercle|Tubercule aréolaire
female areola|Aréole mammaire
mammary lobe|Lobe mammaire
main lactiferous duct|Conduit lactifère principal
lactiferous sinus|Sinus lactifère
macula lutea|Macula rétinienne
scleral venous sinus|Sinus veineux de la sclère
eye trabecular meshwork|Réseau trabéculaire de l’œil
humor of vitreous body|Humeur vitrée
dura mater|Dure-mère
optic chiasma|Chiasma optique
piriform cortex|Cortex piriforme
frontal agranular insular cortex area fl|Cortex insulaire agranulaire frontal, aire FL
temporal agranular insular cortex area tl|Cortex insulaire agranulaire temporal, aire TL
head of caudate|Tête du noyau caudé
body of caudate|Corps du noyau caudé
tail of caudate|Queue du noyau caudé
amygdaloid complex|Complexe amygdalien
anterior amygdaloid area|Aire amygdalienne antérieure
central nuclear group|Groupe nucléaire central
lateral nucleus|Noyau latéral
basolateral nucleus basal nucleus|Noyau basolatéral, noyau basal
basomedial nucleus accessory basal nucleus|Noyau basomédial, noyau basal accessoire
anterior cortical nucleus|Noyau cortical antérieur
posterior cortical nucleus|Noyau cortical postérieur
medial nucleus|Noyau médial
amygdalohippocampal area|Aire amygdalohippocampique
anterior nuclear complex of thalamus|Complexe nucléaire antérieur du thalamus
reuniens nucleus medioventral nucleus of thalamus|Noyau reuniens, noyau médioventral du thalamus
ventral lateral nucleus of thalamus|Noyau ventral latéral du thalamus
ventral posterior lateral nucleus|Noyau ventral postérolatéral
ventral posterior medial nucleus|Noyau ventral postéromédial
centromedian nucleus of thalamus|Noyau centromédian du thalamus
parafascicular nucleus of thalamus|Noyau parafasciculaire du thalamus
habenular nuclei|Noyaux habénulaires
supraoptic region of hth|Région supraoptique de l’hypothalamus
preoptic region of hth|Région préoptique de l’hypothalamus
tuberal region of hth|Région tubérale de l’hypothalamus
mammillary region of hth|Région mamillaire de l’hypothalamus
mammillothalamic tract|Faisceau mamillothalamique
anterior horn of lateral ventricle|Corne antérieure du ventricule latéral
posterior horn of lateral ventricle|Corne postérieure du ventricule latéral
inferior horn of lateral ventricle|Corne inférieure du ventricule latéral
cerebellar vermis|Vermis cérébelleux
lateral hemisphere of cerebellum|Partie latérale de l’hémisphère cérébelleux
paravermis of cerebellum|Paravermis cérébelleux
cerebellar deep nuclei|Noyaux profonds du cervelet
superior cerebellar peduncle brachium conjunctivum|Pédoncule cérébelleux supérieur
white matter of hindbrain|Substance blanche du rhombencéphale
midbrain tegmentum|Tegmentum du mésencéphale
pontine tegmentum|Tegmentum pontique
pontine nuclear group|Groupe des noyaux pontiques
tegmentum of medulla oblongata|Tegmentum du bulbe rachidien
pyramidal part of medulla oblongata|Partie pyramidale du bulbe rachidien
pretectal region|Région prétectale
piriform region|Région piriforme
midline nuclear complex|Complexe nucléaire médian
posteroventral putamen|Partie postéroventrale du putamen
body of hippocampus|Corps de l’hippocampe
tail of hippocampus|Queue de l’hippocampe
frontomarginal gyrus|Gyrus frontomarginal
gyrus rectus|Gyrus droit
gyrus ambiens|Gyrus ambiens
paracingulate gyrus|Gyrus paracingulaire
rostral gyrus|Gyrus rostral
lateral olfactory gyrus|Gyrus olfactif latéral
short insular gyri|Gyri courts de l’insula
long insular gyri|Gyri longs de l’insula
limen insula|Seuil de l’insula
transverse temporal gyrus heschls gyrus|Gyrus temporal transverse de Heschl
planum polare|Planum polare
planum temporale|Planum temporale
perirhinal gyrus rostral part of fugt|Gyrus périrhinal, partie rostrale du gyrus fusiforme temporal
occipitotemporal fusiform gyrus temporal part|Partie temporale du gyrus fusiforme occipitotemporal
occipital fusiform gyrus|Gyrus fusiforme occipital
paracentral lobule caudal part|Partie caudale du lobule paracentral
supraparietal lobule|Lobule pariétal supérieur
precuneus cortex|Cortex du précuneus
cuneus cortex|Cortex du cunéus
superior occipital gyrus|Gyrus occipital supérieur
inferior occipital gyrus|Gyrus occipital inférieur
uterine cervix|Col de l’utérus
external cervical os|Orifice externe du col utérin
internal cervical os|Orifice interne du col utérin
cervicovaginal junction|Jonction cervicovaginale
lower uterine segment|Segment inférieur de l’utérus
cornua|Cornes utérines
uterovesical pouch|Cul-de-sac vésico-utérin
uterine tube|Trompe utérine
ampulla of uterine tube|Ampoule de la trompe utérine
fimbria of uterine tube|Frange de la trompe utérine
isthmus of uterine tube|Isthme de la trompe utérine
infundibulum of uterine tube|Pavillon de la trompe utérine
ovarian ligament|Ligament propre de l’ovaire
round ligament of uterus|Ligament rond de l’utérus
uterine vein|Veine utérine
capsule of the liver|Capsule du foie
triangular ligament of liver|Ligament triangulaire du foie
esophageal impression of liver|Empreinte œsophagienne du foie
superomedial segment|Segment supéromédial hépatique
inferomedial segment|Segment inféromédial hépatique
anteroinferior segment|Segment antéro-inférieur hépatique
anterosuperior segment|Segment antérosupérieur hépatique
posteroinferior segment|Segment postéro-inférieur hépatique
posterosuperior segment|Segment postérosupérieur hépatique
ucinate process|Processus unciné du pancréas
ventral pancreatic duct|Conduit pancréatique ventral
duodenal ampulla|Ampoule duodénale
hepatic flexure of colon|Angle colique droit, hépatique
splenic flexure of colon|Angle colique gauche, splénique
ileocecal valve|Valve iléocæcale
kidney capsule|Capsule rénale
outer cortex of kidney|Cortex rénal externe
renal column|Colonne rénale
major calyx|Calice rénal majeur
minor calyx|Calice rénal mineur
fundus of urinary bladder|Fond de la vessie
trigone of urinary bladder|Trigone vésical
urinary bladder neck smooth muscle|Muscle lisse du col vésical
ureteral orifice|Orifice urétéral
cardiac atrium|Atrium cardiaque
heart ventricle|Ventricule cardiaque
great vein of heart|Grande veine cardiaque
common carotid artery plus branches|Artère carotide commune et ses branches
middle hepatic artery branch of hepatic artery|Branche hépatique moyenne de l’artère hépatique
posterior ventricular branch of circumflex coronary artery|Branche ventriculaire postérieure de l’artère circonflexe
cystic vein|Veine cystique
ophthalmic vein|Veine ophtalmique
long posterior ciliary artery|Artère ciliaire longue postérieure
lung|Poumons
lung hilus|Hile pulmonaire
lobar bronchus of lung lower lobe|Bronche lobaire inférieure
lobar bronchus of lung upper lobe|Bronche lobaire supérieure
trachea cartilage|Cartilage trachéal
colic surface of spleen|Face colique de la rate
gastric surface of spleen|Face gastrique de la rate
renal surface of spleen|Face rénale de la rate
thymus lobe|Lobe thymique
lymph node follicle|Follicule lymphatique ganglionnaire
lymph node t cell domain|Zone des lymphocytes T du ganglion
lymph vasculature|Réseau lymphatique
afferent lymphatic vessel|Vaisseau lymphatique afférent
efferent lymphatic vessel|Vaisseau lymphatique efférent
fused sacrum|Sacrum fusionné
vertebral bone|Vertèbre
mammalian cervical vertebra|Vertèbre cervicale
compact bone tissue|Tissu osseux compact
trabecular bone tissue|Tissu osseux trabéculaire
articular disk of knee joint|Disque articulaire du genou
anterior cruciate enthesis|Enthèse du ligament croisé antérieur
posterior cruciate enthesis|Enthèse du ligament croisé postérieur
medial epicondylar enthesis|Enthèse épicondylaire médiale
lateral epicondylar enthesis|Enthèse épicondylaire latérale
medial perichondular surface|Surface périchondrale médiale
lateral perichondular surface|Surface périchondrale latérale
medial condyle of femur|Condyle médial du fémur
lateral condyle of femur|Condyle latéral du fémur
patellar surface of femur|Surface patellaire du fémur
distal-most point of medial condyle of femur|Point le plus distal du condyle médial du fémur'''
aliases=dict(line.split('|',1) for line in pairs.splitlines())
numbers={'first':1,'second':2,'third':3,'fourth':4,'fifth':5,'sixth':6,'seventh':7,'eighth':8,'ninth':9,'tenth':10,'eleventh':11,'twelfth':12}
def translate(name):
 direct=env['tr'](name)
 if direct:return direct[0].upper()+direct[1:]
 side='';base=name
 if re.search(r'\bleft\b| l$',base):side=' — côté gauche'
 elif re.search(r'\bright\b| r$',base):side=' — côté droit'
 base=re.sub(r'\b(left|right)\b','',base);base=re.sub(r' [lr]$','',base);base=re.sub(r'\s+',' ',base).strip()
 suffix=re.search(r'\d+$',base);base=re.sub(r'\d+$','',base).strip()
 segment=re.match(r'c(\d) segment of cervical spinal cord',base)
 if segment:return 'Segment médullaire cervical C'+segment[1]+side
 segment=re.match(r'(\w+) (thoracic|lumbar|sacral) spinal cord segment',base)
 if segment:return 'Segment médullaire '+{'thoracic':'thoracique T','lumbar':'lombaire L','sacral':'sacré S'}[segment[2]]+str(numbers[segment[1]])+side
 term=aliases.get(base) or env['tr'](base)
 if term:return term[0].upper()+term[1:]+(' · portion '+suffix[0] if suffix else '')+side
 return None
out={};missing=[]
for s in json.loads((ROOT/'.model-cache/female/manifest.json').read_text())['structures']:
 name=s['name'];value=translate(name)
 if value:out[name]=value
 else:missing.append(name)
print('Female labels:',len(out),'distinct source names;',len(missing),'unresolved')
print('\n'.join(sorted(set(missing))))
if missing:raise RuntimeError('Complete the missing French names before publishing')
out.update({'female pelvic region':'Bassin féminin','female reproductive organs':'Appareil reproducteur féminin','mammary glands':'Seins et glandes mammaires'})
(ROOT/'src/data/female-labels.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
