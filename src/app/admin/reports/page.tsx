"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../scan/supabase-logic";
import {
  HiHome,
  HiUser,
  HiArrowDownTray,
} from "react-icons/hi2";
import NotifBell from "../../../components/ui/NotifBell";

// ─── Sidebar ───────────────────────────────────────────────────────────────

type NavItem = { label: string; active: boolean; href: string; imgSrc?: string };

const navItems: NavItem[] = [
  { label: "Dashboard",   active: false, href: "/admin/dashboard" },
  { label: "Stock",       active: false, href: "/admin/stock",       imgSrc: "/stock.png" },
  { label: "Transaction", active: false, href: "/admin/transaction", imgSrc: "/transaction.png" },
  { label: "Reports",     active: true,  href: "/admin/reports",     imgSrc: "/reports.png" },
  { label: "Users",       active: false, href: "/admin/users",       imgSrc: "/users.png" },
  { label: "Settings",    active: false, href: "/admin/settings",    imgSrc: "/settings.png" },
];

function Sidebar({ onLogout }: { onLogout: () => void }) {
  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-[#4A81D4] flex flex-col z-50">
      <div className="flex items-center gap-3 px-6 py-6">
        <div className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden">
          <img src="/logo.png" alt="Logo Jujurly" width={15} height={20} className="object-contain" />
        </div>
        <div>
          <p className="text-white font-bold text-base leading-tight">JUJURLY</p>
          <p className="text-white/60 text-xs">Canteen System</p>
        </div>
      </div>
      <nav className="flex-1 px-4 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
              item.active ? "bg-blue-100 text-[#4A81D4]" : "text-white hover:bg-white/10"
            }`}
          >
            {item.imgSrc ? (
              <img
                src={item.imgSrc}
                alt={item.label}
                className="w-5 h-5 object-contain flex-shrink-0 transition-all duration-200 opacity-100"
                style={item.active ? { filter: "invert(36%) sepia(84%) saturate(1900%) hue-rotate(215deg) brightness(95%) contrast(93%)" } : {}}
              />
            ) : (
              <HiHome className={`text-lg flex-shrink-0 ${item.active ? "text-[#4A81D4]" : "text-white"}`} />
            )}
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="px-4 pb-6 mt-auto border-t border-blue-400/30 pt-4">
        <button
          onClick={onLogout}
          className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl transition-all duration-200 text-red-100 hover:bg-red-500 hover:text-white font-medium text-sm"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1" />
          </svg>
          Logout
        </button>
      </div>
    </aside>
  );
}

// ─── Types ─────────────────────────────────────────────────────────────────

interface ReportRow {
  id_transaksi: number;
  waktu_transaksi: string;
  nominal: number;
  metode_pembayaran: string;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

const fmt = (n: number) => "Rp " + n.toLocaleString("id-ID");

const fmtDate = (s: string) =>
  new Date(s).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

/** Returns YYYY-MM-DD string for date inputs */
const toInputDate = (d: Date) => d.toISOString().slice(0, 10);

/** First day of current month */
const firstOfMonth = () => {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
};

// ─── Export CSV ────────────────────────────────────────────────────────────

function exportCsv(rows: ReportRow[]) {
  const header = ["ID Transaksi", "Waktu", "Metode Pembayaran", "Nominal (Rp)"];
  const lines = rows.map((r) =>
    [
      r.id_transaksi,
      fmtDate(r.waktu_transaksi),
      r.metode_pembayaran,
      r.nominal,
    ].join(",")
  );
  const csv = [header.join(","), ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Laporan_Jujurly_${toInputDate(new Date())}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Summary Card ──────────────────────────────────────────────────────────

function SummaryCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
        {label}
      </p>
      <p className="text-2xl font-bold text-slate-800 leading-tight">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const router = useRouter();

  const handleLogout = () => {
    if (window.confirm("Apakah Anda yakin ingin keluar?")) {
      localStorage.removeItem("admin_session");
      router.push("/admin/login");
    }
  };

  const today = new Date();
  const [startDate, setStartDate] = useState(toInputDate(firstOfMonth()));
  const [endDate, setEndDate] = useState(toInputDate(today));
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [adminName, setAdminName] = useState("Admin");

  useEffect(() => {
    const session = localStorage.getItem("admin_session");
    if (session) setAdminName(session);
  }, []);

  const fetchReport = useCallback(async (start: string, end: string) => {
    setIsLoading(true);
    try {
      // endDate input is YYYY-MM-DD — extend to end of that day
      const endOfDay = `${end}T23:59:59`;

      const { data, error } = await supabase
        .from("transaksi")
        .select("id_transaksi, waktu_transaksi, nominal, metode_pembayaran")
        .eq("status_validasi", "Valid")
        .gte("waktu_transaksi", start)
        .lte("waktu_transaksi", endOfDay)
        .order("waktu_transaksi", { ascending: false });

      if (error) throw error;
      setRows((data as ReportRow[]) ?? []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal memuat laporan.";
      alert(`Error: ${msg}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch on mount with default range (this month)
  useEffect(() => {
    fetchReport(startDate, endDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Summary metrics
  const totalPendapatan = rows.reduce((s, r) => s + r.nominal, 0);
  const totalTransaksi = rows.length;
  const rata2 = totalTransaksi > 0 ? Math.round(totalPendapatan / totalTransaksi) : 0;

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">
      <Sidebar onLogout={handleLogout} />

      <div className="ml-64 flex-1 overflow-y-auto">
        <div className="p-8 space-y-6">

          {/* Top Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Reports &amp; Analytics</h1>
              <p className="text-slate-500 text-sm mt-0.5">
                Generate and download canteen financial reports
              </p>
            </div>
            <div className="flex items-center gap-4">
              <NotifBell />
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center">
                  <HiUser className="text-slate-500 text-lg" />
                </div>
                <div className="text-sm leading-tight">
                  <p className="font-semibold text-slate-800">{adminName}</p>
                  <p className="text-slate-500 text-xs">Staff KWU</p>
                </div>
              </div>
            </div>
          </div>
          {/* Blue divider */}
          <div className="h-[3px] bg-[#487ADB] w-full shadow-sm rounded-none" />

          {/* Action Bar */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-500 font-medium whitespace-nowrap">
                Dari
              </label>
              <input
                type="date"
                value={startDate}
                max={endDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#4A81D4]/30 focus:border-[#4A81D4] transition"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-500 font-medium whitespace-nowrap">
                Sampai
              </label>
              <input
                type="date"
                value={endDate}
                min={startDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#4A81D4]/30 focus:border-[#4A81D4] transition"
              />
            </div>
            <button
              onClick={() => fetchReport(startDate, endDate)}
              className="px-4 py-2 rounded-lg border border-[#4A81D4] text-[#4A81D4] text-sm font-semibold hover:bg-blue-50 transition-colors"
            >
              Terapkan Filter
            </button>
            <button
              onClick={() => exportCsv(rows)}
              disabled={rows.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#4A81D4] hover:bg-[#3a6fc0] text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <HiArrowDownTray className="text-base" />
              Export to CSV
            </button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-5">
            <SummaryCard
              label="Total Pendapatan (Valid)"
              value={fmt(totalPendapatan)}
              sub={`Periode ${startDate} — ${endDate}`}
            />
            <SummaryCard
              label="Total Transaksi Sukses"
              value={totalTransaksi.toString()}
              sub="Hanya status Valid"
            />
            <SummaryCard
              label="Rata-rata Transaksi"
              value={fmt(rata2)}
              sub="Per transaksi valid"
            />
          </div>

          {/* Table Card */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {["Waktu", "ID Transaksi", "Metode Pembayaran", "Nominal"].map((h) => (
                    <th
                      key={h}
                      className="text-left px-5 py-3 text-slate-500 font-semibold text-xs uppercase tracking-wide"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-10 text-center text-slate-400 text-sm">
                      Memuat laporan...
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-10 text-center text-slate-400 text-sm">
                      Tidak ada transaksi valid pada rentang tanggal ini.
                    </td>
                  </tr>
                ) : (
                  rows.map((row, i) => (
                    <tr
                      key={row.id_transaksi}
                      className={`border-b border-slate-50 ${
                        i % 2 === 0 ? "bg-white" : "bg-slate-50/40"
                      }`}
                    >
                      <td className="px-5 py-3.5 text-slate-500 text-xs whitespace-nowrap">
                        {fmtDate(row.waktu_transaksi)}
                      </td>
                      <td className="px-5 py-3.5 text-slate-700 font-mono text-xs">
                        #{row.id_transaksi}
                      </td>
                      <td className="px-5 py-3.5 text-slate-600">
                        {row.metode_pembayaran}
                      </td>
                      <td className="px-5 py-3.5 text-slate-800 font-semibold">
                        {fmt(row.nominal)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {!isLoading && rows.length > 0 && (
              <div className="px-5 py-3 border-t border-slate-100 flex justify-between text-xs text-slate-400">
                <span>{rows.length} transaksi ditemukan</span>
                <span>Total: {fmt(totalPendapatan)}</span>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
