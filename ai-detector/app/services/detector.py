import cv2
import numpy as np
from app.services.scorer import payment_screen_score
from app.utils.image import four_point_warp


# ============================================================
# CLAHE (IMPROVE CONTRAST)
# ============================================================
def _apply_clahe(gray: np.ndarray) -> np.ndarray:
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    return clahe.apply(gray)


# ============================================================
# MAIN DETECTOR
# ============================================================
def detect_best_screen(image):
    """
    Deteksi layar bukti pembayaran terbaik:
    1. Canny edge
    2. Adaptive threshold fallback
    3. Morphology fallback tambahan
    """

    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    gray = _apply_clahe(gray)
    blurred = cv2.medianBlur(gray, 5)

    # ========================================================
    # STRATEGY 1: CANNY
    # ========================================================
    high_thresh, _ = cv2.threshold(
        blurred, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU
    )
    low_thresh = 0.5 * high_thresh

    edges = cv2.Canny(blurred, low_thresh, high_thresh)

    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    edges = cv2.dilate(edges, kernel, iterations=1)

    best_crop, best_score, best_box = _find_contours_and_score(image, edges)

    # ========================================================
    # STRATEGY 2: ADAPTIVE THRESHOLD (BRIGHT CASE)
    # ========================================================
    if best_crop is None or best_score < 0.5:
        adaptive = cv2.adaptiveThreshold(
            blurred,
            255,
            cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY_INV,
            11,
            2,
        )

        crop2, score2, box2 = _find_contours_and_score(image, adaptive)

        if score2 > best_score:
            best_crop = crop2
            best_score = score2
            best_box = box2

    # ========================================================
    # STRATEGY 3: MORPH CLOSE (LOW EDGE CASE)
    # ========================================================
    if best_crop is None or best_score < 0.5:
        morph = cv2.morphologyEx(
            blurred,
            cv2.MORPH_CLOSE,
            cv2.getStructuringElement(cv2.MORPH_RECT, (9, 9)),
        )

        _, thresh = cv2.threshold(morph, 0, 255, cv2.THRESH_OTSU)

        crop3, score3, box3 = _find_contours_and_score(image, thresh)

        if score3 > best_score:
            best_crop = crop3
            best_score = score3
            best_box = box3

    # ========================================================
    # FINAL ORIENTATION FIX
    # ========================================================
    if best_crop is not None:
        best_crop = _normalize_orientation(best_crop)

    return best_crop, best_score, best_box


# ============================================================
# NORMALIZE ORIENTATION (VERY IMPORTANT FOR OCR)
# ============================================================
def _normalize_orientation(img: np.ndarray) -> np.ndarray:
    """
    Pastikan hasil crop orientasinya portrait (tinggi > lebar).
    Banyak kasus warp menghasilkan landscape → OCR jadi kacau.
    """
    h, w = img.shape[:2]

    if w > h:
        img = cv2.rotate(img, cv2.ROTATE_90_CLOCKWISE)

    return img


# ============================================================
# APPROX → 4 POINTS
# ============================================================
def _approx_to_4pts(approx: np.ndarray) -> np.ndarray:
    pts = approx.reshape(-1, 2)
    n = len(pts)

    if n == 4:
        return approx

    if 5 <= n <= 6:
        centroid = pts.mean(axis=0)
        distances = np.linalg.norm(pts - centroid, axis=1)
        idx = np.argsort(distances)[-4:]

        chosen = pts[idx]

        angles = np.arctan2(
            chosen[:, 1] - centroid[1],
            chosen[:, 0] - centroid[0]
        )
        chosen = chosen[np.argsort(angles)]

        return chosen.reshape(-1, 1, 2).astype(np.int32)

    return None


# ============================================================
# FIND CONTOUR + SCORE
# ============================================================
def _find_contours_and_score(original_image, processed_image):
    contours, _ = cv2.findContours(
        processed_image,
        cv2.RETR_EXTERNAL,
        cv2.CHAIN_APPROX_SIMPLE,
    )

    best_crop = None
    best_score = 0.0
    best_box = None

    img_h, img_w = original_image.shape[:2]
    min_area = img_h * img_w * 0.1

    PAD = 12

    for cnt in sorted(contours, key=cv2.contourArea, reverse=True)[:15]:
        area = cv2.contourArea(cnt)

        if area < min_area:
            continue

        peri = cv2.arcLength(cnt, True)
        approx = cv2.approxPolyDP(cnt, 0.02 * peri, True)

        if 4 <= len(approx) <= 6:
            pts4 = _approx_to_4pts(approx)
            if pts4 is None:
                continue

            pts = pts4.reshape(-1, 2).astype(np.float32)
            centroid = pts.mean(axis=0)

            # padding outward
            for i, pt in enumerate(pts):
                direction = pt - centroid
                norm = np.linalg.norm(direction)
                if norm > 0:
                    pts[i] = pt + (direction / norm) * PAD

            pts[:, 0] = np.clip(pts[:, 0], 0, img_w - 1)
            pts[:, 1] = np.clip(pts[:, 1], 0, img_h - 1)

            pts = pts.reshape(-1, 1, 2).astype(np.int32)

            crop = four_point_warp(original_image, pts)

            if crop is not None:
                score = payment_screen_score(crop)

                if score > best_score:
                    best_score = score
                    best_crop = crop
                    x, y, w_box, h_box = cv2.boundingRect(pts)
                    best_box = {"x": int(x), "y": int(y), "w": int(w_box), "h": int(h_box)}

    return best_crop, best_score, best_box