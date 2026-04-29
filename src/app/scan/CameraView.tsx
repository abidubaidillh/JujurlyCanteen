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
  onAutoCapture?: () => void;
  onScanEvent?: (event: {
    type: "DETECTED" | "CAPTURING" | "IDLE";
    message?: string;
  }) => void;
}

export const CameraView = forwardRef((props: CameraViewProps, ref) => {
  // Canvas terpisah khusus untuk capture resolusi tinggi
  const captureCanvasRef = useRef<HTMLCanvasElement>(null);

  const { videoRef, canvasRef, phoneBox } = useCameraCV(
    props.isCVReady,
    props.isCapturing,
    props.onAutoCapture
  );

  useEffect(() => {
    if (!props.onScanEvent) return;
    if (props.isCapturing) {
      props.onScanEvent({ type: "CAPTURING", message: "Menganalisis teks bukti bayar..." });
    }
  }, [props.isCapturing, props.onScanEvent]);

  useEffect(() => {
    if (!props.onScanEvent || !phoneBox) return;
    props.onScanEvent({ type: "DETECTED", message: "Bukti bayar terdeteksi" });
  }, [phoneBox, props.onScanEvent]);

  // ============================================================
  // METHOD capture() — Single Clean Frame
  //
  // Bug #3 fix: Hapus brightness(1.05) dan frame averaging.
  // Frame averaging menyebabkan gambar overexposed (terlalu terang)
  // karena frame di-overlay satu di atas yang lain tanpa reset canvas.
  // 
  // Solusi: ambil 1 frame bersih langsung dari video element pada
  // resolusi native-nya. OpenCV.js yang akan handle preprocessing.
  // ============================================================
  useImperativeHandle(ref, () => ({
    capture: async (): Promise<Blob | null> => {
      const video = videoRef.current;
      const canvas = captureCanvasRef.current;

      if (!video || !canvas || video.videoWidth === 0) {
        console.error("📸 [CameraView] Video tidak siap, capture dibatalkan.");
        return null;
      }

      // Gunakan resolusi native video (1080p jika tersedia)
      const W = video.videoWidth;
      const H = video.videoHeight;

      canvas.width = W;
      canvas.height = H;

      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return null;

      // Reset total canvas sebelum gambar (PENTING: cegah sisa frame lama)
      ctx.clearRect(0, 0, W, H);

      // Ambil 1 frame bersih langsung dari video — tanpa filter apapun.
      // Preprocessing (grayscale, threshold) dilakukan di ocr-logic.ts via OpenCV.js
      ctx.globalAlpha = 1.0;
      ctx.filter = "none";
      ctx.drawImage(video, 0, 0, W, H);

      console.log(`📸 [CameraView] Captured: ${W}x${H}`);

      // Export PNG tanpa kompresi agar teks tidak pecah saat di-OCR
      return new Promise<Blob | null>((resolve) => {
        canvas.toBlob((blob) => resolve(blob), "image/png");
      });
    },
  }));

  return (
    <div className="relative w-full h-[420px] rounded-2xl overflow-hidden bg-black shadow-inner">
      {/* VIDEO ELEMENT: Preview langsung dari kamera, tidak diproses */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${
          props.isCVReady ? "opacity-100" : "opacity-40"
        }`}
      />

      {/* HIDDEN CANVAS 1: Canvas kecil (320x240) untuk detection loop */}
      <canvas ref={canvasRef} className="hidden" />

      {/* HIDDEN CANVAS 2: Canvas full-res untuk capture final */}
      <canvas ref={captureCanvasRef} className="hidden" />

      {/* OVERLAY UI */}
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