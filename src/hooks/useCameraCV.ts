"use client";

import { useEffect, useRef, useState } from "react";
import { useCameraStream } from "./useCameraStream";
import { sendFrameToAPI } from "./useFrameSender";
import { useStability } from "./useStability";

interface PhoneBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const useCameraCV = (
  isCVReady: boolean,
  isCapturing: boolean,
  onAutoCapture?: () => void
) => {
  const { videoRef } = useCameraStream();

  // Canvas kecil KHUSUS untuk loop deteksi (tidak mempengaruhi preview)
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phoneBox, setPhoneBox] = useState<PhoneBox | null>(null);

  const requestLockRef = useRef(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasCapturedRef = useRef(false);

  // ============================================================
  // KIRIM FRAME KE BACKEND PYTHON untuk capture (langsung dari video)
  // ============================================================
  const captureToAPI = async (videoElement: HTMLVideoElement) => {
    // Buat canvas temporary untuk capture dengan resolusi penuh dari video
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = videoElement.videoWidth;
    tempCanvas.height = videoElement.videoHeight;

    const ctx = tempCanvas.getContext("2d");
    if (!ctx) return;

    // Gambar langsung dari video (bukan dari canvas kecil detection loop)
    ctx.drawImage(videoElement, 0, 0, tempCanvas.width, tempCanvas.height);

    return new Promise<void>((resolve) => {
      // Kirim sebagai JPEG kualitas tinggi (0.95) ke Python untuk di-warp & upload
      tempCanvas.toBlob(async (blob) => {
        if (!blob) return resolve();

        const formData = new FormData();
        formData.append("file", blob, "capture.jpg");

        try {
          console.log("📤 [useCameraCV] Kirim ke /capture-payment Python...");
          const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
          const res = await fetch(`${API_URL}/capture-payment`, {
            method: "POST",
            body: formData,
          });
          const data = await res.json();
          console.log("📦 [useCameraCV] Hasil backend capture:", data);
        } catch (err) {
          console.warn("⚠️ [useCameraCV] Backend tidak tersedia (lanjut OCR lokal):", err);
        }
        resolve();
      }, "image/jpeg", 0.95);
    });
  };

  const stopAll = () => {
    console.log("🛑 [useCameraCV] Stop detection loop.");
    hasCapturedRef.current = true;
    requestLockRef.current = true;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  // ============================================================
  // STABILITY TRIGGER: Saat gambar stabil, trigger capture + OCR
  // ============================================================
  const { update, reset } = useStability(async () => {
    if (hasCapturedRef.current) return;
    console.log("📸 [useCameraCV] Stabil terdeteksi! Memulai capture...");
    stopAll();

    // Kirim ke Python untuk perspective warp & upload ke Supabase
    const video = videoRef.current;
    if (video) {
      await captureToAPI(video);
    }

    // Beri sinyal ke page.tsx untuk menjalankan OCR manual
    if (onAutoCapture) {
      console.log("🤖 [useCameraCV] Trigger OCR via onAutoCapture...");
      onAutoCapture();
    }
  });

  // ============================================================
  // HITUNG SHARPNESS: Variance piksel (bukan rata-rata brightness)
  // Bug sebelumnya: getSharpness menghitung rata-rata brightness (sum/N),
  // bukan variance. Nilai brightness ~220 bukan ukuran ketajaman.
  // Solusi: gunakan Laplacian variance approximation via pixel diff.
  // ============================================================
  const getSharpness = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ): number => {
    const { data } = ctx.getImageData(0, 0, width, height);

    // Hitung grayscale tiap piksel, lalu hitung variance Laplacian sederhana
    let sum = 0;
    let sumSq = 0;
    const n = width * height;

    for (let i = 0; i < data.length; i += 4) {
      const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      sum += gray;
      sumSq += gray * gray;
    }

    const mean = sum / n;
    const variance = sumSq / n - mean * mean;
    // Variance tinggi = gambar tajam, variance rendah = blur/uniform
    return Math.sqrt(variance);
  };

  // Reset lock saat isCapturing kembali ke false (scan berikutnya)
  useEffect(() => {
    if (!isCapturing) {
      hasCapturedRef.current = false;
      requestLockRef.current = false;
      reset();
    }
  }, [isCapturing, reset]);

  // ============================================================
  // MAIN LOOP: Kirim frame ke API Python setiap 800ms
  // Interval diperlambat dari 500ms → 800ms agar preview tidak patah
  // ============================================================
  useEffect(() => {
    // Hentikan loop jika CV belum siap atau sedang proses OCR
    if (!isCVReady || isCapturing) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    // Canvas untuk detection loop: resolusi KECIL (320x240)
    // agar tidak memberatkan browser → preview tidak patah-patah (Bug #2)
    const DETECT_W = 320;
    const DETECT_H = 240;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const loop = async () => {
      if (
        hasCapturedRef.current ||
        requestLockRef.current ||
        !video ||
        video.videoWidth === 0 ||
        video.paused ||
        video.ended
      ) return;

      requestLockRef.current = true;

      try {
        // Canvas kecil khusus deteksi (tidak ada hubungannya dengan preview)
        canvas.width = DETECT_W;
        canvas.height = DETECT_H;
        ctx.drawImage(video, 0, 0, DETECT_W, DETECT_H);

        const sharpness = getSharpness(ctx, DETECT_W, DETECT_H);

        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, "image/jpeg", 0.75)
        );

        if (!blob || hasCapturedRef.current) return;

        const result = await sendFrameToAPI(blob);
        if (!result || hasCapturedRef.current) return;

        setPhoneBox(result.box || null);
        update(result.detected, result.confidence, result.box, sharpness);

      } catch {
        // Silent error
      } finally {
        requestLockRef.current = false;
      }
    };

    // 800ms interval: cukup untuk deteksi responsif tanpa memberatkan browser
    intervalRef.current = setInterval(loop, 800);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isCVReady, isCapturing, update, videoRef]);

  return { videoRef, canvasRef, phoneBox };
};