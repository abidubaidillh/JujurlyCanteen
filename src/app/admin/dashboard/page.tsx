"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../scan/supabase-logic";
import { HiShoppingCart, HiCurrencyDollar, HiCheckCircle } from "react-icons/hi2";
import AdminHeader from "../../../components/admin/AdminHeader";

// ─── Chart Types ────────────────────────────────────────────────────────────

type ChartFilter = "weekly" | "monthly" | "yearly";

interface ChartPoint {
  label: string;
  value: number;
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

function LineChart({ data }: { data: ChartPoint[] }) {
  if (data.length === 0) {
    return (
      <div className="w-full h-40 flex items-center justify-center text-slate-400 text-sm">
        Tidak ada data untuk periode ini.
      </div>
    );
  }

  const W = 480, H = 160, padX = 40, padY = 36;
  const chartW = W - padX * 2;
  const chartH = H - padY;
  const maxVal = Math.max(...data.map((d) => d.value));
  const range = maxVal === 0 ? 1 : maxVal;

  const pts = data.map((d, i) => ({
    x: data.length === 1 ? padX + chartW / 2 : padX + (i / (data.length - 1)) * chartW,
    y: padY + (1 - d.value / range) * chartH,
    label: d.label,
    value: d.value,
  }));

  const smooth = pts.map((p, i) => {
    if (i === 0) return `M ${p.x},${p.y}`;
    const prev = pts[i - 1];
    const cpx = (prev.x + p.x) / 2;
    return `C ${cpx},${prev.y} ${cpx},${p.y} ${p.x},${p.y}`;
  }).join(" ");

  const totalH = H + padY;
  const areaPath = `${smooth} L ${pts[pts.length - 1].x},${totalH} L ${pts[0].x},${totalH} Z`;
  const peakIdx = pts.reduce((best, _, i) => (data[i].value > data[best].value ? i : best), 0);

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${totalH + 28}`} className="w-full min-w-[320px]">
        <defs>
          <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4A81D4" stopOpacity="0.3" />
            <stop offset="80%" stopColor="#4A81D4" stopOpacity="0.05" />
            <stop offset="100%" stopColor="#4A81D4" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#lineGrad)" />
        <path d={smooth} fill="none" stroke="#4A81D4" strokeWidth="2.5" strokeLinecap="round" />
        {pts.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="4" fill="#4A81D4" stroke="white" strokeWidth="2" />
            {i === peakIdx && (
              <g>
                <rect x={p.x - 44} y={p.y - 34} width="88" height="22" rx="5" fill="#1e3a5f" />
                <polygon points={`${p.x - 5},${p.y - 12} ${p.x + 5},${p.y - 12} ${p.x},${p.y - 6}`} fill="#1e3a5f" />
                <text x={p.x} y={p.y - 18} textAnchor="middle" fill="white" fontSize="9" fontWeight="600">
                  {`Rp ${p.value.toLocaleString("id-ID")}`}
                </text>
              </g>
            )}
          </g>
        ))}
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
    { pct: Math.round((counts.valid / total) * 100),   color: "#22c55e", label: "Valid" },
    { pct: Math.round((counts.pending / total) * 100), color: "#4A81D4", label: "Pending" },
    { pct: Math.round((counts.invalid / total) * 100), color: "#ef4444", label: "Invalid" },
  ];

  const cx = 70, cy = 70, r = 55, innerR = 24;
  let startAngle = -90;
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const arcs = segments.map((seg) => {
    const angle = (seg.pct / 100) * 360;
    const start = startAngle;
    const end = startAngle + angle;
    startAngle = end;
    const x1 = cx + r * Math.cos(toRad(start)), y1 = cy + r * Math.sin(toRad(start));
    const x2 = cx + r * Math.cos(toRad(end)),   y2 = cy + r * Math.sin(toRad(end));
    const ix1 = cx + innerR * Math.cos(toRad(end)),   iy1 = cy + innerR * Math.sin(toRad(end));
    const ix2 = cx + innerR * Math.cos(toRad(start)), iy2 = cy + innerR * Math.sin(toRad(start));
    const large = angle > 180 ? 1 : 0;
    return {
      d: `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} L ${ix1} ${iy1} A ${innerR} ${innerR} 0 ${large} 0 ${ix2} ${iy2} Z`,
      color: seg.color, label: seg.label, pct: seg.pct,
    };
  });

  const fontSize = Math.max(12, Math.min(20, 24 - String(total).length * 1.5));

  return (
    <div className="flex items-center gap-4 justify-center">
      <svg viewBox="0 0 140 140" className="w-36 h-36 flex-shrink-0">
        {arcs.map((arc, i) => <path key={i} d={arc.d} fill={arc.color} />)}
        <text x={cx} y={cy - 4} textAnchor="middle" fill="#4A81D4" fontSize={fontSize} fontWeight="700">{total}</text>
        <text x={cx} y={cy + 12} textAnchor="middle" fill="#94a3b8" fontSize="8">Total Orders</text>
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
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<DashboardData>({
    totalTransaksi: 0,
    totalPendapatan: 0,
    recentTx: [],
    statusCounts: { valid: 0, pending: 0, invalid: 0 },
  });

  const [chartFilter, setChartFilter] = useState<ChartFilter>("weekly");
  const [chartPoints, setChartPoints] = useState<ChartPoint[]>([]);
  const [chartLoading, setChartLoading] = useState(true);

  const getDateRange = (filter: ChartFilter) => {
    const to = new Date();
    const from = new Date();
    if (filter === "weekly") from.setDate(to.getDate() - 6);
    else if (filter === "monthly") from.setDate(to.getDate() - 29);
    else from.setFullYear(to.getFullYear() - 1);
    from.setHours(0, 0, 0, 0);
    return { from, to };
  };

  const aggregateToPoints = useCallback((rows: TxRow[], filter: ChartFilter): ChartPoint[] => {
    const map = new Map<string, number>();
    if (filter === "weekly") {
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        map.set(d.toLocaleDateString("id-ID", { day: "2-digit", month: "short" }), 0);
      }
      rows.forEach((r) => {
        const key = new Date(r.waktu_transaksi).toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
        if (map.has(key)) map.set(key, (map.get(key) ?? 0) + r.nominal);
      });
    } else if (filter === "monthly") {
      const labels = ["Minggu 1", "Minggu 2", "Minggu 3", "Minggu 4"];
      labels.forEach((l) => map.set(l, 0));
      const base = new Date();
      base.setDate(base.getDate() - 29);
      rows.forEach((r) => {
        const diff = Math.floor((new Date(r.waktu_transaksi).getTime() - base.getTime()) / 86400000);
        map.set(labels[Math.min(Math.floor(diff / 7), 3)], (map.get(labels[Math.min(Math.floor(diff / 7), 3)]) ?? 0) + r.nominal);
      });
    } else {
      for (let i = 11; i >= 0; i--) {
        const d = new Date();
        d.setDate(1);
        d.setMonth(d.getMonth() - i);
        map.set(d.toLocaleDateString("id-ID", { month: "short", year: "2-digit" }), 0);
      }
      rows.forEach((r) => {
        const key = new Date(r.waktu_transaksi).toLocaleDateString("id-ID", { month: "short", year: "2-digit" });
        if (map.has(key)) map.set(key, (map.get(key) ?? 0) + r.nominal);
      });
    }
    return Array.from(map.entries()).map(([label, value]) => ({ label, value }));
  }, []);

  const fetchChartData = useCallback(async (filter: ChartFilter) => {
    setChartLoading(true);
    try {
      const { from } = getDateRange(filter);
      const { data: rows, error } = await supabase
        .from("transaksi")
        .select("nominal, waktu_transaksi")
        .eq("status_validasi", "Valid")
        .gte("waktu_transaksi", from.toISOString())
        .order("waktu_transaksi", { ascending: true });
      if (error) throw error;
      setChartPoints(aggregateToPoints((rows as TxRow[]) ?? [], filter));
    } catch (err) {
      console.error("[Chart]", err);
      setChartPoints([]);
    } finally {
      setChartLoading(false);
    }
  }, [aggregateToPoints]);

  const fetchDashboard = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: all, error } = await supabase
        .from("transaksi")
        .select("id_transaksi, nominal, metode_pembayaran, waktu_transaksi, status_validasi")
        .order("waktu_transaksi", { ascending: false });
      if (error) throw error;
      const rows = (all as TxRow[]) ?? [];
      setData({
        totalTransaksi: rows.length,
        totalPendapatan: rows.filter((r) => r.status_validasi === "Valid").reduce((s, r) => s + r.nominal, 0),
        recentTx: rows.slice(0, 5),
        statusCounts: {
          valid:   rows.filter((r) => r.status_validasi === "Valid").length,
          pending: rows.filter((r) => r.status_validasi === "Pending").length,
          invalid: rows.filter((r) => r.status_validasi === "Invalid").length,
        },
      });
    } catch (err) {
      console.error("[Dashboard]", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);
  useEffect(() => { fetchChartData(chartFilter); }, [chartFilter, fetchChartData]);

  const fmtKpi = (n: number) => "Rp " + n.toLocaleString("id-ID");

  return (
    <div className="p-8 space-y-6">
      <AdminHeader title="Dashboard" subtitle="let's start manage canteen" />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-5">
        <KpiCard icon={HiShoppingCart} iconBg="bg-blue-400" title="Total Transaction"
          value={isLoading ? "..." : data.totalTransaksi.toString()} />
        <KpiCard icon={HiCurrencyDollar} iconBg="bg-green-400" title="Total Pendapatan"
          value={isLoading ? "..." : fmtKpi(data.totalPendapatan)} />
      </div>

      {/* Chart */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="font-semibold text-slate-800">Sales Overview</p>
          <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
            {([
              { key: "weekly",  label: "Mingguan" },
              { key: "monthly", label: "Bulanan" },
              { key: "yearly",  label: "Tahunan" },
            ] as { key: ChartFilter; label: string }[]).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setChartFilter(key)}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                  chartFilter === key ? "bg-white text-[#4A81D4] shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        {chartLoading ? (
          <div className="w-full h-40 flex items-center justify-center text-slate-400 text-sm">Memuat grafik...</div>
        ) : (
          <LineChart data={chartPoints} />
        )}
      </div>

      {/* Recent Transaction + Donut */}
      <div className="grid grid-cols-3 gap-5">
        <div className="col-span-2 bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <p className="font-semibold text-slate-800">Recent Transaction</p>
          </div>
          <TransactionTable rows={data.recentTx} isLoading={isLoading} />
        </div>
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
          <p className="font-semibold text-slate-800 mb-5">Orders Status Overview</p>
          <DonutChart counts={data.statusCounts} />
        </div>
      </div>
    </div>
  );
}
