import { createWorker } from "tesseract.js";

// ============================================================
// TYPES & INTERFACES
// ============================================================

export interface OCRResult {
  rawText: string;
  cleanedText: string;
  amount: number | null;
  merchantName: string | null;
  isSuccess: boolean;
  processingTimeMs?: number;
  error?: string;
}

// ============================================================
// MODULE 1: OPENCV PRE-PROCESSING (SKPL-NF-003)
// Grayscale + Otsu Thresholding untuk kontras maksimal
// ============================================================

/**
 * Menjalankan pipeline pre-processing OpenCV.js di browser:
 * 1. Convert ke Grayscale
 * 2. Median Blur ringan untuk hilangkan salt-and-pepper noise
 * 3. Adaptive Otsu Thresholding untuk kontras teks dinamis
 *
 * Tidak menggunakan fastNlMeansDenoising/CLAHE agar tidak merusak
 * tepi karakter (sesuai SKPL-NF-010 larangan filter berat).
 */
export const preprocessImageWithOpenCV = async (imageBlob: Blob): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(imageBlob);
    img.src = objectUrl;

    img.onload = () => {
      try {
        const cv = (window as any).cv;
        if (!cv || !cv.Mat) {
          console.warn("⚠️ OpenCV.js tidak tersedia, fallback ke gambar asli.");
          resolve(objectUrl);
          return;
        }

        const src = cv.imread(img);
        const gray = new cv.Mat();
        const normalized = new cv.Mat();
        const blurred = new cv.Mat();
        const dst = new cv.Mat();

        // ----------------------------------------------------------------
        // Step 1: Grayscale
        // ----------------------------------------------------------------
        cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);

        // ----------------------------------------------------------------
        // Step 2: Normalize brightness (CRITICAL untuk gambar overexposed)
        //
        // Masalah Otsu pada gambar terang:
        //   → Histogram condong ke kanan (semua piksel ~230-255)
        //   → Otsu menghitung threshold ~230, sehingga hampir SEMUA piksel
        //     jadi putih dan teks hilang
        //
        // Solusi: normalize dulu ke range 0-255 agar histogram menyebar
        //   → Piksel terendah jadi 0 (hitam), tertinggi jadi 255 (putih)
        //   → Kontras antara teks dan latar menjadi terlihat kembali
        // ----------------------------------------------------------------
        cv.normalize(gray, normalized, 0, 255, cv.NORM_MINMAX);

        // ----------------------------------------------------------------
        // Step 3: Gaussian Blur ringan untuk hilangkan noise pixel
        // ----------------------------------------------------------------
        cv.GaussianBlur(normalized, blurred, new cv.Size(3, 3), 0);

        // ----------------------------------------------------------------
        // Step 4: Adaptive Thresholding
        //
        // Keunggulan vs Otsu global:
        //   → Menghitung threshold SECARA LOKAL untuk setiap blok 15x15 px
        //   → Tidak terpengaruh oleh brightness keseluruhan gambar
        //   → Teks tetap terbaca meski ada area yang gelap / terang tidak merata
        //
        // Parameter:
        //   ADAPTIVE_THRESH_GAUSSIAN_C  = bobot gaussian untuk blok lokal
        //   THRESH_BINARY_INV           = teks jadi hitam, latar jadi putih
        //   blockSize = 15              = ukuran blok lokal (harus ganjil)
        //   C = 8                       = konstanta pengurang (kontrol sensitivitas)
        // ----------------------------------------------------------------
        cv.adaptiveThreshold(
          blurred,
          dst,
          255,
          cv.ADAPTIVE_THRESH_GAUSSIAN_C,
          cv.THRESH_BINARY,
          15,
          8
        );

        // Render ke canvas dan ambil Data URL
        const canvas = document.createElement("canvas");
        cv.imshow(canvas, dst);
        const processedUrl = canvas.toDataURL("image/png");

        // Bersihkan memori Mat
        src.delete();
        gray.delete();
        normalized.delete();
        blurred.delete();
        dst.delete();
        URL.revokeObjectURL(objectUrl);

        console.log("✅ [OpenCV] Pre-processing selesai: Normalize → Blur → Adaptive Threshold.");
        resolve(processedUrl);

      } catch (err) {
        console.error("❌ [OpenCV] Pre-processing gagal, fallback ke gambar asli:", err);
        resolve(objectUrl);
      }
    };

    img.onerror = () => {
      console.error("❌ [OpenCV] Gagal memuat gambar.");
      resolve(objectUrl);
    };
  });
};

// ============================================================
// MODULE 2: TESSERACT.JS OCR ENGINE (SKPL-NF-003, SKPL-NF-002)
// Target akurasi ≥80%, waktu pemrosesan ≤5 detik
// ============================================================

/**
 * Fungsi utama OCR. Menjalankan seluruh pipeline:
 * OpenCV Pre-processing → Tesseract Extraction → Cleaning → Validation
 */
export const performOCR = async (imageBlob: Blob): Promise<OCRResult> => {
  const startTime = Date.now();
  const worker = await createWorker("ind+eng");

  try {
    // --- TAHAP 1: Pre-processing OpenCV ---
    console.log("⚙️ [OCR] Memulai pre-processing OpenCV...");
    const processedImageUrl = await preprocessImageWithOpenCV(imageBlob);

    // --- TAHAP 2: Konfigurasi Tesseract ---
    // Whitelist karakter mencegah Tesseract membaca karakter di luar konteks struk QRIS
    await worker.setParameters({
      tessedit_char_whitelist:
        "0123456789RrPpTtOoAaLlBbYyNnMmIiJjUuHhEeSsCcDdGgKkXx.,- ",
      // PSM 6: Assume uniform block of text – cocok untuk struk dengan layout kolom
      tessedit_pageseg_mode: "6" as any,
    });

    // --- TAHAP 3: Ekstraksi Teks ---
    console.log("🔍 [OCR] Mengekstrak teks dengan Tesseract.js...");
    const { data: { text } } = await worker.recognize(processedImageUrl);
    await worker.terminate();

    const processingTimeMs = Date.now() - startTime;
    console.log(`📝 [OCR RAW] (${processingTimeMs}ms):`, text);

    // Peringatan SKPL-NF-002 jika melebihi 5 detik
    if (processingTimeMs > 5000) {
      console.warn(`⚠️ [SKPL-NF-002] Waktu OCR (${processingTimeMs}ms) melebihi target 5000ms!`);
    }

    // Guard: teks terlalu pendek → gambar tidak terbaca
    if (!text || text.trim().length < 5) {
      return {
        rawText: text || "",
        cleanedText: "",
        amount: null,
        merchantName: null,
        isSuccess: false,
        processingTimeMs,
        error: "Teks tidak terbaca. Pastikan gambar fokus, tidak buram, dan tidak terpotong.",
      };
    }

    // --- TAHAP 4: Cleaning & Post-processing ---
    const cleanedText = cleanOCRText(text);
    console.log("🧹 [OCR CLEANED]:", cleanedText);

    // --- TAHAP 5: Extraksi Nominal & Merchant ---
    const detectedAmount = extractNominal(cleanedText);
    const merchant = extractMerchant(cleanedText);

    // --- TAHAP 6: Validasi Rule-based ---
    if (detectedAmount === null) {
      return {
        rawText: text,
        cleanedText,
        amount: null,
        merchantName: merchant,
        isSuccess: false,
        processingTimeMs,
        error: "Nominal pembayaran tidak ditemukan dalam struk.",
      };
    }

    if (merchant === null) {
      return {
        rawText: text,
        cleanedText,
        amount: detectedAmount,
        merchantName: null,
        isSuccess: false,
        processingTimeMs,
        error: "Validasi gagal: merchant 'HMIT' atau 'STORE' tidak terdeteksi.",
      };
    }

    console.log(`✅ [OCR] Berhasil! Nominal: Rp${detectedAmount.toLocaleString("id-ID")}, Merchant: ${merchant}`);

    return {
      rawText: text,
      cleanedText,
      amount: detectedAmount,
      merchantName: merchant,
      isSuccess: true,
      processingTimeMs,
    };

  } catch (err) {
    console.error("❌ [OCR] Runtime Error:", err);
    try { await worker.terminate(); } catch { }
    return {
      rawText: "",
      cleanedText: "",
      amount: null,
      merchantName: null,
      isSuccess: false,
      processingTimeMs: Date.now() - startTime,
      error: "Mesin OCR mengalami error saat memproses gambar.",
    };
  }
};

// ============================================================
// MODULE 3: TEXT CLEANING (Noise Removal)
// ============================================================

/**
 * Membersihkan teks raw dari Tesseract:
 * 1. Uppercase normalisasi
 * 2. Koreksi karakter salah baca (O→0, I/L→1)
 * 3. Hapus karakter noise yang tidak relevan
 * 4. Normalisasi whitespace
 */
const cleanOCRText = (rawText: string): string => {
  return rawText
    .toUpperCase()
    // Koreksi karakter alfabet yang sering salah dibaca sebagai angka (konteks angka)
    .replace(/(?<=[^A-Z])O(?=[^A-Z])/g, "0")   // O antara non-huruf → 0
    .replace(/(?<=[^A-Z])I(?=[^A-Z])/g, "1")   // I antara non-huruf → 1
    .replace(/(?<=[^A-Z])L(?=[^A-Z])/g, "1")   // L antara non-huruf → 1
    .replace(/\|/g, "1")                         // Pipe symbol → 1
    .replace(/S(?=\d)/g, "5")                   // S sebelum angka → 5
    .replace(/B(?=\d)/g, "8")                   // B sebelum angka → 8
    // Hapus karakter yang tidak relevan sama sekali (bukan huruf, angka, titik, koma, spasi, strip)
    .replace(/[^A-Z0-9.,\- \n]/g, "")
    // Normalisasi spasi dan baris kosong berlebih
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
};

// ============================================================
// MODULE 4: NOMINAL EXTRACTOR (Regex Bertingkat)
// Range valid: Rp100 – Rp1.000.000 (SKPL requirement)
// ============================================================

const extractNominal = (cleanedText: string): number | null => {
  // Regex bertingkat dari pola paling spesifik ke paling umum
  const patterns: RegExp[] = [
    // Pola 1: "RP" / "TOTAL" / "BAYAR" diikuti langsung nominal (Rp15.000 / TOTAL 15000)
    /(?:RP|TOTAL|BAYAR|NOMINAL|AMOUNT|JUMLAH|TRANSFER)\s?([0-9]{1,3}(?:[.,][0-9]{3})*)/i,

    // Pola 2: Nominal diikuti kata konfirmasi keberhasilan (15000 BERHASIL)
    /([0-9]{1,3}(?:[.,][0-9]{3})*)\s?(?:BERHASIL|SUCCESS|COMPLETED|SELESAI)/i,

    // Pola 3: "RP" langsung diikuti angka tanpa spasi apapun (Rp15000)
    /RP([0-9.,]+)/i,

    // Pola 4: Angka format ribuan berdiri sendiri (15.000 / 15,000) sebagai fallback
    /(?:^|\s)([0-9]{1,3}[.,][0-9]{3})(?:\s|$)/m,
  ];

  for (const regex of patterns) {
    const match = cleanedText.match(regex);
    if (match && match[1]) {
      // Bersihkan separator ribuan (titik/koma sebelum 3 digit)
      const numStr = match[1]
        .replace(/[.,](?=\d{3}(?:\D|$))/g, "") // Hapus separator ribuan
        .replace(/[.,]/g, "");                   // Hapus sisa titik/koma (desimal)

      const amount = parseInt(numStr, 10);

      // Validasi range: Rp100 – Rp1.000.000
      if (!isNaN(amount) && amount >= 100 && amount <= 1_000_000) {
        return amount;
      }
    }
  }

  return null;
};

// ============================================================
// MODULE 5: MERCHANT VALIDATOR (Rule-based)
// Validasi tujuan pembayaran ke kantin HMIT/STORE
// ============================================================

const extractMerchant = (cleanedText: string): string | null => {
  // Kata kunci yang WAJIB ada untuk membuktikan struk dari kantin yang benar
  const VALID_MERCHANTS = ["HMIT", "STORE"];

  for (const keyword of VALID_MERCHANTS) {
    if (cleanedText.includes(keyword)) {
      return keyword;
    }
  }

  return null;
};