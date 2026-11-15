"""Read one satellite JPEG from stdin and run the active exported ONNX roof detector."""
import base64
import contextlib
import io
import json
import os
import sys
from pathlib import Path

root = Path(os.environ.get("TRAINING_DATA_DIR", "training")).resolve()
os.environ.setdefault("YOLO_CONFIG_DIR", str(root / ".config"))
os.environ.setdefault("MPLCONFIGDIR", str(root / ".matplotlib"))
os.environ.setdefault("YOLO_AUTOINSTALL", "False")


def main():
    from PIL import Image
    request = json.loads(sys.stdin.read(4_000_100))
    image = Image.open(io.BytesIO(base64.b64decode(request["image"], validate=True))).convert("RGB")
    if image.size != (768, 768):
        raise ValueError("The roof detector expects a 768 by 768 satellite picture.")
    with contextlib.redirect_stdout(sys.stderr):
        from ultralytics import YOLO
        import torch
        torch.set_num_threads(min(4, os.cpu_count() or 1))
        detector = YOLO(sys.argv[1], task="detect")
        result = detector.predict(image, imgsz=768, conf=0.2, device="cpu", verbose=False)[0]
    buildings = []
    for bounds, confidence in zip(result.boxes.xyxy.tolist(), result.boxes.conf.tolist()):
        x0, y0, x1, y1 = [max(0, min(768, float(n))) for n in bounds]
        if x1 <= x0 or y1 <= y0:
            continue
        buildings.append({"points": [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], "confidence": float(confidence)})
    print(json.dumps({"buildings": buildings}, allow_nan=False))


if __name__ == "__main__":
    main()
