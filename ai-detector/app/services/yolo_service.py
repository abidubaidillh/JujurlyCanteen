from pathlib import Path
from ultralytics import YOLO

# Path absolut — jalan dari mana pun run.py dieksekusi
_MODEL_PATH = Path(__file__).parent.parent.parent / "yolov8n.pt"

print(f"[YOLO] Loading model from {_MODEL_PATH} ...")
if not _MODEL_PATH.exists():
    raise FileNotFoundError(f"[YOLO] Model tidak ditemukan: {_MODEL_PATH}")

model = YOLO(str(_MODEL_PATH))
print("[YOLO] Ready")

PHONE_CLASS_ID = 67


def detect_phone_boxes(image):
    results = model(image, classes=[PHONE_CLASS_ID], verbose=False, conf=0.25)[0]
    boxes = []
    for box in results.boxes:
        x1, y1, x2, y2 = map(int, box.xyxy[0])
        boxes.append((x1, y1, x2, y2))
    return boxes
