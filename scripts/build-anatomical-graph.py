"""Import only published PART-OF relations relevant to shipped BodyParts3D meshes.
No inferred anatomy, generated medical text, or cross-reference to female HRA.
"""
import csv
import hashlib
import json
from pathlib import Path

root = Path(__file__).resolve().parents[1]
source = root / 'public/licenses/partof_inclusion_relation_list.txt'
manifest = json.loads((root / 'public/models/manifest.json').read_text())
rows = list(csv.DictReader(source.open(), delimiter='\t'))
names = {s['id']: s['name'] for s in manifest['structures']}
keep = set(names)
while True:
    before = len(keep)
    for row in rows:
        if row['child id'] in keep:
            keep.add(row['parent id'])
    if len(keep) == before:
        break
reference = {
    'id': 'bp3d-partof-4.0', 'title': 'BodyParts3D 4.0 — PART-OF inclusion relations',
    'url': 'https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html',
    'license': 'See /models/LICENSE.txt: DBCLS attribution; original source licensing retained',
}
relations = []
seen = set()
for row in rows:
    parent, child = row['parent id'], row['child id']
    if parent not in keep or child not in keep:
        continue
    names.setdefault(parent, row['parent name'])
    names.setdefault(child, row['child name'])
    if (parent, child) in seen:
        raise ValueError(f'Duplicate source relation: {parent}/{child}')
    seen.add((parent, child))
    relations.append({'parentId': parent, 'childId': child, 'type': 'part-of', 'referenceId': reference['id']})
output = {'version': 1, 'mappedAtlasRevision': manifest['atlasRevision'], 'reference': reference, 'sourceSha256': hashlib.sha256(source.read_bytes()).hexdigest(),
          'nodes': [{'id': key, 'name': names[key]} for key in sorted(keep)], 'relations': relations}
(root / 'public/models/anatomical-relations.json').write_text(json.dumps(output, ensure_ascii=False, separators=(',', ':')) + '\n')
print(f"Imported {len(relations)} sourced relations; {len(keep - {s['id'] for s in manifest['structures']})} documented ancestor concepts.")
