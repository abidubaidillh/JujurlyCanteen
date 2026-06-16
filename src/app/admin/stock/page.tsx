"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../scan/supabase-logic";
import {
  HiHome,
  HiUser,
  HiMagnifyingGlass,
  HiPlus,
  HiPencil,
  HiTrash,
  HiXMark,
} from "react-icons/hi2";
import NotifBell from "../../../components/ui/NotifBell";

// ─── Sidebar ───────────────────────────────────────────────────────────────

type NavItem = { label: string; active: boolean; href: string; imgSrc?: string };

const navItems: NavItem[] = [
  { label: "Dashboard",   active: false, href: "/admin/dashboard" },
  { label: "Stock",       active: true,  href: "/admin/stock",       imgSrc: "/stock.png" },
  { label: "Transaction", active: false, href: "/admin/transaction", imgSrc: "/transaction.png" },
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

type Kategori = "Makanan" | "Minuman";

interface StockItem {
  id_barang: number;
  nama_barang: string;
  kategori: Kategori;
  harga: number;
  stok_tersedia: number;
  waktu_ditambahkan?: string;
}

interface FormState {
  nama_barang: string;
  kategori: Kategori;
  harga: string;
  stok_tersedia: string;
}

const emptyForm: FormState = {
  nama_barang: "",
  kategori: "Makanan",
  harga: "",
  stok_tersedia: "",
};

// ─── Modal ─────────────────────────────────────────────────────────────────

interface ModalProps {
  onClose: () => void;
  onSaved: () => void;
}

function TambahBarangModal({ onClose, onSaved }: ModalProps) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  const handleSimpan = async () => {
    if (!form.nama_barang.trim() || !form.harga || !form.stok_tersedia) {
      alert("Mohon lengkapi semua field sebelum menyimpan.");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from("stok_barang").insert([
        {
          nama_barang: form.nama_barang.trim(),
          kategori: form.kategori,
          harga: Number(form.harga),
          stok_tersedia: Number(form.stok_tersedia),
        },
      ]);

      if (error) throw error;

      onSaved();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan.";
      alert(`Gagal menyimpan barang: ${msg}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <p className="text-slate-800 font-bold text-lg">Tambah Barang Baru</p>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <HiXMark className="text-lg" />
          </button>
        </div>

        {/* Form */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              Nama Barang
            </label>
            <input
              type="text"
              placeholder="Contoh: Pucuk Harum"
              value={form.nama_barang}
              onChange={(e) => setForm({ ...form, nama_barang: e.target.value })}
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4A81D4]/30 focus:border-[#4A81D4] transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              Kategori
            </label>
            <select
              value={form.kategori}
              onChange={(e) =>
                setForm({ ...form, kategori: e.target.value as Kategori })
              }
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#4A81D4]/30 focus:border-[#4A81D4] transition bg-white"
            >
              <option value="Makanan">Makanan</option>
              <option value="Minuman">Minuman</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              Harga Satuan (Rp)
            </label>
            <input
              type="number"
              placeholder="Contoh: 5000"
              value={form.harga}
              onChange={(e) => setForm({ ...form, harga: e.target.value })}
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4A81D4]/30 focus:border-[#4A81D4] transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              Jumlah Stok Awal
            </label>
            <input
              type="number"
              placeholder="Contoh: 20"
              value={form.stok_tersedia}
              onChange={(e) => setForm({ ...form, stok_tersedia: e.target.value })}
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4A81D4]/30 focus:border-[#4A81D4] transition"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 py-2.5 rounded-lg border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            Batal
          </button>
          <button
            onClick={handleSimpan}
            disabled={saving}
            className="flex-1 py-2.5 rounded-lg bg-[#4A81D4] text-white text-sm font-semibold hover:bg-[#3a6fc0] transition-colors disabled:opacity-60"
          >
            {saving ? "Menyimpan..." : "Simpan"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function StockPage() {
  const router = useRouter();

  const handleLogout = () => {
    if (window.confirm("Apakah Anda yakin ingin keluar?")) {
      localStorage.removeItem("admin_session");
      router.push("/admin/login");
    }
  };
  const [items, setItems] = useState<StockItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [adminName, setAdminName] = useState("Admin");

  useEffect(() => {
    const session = localStorage.getItem("admin_session");
    if (session) setAdminName(session);
  }, []);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);

  // ── READ ──
  const fetchItems = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("stok_barang")
        .select("*")
        .order("waktu_ditambahkan", { ascending: false });

      if (error) throw error;
      setItems((data as StockItem[]) ?? []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal memuat data.";
      alert(`Error: ${msg}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // ── DELETE ──
  const handleDelete = async (id: number, nama: string) => {
    const ok = window.confirm(`Apakah Anda yakin ingin menghapus "${nama}"?`);
    if (!ok) return;

    try {
      const { error } = await supabase
        .from("stok_barang")
        .delete()
        .eq("id_barang", id);

      if (error) throw error;
      await fetchItems();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal menghapus.";
      alert(`Gagal menghapus barang: ${msg}`);
    }
  };

  const filtered = items.filter((item) =>
    item.nama_barang.toLowerCase().includes(search.toLowerCase())
  );

  const fmt = (n: number) => "Rp " + n.toLocaleString("id-ID");

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">
      <Sidebar onLogout={handleLogout} />

      {showModal && (
        <TambahBarangModal
          onClose={() => setShowModal(false)}
          onSaved={fetchItems}
        />
      )}

      {/* Main content */}
      <div className="ml-64 flex-1 overflow-y-auto">
        <div className="p-8 space-y-6">

          {/* Top Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Stock Management</h1>
              <p className="text-slate-500 text-sm mt-0.5">
                Manage your canteen inventory manually
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
          <div className="flex items-center justify-between gap-4">
            <div className="relative w-72">
              <HiMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-base" />
              <input
                type="text"
                placeholder="Cari barang..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-lg bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4A81D4]/30 focus:border-[#4A81D4] transition"
              />
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 bg-[#4A81D4] hover:bg-[#3a6fc0] text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors"
            >
              <HiPlus className="text-base" />
              Tambah Barang Baru
            </button>
          </div>

          {/* Table Card */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {["Nama Barang", "Kategori", "Harga", "Sisa Stok", "Status", "Aksi"].map((h) => (
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
                    <td colSpan={6} className="px-5 py-10 text-center text-slate-400 text-sm">
                      Memuat data...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-slate-400 text-sm">
                      {search ? "Tidak ada barang ditemukan." : "Belum ada data stok."}
                    </td>
                  </tr>
                ) : (
                  filtered.map((item, i) => (
                    <tr
                      key={item.id_barang}
                      className={`border-b border-slate-50 ${
                        i % 2 === 0 ? "bg-white" : "bg-slate-50/40"
                      }`}
                    >
                      <td className="px-5 py-3.5 text-slate-800 font-medium">
                        {item.nama_barang}
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                            item.kategori === "Makanan"
                              ? "bg-orange-50 text-orange-600"
                              : "bg-sky-50 text-sky-600"
                          }`}
                        >
                          {item.kategori}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-700">{fmt(item.harga)}</td>
                      <td className="px-5 py-3.5 text-slate-700 font-mono">
                        {item.stok_tersedia}
                      </td>
                      <td className="px-5 py-3.5">
                        {item.stok_tersedia > 0 ? (
                          <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                            Tersedia
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-red-100 text-red-600 text-xs font-semibold px-2.5 py-1 rounded-full">
                            Habis
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <button className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-blue-50 hover:text-[#4A81D4] transition-colors">
                            <HiPencil className="text-base" />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id_barang, item.nama_barang)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                          >
                            <HiTrash className="text-base" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

        </div>
      </div>
    </div>
  );
}
