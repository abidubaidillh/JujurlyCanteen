"use client";

import { useState, useEffect, useRef } from "react";
import { HiBell } from "react-icons/hi2";
import { supabase } from "../../app/scan/supabase-logic";

interface Notif {
  id_log: number;
  pesan: string;
  waktu: string;
}

export default function NotifBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notif[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchNotif = async () => {
      const { data } = await supabase
        .from("log_notifikasi")
        .select("*")
        .order("waktu", { ascending: false })
        .limit(5);
      const rows = (data as Notif[]) ?? [];
      setNotifications(rows);
      setUnreadCount(rows.length);
    };
    fetchNotif();
  }, []);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const fmtWaktu = (s: string) =>
    new Date(s).toLocaleString("id-ID", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="w-10 h-10 bg-white rounded-full border border-slate-100 shadow-sm flex items-center justify-center hover:bg-slate-50 transition-colors"
        aria-label="Notifikasi"
      >
        <HiBell className="text-[#4A81D4] text-xl" />
      </button>

      {/* Badge */}
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 border-2 border-white">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-12 w-80 bg-white rounded-xl shadow-lg border border-slate-100 z-50 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-slate-100">
            <p className="font-semibold text-slate-800 text-sm">Notifikasi</p>
          </div>

          {/* Content */}
          {notifications.length === 0 ? (
            <div className="p-6 text-center text-gray-500 text-sm">
              Belum ada notifikasi baru.
            </div>
          ) : (
            <ul>
              {notifications.map((n) => (
                <li
                  key={n.id_log}
                  className="px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0"
                >
                  <p className="text-slate-700 text-sm leading-snug">{n.pesan}</p>
                  <p className="text-slate-400 text-xs mt-1">{fmtWaktu(n.waktu)}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
