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
      let src: any, gray: any, claheDst: any, gammaDst: any, blurred: any, dst: any, lut: any;

      try {
        const cv = (window as any).cv;
        if (!cv || !cv.Mat) {
          console.warn("⚠️ OpenCV.js tidak tersedia, fallback ke gambar asli.");
          resolve(objectUrl);
          return;
        }

        src = cv.imread(img);
        gray = new cv.Mat();
        claheDst = new cv.Mat();
        gammaDst = new cv.Mat();
        blurred = new cv.Mat();
        dst = new cv.Mat();
        lut = new cv.Mat(1, 256, cv.CV_8UC1);

        // ----------------------------------------------------------------
        // Step 1: Grayscale
        // ----------------------------------------------------------------
        cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);

        // ----------------------------------------------------------------
        // Step 2: CLAHE (Contrast Limited Adaptive Histogram Equalization)
        // Menggantikan Normalize global untuk meratakan distribusi cahaya 
        // ekstrem secara lokal.
        // ----------------------------------------------------------------
        try {
          // Beberapa versi OpenCV.js menggunakan cv.CLAHE, lainnya mungkin perlu adaptasi
          const clahe = new cv.CLAHE(2.0, new cv.Size(8, 8));
          clahe.apply(gray, claheDst);
          clahe.delete();
        } catch (e) {
          console.warn("⚠️ [OpenCV] CLAHE gagal, fallback ke Normalize Global:", e);
          cv.normalize(gray, claheDst, 0, 255, cv.NORM_MINMAX);
        }

        // ----------------------------------------------------------------
        // Step 3: Gamma Correction (< 1.0)
        // Menggelapkan area overexposed agar teks yang tenggelam muncul.
        // Eksponen dihitung sebagai 1.0 / gamma agar nilai < 1.0 benar-benar 
        // menggelapkan gambar sesuai kalkulasi matematika kurva gamma.
        // ----------------------------------------------------------------
        const gammaValue = 0.8;
        const invGamma = 1.0 / gammaValue;
        for (let i = 0; i < 256; i++) {
          lut.data[i] = Math.min(255, Math.pow(i / 255.0, invGamma) * 255.0);
        }
        cv.LUT(claheDst, lut, gammaDst);

        // ----------------------------------------------------------------
        // Step 4: Gaussian Blur ringan untuk hilangkan noise pixel
        // ----------------------------------------------------------------
        cv.GaussianBlur(gammaDst, blurred, new cv.Size(3, 3), 0);

        // ----------------------------------------------------------------
        // Step 5: Adaptive Thresholding
        //   blockSize = 15
        //   C = 5 (dikurangi dari 8 agar teks tipis spt HMIT tidak putus)
        // ----------------------------------------------------------------
        cv.adaptiveThreshold(
          blurred,
          dst,
          255,
          cv.ADAPTIVE_THRESH_GAUSSIAN_C,
          cv.THRESH_BINARY,
          15,
          5
        );

        // Render ke canvas dan ambil Data URL
        const canvas = document.createElement("canvas");
        cv.imshow(canvas, dst);
        const processedUrl = canvas.toDataURL("image/png");

        URL.revokeObjectURL(objectUrl);

        console.log("✅ [OpenCV] Pre-processing selesai: CLAHE → Gamma(0.8) → Blur → Adaptive Thresh.");
        resolve(processedUrl);

      } catch (err) {
        console.error("❌ [OpenCV] Pre-processing gagal, fallback ke gambar asli:", err);
        resolve(objectUrl);
      } finally {
        // CLEANUP SEMUA MAT UNTUK MENCEGAH WEBASSEMBLY MEMORY LEAK
        if (src) src.delete();
        if (gray) gray.delete();
        if (claheDst) claheDst.delete();
        if (gammaDst) gammaDst.delete();
        if (blurred) blurred.delete();
        if (dst) dst.delete();
        if (lut) lut.delete();
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

let globalWorker: any = null;

const getTesseractWorker = async () => {
  if (!globalWorker) {
    console.log("⚙️ [OCR] Menginisialisasi Singleton Tesseract Worker...");
    globalWorker = await createWorker("ind+eng");
    await globalWorker.setParameters({
      tessedit_char_whitelist: "0123456789RrPpTtOoAaLlBbYyNnMmIiJjUuHhEeSsCcDdGgKkXx.,- ",
      tessedit_pageseg_mode: "6" as any,
    });
  }
  return globalWorker;
};

/**
 * Fungsi utama OCR. Menjalankan seluruh pipeline:
 * OpenCV Pre-processing → Tesseract Extraction → Cleaning → Validation
 */
export const performOCR = async (imageBlob: Blob): Promise<OCRResult> => {
  const startTime = Date.now();
  let processedImageUrl = "";

  try {
    const worker = await getTesseractWorker();

    // --- TAHAP 1: Pre-processing OpenCV ---
    processedImageUrl = await preprocessImageWithOpenCV(imageBlob);

    // --- TAHAP 2: Ekstraksi Teks ---
    const { data: { text } } = await worker.recognize(processedImageUrl);

    // Cleanup Object URL if fallback occurred
    if (processedImageUrl.startsWith("blob:")) {
      URL.revokeObjectURL(processedImageUrl);
    }

    const processingTimeMs = Date.now() - startTime;

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
        error: "Validasi gagal: merchant 'HMIT STORE ITS' tidak terdeteksi.",
      };
    }

    console.log(`🧠 OCR Result: { amount: ${detectedAmount}, merchantName: ${merchant}, isSuccess: ${detectedAmount !== null && merchant !== null} }`);

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
    if (processedImageUrl.startsWith("blob:")) {
      URL.revokeObjectURL(processedImageUrl);
    }
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

    // Pola 2: Nominal diikuti kata konfirmasi keberhasilan/membayar (15000 BERHASIL / 100 MEMBAYAR)
    /([0-9]{1,3}(?:[.,][0-9]{3})*)\s?(?:MEMBAYAR|BERHASIL|SUCCESS|COMPLETED|SELESAI)/i,

    // Pola 3: "RP" langsung diikuti angka dengan/tanpa spasi (Rp15000 / Rp 15000)
    /RP\s?([0-9.,]+)/i,

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
  // Normalisasi: collapse semua whitespace/separator menjadi spasi tunggal
  const normText = cleanedText.replace(/[\s\-_]+/g, ' ').trim();

  // Pola variasi tipografi Tesseract untuk "HMIT STORE ITS"
  // Mencakup: HM1T, HN1T, HMITSTORE11S, HIT STORE, dll.
  const hmitVariants = /H[MN1][IL1][T7]/i;
  const storeVariants = /S[T7][O0][RP][E3]/i;
  const itsVariants = /[I1][T7][S5]/i;

  const hasHmit = hmitVariants.test(normText);
  const hasStore = storeVariants.test(normText);
  const hasIts = itsVariants.test(normText);

  // Jika ada setidaknya dua komponen (HMIT + STORE, HMIT + ITS, atau STORE + ITS),
  // atau ketiga komponen hadir → standarisasi ke "HMIT STORE ITS"
  const matchCount = [hasHmit, hasStore, hasIts].filter(Boolean).length;

  if (matchCount >= 2) {
    return "HMIT STORE ITS";
  }

  // Satu komponen saja tidak cukup → tidak bisa dikonfirmasi sebagai merchant kantin
  return null;
};