import { createBrowserClient } from "@supabase/ssr";
import { validateTransactionDate } from "./ocr-logic";

// ============================================================
// INISIALISASI SUPABASE CLIENT
// ============================================================
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ============================================================
// MODULE 1: SCAN MANUAL (Dari Browser)
// ============================================================
export const uploadAndSaveTransaction = async (
  blob: Blob,
  amount?: number | null
) => {
  const fileName = `bukti_${Date.now()}.png`;

  const { data: storageData, error: storageError } = await supabase.storage
    .from("bukti-transfer")
    .upload(fileName, blob, { contentType: "image/png", upsert: false });

  if (storageError) {
    console.error("[Supabase Storage] Gagal upload:", storageError.message);
    throw storageError;
  }

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
  return transData;
};

export const deleteBuktiFile = async (idBukti: number | string) => {
  try {
    // FIX 1: maybeSingle() — tidak crash jika 0 row
    const { data: buktiData } = await supabase
      .from("bukti_pembayaran")
      .select("file_gambar")
      .eq("id_bukti", idBukti)
      .maybeSingle();

    if (buktiData?.file_gambar) {
      const { error } = await supabase.storage
        .from("bukti-transfer")
        .remove([buktiData.file_gambar]);

      if (error) {
        console.error("⚠️ [Supabase] Gagal menghapus file:", error.message);
      }
    }
  } catch (err) {
    console.error("⚠️ [Supabase] Error saat menghapus file:", err);
  }
};

// ============================================================
// MODULE 2: SUPABASE STORAGE HELPER
// ============================================================
export const getPublicImageUrl = (filePath: string): string => {
  const cleanPath = filePath.replace(/^public\//, "").replace(/^\/+/, "");
  const { data } = supabase.storage
    .from("bukti-transfer")
    .getPublicUrl(cleanPath);
  return data.publicUrl;
};

// ============================================================
// MODULE 3: OCR RESULT HANDLER
// ============================================================
export const saveOCRResult = async (
  idBukti: number | string,
  teksOcr: string,
  nominal: number | null,
  merchantName: string | null
) => {
  const { data, error } = await supabase
    .from("hasil_ocr")
    .insert([{
      id_bukti: idBukti,
      teks_ocr: teksOcr,
      nominal_terbaca: nominal,
      merchant_name: merchantName,
    }])
    .select()
    .single();

  if (error) {
    console.error("[Supabase] Gagal insert hasil_ocr:", error.message);
    throw error;
  }
  return data;
};

export const updateBuktiStatus = async (
  idBukti: number | string,
  status: "valid" | "invalid" | "pending"
) => {
  const { data, error } = await supabase
    .from("bukti_pembayaran")
    .update({ status })
    .eq("id_bukti", idBukti)
    .select();

  if (error) {
    console.error("[Supabase] Gagal update bukti_pembayaran status:", error.message);
    throw error;
  }
  return data;
};

export const updateTransactionFromOCR = async (
  idBukti: number | string,
  amount: number,
  merchantName: string | null,
  transactionDate?: Date | null
) => {
  // ============================================================
  // FIX 2: Guard — tolak idBukti yang tidak valid sebelum query
  // Mencegah .eq("id_bukti", 0/undefined/"") match ke banyak row
  // ============================================================
  if (!idBukti || Number(idBukti) <= 0) {
    console.error("[Supabase] updateTransactionFromOCR dipanggil dengan idBukti tidak valid:", idBukti);
    return;
  }

  // ============================================================
  // FIX 3: maybeSingle() — tidak crash meski 0 atau >1 row
  // Ditambah .order() untuk ambil row terbaru jika ada duplikat
  // ============================================================
  const { data: buktiData, error: buktiErr } = await supabase
    .from("bukti_pembayaran")
    .select("id_transaksi")
    .eq("id_bukti", idBukti)
    .order("waktu_capture", { ascending: false })
    .maybeSingle();

  if (buktiErr) {
    console.error("[Supabase] Gagal fetch id_transaksi:", buktiErr.message);
    return;
  }

  if (!buktiData) {
    console.error("[Supabase] Tidak ditemukan bukti_pembayaran untuk id_bukti:", idBukti);
    return;
  }

  const isStrictMerchantValid = merchantName === "HMIT STORE ITS";

  const timeValidation = validateTransactionDate(transactionDate ?? null, 5);
  const isTimeValid = timeValidation.isValid;

  let validasiStatus: "Valid" | "Pending" | "Invalid";
  if (!isStrictMerchantValid) {
    validasiStatus = "Pending";
  } else if (!isTimeValid) {
    validasiStatus = "Invalid";
  } else {
    validasiStatus = "Valid";
  }

  const buktiStatus = validasiStatus === "Valid" ? "valid" : "invalid";

  let idTransaksi = buktiData.id_transaksi;

  if (!idTransaksi) {
    // Auto-Capture: buat transaksi baru
    const { data: newTrans, error: createErr } = await supabase
      .from("transaksi")
      .insert([{
        nominal: amount,
        metode_pembayaran: "QRIS",
        status_validasi: validasiStatus,
      }])
      .select()
      .single();

    if (createErr) {
      console.error("[Supabase] Gagal create transaksi baru:", createErr.message);
      return;
    }

    idTransaksi = newTrans.id_transaksi;

    await supabase
      .from("bukti_pembayaran")
      .update({ id_transaksi: idTransaksi })
      .eq("id_bukti", idBukti);

  } else {
    // Scan manual: update nominal dan status
    const { error: transErr } = await supabase
      .from("transaksi")
      .update({
        nominal: amount,
        status_validasi: validasiStatus,
      })
      .eq("id_transaksi", idTransaksi);

    if (transErr) {
      console.error("[Supabase] Gagal update transaksi nominal:", transErr.message);
    }
  }

  await updateBuktiStatus(idBukti, buktiStatus);

  if (validasiStatus === "Invalid") {
    const alasan = !timeValidation.isValid
      ? timeValidation.reason
      : "Transaksi tidak memenuhi syarat validasi.";
    await supabase.from("log_notifikasi").insert([{
      pesan: `Transaksi Invalid — ${alasan}`,
      read: false,
    }]);
  }

  return { validasiStatus, timeValidation };
};