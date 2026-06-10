"use client";

import { useRouter } from "next/navigation";
import Script from "next/script";
import Image from "next/image";
import { memo } from "react";
import Footer from "../components/layout/Footer";

// ── Dipisah & di-memo agar tidak re-render setiap render parent ──
const RobotMascot = memo(function RobotMascot() {
  return (
    <div className="select-none inline-flex flex-col items-center">
      <svg
        viewBox="0 0 680 520"
        xmlns="http://www.w3.org/2000/svg"
        /* Ukuran responsif: lebih kecil di mobile, normal di desktop */
        className="w-24 sm:w-32 lg:w-48 h-auto"
        aria-hidden="true"
      >
        <style>{`
          @keyframes float  { 0%,100%{transform:translateY(0)}   50%{transform:translateY(-6px)} }
          @keyframes blink  { 0%,90%,100%{opacity:1}             95%{opacity:0} }
          @keyframes pulse  { 0%,100%{r:4}                       50%{r:5.5} }
          @keyframes wave   { 0%,100%{transform:rotate(-10deg)}  50%{transform:rotate(14deg)} }
          .float  { animation: float 2s ease-in-out infinite; transform-origin: 340px 260px; }
          .cursor { animation: blink 2.4s infinite; }
          .dot-g  { animation: pulse 2s    infinite; }
          .dot-y  { animation: pulse 2.3s  infinite; }
          .wave   { animation: wave  1.4s ease-in-out infinite; transform-origin: 533px 326px; }
        `}</style>

        <g className="float">

          {/* Shadow */}
          <ellipse cx="435" cy="490" rx="80" ry="12" fill="#c8dcee" opacity="0.5"/>

          {/* Body */}
          <rect x="372" y="310" width="136" height="100" rx="36" fill="#dbeafe"/>
          <rect x="372" y="310" width="136" height="100" rx="36" fill="none" stroke="#bfdbfe" strokeWidth="1.5"/>
          <rect x="396" y="330" width="88"  height="58"  rx="14" fill="#bfdbfe"/>

          {/* Chest lights */}
          <circle cx="418" cy="349" r="7" fill="#60a5fa"/><circle cx="418" cy="349" r="4" fill="#93c5fd"/>
          <circle cx="440" cy="349" r="7" fill="#34d399"/><circle cx="440" cy="349" r="4" fill="#6ee7b7"/>
          <circle cx="462" cy="349" r="7" fill="#f472b6"/><circle cx="462" cy="349" r="4" fill="#f9a8d4"/>
          <rect x="405" y="367" width="70" height="8" rx="4" fill="#93c5fd"/>

          {/* Left arm (static) */}
          <rect x="325" y="316" width="38" height="90" rx="19" fill="#bee3f8" stroke="#bfdbfe" strokeWidth="1"/>
          <ellipse cx="345" cy="408" rx="18" ry="14" fill="#93c5fd"/>

          {/* Right arm (waving) */}
          <g className="wave">
            <rect x="470" y="150" width="38" height="90" rx="19" fill="#bee3f8" stroke="#bfdbfe" strokeWidth="1" transform="rotate(60 405 326)"/>
            <ellipse cx="490" cy="150" rx="18" ry="14" fill="#93c5fd" transform="rotate(60 405 326)"/>
          </g>

          {/* Head */}
          <rect x="340" y="160" width="200" height="152" rx="52" fill="#dbeafe"/>
          <rect x="340" y="160" width="200" height="152" rx="52" fill="none" stroke="#bfdbfe" strokeWidth="2"/>

          {/* Ears */}
          <rect x="322" y="210" width="30" height="50" rx="20" fill="#93c5fd" stroke="#bfdbfe" strokeWidth="1"/>
          <rect x="527" y="210" width="30" height="50" rx="20" fill="#93c5fd" stroke="#bfdbfe" strokeWidth="1"/>

          {/* Face screen */}
          <rect x="372" y="188" width="136" height="88" rx="24" fill="#0f172a"/>
          <rect x="372" y="188" width="136" height="88" rx="24" fill="none" stroke="#1e40af" strokeWidth="1.5"/>
          <text x="390" y="225" fontFamily="monospace" fontSize="14" fill="#4ade80" fontWeight="bold">{`> Welcome`}</text>
          <rect x="390" y="235" width="8" height="14" rx="1" fill="#4ade80" className="cursor"/>
          <text x="390" y="262" fontFamily="monospace" fontSize="10" fill="#22d3ee" opacity="0.8">waiting_payment...</text>

          {/* Antena kiri */}
          <line x1="394" y1="164" x2="376" y2="118" stroke="#93c5fd" strokeWidth="3" strokeLinecap="round"/>
          <circle cx="374" cy="110" r="12" fill="#d1fae5" stroke="#6ee7b7" strokeWidth="2"/>
          <circle cx="374" cy="110" r="4" fill="#10b981" className="dot-g"/>

          {/* Antena kanan */}
          <line x1="486" y1="164" x2="504" y2="118" stroke="#93c5fd" strokeWidth="3" strokeLinecap="round"/>
          <circle cx="506" cy="110" r="12" fill="#fef9c3" stroke="#fde047" strokeWidth="2"/>
          <circle cx="506" cy="110" r="4"  fill="#eab308" className="dot-y"/>
        </g>
      </svg>
    </div>
  );
});

export default function Home() {
  const router = useRouter();

  return (
    /*
     * Layout: flex-col agar header–content–footer tersusun vertikal.
     * min-h-screen + flex-grow pada content memastikan footer selalu di bawah.
     */
    <div className="min-h-screen bg-white flex flex-col">
      <Script
        src="/opencv.js"
        strategy="afterInteractive"
        onLoad={() => {
          // OpenCV runtime init hook
          const cv = (window as any).cv;
          if (cv?.onRuntimeInitialized !== undefined) cv.onRuntimeInitialized = () => {};
        }}
      />

      {/* ── HEADER ── */}
      <header className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden">
              <Image src="/logo.png" alt="Logo Jujurly" width={15} height={20} className="object-contain"/>
            </div>
            <span className="font-bold text-[#2B4C7E] text-base sm:text-lg">
              Jujurly Canteen System
            </span>
          </div>
          <span className="text-xs sm:text-sm font-bold text-[#2B4C7E]">
            KWU <span className="text-yellow-400">●</span> HMIT
          </span>
        </div>
        <div className="h-[3px] bg-[#487ADB]" />
      </header>

      {/* ── MAIN CONTENT ── */}
      {/*
       * relative → menjadi containing block untuk blob absolute.
       * overflow-hidden → blob tidak meluber keluar layar di mobile.
       * pb-24 → ruang untuk footer fixed.
       */}
      <main className="relative flex-grow flex items-center justify-center overflow-hidden px-4 sm:px-6 py-10 pb-24">

        {/* Decorative blobs — posisi % agar responsif di semua ukuran layar */}
        <div className="absolute w-48 h-48 sm:w-64 sm:h-64 bg-[#E9F3FD] rounded-full -top-10 left-[10%] -z-10 pointer-events-none" />
        <div className="absolute w-32 h-32 sm:w-40 sm:h-40 bg-[#B5DAFF] rounded-full bottom-10 right-[5%]  -z-10 pointer-events-none" />
        <div className="absolute w-48 h-48 sm:w-60 sm:h-60 bg-[#CDE1F8] rounded-full -bottom-8 left-[5%]  -z-10 pointer-events-none" />

        <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">

          {/* ── KOLOM KIRI: QRIS Visual ── */}
          {/*
           * Di mobile & tablet portrait → gambar di tengah, lebih kecil.
           * Di desktop (lg) → kolom kiri penuh.
           */}
          <div className="flex justify-center order-1 lg:order-none">
            <div className="z-10 bg-white p-2 rounded-3xl shadow-2xl border border-gray-100">
              <Image
                src="/Qris.PNG"
                alt="QRIS Payment"
                width={260}
                height={340}
                /*
                 * Responsif: lebih kecil di mobile agar tidak memenuhi layar,
                 * kembali ke ukuran penuh di tablet ke atas.
                 */
                className="rounded-2xl w-40 sm:w-52 lg:w-[260px] h-auto"
                priority
              />
            </div>
          </div>

          {/* ── KOLOM KANAN: Teks & Aksi ── */}
          <div className="flex flex-col gap-5 order-2 lg:order-none text-center lg:text-left items-center lg:items-start">

            {/* Judul & deskripsi */}
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-blue-900 leading-tight">
                Silahkan Melakukan<br />
                <span className="text-[#487ADB]">Pembayaran</span>
              </h1>
              <p className="text-gray-500 mt-3 text-sm sm:text-base leading-relaxed max-w-sm mx-auto lg:mx-0">
                Scan QRIS menggunakan aplikasi e-wallet, lakukan pembayaran,
                lalu tekan tombol untuk mengonfirmasi transaksi Anda.
              </p>
            </div>

            {/* CTA Button */}
            <button
              onClick={() => router.push("/scan")}
              className="w-full sm:w-auto bg-gradient-to-r from-[#5A8DEE] to-[#487ADB] text-white px-10 py-4 rounded-2xl shadow-lg shadow-blue-200 hover:shadow-[#487ADB]/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 font-semibold text-base sm:text-lg">
              Mulai Scan Bukti
            </button>
          </div>

        </div>
      </main>

      {/*
       * Maskot: disembunyikan di layar sangat kecil (< sm) agar tidak
       * mengganggu konten. Di sm ke atas tampil di pojok kanan bawah,
       * dengan bottom disesuaikan tinggi footer fixed (≈56px → bottom-16).
       */}
      <div className="hidden sm:block fixed bottom-16 right-4 lg:right-6 z-40 pointer-events-none">
        <RobotMascot />
      </div>

      {/* ── FOOTER fixed ── */}
      <footer className="w-full z-50">
        <Footer />
      </footer>
    </div>
  );
}