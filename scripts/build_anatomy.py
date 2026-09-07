#!/usr/bin/env python3
"""Rebuild aligned, selectable GLBs from the official BodyParts3D 4.0 OBJ archive.

python -m pip install -r scripts/requirements-models.txt
python scripts/build_anatomy.py --source /tmp/bodyparts3d --download

Original OBJ files stay in the source/cache directory, not the website. No
synthetic geometry is generated. Each educational structure joins its original
anatomical elements and undergoes quadric-error simplification.
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import io
import json
import logging
import re
import shutil
import urllib.request
import zipfile
from collections import defaultdict
from datetime import date
from pathlib import Path

import numpy as np
import trimesh

# trimesh computes equivalent dense normals when optional scipy is absent.
# Suppress its verbose optional-dependency traceback, keeping actual failures visible.
logging.getLogger("trimesh").setLevel(logging.ERROR)

ROOT = Path(__file__).resolve().parents[1]
BASE = "https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/"
ARCHIVE = "partof_BP3D_4.0_obj_99.zip"
ATTRIBUTION = "BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International"
LEGACY_ATTRIBUTION = "BodyParts3D, (c) The Database Center for Life Science licensed under CC Attribution-Share Alike 2.1 Japan"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=Path("/tmp/bodyparts3d"))
    parser.add_argument("--download", action="store_true")
    args = parser.parse_args()
    args.source.mkdir(parents=True, exist_ok=True)
    output = ROOT / "public/models"
    licenses = ROOT / "public/licenses"
    output.mkdir(parents=True, exist_ok=True)
    licenses.mkdir(parents=True, exist_ok=True)
    files = [ARCHIVE, "partof_parts_list_e.txt", "partof_element_parts.txt", "partof_inclusion_relation_list.txt"]
    for filename in files:
        path = args.source / filename
        if args.download and not path.exists():
            print("Downloading", filename, flush=True)
            urllib.request.urlretrieve(BASE + filename, path)
        if not path.exists():
            raise SystemExit(f"Missing {path}. Use --download or download the official file manually.")

    parts = list(csv.DictReader((args.source / files[1]).open(), delimiter="\t"))
    concepts = {r["concept id"]: r for r in parts}
    names = {r["en"]: r["concept id"] for r in parts}
    elements = defaultdict(list)
    for row in csv.DictReader((args.source / files[2]).open(), delimiter="\t"):
        elements[row["concept id"]].append(row["element file id"])

    archive = zipfile.ZipFile(args.source / ARCHIVE)
    metadata = {}
    for member in archive.infolist():
        if not member.filename.endswith(".obj"):
            continue
        header = archive.open(member).read(2000).decode()
        fields = dict(re.findall(r"^# ([A-Za-z ()]+) : ([^\n]+)", header, re.M))
        fields["path"] = member.filename
        metadata[fields["File ID"]] = fields
    original_header = archive.open(metadata["FJ2810"]["path"]).read(2000).decode().split("\nv ")[0]
    (licenses / "original-obj-header.txt").write_text(original_header + "\n")

    # All geometry uses one common source transform: (x, y, z) -> (x, z, -y).
    # It is a proper rotation, so triangle winding and left/right are retained.
    skin = trimesh.load(io.BytesIO(archive.read(metadata["FJ2810"]["path"])), file_type="obj", force="mesh", process=False)
    source_bounds = skin.bounds.copy()
    center = source_bounds.mean(axis=0)
    scale = 3.6 / (source_bounds[1, 2] - source_bounds[0, 2])
    transform = np.array([[scale, 0, 0, -center[0] * scale],
                          [0, 0, scale, -center[2] * scale],
                          [0, -scale, 0, center[1] * scale],
                          [0, 0, 0, 1]])

    # The 4.0 PART-OF lung concepts only contain internal bronchovascular trees.
    # Add five genuine 3.0 lobe surfaces in the same source reference frame.
    supplement_dir = args.source / "lung-surfaces"
    lung_lobes = {"right lung": ["FMA7333", "FMA7337", "FMA7383"], "left lung": ["FMA7370", "FMA7371"]}
    supplement_ids = [identifier for values in lung_lobes.values() for identifier in values]
    if not all((supplement_dir / f"{identifier}.obj").exists() for identifier in supplement_ids):
        if not args.download:
            raise SystemExit("Missing official 3.0 lung surfaces. Run with --download or scripts/fetch_lung_surfaces.py --output <source>/lung-surfaces")
        from fetch_lung_surfaces import fetch
        fetch(supplement_dir)
    for identifier in supplement_ids:
        metadata[identifier] = {"Concept ID": identifier, "English name": "pulmonary lobe", "localPath": str(supplement_dir / f"{identifier}.obj")}
    def read_source(identifier):
        item = metadata[identifier]
        return Path(item["localPath"]).read_bytes() if "localPath" in item else archive.read(item["path"])
    (licenses / "original-lung-obj-header.txt").write_text("\n".join((supplement_dir / "FMA7333.obj").read_text().splitlines()[:2]) + "\n")
    supplement_provenance = json.loads((supplement_dir / "provenance.json").read_text())
    supplement_provenance.update({"embeddedObjLicense": "CC BY-SA 2.1 Japan", "changes": "Five lobe surfaces joined to corresponding 4.0 lung bronchovascular trees; common transform only, no deformation"})
    (licenses / "lung-surfaces-provenance.json").write_text(json.dumps(supplement_provenance, indent=2) + "\n")

    selection = []

    def add(name, group, budget=5000):
        concept = names[name]
        selection.append(dict(id=concept, name=name, group=group,
                              files=[*elements[concept], *lung_lobes.get(name, [])], budget=budget))

    def assembled(identifier, name, predicate, budget=7000):
        selected = [f for f, m in metadata.items() if predicate(m.get("English name", "").lower())]
        if not selected:
            raise ValueError(f"Empty assembly: {name}")
        selection.append(dict(id=identifier, name=name, group="skeleton", files=selected, budget=budget))

    add("skin", "skin", 36000)
    for name, budget in [
        ("brain", 22000), ("heart", 14000),
        ("right lung", 9000), ("left lung", 9000),
        ("liver", 12000), ("stomach", 4000), ("pancreas", 5000),
        ("small intestine", 8500), ("large intestine", 11000),
        ("gallbladder", 2000), ("right kidney", 4500), ("left kidney", 4500),
        ("urinary bladder", 3500), ("trachea", 3500),
        ("esophagus", 2500), ("spinal cord", 4500),
    ]:
        add(name, "organs", budget)

    cranial = re.compile(r"(?:frontal|occipital|sphenoid|temporal|parietal|zygomatic|lacrimal|nasal|palatine) bone$|^(?:ethmoid|vomer)$|maxilla$|inferior nasal concha$")
    assembled("BP3D_SKULL", "skull", lambda n: bool(cranial.search(n)), 16000)
    for name, budget in [("mandible", 5000), ("sternum", 2500),
                         ("right side of rib cage", 7000), ("left side of rib cage", 7000),
                         ("vertebral column", 18000), ("sacrum", 3500)]:
        add(name, "skeleton", budget)
    for side in ["right", "left"]:
        for bone in ["clavicle", "scapula", "hip bone", "humerus", "radius", "ulna", "femur", "tibia", "fibula", "patella"]:
            add(f"{side} {bone}", "skeleton", 3000 if bone in ["hip bone", "scapula"] else 1800)
        hand = re.compile(r"metacarpal bone$|scaphoid$|lunate$|triquetral$|pisiform$|trapezium$|trapezoid$|capitate$|hamate$|phalanx of .* (?:thumb|finger)$")
        foot = re.compile(r"metatarsal bone$|talus$|calcaneus$|cuneiform bone$|cuboid bone$|navicular bone of .* foot$|phalanx of .* toe$")
        assembled("BP3D_HAND_" + side.upper(), f"bones of {side} hand", lambda n, s=side: s in n.split() and bool(hand.search(n)), 8500)
        assembled("BP3D_FOOT_" + side.upper(), f"bones of {side} foot", lambda n, s=side: s in n.split() and bool(foot.search(n)), 7000)

    sacrum_files = set(elements[names["sacrum"]])
    for spec in selection:
        if spec["name"] == "vertebral column":
            spec["files"] = [f for f in spec["files"] if f not in sacrum_files]

    structures = []
    scenes = {group: trimesh.Scene() for group in ["skin", "skeleton", "organs"]}
    colors = {"skin": [83, 165, 178, 255], "skeleton": [214, 223, 210, 255], "organs": [166, 89, 97, 255]}
    used = set()
    for spec in selection:
        if overlap := used.intersection(spec["files"]):
            print(f"Shared source elements {overlap} already assigned; excluding duplicate geometry from {spec['id']}", flush=True)
            spec["files"] = [f for f in spec["files"] if f not in overlap]
        used.update(spec["files"])
        meshes = [trimesh.load(io.BytesIO(read_source(f)), file_type="obj", force="mesh", process=False) for f in spec["files"]]
        mesh = trimesh.util.concatenate(meshes)
        original_triangles = len(mesh.faces)
        if original_triangles > spec["budget"]:
            mesh = mesh.simplify_quadric_decimation(face_count=spec["budget"], aggression=5)
        mesh.apply_transform(transform)
        # Smooth normals are computed after simplification; no fake surfaces added.
        mesh.visual = trimesh.visual.TextureVisuals(material=trimesh.visual.material.PBRMaterial(
            name=spec["id"], baseColorFactor=colors[spec["group"]], metallicFactor=.1, roughnessFactor=.57))
        mesh.metadata.update({"structureId": spec["id"], "source": "BodyParts3D 4.0", "sourceElements": spec["files"]})
        scenes[spec["group"]].add_geometry(mesh, geom_name=spec["id"], node_name=spec["id"])
        bounds = mesh.bounds.tolist()
        structures.append({
            "id": spec["id"], "name": spec["name"], "group": spec["group"],
            "meshNames": [spec["id"]], "sourceElements": spec["files"],
            "sourceConceptIds": sorted(set(metadata[f]["Concept ID"] for f in spec["files"])),
            "sourceVersions": ["4.0", "3.0"] if spec["name"] in lung_lobes else ["4.0"],
            "center": mesh.bounds.mean(axis=0).tolist(), "bounds": bounds,
            "triangles": len(mesh.faces), "originalTriangles": original_triangles,
        })
        print(f"{spec['id']:18} {spec['name']:30} {original_triangles:7} -> {len(mesh.faces):6} triangles", flush=True)

    labels = {"skin": "Enveloppe corporelle", "skeleton": "Squelette", "organs": "Organes"}
    groups = []
    for group, scene in scenes.items():
        path = output / f"{group}.glb"
        path.write_bytes(trimesh.exchange.gltf.export_glb(scene, include_normals=True))
        groups.append({"id": group, "label": labels[group], "url": f"models/{group}.glb",
                       "bytes": path.stat().st_size, "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
                       "structures": sum(s["group"] == group for s in structures)})

    provenance = {
        "database": "BodyParts3D", "version": "4.0 with 3.0 lung surfaces", "supplement": supplement_provenance, "downloadedAt": date.today().isoformat(),
        "archiveUrl": BASE + ARCHIVE,
        "archiveSha256": hashlib.sha256((args.source / ARCHIVE).read_bytes()).hexdigest(),
        "archiveBytes": (args.source / ARCHIVE).stat().st_size,
        "downloadPage": "https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html",
        "licensePage": "https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html",
        "attribution": ATTRIBUTION, "legacyAttribution": LEGACY_ATTRIBUTION,
        "currentOfficialLicense": "CC BY 4.0 (official page updated 2025-02-27)",
        "embeddedObjLicense": "CC BY-SA 2.1 Japan",
        "distributedGlbLicense": "CC BY-SA 2.1 Japan",
        "licenseUrl": "https://creativecommons.org/licenses/by-sa/2.1/jp/",
        "licenseNote": "Official current webpage and original OBJ headers differ. Both are preserved. Adapted GLBs retain the original file's attribution/share-alike license as a conservative redistribution choice.",
        "changes": ["Selection and semantic assembly of original anatomical OBJ elements", "Quadric-error mesh simplification for Web delivery", "Shared coordinate rotation (x,y,z) to (x,z,-y), centering and uniform scaling to 3.6 units height", "Smooth normals and new display materials", "Conversion from OBJ to indexed GLB with stable selectable mesh IDs"],
    }
    manifest = {
        "version": 1, "groups": groups, "structures": structures,
        "bounds": {"height": 3.6, "up": "+Y", "front": "+Z", "sourceMillimeters": source_bounds.tolist(), "transform": transform.tolist()},
        "source": provenance, "license": "CC BY-SA 2.1 Japan",
        "limitations": ["Selected teaching structures from an adult male reference body, not a complete atlas", "Muscles and spleen are not included in this initial selection; no absent layer control is exposed",
                        "Lung outer surfaces come from the official 3.0 archive and share the 4.0 reference coordinates; minor inter-version surface intersections may remain", "Geometric detail is reduced for Web performance; tiny internal branches may be lost", "Skull, spine, rib sides, hand bones and foot bones are grouped for accessible selection"],
    }
    (output / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
    (licenses / "provenance.json").write_text(json.dumps(provenance, ensure_ascii=False, indent=2) + "\n")
    for filename in files[1:]:
        shutil.copyfile(args.source / filename, licenses / filename)
    print(f"Exported {len(structures)} structures, {sum(g['bytes'] for g in groups)/1e6:.2f} MB total.")


if __name__ == "__main__":
    main()
