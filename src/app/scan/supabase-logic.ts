import { createClient } from "@supabase/supabase-js";

// ============================================================
// INISIALISASI SUPABASE CLIENT
// ============================================================

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ============================================================
// MODULE 1: SCAN MANUAL (Dari Browser)
// SKPL-F-001: Upload bukti ke Storage
// SKPL-F-005: Simpan transaksi ke Database
// ============================================================

/**
 * Mengunggah blob gambar dari kamera browser ke Supabase Storage,
 * lalu menyimpan data transaksi dan bukti pembayaran ke database.
 *
 * Status transaksi diatur berdasarkan hasil OCR:
 * - isSuccess=true  → status_validasi="Valid",   status bukti="valid"
 * - isSuccess=false → status_validasi="Pending",  status bukti="invalid"
 */
export const uploadAndSaveTransaction = async (
  blob: Blob,
  amount?: number | null
) => {
  const fileName = `public/bukti_${Date.now()}.png`;

  // 1. Upload gambar ke Supabase Storage (bucket: bukti-transfer)
  const { data: storageData, error: storageError } = await supabase.storage
    .from("bukti-transfer")
    .upload(fileName, blob, { contentType: "image/png", upsert: false });

  if (storageError) {
    console.error("[Supabase Storage] Gagal upload:", storageError.message);
    throw storageError;
  }

  // 2. Simpan transaksi ke tabel 'transaksi'
  // Nominal default = 1 agar tidak melanggar constraint NOT NULL / positif
  const nominalValue = amount && amount > 0 ? amount : 1;
  const validasiStatus = amount && amount > 0 ? "Valid" : "Pending";

  const { data: transData, error: transError } = await supabase
    .from("transaksi")
    .insert([{
      nominal: nominalValue,
      metode_pembayaran: "QRIS",
      status_validasi: validasiStatus,
    }])
    .select()
    .single();

  if (transError) {
    console.error("[Supabase DB] Gagal insert transaksi:", transError.message);
    throw transError;
  }

  // 3. Simpan detail bukti ke tabel 'bukti_pembayaran'
  // status: "valid" / "invalid" → sesuai Check Constraint bukti_pembayaran_status_check
  const buktiStatus = amount && amount > 0 ? "valid" : "invalid";

  const { error: detailError } = await supabase
    .from("bukti_pembayaran")
    .insert([{
      id_transaksi: transData.id_transaksi,
      file_gambar: storageData.path,
      status: buktiStatus,
      waktu_capture: new Date().toISOString(),
    }]);

  if (detailError) {
    console.error("[Supabase DB] Gagal insert bukti_pembayaran:", detailError.message);
    throw detailError;
  }

  console.log(`✅ [Supabase] Transaksi tersimpan. ID: ${transData.id_transaksi}, Status: ${buktiStatus}`);
  return transData;
};

// ============================================================
// MODULE 2: SUPABASE STORAGE HELPER
// ============================================================

/**
 * Mengonversi path relatif (misal: "public/bukti_123.png")
 * menjadi URL publik penuh untuk diunduh oleh OCR engine.
 */
export const getPublicImageUrl = (filePath: string): string => {
  const { data } = supabase.storage
    .from("bukti-transfer")
    .getPublicUrl(filePath);

  return data.publicUrl;
};

// ============================================================
// MODULE 3: OCR RESULT UPDATER (Untuk Auto-Scan / Realtime)
// Dipanggil setelah Next.js selesai memproses gambar dari Python
// ============================================================

/**
 * Setelah OCR selesai memproses gambar yang dikirim Python via Supabase Realtime:
 * 1. Membuat record baru di tabel 'transaksi' dengan nominal yang sudah diekstrak
 * 2. Mengupdate baris di 'bukti_pembayaran' dengan id_transaksi dan status final
 *
 * @param idBukti - Primary Key dari tabel bukti_pembayaran (bisa "id" atau "id_bukti")
 * @param amount  - Nominal yang berhasil diekstrak OCR, null jika gagal
 */
export const updateOCRResult = async (
  idBukti: number | string,
  amount: number | null
) => {
  const nominalValue = amount && amount > 0 ? amount : 1;
  const validasiStatus = amount && amount > 0 ? "Valid" : "Gagal OCR";
  const buktiStatus = amount && amount > 0 ? "valid" : "invalid";

  // 1. Insert transaksi baru untuk mencatat nominal hasil OCR
  const { data: transData, error: transError } = await supabase
    .from("transaksi")
    .insert([{
      nominal: nominalValue,
      metode_pembayaran: "QRIS",
      status_validasi: validasiStatus,
    }])
    .select()
    .single();

  if (transError) {
    console.error("[Supabase] Gagal insert transaksi (OCR result):", transError.message);
    throw transError;
  }

  // 2. Update bukti_pembayaran: hubungkan ke transaksi baru dan set status akhir
  // ⚠️ PENTING: Sesuaikan nama kolom PK di bawah dengan skema database Anda.
  //   Jika PK bernama "id_bukti", ganti .eq("id", idBukti) → .eq("id_bukti", idBukti)
  const { data: detailData, error: detailError } = await supabase
    .from("bukti_pembayaran")
    .update({
      id_transaksi: transData.id_transaksi,
      status: buktiStatus,
    })
    .eq("id", idBukti)
    .select();

  if (detailError) {
    console.error("[Supabase] Gagal update bukti_pembayaran:", detailError.message);
    throw detailError;
  }

  console.log(`✅ [Supabase] OCR Result tersimpan. Bukti ID: ${idBukti} → ${buktiStatus}`);
  return detailData;
};