"use client";

interface PhoneBoxType {
  x: number;
  y: number;
  w: number;
  h: number;
  confidence?: number;
  isTolerating?: boolean;
  status?: "phone_detected" | "unknown_object" | string;
}

export const ScanOverlay = ({
  isCapturing,
  status,
  isCVReady,
  phoneBox,
  videoWidth = 720,
  videoHeight = 1280,
}: {
  isCapturing: boolean;
  status: string;
  isCVReady: boolean;
  phoneBox?: PhoneBoxType | null;
  videoWidth?: number;
  videoHeight?: number;
}) => {
  const isDenied = status === "Akses Kamera Denied";

  const isStable = status === "stable";
  const isDetected = status === "detecting" || isStable;

  const topStatusClass = isCapturing
    ? "bg-yellow-500 shadow-lg"
    : isDenied
      ? "bg-red-500/80 shadow-lg"
      : isStable
        ? "bg-yellow-500/40 shadow-lg"
        : "bg-[#5EBA59]/30";

  const topStatusText = isCapturing
    ? "⏳ Processing Capture"
    : isDenied
      ? `🔴 ${status}`
      : isStable
        ? "🟢 STABLE - READY TO CAPTURE"
        : `🟡 ${status}`;

  const frameClass = isCapturing
    ? "border-yellow-400 shadow-[0_0_30px_rgba(250,204,21,0.5)] scale-95"
    : isStable
      ? "border-yellow-400 shadow-[0_0_30px_rgba(34,197,94,0.5)] scale-100"
      : isDenied
        ? "border-red-400 shadow-[0_0_30px_rgba(239,68,68,0.4)]"
        : "border-[#487ADB]/60 shadow-[0_0_20px_rgba(72,122,219,0.3)]";

  const scaleX = 100 / videoWidth;
  const scaleY = 100 / videoHeight;

  const isErrorBox = phoneBox?.status === "phone_detected" || phoneBox?.status === "unknown_object";

  return (
    <>
      {/* STATUS TOP */}
      <div
        className={`absolute top-3 left-1/2 -translate-x-1/2 text-white text-[10px] font-bold uppercase tracking-widest px-4 py-1.5 rounded-full z-30 transition-all duration-300 ${topStatusClass}`}
      >
        {topStatusText}
      </div>

      {/* YOLO BOX */}
      {phoneBox && (
        <div
          className={`absolute z-20 border-4 rounded-2xl pointer-events-none transition-all duration-150 ${isStable
              ? "border-green-400 shadow-[0_0_25px_rgba(74,222,128,0.6)]"
              : isErrorBox
                ? "border-red-500 shadow-[0_0_25px_rgba(239,68,68,0.6)]"
              : phoneBox.isTolerating
                ? "border-yellow-400 shadow-[0_0_25px_rgba(250,204,21,0.6)]"
                : "border-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.4)]"
            }`}
          style={{
            left: `${phoneBox.x * scaleX}%`,
            top: `${phoneBox.y * scaleY}%`,
            width: `${phoneBox.w * scaleX}%`,
            height: `${phoneBox.h * scaleY}%`,
            transform: "translateZ(0)",
          }}
        >
          <div className={`absolute -top-7 left-0 text-white text-[10px] px-2 py-0.5 rounded-full font-bold ${isErrorBox ? "bg-red-500" : phoneBox.isTolerating ? "bg-yellow-500" : "bg-green-500"}`}>
            {isErrorBox
              ? "⚠️ Bukan Struk Pembayaran"
              : phoneBox.isTolerating
              ? "⚠️ HOLD"
              : phoneBox.confidence
                ? `🎯 ${(phoneBox.confidence * 100).toFixed(0)}%`
                : "detected"}
          </div>
        </div>
      )}

      {/* DARK OUTSIDE MASK (responsive FIX) */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        <div className="absolute inset-0 bg-black/20" />
      </div>

      {/* SCAN FRAME */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
        <div
          className={`w-72 h-96 border-2 rounded-3xl relative transition-all duration-500 ${frameClass}`}
        >
          {/* CORNERS */}
          <div className="absolute w-8 h-8 border-t-4 border-l-4 border-inherit top-0 left-0 rounded-tl-2xl" />
          <div className="absolute w-8 h-8 border-t-4 border-r-4 border-inherit top-0 right-0 rounded-tr-2xl" />
          <div className="absolute w-8 h-8 border-b-4 border-l-4 border-inherit bottom-0 left-0 rounded-bl-2xl" />
          <div className="absolute w-8 h-8 border-b-4 border-r-4 border-inherit bottom-0 right-0 rounded-br-2xl" />

          {/* SCAN LINE */}
          {!isDenied && (
            <div className="absolute left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#487ADB] to-transparent animate-scan top-1/2" />
          )}
        </div>
      </div>

      {/* BOTTOM STATUS */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md text-white text-[10px] px-5 py-1.5 rounded-full z-30 border border-white/10">
        ✨{" "}
        {isCapturing
          ? "Menyimpan & Enhance Image..."
          : isDenied
            ? "Izin Kamera Dibutuhkan"
            : isStable
              ? "Stabil - Siap Capture OCR"
              : isCVReady
                ? "AI Vision Active"
                : "Menginisialisasi Engine..."}
      </div>

      {/* ANIMATION */}
      <style jsx>{`
        @keyframes scan {
          0% {
            top: 10%;
            opacity: 0;
          }
          50% {
            opacity: 1;
          }
          100% {
            top: 90%;
            opacity: 0;
          }
        }

        .animate-scan {
          animation: scan 2.2s infinite linear;
        }
      `}</style>
    </>
  );
};