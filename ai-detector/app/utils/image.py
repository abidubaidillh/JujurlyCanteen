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
# ENHANCE IMAGE
# Satu-satunya implementasi enhance_image di seluruh project.
# Hasil: gambar biner (hitam-putih) yang tajam untuk OCR.
# image_enhance.py hanya re-export fungsi ini.
# =========================
def enhance_image(image: np.ndarray) -> np.ndarray:
    """
    Pertajam ringan → binarize adaptive → upscale jika kecil.
    OCR di Next.js bekerja lebih baik pada gambar biner kontras tinggi.
    """
    h, w = image.shape[:2]
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    # Unsharp mask ringan
    blurred = cv2.GaussianBlur(gray, (0, 0), 1.0)
    sharpened = cv2.addWeighted(gray, 1.2, blurred, -0.2, 0)

    # Adaptive threshold — stabil untuk background putih luas
    binarized = cv2.adaptiveThreshold(
        sharpened, 255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY,
        21, 8
    )

    # Upscale hanya jika gambar kecil, pakai INTER_NEAREST untuk biner
    if w < 900:
        binarized = cv2.resize(
            binarized, (w * 2, h * 2),
            interpolation=cv2.INTER_NEAREST
        )

    return cv2.cvtColor(binarized, cv2.COLOR_GRAY2BGR)


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

    # Warp result dikembalikan as-is (tanpa enhance).
    # enhance_image dipanggil sekali di capture-payment setelah crop final.
    return warped
