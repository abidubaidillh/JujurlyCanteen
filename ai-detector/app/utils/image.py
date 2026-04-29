import cv2
import numpy as np


# =========================
# ORDER POINTS
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


# =========================
# ASPECT RATIO NORMALIZER
# =========================
def normalize_aspect_ratio(width, height):
    if width == 0 or height == 0:
        return width, height

    is_portrait = height >= width
    TARGET_RATIO = 16 / 9 if is_portrait else 9 / 16

    current_ratio = height / width

    if current_ratio > TARGET_RATIO:
        width = int(height / TARGET_RATIO)
    else:
        height = int(width * TARGET_RATIO)

    return width, height


# =========================
# QUALITY ANALYSIS
# =========================
def analyze_image_quality(image):
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    brightness = np.mean(gray)
    blur_score = cv2.Laplacian(gray, cv2.CV_64F).var()

    return brightness, blur_score


# =========================
# ENHANCE IMAGE (OCR OPTIMIZED)
# =========================
def enhance_image(image):
    """
    Versi terbaru: Bypass filter kosmetik (CLAHE, Denoising, Blur).
    Filter-filter tersebut memperparah garis layar HP (Moire) 
    dan merusak tepi huruf bagi mesin OCR.
    
    Karena pre-processing OCR (Hitam-Putih & Thresholding) 
    sudah dilakukan di aplikasi Next.js secara dinamis, 
    kita hanya mengirimkan pixel original di sini.
    """
    
    # Hanya melakukan pass-through (mengembalikan gambar aslinya)
    return image


# =========================
# PERSPECTIVE WARP
# =========================
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

    width, height = normalize_aspect_ratio(width, height)

    # Mengecilkan gambar agar tidak berat saat diunggah ke Supabase
    MAX_SIZE = 1024
    scale = min(MAX_SIZE / max(width, height), 1.0)

    width = int(width * scale)
    height = int(height * scale)

    dst = np.array([
        [0, 0],
        [width - 1, 0],
        [width - 1, height - 1],
        [0, height - 1]
    ], dtype="float32")

    matrix = cv2.getPerspectiveTransform(rect, dst)
    warped = cv2.warpPerspective(image, matrix, (width, height))

    # FINAL PIPELINE (Kini hanya mengembalikan gambar original yang sudah diluruskan)
    warped = enhance_image(warped)

    return warped