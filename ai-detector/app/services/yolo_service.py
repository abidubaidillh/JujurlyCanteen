from ultralytics import YOLO

print("[YOLO] Loading model...")
model = YOLO("yolov8n.pt")
print("[YOLO] Ready")

PHONE_CLASS_ID = 67


def detect_phone_boxes(image):
    results = model(image, classes=[PHONE_CLASS_ID], verbose=False, conf=0.25)[0]

    boxes = []

    for box in results.boxes:
        x1, y1, x2, y2 = map(int, box.xyxy[0])
        boxes.append((x1, y1, x2, y2))

    return boxes