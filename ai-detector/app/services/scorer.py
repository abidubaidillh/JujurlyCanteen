import cv2
import numpy as np


def payment_screen_score(crop):
    h, w = crop.shape[:2]
    if h == 0 or w == 0:
        return 0.0

    score = 0.0

    ar = h / max(w, 1)
    if 1.2 <= ar <= 3.0:
        score += 0.25

    gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)

    if (gray > 150).mean() > 0.2:
        score += 0.25

    edges = cv2.Canny(gray, 50, 150)
    if edges.sum() / (255 * h * w + 1) > 0.0005:
        score += 0.25

    hsv = cv2.cvtColor(crop, cv2.COLOR_BGR2HSV)
    if hsv[:, :, 1].mean() < 100:
        score += 0.25

    return min(score, 1.0)