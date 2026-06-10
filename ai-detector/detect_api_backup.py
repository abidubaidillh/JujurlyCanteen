from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from ultralytics import YOLO
import cv2
import numpy as np
import os
from datetime import datetime

app = FastAPI(title="Payment Screen Detector API")

# =========================
# CORS
# =========================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

OUTPUT_DIR = "output"
os.makedirs(OUTPUT_DIR, exist_ok=True)

print("[YOLO] Loading yolov8n model...")
model = YOLO("yolov8n.pt")
print("[YOLO] Model ready")

PHONE_CLASS_ID = 67

# 🔥 GLOBAL LOCK (ANTI SPAM CAPTURE)
HAS_CAPTURED = False


def ts():
    return datetime.now().strftime("%Y%m%d_%H%M%S_%f")[:-3]


# =========================
# HELPER
# =========================
def order_points(pts):
    pts = pts.reshape(4, 2).astype("float32")
    s = pts.sum(axis=1)
    d = np.diff(pts, axis=1).ravel()

    return np.array([
        pts[np.argmin(s)],
        pts[np.argmin(d)],
        pts[np.argmax(s)],
        pts[np.argmax(d)],
    ], dtype="float32")


def four_point_warp(image, pts):
    rect = order_points(pts)
    tl, tr, br, bl = rect

    width = int(max(
        np.linalg.norm(br - bl),
        np.linalg.norm(tr - tl)
    ))

    height = int(max(
        np.linalg.norm(tr - br),
        np.linalg.norm(tl - bl)
    ))

    if width < 100 or height < 100:
        return None

    dst = np.array([
        [0, 0],
        [width - 1, 0],
        [width - 1, height - 1],
        [0, height - 1]
    ], dtype="float32")

    matrix = cv2.getPerspectiveTransform(rect, dst)
    warped = cv2.warpPerspective(image, matrix, (width, height))

    return warped


# =========================
# SCORING
# =========================
def payment_screen_score(crop):
    h, w = crop.shape[:2]
    if h == 0 or w == 0:
        return 0.0

    score = 0.0

    ar = h / max(w, 1)
    if 1.2 <= ar <= 3.0:
        score += 0.25

    gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)

    bright_ratio = (gray > 150).mean()
    if bright_ratio > 0.2:
        score += 0.25

    edges = cv2.Canny(gray, 50, 150)
    line_ratio = edges.sum() / (255 * h * w + 1)
    if line_ratio > 0.0005:
        score += 0.25

    hsv = cv2.cvtColor(crop, cv2.COLOR_BGR2HSV)
    sat_mean = hsv[:, :, 1].mean()
    if sat_mean < 100:
        score += 0.25

    return min(score, 1.0)


# =========================
# YOLO
# =========================
def detect_phone_boxes(image):
    results = model(
        image,
        classes=[PHONE_CLASS_ID],
        verbose=False,
        conf=0.25
    )[0]

    boxes = []

    for box in results.boxes:
        x1, y1, x2, y2 = map(int, box.xyxy[0])
        boxes.append((x1, y1, x2, y2))

    return boxes


# =========================
# SCREEN DETECTOR
# =========================
def detect_best_screen(image):
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    edges = cv2.Canny(gray, 50, 150)

    contours, _ = cv2.findContours(
        edges,
        cv2.RETR_EXTERNAL,
        cv2.CHAIN_APPROX_SIMPLE
    )

    best_crop = None
    best_score = 0.0

    for cnt in sorted(contours, key=cv2.contourArea, reverse=True)[:20]:
        if cv2.contourArea(cnt) < 10000:
            continue

        peri = cv2.arcLength(cnt, True)
        approx = cv2.approxPolyDP(cnt, 0.02 * peri, True)

        if not (4 <= len(approx) <= 6):
            continue

        crop = four_point_warp(image, approx)
        if crop is None:
            continue

        score = payment_screen_score(crop)

        if score > best_score:
            best_score = score
            best_crop = crop

    return best_crop, best_score


# =========================
# ROUTES
# =========================
@app.get("/")
def root():
    return {"message": "Payment Detector API Running"}


# 🔍 DETECT ONLY
@app.post("/detect-payment-screen")
async def detect_payment_screen(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        image = cv2.imdecode(np.frombuffer(contents, np.uint8), cv2.IMREAD_COLOR)

        if image is None:
            return {"detected": False}

        crop, score = detect_best_screen(image)
        phones = detect_phone_boxes(image)

        h, w = image.shape[:2]

        # 🔥 SELALU ADA BOX
        if len(phones) > 0:
            x1, y1, x2, y2 = phones[0]
            box = {
                "x": x1,
                "y": y1,
                "w": x2 - x1,
                "h": y2 - y1
            }
        else:
            # fallback full frame
            box = {
                "x": 0,
                "y": 0,
                "w": w,
                "h": h
            }

        detected = crop is not None and score >= 0.45

        print(f"[DETECT] score={score:.2f} detected={detected}")

        return {
            "detected": detected,
            "confidence": round(float(score), 2),
            "box": box
        }

    except Exception as e:
        print("[ERROR DETECT]", str(e))
        return {"detected": False}


# 📸 CAPTURE ONLY (ANTI SPAM)
@app.post("/capture-payment")
async def capture_payment(file: UploadFile = File(...)):
    global HAS_CAPTURED

    # 🔥 HARD LOCK
    if HAS_CAPTURED:
        print("[BLOCKED] Already captured")
        return {"success": False, "message": "already_captured"}

    try:
        contents = await file.read()
        image = cv2.imdecode(np.frombuffer(contents, np.uint8), cv2.IMREAD_COLOR)

        if image is None:
            return {"success": False}

        crop, score = detect_best_screen(image)

        final_image = crop if crop is not None else image

        filename = f"payment_{ts()}.jpg"
        save_path = os.path.join(OUTPUT_DIR, filename)

        cv2.imwrite(save_path, final_image)

        HAS_CAPTURED = True  # 🔥 LOCK SET

        print(f"[CAPTURE] Saved: {filename}")

        return {
            "success": True,
            "filename": filename,
            "confidence": round(float(score), 2)
        }

    except Exception as e:
        print("[ERROR CAPTURE]", str(e))
        return {"success": False}