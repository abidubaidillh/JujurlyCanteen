"use client";

import { memo } from "react";

/**
 * MascotScan — reusable SVG robot component khusus untuk halaman scan.
 * Menampilkan status scanning pada layar wajah.
 */
const MascotScan = memo(function MascotScan() {
  return (
    <div className="select-none inline-flex flex-col items-center">
      <svg
        viewBox="0 0 680 520"
        xmlns="http://www.w3.org/2000/svg"
        className="w-24 sm:w-32 lg:w-48 h-auto"
        aria-hidden="true"
      >
        <style>{`
          @keyframes float  { 0%,100%{transform:translateY(0)}   50%{transform:translateY(-6px)} }
          @keyframes blink  { 0%,90%,100%{opacity:1}             95%{opacity:0} }
          @keyframes pulse  { 0%,100%{r:4}                       50%{r:5.5} }
          @keyframes wave   { 0%,100%{transform:rotate(-10deg)}  50%{transform:rotate(14deg)} }
          .float  { animation: float 2s ease-in-out infinite; transform-origin: 340px 260px; }
          .cursor { animation: blink 2.4s infinite; }
          .dot-g  { animation: pulse 2s    infinite; }
          .dot-y  { animation: pulse 2.3s  infinite; }
          .wave   { animation: wave  1.4s ease-in-out infinite; transform-origin: 533px 326px; }
        `}</style>

        <g className="float">
          {/* Shadow */}
          <ellipse cx="435" cy="490" rx="80" ry="12" fill="#c8dcee" opacity="0.5" />

          {/* Body */}
          <rect x="372" y="310" width="136" height="100" rx="36" fill="#dbeafe" />
          <rect x="372" y="310" width="136" height="100" rx="36" fill="none" stroke="#bfdbfe" strokeWidth="1.5" />
          <rect x="396" y="330" width="88" height="58" rx="14" fill="#bfdbfe" />

          {/* Chest lights */}
          <circle cx="418" cy="349" r="7" fill="#60a5fa" />
          <circle cx="418" cy="349" r="4" fill="#93c5fd" />
          <circle cx="440" cy="349" r="7" fill="#34d399" />
          <circle cx="440" cy="349" r="4" fill="#6ee7b7" />
          <circle cx="462" cy="349" r="7" fill="#f472b6" />
          <circle cx="462" cy="349" r="4" fill="#f9a8d4" />
          <rect x="405" y="367" width="70" height="8" rx="4" fill="#93c5fd" />

          {/* Left arm (static) */}
          <rect x="325" y="316" width="38" height="90" rx="19" fill="#bee3f8" stroke="#bfdbfe" strokeWidth="1" />
          <ellipse cx="345" cy="408" rx="18" ry="14" fill="#93c5fd" />

          {/* Right arm (waving) */}
          <g className="wave">
            <rect
              x="470"
              y="150"
              width="38"
              height="90"
              rx="19"
              fill="#bee3f8"
              stroke="#bfdbfe"
              strokeWidth="1"
              transform="rotate(60 405 326)"
            />
            <ellipse cx="490" cy="150" rx="18" ry="14" fill="#93c5fd" transform="rotate(60 405 326)" />
          </g>

          {/* Head */}
          <rect x="340" y="160" width="200" height="152" rx="52" fill="#dbeafe" />
          <rect x="340" y="160" width="200" height="152" rx="52" fill="none" stroke="#bfdbfe" strokeWidth="2" />

          {/* Ears */}
          <rect x="322" y="210" width="30" height="50" rx="20" fill="#93c5fd" stroke="#bfdbfe" strokeWidth="1" />
          <rect x="527" y="210" width="30" height="50" rx="20" fill="#93c5fd" stroke="#bfdbfe" strokeWidth="1" />

          {/* Face screen — khusus scan */}
          <rect x="372" y="188" width="136" height="88" rx="24" fill="#0f172a" />
          <rect x="372" y="188" width="136" height="88" rx="24" fill="none" stroke="#1e40af" strokeWidth="1.5" />
          <text x="390" y="225" fontFamily="monospace" fontSize="14" fill="#4ade80" fontWeight="bold">
            {`> Scan`}
          </text>
          <rect x="390" y="235" width="8" height="14" rx="1" fill="#4ade80" className="cursor" />
          <text x="390" y="262" fontFamily="monospace" fontSize="10" fill="#22d3ee" opacity="0.8">
            ready_to_scan...
          </text>

          {/* Antenna kiri */}
          <line x1="394" y1="164" x2="376" y2="118" stroke="#93c5fd" strokeWidth="3" strokeLinecap="round" />
          <circle cx="374" cy="110" r="12" fill="#d1fae5" stroke="#6ee7b7" strokeWidth="2" />
          <circle cx="374" cy="110" r="4" fill="#10b981" className="dot-g" />

          {/* Antenna kanan */}
          <line x1="486" y1="164" x2="504" y2="118" stroke="#93c5fd" strokeWidth="3" strokeLinecap="round" />
          <circle cx="506" cy="110" r="12" fill="#fef9c3" stroke="#fde047" strokeWidth="2" />
          <circle cx="506" cy="110" r="4" fill="#eab308" className="dot-y" />
        </g>
      </svg>
    </div>
  );
});

export default MascotScan;