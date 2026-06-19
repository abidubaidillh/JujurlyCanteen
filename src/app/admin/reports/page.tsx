"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../scan/supabase-logic";
import { HiArrowDownTray } from "react-icons/hi2";
import AdminHeader from "../../../components/admin/AdminHeader";

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
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
const toInputDate = (d: Date) => d.toISOString().slice(0, 10);
const firstOfMonth = () => {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
};

// ─── Export CSV ────────────────────────────────────────────────────────────

function exportCsv(rows: ReportRow[]) {
  const header = ["ID Transaksi", "Waktu", "Metode Pembayaran", "Nominal (Rp)"];
  const lines = rows.map((r) => [r.id_transaksi, fmtDate(r.waktu_transaksi), r.metode_pembayaran, r.nominal].join(","));
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

function SummaryCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">{label}</p>
      <p className="text-2xl font-bold text-slate-800 leading-tight">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const today = new Date();
  const [startDate, setStartDate] = useState(toInputDate(firstOfMonth()));
  const [endDate, setEndDate] = useState(toInputDate(today));
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchReport = useCallback(async (start: string, end: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("transaksi")
        .select("id_transaksi, waktu_transaksi, nominal, metode_pembayaran")
        .eq("status_validasi", "Valid")
        .gte("waktu_transaksi", start)
        .lte("waktu_transaksi", `${end}T23:59:59`)
        .order("waktu_transaksi", { ascending: false });
      if (error) throw error;
      setRows((data as ReportRow[]) ?? []);
    } catch (err: unknown) {
      console.error(err instanceof Error ? err.message : "Gagal memuat laporan.");
    } finally { setIsLoading(false); }
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchReport(startDate, endDate); }, []);

  const totalPendapatan = rows.reduce((s, r) => s + r.nominal, 0);
  const totalTransaksi = rows.length;
  const rata2 = totalTransaksi > 0 ? Math.round(totalPendapatan / totalTransaksi) : 0;

  return (
    <div className="p-8 space-y-6">
      <AdminHeader title="Reports & Analytics" subtitle="Generate and download canteen financial reports" />

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500 font-medium whitespace-nowrap">Dari</label>
          <input type="date" value={startDate} max={endDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#4A81D4]/30 focus:border-[#4A81D4] transition" />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500 font-medium whitespace-nowrap">Sampai</label>
          <input type="date" value={endDate} min={startDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#4A81D4]/30 focus:border-[#4A81D4] transition" />
        </div>
        <button onClick={() => fetchReport(startDate, endDate)}
          className="px-4 py-2 rounded-lg border border-[#4A81D4] text-[#4A81D4] text-sm font-semibold hover:bg-blue-50 transition-colors">
          Terapkan Filter
        </button>
        <button onClick={() => exportCsv(rows)} disabled={rows.length === 0}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#4A81D4] hover:bg-[#3a6fc0] text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
          <HiArrowDownTray className="text-base" /> Export to CSV
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-5">
        <SummaryCard label="Total Pendapatan (Valid)" value={fmt(totalPendapatan)} sub={`Periode ${startDate} — ${endDate}`} />
        <SummaryCard label="Total Transaksi Sukses" value={totalTransaksi.toString()} sub="Hanya status Valid" />
        <SummaryCard label="Rata-rata Transaksi" value={fmt(rata2)} sub="Per transaksi valid" />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              {["Waktu", "ID Transaksi", "Metode Pembayaran", "Nominal"].map((h) => (
                <th key={h} className="text-left px-5 py-3 text-slate-500 font-semibold text-xs uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={4} className="px-5 py-10 text-center text-slate-400 text-sm">Memuat laporan...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={4} className="px-5 py-10 text-center text-slate-400 text-sm">Tidak ada transaksi valid pada rentang tanggal ini.</td></tr>
            ) : rows.map((row, i) => (
              <tr key={row.id_transaksi} className={`border-b border-slate-50 ${i % 2 === 0 ? "bg-white" : "bg-slate-50/40"}`}>
                <td className="px-5 py-3.5 text-slate-500 text-xs whitespace-nowrap">{fmtDate(row.waktu_transaksi)}</td>
                <td className="px-5 py-3.5 text-slate-700 font-mono text-xs">#{row.id_transaksi}</td>
                <td className="px-5 py-3.5 text-slate-600">{row.metode_pembayaran}</td>
                <td className="px-5 py-3.5 text-slate-800 font-semibold">{fmt(row.nominal)}</td>
              </tr>
            ))}
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
  );
}
