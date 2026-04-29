import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ==========================================
// 1. LOGIKA UNTUK SCAN MANUAL (DARI BROWSER)
// ==========================================

/**
 * Fungsi untuk mengunggah bukti gambar ke Storage dan menyimpan metadata ke Database.
 * Digunakan jika user menekan tombol "Scan Manual" di frontend.
 */
export const uploadAndSaveTransaction = async (
  blob: Blob, 
  amount?: number | null
) => {
  const fileName = `public/bukti_${Date.now()}.png`;

  // 1. Upload Gambar ke Supabase Storage (SKPL-F-001)
  const { data: storageData, error: storageError } = await supabase.storage
    .from("bukti-transfer")
    .upload(fileName, blob);

  if (storageError) throw storageError;

  // 2. Simpan Transaksi ke Tabel 'transaksi' (SKPL-F-005)
  const nominalValue = amount && amount > 0 ? amount : 1;

  const { data: transData, error: transError } = await supabase
    .from("transaksi")
    .insert([{ 
      nominal: nominalValue, 
      metode_pembayaran: "QRIS", 
      status_validasi: amount ? "Valid" : "Pending" 
    }])
    .select()
    .single();

  if (transError) throw transError;

  // 3. Simpan Detail Bukti ke Tabel 'bukti_pembayaran' (Tabel 7)
  const { error: detailError } = await supabase
    .from("bukti_pembayaran")
    .insert([{
      id_transaksi: transData.id_transaksi, // Foreign Key dari transData
      file_gambar: storageData.path,        // Path file yang baru diupload
      status: amount ? "valid" : "invalid",                      
      waktu_capture: new Date().toISOString()
    }]);

  if (detailError) throw detailError;

  return transData;
};


// ==========================================
// 2. LOGIKA UNTUK AUTO-SCAN (CLOUD REALTIME)
// ==========================================

/**
 * Mengubah path relatif (misal: "public/bukti_123.png") 
 * menjadi URL Publik utuh agar bisa di-download oleh frontend untuk OCR.
 */
export const getPublicImageUrl = (filePath: string) => {
  const { data } = supabase.storage
    .from("bukti-transfer")
    .getPublicUrl(filePath);
  
  return data.publicUrl;
};

/**
 * Dipanggil setelah OCR selesai memproses gambar dari Supabase Realtime.
 * Membuat data 'transaksi' baru dan menghubungkannya ke 'bukti_pembayaran'.
 */
export const updateOCRResult = async (idBukti: number | string, amount: number | null) => {
  // 1. Buat data di tabel transaksi terlebih dahulu untuk menyimpan nominal
  const nominalValue = amount && amount > 0 ? amount : 1;

  const { data: transData, error: transError } = await supabase
    .from("transaksi")
    .insert([{ 
      nominal: nominalValue, 
      metode_pembayaran: "QRIS", 
      status_validasi: amount ? "Valid" : "Gagal OCR" 
    }])
    .select()
    .single();

  if (transError) {
    console.error("Gagal membuat transaksi baru:", transError);
    throw transError;
  }

  // 2. Update tabel bukti_pembayaran untuk memasukkan id_transaksi dan status akhir
  const { data: detailData, error: detailError } = await supabase
    .from("bukti_pembayaran")
    .update({ 
      id_transaksi: transData.id_transaksi, // Menyambungkan Foreign Key
      status: amount ? "valid" : "invalid" 
    })
    .eq("id", idBukti); // Catatan: Ganti "id" dengan "id_bukti" jika Primary Key di tabelmu bernama id_bukti

  if (detailError) {
    console.error("Gagal update bukti_pembayaran:", detailError);
    throw detailError;
  }

  return detailData;
};