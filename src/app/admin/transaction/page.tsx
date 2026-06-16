"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase, getPublicImageUrl } from "../../scan/supabase-logic";
import {
  HiHome,
  HiUser,
  HiMagnifyingGlass,
  HiXMark,
  HiEye,
  HiPhoto,
  HiTrash,
} from "react-icons/hi2";
import NotifBell from "../../../components/ui/NotifBell";

// ─── Sidebar ───────────────────────────────────────────────────────────────

type NavItem = { label: string; active: boolean; href: string; imgSrc?: string };

const navItems: NavItem[] = [
  { label: "Dashboard",   active: false, href: "/admin/dashboard" },
  { label: "Stock",       active: false, href: "/admin/stock",       imgSrc: "/stock.png" },
  { label: "Transaction", active: true,  href: "/admin/transaction", imgSrc: "/transaction.png" },
  { label: "Reports",     active: false, href: "/admin/reports",     imgSrc: "/reports.png" },
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

type StatusValidasi = "Valid" | "Pending" | "Invalid";

interface Transaksi {
  id_transaksi: number;
  waktu_transaksi: string;
  nominal: number;
  metode_pembayaran: string;
  status_validasi: StatusValidasi;
}

// ─── Status Badge ──────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    Valid: "bg-emerald-100 text-emerald-700",
    Pending: "bg-yellow-100 text-yellow-700",
    Invalid: "bg-red-100 text-red-700",
  };
  const cls = map[status] ?? "bg-slate-100 text-slate-500";
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${cls}`}>
      {status}
    </span>
  );
}

// ─── Detail Modal ──────────────────────────────────────────────────────────

interface DetailModalProps {
  tx: Transaksi;
  onClose: () => void;
}

function DetailModal({ tx, onClose }: DetailModalProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loadingImg, setLoadingImg] = useState(true);

  useEffect(() => {
    const fetchBukti = async () => {
      setLoadingImg(true);
      try {
        const { data, error } = await supabase
          .from("bukti_pembayaran")
          .select("file_gambar")
          .eq("id_transaksi", tx.id_transaksi)
          .maybeSingle();

        if (error) throw error;
        if (data?.file_gambar) {
          setImageUrl(getPublicImageUrl(data.file_gambar));
        } else {
          setImageUrl(null);
        }
      } catch {
        setImageUrl(null);
      } finally {
        setLoadingImg(false);
      }
    };
    fetchBukti();
  }, [tx.id_transaksi]);

  const fmt = (n: number) => "Rp " + n.toLocaleString("id-ID");
  const fmtDate = (s: string) =>
    new Date(s).toLocaleString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <p className="font-bold text-slate-800">Detail Transaksi</p>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <HiXMark className="text-lg" />
          </button>
        </div>

        {/* Info rows */}
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

        {/* Bukti gambar */}
        <div className="px-6 pb-6">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
            Bukti Pembayaran
          </p>
          <div className="rounded-xl border border-slate-100 bg-slate-50 overflow-hidden min-h-[160px] flex items-center justify-center">
            {loadingImg ? (
              <p className="text-slate-400 text-sm">Memuat gambar...</p>
            ) : imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageUrl}
                alt="Bukti pembayaran"
                className="w-full max-h-72 object-contain"
              />
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
  const router = useRouter();

  const handleLogout = () => {
    if (window.confirm("Apakah Anda yakin ingin keluar?")) {
      localStorage.removeItem("admin_session");
      router.push("/admin/login");
    }
  };
  const [items, setItems] = useState<Transaksi[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [adminName, setAdminName] = useState("Admin");

  useEffect(() => {
    const session = localStorage.getItem("admin_session");
    if (session) setAdminName(session);
  }, []);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Semua Status");
  const [selected, setSelected] = useState<Transaksi | null>(null);
  const [deleteRange, setDeleteRange] = useState("");

  const fetchTransaksi = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("transaksi")
        .select(
          "id_transaksi, waktu_transaksi, nominal, metode_pembayaran, status_validasi"
        )
        .order("waktu_transaksi", { ascending: false });

      if (error) throw error;
      setItems((data as Transaksi[]) ?? []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal memuat data.";
      alert(`Error: ${msg}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTransaksi();
  }, [fetchTransaksi]);

  const handleDeleteHistory = async () => {
    if (!deleteRange) {
      alert("Silakan pilih rentang waktu terlebih dahulu.");
      return;
    }
    const confirmed = window.confirm(
      "Apakah Anda yakin ingin menghapus histori transaksi pada rentang waktu yang dipilih? Aksi ini tidak dapat dibatalkan!"
    );
    if (!confirmed) return;

    try {
      let query = supabase.from("transaksi").delete();

      if (deleteRange === "all") {
        // hapus semua — filter gte epoch agar memenuhi constraint Supabase
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
    const matchSearch = tx.id_transaksi
      .toString()
      .includes(search.trim());
    const matchStatus =
      statusFilter === "Semua Status" || tx.status_validasi === statusFilter;
    return matchSearch && matchStatus;
  });

  const fmt = (n: number) => "Rp " + n.toLocaleString("id-ID");
  const fmtDate = (s: string) =>
    new Date(s).toLocaleString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">
      <Sidebar onLogout={handleLogout} />

      {selected && (
        <DetailModal tx={selected} onClose={() => setSelected(null)} />
      )}

      <div className="ml-64 flex-1 overflow-y-auto">
        <div className="p-8 space-y-6">

          {/* Top Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Transaction History</h1>
              <p className="text-slate-500 text-sm mt-0.5">
                Monitor all canteen payment validations
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
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="relative w-64">
                <HiMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-base" />
                <input
                  type="text"
                  placeholder="Cari ID Transaksi..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-lg bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4A81D4]/30 focus:border-[#4A81D4] transition"
                />
              </div>

              {/* Status filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="py-2.5 px-3 text-sm border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#4A81D4]/30 focus:border-[#4A81D4] transition"
              >
                <option>Semua Status</option>
                <option>Valid</option>
                <option>Pending</option>
                <option>Invalid</option>
              </select>
            </div>

            {/* Delete history controls */}
            <div className="flex items-center gap-2">
              <select
                value={deleteRange}
                onChange={(e) => setDeleteRange(e.target.value)}
                className="py-2.5 px-3 text-sm border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-red-400 transition"
              >
                <option value="">Pilih Rentang Waktu...</option>
                <option value="1m">Lebih dari 1 Bulan Lalu</option>
                <option value="3m">Lebih dari 3 Bulan Lalu</option>
                <option value="6m">Lebih dari 6 Bulan Lalu</option>
                <option value="all">Semua Transaksi</option>
              </select>
              <button
                onClick={handleDeleteHistory}
                className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-medium transition-colors flex items-center gap-2"
              >
                <HiTrash className="text-base" />
                Hapus Data
              </button>
            </div>
          </div>

          {/* Table Card */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {["ID Transaksi", "Waktu", "Nominal", "Metode", "Status", "Aksi"].map(
                    (h) => (
                      <th
                        key={h}
                        className="text-left px-5 py-3 text-slate-500 font-semibold text-xs uppercase tracking-wide"
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-slate-400 text-sm">
                      Memuat data transaksi...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-slate-400 text-sm">
                      {items.length === 0
                        ? "Belum ada data transaksi."
                        : "Tidak ada transaksi yang sesuai filter."}
                    </td>
                  </tr>
                ) : (
                  filtered.map((tx, i) => (
                    <tr
                      key={tx.id_transaksi}
                      className={`border-b border-slate-50 ${
                        i % 2 === 0 ? "bg-white" : "bg-slate-50/40"
                      }`}
                    >
                      <td className="px-5 py-3.5 text-slate-700 font-mono text-xs">
                        #{tx.id_transaksi}
                      </td>
                      <td className="px-5 py-3.5 text-slate-500 text-xs whitespace-nowrap">
                        {fmtDate(tx.waktu_transaksi)}
                      </td>
                      <td className="px-5 py-3.5 text-slate-800 font-medium">
                        {fmt(tx.nominal)}
                      </td>
                      <td className="px-5 py-3.5 text-slate-600">
                        {tx.metode_pembayaran}
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusBadge status={tx.status_validasi} />
                      </td>
                      <td className="px-5 py-3.5">
                        <button
                          onClick={() => setSelected(tx)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-blue-50 hover:text-[#4A81D4] transition-colors"
                          title="Lihat detail"
                        >
                          <HiEye className="text-base" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* Row count */}
            {!isLoading && filtered.length > 0 && (
              <div className="px-5 py-3 border-t border-slate-100 text-xs text-slate-400">
                Menampilkan {filtered.length} dari {items.length} transaksi
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
