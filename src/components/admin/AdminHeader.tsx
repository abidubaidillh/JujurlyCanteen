"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../app/scan/supabase-logic";
import { HiUser, HiPencilSquare, HiChevronDown, HiXMark } from "react-icons/hi2";
import NotifBell from "../ui/NotifBell";

// ─── Edit Profil Modal ─────────────────────────────────────────────────────

function EditProfilModal({
  currentUsername,
  onClose,
  onSaved,
}: {
  currentUsername: string;
  onClose: () => void;
  onSaved: (newUsername: string) => void;
}) {
  const [username, setUsername] = useState(currentUsername);
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const inputCls =
    "w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4A81D4]/30 focus:border-[#4A81D4] transition bg-white";

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!username.trim()) {
      setError("Username tidak boleh kosong.");
      return;
    }

    setSaving(true);
    try {
      const updateData: Record<string, string> = { username: username.trim() };
      if (password) updateData.password = password;

      const { error: updateErr } = await supabase
        .from("admin")
        .update(updateData)
        .eq("username", currentUsername);

      if (updateErr) throw updateErr;

      localStorage.setItem("admin_session", username.trim());
      onSaved(username.trim());
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal memperbarui profil.");
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
        <div className="flex items-center justify-between mb-5">
          <p className="font-bold text-slate-800 text-lg">Edit Profil</p>
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

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={inputCls}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              Password Baru
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Kosongkan jika tidak ingin mengubah"
              className={inputCls}
            />
          </div>

          <div className="flex gap-3 mt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 py-2.5 rounded-lg border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 rounded-lg bg-[#4A81D4] hover:bg-[#3a6fc0] text-white text-sm font-semibold transition-colors disabled:opacity-60"
            >
              {saving ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── AdminHeader ───────────────────────────────────────────────────────────

interface AdminHeaderProps {
  title: string;
  subtitle?: string;
}

export default function AdminHeader({ title, subtitle }: AdminHeaderProps) {
  const router = useRouter();
  const [adminName, setAdminName] = useState("Admin");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Ambil nama admin dari localStorage setelah mount (client-only)
  useEffect(() => {
    const session = localStorage.getItem("admin_session");
    if (session) setAdminName(session);
  }, []);

  // Tutup dropdown saat klik di luar
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{title}</h1>
          {subtitle && (
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">{subtitle}</p>
          )}
        </div>

        <div className="flex items-center gap-4">
          <NotifBell />

          {/* Profile dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen((v) => !v)}
              className="flex items-center gap-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl px-2 py-1.5 transition-colors"
            >
              <div className="w-9 h-9 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center flex-shrink-0">
                <HiUser className="text-slate-500 dark:text-slate-300 text-lg" />
              </div>
              <div className="text-sm leading-tight text-left">
                <p className="font-semibold text-slate-800 dark:text-slate-100">{adminName}</p>
                <p className="text-slate-500 dark:text-slate-400 text-xs">Staff KWU</p>
              </div>
              <HiChevronDown
                className={`text-slate-400 dark:text-slate-500 text-sm transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`}
              />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-lg py-1 z-50">
                <button
                  onClick={() => { setShowEditModal(true); setDropdownOpen(false); }}
                  className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  <HiPencilSquare className="text-base text-slate-400 dark:text-slate-500" />
                  Edit Profil
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Blue divider */}
      <div className="h-[3px] bg-[#487ADB] w-full shadow-sm rounded-none" />

      {showEditModal && (
        <EditProfilModal
          currentUsername={adminName}
          onClose={() => setShowEditModal(false)}
          onSaved={(newName) => setAdminName(newName)}
        />
      )}
    </>
  );
}
