#!/usr/bin/env python3
"""Fetch genuine lung surfaces from the official BodyParts3D 3.0 ZIP using HTTP ranges.

Version 4.0 PART-OF contains bronchovascular components but omits the lung's
outer volumes. Version 3.0 supplies the lobes in the same reference coordinates.
No geometry is reconstructed or approximated here; ZipFile verifies CRCs.
"""
import argparse
import hashlib
import io
import json
import urllib.request
import zipfile
from pathlib import Path

URL = 'https://dbarchive.biosciencedbc.jp/data/bodyparts3d/20110915/BodyParts3D_3.0_obj_99.zip'

class RemoteZip(io.RawIOBase):
    def __init__(self, url):
        self.url, self.pos, self.cache = url, 0, []
        request = urllib.request.Request(url, headers={'Range':'bytes=-524288'})
        with urllib.request.urlopen(request, timeout=90) as response:
            if response.status != 206: raise RuntimeError('Server did not honor HTTP range')
            self.size = int(response.headers['Content-Range'].split('/')[-1])
            self.etag = response.headers.get('ETag')
            data = response.read()
        self.cache.append((self.size-len(data), data))
    def seekable(self): return True
    def tell(self): return self.pos
    def seek(self, offset, whence=0):
        self.pos = offset if whence == 0 else self.pos+offset if whence == 1 else self.size+offset
        return self.pos
    def read(self, n=-1):
        if n < 0: n = self.size-self.pos
        if not n: return b''
        for start, data in self.cache:
            if start <= self.pos and self.pos+n <= start+len(data):
                result=data[self.pos-start:self.pos-start+n]; self.pos+=len(result); return result
        end = min(self.size, self.pos+max(n, 131072))
        request = urllib.request.Request(self.url, headers={'Range':f'bytes={self.pos}-{end-1}'})
        with urllib.request.urlopen(request, timeout=90) as response:
            if response.status != 206: raise RuntimeError('Server did not honor HTTP range')
            data = response.read()
        self.cache.append((self.pos,data))
        return self.read(n)


def fetch(destination):
    destination.mkdir(parents=True, exist_ok=True)
    remote=RemoteZip(URL)
    archive=zipfile.ZipFile(remote)
    names=archive.namelist()
    (destination/'archive-members.json').write_text(json.dumps(names,indent=2))
    targets=[name for name in names if any(identifier in name for identifier in ['FMA7333.', 'FMA7337.', 'FMA7383.', 'FMA7370.', 'FMA7371.'])]
    print('Archive entries',len(names),'lung lobe files',targets,flush=True)
    if not targets: return
    records=[]
    for member in targets:
        data=archive.read(member)
        output=destination/member.replace(chr(92), '/').split('/')[-1]
        output.write_bytes(data)
        records.append({'file':output.name,'member':member,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()})
        print('Saved',output,len(data),flush=True)
    (destination/'provenance.json').write_text(json.dumps({'archiveUrl':URL,'archiveBytes':remote.size,'etag':remote.etag,'retrieval':'HTTP byte ranges; ZIP CRC verified','version':'3.0','files':records},indent=2))

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--output',type=Path,default=Path('/tmp/bodyparts3d/lung-surfaces'));a=p.parse_args();fetch(a.output)
