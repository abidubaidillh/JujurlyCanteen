import cv2
import numpy as np
import os
import time
from fastapi import APIRouter, UploadFile, File

from app.services.detector import detect_best_screen
from app.services.yolo_service import detect_phone_boxes
from app.services.supabase_service import upload_and_insert_db
from app.utils.image import four_point_warp
from app.utils.image_enhance import enhance_image
from app.utils.time import ts

router = APIRouter()

OUTPUT_DIR = "output"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Runtime lock: mencegah capture duplikat dalam satu sesi
HAS_CAPTURED = False


# ============================================================
# ENDPOINT: HEALTH CHECK
# ============================================================

@router.get("/")
def root():
    return {
        "message": "Jujurly Payment Detector API",
        "status": "active",
        "version": "2.0-sprint2"
    }


# ============================================================
# ENDPOINT 1: DETECT ONLY (Real-time feed dari kamera)
# Mendeteksi HP dan layar pembayaran tanpa menyimpan gambar.
# Dipanggil terus-menerus oleh frontend untuk animasi live.
# ============================================================

@router.post("/detect-payment-screen")
async def detect_payment_screen(file: UploadFile = File(...)):
    """
    SKPL-F-002: Deteksi keberadaan layar HP berisi bukti QRIS.
    Return: detected, confidence, box, status
    """
    try:
        contents = await file.read()
        image = cv2.imdecode(np.frombuffer(contents, np.uint8), cv2.IMREAD_COLOR)

        if image is None:
            return {"detected": False, "status": "invalid_image", "confidence": 0.0}

        # Deteksi layar terbaik menggunakan edge detection + perspective warp
        crop, score = detect_best_screen(image)

        # Deteksi kotak HP menggunakan YOLO
        phones = detect_phone_boxes(image)
        h, w = image.shape[:2]

        # Ambil bounding box pertama dari YOLO jika ada, fallback ke full frame
        if len(phones) > 0:
            x1, y1, x2, y2 = phones[0]
            box = {"x": int(x1), "y": int(y1), "w": int(x2 - x1), "h": int(y2 - y1)}
        else:
            box = {"x": 0, "y": 0, "w": w, "h": h}

        detected = crop is not None and score >= 0.45

        # Status real-time untuk animasi UI
        if not detected:
            status = "scanning"
        elif score < 0.7:
            status = "phone_detected"
        else:
            status = "payment_detected"

        print(f"[DETECT] status={status} | score={score:.2f} | detected={detected}")

        return {
            "detected": detected,
            "confidence": round(float(score), 2),
            "box": box,
            "status": status,
        }

    except Exception as e:
        print(f"[ERROR /detect-payment-screen] {e}")
        return {"detected": False, "status": "error", "confidence": 0.0}


# ============================================================
# ENDPOINT 2: CAPTURE + SUPABASE BRIDGE (Gambar stabil terdeteksi)
# 1. Validasi gambar
# 2. Warp perspektif layar HP
# 3. Resize ≤1024px (SKPL-NF-002: efisiensi bandwidth)
# 4. Upload ke Supabase Storage + insert ke bukti_pembayaran
# ============================================================

@router.post("/capture-payment")
async def capture_payment(file: UploadFile = File(...)):
    """
    SKPL-F-003: Capture gambar stabil dan simpan ke cloud.
    Gambar dikirim tanpa filter denoising berat agar OCR di Next.js
    tidak terganggu efek Moiré (sesuai SKPL-NF-010).
    """
    global HAS_CAPTURED

    # Hard lock: anti-duplikat per sesi
    if HAS_CAPTURED:
        print("[CAPTURE] Dikunci: sudah ada capture sebelumnya.")
        return {
            "success": False,
            "message": "Sesi sudah memiliki capture. Reset server untuk scan baru.",
            "status": "locked",
        }

    start_time = time.time()

    try:
        contents = await file.read()
        image = cv2.imdecode(np.frombuffer(contents, np.uint8), cv2.IMREAD_COLOR)

        if image is None:
            return {"success": False, "status": "invalid_image"}

        # ---- PIPELINE 1: Deteksi & Warp Perspektif ----
        # detect_best_screen mengembalikan area layar yang sudah di-warp datar
        crop, score = detect_best_screen(image)
        final_image = crop if crop is not None else image
        print(f"[CAPTURE] Score deteksi layar: {score:.2f}")

        # ---- PIPELINE 2: Resize (SKPL-NF-002 - efisiensi) ----
        # TIDAK menggunakan denoising berat (fastNlMeans / CLAHE) 
        # agar karakter teks tidak rusak untuk OCR di Next.js
        final_image = enhance_image(final_image)

        # ---- PIPELINE 3: Simpan lokal sebagai backup ----
        filename = f"bukti_{ts()}.jpg"
        save_path = os.path.join(OUTPUT_DIR, filename)
        cv2.imwrite(save_path, final_image, [cv2.IMWRITE_JPEG_QUALITY, 95])
        print(f"[CAPTURE] Tersimpan lokal: {save_path}")

        # ---- PIPELINE 4: Upload ke Supabase Storage + Insert DB ----
        # Insert ke bukti_pembayaran dengan status="pending" akan memicu
        # Supabase Realtime di Next.js untuk menjalankan OCR otomatis
        print("[CAPTURE] Mengunggah ke Supabase...")
        upload_success = upload_and_insert_db(save_path, filename)

        if not upload_success:
            return {
                "success": False,
                "status": "supabase_error",
                "message": "Gagal mengunggah ke Supabase. Cek koneksi dan konfigurasi.",
            }

        # Set lock setelah berhasil
        HAS_CAPTURED = True

        elapsed = round(time.time() - start_time, 2)
        print(f"[CAPTURE] ✅ Selesai dalam {elapsed}s | filename: {filename}")

        # Peringatan SKPL-NF-002 jika melebihi 5 detik
        if elapsed > 5.0:
            print(f"[WARNING SKPL-NF-002] Waktu capture ({elapsed}s) melebihi target 5 detik!")

        return {
            "success": True,
            "filename": filename,
            "confidence": round(float(score), 2),
            "processing_time_s": elapsed,
            "status": "captured",
        }

    except Exception as e:
        print(f"[ERROR /capture-payment] {e}")
        return {"success": False, "status": "error", "message": str(e)}


# ============================================================
# ENDPOINT 3: RESET LOCK (Untuk keperluan testing / multi-scan)
# ============================================================

@router.post("/reset")
def reset_capture_lock():
    """Mereset lock HAS_CAPTURED agar capture bisa dilakukan lagi."""
    global HAS_CAPTURED
    HAS_CAPTURED = False
    print("[RESET] Lock HAS_CAPTURED direset.")
    return {"success": True, "message": "Capture lock direset. Siap scan berikutnya."}