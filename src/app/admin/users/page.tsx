"use client";

import { useState, useEffect, useCallback } from "react";
import { z } from "zod";
import { supabase } from "../../scan/supabase-logic";
import { HiMagnifyingGlass, HiPlus, HiTrash, HiXMark } from "react-icons/hi2";
import AdminHeader from "../../../components/admin/AdminHeader";

// ─── Zod Schema ────────────────────────────────────────────────────────────

const tambahAdminSchema = z
  .object({
    username: z
      .string()
      .min(3, "Username minimal 3 karakter")
      .max(50, "Username terlalu panjang")
      .regex(/^[a-zA-Z0-9_]+$/, "Username hanya boleh huruf, angka, dan underscore")
      .trim(),
    password: z.string().min(6, "Password minimal 6 karakter").max(100, "Password terlalu panjang"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Konfirmasi password tidak cocok",
    path: ["confirmPassword"],
  });

// ─── Types ─────────────────────────────────────────────────────────────────

interface AdminRow { id_admin: number; username: string; }

// ─── Tambah Admin Modal ────────────────────────────────────────────────────

function TambahAdminModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [globalError, setGlobalError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ username?: string; password?: string; confirmPassword?: string }>({});

  const clearFieldError = (field: keyof typeof fieldErrors) =>
    setFieldErrors((p) => ({ ...p, [field]: undefined }));

  const handleSave = async () => {
    setGlobalError(""); setFieldErrors({});
    const result = tambahAdminSchema.safeParse({ username, password, confirmPassword });
    if (!result.success) {
      const errs = result.error.issues.reduce<Record<string, string>>((acc, issue) => {
        const key = String(issue.path[0]);
        if (!acc[key]) acc[key] = issue.message;
        return acc;
      }, {});
      setFieldErrors(errs);
      return;
    }
    setSaving(true);
    try {
      const { data: existing } = await supabase
        .from("admin").select("username").eq("username", result.data.username).maybeSingle();
      if (existing) { setFieldErrors({ username: "Username ini sudah digunakan, silakan pilih yang lain." }); return; }
      const { error: insertErr } = await supabase
        .from("admin").insert([{ username: result.data.username, password: result.data.password }]);
      if (insertErr) throw insertErr;
      onSaved(); onClose();
    } catch (err: unknown) {
      setGlobalError(err instanceof Error ? err.message : "Gagal menyimpan. Coba lagi.");
    } finally { setSaving(false); }
  };

  const inputCls = (err?: string) =>
    `w-full border rounded-lg px-3 py-2.5 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 transition bg-white dark:bg-slate-900 ${
      err
        ? "border-red-400 focus:ring-red-300"
        : "border-slate-200 dark:border-slate-600 focus:ring-[#4A81D4]/30 focus:border-[#4A81D4]"
    }`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md mx-4 p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <p className="font-bold text-slate-800 dark:text-slate-100 text-lg">Tambah Admin Baru</p>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"><HiXMark className="text-lg" /></button>
        </div>
        {globalError && <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-500/40 text-red-600 dark:text-red-400 text-xs font-medium">{globalError}</div>}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Username</label>
            <input type="text" placeholder="Masukkan username" value={username}
              onChange={(e) => { setUsername(e.target.value); clearFieldError("username"); }}
              className={inputCls(fieldErrors.username)} />
            {fieldErrors.username && <p className="mt-1 text-xs text-red-500">{fieldErrors.username}</p>}
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Password</label>
            <input type="password" placeholder="••••••••" value={password}
              onChange={(e) => { setPassword(e.target.value); clearFieldError("password"); }}
              className={inputCls(fieldErrors.password)} />
            {fieldErrors.password && <p className="mt-1 text-xs text-red-500">{fieldErrors.password}</p>}
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Konfirmasi Password</label>
            <input type="password" placeholder="••••••••" value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); clearFieldError("confirmPassword"); }}
              className={inputCls(fieldErrors.confirmPassword)} />
            {fieldErrors.confirmPassword && <p className="mt-1 text-xs text-red-500">{fieldErrors.confirmPassword}</p>}
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} disabled={saving} className="flex-1 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50">Batal</button>
          <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-lg bg-[#4A81D4] hover:bg-[#3a6fc0] text-white text-sm font-semibold transition-colors disabled:opacity-60">{saving ? "Menyimpan..." : "Simpan"}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function UsersPage() {
  const [admins, setAdmins] = useState<AdminRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);

  const fetchAdmins = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("admin").select("id_admin, username").order("id_admin", { ascending: true });
      if (error) throw error;
      setAdmins((data as AdminRow[]) ?? []);
    } catch (err: unknown) {
      console.error(err instanceof Error ? err.message : "Gagal memuat data.");
    } finally { setIsLoading(false); }
  }, []);

  useEffect(() => { fetchAdmins(); }, [fetchAdmins]);

  const handleDelete = async (id: number, username: string) => {
    const currentSession = localStorage.getItem("admin_session");
    if (currentSession === username) { alert("Tidak dapat menghapus akun yang sedang login."); return; }
    if (!window.confirm(`Hapus admin "${username}"?`)) return;
    try {
      const { error } = await supabase.from("admin").delete().eq("id_admin", id);
      if (error) throw error;
      await fetchAdmins();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Gagal menghapus.");
    }
  };

  const filtered = admins.filter((a) => a.username.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-8 space-y-6">
      <AdminHeader title="User Management" subtitle="Manage administrator accounts and permissions" />

      {showModal && <TambahAdminModal onClose={() => setShowModal(false)} onSaved={fetchAdmins} />}

      {/* Action Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative w-72">
          <HiMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-base" />
          <input type="text" placeholder="Cari admin..." value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#4A81D4]/30 focus:border-[#4A81D4] transition"
          />
        </div>
        <button onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 bg-[#4A81D4] hover:bg-[#3a6fc0] text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors">
          <HiPlus className="text-base" /> Tambah Admin Baru
        </button>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700">
              {["ID Admin", "Username", "Aksi"].map((h) => (
                <th key={h} className="text-left px-5 py-3 text-slate-500 dark:text-slate-400 font-semibold text-xs uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={3} className="px-5 py-10 text-center text-slate-400 text-sm">Memuat data...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={3} className="px-5 py-10 text-center text-slate-400 text-sm">{search ? "Admin tidak ditemukan." : "Belum ada data admin."}</td></tr>
            ) : filtered.map((admin, i) => (
              <tr key={admin.id_admin} className={`border-b border-slate-50 dark:border-slate-700/50 transition-colors ${
                i % 2 === 0
                  ? "bg-white dark:bg-slate-800"
                  : "bg-slate-50/40 dark:bg-slate-700/20"
              } hover:bg-slate-50 dark:hover:bg-slate-700/40`}>
                <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400 font-mono text-xs">#{admin.id_admin}</td>
                <td className="px-5 py-3.5 text-slate-800 dark:text-slate-200 font-medium">{admin.username}</td>
                <td className="px-5 py-3.5">
                  <button onClick={() => handleDelete(admin.id_admin, admin.username)} title="Hapus admin"
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-500 dark:hover:text-red-400 transition-colors">
                    <HiTrash className="text-base" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!isLoading && filtered.length > 0 && (
          <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-700 text-xs text-slate-400 dark:text-slate-500">{filtered.length} admin terdaftar</div>
        )}
      </div>
    </div>
  );
}
