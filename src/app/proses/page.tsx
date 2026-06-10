"use client";

import { use, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import Footer from "../../components/layout/Footer";
import { TbLineScan } from "react-icons/tb";
import { VscServerProcess } from "react-icons/vsc";
import { AiOutlineFileDone } from "react-icons/ai";
import {
  getPublicImageUrl,
  saveOCRResult,
  updateBuktiStatus,
  updateTransactionFromOCR,
  deleteBuktiFile,
} from "../scan/supabase-logic";
import { performOCR } from "../scan/ocr-logic";

// ============================================================
// TYPES
// ============================================================
type Step = 1 | 2 | 3;
interface StepInfo { label: string; description: string; }

const STEPS: Record<Step, StepInfo> = {
  1: { label: "Mendeteksi layar ponsel", description: "OpenCV memproses gambar..." },
  2: { label: "Membaca teks OCR",        description: "Tesseract.js mengekstrak teks..." },
  3: { label: "Memvalidasi transaksi",   description: "Menyimpan data ke database..." },
};

// ============================================================
// STEPPER
// ============================================================
function PageStepper({
  active,
}: {
  active: "scan" | "proses" | "hasil";
}) {
  const steps = [
    { key: "scan",label: "Scan", icon: TbLineScan},
    { key: "proses",label: "Proses",icon: VscServerProcess },
    { key: "hasil",label: "Hasil",icon: AiOutlineFileDone },
  ];

  const activeIdx = steps.findIndex((s) => s.key === active);

  return (
    <div className="flex items-center justify-center">
      {steps.map((step, i) => {
        const Icon = step.icon;

        const isActive = i === activeIdx;
        const isCompleted = i < activeIdx;

        return (
          <div
            key={step.key}
            className="flex items-center"
          >
            <div className="flex-col items-center">
              <div
                className={`
                  w-10 h-10 rounded-full
                  flex items-center justify-center
                  border-2 transition-all
                  ${
                    isActive
                      ? "bg-blue-100 border-blue-500 text-blue-600"
                      : isCompleted
                      ? "bg-blue-500 border-blue-500 text-white"
                      : "bg-gray-100 border-gray-300 text-gray-400"
                  }
                `}
              >
                <Icon size={18} />
              </div>

              <span className={`text-sm font-semibold ${ isActive || isCompleted ? "text-blue-600" : "text-gray-400" } `}>
                {step.label}
              </span>
            </div>

            {i < steps.length - 1 && (
              <div className={`w-24 h-[2px] mb-6 ${i < activeIdx ? "bg-blue-500" : "bg-gray-300" } `} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ============================================================
// MASKOT — fixed pojok kanan bawah
// ============================================================
function RobotFocus() {
  return (
    <div className="select-none inline-flex flex-col items-center">
      <div className="w-14 h-12 bg-white rounded-2xl border-2 border-blue-200 shadow flex items-center justify-center relative">
        <span className="text-lg font-black text-blue-600 tracking-widest">&gt; &lt;</span>
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-1 h-3 bg-blue-400 rounded-full" />
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-blue-500 rounded-full" />
      </div>
      <div className="w-10 h-8 bg-blue-50 border-2 border-blue-200 rounded-b-xl flex items-center justify-center mt-0.5">
        <div className="w-4 h-1.5 bg-blue-300 rounded-full" />
      </div>
    </div>
  );
}

// ============================================================
// PAGE
// ============================================================
export default function ProsesPage({
  searchParams,
}: {
  searchParams: Promise<{ id_bukti?: string; file_path?: string; public_url?: string }>;
}) {
  const router = useRouter();
  const { id_bukti, file_path, public_url } = use(searchParams);

  // ── STATE LOGIKA — TIDAK DIUBAH ──
  const [isCVReady, setIsCVReady]     = useState(false);
  const [cvTimeout, setCvTimeout]     = useState(false);
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [isDone, setIsDone]           = useState(false);
  const [errorMsg, setErrorMsg]       = useState<string | null>(null);
  const [resultLabel, setResultLabel] = useState<string>("");

  const checkAndSetCVReady = useCallback(() => {
    const poll = setInterval(() => {
      if ((window as any).cv?.Mat) { clearInterval(poll); setIsCVReady(true); }
    }, 150);
    setTimeout(() => clearInterval(poll), 10_000);
  }, []);

  useEffect(() => {
    if ((window as any).cv?.Mat) { setIsCVReady(true); return; }
    checkAndSetCVReady();
  }, []); // eslint-disable-line

  useEffect(() => {
    const t = setTimeout(() => { if (!isCVReady) setCvTimeout(true); }, 5000);
    return () => clearTimeout(t);
  }, [isCVReady]);

  useEffect(() => {
    if (!isCVReady) return;
    if (!id_bukti || !file_path) { setErrorMsg("Parameter tidak lengkap. Kembali ke halaman scan."); return; }
    runPipeline();
  }, [isCVReady]); // eslint-disable-line

  const runPipeline = async () => {
    try {
      setCurrentStep(1);
      const cleanFilePath = file_path!.replace(/^\/+/, "");
      const imageUrl = public_url || getPublicImageUrl(cleanFilePath);

      let response = await fetch(imageUrl, { cache: "no-store" });
      if (response.status === 400) {
        await new Promise((r) => setTimeout(r, 1000));
        response = await fetch(imageUrl, { cache: "no-store" });
      }
      if (!response.ok) throw new Error(`Gagal download gambar (${response.status})`);
      const blob = await response.blob();

      setCurrentStep(2);
      const ocrResult = await performOCR(blob);
      console.log("🧠 OCR Result:", { amount: ocrResult.amount, merchantName: ocrResult.merchantName, isSuccess: ocrResult.isSuccess });

      setCurrentStep(3);
      if (ocrResult.amount) {
        await saveOCRResult(id_bukti!, ocrResult.rawText ?? "", ocrResult.amount, ocrResult.merchantName ?? null);
        await updateTransactionFromOCR(id_bukti!, ocrResult.amount, ocrResult.merchantName ?? null);
        const isValid = ocrResult.merchantName === "HMIT STORE ITS";
        setResultLabel(isValid
          ? `✅ Valid — Rp${ocrResult.amount.toLocaleString("id-ID")}`
          : `⏳ Pending — Rp${ocrResult.amount.toLocaleString("id-ID")} (Merchant tidak dikenali)`
        );
      } else {
        await saveOCRResult(id_bukti!, ocrResult.rawText ?? "", null, null);
        await updateBuktiStatus(id_bukti!, "invalid");
        await deleteBuktiFile(id_bukti!);
        setResultLabel("⚠️ Nominal tidak terdeteksi");
      }

      setIsDone(true);

      if (ocrResult.amount && ocrResult.merchantName === "HMIT STORE ITS") {
        const params = new URLSearchParams({
          amount: String(ocrResult.amount),
          merchant: ocrResult.merchantName,
          status: "Valid",
          metode: "QRIS",
        });
        setTimeout(() => router.push(`/hasil?${params.toString()}`), 2000);
      }
    } catch (err: any) {
      console.error("❌ [Proses] Pipeline error:", err);
      setErrorMsg(err.message || "Terjadi kesalahan saat memproses.");
    }
  };

  const previewUrl = public_url || (file_path ? getPublicImageUrl(file_path.replace(/^\/+/, "")) : "");

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Script src="/opencv.js" strategy="afterInteractive" onLoad={checkAndSetCVReady} />

      {/* HEADER */}
      <header className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <span className="font-bold text-blue-900 text-sm">Jujurly Canteen System</span>
          </div>
          <PageStepper active="proses" />
          <span className="text-xs font-semibold text-blue-400">KWU • HMIT</span>
        </div>
        <div className="h-[3px] bg-blue-600" />
      </header>

      {/* MAIN */}
      <main className="flex-grow flex items-center justify-center px-6 py-10 pb-28">
        <div className="w-full max-w-4xl grid lg:grid-cols-2 gap-16 items-center">

          {/* KOLOM KIRI — mockup smartphone */}
          <div className="flex flex-col items-center gap-5">
            <div className="relative w-44 h-80 bg-gray-900 rounded-[2rem] border-4 border-gray-700 shadow-2xl overflow-hidden">
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-16 h-3 bg-gray-800 rounded-full z-10" />
              {previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewUrl} alt="Preview struk" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                  <svg className="w-10 h-10 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
            </div>

            {/* Pill status */}
            <div className="flex items-center gap-2 bg-blue-600 text-white text-xs font-bold px-4 py-2 rounded-full shadow">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
              Gambar berhasil ditangkap
            </div>
          </div>

          {/* KOLOM KANAN — proses & timeline */}
          <div className="flex flex-col gap-6">
            <div>
              <span className="inline-flex items-center gap-1.5 bg-blue-100 text-blue-600 text-xs font-bold px-3 py-1.5 rounded-full">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                {isDone ? "Selesai diproses" : "Sedang memproses..."}
              </span>
              <h1 className="text-2xl font-black text-blue-900 mt-2">Memproses Pembayaran</h1>
              <p className="text-sm text-gray-400 mt-1">
                Sistem AI menganalisis struk dan memverifikasi transaksi Anda.
              </p>
            </div>

            {/* Vertical Progress Timeline */}
            <div className="flex flex-col">
              {(Object.entries(STEPS) as [string, StepInfo][]).map(([key, step], idx) => {
                const stepNum   = Number(key) as Step;
                const isActive  = currentStep === stepNum && !isDone && !errorMsg;
                const isDoneStep = isDone ? true : currentStep > stepNum;
                const isPending = !isDone && currentStep < stepNum;
                const isLast    = idx === Object.keys(STEPS).length - 1;

                return (
                  <div key={key} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 transition-all ${
                        isDoneStep ? "bg-emerald-500 text-white" :
                        isActive   ? "bg-blue-600 text-white" :
                                     "bg-gray-100 text-gray-400"
                      }`}>
                        {isDoneStep ? (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : isActive ? (
                          <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : stepNum}
                      </div>
                      {!isLast && <div className={`w-0.5 h-8 mt-1 ${isDoneStep ? "bg-emerald-300" : "bg-gray-200"}`} />}
                    </div>
                    <div className="pb-6 flex flex-col justify-center">
                      <span className={`text-sm font-semibold ${
                        isDoneStep ? "text-emerald-600" : isActive ? "text-blue-700" : "text-gray-400"
                      }`}>
                        {step.label}
                      </span>
                      {isActive   && <span className="text-xs text-gray-400 mt-0.5">{step.description}</span>}
                      {isDoneStep && <span className="text-xs text-emerald-500 mt-0.5">Selesai</span>}
                      {isPending  && <span className="text-xs text-gray-300 mt-0.5">Menunggu...</span>}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Result */}
            {isDone && !errorMsg && (
              <div className={`rounded-2xl p-4 border ${resultLabel.startsWith("✅") ? "bg-emerald-50 border-emerald-100" : "bg-yellow-50 border-yellow-100"}`}>
                <p className={`text-sm font-semibold ${resultLabel.startsWith("✅") ? "text-emerald-700" : "text-yellow-700"}`}>
                  {resultLabel}
                </p>
                {resultLabel.startsWith("✅") && <p className="text-xs text-emerald-500 mt-1">Mengalihkan ke halaman hasil...</p>}
                {!resultLabel.startsWith("✅") && (
                  <button onClick={() => router.push("/scan")} className="mt-3 px-5 py-2 rounded-full bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors">
                    Scan Ulang
                  </button>
                )}
              </div>
            )}

            {errorMsg && (
              <div className="bg-red-50 border border-red-100 rounded-2xl p-4">
                <p className="text-sm font-semibold text-red-600">{errorMsg}</p>
                <button onClick={() => router.push("/scan")} className="mt-3 px-5 py-2 rounded-full bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors">
                  Kembali ke Scan
                </button>
              </div>
            )}

            {!isDone && !errorMsg && cvTimeout && (
              <div className="bg-yellow-50 border border-yellow-100 rounded-2xl p-4">
                <p className="text-sm font-semibold text-yellow-700">⏱️ AI Engine belum merespons</p>
                <p className="text-xs text-yellow-500 mt-1">OpenCV.js gagal dimuat dalam 5 detik</p>
                <button onClick={() => window.location.reload()} className="mt-3 px-5 py-2 rounded-full bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors">
                  Coba Lagi
                </button>
              </div>
            )}

            {!isDone && !errorMsg && !cvTimeout && (
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                {!isCVReady ? "Memuat AI Engine..." : "Memproses..."}
              </div>
            )}
          </div>

        </div>
      </main>

      {/* MASKOT — fixed pojok kanan bawah */}
      <div className="fixed bottom-20 right-6 z-40">
        <RobotFocus />
      </div>

      <footer className="fixed bottom-0 left-0 w-full z-50">
        <Footer />
      </footer>
    </div>
  );
}
