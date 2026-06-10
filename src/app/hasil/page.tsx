"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Footer from "../../components/layout/Footer";
import Mascot from "../../components/ui/Mascot";

// ============================================================
// STEPPER
// ============================================================
function PageStepper({ active }: { active: "scan" | "proses" | "hasil" }) {
  const steps = [{ key: "scan", label: "Scan" }, { key: "proses", label: "Proses" }, { key: "hasil", label: "Hasil" }];
  const activeIdx = steps.findIndex((s) => s.key === active);
  return (
    <div className="flex items-center gap-1">
      {steps.map((s, i) => (
        <div key={s.key} className="flex items-center gap-1">
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all ${
            i < activeIdx  ? "bg-blue-600 text-white" :
            i === activeIdx ? "bg-emerald-500 text-white ring-2 ring-emerald-300" :
                              "bg-gray-100 text-gray-400"
          }`}>
            {i < activeIdx && <span>✓</span>}
            {s.label}
          </div>
          {i < steps.length - 1 && <div className={`w-5 h-0.5 ${i < activeIdx ? "bg-blue-600" : "bg-gray-200"}`} />}
        </div>
      ))}
    </div>
  );
}

// ============================================================
// MASKOT — selebrasi
// ============================================================
function RobotHappy() {
  return (
    <div className="relative select-none inline-flex flex-col items-center">
      <span className="absolute -top-4 -left-4 text-yellow-400 text-lg animate-bounce">★</span>
      <span className="absolute -top-2 -right-3 text-yellow-300 text-sm animate-bounce delay-100">✦</span>
      <span className="absolute top-2 -left-6 text-yellow-500 text-xs animate-bounce delay-200">✦</span>
      <div className="w-14 h-12 bg-white rounded-2xl border-2 border-emerald-300 shadow flex items-center justify-center relative">
        <span className="text-lg font-black text-emerald-500 tracking-widest">^ ^</span>
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-1 h-3 bg-emerald-400 rounded-full" />
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-emerald-500 rounded-full" />
      </div>
      <div className="w-10 h-8 bg-emerald-50 border-2 border-emerald-200 rounded-b-xl flex items-center justify-center mt-0.5">
        <div className="w-4 h-1.5 bg-emerald-300 rounded-full" />
      </div>
    </div>
  );
}

// ============================================================
// PAGE
// ============================================================
export default function HasilPage({
  searchParams,
}: {
  searchParams: Promise<{ amount?: string; merchant?: string; status?: string; metode?: string }>;
}) {
  const router = useRouter();

  // ── LOGIKA DIPERTAHANKAN ──
  const { amount, merchant, status, metode } = use(searchParams);

  const nominalRaw       = Number(amount ?? 0);
  const nominalFormatted = nominalRaw > 0 ? `Rp ${nominalRaw.toLocaleString("id-ID")}` : "Rp -";
  const merchantName     = merchant || "HMIT STORE ITS";
  const paymentMethod    = metode   || "QRIS";
  const txStatus         = status   || "Valid";
  const isValid          = txStatus === "Valid";

  const now  = new Date().toLocaleString("id-ID", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const txId = `TRX-${Date.now().toString().slice(-8)}`;

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="min-h-screen bg-white flex flex-col">

      {/* HEADER */}
      <header className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden">
              <Image src="/logo.png" alt="Logo Jujurly" width={15} height={20} className="object-contain" />
            </div>
            <span className="font-bold text-[#2B4C7E] text-base sm:text-lg">Jujurly Canteen System</span>
          </div>
          <PageStepper active="hasil" />
          <span className="text-xs sm:text-sm font-bold text-[#2B4C7E]">
            KWU <span className="text-yellow-400">●</span> HMIT
          </span>
        </div>
        <div className="h-[3px] bg-[#487ADB]" />
      </header>

      {/* MAIN */}
      <main className="flex-grow flex items-center justify-center px-6 py-10 pb-28">
        <div className="w-full max-w-4xl grid lg:grid-cols-2 gap-16 items-center">

          {/* KOLOM KIRI — visual sukses */}
          <div className="flex flex-col items-center gap-5">
            {/* Checkmark circle */}
            <div className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-100">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <p className="text-base font-black text-emerald-600">Pembayaran Berhasil!</p>

            {/* Mockup phone — dibungkus bingkai hijau */}
            <div className="border-2 border-emerald-500 rounded-3xl p-5 shadow-sm shadow-emerald-100">
              <div className="relative w-40 h-72 bg-gray-900 rounded-[2rem] border-4 border-gray-700 shadow-2xl overflow-hidden">
                <div className="absolute top-2 left-1/2 -translate-x-1/2 w-14 h-2.5 bg-gray-800 rounded-full z-10" />
                <div className="w-full h-full bg-gradient-to-b from-emerald-900 to-emerald-700 flex flex-col items-center justify-center gap-2 px-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-400 flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="text-white text-[9px] font-bold text-center">PEMBAYARAN VALID</p>
                  <p className="text-emerald-300 text-[8px] text-center">{nominalFormatted}</p>
                </div>
              </div>
            </div>

            {/* Pill */}
            <div className="flex items-center gap-2 bg-emerald-500 text-white text-xs font-bold px-4 py-2 rounded-full shadow">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
              Bukti pembayaran valid
            </div>
          </div>

          {/* KOLOM KANAN — detail & aksi */}
          <div className="flex flex-col gap-5">
            <div>
              <h2 className="text-2xl font-black text-blue-900">Detail Transaksi</h2>
              <p className="text-sm text-gray-400 mt-1">{now}</p>
            </div>

            {/* Nominal besar */}
            <p className="text-5xl font-black text-emerald-600 leading-none">{nominalFormatted}</p>

            {/* Tabel minimalis */}
            <div className="flex flex-col divide-y divide-gray-100">
              {[
                { label: "ID Transaksi",       value: txId },
                { label: "Merchant",           value: merchantName },
                { label: "Metode Pembayaran",  value: paymentMethod },
                { label: "Status", value: (
                  <span className={`text-xs font-black px-3 py-1 rounded-full ${isValid ? "bg-emerald-100 text-emerald-600" : "bg-yellow-100 text-yellow-600"}`}>
                    {isValid ? "✓ VALID" : txStatus.toUpperCase()}
                  </span>
                )},
              ].map((row, i) => (
                <div key={i} className="flex justify-between items-center py-3">
                  <span className="text-xs text-gray-400">{row.label}</span>
                  {typeof row.value === "string"
                    ? <span className="text-xs font-bold text-blue-900">{row.value}</span>
                    : row.value}
                </div>
              ))}
            </div>

            {/* Tombol aksi */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => router.push("/scan")}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl border-2 border-blue-600 text-blue-600 font-bold text-sm hover:bg-blue-50 active:scale-95 transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Scan lagi
              </button>
              <button
                onClick={() => router.push("/")}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-blue-600 text-white font-bold text-sm shadow-md shadow-blue-200 hover:bg-blue-700 active:scale-95 transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                Selesai
              </button>
            </div>
          </div>

        </div>
      </main>

      {/* MASKOT — fixed pojok kanan bawah */}
      <div className="fixed bottom-20 right-6 z-40">
        <Mascot />
      </div>

      <footer className="fixed bottom-0 left-0 w-full z-50">
        <Footer />
      </footer>
    </div>
  );
}
