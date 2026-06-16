"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../scan/supabase-logic";
import {
  HiHome,
  HiShoppingCart,
  HiCurrencyDollar,
  HiUserGroup,
  HiUser,
  HiCheckCircle,
} from "react-icons/hi2";
import NotifBell from "../../../components/ui/NotifBell";

// ─── Sidebar ───────────────────────────────────────────────────────────────

type NavItem = {
  label: string;
  active: boolean;
  href: string;
  imgSrc?: string;
};

const navItems: NavItem[] = [
  { label: "Dashboard", active: true,  href: "/admin/dashboard" },
  { label: "Stock",     active: false, href: "/admin/stock",       imgSrc: "/stock.png" },
  { label: "Transaction", active: false, href: "/admin/transaction", imgSrc: "/transaction.png" },
  { label: "Reports",   active: false, href: "/admin/reports",     imgSrc: "/reports.png" },
  { label: "Users",     active: false, href: "/admin/users",       imgSrc: "/users.png" },
  { label: "Settings",  active: false, href: "/admin/settings",    imgSrc: "/settings.png" },
];

function Sidebar({ onLogout }: { onLogout: () => void }) {
  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-[#4A81D4] flex flex-col z-50">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-6">
        <div className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden">
          <img src="/logo.png" alt="Logo Jujurly" width={15} height={20} className="object-contain" />
        </div>
        <div>
          <p className="text-white font-bold text-base leading-tight">JUJURLY</p>
          <p className="text-white/60 text-xs">Canteen System</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-4 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
              item.active
                ? "bg-blue-100 text-[#4A81D4]"
                : "text-white hover:bg-white/10"
            }`}
          >
            {item.imgSrc ? (
              <img
                src={item.imgSrc}
                alt={item.label}
                className="w-5 h-5 object-contain flex-shrink-0 transition-all duration-200 opacity-100"
                style={
                  item.active
                    ? { filter: "invert(36%) sepia(84%) saturate(1900%) hue-rotate(215deg) brightness(95%) contrast(93%)" }
                    : {}
                }
              />
            ) : (
              <HiHome className={`text-lg flex-shrink-0 ${item.active ? "text-[#4A81D4]" : "text-white"}`} />
            )}
            {item.label}
          </Link>
        ))}
      </nav>
      {/* Logout */}
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

interface TxRow {
  id_transaksi: number;
  nominal: number;
  metode_pembayaran: string;
  waktu_transaksi: string;
  status_validasi: string;
}

interface DashboardData {
  totalTransaksi: number;
  totalPendapatan: number;
  recentTx: TxRow[];
  statusCounts: { valid: number; pending: number; invalid: number };
}

// ─── Helpers ───────────────────────────────────────────────────────────────

const fmtRp = (n: number) => "Rp " + n.toLocaleString("id-ID");
const fmtTime = (s: string) =>
  new Date(s).toLocaleString("id-ID", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

// ─── Status Badge ──────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  if (status === "Valid")
    return (
      <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 text-xs font-semibold px-2.5 py-1 rounded-full">
        <HiCheckCircle className="text-sm" /> Valid
      </span>
    );
  if (status === "Pending")
    return (
      <span className="inline-flex items-center gap-1 bg-yellow-100 text-yellow-700 text-xs font-semibold px-2.5 py-1 rounded-full">
        Pending
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 bg-red-100 text-red-600 text-xs font-semibold px-2.5 py-1 rounded-full">
      Invalid
    </span>
  );
}

function KpiCard({
  icon: Icon,
  iconBg,
  title,
  value,
}: {
  icon: React.ElementType;
  iconBg: string;
  title: string;
  value: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 flex items-center gap-4">
      <div className={`w-12 h-12 ${iconBg} rounded-xl flex items-center justify-center flex-shrink-0`}>
        <Icon className="text-white text-xl" />
      </div>
      <div>
        <p className="text-slate-500 text-sm">{title}</p>
        <p className="text-slate-800 text-2xl font-bold leading-tight">{value}</p>
      </div>
    </div>
  );
}

// ─── Line Chart (SVG) ──────────────────────────────────────────────────────

const chartData = [
  { label: "11 May", value: 60 },
  { label: "12 May", value: 35 },
  { label: "13 May", value: 75 },
  { label: "14 May", value: 50 },
  { label: "15 May", value: 90 },
  { label: "16 May", value: 65 },
  { label: "17 May", value: 82 },
];

function LineChart() {
  const W = 480;
  const H = 160;
  const padX = 40;
  // Extra top padding so tooltip never clips at the top
  const padY = 36;
  const chartW = W - padX * 2;
  const chartH = H - padY;

  const max = Math.max(...chartData.map((d) => d.value));
  const pts = chartData.map((d, i) => ({
    x: padX + (i / (chartData.length - 1)) * chartW,
    y: padY + (1 - d.value / max) * chartH,
    label: d.label,
    value: d.value,
  }));

  // smooth cubic bezier
  const smooth = pts
    .map((p, i) => {
      if (i === 0) return `M ${p.x},${p.y}`;
      const prev = pts[i - 1];
      const cpx = (prev.x + p.x) / 2;
      return `C ${cpx},${prev.y} ${cpx},${p.y} ${p.x},${p.y}`;
    })
    .join(" ");

  // Area closes down to the bottom of the chart (H + padY)
  const totalH = H + padY;
  const areaPath = `${smooth} L ${pts[pts.length - 1].x},${totalH} L ${pts[0].x},${totalH} Z`;

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${totalH + 28}`} className="w-full min-w-[320px]">
        <defs>
          {/* Gradient: opaque at top of fill area, fully transparent at bottom */}
          <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4A81D4" stopOpacity="0.3" />
            <stop offset="80%" stopColor="#4A81D4" stopOpacity="0.05" />
            <stop offset="100%" stopColor="#4A81D4" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Area fill with gradient fade */}
        <path d={areaPath} fill="url(#lineGrad)" />

        {/* Line */}
        <path d={smooth} fill="none" stroke="#4A81D4" strokeWidth="2.5" strokeLinecap="round" />

        {/* Dots + tooltip */}
        {pts.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="4" fill="#4A81D4" stroke="white" strokeWidth="2" />
            {i === 4 && (
              <g>
                {/* Tooltip sits above the dot with a small caret */}
                <rect x={p.x - 40} y={p.y - 34} width="80" height="22" rx="5" fill="#1e3a5f" />
                <polygon
                  points={`${p.x - 5},${p.y - 12} ${p.x + 5},${p.y - 12} ${p.x},${p.y - 6}`}
                  fill="#1e3a5f"
                />
                <text x={p.x} y={p.y - 18} textAnchor="middle" fill="white" fontSize="9" fontWeight="600">
                  Rp 820.50
                </text>
              </g>
            )}
          </g>
        ))}

        {/* X axis labels */}
        {pts.map((p, i) => (
          <text key={i} x={p.x} y={totalH + 20} textAnchor="middle" fill="#94a3b8" fontSize="9">
            {p.label}
          </text>
        ))}
      </svg>
    </div>
  );
}

// ─── Donut Chart (SVG) ─────────────────────────────────────────────────────

function DonutChart({ counts }: { counts: { valid: number; pending: number; invalid: number } }) {
  const total = counts.valid + counts.pending + counts.invalid || 1;

  const segments = [
    { count: counts.valid,   pct: Math.round((counts.valid   / total) * 100), color: "#22c55e", label: "Valid" },
    { count: counts.pending, pct: Math.round((counts.pending / total) * 100), color: "#4A81D4", label: "Pending" },
    { count: counts.invalid, pct: Math.round((counts.invalid / total) * 100), color: "#ef4444", label: "Invalid" },
  ];

  const cx = 70, cy = 70, r = 55, innerR = 24;
  let startAngle = -90;

  const arcs = segments.map((seg) => {
    const angle = (seg.pct / 100) * 360;
    const start = startAngle;
    const end = startAngle + angle;
    startAngle = end;

    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const x1 = cx + r * Math.cos(toRad(start));
    const y1 = cy + r * Math.sin(toRad(start));
    const x2 = cx + r * Math.cos(toRad(end));
    const y2 = cy + r * Math.sin(toRad(end));
    const ix1 = cx + innerR * Math.cos(toRad(end));
    const iy1 = cy + innerR * Math.sin(toRad(end));
    const ix2 = cx + innerR * Math.cos(toRad(start));
    const iy2 = cy + innerR * Math.sin(toRad(start));
    const large = angle > 180 ? 1 : 0;

    return {
      d: `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} L ${ix1} ${iy1} A ${innerR} ${innerR} 0 ${large} 0 ${ix2} ${iy2} Z`,
      color: seg.color,
      label: seg.label,
      pct: seg.pct,
    };
  });

  // 🔹 Ukuran font dinamis berdasarkan total digit
  const totalDigits = String(total).length;
  const fontSize = Math.max(12, Math.min(20, 24 - totalDigits * 1.5));

  return (
    <div className="flex items-center gap-4 justify-center">
      <svg viewBox="0 0 140 140" className="w-36 h-36 flex-shrink-0">
        {arcs.map((arc, i) => (
          <path key={i} d={arc.d} fill={arc.color} />
        ))}
        <text x={cx} y={cy - 4} textAnchor="middle" fill="#4A81D4" fontSize={fontSize} fontWeight="700">
          {total}
        </text>
        <text x={cx} y={cy + 12} textAnchor="middle" fill="#94a3b8" fontSize="8">
          Total Orders
        </text>
      </svg>
      <div className="space-y-2">
        {segments.map((s) => (
          <div key={s.label} className="flex items-center gap-2 text-sm">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
            <span className="text-slate-600">{s.label}</span>
            <span className="text-slate-400 text-xs">{s.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Transaction Table ─────────────────────────────────────────────────────

function TransactionTable({ rows, isLoading }: { rows: TxRow[]; isLoading: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-100">
            {["ID Transaksi", "Nominal", "Metode Pembayaran", "Waktu", "Status"].map((h) => (
              <th key={h} className="text-left px-4 py-3 text-slate-500 font-semibold text-xs uppercase tracking-wide">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400 text-sm">Memuat data...</td></tr>
          ) : rows.length === 0 ? (
            <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400 text-sm">Belum ada transaksi.</td></tr>
          ) : rows.map((tx, i) => (
            <tr key={tx.id_transaksi} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
              <td className="px-4 py-3 text-slate-700 font-mono text-xs">#{tx.id_transaksi}</td>
              <td className="px-4 py-3 text-slate-700">{fmtRp(tx.nominal)}</td>
              <td className="px-4 py-3 text-slate-700">{tx.metode_pembayaran}</td>
              <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{fmtTime(tx.waktu_transaksi)}</td>
              <td className="px-4 py-3"><StatusBadge status={tx.status_validasi} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const router = useRouter();

  const handleLogout = () => {
    if (window.confirm("Apakah Anda yakin ingin keluar?")) {
      localStorage.removeItem("admin_session");
      router.push("/admin/login");
    }
  };

  const bestSelling = [
    "Pucuk harum",
    "Air mineral",
    "Roti",
    "Golda coffee",
    "Beng-beng",
  ];

  const [isLoading, setIsLoading] = useState(true);
  const [adminName, setAdminName] = useState("Admin");
  const [data, setData] = useState<DashboardData>({
    totalTransaksi: 0,
    totalPendapatan: 0,
    recentTx: [],
    statusCounts: { valid: 0, pending: 0, invalid: 0 },
  });

  const fetchDashboard = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch all transactions for KPI + status counts
      const { data: all, error } = await supabase
        .from("transaksi")
        .select("id_transaksi, nominal, metode_pembayaran, waktu_transaksi, status_validasi")
        .order("waktu_transaksi", { ascending: false });

      if (error) throw error;
      const rows = (all as TxRow[]) ?? [];

      const totalTransaksi = rows.length;
      const totalPendapatan = rows
        .filter((r) => r.status_validasi === "Valid")
        .reduce((s, r) => s + r.nominal, 0);
      const statusCounts = {
        valid:   rows.filter((r) => r.status_validasi === "Valid").length,
        pending: rows.filter((r) => r.status_validasi === "Pending").length,
        invalid: rows.filter((r) => r.status_validasi === "Invalid").length,
      };
      const recentTx = rows.slice(0, 5);

      setData({ totalTransaksi, totalPendapatan, recentTx, statusCounts });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal memuat data.";
      console.error("[Dashboard]", msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const session = localStorage.getItem("admin_session");
    if (session) setAdminName(session);
    fetchDashboard();
  }, [fetchDashboard]);

  const fmtKpi = (n: number) => "Rp " + n.toLocaleString("id-ID");

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">
      <Sidebar onLogout={handleLogout} />

      {/* Main content */}
      <div className="ml-64 flex-1 overflow-y-auto">
        <div className="p-8 space-y-6">

          {/* Top Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Welcome back, {adminName}</h1>
              <p className="text-slate-500 text-sm mt-0.5">let&apos;s start manage canteen</p>
            </div>
            <div className="flex items-center gap-4">
              {/* Bell */}
              <NotifBell />
              {/* Profile */}
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

          {/* Row 1: KPI Cards */}
          <div className="grid grid-cols-3 gap-5">
            <KpiCard icon={HiShoppingCart} iconBg="bg-blue-400" title="Total Transaction"
              value={isLoading ? "..." : data.totalTransaksi.toString()} />
            <KpiCard icon={HiCurrencyDollar} iconBg="bg-green-400" title="Total Pendapatan"
              value={isLoading ? "..." : fmtKpi(data.totalPendapatan)} />
            <KpiCard icon={HiUserGroup} iconBg="bg-yellow-400" title="Total Pembeli"
              value={isLoading ? "..." : data.totalTransaksi.toString()} />
          </div>

          {/* Row 2: Chart + Best Selling */}
          <div className="grid grid-cols-3 gap-5">
            {/* Sales Overview — 2/3 */}
            <div className="col-span-2 bg-white rounded-xl border border-slate-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="font-semibold text-slate-800">Sales Overview (Daily)</p>
                <select className="text-xs text-slate-500 bg-slate-100 border-0 rounded-lg px-3 py-1.5 cursor-pointer">
                  <option>This Week</option>
                  <option>Last Week</option>
                </select>
              </div>
              <LineChart />
            </div>

            {/* Top 5 Best Selling — 1/3 */}
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
              <p className="font-semibold text-slate-800 mb-4">Top 5 Best Selling</p>
              <div className="space-y-0">
                {bestSelling.map((item, i) => (
                  <div key={i}>
                    <div className="flex items-center gap-3 py-3">
                      <span className="w-6 h-6 bg-blue-50 text-[#4A81D4] text-xs font-bold rounded-full flex items-center justify-center flex-shrink-0">
                        {i + 1}
                      </span>
                      <span className="text-slate-700 text-sm">{item}</span>
                    </div>
                    {i < bestSelling.length - 1 && <div className="border-t border-slate-100" />}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Row 3: Table + Donut */}
          <div className="grid grid-cols-3 gap-5">
            {/* Recent Transaction — 2/3 */}
            <div className="col-span-2 bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <p className="font-semibold text-slate-800">Recent Transaction</p>
              </div>
              <TransactionTable rows={data.recentTx} isLoading={isLoading} />
            </div>

            {/* Orders Status Overview — 1/3 */}
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
              <p className="font-semibold text-slate-800 mb-5">Orders Status Overview</p>
              <DonutChart counts={data.statusCounts} />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
