"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useEffect, useCallback } from "react";
// Pastikan mengimpor semua fungsi yang dibutuhkan dari supabase-logic
import { 
  supabase, 
  uploadAndSaveTransaction, 
  updateOCRResult, 
  getPublicImageUrl 
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

export default function ScanPage() {
  const router = useRouter();
  const cameraRef = useRef<any>(null);

  const [isCapturing, setIsCapturing] = useState(false);
  const [isOpenCVReady, setIsOpenCVReady] = useState(false);
  const [status, setStatus] = useState("Menyiapkan Engine CV...");
  const [cameraPermission, setCameraPermission] = useState<"checking" | "granted" | "denied">("checking");
  
  // 🔥 STATE BARU UNTUK MODE CLOUD REALTIME
  const [isAutoMode, setIsAutoMode] = useState(false);

  const requestCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      stream.getTracks().forEach((track) => track.stop());
      setCameraPermission("granted");
      return true;
    } catch (error) {
      console.error("Akses kamera ditolak:", error);
      setCameraPermission("denied");
      setStatus("Akses Kamera Denied");
      return false;
    }
  };

  useEffect(() => {
    requestCamera();
  }, []);

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

  // ==========================================
  // LOGIC 1: MANUAL CAPTURE (DARI BROWSER)
  // ==========================================
  const onCapture = useCallback(async () => {
    if (isCapturing || cameraPermission !== "granted" || !isOpenCVReady) return;

    const blob = await cameraRef.current?.capture();
    if (!blob) return;

    setIsCapturing(true);
    setStatus("Menganalisis Teks (OCR)...");

    try {
      console.log("🚀 [OCR] Memulai ekstraksi teks dari kamera...");
      const ocrResult = await performOCR(blob);

      if (ocrResult?.isSuccess) {
        setStatus(`✅ Terdeteksi Rp${ocrResult.amount?.toLocaleString('id-ID')}...`);
      } else {
        console.warn("⚠️ OCR gagal mendeteksi pola nominal.");
        setStatus(ocrResult.error || "Nominal tidak terbaca, menyimpan gambar...");
      }

      // Hanya kirim amount jika OCR sukses (termasuk validasi merchant)
      await uploadAndSaveTransaction(blob, ocrResult?.isSuccess ? ocrResult.amount : null);

      setStatus("Berhasil! Mengalihkan...");
      setTimeout(() => {
        router.push("/");
        router.refresh();
      }, 2000);
    } catch (err) {
      console.error("❌ Gagal memproses bukti bayar:", err);
      setStatus("Gagal Simpan. Coba lagi.");
      setIsCapturing(false);
    }
  }, [isCapturing, cameraPermission, isOpenCVReady, router]);

  // ==========================================
  // LOGIC 2: SUPABASE REALTIME (AUTO DARI PYTHON)
  // ==========================================
  
  const processSupabaseImage = async (newRecord: any) => {
    setIsCapturing(true);
    try {
      setStatus("⬇️ Data baru masuk! Memproses URL gambar...");
      console.log("Record baru dari DB:", newRecord);

      // 1. Ubah path dari DB menjadi URL asli Supabase Storage
      const dbImagePath = newRecord.file_gambar; 
      const publicUrl = getPublicImageUrl(dbImagePath);
      
      console.log("🔗 Mengunduh gambar dari:", publicUrl);

      // 2. Fetch gambar dari URL Storage
      const response = await fetch(publicUrl);
      if (!response.ok) throw new Error("Gagal mengunduh gambar dari Storage");
      const blob = await response.blob();

      // 3. Jalankan OCR
      setStatus("🔍 Menganalisis Teks (OCR)...");
      const ocrResult = await performOCR(blob);
      console.log("📝 Hasil OCR:", ocrResult);

      // Gunakan id_bukti atau id (sesuaikan dengan nama Primary Key di tabelmu)
      const recordId = newRecord.id_bukti || newRecord.id;

      // 4. Simpan hasil nominal kembali ke Database (tabel transaksi & bukti_pembayaran)
      if (ocrResult.isSuccess) {
        setStatus(`✅ Berhasil! Terdeteksi Rp${ocrResult.amount?.toLocaleString('id-ID')}`);
        await updateOCRResult(recordId, ocrResult.amount);
      } else {
        setStatus(`⚠️ OCR Gagal: ${ocrResult.error}`);
        await updateOCRResult(recordId, null);
      }

      // Reset state untuk menunggu gambar berikutnya
      setTimeout(() => {
        setStatus("🎧 Menunggu scan berikutnya...");
        setIsCapturing(false);
      }, 3000);

    } catch (error) {
      console.error("❌ Gagal memproses gambar Supabase:", error);
      setStatus("❌ Terjadi kesalahan saat mengunduh/memproses.");
      setIsCapturing(false);
    }
  };

  useEffect(() => {
    let channel: any;

    if (isAutoMode) {
      setStatus("🎧 Mendengarkan tabel 'bukti_pembayaran'...");
      
      channel = supabase
        .channel('custom-insert-channel')
        .on(
          'postgres_changes',
          { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'bukti_pembayaran' 
          },
          (payload) => {
            console.log("🔥 TRIGGER REALTIME!", payload.new);
            processSupabaseImage(payload.new);
          }
        )
        .subscribe((subscribeStatus) => {
          if (subscribeStatus === 'SUBSCRIBED') {
            console.log('✅ Realtime tersambung ke tabel bukti_pembayaran');
          }
        });
    }

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [isAutoMode]);

  return (
    <div className="min-h-screen bg-[#F7F8FC] flex flex-col">
      <main className="flex-grow flex items-center justify-center px-6 py-8 pb-28">
        <div className="w-full max-w-7xl grid lg:grid-cols-[1fr_320px] gap-8">
          
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
            
            {/* --- PANEL DEBUG: SUPABASE REALTIME CLOUD MODE --- */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">
                  Integrasi Cloud (AI)
                </h3>
              </div>
              <p className="text-xs text-gray-500 mb-4 leading-relaxed">
                {isAutoMode 
                  ? "Sistem sedang mendengarkan database. Silakan scan QRIS menggunakan kamera eksternal (AI)."
                  : "Aktifkan mode ini jika Anda menggunakan kamera AI eksternal untuk deteksi otomatis."}
              </p>

              <button 
                onClick={() => setIsAutoMode(!isAutoMode)}
                disabled={isCapturing}
                className={`w-full text-sm font-bold py-3 rounded-xl transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed ${
                  isAutoMode 
                    ? "bg-red-50 text-red-600 border border-red-200 hover:bg-red-100" 
                    : "bg-[#2B4C7E] text-white hover:bg-[#1e3659]"
                }`}
              >
                {isCapturing 
                  ? "Memproses Data..." 
                  : (isAutoMode ? "🛑 Hentikan Mode Cloud" : "▶️ Mulai Mode Cloud")}
              </button>
            </div>
            {/* ------------------------------------------------ */}

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