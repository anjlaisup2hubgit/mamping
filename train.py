# Teaches a roof detector (YOLO) from the pictures you kept on the Training page.
# The Train button starts it; it writes how far it is to training/train.json, and the finished detector to training/runs/roofs/weights/best.pt.
import json
import os
import sys
from pathlib import Path

ROOT = Path("training").resolve()
ROUNDS = int(sys.argv[1]) if len(sys.argv) > 1 else 50  # how many times it studies every picture


def say(**state):
    (ROOT / "train.json").write_text(json.dumps({"pid": os.getpid(), **state}))


def main():
    status = json.loads((ROOT / "status.json").read_text())
    kept = sorted(str(ROOT / "images" / f"{name}.jpg") for name, s in status.items() if s == "kept" and (ROOT / "images" / f"{name}.jpg").exists())
    if not kept:
        return say(state="failed", error="Keep some pictures first.")
    test = kept[::5]  # every 5th picture is held back to test the detector on pictures it has not studied
    study = [p for p in kept if p not in test] or test
    (ROOT / "train.txt").write_text("\n".join(study))
    (ROOT / "val.txt").write_text("\n".join(test))
    (ROOT / "data.yaml").write_text(f"path: {ROOT.as_posix()}\ntrain: train.txt\nval: val.txt\nnames:\n  0: roof\n")
    say(state="running", epoch=0, epochs=ROUNDS)

    from ultralytics import YOLO
    model = YOLO(str(ROOT / "yolo11s.pt"))  # a ready-made detector to start from, downloaded the first time
    model.add_callback("on_fit_epoch_end", lambda t: say(state="running", epoch=t.epoch + 1, epochs=t.epochs))
    result = model.train(data=str(ROOT / "data.yaml"), epochs=ROUNDS, imgsz=768, batch=8, project=str(ROOT / "runs"), name="roofs", exist_ok=True,
                         plots=False)  # we do not use its own preview drawings (and they crashed on Python 3.15)
    say(state="done", pictures=len(kept), score=float(result.box.map50))  # score: 0 to 1, how well it finds roofs in the held-back pictures


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        say(state="failed", error=str(e))
        raise
