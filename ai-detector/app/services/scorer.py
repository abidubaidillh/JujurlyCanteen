import cv2
import numpy as np
import re


# ============================================================
# OCR SCORE  (bobot 70%)
# ============================================================
def ocr_payment_score(text: str) -> float:
    if not text or len(text.strip()) < 5:
        return 0.0

    score = 0.0
    text  = text.lower().strip()

    # 1. Panjang teks
    if len(text) >= 20:
        score += 0.25

    # 2. Nominal uang (format Rupiah)
    amount_patterns = [
        r"rp\.?\s?\d[\d\.]+",       # Rp 50.000 / Rp50000
        r"idr\s?\d+",
        r"\d{1,3}(?:\.\d{3})+",     # 50.000 / 1.500.000
    ]
    if any(re.search(p, text) for p in amount_patterns):
        score += 0.25

    # 3. Keyword pembayaran (bertingkat)
    payment_keywords = [
        "berhasil", "sukses", "pembayaran", "transfer",
        "transaksi", "dibayar", "merchant", "saldo", "uang",
        "diterima", "selesai", "lunas", "konfirmasi",
    ]
    kw_count = sum(1 for k in payment_keywords if k in text)
    if kw_count >= 1:
        score += 0.15
    if kw_count >= 3:
        score += 0.10

    # 4. Tanggal
    date_patterns = [
        r"\d{1,2}[-/]\d{1,2}[-/]\d{2,4}",
        r"\d{1,2}\s(?:jan|feb|mar|apr|mei|jun|jul|agu|sep|okt|nov|des)",
    ]
    if any(re.search(p, text) for p in date_patterns):
        score += 0.15

    # 5. Nama e-wallet / bank (bonus)
    wallet_keywords = [
        "gopay", "ovo", "dana", "shopeepay", "linkaja",
        "bca", "bri", "bni", "mandiri", "qris",
    ]
    if any(k in text for k in wallet_keywords):
        score += 0.10

    return min(score, 1.0)


# ============================================================
# VISUAL SCORE  (bobot 20%)
# ============================================================
def image_payment_score(crop) -> float:
    if crop is None:
        return 0.0
    h, w = crop.shape[:2]
    if h == 0 or w == 0:
        return 0.0

    score = 0.0

    ar = h / max(w, 1)
    if 1.4 <= ar <= 3.0:
        score += 0.25

    gray         = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
    bright_ratio = (gray > 150).mean()
    if 0.15 < bright_ratio < 0.95:
        score += 0.25

    edges      = cv2.Canny(gray, 50, 150)
    edge_ratio = (edges > 0).mean()
    if 0.005 < edge_ratio < 0.25:
        score += 0.25

    hsv        = cv2.cvtColor(crop, cv2.COLOR_BGR2HSV)
    saturation = hsv[:, :, 1].mean()
    if saturation < 80:   # screenshot e-wallet ≈ near-grayscale
        score += 0.25

    return min(score, 1.0)


# ============================================================
# QUALITY SCORE  (bobot 10%)
# ============================================================
def image_quality_score(crop) -> float:
    if crop is None:
        return 0.0
    gray     = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
    variance = cv2.Laplacian(gray, cv2.CV_64F).var()
    h, w     = gray.shape

    score = 0.0
    if variance > 30:
        score += 0.5
    if h > 300 and w > 200:
        score += 0.5
    return score


# ============================================================
# LEGACY SHIM — detector.py masih panggil payment_screen_score
# ============================================================
def payment_screen_score(crop) -> float:
    """Alias untuk kompatibilitas dengan detector.py (pure visual)."""
    return image_payment_score(crop)


# ============================================================
# FINAL PAYMENT SCORE
# ============================================================
def payment_score(crop, ocr_text: str) -> dict:
    ocr_sc     = ocr_payment_score(ocr_text)
    visual_sc  = image_payment_score(crop)
    quality_sc = image_quality_score(crop)

    final = ocr_sc * 0.70 + visual_sc * 0.20 + quality_sc * 0.10

    return {
        "final_score":   round(final, 3),
        "ocr_score":     round(ocr_sc, 3),
        "visual_score":  round(visual_sc, 3),
        "quality_score": round(quality_sc, 3),
        "is_payment":    final >= 0.65,
    }
