"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  HiHome,
  HiUser,
  HiCheckCircle,
} from "react-icons/hi2";
import NotifBell from "../../../components/ui/NotifBell";

// ─── Sidebar ───────────────────────────────────────────────────────────────

type NavItem = { label: string; active: boolean; href: string; imgSrc?: string };

const navItems: NavItem[] = [
  { label: "Dashboard",   active: false, href: "/admin/dashboard" },
  { label: "Stock",       active: false, href: "/admin/stock",       imgSrc: "/stock.png" },
  { label: "Transaction", active: false, href: "/admin/transaction", imgSrc: "/transaction.png" },
  { label: "Reports",     active: false, href: "/admin/reports",     imgSrc: "/reports.png" },
  { label: "Users",       active: false, href: "/admin/users",       imgSrc: "/users.png" },
  { label: "Settings",    active: true,  href: "/admin/settings",    imgSrc: "/settings.png" },
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

// ─── Toast ─────────────────────────────────────────────────────────────────

function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  // auto-dismiss after 3s
  useState(() => {
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  });

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-white border border-emerald-200 shadow-lg rounded-xl px-4 py-3 animate-fade-in">
      <HiCheckCircle className="text-emerald-500 text-xl flex-shrink-0" />
      <p className="text-sm font-medium text-slate-700">{message}</p>
    </div>
  );
}

// ─── Toggle Switch ─────────────────────────────────────────────────────────

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#4A81D4]/40 ${
        checked ? "bg-[#4A81D4]" : "bg-slate-200"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

// ─── Field wrapper ─────────────────────────────────────────────────────────

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-slate-400 mt-1.5">{hint}</p>}
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const router = useRouter();

  const handleLogout = () => {
    if (window.confirm("Apakah Anda yakin ingin keluar?")) {
      localStorage.removeItem("admin_session");
      router.push("/admin/login");
    }
  };

  // Profile form
  const [username, setUsername] = useState("Admin");
  const [password, setPassword] = useState("");

  // System config
  const [kantinOpen, setKantinOpen] = useState(true);
  const [confidence, setConfidence] = useState(80);
  const [expiry, setExpiry] = useState(5);
  const [adminName, setAdminName] = useState("Admin");

  useEffect(() => {
    const session = localStorage.getItem("admin_session");
    if (session) setAdminName(session);
  }, []);

  // Toast
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
  };

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    // dummy — would call supabase update on 'admin' table here
    showToast("Profil berhasil diperbarui!");
    setPassword("");
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    // dummy — would persist config to supabase or env here
    showToast("Pengaturan berhasil disimpan!");
  };

  const inputCls =
    "w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4A81D4]/30 focus:border-[#4A81D4] transition bg-white";

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">
      <Sidebar onLogout={handleLogout} />

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}

      <div className="ml-64 flex-1 overflow-y-auto">
        <div className="p-8 space-y-6">

          {/* Top Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">System Settings</h1>
              <p className="text-slate-500 text-sm mt-0.5">
                Manage your account and system configurations
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

          {/* Two-column grid */}
          <div className="grid grid-cols-2 gap-6 items-start">

            {/* Card 1 — Profile Settings */}
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
              <p className="font-bold text-slate-800 mb-1">Profile Settings</p>
              <p className="text-xs text-slate-400 mb-5">Update your admin account credentials</p>

              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <Field label="Username">
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className={inputCls}
                    required
                  />
                </Field>

                <Field
                  label="New Password"
                  hint="Leave blank to keep your current password."
                >
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className={inputCls}
                  />
                </Field>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-lg bg-[#4A81D4] hover:bg-[#3a6fc0] text-white text-sm font-semibold transition-colors mt-2"
                >
                  Update Profile
                </button>
              </form>
            </div>

            {/* Card 2 — System Configuration */}
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
              <p className="font-bold text-slate-800 mb-1">System Configuration</p>
              <p className="text-xs text-slate-400 mb-5">Adjust validation and operational parameters</p>

              <form onSubmit={handleSaveConfig} className="space-y-5">

                {/* Toggle: Status Operasional */}
                <div className="flex items-center justify-between py-1">
                  <div>
                    <p className="text-sm font-medium text-slate-700">Status Operasional Kantin</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {kantinOpen
                        ? "Kantin sedang buka — menerima transaksi baru"
                        : "Kantin ditutup — tidak menerima transaksi baru"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2.5 flex-shrink-0 ml-4">
                    <span
                      className={`text-xs font-semibold ${
                        kantinOpen ? "text-emerald-600" : "text-slate-400"
                      }`}
                    >
                      {kantinOpen ? "Buka" : "Tutup"}
                    </span>
                    <Toggle checked={kantinOpen} onChange={setKantinOpen} />
                  </div>
                </div>

                <div className="border-t border-slate-100" />

                {/* Confidence Threshold */}
                <Field
                  label="Batas Minimal Akurasi AI (%)"
                  hint="Ambang batas minimal untuk mengesahkan pembacaan gambar dan teks (default: 80%)."
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={50}
                      max={100}
                      value={confidence}
                      onChange={(e) => setConfidence(Number(e.target.value))}
                      className="flex-1 accent-[#4A81D4]"
                    />
                    <span className="w-12 text-center text-sm font-semibold text-[#4A81D4] bg-blue-50 rounded-lg py-1">
                      {confidence}%
                    </span>
                  </div>
                </Field>

                {/* Expiry */}
                <Field
                  label="Batas Kedaluwarsa Struk (Menit)"
                  hint="Batas waktu maksimal struk QRIS dianggap valid sejak waktu pembayaran."
                >
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={expiry}
                    onChange={(e) => setExpiry(Number(e.target.value))}
                    className={inputCls}
                  />
                </Field>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-lg border border-[#4A81D4] text-[#4A81D4] text-sm font-semibold hover:bg-blue-50 transition-colors"
                >
                  Save Configuration
                </button>
              </form>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
