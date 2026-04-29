from fastapi import APIRouter, UploadFile, File
import cv2
import numpy as np
import os
from supabase import create_client, Client # 🔥 Import Supabase

from app.services.detector import detect_best_screen
from app.services.yolo_service import detect_phone_boxes
from app.utils.time import ts
from app.utils.image_enhance import enhance_image

router = APIRouter()

OUTPUT_DIR = "output"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# 🔥 KONFIGURASI SUPABASE (Pastikan URL dan Key diisi dengan milikmu!)
SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://wwovpyyynxpyrvljadtk.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3b3ZweXl5bnhweXJ2bGphZHRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNTYwNjAsImV4cCI6MjA5MTgzMjA2MH0.17vqZxZg6zjM_gVmCdSSBl30mJmHNAkHJummlQU8YOI")

# Inisialisasi client Supabase
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# 🔥 runtime lock
HAS_CAPTURED = False


# =========================
# ROOT
# =========================
@router.get("/")
def root():
    return {
        "message": "Payment Detector API Running",
        "status": "active"
    }


# =========================
# DETECT ONLY (REAL-TIME FEED)
# =========================
@router.post("/detect-payment-screen")
async def detect_payment_screen(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        image = cv2.imdecode(np.frombuffer(contents, np.uint8), cv2.IMREAD_COLOR)

        if image is None:
            return {
                "detected": False,
                "status": "invalid_image"
            }

        crop, score = detect_best_screen(image)
        phones = detect_phone_boxes(image)

        h, w = image.shape[:2]

        # 🔥 ALWAYS VALID BOX (frontend-safe)
        if len(phones) > 0:
            x1, y1, x2, y2 = phones[0]
            box = {
                "x": x1,
                "y": y1,
                "w": x2 - x1,
                "h": y2 - y1
            }
        else:
            box = {
                "x": 0,
                "y": 0,
                "w": w,
                "h": h
            }

        detected = crop is not None and score >= 0.45

        # =========================
        # 🔥 REAL-TIME STATUS ENGINE
        # =========================
        if not detected:
            status = "scanning"
        elif score < 0.7:
            status = "phone_detected"
        else:
            status = "payment_detected"

        print(f"[DETECT] status={status} score={score:.2f}")

        return {
            "detected": detected,
            "confidence": round(float(score), 2),
            "box": box,

            # 🔥 NEW REAL-TIME FIELD
            "status": status
        }

    except Exception as e:
        print("[ERROR DETECT]", str(e))
        return {
            "detected": False,
            "status": "error"
        }


# =========================
# CAPTURE + SAVE TO SUPABASE
# =========================
@router.post("/capture-payment")
async def capture_payment(file: UploadFile = File(...)):
    global HAS_CAPTURED

    # 🔥 HARD LOCK (ANTI DUPLICATE)
    if HAS_CAPTURED:
        return {
            "success": False,
            "message": "already_captured",
            "status": "locked"
        }

    try:
        contents = await file.read()
        image = cv2.imdecode(np.frombuffer(contents, np.uint8), cv2.IMREAD_COLOR)

        if image is None:
            return {
                "success": False,
                "status": "invalid_image"
            }

        crop, score = detect_best_screen(image)

        final_image = crop if crop is not None else image

        # =========================
        # 🔥 IMAGE ENHANCEMENT PIPELINE
        # =========================
        final_image = enhance_image(final_image)

        filename = f"bukti_{ts()}.jpg" # Menggunakan format nama yang sama dengan sistemmu
        save_path = os.path.join(OUTPUT_DIR, filename)

        # 1. Simpan ke folder lokal sebagai backup
        cv2.imwrite(save_path, final_image)
        print(f"[CAPTURE] Tersimpan lokal di: {save_path}")

        # 2. 🔥 UPLOAD KE SUPABASE
        try:
            print("[SUPABASE] Sedang mengunggah ke Cloud...")
            # Upload file fisik ke Storage 'bukti-transfer'
            with open(save_path, 'rb') as f:
                supabase.storage.from_("bukti-transfer").upload(f"public/{filename}", f)
            
            # Insert baris ke Database (Ini yang memicu Realtime di Next.js!)
            supabase.table("bukti_pembayaran").insert({
                "file_gambar": f"public/{filename}",
                "status": "pending"
            }).execute()
            
            print(f"[SUPABASE] ✅ Berhasil upload dan trigger Realtime!")
        except Exception as sb_error:
            print("[ERROR SUPABASE] Gagal upload:", str(sb_error))
            # Jika gagal upload ke Supabase, lepaskan lock agar bisa mencoba lagi
            return {
                "success": False,
                "status": "supabase_error",
                "message": str(sb_error)
            }

        HAS_CAPTURED = True

        return {
            "success": True,
            "filename": filename,
            "confidence": round(float(score), 2),
            "status": "captured"
        }

    except Exception as e:
        print("[ERROR CAPTURE]", str(e))
        return {
            "success": False,
            "status": "error"
        }