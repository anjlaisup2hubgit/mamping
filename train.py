# Fits a candidate roof detector on frozen reviewed scenes, then evaluates and exports it.
import argparse
import math
import os
import shutil
import uuid
from datetime import datetime, timezone
from pathlib import Path
from training_tools.dataset import prepare_dataset, read_json, write_json

ROOT = Path(os.environ.get("TRAINING_DATA_DIR", "training")).resolve()


def say(**state):
    write_json(ROOT / "train.json", {"pid": os.getpid(), **state})


def score(result):
    value = float(result.box.map50)
    if not math.isfinite(value) or not 0 <= value <= 1:
        raise ValueError("Evaluation did not produce a usable score. Keep more complete evaluation pictures.")
    return value


def main(args):
    os.environ.setdefault("YOLO_AUTOINSTALL", "False")
    os.environ.setdefault("YOLO_CONFIG_DIR", str(ROOT / ".config"))
    os.environ.setdefault("MPLCONFIGDIR", str(ROOT / ".matplotlib"))
    from ultralytics import YOLO
    import torch
    torch.set_num_threads(min(4, os.cpu_count() or 1))
    version = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S") + "-" + uuid.uuid4().hex[:8]
    output = ROOT / "models" / version
    dataset, split = prepare_dataset(ROOT, output / "dataset")
    registry = read_json(ROOT / "models.json")
    active = registry.get("active")
    baseline_path = ROOT / active["artifacts"]["weights"] if active else Path(args.base)
    say(state="running", epoch=0, epochs=args.epochs, stage="Evaluating baseline", version=version)
    baseline = YOLO(str(baseline_path))
    evaluation_args = dict(data=str(dataset), imgsz=args.imgsz, batch=args.batch, workers=args.workers,
                           device=args.device, plots=False, single_cls=True, verbose=False,
                           project=str(output), exist_ok=True)
    baseline_score = score(baseline.val(**evaluation_args, name="baseline"))
    model = YOLO(str(baseline_path))
    model.add_callback("on_fit_epoch_end", lambda trainer: say(state="running", epoch=trainer.epoch + 1,
                       epochs=args.epochs, stage="Training", version=version))
    model.train(data=str(dataset), epochs=args.epochs, imgsz=args.imgsz, batch=args.batch,
                workers=args.workers, device=args.device, project=str(output), name="fit", exist_ok=True,
                plots=False, single_cls=True, seed=42, deterministic=True, verbose=False)
    best = output / "fit" / "weights" / "best.pt"
    if not best.exists():
        raise ValueError("Training finished without model weights.")
    shutil.copy2(best, output / "best.pt")
    candidate = YOLO(str(output / "best.pt"))
    say(state="running", epoch=args.epochs, epochs=args.epochs, stage="Evaluating candidate", version=version)
    candidate_score = score(candidate.val(**evaluation_args, name="evaluation"))
    say(state="running", epoch=args.epochs, epochs=args.epochs, stage="Exporting model", version=version)
    exported = Path(candidate.export(format="onnx", imgsz=768, dynamic=False, simplify=False, opset=17,
                                     device="cpu", nms=False))
    onnx_file = output / "best.onnx"
    if exported.resolve() != onnx_file.resolve():
        shutil.copy2(exported, onnx_file)
    import onnx
    onnx.checker.check_model(str(onnx_file))
    entry = {"version": version, "createdAt": datetime.now(timezone.utc).isoformat(),
             "pictures": len(split["trainNames"]) + len(split["validationNames"]),
             "trainPictures": len(split["trainNames"]), "validationPictures": len(split["validationNames"]),
             "score": candidate_score, "baselineScore": baseline_score,
             "baselineSource": active["version"] if active else args.base,
             "artifacts": {"weights": str((output / "best.pt").relative_to(ROOT)),
                           "onnx": str(onnx_file.relative_to(ROOT))},
             "evaluation": {"candidate": candidate_score, "baseline": baseline_score,
                            "trainNames": split["trainNames"], "validationNames": split["validationNames"],
                            "trainGroups": split["trainGroups"], "validationGroups": split["validationGroups"]}}
    write_json(output / "model.json", entry)
    # Read again so activating another completed model while this one fits is not overwritten.
    registry = read_json(ROOT / "models.json", {"active": None, "previous": None})
    registry["candidate"] = entry
    write_json(ROOT / "models.json", registry)
    say(state="done", epoch=args.epochs, epochs=args.epochs, pictures=entry["pictures"], score=candidate_score,
        baselineScore=baseline_score, version=version, evaluation=entry["evaluation"], stage="Ready for review")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train a local roof model without mixing training and evaluation areas.")
    parser.add_argument("epochs", nargs="?", type=int, default=50)
    parser.add_argument("--imgsz", type=int, default=768)
    parser.add_argument("--batch", type=int, default=4)
    parser.add_argument("--workers", type=int, default=0)
    parser.add_argument("--device", default="cpu")
    parser.add_argument("--base", default="yolo11n.pt")
    options = parser.parse_args()
    try:
        if not 1 <= options.epochs <= 1000:
            raise ValueError("Choose between 1 and 1000 training rounds.")
        main(options)
    except Exception as error:
        say(state="failed", error=str(error), finishedAt=datetime.now(timezone.utc).isoformat())
        raise
    finally:
        (ROOT / "train.lock").unlink(missing_ok=True)
