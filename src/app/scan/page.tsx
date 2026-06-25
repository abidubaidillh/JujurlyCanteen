"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useEffect, useCallback } from "react";
import { memo } from "react";
import Header from "../../components/layout/Header";
import Footer from "../../components/layout/Footer";
import { CameraSection } from "./components/CameraSection";
import { getPublicImageUrl } from "./supabase-logic";

// ============================================================
// HELPERS
// ============================================================
const API_URL = () => process.env.NEXT_PUBLIC_API_URL || "https://jujurly-ai-detector.onrender.com";
const resetCaptureLock = () =>
  fetch(`${API_URL()}/reset-capture`, { method: "POST" }).catch(() => {});

// ============================================================
// TYPES
// ============================================================
interface PreviewData {
  id_bukti: string;
  file_path: string;
  public_url: string;
  imageUrl: string;
}

const RobotMascot = memo(function RobotMascot() {
  return (
    <div className="select-none inline-flex flex-col items-center">
      <svg viewBox="0 0 680 520" xmlns="http://www.w3.org/2000/svg" className="w-24 sm:w-32 lg:w-48 h-auto">
        <style>{`
          @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
          @keyframes blink{0%,90%,100%{opacity:1}95%{opacity:0}}
          @keyframes pulse{0%,100%{r:4}50%{r:5.5}}
          @keyframes scanLine{0%{transform:translateY(0);opacity:.3}50%{transform:translateY(48px);opacity:1}100%{transform:translateY(0);opacity:.3}}
          .float{animation:float 2s ease-in-out infinite;transform-origin:340px 260px}
          .cursor{animation:blink 2.4s infinite}
          .dot-g{animation:pulse 2s infinite}
          .dot-y{animation:pulse 2.3s infinite}
          .scanLine{animation:scanLine 2s ease-in-out infinite}
        `}</style>

        <g className="float">
          <ellipse cx="435" cy="490" rx="80" ry="12" fill="#c8dcee" opacity="0.5"/>

          <rect x="372" y="310" width="136" height="100" rx="36" fill="#dbeafe"/>
          <rect x="372" y="310" width="136" height="100" rx="36" fill="none" stroke="#bfdbfe" strokeWidth="1.5"/>
          <rect x="396" y="330" width="88" height="58" rx="14" fill="#bfdbfe"/>

          <circle cx="418" cy="349" r="7" fill="#60a5fa"/><circle cx="418" cy="349" r="4" fill="#93c5fd"/>
          <circle cx="440" cy="349" r="7" fill="#34d399"/><circle cx="440" cy="349" r="4" fill="#6ee7b7"/>
          <circle cx="462" cy="349" r="7" fill="#f472b6"/><circle cx="462" cy="349" r="4" fill="#f9a8d4"/>
          <rect x="405" y="367" width="70" height="8" rx="4" fill="#93c5fd"/>
          <rect x="405" y="367" width="23" height="8" rx="4" fill="#676b6e" />

          <rect x="325" y="316" width="38" height="90" rx="19" fill="#bee3f8" stroke="#bfdbfe"/>
          <ellipse cx="345" cy="408" rx="18" ry="14" fill="#93c5fd"/>

          <rect x="518" y="316" width="38" height="90" rx="19" fill="#bee3f8" stroke="#bfdbfe"/>
          <ellipse cx="537" cy="408" rx="18" ry="14" fill="#93c5fd"/>

          <rect x="340" y="160" width="200" height="152" rx="52" fill="#dbeafe"/>
          <rect x="340" y="160" width="200" height="152" rx="52" fill="none" stroke="#bfdbfe" strokeWidth="2"/>

          <rect x="322" y="210" width="30" height="50" rx="20" fill="#93c5fd" stroke="#bfdbfe"/>
          <rect x="527" y="210" width="30" height="50" rx="20" fill="#93c5fd" stroke="#bfdbfe"/>

          <rect x="372" y="188" width="136" height="88" rx="24" fill="#0f172a"/>
          <rect x="372" y="188" width="136" height="88" rx="24" fill="none" stroke="#1e40af" strokeWidth="1.5"/>

          <rect x="382" y="205" width="116" height="2" fill="#22d3ee" opacity="0.9" className="scanLine"/>

          <text x="390" y="225" fontFamily="monospace" fontSize="14" fill="#4ade80" fontWeight="bold">
            {`>SCANNING`}
          </text>

          <rect x="390" y="235" width="8" height="14" rx="1" fill="#4ade80" className="cursor"/>

          <text x="390" y="265" fontFamily="monospace" fontSize="9" fill="#22d3ee">
            Camera Active...
          </text>

          <line x1="394" y1="164" x2="376" y2="118" stroke="#93c5fd" strokeWidth="3" strokeLinecap="round"/>
          <circle cx="374" cy="110" r="12" fill="#d1fae5" stroke="#6ee7b7" strokeWidth="2"/>
          <circle cx="374" cy="110" r="4" fill="#10b981" className="dot-g"/>

          <line x1="486" y1="164" x2="504" y2="118" stroke="#93c5fd" strokeWidth="3" strokeLinecap="round"/>
          <circle cx="506" cy="110" r="12" fill="#fef9c3" stroke="#fde047" strokeWidth="2"/>
          <circle cx="506" cy="110" r="4" fill="#eab308" className="dot-y"/>
        </g>
      </svg>
    </div>
  );
});

// ============================================================
// PAGE
// ============================================================
export default function ScanPage() {
  const router = useRouter();
  const cameraRef = useRef<any>(null);

  // ── STATE & LOGIKA ──
  const [isCapturing, setIsCapturing]       = useState(false);
  const isCapturingRef                       = useRef(false);

  const setIsCapturingSync = useCallback((val: boolean) => {
    isCapturingRef.current = val;
    setIsCapturing(val);
  }, []);

  const [isOpenCVReady, setIsOpenCVReady]   = useState(false);
  const [status, setStatus]                 = useState("Menyiapkan OpenCV");
  const [cameraPermission, setCameraPermission] = useState<
    "checking" | "granted" | "denied"
  >("checking");
  const [previewData, setPreviewData]       = useState<PreviewData | null>(null);


  useEffect(() => { resetCaptureLock(); }, []);

  const requestCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      stream.getTracks().forEach((t) => t.stop());
      setCameraPermission("granted");
      return true;
    } catch {
      setCameraPermission("denied");
      setStatus("Akses Kamera Ditolak");
      return false;
    }
  }, []);

  useEffect(() => { requestCamera(); }, [requestCamera]);

  useEffect(() => {
    console.log("🔄 [ScanPage] previewData changed:", previewData);
  }, [previewData]);

  useEffect(() => {
    const interval = setInterval(() => {
      if ((window as any).cv?.Mat) {
        setIsOpenCVReady(true);
        if (cameraPermission === "granted") setStatus("Kamera Aktif");
        clearInterval(interval);
      }
    }, 500);
    return () => clearInterval(interval);
  }, [cameraPermission]);

  const handleBackendResponse = useCallback(
    async (backendData: any) => {
      console.log("🧠 [handleBackendResponse] input:", backendData);
      if (!backendData || !backendData.success) return;
      if (isCapturingRef.current) return;

      const { id_bukti, file_path, public_url } = backendData;
      if (!file_path || !id_bukti) return;

      const cleanFilePath = (file_path as string).replace(/^\/+/, "");
      const imageUrl = public_url || getPublicImageUrl(cleanFilePath);

      // set preview first so UI switches immediately
      setPreviewData({
        id_bukti: String(id_bukti),
        file_path: cleanFilePath,
        public_url: public_url ?? "",
        imageUrl,
      });



      // stop capturing so the scan button/loop doesn't override UI
      setIsCapturingSync(false);
      setStatus("Foto berhasil diambil");
    },
    [setIsCapturingSync],
  );

  const handleRetake = useCallback(() => {
    setPreviewData(null);
    setIsCapturingSync(false);
    setStatus("Kamera Aktif");
    resetCaptureLock();
  }, [setIsCapturingSync]);

  const handleProceed = useCallback(() => {
    if (!previewData) return;
    const params = new URLSearchParams({
      id_bukti:   previewData.id_bukti,
      file_path:  previewData.file_path,
      public_url: previewData.public_url,
    });
    router.push(`/proses?${params.toString()}`);
  }, [previewData, router]);

  // Tombol Scan berfungsi untuk capture manual.
  // Mengirim blob hasil capture ke backend (/capture-payment), lalu memanggil handleBackendResponse.
  // Tombol ini sengaja dibuat TIDAK melakukan capture manual.
  // Capture dilakukan oleh pipeline auto-capture (Python/backend) melalui onAutoCapture.
  const onCapture = useCallback(() => {}, []);

  const onBack    = useCallback(() => router.back(), [router]);

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="min-h-screen bg-white flex flex-col">

      {/* HEADER */}
      <Header stepper="scan" />

      {/* MAIN */}
      <main className="flex-grow flex items-center justify-center px-5 py-5 pb-25">

        {previewData ? (
          /* ================================================
           * MODE B: PREVIEW
           * ============================================== */
          <div className="w-full max-w-4xl grid lg:grid-cols-2 gap-16 items-center">

            {/* Kolom kiri — mockup smartphone */}
            <div className="flex flex-col items-center gap-5">
              <div className="relative w-44 h-80 bg-gray-900 rounded-[2rem] border-4 border-gray-700 shadow-2xl overflow-hidden">
                <div className="absolute top-2 left-1/2 -translate-x-1/2 w-16 h-3 bg-gray-800 rounded-full z-10" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewData.imageUrl}
                  alt="Preview bukti pembayaran"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex items-center gap-2 bg-green-500 text-white text-xs font-bold px-4 py-2 rounded-full shadow">
                <div className="w-2 h-2 bg-white rounded-full" />
                Gambar berhasil ditangkap
              </div>
            </div>

            {/* Kolom kanan — konfirmasi */}
            <div className="flex flex-col gap-6">
              <div>
                <h2 className="text-2xl font-black text-blue-900 mt-2">
                  Periksa Kualitas Gambar
                </h2>
                <p className="text-sm text-gray-400 mt-1">
                  Pastikan teks nominal dan nama merchant terlihat jelas sebelum melanjutkan.
                </p>
              </div>

              {/* Tombol aksi */}
              <div className="flex gap-3">
                <button
                  onClick={handleRetake}
                  className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl border-2 border-blue-600 text-blue-600 font-bold text-sm hover:bg-blue-50 active:scale-95 transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Coba Foto Ulang
                </button>
                <button
                  onClick={handleProceed}
                  className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-blue-600 text-white font-bold text-sm shadow-md shadow-blue-200 hover:bg-blue-700 active:scale-95 transition-all"
                >
                  Foto Sudah Jelas
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

        ) : (

          /* ================================================
           * MODE A: KAMERA AKTIF
           * ============================================== */
          <div className="w-full max-w-5xl grid lg:grid-cols-[1fr_500px] gap-15 items-center">

            {/* Kolom kiri — camera frame */}
            <div className="flex flex-col justify-center lg:ml-30">
              <div className="relative rounded-3xl overflow-hidden shadow-xl">
                <CameraSection
                  cameraRef={cameraRef}
                  status={status}
                  isCapturing={isCapturing}
                  isOpenCVReady={isOpenCVReady}
                  cameraPermission={cameraPermission}
                  onCapture={onCapture}
                  onAutoCapture={handleBackendResponse}
                  onRetryPermission={requestCamera}
                  onBack={onBack}
                />
              </div>
            </div>

            {/* Kolom kanan — panduan */}
            <div className="flex flex-col justify-center gap-5">
              <div>
                <h2 className="text-2xl font-black text-blue-900 mt-2">
                  Pindai Bukti Pembayaran
                </h2>
              </div>

              {/* Langkah vertikal minimalis */}
              <div className="flex flex-col">
                {[
                  {
                    n: 1,
                    title: "Dekatkan Bukti Struk ke Kamera",
                    desc: "Arahkan kamera ke struk bukti pembayaran",
                  },
                  {
                    n: 2,
                    title: "Pastikan Pencahayaan Cukup dan Stabil",
                    desc: "Atur pencahayaan agar tidak terlalu gelap atau terang",
                  },
                  {
                    n: 3,
                    title: "Jaga Posisi Tetap Stabil",
                    desc: "Tahan agar gambar tidak buram",
                  },
                  {
                    n: 4,
                    title: "Sistem Akan Menangkap Gambar Otomatis",
                    desc: "Tunggu hingga auto-capture berjalan",
                  },
                ].map((step, idx) => (
                  <div key={step.n} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-black shrink-0">
                        {step.n}
                      </div>
                      {idx < 3 && (
                        <div className="w-0.5 h-8 bg-blue-200 mt-1" />
                      )}
                    </div>
                    <div className="pb-5">
                      <p className="text-sm font-bold text-blue-900">{step.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Engine status */}
              <div className="flex items-center justify-between py-3 border-t border-gray-100">
                <span className="text-xs text-gray-400">System Engine</span>
                <div
                  className={`px-2.5 py-1 rounded-full text-[10px] font-black border ${
                    isOpenCVReady
                      ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                      : "bg-yellow-50 text-yellow-600 border-yellow-100 animate-pulse"
                  }`}
                >
                  {isOpenCVReady ? "● ACTIVE" : "○ LOADING"}
                </div>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* MASKOT — fixed pojok kanan bawah */}
      <div className="hidden sm:block fixed bottom-15 right-0 lg:right-0 z-40 pointer-events-none">
        <RobotMascot/>
      </div>

      <footer className="fixed bottom-0 left-0 w-full z-50">
        <Footer />
      </footer>
    </div>
  );
}