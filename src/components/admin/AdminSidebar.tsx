"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  HiHome,
  HiArrowRightOnRectangle,
} from "react-icons/hi2";

const navItems = [
  { label: "Dashboard",   href: "/admin/dashboard" },
  { label: "Stock",       href: "/admin/stock",       imgSrc: "/stock.png" },
  { label: "Transaction", href: "/admin/transaction", imgSrc: "/transaction.png" },
  { label: "Reports",     href: "/admin/reports",     imgSrc: "/reports.png" },
  { label: "Users",       href: "/admin/users",       imgSrc: "/users.png" },
  { label: "Settings",    href: "/admin/settings",    imgSrc: "/settings.png" },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    if (window.confirm("Apakah Anda yakin ingin keluar?")) {
      localStorage.removeItem("admin_session");
      router.push("/admin/login");
    }
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-[#4A81D4] dark:bg-slate-900 flex flex-col z-50 border-r border-transparent dark:border-slate-800">
      {/* ── Logo ── */}
      <div className="flex items-center gap-3 px-6 py-6 border-b border-blue-400/40 dark:border-slate-800">
        <div className="w-9 h-9 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
          <img src="/logo.png" alt="Logo Jujurly" width={15} height={20} className="object-contain" />
        </div>
        <div>
          <p className="text-white font-bold text-base leading-tight">JUJURLY</p>
          <p className="text-white/60 dark:text-slate-400 text-xs">Canteen System</p>
        </div>
      </div>

      {/* ── Nav ── */}
      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive
                  ? "bg-blue-100 text-[#4A81D4] dark:bg-slate-700 dark:text-blue-400"
                  : "text-white dark:text-slate-300 hover:bg-white/10 dark:hover:bg-slate-800"
              }`}
            >
              {item.imgSrc ? (
                <img
                  src={item.imgSrc}
                  alt={item.label}
                  className="w-5 h-5 object-contain flex-shrink-0"
                  style={
                    isActive
                      ? { filter: "invert(36%) sepia(84%) saturate(1900%) hue-rotate(215deg) brightness(95%) contrast(93%)" }
                      : { filter: "brightness(0) invert(1)" }
                  }
                />
              ) : (
                <HiHome className={`text-lg flex-shrink-0 ${isActive ? "text-[#4A81D4]" : "text-white"}`} />
              )}
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* ── Logout ── */}
      <div className="px-4 pb-6 mt-auto border-t border-blue-400/40 dark:border-slate-800 pt-4">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl transition-all duration-200 text-red-300 hover:bg-red-500 hover:text-white font-medium text-sm border border-red-400/30 hover:border-transparent dark:text-red-400 dark:border-red-500/30 dark:hover:bg-red-600"
        >
          <HiArrowRightOnRectangle className="w-5 h-5 flex-shrink-0" />
          Logout
        </button>
      </div>
    </aside>
  );
}
