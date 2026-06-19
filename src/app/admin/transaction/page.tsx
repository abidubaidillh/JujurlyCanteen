"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase, getPublicImageUrl } from "../../scan/supabase-logic";
import {
  HiMagnifyingGlass,
  HiXMark,
  HiEye,
  HiPhoto,
  HiTrash,
} from "react-icons/hi2";
import AdminHeader from "../../../components/admin/AdminHeader";

// ─── Types ─────────────────────────────────────────────────────────────────

type StatusValidasi = "Valid" | "Pending" | "Invalid";

interface Transaksi {
  id_transaksi: number;
  waktu_transaksi: string;
  nominal: number;
  metode_pembayaran: string;
  status_validasi: StatusValidasi;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

const fmt = (n: number) => "Rp " + n.toLocaleString("id-ID");
const fmtDate = (s: string) =>
  new Date(s).toLocaleString("id-ID", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

// ─── Status Badge ──────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    Valid: "bg-emerald-100 text-emerald-700",
    Pending: "bg-yellow-100 text-yellow-700",
    Invalid: "bg-red-100 text-red-700",
  };
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${map[status] ?? "bg-slate-100 text-slate-500"}`}>
      {status}
    </span>
  );
}

// ─── Detail Modal ──────────────────────────────────────────────────────────

function DetailModal({ tx, onClose }: { tx: Transaksi; onClose: () => void }) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loadingImg, setLoadingImg] = useState(true);

  useEffect(() => {
    (async () => {
      setLoadingImg(true);
      try {
        const { data, error } = await supabase
          .from("bukti_pembayaran")
          .select("file_gambar")
          .eq("id_transaksi", tx.id_transaksi)
          .maybeSingle();
        if (error) throw error;
        setImageUrl(data?.file_gambar ? getPublicImageUrl(data.file_gambar) : null);
      } catch { setImageUrl(null); }
      finally { setLoadingImg(false); }
    })();
  }, [tx.id_transaksi]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <p className="font-bold text-slate-800">Detail Transaksi</p>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors">
            <HiXMark className="text-lg" />
          </button>
        </div>
        <div className="px-6 py-4 space-y-3">
          {[
            { label: "ID Transaksi", value: `#${tx.id_transaksi}` },
            { label: "Waktu", value: fmtDate(tx.waktu_transaksi) },
            { label: "Nominal", value: fmt(tx.nominal) },
            { label: "Metode", value: tx.metode_pembayaran },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between text-sm">
              <span className="text-slate-500">{label}</span>
              <span className="text-slate-800 font-medium">{value}</span>
            </div>
          ))}
          <div className="flex justify-between text-sm items-center">
            <span className="text-slate-500">Status</span>
            <StatusBadge status={tx.status_validasi} />
          </div>
        </div>
        <div className="px-6 pb-6">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Bukti Pembayaran</p>
          <div className="rounded-xl border border-slate-100 bg-slate-50 overflow-hidden min-h-[160px] flex items-center justify-center">
            {loadingImg ? (
              <p className="text-slate-400 text-sm">Memuat gambar...</p>
            ) : imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl} alt="Bukti pembayaran" className="w-full max-h-72 object-contain" />
            ) : (
              <div className="flex flex-col items-center gap-2 py-8 text-slate-400">
                <HiPhoto className="text-3xl" />
                <p className="text-sm">Bukti tidak ditemukan</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function TransactionPage() {
  const [items, setItems] = useState<Transaksi[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Semua Status");
  const [selected, setSelected] = useState<Transaksi | null>(null);
  const [deleteRange, setDeleteRange] = useState("");

  const fetchTransaksi = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("transaksi")
        .select("id_transaksi, waktu_transaksi, nominal, metode_pembayaran, status_validasi")
        .order("waktu_transaksi", { ascending: false });
      if (error) throw error;
      setItems((data as Transaksi[]) ?? []);
    } catch (err: unknown) {
      console.error(err instanceof Error ? err.message : "Gagal memuat data.");
    } finally { setIsLoading(false); }
  }, []);

  useEffect(() => { fetchTransaksi(); }, [fetchTransaksi]);

  const handleDeleteHistory = async () => {
    if (!deleteRange) { alert("Silakan pilih rentang waktu terlebih dahulu."); return; }
    if (!window.confirm("Apakah Anda yakin ingin menghapus histori transaksi? Aksi ini tidak dapat dibatalkan!")) return;
    try {
      let query = supabase.from("transaksi").delete();
      if (deleteRange === "all") {
        query = query.gte("waktu_transaksi", "1970-01-01T00:00:00Z");
      } else {
        const threshold = new Date();
        if (deleteRange === "1m") threshold.setMonth(threshold.getMonth() - 1);
        else if (deleteRange === "3m") threshold.setMonth(threshold.getMonth() - 3);
        else if (deleteRange === "6m") threshold.setMonth(threshold.getMonth() - 6);
        query = query.lte("waktu_transaksi", threshold.toISOString());
      }
      const { error } = await query;
      if (error) throw error;
      alert("Histori transaksi berhasil dihapus.");
      setDeleteRange("");
      await fetchTransaksi();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Gagal menghapus data.");
    }
  };

  const filtered = items.filter((tx) => {
    const matchSearch = tx.id_transaksi.toString().includes(search.trim());
    const matchStatus = statusFilter === "Semua Status" || tx.status_validasi === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="p-8 space-y-6">
      <AdminHeader title="Transaction History" subtitle="Monitor all canteen payment validations" />

      {selected && <DetailModal tx={selected} onClose={() => setSelected(null)} />}

      {/* Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <HiMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-base" />
            <input type="text" placeholder="Cari ID Transaksi..." value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-lg bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4A81D4]/30 focus:border-[#4A81D4] transition"
            />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="py-2.5 px-3 text-sm border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#4A81D4]/30 focus:border-[#4A81D4] transition">
            <option>Semua Status</option>
            <option>Valid</option>
            <option>Pending</option>
            <option>Invalid</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <select value={deleteRange} onChange={(e) => setDeleteRange(e.target.value)}
            className="py-2.5 px-3 text-sm border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-red-400 transition">
            <option value="">Pilih Rentang Waktu...</option>
            <option value="1m">Lebih dari 1 Bulan Lalu</option>
            <option value="3m">Lebih dari 3 Bulan Lalu</option>
            <option value="6m">Lebih dari 6 Bulan Lalu</option>
            <option value="all">Semua Transaksi</option>
          </select>
          <button onClick={handleDeleteHistory}
            className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-medium transition-colors flex items-center gap-2">
            <HiTrash className="text-base" /> Hapus Data
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              {["ID Transaksi", "Waktu", "Nominal", "Metode", "Status", "Aksi"].map((h) => (
                <th key={h} className="text-left px-5 py-3 text-slate-500 font-semibold text-xs uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="px-5 py-10 text-center text-slate-400 text-sm">Memuat data transaksi...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="px-5 py-10 text-center text-slate-400 text-sm">{items.length === 0 ? "Belum ada data transaksi." : "Tidak ada transaksi yang sesuai filter."}</td></tr>
            ) : filtered.map((tx, i) => (
              <tr key={tx.id_transaksi} className={`border-b border-slate-50 ${i % 2 === 0 ? "bg-white" : "bg-slate-50/40"}`}>
                <td className="px-5 py-3.5 text-slate-700 font-mono text-xs">#{tx.id_transaksi}</td>
                <td className="px-5 py-3.5 text-slate-500 text-xs whitespace-nowrap">{fmtDate(tx.waktu_transaksi)}</td>
                <td className="px-5 py-3.5 text-slate-800 font-medium">{fmt(tx.nominal)}</td>
                <td className="px-5 py-3.5 text-slate-600">{tx.metode_pembayaran}</td>
                <td className="px-5 py-3.5"><StatusBadge status={tx.status_validasi} /></td>
                <td className="px-5 py-3.5">
                  <button onClick={() => setSelected(tx)} title="Lihat detail"
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-blue-50 hover:text-[#4A81D4] transition-colors">
                    <HiEye className="text-base" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!isLoading && filtered.length > 0 && (
          <div className="px-5 py-3 border-t border-slate-100 text-xs text-slate-400">
            Menampilkan {filtered.length} dari {items.length} transaksi
          </div>
        )}
      </div>
    </div>
  );
}
