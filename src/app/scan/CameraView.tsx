"use client";

import {
  useRef,
  forwardRef,
  useImperativeHandle,
  useEffect,
} from "react";

import { useCameraCV } from "../../hooks/useCameraCV";
import { ScanOverlay } from "../../components/layout/ScanOverlay";

interface CameraViewProps {
  status: string;
  isCapturing: boolean;
  isCVReady: boolean;

  // ⭐ FIX: terima data dari backend Python
  onAutoCapture?: (backendData: any) => void;

  onScanEvent?: (event: {
    type: "DETECTED" | "CAPTURING" | "IDLE";
    message?: string;
  }) => void;
}

export const CameraView = forwardRef((props: CameraViewProps, ref) => {
  const captureCanvasRef = useRef<HTMLCanvasElement>(null);

  // ⭐ FIX: teruskan handler ke hook
  const { videoRef, canvasRef, phoneBox } = useCameraCV(
    props.isCVReady,
    props.isCapturing,
    props.onAutoCapture
  );

  // ============================================================
  // EVENT STATUS (UI only)
  // ============================================================
  useEffect(() => {
    if (!props.onScanEvent) return;

    if (props.isCapturing) {
      props.onScanEvent({
        type: "CAPTURING",
        message: "Menganalisis teks bukti bayar...",
      });
    }
  }, [props.isCapturing, props.onScanEvent]);

  useEffect(() => {
    if (!props.onScanEvent || !phoneBox) return;

    props.onScanEvent({
      type: "DETECTED",
      message: "Bukti bayar terdeteksi",
    });
  }, [phoneBox, props.onScanEvent]);

  // ============================================================
  // METHOD capture() — fallback manual only
  // (tidak dipakai di auto flow utama)
  // ============================================================
  useImperativeHandle(ref, () => ({
    capture: async (): Promise<Blob | null> => {
      const video = videoRef.current;
      const canvas = captureCanvasRef.current;

      if (!video || !canvas || video.videoWidth === 0) {
        console.error("[CameraView] Video tidak siap.");
        return null;
      }

      const W = video.videoWidth;
      const H = video.videoHeight;

      canvas.width = W;
      canvas.height = H;

      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return null;

      ctx.clearRect(0, 0, W, H);

      ctx.globalAlpha = 1.0;
      ctx.filter = "none";
      ctx.drawImage(video, 0, 0, W, H);

      console.log(`[CameraView] Captured: ${W}x${H}`);

      return new Promise<Blob | null>((resolve) => {
        canvas.toBlob((blob) => resolve(blob), "image/png");
      });
    },
  }));

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="relative w-full aspect-[3/4] rounded-2xl overflow-hidden bg-black shadow-inner">
      {/* VIDEO — mirror hanya di level presentasi, frame data tetap normal */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-700 scale-x-[-1] ${
          props.isCVReady ? "opacity-100" : "opacity-40"
        }`}
      />

      {/* CANVAS DETECTION */}
      <canvas ref={canvasRef} className="hidden" />

      {/* CANVAS CAPTURE */}
      <canvas ref={captureCanvasRef} className="hidden" />

      {/* OVERLAY */}
      <ScanOverlay
        isCapturing={props.isCapturing}
        status={props.status}
        isCVReady={props.isCVReady}
        phoneBox={phoneBox}
      />
    </div>
  );
});

CameraView.displayName = "CameraView";