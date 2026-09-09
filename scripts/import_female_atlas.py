"""Import HRA United Female v1.5 using source transforms and stable node IDs.
Run: python scripts/import_female_atlas.py /path/to/hra-female-v1.5.glb
Dependencies: numpy, trimesh, fast-simplification, scipy.
The GLB, crosswalk and metadata are official HRA assets under CC BY 4.0.
"""
from pathlib import Path
import json, csv, hashlib, re, argparse, struct
import trimesh, numpy as np

ROOT=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('source',type=Path,help='GLB officiel United Female v1.5')
args=parser.parse_args()
source=args.source
if hashlib.sha256(source.read_bytes()).hexdigest()!='472567a56896b9b7890508da6501fbf858e56aaa30745365f7a71ade782b529c':
 raise ValueError('Le fichier ne correspond pas à la référence HRA v1.5 dont la licence a été vérifiée.')
license_dir=ROOT/'public/licenses'
OUT=ROOT/'.model-cache/female'; OUT.mkdir(parents=True,exist_ok=True)
with source.open('rb') as stream:
 header=stream.read(20)
 magic,version,total,length,chunk=struct.unpack('<4sIIII',header)
 if magic!=b'glTF' or version!=2 or chunk!=0x4E4F534A:raise ValueError('GLB 2.0 attendu')
 gltf=json.loads(stream.read(length))
nodes=gltf['nodes']; parent={child:i for i,n in enumerate(nodes) for child in n.get('children',[])}
rows={r['node_name']:r for r in csv.DictReader((license_dir/'female-source-crosswalk.csv').open())}
scene=trimesh.load(source,force='scene',process=False)
skin_transform,skin_geometry=scene.graph['VH_F_skin']
skin=scene.geometry[skin_geometry].copy();skin.apply_transform(skin_transform)
bounds=skin.bounds; scale=3.6/(bounds[1,1]-bounds[0,1])
transform=np.eye(4);transform[:3,:3]*=scale;transform[:3,3]=-bounds.mean(axis=0)*scale
labels={'skin':'Enveloppe corporelle','skeleton':'Os disponibles','organs':'Organes et tissus','muscles':'Muscles disponibles','arteries':'Artères','veins':'Veines','nerves':'Nerfs','joints':'Articulations'}
scenes={g:trimesh.Scene() for g in labels}; structures=[]; node_mesh={}; excluded=[]
def ancestry(index):
 chain=[nodes[index].get('name','')]
 while index in parent:index=parent[index];chain.append(nodes[index].get('name',''))
 return chain
def group_for(name,chain):
 if name=='VH_F_skin':return 'skin'
 path=' '.join(chain).lower()
 if 'skeletal_system' in path:return 'skeleton'
 if 'muscular_system' in path:return 'muscles'
 if 'ligament' in name.lower() or 'cartilage' in name.lower():return 'joints'
 if re.search(r'vein|veins|vena|venous',name.lower()):return 'veins'
 if re.search(r'artery|arteries|aorta|arterial',name.lower()):return 'arteries'
 if re.search(r'nerve|nerves',name.lower()):return 'nerves'
 return 'organs'
for index,node in enumerate(nodes):
 if 'mesh' not in node:continue
 name=node['name'];chain=ancestry(index)
 # The source includes a separate placenta reference, not a pregnant whole body.
 if 'VH_F_placenta' in chain:excluded.append(name);continue
 matrix,geometry=scene.graph[name]
 mesh=scene.geometry[geometry].copy();mesh.apply_transform(matrix);mesh.apply_transform(transform)
 group=group_for(name,chain);original=len(mesh.faces)
 budget=18000 if group=='skin' else 900 if 'Allen_brain' in chain else 1800
 if original>budget:mesh=mesh.simplify_quadric_decimation(face_count=budget,aggression=5)
 id='HRA-'+name
 mesh.metadata={'source':'Human Reference Atlas','version':'1.5','node':name,'license':'CC BY 4.0'}
 scenes[group].add_geometry(mesh,node_name=id,geom_name=id);node_mesh[index]=id
 label=rows.get(name,{}).get('label') or re.sub(r'^(VH_F_|Allen_)','',name).replace('_',' ')
 structures.append({'id':id,'name':label.lower(),'group':group,'groups':[group],'meshNames':[id],'sourceNode':name,'ontologyId':rows.get(name,{}).get('OntologyID'),'detailOnly':'VH_F_liver' in chain and name!='VH_F_capsule_of_the_liver','triangles':len(mesh.faces),'originalTriangles':original,'bounds':mesh.bounds.tolist()})
 if len(structures)%100==0:print(len(structures),'female meshes converted',flush=True)

def descendants(index):
 ids=[node_mesh[index]] if index in node_mesh else []
 for child in nodes[index].get('children',[]):ids+=descendants(child)
 return ids
aliases={'Allen_brain':('FMA50801','brain'),'VH_F_heart':('FMA7088','heart'),'VH_F_lungs':('FMA7309','lung'),'VH_F_liver':('FMA7197','liver'),'VH_F_pancreas':('FMA7198','pancreas'),'VH_F_small_intestine':('FMA7200','small intestine'),'VH_F_uterus':('HRA-uterus','uterus'),'VH_F_ovary':('HRA-ovaries','ovary'),'VH_F_fallopian_tube':('HRA-uterine-tubes','uterine tube'),'VH_F_spinal_cord':('HRA-spinal-cord','spinal cord')}
by_id={s['id']:s for s in structures}
for i,node in enumerate(nodes):
 if node.get('name') not in aliases:continue
 id,label=aliases[node['name']];meshes=descendants(i)
 if not meshes:continue
 groups=sorted({by_id[m]['group'] for m in meshes})
 structures.append({'id':id,'name':label,'group':groups[0],'groups':groups,'meshNames':meshes,'aggregate':True})
groups=[]
for group,part in scenes.items():
 if not part.geometry:continue
 file=OUT/f'{group}.glb';file.write_bytes(trimesh.exchange.gltf.export_glb(part,include_normals=True))
 groups.append({'id':group,'label':labels[group],'url':f'models/female/{group}.glb','bytes':file.stat().st_size,'structures':len(part.geometry),'sha256':hashlib.sha256(file.read_bytes()).hexdigest()})
provenance={'database':'Human Reference Atlas, United Female v1.5','url':'https://cdn.humanatlas.io/digital-objects/ref-organ/united-female/v1.5/assets/3d-vh-f-united.glb','doi':'https://doi.org/10.48539/HBM352.BTSQ.586','authors':['Kristen Browne','Heidi Schlehlein'],'publisher':'HuBMAP','source':'Visible Human Female, US National Library of Medicine; component references as recorded in HRA crosswalk','license':'CC BY 4.0','sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'bytes':source.stat().st_size,'changes':['Global centering and uniform scaling to 3.6 scene units; original source transforms preserved','Per-mesh simplification, independent GLB layers, stable original node identities','Named assemblies reference existing meshes; no duplicated geometry'],'excludedSeparatePlacenta':excluded}
manifest={'version':3,'sex':'female','groups':groups,'structures':structures,'bounds':{'height':3.6,'up':'+Y','front':'+Z','transform':transform.tolist()},'source':provenance,'license':'CC BY 4.0','limitations':['Composite reference anatomy; coverage differs from the male BodyParts3D atlas','Skeleton and muscles are partial; no invented completion','Separate placenta model omitted; this is not a pregnancy model']}
(OUT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
license_dir=ROOT/'public/licenses';(license_dir/'female-provenance.json').write_text(json.dumps(provenance,ensure_ascii=False,indent=2))

(OUT/'LICENSE.txt').write_text('Human Reference Atlas, United Female v1.5. Kristen Browne; Heidi Schlehlein (2023). HuBMAP. '+provenance['doi']+'\nDerived from Visible Human Female, US National Library of Medicine; component sources documented by HRA.\nCreative Commons Attribution 4.0 International: https://creativecommons.org/licenses/by/4.0/\nAdapted for Corpus: uniform scaling, simplification, separated GLB layers. See /licenses/female-provenance.json and female-source-crosswalk.csv.\n')
print('FEMALE DONE',len(node_mesh),'real meshes;',sum(g['bytes'] for g in groups)/1e6,'MB',flush=True)
