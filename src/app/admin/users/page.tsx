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
  HiTrash,
  HiXMark,
} from "react-icons/hi2";
import NotifBell from "../../../components/ui/NotifBell";

// ─── Sidebar ───────────────────────────────────────────────────────────────

type NavItem = { label: string; active: boolean; href: string; imgSrc?: string };

const navItems: NavItem[] = [
  { label: "Dashboard",   active: false, href: "/admin/dashboard" },
  { label: "Stock",       active: false, href: "/admin/stock",       imgSrc: "/stock.png" },
  { label: "Transaction", active: false, href: "/admin/transaction", imgSrc: "/transaction.png" },
  { label: "Reports",     active: false, href: "/admin/reports",     imgSrc: "/reports.png" },
  { label: "Users",       active: true,  href: "/admin/users",       imgSrc: "/users.png" },
  { label: "Settings",    active: false, href: "/admin/settings",    imgSrc: "/settings.png" },
];

function Sidebar() {
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
    </aside>
  );
}

// ─── Types ─────────────────────────────────────────────────────────────────

interface AdminRow {
  id_admin: number;
  username: string;
}

// ─── Add Admin Modal ────────────────────────────────────────────────────────

interface ModalProps {
  onClose: () => void;
  onSaved: () => void;
}

function TambahAdminModal({ onClose, onSaved }: ModalProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    if (!username.trim() || !password.trim()) {
      setError("Username dan password wajib diisi.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      // Check duplicate
      const { data: existing } = await supabase
        .from("admin")
        .select("username")
        .eq("username", username.trim())
        .maybeSingle();

      if (existing) {
        setError("Username sudah digunakan!");
        return;
      }

      const { error: insertErr } = await supabase
        .from("admin")
        .insert([{ username: username.trim(), password }]);

      if (insertErr) throw insertErr;

      onSaved();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan.");
    } finally {
      setSaving(false);
    }
  };

  const inputCls =
    "w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4A81D4]/30 focus:border-[#4A81D4] transition bg-white";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <p className="font-bold text-slate-800 text-lg">Tambah Admin Baru</p>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <HiXMark className="text-lg" />
          </button>
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-xs font-medium">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              Username
            </label>
            <input
              type="text"
              placeholder="Masukkan username"
              value={username}
              onChange={(e) => { setUsername(e.target.value); setError(""); }}
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              Password
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(""); }}
              className={inputCls}
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 py-2.5 rounded-lg border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            Batal
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2.5 rounded-lg bg-[#4A81D4] hover:bg-[#3a6fc0] text-white text-sm font-semibold transition-colors disabled:opacity-60"
          >
            {saving ? "Menyimpan..." : "Simpan"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function UsersPage() {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [admins, setAdmins] = useState<AdminRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);

  // ── Auth guard ──
  useEffect(() => {
    const session = localStorage.getItem("admin_session");
    if (!session) {
      router.push("/admin/login");
    } else {
      setIsAuthorized(true);
    }
  }, [router]);

  // ── READ ──
  const fetchAdmins = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("admin")
        .select("id_admin, username")
        .order("id_admin", { ascending: true });

      if (error) throw error;
      setAdmins((data as AdminRow[]) ?? []);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Gagal memuat data.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthorized) fetchAdmins();
  }, [isAuthorized, fetchAdmins]);

  // ── DELETE ──
  const handleDelete = async (id: number, username: string) => {
    const currentSession = localStorage.getItem("admin_session");
    if (currentSession === username) {
      alert("Tidak dapat menghapus akun yang sedang login.");
      return;
    }
    if (!window.confirm(`Hapus admin "${username}"?`)) return;

    try {
      const { error } = await supabase
        .from("admin")
        .delete()
        .eq("id_admin", id);
      if (error) throw error;
      await fetchAdmins();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Gagal menghapus.");
    }
  };

  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-400 text-sm">Memeriksa otorisasi...</p>
      </div>
    );
  }

  const filtered = admins.filter((a) =>
    a.username.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">
      <Sidebar />

      {showModal && (
        <TambahAdminModal
          onClose={() => setShowModal(false)}
          onSaved={fetchAdmins}
        />
      )}

      <div className="ml-64 flex-1 overflow-y-auto">
        <div className="p-8 space-y-6">

          {/* Top Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">User Management</h1>
              <p className="text-slate-500 text-sm mt-0.5">
                Manage administrator accounts and permissions
              </p>
            </div>
            <div className="flex items-center gap-4">
              <NotifBell />
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center">
                  <HiUser className="text-slate-500 text-lg" />
                </div>
                <div className="text-sm leading-tight">
                  <p className="font-semibold text-slate-800">
                    {localStorage.getItem("admin_session") ?? "Admin"}
                  </p>
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
                placeholder="Cari admin..."
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
              Tambah Admin Baru
            </button>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {["ID Admin", "Username", "Aksi"].map((h) => (
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
                      Memuat data...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-10 text-center text-slate-400 text-sm">
                      {search ? "Admin tidak ditemukan." : "Belum ada data admin."}
                    </td>
                  </tr>
                ) : (
                  filtered.map((admin, i) => (
                    <tr
                      key={admin.id_admin}
                      className={`border-b border-slate-50 ${i % 2 === 0 ? "bg-white" : "bg-slate-50/40"}`}
                    >
                      <td className="px-5 py-3.5 text-slate-500 font-mono text-xs">
                        #{admin.id_admin}
                      </td>
                      <td className="px-5 py-3.5 text-slate-800 font-medium">
                        {admin.username}
                      </td>
                      <td className="px-5 py-3.5">
                        <button
                          onClick={() => handleDelete(admin.id_admin, admin.username)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                          title="Hapus admin"
                        >
                          <HiTrash className="text-base" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {!isLoading && filtered.length > 0 && (
              <div className="px-5 py-3 border-t border-slate-100 text-xs text-slate-400">
                {filtered.length} admin terdaftar
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
