"""Build a detailed atlas from ALL named elements of the official ISA 4.0 ZIP.
Geometry: CC BY-SA 2.1 Japan. Optional French terminology: Z-Anatomy CC BY-SA 4.0.
Run after build_anatomy.py; preserves the overview manifest and meshes.
"""
from pathlib import Path
from collections import defaultdict
import csv, json, zipfile, re, io, hashlib, logging
import numpy as np
import trimesh
logging.getLogger('trimesh').setLevel(logging.ERROR)
ROOT=Path(__file__).resolve().parents[1]; CACHE=Path('/private/tmp/bodyparts3d'); OUT=ROOT/'public/models'
legacy=OUT/'overview.json'
if not legacy.exists():legacy.write_bytes((OUT/'manifest.json').read_bytes())
overview=json.loads(legacy.read_text());transform=np.array(overview['bounds']['transform'])
z=zipfile.ZipFile(CACHE/'isa_BP3D_4.0_obj_99.zip')
children=defaultdict(set)
for r in csv.DictReader((CACHE/'isa_inclusion_relation_list.txt').open(),delimiter='\t'):children[r['parent id']].add(r['child id'])
def descendants(*roots):
 found=set(roots);stack=list(roots)
 while stack:
  for c in children[stack.pop()]-found:found.add(c);stack.append(c)
 return found
classes={
 'skeleton':descendants('FMA5018','FMA10483','FMA12516'),
 'muscles':descendants('FMA5022','FMA10474'),
 'arteries':descendants('FMA50720'),
 'veins':descendants('FMA50723'),
 'nerves':descendants('FMA65132'),
 'joints':descendants('FMA21496','FMA55107','FMA7538')}
by_concept=defaultdict(list);metadata={};excluded=[]
for member in z.namelist():
 if not member.endswith('.obj'):continue
 header=z.read(member)[:2000].decode()
 d=dict(re.findall(r'^# ([A-Za-z ()]+) : ([^\n]*)',header,re.M))
 if not d.get('Concept ID') or not d.get('English name'):excluded.append(member);continue
 d['path']=member;metadata[d['File ID']]=d;by_concept[d['Concept ID']].append(d['File ID'])
lobe_names={'FMA7333':'upper lobe of right lung','FMA7337':'lower lobe of right lung','FMA7383':'middle lobe of right lung','FMA7370':'upper lobe of left lung','FMA7371':'lower lobe of left lung'}
for id,name in lobe_names.items():
 metadata[id]={'Concept ID':id,'English name':name,'file':str(CACHE/'lung-surfaces'/f'{id}.obj')};by_concept[id]=[id]
def group_for(id,name):
 if id=='FMA7163':return 'skin'
 for group,ids in classes.items():
  if id in ids:return group
 if re.search(r'artery|arteries|arterial|aorta|celiac trunk|costocervical trunk|thyrocervical trunk|pulmonary trunk|palmar arch|plantar arch',name):return 'arteries'
 if re.search(r' vein|venous|vena cava|coronary sinus',name):return 'veins'
 if re.search(r'nerve|ganglion|neural|plexus',name):return 'nerves'
 if re.search(r'sternum|xiphoid process',name):return 'skeleton'
 if not re.search(r'ventricle|atrium|cardiac',name) and re.search(r'biceps|triceps|gastrocnemius|pectoralis|trapezius|flexor|extensor|adductor|abductor|lumbrical|interossei|interspinales|intertransversarii|levatores|pronator|soleus|deltoid',name) and not re.search(r'retinaculum|tendinous|aponeurosis',name):return 'muscles'
 if re.search(r'interosseous membrane|retinaculum|raphe|iliotibial tract|linea alba|tendinous|cartilage|ligament|tendon|intervertebral disc|meniscus|fascia|aponeurosis',name):return 'joints'
 return 'organs'
scenes={g:trimesh.Scene() for g in ['skin','skeleton','organs','muscles','arteries','veins','nerves','joints']}
structures=[];triangles=0
for index,(id,files) in enumerate(by_concept.items()):
 name=metadata[files[0]]['English name'].lower();group=group_for(id,name)
 meshes=[]
 for f in files:
  meta=metadata[f];raw=Path(meta['file']).read_bytes() if 'file' in meta else z.read(meta['path'])
  meshes.append(trimesh.load(io.BytesIO(raw),file_type='obj',force='mesh',process=False))
 mesh=trimesh.util.concatenate(meshes);original=len(mesh.faces)
 budget={'skin':36000,'skeleton':2000,'organs':2000,'muscles':1800,'arteries':450,'veins':450,'nerves':700,'joints':800}[group]
 if id in lobe_names:budget=5000
 if original>budget:mesh=mesh.simplify_quadric_decimation(face_count=budget,aggression=5)
 mesh.apply_transform(transform)
 mesh.metadata={'source':'BodyParts3D','sourceVersion':'3.0' if id in lobe_names else '4.0','conceptId':id,'sourceElements':files,'license':'CC BY-SA 2.1 Japan'}
 scenes[group].add_geometry(mesh,geom_name=id,node_name=id)
 structures.append({'id':id,'name':name,'group':group,'groups':[group],'meshNames':[id],'sourceElements':files,'sourceVersions':['3.0' if id in lobe_names else '4.0'],'triangles':len(mesh.faces),'originalTriangles':original,'bounds':mesh.bounds.tolist()})
 triangles+=len(mesh.faces)
 if index%100==0:print(index,'structures converted',flush=True)
# Virtual assemblies use the same real component meshes, never duplicated geometry.
known={s['id'] for s in structures};by_id={s['id']:s for s in structures}
for parent in overview['structures']:
 if parent['id'] in known:continue
 mesh_names=sorted(set(metadata[f]['Concept ID'] for f in parent.get('sourceElements',[]) if f in metadata))
 if not mesh_names:continue
 structures.append({**parent,'aggregate':True,'meshNames':mesh_names,'groups':sorted(set(by_id[n]['group'] for n in mesh_names))})
labels={'skin':'Enveloppe corporelle','skeleton':'Os et dents','organs':'Organes et tissus','muscles':'Muscles','arteries':'Artères','veins':'Veines','nerves':'Nerfs','joints':'Articulations'}
groups=[]
for id,scene in scenes.items():
 if not scene.geometry:continue
 path=OUT/f'detail-{id}.glb';path.write_bytes(trimesh.exchange.gltf.export_glb(scene,include_normals=True))
 groups.append({'id':id,'label':labels[id],'url':f'models/detail-{id}.glb','bytes':path.stat().st_size,'structures':len(scene.geometry),'sha256':hashlib.sha256(path.read_bytes()).hexdigest()})
manifest={'version':2,'groups':groups,'structures':structures,'bounds':overview['bounds'],'license':'CC BY-SA 2.1 Japan','source':{'database':'BodyParts3D','version':'4.0 ISA with 3.0 pulmonary lobes','archiveUrl':'https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/isa_BP3D_4.0_obj_99.zip','archiveSha256':hashlib.sha256((CACHE/'isa_BP3D_4.0_obj_99.zip').read_bytes()).hexdigest(),'archiveBytes':(CACHE/'isa_BP3D_4.0_obj_99.zip').stat().st_size,'attribution':overview['source']['legacyAttribution'],'supplement':overview['source'].get('supplement'),'changes':['All named ISA source elements imported, combined only when they have the same source FMA concept','Shared original coordinate transform; web mesh simplification; GLB conversion','Virtual organ assemblies reference real components without duplicating them'],'excludedUnidentifiedFiles':excluded},'limitations':['Reference male anatomy only, not all possible human anatomy or microscopic detail','Unnamed source elements omitted because identification cannot be verified','French terminology supplemented by original English labels where no verified French correspondence exists','Organ assembly selection can activate several anatomical layers']}
(OUT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
(ROOT/'public/licenses/detailed-provenance.json').write_text(json.dumps(manifest['source'],ensure_ascii=False,indent=2))
print('DONE',len(by_concept),'distinct structures;',len(structures),'searchable entries;',triangles,'triangles;',sum(g['bytes'] for g in groups)/1e6,'MB',flush=True)
print([(g['id'],g['structures']) for g in groups],flush=True)
