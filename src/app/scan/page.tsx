"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useEffect, useCallback } from "react";
import {
  supabase,
  uploadAndSaveTransaction,
  updateOCRResult,
  getPublicImageUrl,
} from "./supabase-logic";
import { performOCR } from "./ocr-logic";
import Footer from "../../components/layout/Footer";
import { CameraSection } from "./components/CameraSection";
import { TipsPanel } from "./components/TipsPanel";

declare global {
  interface Window {
    cv: any;
  }
}

// ============================================================
// SCAN PAGE – Koordinator antara Manual Scan & Cloud AI Mode
// ============================================================

export default function ScanPage() {
  const router = useRouter();
  const cameraRef = useRef<any>(null);

  const [isCapturing, setIsCapturing] = useState(false);
  const [isOpenCVReady, setIsOpenCVReady] = useState(false);
  const [status, setStatus] = useState("Menyiapkan Engine CV...");
  const [cameraPermission, setCameraPermission] = useState<
    "checking" | "granted" | "denied"
  >("checking");

  // Mode Cloud: mendengarkan trigger dari AI Detector (Python) via Supabase Realtime
  const [isAutoMode, setIsAutoMode] = useState(false);

  // ============================================================
  // INISIALISASI: Kamera & OpenCV.js
  // ============================================================

  const requestCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      stream.getTracks().forEach((track) => track.stop());
      setCameraPermission("granted");
      return true;
    } catch (error) {
      console.error("[Camera] Akses ditolak:", error);
      setCameraPermission("denied");
      setStatus("Akses Kamera Denied");
      return false;
    }
  };

  // Cek status kamera saat komponen pertama kali mount
  useEffect(() => {
    requestCamera();
  }, []);

  // Polling sampai OpenCV.js selesai dimuat dari CDN (tag <script> di layout)
  useEffect(() => {
    const interval = setInterval(() => {
      if (window.cv?.Mat) {
        setIsOpenCVReady(true);
        if (cameraPermission === "granted") setStatus("Kamera Aktif");
        clearInterval(interval);
      }
    }, 500);
    return () => clearInterval(interval);
  }, [cameraPermission]);

  // ============================================================
  // LOGIC 1: MANUAL CAPTURE (Dari Browser)
  //
  // ALUR BARU (Bug #4 fix):
  // 1. Ambil gambar dari kamera (blob mentah)
  // 2. Kirim ke Python /capture-payment → perspective warp → upload Supabase
  // 3. Jika Mode Cloud aktif: OCR dijalankan via Realtime trigger otomatis
  // 4. Fallback: jika Python offline, OCR langsung dari blob lokal
  // ============================================================

  const runLocalOCR = async (blob: Blob) => {
    try {
      const ocrResult = await performOCR(blob);
      const timeInfo = ocrResult.processingTimeMs
        ? ` (${(ocrResult.processingTimeMs / 1000).toFixed(1)}s)` : "";

      if (ocrResult.isSuccess) {
        setStatus(`✅ Terdeteksi Rp${ocrResult.amount?.toLocaleString("id-ID")}${timeInfo}`);
      } else {
        setStatus(ocrResult.error || "Nominal tidak terbaca.");
      }

      await uploadAndSaveTransaction(blob, ocrResult.isSuccess ? ocrResult.amount : null);
      setStatus("✅ Berhasil disimpan! Mengalihkan...");
      setTimeout(() => { router.push("/"); router.refresh(); }, 2000);
    } catch (err) {
      console.error("❌ [runLocalOCR] Error:", err);
      setStatus("Gagal menyimpan. Silakan coba lagi.");
      setIsCapturing(false);
    }
  };

  const onCapture = useCallback(async () => {
    // Bug #1 fix: hapus syarat isOpenCVReady — tombol harus bisa diklik segera
    if (isCapturing || cameraPermission !== "granted") return;

    setIsCapturing(true);
    setStatus("📸 Mengambil gambar...");

    const blob = await cameraRef.current?.capture();
    if (!blob) {
      setStatus("❌ Gagal mengambil gambar dari kamera.");
      setIsCapturing(false);
      return;
    }

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

      // Bug #4 fix: kirim ke Python dulu untuk perspective warp & upload ke Supabase
      setStatus("⚙️ Memproses gambar (Perspective Warp)...");
      console.log("🚀 [onCapture] Kirim ke Python /capture-payment...");

      const formData = new FormData();
      formData.append("file", blob, "capture.jpg");

      let pythonSuccess = false;
      try {
        const res = await fetch(`${API_URL}/capture-payment`, {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        pythonSuccess = data.success === true;
        console.log("📦 [onCapture] Python result:", data);
      } catch (pyErr) {
        console.warn("⚠️ [onCapture] Python offline, fallback ke OCR lokal:", pyErr);
      }

      if (pythonSuccess && isAutoMode) {
        // Mode Cloud aktif + Python berhasil upload → tunggu Realtime trigger
        setStatus("✅ Gambar terkirim! OCR Realtime berjalan...");
        // isCapturing tetap true sampai processSupabaseImage selesai
      } else {
        // Fallback: OCR langsung dari blob kamera
        setStatus("🔍 Menganalisis teks (OCR lokal)...");
        await runLocalOCR(blob);
      }
    } catch (err) {
      console.error("❌ [onCapture] Error:", err);
      setStatus("Gagal memproses. Silakan coba lagi.");
      setIsCapturing(false);
    }
  }, [isCapturing, cameraPermission, isAutoMode, router]);


  // ============================================================
  // LOGIC 2: SUPABASE REALTIME (Auto dari Python AI Detector)
  // Python mengirim gambar → insert ke bukti_pembayaran dengan status "pending"
  // → Next.js terima trigger → unduh gambar → OCR → update status di DB
  // ============================================================

  const processSupabaseImage = useCallback(async (newRecord: any) => {
    // Anti-duplikat: jangan proses jika sedang ada OCR berjalan
    if (isCapturing) {
      console.warn("[Realtime] OCR sedang berjalan, trigger diabaikan.");
      return;
    }

    setIsCapturing(true);
    try {
      console.log("[Realtime] Record baru diterima:", newRecord);
      setStatus("⬇️ Menerima data dari AI Detector...");

      // 1. Resolusi path gambar → URL publik Storage
      const dbImagePath = newRecord.file_gambar;
      if (!dbImagePath) {
        throw new Error("Field 'file_gambar' kosong pada record Realtime.");
      }

      const publicUrl = getPublicImageUrl(dbImagePath);
      console.log("[Realtime] Mengunduh dari:", publicUrl);

      // 2. Download gambar dari Supabase Storage (SKPL-NF-012 error handling)
      const response = await fetch(publicUrl);
      if (!response.ok) {
        throw new Error(`Gagal mengunduh gambar: HTTP ${response.status}`);
      }
      const blob = await response.blob();

      // 3. Jalankan OCR pipeline lengkap
      setStatus("🔍 Menganalisis teks (OCR)...");
      const ocrResult = await performOCR(blob);
      console.log("[Realtime] Hasil OCR:", ocrResult);

      // 4. Ambil Primary Key – fleksibel untuk id_bukti atau id
      const recordId = newRecord.id_bukti ?? newRecord.id;
      if (!recordId) {
        throw new Error("Primary Key 'id_bukti'/'id' tidak ditemukan pada record.");
      }

      // 5. Simpan hasil ke database
      if (ocrResult.isSuccess) {
        const timeInfo = ocrResult.processingTimeMs
          ? ` (${(ocrResult.processingTimeMs / 1000).toFixed(1)}s)`
          : "";
        setStatus(
          `✅ Terdeteksi Rp${ocrResult.amount?.toLocaleString("id-ID")}${timeInfo}`
        );
        await updateOCRResult(recordId, ocrResult.amount);
      } else {
        setStatus(`⚠️ ${ocrResult.error}`);
        await updateOCRResult(recordId, null);
      }

      // Reset state setelah 3 detik → siap menerima trigger berikutnya
      setTimeout(() => {
        setStatus("🎧 Menunggu scan berikutnya...");
        setIsCapturing(false);
      }, 3000);
    } catch (error) {
      console.error("[Realtime] Error:", error);
      setStatus(`❌ Error: ${(error as Error).message}`);
      setIsCapturing(false);
    }
  }, [isCapturing]);

  // Supabase Realtime Listener – aktif hanya saat isAutoMode = true
  useEffect(() => {
    if (!isAutoMode) return;

    setStatus("🎧 Mendengarkan tabel 'bukti_pembayaran'...");
    console.log("[Realtime] Berlangganan ke channel bukti_pembayaran...");

    const channel = supabase
      .channel("bukti-pembayaran-insert-channel")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "bukti_pembayaran",
        },
        (payload) => {
          console.log("🔥 [Realtime] Trigger masuk!", payload.new);
          processSupabaseImage(payload.new);
        }
      )
      .subscribe((subscribeStatus) => {
        if (subscribeStatus === "SUBSCRIBED") {
          console.log("✅ [Realtime] Berhasil terhubung ke Supabase Realtime.");
        } else if (subscribeStatus === "CHANNEL_ERROR") {
          console.error("❌ [Realtime] Gagal terhubung ke channel.");
          setStatus("❌ Koneksi Realtime gagal.");
        }
      });

    // Cleanup: unsubscribe saat mode dimatikan atau komponen unmount
    return () => {
      supabase.removeChannel(channel);
      console.log("[Realtime] Channel dihapus.");
    };
  }, [isAutoMode, processSupabaseImage]);

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="min-h-screen bg-[#F7F8FC] flex flex-col">
      <main className="flex-grow flex items-center justify-center px-6 py-8 pb-28">
        <div className="w-full max-w-7xl grid lg:grid-cols-[1fr_320px] gap-8">

          {/* Komponen Kamera Utama */}
          <CameraSection
            cameraRef={cameraRef}
            status={status}
            isCapturing={isCapturing}
            isOpenCVReady={isOpenCVReady}
            cameraPermission={cameraPermission}
            onCapture={onCapture}
            onRetryPermission={requestCamera}
            onBack={() => router.back()}
          />

          <div className="flex flex-col gap-5">
            <TipsPanel />

            {/* Panel: Mode Cloud AI (Supabase Realtime) */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">
                  Integrasi Cloud (AI)
                </h3>
                {/* Indikator status koneksi Realtime */}
                {isAutoMode && (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-green-600">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse inline-block" />
                    LIVE
                  </span>
                )}
              </div>

              <p className="text-xs text-gray-500 mb-4 leading-relaxed">
                {isAutoMode
                  ? "Sistem mendengarkan database. Scan QRIS menggunakan kamera AI eksternal."
                  : "Aktifkan jika menggunakan kamera AI eksternal (Python Detector) untuk deteksi otomatis."}
              </p>

              <button
                id="btn-toggle-cloud-mode"
                onClick={() => {
                  if (isAutoMode) setStatus("Kamera Aktif");
                  setIsAutoMode(!isAutoMode);
                }}
                disabled={isCapturing}
                className={`w-full text-sm font-bold py-3 rounded-xl transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed ${
                  isAutoMode
                    ? "bg-red-50 text-red-600 border border-red-200 hover:bg-red-100"
                    : "bg-[#2B4C7E] text-white hover:bg-[#1e3659]"
                }`}
              >
                {isCapturing
                  ? "⏳ Memproses Data..."
                  : isAutoMode
                  ? "🛑 Hentikan Mode Cloud"
                  : "▶️ Mulai Mode Cloud"}
              </button>
            </div>

            {/* Panel: Status Engine */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 mt-auto">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    System Engine
                  </span>
                  <span className="text-xs font-bold text-[#487ADB]">
                    {isCapturing ? "OCR PROCESSING" : "CV READY"}
                  </span>
                </div>

                <div
                  className={`px-3 py-1 rounded-full text-[10px] font-black tracking-widest border transition-all duration-500 ${
                    isOpenCVReady
                      ? "bg-green-50 text-green-600 border-green-100"
                      : "bg-yellow-50 text-yellow-600 border-yellow-100 animate-pulse"
                  }`}
                >
                  {isOpenCVReady ? "● CORE ACTIVE" : "○ INITIALIZING"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="fixed bottom-0 left-0 w-full z-50 bg-[#487ADB] text-white">
        <Footer />
      </footer>
    </div>
  );
}