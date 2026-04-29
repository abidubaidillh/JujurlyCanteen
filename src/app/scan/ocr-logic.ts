import { createWorker } from "tesseract.js";

export interface OCRResult {
  rawText: string;
  amount: number | null;
  merchantName: string | null;
  isSuccess: boolean;
  error?: string;
}

/**
 * 🔥 PENAMBAHAN FUNGSI PRE-PROCESSING OPENCV
 * Mengubah gambar menjadi hitam putih (Grayscale & Thresholding)
 * untuk menghilangkan silau layar HP dan memperjelas teks.
 */
const preprocessImageWithOpenCV = async (imageBlob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = URL.createObjectURL(imageBlob);
    
    img.onload = () => {
      try {
        // Cek apakah OpenCV sudah dimuat di window
        const cv = (window as any).cv;
        if (!cv || !cv.Mat) {
          console.warn("⚠️ OpenCV tidak tersedia, menggunakan gambar asli.");
          resolve(img.src);
          return;
        }

        const src = cv.imread(img);
        const dst = new cv.Mat();

        // 1. Ubah ke Grayscale (Hitam Putih)
        cv.cvtColor(src, dst, cv.COLOR_RGBA2GRAY, 0);

        // 2. Terapkan Otsu Thresholding
        // Secara dinamis menghitung batas thresh terbaik berdasarkan pencahayaan gambar.
        // Sangat efektif untuk menjernihkan layar HP agar terbaca jelas oleh OCR.
        cv.threshold(dst, dst, 0, 255, cv.THRESH_BINARY | cv.THRESH_OTSU);

        // 3. Pindahkan hasil OpenCV ke Canvas untuk dijadikan URL
        const canvas = document.createElement("canvas");
        cv.imshow(canvas, dst);
        const processedImageUrl = canvas.toDataURL("image/jpeg");

        // Bersihkan memori OpenCV
        src.delete();
        dst.delete();
        URL.revokeObjectURL(img.src);

        resolve(processedImageUrl);
      } catch (error) {
        console.error("❌ OpenCV Processing Error:", error);
        resolve(img.src); // Fallback ke gambar asli jika gagal
      }
    };
    
    img.onerror = (err) => {
      console.error("Gagal memuat gambar untuk pre-processing", err);
      resolve(URL.createObjectURL(imageBlob)); // Fallback
    };
  });
};

export const performOCR = async (imageBlob: Blob): Promise<OCRResult> => {
  const worker = await createWorker("ind+eng");

  try {
    console.log("⚙️ Memulai pre-processing OpenCV...");
    // Jalankan OpenCV sebelum masuk ke OCR
    const processedImageUrl = await preprocessImageWithOpenCV(imageBlob);

    await worker.setParameters({
      tessedit_char_whitelist: "0123456789RP.,TOTALBAYARNOMINALAMOUNTJUMLAHBERHASILSUCCESSCOMPLETEDHMITSTOREITSSURABAYA",
    });

    console.log("🔍 Mengekstrak teks dengan Tesseract...");
    const { data: { text } } = await worker.recognize(processedImageUrl);
    
    await worker.terminate();
    console.log("📝 [OCR RAW]:", text);

    if (!text || text.trim().length < 5) {
      return { 
        rawText: text || "", 
        amount: null, 
        merchantName: null, 
        isSuccess: false, 
        error: "Gagal mengekstrak teks. Pastikan gambar fokus dan tidak terpotong." 
      };
    }

    const detectedAmount = extractNominal(text);
    const merchant = extractMerchant(text);

    if (detectedAmount === null) {
      return { 
        rawText: text, 
        amount: null, 
        merchantName: merchant, 
        isSuccess: false, 
        error: "Nominal tidak ditemukan dalam teks." 
      };
    }

    if (merchant === null) {
      return { 
        rawText: text, 
        amount: detectedAmount, 
        merchantName: null, 
        isSuccess: false, 
        error: "Tujuan pembayaran (HMIT/STORE) tidak valid." 
      };
    }

    return {
      rawText: text,
      amount: detectedAmount,
      merchantName: merchant,
      isSuccess: true,
    };
  } catch (error) {
    console.error("OCR Runtime Error:", error);
    if (worker) await worker.terminate();
    return { 
      rawText: "", 
      amount: null, 
      merchantName: null, 
      isSuccess: false, 
      error: "Mesin pemindai gagal memproses gambar." 
    };
  }
};

const extractNominal = (text: string): number | null => {
  // Normalisasi karakter dan pembersihan noise OCR
  const normalizedText = text.toUpperCase()
    .replace(/[O]/g, "0")
    .replace(/[IL|]/g, "1")
    .replace(/[^A-Z0-9., ]/g, "") // Hapus karakter non-alphanumeric selain titik/koma/spasi
    .replace(/\s+/g, " ");

  const patterns = [
    // Regex bertingkat untuk menangkap nominal
    /(?:RP|TOTAL|NOMINAL|AMOUNT|BAYAR|JUMLAH|TRANSFER)\s?([\d.,]{3,10})/i,
    /([\d.,]{3,10})\s?(?:BERHASIL|SUCCESS|COMPLETED|SELESAI)/i,
    /RP\s?([\d.,]+)/i,
    /(?:^|\s)([\d]{1,3}[.,][\d]{3})(?:\s|$)/
  ];

  for (const regex of patterns) {
    const match = normalizedText.match(regex);
    if (match && match[1]) {
      let numericString = match[1].replace(/[.,](?=\d{3})/g, ""); 
      numericString = numericString.replace(/[.,]/g, ""); 
      
      const amount = parseInt(numericString, 10);
      
      // Menurunkan batas bawah menjadi 100 rupiah untuk menguji
      if (!isNaN(amount) && amount >= 100 && amount <= 1000000) {
        return amount;
      }
    }
  }

  return null;
};

const extractMerchant = (text: string): string | null => {
  const cleanText = text.toUpperCase();
  // Pengecekan kata kunci validasi tujuan pembayaran
  const keywords = ["HMIT", "STORE"];
  
  for (const key of keywords) {
    if (cleanText.includes(key)) return key;
  }
  return null;
};