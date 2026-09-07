"""Download the official ISA ZIP in checked byte ranges; never execute downloaded data."""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import subprocess, zipfile
ROOT=Path('/private/tmp/bodyparts3d')
URL='https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/'
SIZE=142903898
STEP=4*1024*1024
chunks=ROOT/'isa-chunks'; chunks.mkdir(exist_ok=True)
def fetch(start):
    end=min(SIZE,start+STEP)-1
    dest=chunks/str(start)
    if not dest.exists() or dest.stat().st_size!=end-start+1:
        subprocess.run(['curl','-sS','-L','--fail','--retry','2','--max-time','180','--range',f'{start}-{end}',URL+'isa_BP3D_4.0_obj_99.zip','-o',str(dest)],check=True)
    if dest.stat().st_size!=end-start+1:raise RuntimeError('Invalid range size')
    print(f'Chunk {start//STEP+1}/35 verified',flush=True)
with ThreadPoolExecutor(max_workers=6) as pool:list(pool.map(fetch,range(0,SIZE,STEP)))
dest=ROOT/'isa_BP3D_4.0_obj_99.zip'
with dest.open('wb') as out:
    for start in range(0,SIZE,STEP):out.write((chunks/str(start)).read_bytes())
with zipfile.ZipFile(dest) as z:
    bad=z.testzip()
    if bad:raise RuntimeError('CRC mismatch: '+bad)
    print('ZIP verified:',len(z.namelist()),'entries',flush=True)
for name in ['isa_element_parts.txt','isa_inclusion_relation_list.txt']:
    subprocess.run(['curl','-sS','-L','--fail','--retry','2','--max-time','120',URL+name,'-o',str(ROOT/name)],check=True)
