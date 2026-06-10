# app/api/payment.py

import cv2
import numpy as np
import os
import tempfile
import time
from fastapi import APIRouter, UploadFile, File

from app.services.detector import detect_best_screen
from app.services.yolo_service import detect_phone_boxes
from app.services.supabase_service import upload_and_insert_db
from app.utils.image_enhance import enhance_image
from app.utils.time import ts

router = APIRouter()

# ============================================================
# OUTPUT DIR
# ============================================================
_BASE_TMP = os.path.join(tempfile.gettempdir(), "jujurly_detector")
OUTPUT_DIR = os.path.join(_BASE_TMP, "output")
DEBUG_DIR = os.path.join(_BASE_TMP, "debug_frames")

os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(DEBUG_DIR, exist_ok=True)

print(f"[INIT] OUTPUT_DIR → {OUTPUT_DIR}")
print(f"[INIT] DEBUG_DIR  → {DEBUG_DIR}")

# LOCK
HAS_CAPTURED = False
LAST_BOX = None

# ============================================================
# HEALTH CHECK
# ============================================================
@router.get("/")
def root():
    return {
        "message": "Jujurly Payment Detector API",
        "status": "active",
        "version": "3.1-final"
    }


# ============================================================
# DETECT ONLY
# ============================================================
def calculate_iou(boxA, boxB):
    xA = max(boxA["x"], boxB["x"])
    yA = max(boxA["y"], boxB["y"])
    xB = min(boxA["x"] + boxA["w"], boxB["x"] + boxB["w"])
    yB = min(boxA["y"] + boxA["h"], boxB["y"] + boxB["h"])

    interArea = max(0, xB - xA) * max(0, yB - yA)
    boxAArea = boxA["w"] * boxA["h"]
    boxBArea = boxB["w"] * boxB["h"]

    return interArea / float(boxAArea + boxBArea - interArea) if (boxAArea + boxBArea - interArea) > 0 else 0

@router.post("/detect-payment-screen")
async def detect_payment_screen(file: UploadFile = File(...)):
    global LAST_BOX
    try:
        contents = await file.read()
        np_arr = np.frombuffer(contents, np.uint8)
        image = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

        if image is None:
            return {"detected": False, "status": "invalid_image", "confidence": 0.0}

        try:
            crop, score, screen_box = detect_best_screen(image)
            score = float(score) if score is not None else 0.0

            phones = detect_phone_boxes(image)
        except Exception as e:
            print(f"[ERROR YOLO inference] {e}")
            return {"detected": False, "status": "model_error", "confidence": 0.0, "box": None}

        h, w = image.shape[:2]

        DETECT_THRESHOLD = 0.80
        
        has_phone = len(phones) > 0
        has_screen = crop is not None and score >= DETECT_THRESHOLD

        # Payment is detected ONLY if BOTH phone and screen are present
        detected = has_phone and has_screen

        if has_phone:
            x1, y1, x2, y2 = phones[0]
            box = {
                "x": int(x1),
                "y": int(y1),
                "w": int(x2 - x1),
                "h": int(y2 - y1),
            }
        elif screen_box is not None:
            box = screen_box
        else:
            box = {"x": 0, "y": 0, "w": w, "h": h}

        # ========================================================
        # SIZE VALIDATION
        # ========================================================
        if detected:
            frame_area = w * h
            box_area = box["w"] * box["h"]
            if box_area < 0.25 * frame_area:
                print(f"⚠️ Box too small ({(box_area/frame_area)*100:.1f}% < 25%), rejecting.")
                detected = False
                score = min(score, 0.7) # Turunkan agar tidak dianggap valid

        # ========================================================
        # IOU SMOOTHING (ANTI-FLICKER)
        # ========================================================
        if not detected and LAST_BOX is not None and score >= 0.15:
            iou = calculate_iou(box, LAST_BOX)
            if iou > 0.75:
                # Force detection to stay true and bump score slightly above frontend threshold
                detected = True
                score = max(score, 0.85) 
                print(f"🔥 IOU Smoothing Applied! IOU: {iou:.2f}, Score bumped to: {score:.2f}")

        # Update last box if detected, else clear
        LAST_BOX = box if detected else None

        if detected:
            status = "payment_detected"
        elif has_screen and not has_phone:
            status = "unknown_object"
        elif has_phone:
            status = "phone_detected"
        else:
            status = "scanning"

        # DEBUG SAVE
        if not detected:
            debug_path = os.path.join(DEBUG_DIR, f"fail_{ts()}.jpg")
            cv2.imwrite(debug_path, image)

        return {
            "detected": detected,
            "confidence": round(score, 2),
            "box": box,
            "status": status,
        }

    except Exception as e:
        print(f"[ERROR detect] {e}")
        return {"detected": False, "status": "error", "confidence": 0.0}


# ============================================================
# CAPTURE + UPLOAD
# ============================================================
@router.post("/capture-payment")
async def capture_payment(file: UploadFile = File(...)):
    global HAS_CAPTURED

    if HAS_CAPTURED:
        return {
            "success": False,
            "status": "locked",
            "message": "Already captured"
        }

    start_time = time.time()

    try:
        contents = await file.read()
        image = cv2.imdecode(np.frombuffer(contents, np.uint8), cv2.IMREAD_COLOR)

        if image is None:
            return {"success": False, "status": "invalid_image"}

        # ========================================================
        # DETECT (untuk mengisi field box di respons)
        # ========================================================
        phones = detect_phone_boxes(image)
        h, w = image.shape[:2]

        if len(phones) > 0:
            x1b, y1b, x2b, y2b = phones[0]
            capture_box = {
                "x": int(x1b),
                "y": int(y1b),
                "w": int(x2b - x1b),
                "h": int(y2b - y1b),
            }
        else:
            capture_box = {"x": 0, "y": 0, "w": w, "h": h}

        # ========================================================
        # DETECT SCREEN
        # ========================================================
        crop, score, _ = detect_best_screen(image)
        score = float(score) if score is not None else 0.0

        if crop is not None:
            final_image = crop
        else:
            if len(phones) > 0:
                x1, y1, x2, y2 = phones[0]
                PAD = 20

                x1 = max(0, x1 - PAD)
                y1 = max(0, y1 - PAD)
                x2 = min(image.shape[1], x2 + PAD)
                y2 = min(image.shape[0], y2 + PAD)

                final_image = image[y1:y2, x1:x2]
            else:
                final_image = image

        # ========================================================
        # ENHANCE
        # ========================================================
        final_image = enhance_image(final_image)

        # ========================================================
        # SAVE
        # ========================================================
        filename = f"bukti_{ts()}.jpg"
        save_path = os.path.join(OUTPUT_DIR, filename)

        cv2.imwrite(save_path, final_image, [cv2.IMWRITE_JPEG_QUALITY, 95])

        print(f"[CAPTURE] Saved → {save_path}")

        # ========================================================
        # UPLOAD
        # ========================================================
        upload_result = upload_and_insert_db(save_path, filename)

        if not upload_result.get("success"):
            return {
                "success": False,
                "status": "supabase_error",
                "message": upload_result.get("error"),
            }

        file_path = upload_result.get("file_path")
        db_data = upload_result.get("data")
        public_url = upload_result.get("public_url") or ""

        record_id = None
        if isinstance(db_data, list) and len(db_data) > 0:
            record_id = db_data[0].get("id_bukti") or db_data[0].get("id")

        HAS_CAPTURED = True

        elapsed = round(time.time() - start_time, 2)

        return {
            "success": True,
            "id_bukti": record_id,
            "file_path": file_path,
            "public_url": public_url,
            "box": capture_box,
            "confidence": round(score, 2),
            "processing_time_s": elapsed,
            "status": "captured",
        }

    except Exception as e:
        print(f"[ERROR capture] {e}")
        return {
            "success": False,
            "status": "error",
            "message": str(e)
        }


# ============================================================
# RESET LOCK
# ============================================================
@router.post("/reset")
@router.post("/reset-session")
@router.post("/reset-capture")
def reset_capture_lock():
    global HAS_CAPTURED
    HAS_CAPTURED = False
    print("[RESET] Lock reset")
    return {"success": True}