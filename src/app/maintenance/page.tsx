import Link from "next/link";
import { HiWrenchScrewdriver, HiArrowLeft } from "react-icons/hi2";

export default function MaintenancePage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center px-4">
      <div className="w-full max-w-lg text-center space-y-8">

        {/* Icon */}
        <div className="flex justify-center">
          <div className="w-20 h-20 bg-blue-100 dark:bg-blue-950/40 rounded-2xl flex items-center justify-center">
            <HiWrenchScrewdriver className="text-[#4A81D4] text-4xl" />
          </div>
        </div>

        {/* Heading */}
        <div className="space-y-3">
          <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">
            Portal Admin Sedang Dalam Pemeliharaan
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-base leading-relaxed">
            Tim teknisi kami sedang melakukan peningkatan sistem untuk memberikan
            pengalaman yang lebih baik. Portal admin akan kembali aktif dalam waktu dekat.
          </p>
        </div>

        {/* Divider */}
        <div className="h-px bg-slate-200 dark:bg-slate-700" />

        {/* Info kantin */}
        <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl px-6 py-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            <span className="font-semibold text-[#4A81D4]">Untuk pelanggan kantin:</span>{" "}
            Layanan pembayaran QRIS dan pemindaian struk tetap berjalan normal.
            Anda masih dapat melakukan transaksi melalui halaman utama kantin.
          </p>
        </div>

        {/* CTA */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 bg-[#4A81D4] hover:bg-[#3a6fc0] text-white font-semibold text-sm px-6 py-3 rounded-xl transition-colors shadow-sm"
        >
          <HiArrowLeft className="text-base" />
          Kembali ke Halaman Utama Kantin
        </Link>

        {/* Footer note */}
        <p className="text-xs text-slate-400 dark:text-slate-500">
          Jujurly Canteen System &mdash; HMIT KWU
        </p>

      </div>
    </div>
  );
}
