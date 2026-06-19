"use client";

import { useState, useEffect, useCallback } from "react";
import { z } from "zod";
import { supabase } from "../../scan/supabase-logic";
import {
  HiMagnifyingGlass,
  HiPlus,
  HiPencil,
  HiTrash,
  HiXMark,
  HiCheckCircle,
  HiExclamationCircle,
} from "react-icons/hi2";
import AdminHeader from "../../../components/admin/AdminHeader";

// ─── Zod Schema ────────────────────────────────────────────────────────────

const stockSchema = z.object({
  nama_barang: z.string().min(1, "Nama barang wajib diisi").max(100, "Nama barang terlalu panjang").trim(),
  kategori: z.enum(["Makanan", "Minuman"]),
  harga: z.number({ error: "Harga harus berupa angka" }).positive("Harga harus lebih dari 0"),
  stok_tersedia: z.number({ error: "Stok harus berupa angka" }).min(0, "Stok tidak boleh negatif").int("Stok harus bilangan bulat"),
});

type StockFieldErrors = {
  nama_barang?: string;
  kategori?: string;
  harga?: string;
  stok_tersedia?: string;
};

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

const emptyForm: FormState = { nama_barang: "", kategori: "Makanan", harga: "", stok_tersedia: "" };

interface ToastState { message: string; type: "success" | "error"; }

// ─── Toast ─────────────────────────────────────────────────────────────────

function Toast({ message, type, onDone }: ToastState & { onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div
      className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-white dark:bg-slate-800 border shadow-lg rounded-xl px-4 py-3"
      style={{ borderColor: type === "success" ? "#bbf7d0" : "#fecaca" }}
    >
      {type === "success"
        ? <HiCheckCircle className="text-emerald-500 text-xl flex-shrink-0" />
        : <HiExclamationCircle className="text-red-500 text-xl flex-shrink-0" />
      }
      <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{message}</p>
    </div>
  );
}

// ─── Shared Form Fields ────────────────────────────────────────────────────

function StockFormFields({ form, fieldErrors, onChange }: {
  form: FormState;
  fieldErrors: StockFieldErrors;
  onChange: (updated: FormState) => void;
}) {
  const inputCls = (err?: string) =>
    `w-full border rounded-lg px-3 py-2.5 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 transition bg-white dark:bg-slate-900 ${
      err
        ? "border-red-400 focus:ring-red-300"
        : "border-slate-200 dark:border-slate-600 focus:ring-[#4A81D4]/30 focus:border-[#4A81D4]"
    }`;

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Nama Barang</label>
        <input type="text" placeholder="Contoh: Pucuk Harum" value={form.nama_barang}
          onChange={(e) => onChange({ ...form, nama_barang: e.target.value })}
          className={inputCls(fieldErrors.nama_barang)} />
        {fieldErrors.nama_barang && <p className="mt-1 text-xs text-red-500">{fieldErrors.nama_barang}</p>}
      </div>
      <div>
        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Kategori</label>
        <select value={form.kategori}
          onChange={(e) => onChange({ ...form, kategori: e.target.value as Kategori })}
          className={inputCls(fieldErrors.kategori)}>
          <option value="Makanan">Makanan</option>
          <option value="Minuman">Minuman</option>
        </select>
      </div>
      <div>
        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Harga Satuan (Rp)</label>
        <input type="number" placeholder="Contoh: 5000" value={form.harga}
          onChange={(e) => onChange({ ...form, harga: e.target.value })}
          className={inputCls(fieldErrors.harga)} />
        {fieldErrors.harga && <p className="mt-1 text-xs text-red-500">{fieldErrors.harga}</p>}
      </div>
      <div>
        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Jumlah Stok</label>
        <input type="number" placeholder="Contoh: 20" value={form.stok_tersedia}
          onChange={(e) => onChange({ ...form, stok_tersedia: e.target.value })}
          className={inputCls(fieldErrors.stok_tersedia)} />
        {fieldErrors.stok_tersedia && <p className="mt-1 text-xs text-red-500">{fieldErrors.stok_tersedia}</p>}
      </div>
    </div>
  );
}

// ─── Modal Helper ──────────────────────────────────────────────────────────

function parseAndValidate(form: FormState) {
  return stockSchema.safeParse({
    nama_barang: form.nama_barang,
    kategori: form.kategori,
    harga: form.harga === "" ? undefined : Number(form.harga),
    stok_tersedia: form.stok_tersedia === "" ? undefined : Number(form.stok_tersedia),
  });
}

// ─── Tambah Barang Modal ───────────────────────────────────────────────────

function TambahBarangModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<StockFieldErrors>({});
  const [globalError, setGlobalError] = useState("");

  const handleSimpan = async () => {
    setFieldErrors({}); setGlobalError("");
    const result = parseAndValidate(form);
    if (!result.success) {
      const e = result.error.flatten().fieldErrors;
      setFieldErrors({ nama_barang: e.nama_barang?.[0], kategori: e.kategori?.[0], harga: e.harga?.[0], stok_tersedia: e.stok_tersedia?.[0] });
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from("stok_barang").insert([result.data]);
      if (error) throw error;
      onSaved(); onClose();
    } catch (err: unknown) {
      setGlobalError(err instanceof Error ? err.message : "Gagal menyimpan.");
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md mx-4 p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <p className="text-slate-800 dark:text-slate-100 font-bold text-lg">Tambah Barang Baru</p>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"><HiXMark className="text-lg" /></button>
        </div>
        {globalError && <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-500/40 text-red-600 dark:text-red-400 text-xs font-medium">{globalError}</div>}
        <StockFormFields form={form} fieldErrors={fieldErrors} onChange={setForm} />
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} disabled={saving} className="flex-1 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50">Batal</button>
          <button onClick={handleSimpan} disabled={saving} className="flex-1 py-2.5 rounded-lg bg-[#4A81D4] text-white text-sm font-semibold hover:bg-[#3a6fc0] transition-colors disabled:opacity-60">{saving ? "Menyimpan..." : "Simpan"}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Edit Barang Modal ─────────────────────────────────────────────────────

function EditBarangModal({ item, onClose, onSaved }: { item: StockItem; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<FormState>({
    nama_barang: item.nama_barang, kategori: item.kategori,
    harga: String(item.harga), stok_tersedia: String(item.stok_tersedia),
  });
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<StockFieldErrors>({});
  const [globalError, setGlobalError] = useState("");

  const handleSimpan = async () => {
    setFieldErrors({}); setGlobalError("");
    const result = parseAndValidate(form);
    if (!result.success) {
      const e = result.error.flatten().fieldErrors;
      setFieldErrors({ nama_barang: e.nama_barang?.[0], kategori: e.kategori?.[0], harga: e.harga?.[0], stok_tersedia: e.stok_tersedia?.[0] });
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from("stok_barang").update(result.data).eq("id_barang", item.id_barang);
      if (error) throw error;
      onSaved(); onClose();
    } catch (err: unknown) {
      setGlobalError(err instanceof Error ? err.message : "Gagal menyimpan.");
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md mx-4 p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <p className="text-slate-800 dark:text-slate-100 font-bold text-lg">Edit Barang</p>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"><HiXMark className="text-lg" /></button>
        </div>
        {globalError && <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-500/40 text-red-600 dark:text-red-400 text-xs font-medium">{globalError}</div>}
        <StockFormFields form={form} fieldErrors={fieldErrors} onChange={setForm} />
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} disabled={saving} className="flex-1 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50">Batal</button>
          <button onClick={handleSimpan} disabled={saving} className="flex-1 py-2.5 rounded-lg bg-[#4A81D4] text-white text-sm font-semibold hover:bg-[#3a6fc0] transition-colors disabled:opacity-60">{saving ? "Menyimpan..." : "Simpan Perubahan"}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function StockPage() {
  const [items, setItems] = useState<StockItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showTambah, setShowTambah] = useState(false);
  const [editItem, setEditItem] = useState<StockItem | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = (message: string, type: "success" | "error") => setToast({ message, type });

  const fetchItems = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.from("stok_barang").select("*").order("waktu_ditambahkan", { ascending: false });
      if (error) throw error;
      setItems((data as StockItem[]) ?? []);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Gagal memuat data stok.", "error");
    } finally { setIsLoading(false); }
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const handleDelete = async (id: number, nama: string) => {
    if (!window.confirm(`Apakah Anda yakin ingin menghapus "${nama}"?`)) return;
    try {
      const { error } = await supabase.from("stok_barang").delete().eq("id_barang", id);
      if (error) throw error;
      showToast(`"${nama}" berhasil dihapus.`, "success");
      await fetchItems();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Gagal menghapus barang.", "error");
    }
  };

  const filtered = items.filter((item) => item.nama_barang.toLowerCase().includes(search.toLowerCase()));
  const fmt = (n: number) => "Rp " + n.toLocaleString("id-ID");

  return (
    <div className="p-8 space-y-6">
      <AdminHeader title="Stock Management" subtitle="Manage your canteen inventory manually" />

      {toast && <Toast message={toast.message} type={toast.type} onDone={() => setToast(null)} />}

      {showTambah && (
        <TambahBarangModal
          onClose={() => setShowTambah(false)}
          onSaved={() => { fetchItems(); showToast("Barang berhasil ditambahkan.", "success"); }}
        />
      )}

      {editItem && (
        <EditBarangModal
          item={editItem}
          onClose={() => setEditItem(null)}
          onSaved={() => { fetchItems(); showToast("Barang berhasil diperbarui.", "success"); }}
        />
      )}

      {/* Action Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative w-72">
          <HiMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-base" />
          <input type="text" placeholder="Cari barang..." value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#4A81D4]/30 focus:border-[#4A81D4] transition"
          />
        </div>
        <button onClick={() => setShowTambah(true)}
          className="inline-flex items-center gap-2 bg-[#4A81D4] hover:bg-[#3a6fc0] text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors">
          <HiPlus className="text-base" /> Tambah Barang Baru
        </button>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700">
              {["Nama Barang", "Kategori", "Harga", "Sisa Stok", "Status", "Aksi"].map((h) => (
                <th key={h} className="text-left px-5 py-3 text-slate-500 dark:text-slate-400 font-semibold text-xs uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="px-5 py-10 text-center text-slate-400 text-sm">Memuat data...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="px-5 py-10 text-center text-slate-400 text-sm">{search ? "Tidak ada barang ditemukan." : "Belum ada data stok."}</td></tr>
            ) : filtered.map((item, i) => (
              <tr key={item.id_barang} className={`border-b border-slate-50 dark:border-slate-700/50 transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/40 ${
                i % 2 === 0 ? "bg-white dark:bg-slate-800" : "bg-slate-50/40 dark:bg-slate-700/20"
              }`}>
                <td className="px-5 py-3.5 text-slate-800 dark:text-slate-100 font-medium">{item.nama_barang}</td>
                <td className="px-5 py-3.5">
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                    item.kategori === "Makanan"
                      ? "bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400"
                      : "bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400"
                  }`}>
                    {item.kategori}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-slate-700 dark:text-slate-300">{fmt(item.harga)}</td>
                <td className="px-5 py-3.5 text-slate-700 dark:text-slate-300 font-mono">{item.stok_tersedia}</td>
                <td className="px-5 py-3.5">
                  {item.stok_tersedia > 0
                    ? <span className="inline-flex items-center gap-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-semibold px-2.5 py-1 rounded-full">Tersedia</span>
                    : <span className="inline-flex items-center gap-1 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-semibold px-2.5 py-1 rounded-full">Habis</span>
                  }
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2">
                    <button onClick={() => setEditItem(item)} title="Edit barang"
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 hover:text-[#4A81D4] dark:hover:text-blue-400 transition-colors">
                      <HiPencil className="text-base" />
                    </button>
                    <button onClick={() => handleDelete(item.id_barang, item.nama_barang)} title="Hapus barang"
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-500 dark:hover:text-red-400 transition-colors">
                      <HiTrash className="text-base" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
