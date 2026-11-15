"""Freeze reviewed scenes and split entire geographic areas before fitting a roof model."""
import hashlib
import json
import math
import random
import re
import shutil
from pathlib import Path


def read_json(file, fallback=None):
    try:
        return json.loads(Path(file).read_text())
    except (OSError, ValueError):
        return {} if fallback is None else fallback


def write_json(file, value):
    file = Path(file)
    file.parent.mkdir(parents=True, exist_ok=True)
    temporary = file.with_suffix(file.suffix + ".tmp")
    temporary.write_text(json.dumps(value, indent=2, allow_nan=False))
    temporary.replace(file)


def location_group(name, details):
    centre = details.get("centre")
    if centre is None:
        try:
            centre = [float(n) for n in name.split("_")]
        except ValueError:
            centre = None
    if not isinstance(centre, list) or len(centre) != 2 or not all(isinstance(n, (int, float)) and math.isfinite(n) for n in centre):
        raise ValueError(f"Picture {name} needs its map location. Save it from the map again.")
    return f"{math.floor(centre[0] * 100)}:{math.floor(centre[1] * 100)}"


def prepare_dataset(root, destination):
    root, destination = Path(root), Path(destination)
    status, metadata = read_json(root / "status.json"), read_json(root / "samples.json")
    groups, samples = {}, {}
    for name, choice in sorted(status.items()):
        if choice != "kept" or not re.fullmatch(r"[a-zA-Z0-9][\w.-]{0,119}", name):
            continue
        details = metadata.get(name, {})
        if details and details.get("reviewedRevision") != details.get("revision"):
            continue
        image, labels = root / "images" / f"{name}.jpg", root / "labels" / f"{name}.txt"
        if not image.exists() or not labels.exists():
            raise ValueError(f"Picture or labels are missing for {name}.")
        group = location_group(name, details)
        groups.setdefault(group, []).append(name)
        samples[name] = {"revision": details.get("revision", 1), "group": group,
                         "imageHash": hashlib.sha256(image.read_bytes()).hexdigest(),
                         "labelsHash": hashlib.sha256(labels.read_bytes()).hexdigest()}
    if len(groups) < 2:
        raise ValueError("Keep complete pictures from at least two geographic areas about 1 km apart; one area is reserved for evaluation.")
    areas = sorted(groups)
    random.Random(42).shuffle(areas)
    roles = read_json(root / "split-groups.json")
    if not roles:
        # A new evaluation area must not have been used by an already-active detector.
        active = read_json(root / "models.json").get("active") or {}
        evaluation = active.get("evaluation", {})
        roles.update({g: "train" for g in evaluation.get("trainGroups", [])})
        roles.update({g: "validation" for g in evaluation.get("validationGroups", []) if g not in roles})
    if not roles:
        count = max(1, min(len(areas) - 1, round(len(areas) * 0.2)))
        roles = {area: "validation" if i < count else "train" for i, area in enumerate(areas)}
    for area in areas:
        if area not in roles:
            roles[area] = "validation" if int(hashlib.sha256(area.encode()).hexdigest(), 16) % 5 == 0 else "train"
    val_groups = [area for area in areas if roles[area] == "validation"]
    train_groups = [area for area in areas if roles[area] == "train"]
    if not val_groups or not train_groups:
        raise ValueError("The fixed geographic split needs reviewed roof scenes in both training and evaluation areas. Add more areas; do not reuse a training area for evaluation.")
    validation = sorted(name for area in val_groups for name in groups[area])
    train = sorted(name for area in train_groups for name in groups[area])
    for title, names in [("Training", train), ("Evaluation", validation)]:
        if not any((root / "labels" / f"{name}.txt").read_text().strip() for name in names):
            raise ValueError(f"{title} needs at least one reviewed picture containing a roof; empty scenes can be included too.")
    write_json(root / "split-groups.json", roles)
    for folder in ["images", "labels"]:
        (destination / folder).mkdir(parents=True, exist_ok=True)
        for name in train + validation:
            extension = "jpg" if folder == "images" else "txt"
            shutil.copy2(root / folder / f"{name}.{extension}", destination / folder / f"{name}.{extension}")
    for filename, names in [("train.txt", train), ("val.txt", validation)]:
        (destination / filename).write_text("\n".join(str((destination / "images" / f"{name}.jpg").resolve()) for name in names) + "\n")
    dataset = destination / "data.yaml"
    dataset.write_text(f"path: {json.dumps(str(destination.resolve()))}\ntrain: train.txt\nval: val.txt\nnames:\n  0: roof\n")
    split = {"trainNames": train, "validationNames": validation, "trainGroups": train_groups, "validationGroups": val_groups, "samples": samples}
    write_json(destination / "split.json", split)
    return dataset, split
