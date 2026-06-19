"use client";

import { useState } from "react";
import {
  HiComputerDesktop,
  HiMoon,
  HiSun,
  HiDevicePhoneMobile,
  HiGlobeAlt,
  HiArrowRightOnRectangle,
  HiCheckCircle,
  HiTrash,
  HiWrenchScrewdriver,
} from "react-icons/hi2";
import AdminHeader from "../../../components/admin/AdminHeader";

// ─── Types ─────────────────────────────────────────────────────────────────

type Theme = "light" | "dark" | "system";

interface SessionDevice {
  id: number;
  browser: string;
  os: string;
  location: string;
  lastActive: string;
  isCurrent: boolean;
}

// ─── Dummy Data ────────────────────────────────────────────────────────────

const dummySessions: SessionDevice[] = [
  {
    id: 1,
    browser: "Chrome 124",
    os: "Windows 11",
    location: "Yogyakarta, ID",
    lastActive: "Saat ini",
    isCurrent: true,
  },
  {
    id: 2,
    browser: "Safari 17",
    os: "iPhone 15",
    location: "Jakarta, ID",
    lastActive: "3 jam lalu",
    isCurrent: false,
  },
  {
    id: 3,
    browser: "Firefox 125",
    os: "macOS Sonoma",
    location: "Bandung, ID",
    lastActive: "Kemarin, 14:22",
    isCurrent: false,
  },
];

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

// ─── Toast ─────────────────────────────────────────────────────────────────

function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useState(() => {
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  });
  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-white border border-emerald-200 shadow-lg rounded-xl px-4 py-3">
      <HiCheckCircle className="text-emerald-500 text-xl flex-shrink-0" />
      <p className="text-sm font-medium text-slate-700">{message}</p>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  // Appearance
  const [theme, setTheme] = useState<Theme>("system");

  // Sessions
  const [sessions, setSessions] = useState<SessionDevice[]>(dummySessions);

  // Data Management
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [cacheCleared, setCacheCleared] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const handleLogoutDevice = (id: number) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
    setToast("Berhasil logout dari perangkat tersebut.");
  };

  const handleClearCache = () => {
    setCacheCleared(true);
    setToast("Cache berhasil dihapus.");
    setTimeout(() => setCacheCleared(false), 3000);
  };

  const themeOptions: { value: Theme; label: string; icon: React.ElementType; desc: string }[] = [
    { value: "light",  label: "Mode Terang",    icon: HiSun,             desc: "Selalu gunakan tampilan terang" },
    { value: "dark",   label: "Mode Gelap",     icon: HiMoon,            desc: "Selalu gunakan tampilan gelap" },
    { value: "system", label: "Ikuti Sistem",   icon: HiComputerDesktop, desc: "Sesuaikan dengan preferensi perangkat" },
  ];

  return (
    <div className="p-8 space-y-6">
      <AdminHeader
        title="System Settings"
        subtitle="Manage appearance, sessions, and system configurations"
      />

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}

      <div className="bg-white rounded-xl border border-slate-100 shadow-sm divide-y divide-slate-100">

        {/* ── Section 1: Appearance ─────────────────────────────────────── */}
        <div className="p-6">
          <div className="flex items-center gap-2.5 mb-1">
            <HiSun className="text-[#4A81D4] text-lg" />
            <p className="font-bold text-slate-800">Appearance</p>
          </div>
          <p className="text-xs text-slate-400 mb-5 ml-7">Pilih tema tampilan panel admin</p>

          <div className="grid grid-cols-3 gap-3">
            {themeOptions.map(({ value, label, icon: Icon, desc }) => (
              <button
                key={value}
                onClick={() => setTheme(value)}
                className={`flex flex-col items-start gap-2 p-4 rounded-xl border-2 text-left transition-all ${
                  theme === value
                    ? "border-[#4A81D4] bg-blue-50"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
              >
                <Icon
                  className={`text-xl ${theme === value ? "text-[#4A81D4]" : "text-slate-400"}`}
                />
                <div>
                  <p className={`text-sm font-semibold ${theme === value ? "text-[#4A81D4]" : "text-slate-700"}`}>
                    {label}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* ── Section 2: Security & Sessions ───────────────────────────── */}
        <div className="p-6">
          <div className="flex items-center gap-2.5 mb-1">
            <HiGlobeAlt className="text-[#4A81D4] text-lg" />
            <p className="font-bold text-slate-800">Security &amp; Sessions</p>
          </div>
          <p className="text-xs text-slate-400 mb-5 ml-7">
            Perangkat yang saat ini memiliki akses ke panel admin
          </p>

          <div className="space-y-3">
            {sessions.length === 0 ? (
              <p className="text-sm text-slate-400 py-4 text-center">Tidak ada sesi aktif lainnya.</p>
            ) : (
              sessions.map((s) => (
                <div
                  key={s.id}
                  className={`flex items-center justify-between p-4 rounded-xl border ${
                    s.isCurrent ? "border-[#4A81D4]/30 bg-blue-50/50" : "border-slate-100 bg-slate-50/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      s.isCurrent ? "bg-[#4A81D4]/10" : "bg-slate-100"
                    }`}>
                      {s.os.includes("iPhone") || s.os.includes("Android") ? (
                        <HiDevicePhoneMobile className={`text-lg ${s.isCurrent ? "text-[#4A81D4]" : "text-slate-400"}`} />
                      ) : (
                        <HiComputerDesktop className={`text-lg ${s.isCurrent ? "text-[#4A81D4]" : "text-slate-400"}`} />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-slate-800">{s.browser} · {s.os}</p>
                        {s.isCurrent && (
                          <span className="text-xs font-medium bg-[#4A81D4] text-white px-2 py-0.5 rounded-full">
                            Saat ini
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{s.location} · {s.lastActive}</p>
                    </div>
                  </div>

                  {!s.isCurrent && (
                    <button
                      onClick={() => handleLogoutDevice(s.id)}
                      className="flex items-center gap-1.5 text-xs font-semibold text-red-500 hover:text-white hover:bg-red-500 border border-red-200 hover:border-transparent px-3 py-1.5 rounded-lg transition-all"
                    >
                      <HiArrowRightOnRectangle className="text-sm" />
                      Logout
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── Section 3: Data Management ────────────────────────────────── */}
        <div className="p-6">
          <div className="flex items-center gap-2.5 mb-1">
            <HiWrenchScrewdriver className="text-[#4A81D4] text-lg" />
            <p className="font-bold text-slate-800">Data Management</p>
          </div>
          <p className="text-xs text-slate-400 mb-5 ml-7">Konfigurasi pemeliharaan dan performa sistem</p>

          <div className="space-y-4">
            {/* Maintenance Mode */}
            <div className="flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-slate-50/50">
              <div>
                <p className="text-sm font-semibold text-slate-800">Maintenance Mode</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {maintenanceMode
                    ? "Sistem sedang dalam pemeliharaan — akses pengguna dibatasi"
                    : "Sistem berjalan normal"}
                </p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                <span className={`text-xs font-semibold ${maintenanceMode ? "text-amber-500" : "text-slate-400"}`}>
                  {maintenanceMode ? "Aktif" : "Nonaktif"}
                </span>
                <Toggle checked={maintenanceMode} onChange={setMaintenanceMode} />
              </div>
            </div>

            {/* Hapus Cache */}
            <div className="flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-slate-50/50">
              <div>
                <p className="text-sm font-semibold text-slate-800">Hapus Cache Sistem</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Bersihkan data cache untuk memastikan performa optimal
                </p>
              </div>
              <button
                onClick={handleClearCache}
                disabled={cacheCleared}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 ml-4"
              >
                <HiTrash className="text-base" />
                {cacheCleared ? "Cache Dihapus" : "Hapus Cache"}
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
