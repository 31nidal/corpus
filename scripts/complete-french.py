"""Compose French labels from the licensed nomenclature and explicit anatomical equivalents.
Does not change identifiers or source geometry. Fails on untranslated source terms.
"""
import json,re
from pathlib import Path
root=Path(__file__).resolve().parents[1]
d=json.loads((root/'src/data/terminology.json').read_text())
def key(s):return re.sub('[^a-z0-9 ]','',s.lower()).strip()
aliases={}
for line in '''optic nerve|nerf optique
trochlear nerve|nerf trochléaire
long ciliary nerve|nerf ciliaire long
short ciliary nerve|nerf ciliaire court
gingiva|gencive
upper jaw|maxillaire
lower jaw|mandibule
lacrimal lake|lac lacrymal
check ligament|ligament d’arrêt
tarsal plate|tarse palpébral
lens|cristallin
levator palpebrae superioris|muscle élévateur de la paupière supérieure
lumbrical|muscle lombrical
lumbricals|muscles lombricaux
plantar interosseous|muscle interosseux plantaire
dorsal interossei|muscles interosseux dorsaux
palmar interossei|muscles interosseux palmaires
flexor digiti minimi brevis|muscle court fléchisseur du petit doigt
opponens digiti minimi|muscle opposant du petit doigt
flexor accessorius|muscle carré plantaire
gemellus inferior|muscle jumeau inférieur
gemellus superior|muscle jumeau supérieur
external oblique|muscle oblique externe de l’abdomen
puborectalis|muscle puborectal
levatores costarum breves|muscles élévateurs courts des côtes
levatores costarum longi|muscles élévateurs longs des côtes
lumbar rotator|muscle rotateur lombaire
cervical rotator|muscle rotateur cervical
thoracic rotator|muscle rotateur thoracique
iliocostalis cervicis|muscle iliocostal du cou
longissimus cervicis|muscle longissimus du cou
semispinalis cervicis|muscle semi-épineux du cou
spinalis|muscle épineux
splenius cervicis|muscle splénius du cou
intertransversarius|muscle intertransversaire
intertransversarii|muscles intertransversaires
interspinales lumborum|muscles interépineux lombaires
interspinalis thoracis|muscle interépineux thoracique
interspinales cervicis|muscles interépineux cervicaux
obliquus capitis inferior|muscle oblique inférieur de la tête
obliquus capitis superior|muscle oblique supérieur de la tête
rectus capitis anterior|muscle droit antérieur de la tête
rectus capitis posterior major|muscle grand droit postérieur de la tête
rectus capitis posterior minor|muscle petit droit postérieur de la tête
rectus capitis lateralis|muscle droit latéral de la tête
longus colli|muscle long du cou
forebrain|prosencéphale
cerebral hemisphere|hémisphère cérébral
central canal|canal central
cerebral aqueduct|aqueduc cérébral
white matter|substance blanche
mammillary body|corps mamillaire
peduncle|pédoncule
pineal body|glande pinéale
septum|septum
fusiform gyrus|gyrus fusiforme
orbital gyrus|gyrus orbitaire
stria medullaris|strie médullaire
amygdala|amygdale cérébrale
celiac artery|tronc cœliaque
celiac trunk|tronc cœliaque
portal vein|veine porte
hepatic biliary tree|arbre biliaire hépatique
hepatic vein|veine hépatique
hepatic artery|artère hépatique
bronchial tree|arbre bronchique
pancreatic duct tree|arbre des conduits pancréatiques
marginal colic artery|artère marginale du côlon
arteria radialis indicis|artère radiale de l’index
arteria princeps pollicis|artère principale du pouce
papillary muscle|muscle papillaire
ventricle|ventricule
leaflet|feuillet
cusp|valvule
aortic valve|valve aortique
pulmonary valve|valve pulmonaire
mitral valve|valve mitrale
tricuspid valve|valve tricuspide
esophagus|œsophage
appendix|appendice vermiforme
taenia libera|bandelette libre du côlon
taenia mesocolica|bandelette mésocolique du côlon
taenia omentalis|bandelette omentale du côlon
ileocecal junction|jonction iléocæcale
parenchyma|parenchyme
uvular muscle|muscle de la luette
aryepiglotticus|muscle ary-épiglottique
hair of head|cheveux
pubic hair|pilosité pubienne
lip|lèvre
adrenal gland|glande surrénale
deferent duct|conduit déférent
seminal vesicle|vésicule séminale
atlas|atlas (C1)
axis|axis (C2)
ethmoid|os ethmoïde
intervertebral disk|disque intervertébral
capitate|capitatum
hamate|hamatum
lunate|lunatum
pisiform|pisiforme
scaphoid|scaphoïde
trapezium|trapèze
trapezoid|trapézoïde
triquetral|triquétrum
manubrium|manubrium sternal
big toe|gros orteil
little toe|cinquième orteil
index finger|index
middle finger|majeur
ring finger|annulaire
little finger|auriculaire
thumb|pouce
navicular bone|os naviculaire
sesamoid bone|os sésamoïde
brachiocephalic artery|tronc brachiocéphalique
gastro-epiploic artery|artère gastro-omentale
gastroepiploic vein|veine gastro-omentale
skull|crâne
rib cage|cage thoracique
arterial arch|arcade artérielle
venous arch|arcade veineuse
artery|artère
arteries|artères
vein|veine
veins|veines
branch|branche
branches|branches
part|partie
head|chef musculaire
lobe|lobe
segment|segment
tributary|affluent
trunk|tronc
division|division
duct|conduit
arch|arcade
side|côté
nerve|nerf
muscle|muscle
bone|os
sulcus|sillon
commissure|commissure
wall|paroi
ligament|ligament
cartilage|cartilage
cavity|cavité
phalanx|phalange
vertebra|vertèbre
foot|pied
hand|main
toe|orteil
upper eyelid|paupière supérieure
lower eyelid|paupière inférieure
conus|cône artériel
nasal cartilage|cartilage nasal
costal cartilage|cartilage costal
secondary molar tooth|molaire permanente
secondary premolar tooth|prémolaire permanente
secondary incisor tooth|incisive permanente
secondary canine tooth|canine permanente'''.splitlines():
 a,b=line.split('|');aliases[key(a)]=b
adjs={}
for line in '''anterior|antérieur
posterior|postérieur
superior|supérieur
inferior|inférieur
upper|supérieur
lower|inférieur
central|central
lateral|latéral
medial|médial
middle|moyen
intermediate|intermédiaire
vertical|vertical
oblique|oblique
external|externe
internal|interne
innermost|intime
clavicular|claviculaire
sternocostal|sternocostal
humeral|huméral
ulnar|ulnaire
spinal|spinal
lumbar|lombaire
cervical|cervical
thoracic|thoracique
insular|insulaire
temporal|temporal
anterolateral|antérolatéral
precuneal|précunéal
parietal|pariétal
thalamogeniculate|thalamogéniculé
splenial|splénial
hypothalamic|hypothalamique
intermediomedial|intermédiomédial
frontobasal|frontobasal
sphenoid|sphénoïdal
paracentral|paracentral
polar|polaire
postcommunicating|postcommunicant
terminal|terminal
thalamoperforating|thalamoperforant
posteromedial|postéromédial
prefrontal|préfrontal
choroidal|choroïdien
vermian|vermien
temporo-occipital|temporo-occipital
hepatovenous|hépatoveineux
caudate|caudé
descending|descendant
bronchial|bronchique
esophageal|œsophagien
oesophageal|œsophagien
intercostal|intercostal
musculophrenic|musculophrénique
ileal|iléal
segmental|segmentaire
distal|distal
proximal|proximal
perforating|perforant
dorsal|dorsal
digital|digital
genicular|géniculaire
superficial|superficiel
plantar|plantaire
calcaneal|calcanéen
common|commun
proper|propre
metatarsal|métatarsien
tibial|tibial
fibular|fibulaire
metacarpal|métacarpien
circumflex|circonflexe
femoral|fémoral
deep|profond
palmar|palmaire
radial|radial
collateral|collatéral
brachial|brachial
pectoral|pectoral
lingular|lingulaire
basal|basal
apical|apical
main|principal
septal|septal
nasal|nasal
interventricular|interventriculaire
diagonal|diagonal
marginal|marginal
ventricular|ventriculaire
cardiac|cardiaque
lobar|lobaire
mediobasal|médiobasal
accessory|accessoire
subsuperior|sous-supérieur
laterobasal|latérobasal
hepatic|hépatique
pre-hepatic|préhépatique
cecal|cæcal
pancreaticoduodenal|pancréaticoduodénal
ascending|ascendant
caudal|caudal
pancreatic|pancréatique
phrenic|phrénique
ureteric|urétérique
gluteal|glutéal
sacral|sacral
obturator|obturateur
epigastric|épigastrique
sigmoid|sigmoïde
rectal|rectal
ileocolic|iléocolique
suspensory|suspenseur
communicating|communicant
long|long
short|court
renal|rénal
arterial|artériel
venous|veineux'''.splitlines():
 a,b=line.split('|');adjs[a]=b
nums=dict(zip('first second third fourth fifth sixth seventh eighth ninth tenth eleventh twelfth'.split(),range(1,13)))
aliases.update({key(a): b for a,b in [
('abductor digiti minimi','muscle abducteur du petit doigt'),('brachium','bras'),('chamber','cavité cardiaque'),('flexor retinaculum','rétinaculum des fléchisseurs'),('limb','bras'),('network','réseau'),('oculomotor nerve','nerf oculomoteur'),('trochlea','trochlée'),('cerebral artery','artère cérébrale'),('pontine artery','artère pontique')]})
adjs.update({'abdominal':'abdominal','acromial':'acromial','carpal':'carpien','conus':'du cône artériel','deltoid':'deltoïdien','lobe':'lobaire','optic':'optique','precommunicating':'précommunicant','straight':'droit','transverse':'transverse'})
missing=set()
def agree(adj,base):
 plural=base.split()[0] in ['artères','veines','branches','muscles']
 fem=bool(re.match(r'^(artère|veine|branche|partie|valvule|glande|cavité|phalange|vertèbre|molaire|prémolaire|incisive|canine|côte|arcade|division|paroi)',base))
 if fem:
  if adj.endswith('eux'):adj=adj[:-3]+'euse'
  elif adj.endswith('f'):adj=adj[:-1]+'ve'
  elif adj.endswith('el'):adj+='le'
  elif adj.endswith('en'):adj+='ne'
  elif not adj.endswith('e'):adj+='e'
 if plural:
  if adj.endswith('al') and not fem:adj=adj[:-2]+'aux'
  elif not adj.endswith(('s','x')):adj+='s'
 return adj

def complement(t):
 if re.match(r"^[aeiouyàâéèêëîïôœùûh]",t):return 'de l’'+t
 if re.match(r'^(muscles|artères|veines|branches|cheveux|dents|côtes)',t):return 'des '+t
 if re.match(r'^(gencive|mandibule|veine|branche|partie|valvule|glande|cavité|phalange|vertèbre|molaire|prémolaire|incisive|canine|côte|division|paroi|paupière|capsule|substance|moelle|tête|main|langue|trachée|vessie|vésicule|cage|pilosité)',t):return 'de la '+t
 return 'du '+t

def tr(s):
 s=s.strip().lower()
 if key(s) in aliases:return aliases[key(s)]
 exact=d.get(key(s)) or d.get(key(s+' muscle'))
 if exact:return exact[0].lower()+exact[1:]
 if s.startswith('set of '):
  b=tr(s[7:]);return 'ensemble : '+b if b else None
 for sep,label in [(' of ',' de : '),(' with ',' avec : '),(' to ',' vers : ')]:
  if sep in s:
   a,b=s.split(sep,1);ta,tb=tr(a),tr(b)
   return (ta+' '+complement(tb) if sep==' of ' else ta+label+tb) if ta and tb else None
 if s.startswith(('right ','left ')):
  a,b=s.split(' ',1);t=tr(b);return t+' — côté '+('droit' if a=='right' else 'gauche') if t else None
 words=s.split()
 if words and words[0] in nums:
  t=tr(' '.join(words[1:]));return t+' n° '+str(nums[words[0]]) if t else None
 if words and words[-1] in ['ii','iii','iv','v','vi','vii','viii','ix']:
  t=tr(' '.join(words[:-1]));return t+' '+words[-1].upper() if t else None
 if words and words[0] in adjs:
  t=tr(' '.join(words[1:]));return t+' '+agree(adjs[words[0]],t) if t else None
 if words and words[-1]=='proper':
  t=tr(' '.join(words[:-1]));return t+' '+agree('propre',t) if t else None
 missing.add(s);return None
rows=json.loads((root/'public/models/manifest.json').read_text())['structures']+json.loads((root/'public/models/overview.json').read_text())['structures']
out={};untranslated=[]
for r in rows:
 t=tr(r['name'])
 if t:out[r['name']]=t[0].upper()+t[1:]
 else:untranslated.append(r['name'])
print('Translated',len(out),'missing',len(untranslated));print('\n'.join(sorted(missing)))
if untranslated:raise RuntimeError('Untranslated anatomical terms remain')
(root/'src/data/french-labels.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
Path('/private/tmp/corpus-missing-terms.json').write_text(json.dumps(untranslated,indent=2))
