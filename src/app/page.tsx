"use client";

import { useRouter } from "next/navigation";
import Script from "next/script";
import Image from "next/image";
import Footer from "../components/layout/Footer";
import Mascot from "../components/ui/Mascot";

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
        <Mascot />
      </div>

      {/* ── FOOTER fixed ── */}
      <footer className="w-full z-50">
        <Footer />
      </footer>
    </div>
  );
}
