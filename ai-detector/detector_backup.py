"""
Phone Screen Detector — AI Lokal (YOLOv8n + OpenCV)
=====================================================
Deteksi layar HP bukti pembayaran menggunakan AI lokal yang ringan.

Pipeline:
  1. OpenCV (3 metode) → temukan kandidat quad persegi panjang
  2. YOLOv8n → konfirmasi apakah objek adalah "cell phone"
  3. Classifier ringan (brightness + aspect ratio score) → saring bukti bayar
  4. Hanya yang lolos keduanya yang disimpan

Tidak butuh internet, tidak butuh API key.
Model YOLOv8n didownload otomatis saat pertama kali (~6MB).

Install:
    pip install opencv-python numpy ultralytics

Jalankan:
    python payment_capture_local_ai.py
    python payment_capture_local_ai.py --source 1     # kamera eksternal
    python payment_capture_local_ai.py --debug        # tampilkan debug panel
    python payment_capture_local_ai.py --no-yolo      # OpenCV saja (lebih cepat)
    python payment_capture_local_ai.py --conf 0.35    # turunkan threshold deteksi
"""

import cv2
import numpy as np
import os
import time
import argparse
import threading
import queue
from datetime import datetime
from collections import deque


# ══════════════════════════════════════════════════════════
#  KONFIGURASI
# ══════════════════════════════════════════════════════════
CFG = {
    # OpenCV quad detection
    "ar_min": 1.4,
    "ar_max": 2.9,
    "area_min": 0.04,
    "area_max": 0.92,
    "solidity_min": 0.72,

    # YOLO
    "yolo_conf": 0.30,          # confidence threshold YOLO
    "yolo_iou": 0.45,           # IoU threshold NMS
    "use_yolo": True,

    # Motion stabilizer
    "stable_frames": 7,
    "motion_thresh": 4.0,

    # Capture
    "cooldown": 2.5,
    "hash_max_diff": 10,

    # Output
    "output": "payment_local_ai",
    "save_grayscale": True,
    "debug": False,
}

# Class YOLO yang dianggap "layar HP"
PHONE_CLASSES = {"cell phone"}


# ══════════════════════════════════════════════════════════
#  UTILITAS
# ══════════════════════════════════════════════════════════
def ensure_dir(p):
    os.makedirs(p, exist_ok=True)


def ts():
    return datetime.now().strftime("%Y%m%d_%H%M%S_%f")[:-3]


def order_pts(pts):
    pts = pts.reshape(4, 2).astype("float32")
    s, d = pts.sum(1), np.diff(pts, axis=1).ravel()
    return np.array([
        pts[np.argmin(s)],
        pts[np.argmin(d)],
        pts[np.argmax(s)],
        pts[np.argmax(d)],
    ], dtype="float32")


def four_point_warp(img, pts):
    r = order_pts(pts)
    tl, tr, br, bl = r
    w = int(max(np.linalg.norm(br - bl), np.linalg.norm(tr - tl)))
    h = int(max(np.linalg.norm(tr - br), np.linalg.norm(tl - bl)))
    if w < 80 or h < 80:
        return None
    dst = np.array([[0,0],[w-1,0],[w-1,h-1],[0,h-1]], dtype="float32")
    M = cv2.getPerspectiveTransform(r, dst)
    return cv2.warpPerspective(img, M, (w, h))


def phash(img, size=16):
    g = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    r = cv2.resize(g, (size, size), interpolation=cv2.INTER_AREA)
    mean = r.mean()
    bits = (r > mean).flatten()
    h = 0
    for b in bits[:64]:
        h = (h << 1) | int(b)
    return h


def hash_dist(h1, h2):
    x, d = h1 ^ h2, 0
    while x:
        d += x & 1
        x >>= 1
    return d

def reduce_glare(img):
    """
    Mengurangi pantulan cahaya pada hasil capture layar HP
    agar teks bukti pembayaran lebih jelas
    """

    # Convert ke HSV
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    h, s, v = cv2.split(hsv)

    # Deteksi area terlalu terang (pantulan cahaya)
    glare_mask = cv2.threshold(
        v,
        235,   # threshold glare
        255,
        cv2.THRESH_BINARY
    )[1]

    # Perbesar area glare agar lebih natural
    kernel = cv2.getStructuringElement(
        cv2.MORPH_ELLIPSE,
        (7, 7)
    )
    glare_mask = cv2.dilate(
        glare_mask,
        kernel,
        iterations=2
    )

    # Inpainting → isi area glare
    result = cv2.inpaint(
        img,
        glare_mask,
        7,
        cv2.INPAINT_TELEA
    )

    return result

def enhance(img):
    """Sharpen + CLAHE untuk keterbacaan teks bukti bayar."""
    k = np.array([[0,-1,0],[-1,5,-1],[0,-1,0]], dtype=np.float32)
    sh = cv2.filter2D(img, -1, k)
    lab = cv2.cvtColor(sh, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    cl = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8,8))
    l = cl.apply(l)
    return cv2.cvtColor(cv2.merge([l,a,b]), cv2.COLOR_LAB2BGR)


def make_hc(img):
    g = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    cl = cv2.createCLAHE(
        clipLimit=2.0,
        tileGridSize=(8,8)
    )
    g = cl.apply(g)

    g = cv2.GaussianBlur(g, (3,3), 0)

    return g


# ══════════════════════════════════════════════════════════
#  SMART ROI STABILIZER
# ══════════════════════════════════════════════════════════

class SmartROIStabilizer:
    def __init__(self, needed=4, thresh=8.0):
        self.needed = needed
        self.thresh = thresh
        self.hist = deque(maxlen=needed)
        self.prev_roi = None

    def update(self, roi):
        """
        roi = crop area HP saja (bukan full frame)

        Lebih stabil karena:
        - tangan gemetar kecil tidak terlalu berpengaruh
        - background tidak ikut dihitung
        - autofocus lebih aman
        """

        if roi is None or roi.size == 0:
            return

        # Resize agar konsisten
        roi = cv2.resize(roi, (320, 480))

        # grayscale + blur ringan
        gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
        gray = cv2.GaussianBlur(gray, (5, 5), 0)

        if self.prev_roi is not None:
            diff = cv2.absdiff(gray, self.prev_roi)
            motion_score = diff.mean()

            # simpan score per frame
            self.hist.append(motion_score)

        self.prev_roi = gray.copy()

    @property
    def stable(self):
        """
        Stabil jika:
        beberapa frame terakhir
        motion kecil semua
        """
        return (
            len(self.hist) >= self.needed
            and max(self.hist) < self.thresh
        )

    @property
    def score(self):
        """
        Score 0–1 untuk progress bar
        """
        if not self.hist:
            return 0.0

        avg = sum(self.hist) / len(self.hist)

        # makin kecil avg → makin stabil
        score = 1.0 - min(avg / self.thresh, 1.0)
        return max(0.0, min(score, 1.0))

# ══════════════════════════════════════════════════════════
#  YOLO WRAPPER — async agar tidak block frame loop
# ══════════════════════════════════════════════════════════
class YOLODetector:
    """
    Jalankan YOLOv8n di thread terpisah.
    Input  : frame BGR
    Output : list of (x1,y1,x2,y2,conf,class_name)
    """
    def __init__(self, conf=0.30, iou=0.45):
        self._ready = False
        self._model = None
        self._lock = threading.Lock()
        self._last_boxes = []
        self._frame_q = queue.Queue(maxsize=1)
        self._result_q = queue.Queue(maxsize=1)
        self._thread = threading.Thread(
            target=self._load_and_run, args=(conf, iou), daemon=True
        )
        self._thread.start()

    def _load_and_run(self, conf, iou):
        try:
            from ultralytics import YOLO
            print("[YOLO] Memuat model YOLOv8n... (pertama kali ~6MB download)")
            model = YOLO("yolov8n.pt")
            model.conf = conf
            model.iou = iou
            with self._lock:
                self._model = model
                self._ready = True
            print("[YOLO] Model siap!")

            # Loop inferensi
            while True:
                frame = self._frame_q.get()
                if frame is None:
                    break
                results = model(
                    frame,
                    classes=[67],
                    verbose=False
                )[0]
                boxes = []
                for box in results.boxes:
                    cls_id = int(box.cls[0])
                    cls_name = model.names[cls_id].lower()
                    
                    if cls_name != "cell phone":
                        continue

                    conf_val = float(box.conf[0])
                    x1, y1, x2, y2 = map(int, box.xyxy[0])
                    boxes.append((x1, y1, x2, y2, conf_val, cls_name))

                # Simpan hasil terbaru
                try:
                    self._result_q.get_nowait()
                except queue.Empty:
                    pass
                self._result_q.put(boxes)
        except Exception as e:
            print(f"[YOLO ERROR] {e}")
            print("[YOLO] Melanjutkan tanpa YOLO...")

    def submit(self, frame):
        """Kirim frame untuk diproses (non-blocking, drop jika antrian penuh)."""
        if not self._ready:
            return
        try:
            self._frame_q.get_nowait()
        except queue.Empty:
            pass
        self._frame_q.put(frame.copy())

    def get_boxes(self):
        """Ambil hasil terakhir (non-blocking)."""
        try:
            boxes = self._result_q.get_nowait()
            with self._lock:
                self._last_boxes = boxes
        except queue.Empty:
            pass
        return self._last_boxes

    @property
    def ready(self):
        return self._ready

    def stop(self):
        try:
            self._frame_q.put_nowait(None)
        except queue.Full:
            pass


# ══════════════════════════════════════════════════════════
#  SKOR PAYMENT SCREEN — heuristik ringan
# ══════════════════════════════════════════════════════════
def payment_screen_score(crop: np.ndarray) -> float:
    """
    Hitung skor 0-1 seberapa besar kemungkinan crop adalah
    bukti pembayaran berdasarkan:
    - Dominasi warna putih/terang (background app transfer)
    - Banyaknya tepi horizontal (teks baris-baris)
    - Aspek rasio portrait
    Ringan — hanya OpenCV, tidak butuh model ML.
    """
    h, w = crop.shape[:2]
    if h == 0 or w == 0:
        return 0.0

    score = 0.0

    # 1. Aspek rasio portrait (lebih tinggi dari lebar)
    ar = h / w
    if 1.5 <= ar <= 2.4:
        score += 0.30
    elif 1.2 <= ar < 1.5:
        score += 0.15

    # 2. Dominasi area terang (layar aktif dengan background putih)
    gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
    bright_ratio = (gray > 180).mean()
    if bright_ratio > 0.45:
        score += 0.25
    elif bright_ratio > 0.30:
        score += 0.10

    # 3. Banyak tepi horizontal (baris teks nominal, nama, tanggal)
    edges = cv2.Canny(gray, 50, 150)
    h_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (20, 1))
    h_lines = cv2.morphologyEx(edges, cv2.MORPH_OPEN, h_kernel)
    h_ratio = h_lines.sum() / (255 * h * w + 1)
    if h_ratio > 0.002:
        score += 0.25
    elif h_ratio > 0.001:
        score += 0.10

    # 4. Variansi warna rendah (bukan foto/gambar natural)
    hsv = cv2.cvtColor(crop, cv2.COLOR_BGR2HSV)
    sat_mean = hsv[:,:,1].mean()
    if sat_mean < 40:       # warna desaturated → kemungkinan UI
        score += 0.20
    elif sat_mean < 70:
        score += 0.10

    return min(score, 1.0)


# ══════════════════════════════════════════════════════════
#  OPENCV DETEKSI QUAD
# ══════════════════════════════════════════════════════════
def build_edges(gray):
    blur5 = cv2.GaussianBlur(gray, (5,5), 0)
    blur7 = cv2.GaussianBlur(gray, (7,7), 0)

    e1 = cv2.bitwise_or(cv2.Canny(blur5, 20, 80), cv2.Canny(blur5, 50, 150))

    th = cv2.adaptiveThreshold(blur7, 255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 21, 4)
    k5 = cv2.getStructuringElement(cv2.MORPH_RECT, (5,5))
    th = cv2.morphologyEx(th, cv2.MORPH_CLOSE, k5, iterations=3)
    e2 = cv2.Canny(th, 10, 50)

    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
    eq = clahe.apply(gray)
    _, bright = cv2.threshold(eq, 175, 255, cv2.THRESH_BINARY)
    k9 = cv2.getStructuringElement(cv2.MORPH_RECT, (9,9))
    bright = cv2.morphologyEx(bright, cv2.MORPH_CLOSE, k9, iterations=4)
    bright = cv2.morphologyEx(bright, cv2.MORPH_OPEN,  k9, iterations=2)
    e3 = cv2.Canny(bright, 10, 60)

    combined = cv2.bitwise_or(e1, cv2.bitwise_or(e2, e3))
    k_d = cv2.getStructuringElement(cv2.MORPH_RECT, (5,5))
    combined = cv2.dilate(combined, k_d, iterations=2)
    return e1, e2, e3, combined


def is_valid_quad(approx, frame_area):
    if len(approx) != 4:
        return False
    area = cv2.contourArea(approx)
    if not (CFG["area_min"]*frame_area <= area <= CFG["area_max"]*frame_area):
        return False
    hull_area = cv2.contourArea(cv2.convexHull(approx))
    if hull_area < 1 or area/hull_area < CFG["solidity_min"]:
        return False
    x, y, w, h = cv2.boundingRect(approx)
    if min(w, h) == 0:
        return False
    ratio = max(w,h)/min(w,h)
    return CFG["ar_min"] <= ratio <= CFG["ar_max"]


def find_quads(edge_map, frame_area):
    cnts, _ = cv2.findContours(edge_map,
                                cv2.RETR_EXTERNAL,
                                cv2.CHAIN_APPROX_SIMPLE)
    quads = []
    for c in sorted(cnts, key=cv2.contourArea, reverse=True)[:30]:
        peri = cv2.arcLength(c, True)
        for eps in [0.015, 0.02, 0.03, 0.04, 0.05]:
            approx = cv2.approxPolyDP(c, eps*peri, True)
            if is_valid_quad(approx, frame_area):
                quads.append(approx)
                break
    return quads


def deduplicate(quads):
    kept = []
    for q in quads:
        x1,y1,w1,h1 = cv2.boundingRect(q)
        dup = False
        for k in kept:
            x2,y2,w2,h2 = cv2.boundingRect(k)
            ix = max(0, min(x1+w1,x2+w2)-max(x1,x2))
            iy = max(0, min(y1+h1,y2+h2)-max(y1,y2))
            inter = ix*iy
            union = w1*h1 + w2*h2 - inter
            if union > 0 and inter/union > 0.45:
                if w1*h1 > w2*h2:
                    kept[kept.index(k)] = q
                dup = True
                break
        if not dup:
            kept.append(q)
    return kept


def quad_overlaps_yolo(quad, yolo_boxes, iou_thresh=0.25):
    """
    Cek apakah quad OpenCV tumpang tindih dengan
    salah satu box YOLO yang terdeteksi sebagai HP.
    """
    x1q, y1q, wq, hq = cv2.boundingRect(quad)
    x2q, y2q = x1q+wq, y1q+hq

    for (x1, y1, x2, y2, conf, cls) in yolo_boxes:
        if cls not in PHONE_CLASSES:
            continue
        ix = max(0, min(x2q,x2) - max(x1q,x1))
        iy = max(0, min(y2q,y2) - max(y1q,y1))
        inter = ix * iy
        union = wq*hq + (x2-x1)*(y2-y1) - inter
        if union > 0 and inter/union >= iou_thresh:
            return True, conf
    return False, 0.0


# ══════════════════════════════════════════════════════════
#  MAIN LOOP
# ══════════════════════════════════════════════════════════
def run(source, output_dir, debug, use_yolo):
    ensure_dir(output_dir)
    if CFG["save_grayscale"]:
        ensure_dir(os.path.join(output_dir, "grayscale_hc"))

    CFG["debug"] = debug
    CFG["use_yolo"] = use_yolo

    cap = cv2.VideoCapture(source)
    if not cap.isOpened():
        print(f"[ERROR] Tidak bisa membuka sumber: {source}")
        return

    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
    cap.set(cv2.CAP_PROP_AUTOFOCUS, 1)

    # Inisialisasi komponen
    stab = SmartROIStabilizer(CFG["stable_frames"], CFG["motion_thresh"])
    yolo = YOLODetector(CFG["yolo_conf"], CFG["yolo_iou"]) if use_yolo else None

    print("═" * 60)
    print("  Payment Capture — AI Lokal (YOLOv8n + Heuristik)")
    print(f"  YOLO     : {'AKTIF (memuat model...)' if use_yolo else 'NONAKTIF'}")
    print(f"  Output   : {os.path.abspath(output_dir)}")
    print("  Kontrol  : Q/ESC=keluar | D=debug | Y=toggle YOLO")
    print("═" * 60)

    last_cap = 0.0
    saved_hashes = []
    total = 0
    yolo_submit_timer = 0.0

    fps_t = time.time()
    fps_n = 0
    fps_val = 0.0

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        fh, fw = frame.shape[:2]
        frame_area = fh * fw
        now = time.time()

        fps_n += 1
        if now - fps_t >= 1.0:
            fps_val = fps_n / (now - fps_t)
            fps_n = 0
            fps_t = now

        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

        # ── Kirim ke YOLO setiap ~0.2 detik ─────────────
        yolo_boxes = []
        if CFG["use_yolo"] and yolo:
            if now - yolo_submit_timer >= 0.2:
                yolo.submit(frame)
                yolo_submit_timer = now
            yolo_boxes = yolo.get_boxes()

        # ── Deteksi OpenCV ───────────────────────────────
        e1, e2, e3, combined = build_edges(gray)
        all_quads = []
        for em in [e1, e2, e3, combined]:
            all_quads.extend(find_quads(em, frame_area))
        quads = deduplicate(all_quads)

        display = frame.copy()
        stable = stab.stable
        stab_score = stab.score

        # ── Gambar YOLO boxes ────────────────────────────
        if CFG["use_yolo"]:
            for (x1, y1, x2, y2, conf, cls) in yolo_boxes:
                color = (255, 165, 0) if cls in PHONE_CLASSES else (80,80,80)
                cv2.rectangle(display, (x1,y1), (x2,y2), color, 2)
                cv2.putText(display, f"{cls} {conf:.2f}",
                            (x1, y1-6), cv2.FONT_HERSHEY_SIMPLEX,
                            0.5, color, 1)

        # ── Evaluasi setiap quad ─────────────────────────
        for i, q in enumerate(quads):
            x, y, w, h = cv2.boundingRect(q)

            # Crop sementara untuk scoring
            pts = q.reshape(4,2).astype("float32")
            crop_tmp = four_point_warp(frame, pts)
            if crop_tmp is None:
                continue

            stab.update(crop_tmp)
            stable = stab.stable
            stab_score = stab.score

            pay_score = payment_screen_score(crop_tmp)

            # Validasi YOLO
            yolo_ok = True
            yolo_conf = 1.0
            if CFG["use_yolo"] and yolo and yolo.ready:
                yolo_ok, yolo_conf = quad_overlaps_yolo(q, yolo_boxes)

            # Gabung keputusan
            # - Jika YOLO aktif: harus lolos YOLO ATAU pay_score tinggi
            # - Jika YOLO belum ready: gunakan pay_score saja
            if CFG["use_yolo"] and yolo and yolo.ready:
                accepted = yolo_ok or pay_score >= 0.65
            else:
                accepted = pay_score >= 0.50

            # Warna kontur berdasarkan keputusan
            if not accepted:
                color = (60, 60, 200)       # merah — ditolak
                label = f"skip (s={pay_score:.2f})"
            elif not stable:
                color = (0, 180, 255)       # kuning — menunggu stabil
                label = f"bergerak... (s={pay_score:.2f})"
            else:
                color = (0, 255, 80)        # hijau — siap capture
                yolo_tag = f" Y:{yolo_conf:.2f}" if CFG["use_yolo"] and yolo_ok else ""
                label = f"BUKTI BAYAR {yolo_tag} s={pay_score:.2f}"

            cv2.drawContours(display, [q], -1, color, 3)
            cv2.rectangle(display, (x, y-32),
                          (x + len(label)*9, y), color, -1)
            cv2.putText(display, label, (x+4, y-8),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.52, (0,0,0), 2)

            # Stabilitas bar
            bar_w = int(w * stab_score)
            cv2.rectangle(display, (x, y+h+4), (x+w, y+h+12), (50,50,50), -1)
            cv2.rectangle(display, (x, y+h+4), (x+bar_w, y+h+12), color, -1)

            # ── Auto capture ─────────────────────────────
            if not accepted or not stable:
                continue
            if (now - last_cap) < CFG["cooldown"]:
                continue

            h_val = phash(crop_tmp)
            if any(hash_dist(h_val, hv) <= CFG["hash_max_diff"]
                   for hv in saved_hashes):
                continue

            # Hilangkan glare
            crop_no_glare = reduce_glare(crop_tmp)

            # Baru enhance
            crop_enhanced = enhance(crop_no_glare)
            name = f"payment_{ts()}_{i}"
            cv2.imwrite(
                os.path.join(output_dir, f"{name}.jpg"),
                crop_enhanced,
                [cv2.IMWRITE_JPEG_QUALITY, 97]
            )
            if CFG["save_grayscale"]:
                cv2.imwrite(
                    os.path.join(output_dir, "grayscale_hc", f"{name}_hc.jpg"),
                    make_hc(crop_enhanced),
                    [cv2.IMWRITE_JPEG_QUALITY, 97]
                )

            saved_hashes.append(h_val)
            if len(saved_hashes) > 100:
                saved_hashes.pop(0)

            total += 1
            last_cap = now
            print(f"[✓ CAPTURE #{total}] {name}.jpg  "
                  f"pay={pay_score:.2f}  yolo={yolo_conf:.2f}")

            cv2.rectangle(display, (x,y),(x+w,y+h),(255,255,255),8)

        # ── Status bar ───────────────────────────────────
        cv2.rectangle(display, (0,0),(fw,40),(20,20,20),-1)
        yolo_status = (
            "YOLO:memuat..." if (use_yolo and yolo and not yolo.ready) else
            f"YOLO:ON" if (use_yolo and yolo and yolo.ready) else
            "YOLO:OFF"
        )
        status = (
            f"FPS:{fps_val:.0f}  |  "
            f"Quad:{len(quads)}  |  "
            f"Stabil:{'YA' if stable else 'TIDAK'}  |  "
            f"{yolo_status}  |  "
            f"Capture:{total}"
        )
        cv2.putText(display, status, (8, 27),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.60,
                    (255,255,255), 2)

        # Cooldown countdown
        rem = CFG["cooldown"] - (now - last_cap)
        if rem > 0 and quads:
            cv2.putText(display, f"cooldown:{rem:.1f}s",
                        (fw-200, 27),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.58,
                        (0,200,255), 2)

        cv2.imshow("Payment Capture [Q=Keluar|D=Debug|Y=YOLO]", display)

        # ── Debug panel ──────────────────────────────────
        if CFG["debug"]:
            sm = lambda img: cv2.resize(img, (fw//3, fh//3))
            row = np.hstack([sm(e1), sm(e2), sm(e3)])
            for li, lbl in enumerate(["Canny","Adaptive","Brightness"]):
                cv2.putText(row, lbl, (li*fw//3+5, 20),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, 200, 2)
            cv2.imshow("Debug — Edge Maps", row)
            cv2.imshow("Debug — Combined", sm(combined))
        else:
            for wn in ["Debug — Edge Maps","Debug — Combined"]:
                try: cv2.destroyWindow(wn)
                except: pass

        key = cv2.waitKey(1) & 0xFF
        if key in (ord("q"), ord("Q"), 27):
            break
        if key in (ord("d"), ord("D")):
            CFG["debug"] = not CFG["debug"]
        if key in (ord("y"), ord("Y")):
            CFG["use_yolo"] = not CFG["use_yolo"]
            print(f"[YOLO] {'AKTIF' if CFG['use_yolo'] else 'NONAKTIF'}")

    if yolo:
        yolo.stop()
    cap.release()
    cv2.destroyAllWindows()
    print(f"\n[SELESAI] {total} capture tersimpan di '{output_dir}'")


# ══════════════════════════════════════════════════════════
#  ENTRY POINT
# ══════════════════════════════════════════════════════════
if __name__ == "__main__":
    ap = argparse.ArgumentParser(
        description="Deteksi layar HP bukti pembayaran — AI lokal YOLOv8n"
    )
    ap.add_argument("--source",   default=0,
                    help="0=webcam, 1=kamera ke-2, atau path video")
    ap.add_argument("--output",   default=CFG["output"])
    ap.add_argument("--cooldown", type=float, default=CFG["cooldown"])
    ap.add_argument("--conf",     type=float, default=CFG["yolo_conf"],
                    help="YOLO confidence threshold (default 0.30)")
    ap.add_argument("--debug",    action="store_true")
    ap.add_argument("--no-yolo",  action="store_true",
                    help="Nonaktifkan YOLO, pakai heuristik saja")
    args = ap.parse_args()

    CFG["cooldown"]   = args.cooldown
    CFG["yolo_conf"]  = args.conf

    src = args.source
    try: src = int(src)
    except: pass

    run(src, args.output, args.debug, use_yolo=not args.no_yolo)