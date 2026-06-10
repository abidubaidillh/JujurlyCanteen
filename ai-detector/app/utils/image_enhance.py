import cv2


def enhance_image(image):
    """
    Pipeline Enhancement OCR-Optimized (Sprint 2 - SKPL-NF-010).

    Tidak menggunakan filter berat (fastNlMeans, CLAHE, GaussianBlur besar)
    agar karakter teks tidak rusak untuk OCR di Next.js.

    Hanya melakukan resize dengan INTER_AREA:
    1. Ukuran file kecil → upload cepat (SKPL-NF-002)
    2. Karakter teks tetap tajam → akurasi OCR terjaga (SKPL-NF-003)
    """
    h, w = image.shape[:2]
    MAX_WIDTH = 1024

    if w > MAX_WIDTH:
        ratio = MAX_WIDTH / w
        new_w = MAX_WIDTH
        new_h = int(h * ratio)
        # cv2.INTER_AREA: algoritma resize terbaik agar teks tidak pecah
        image = cv2.resize(image, (new_w, new_h), interpolation=cv2.INTER_AREA)
        print(f"[enhance_image] Resize: {w}x{h} → {new_w}x{new_h}")

    return image