"""Extract specialist regions from the already licensed HRA-derived GLBs."""
from pathlib import Path
import json,hashlib
import trimesh
ROOT=Path(__file__).resolve().parents[1]
source=ROOT/'.model-cache/female'
m=json.loads((source/'manifest.json').read_text())
# Source node families explicitly preserved by the import, with no male geometry.
gltf_path=Path('/private/tmp/corpus-models/female-gltf.json')
# Membership is frozen in a checked-in list after the first extraction.
membership=ROOT/'scripts/female-region-members.json'
if not membership.exists():
 nodes=json.loads(gltf_path.read_text())['nodes']
 def children(i):
  return [nodes[i].get('name','')]+[name for c in nodes[i].get('children',[]) for name in children(c)]
 roots={'pelvis':['VH_F_pelvis','VH_F_reproductive_system','VH_F_urinary_bladder'],'reproductive':['VH_F_reproductive_system'],'breast':['VH_F_mammary_gland']}
 regions={key:[s['id'] for s in m['structures'] if not s.get('aggregate') and s.get('sourceNode') in {name for root in roots_ for i,n in enumerate(nodes) if n.get('name')==root for name in children(i)}] for key,roots_ in roots.items()}
 membership.write_text(json.dumps(regions,indent=2))
regions=json.loads(membership.read_text());ids=set(sum(regions.values(),[]))
structures=[s for s in m['structures'] if s['id'] in ids or (s.get('aggregate') and set(s['meshNames'])<=ids)]
for key,label in [('pelvis','female pelvic region'),('reproductive','female reproductive organs'),('breast','mammary glands')]:
 members=regions[key];groups=sorted({s['group'] for s in structures if s['id'] in members})
 structures.append({'id':'HRA-region-'+key,'name':label,'aggregate':True,'meshNames':members,'groups':groups,'group':'organs'})
out=ROOT/'public/models/female-regions';out.mkdir(exist_ok=True)
groups=[]
for group in m['groups']:
 wanted={s['id'] for s in structures if not s.get('aggregate') and s['group']==group['id']}
 if not wanted:continue
 scene=trimesh.load(source/(group['id']+'.glb'),force='scene',process=False);part=trimesh.Scene()
 for node in scene.graph.nodes_geometry:
  transform,geometry=scene.graph[node]
  if node in wanted:part.add_geometry(scene.geometry[geometry],node_name=node,geom_name=node,transform=transform)
 data=trimesh.exchange.gltf.export_glb(part);file=out/(group['id']+'.glb');file.write_bytes(data)
 groups.append({**group,'url':'models/female-regions/'+file.name,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest(),'structures':len(wanted)})
(out/'manifest.json').write_text(json.dumps({**m,'groups':groups,'structures':structures,'regions':regions,'specialist':True},ensure_ascii=False,indent=2))
(out/'LICENSE.txt').write_text((source/'LICENSE.txt').read_text()+'\nAdditional adaptation: subset for pelvic, reproductive and breast regional exploration. Original mesh identities and coordinates retained.\n')
print(len(ids),'regional meshes;',sum(g['bytes'] for g in groups),'bytes')
