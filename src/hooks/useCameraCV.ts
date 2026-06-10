"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useCameraStream } from "./useCameraStream";
import { sendFrameToAPI } from "./useFrameSender";
import { useStability } from "./useStability";

interface PhoneBox {
  x: number;
  y: number;
  w: number;
  h: number;
  isTolerating?: boolean;
  status?: string;
}

export const useCameraCV = (
  isCVReady: boolean,
  isCapturing: boolean,
  onAutoCapture?: (backendData: Record<string, unknown> | null) => void
) => {
  const { videoRef } = useCameraStream();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phoneBox, setPhoneBox] = useState<PhoneBox | null>(null);
  const phoneBoxRef = useRef<PhoneBox | null>(null);

  const requestLockRef = useRef(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasCapturedRef = useRef(false);
  const processingRef = useRef(false);

  const onAutoCaptureRef = useRef(onAutoCapture);
  onAutoCaptureRef.current = onAutoCapture;

  // ============================================================
  // CAPTURE → PYTHON (SINGLE SOURCE OF TRUTH)
  // ============================================================
  const captureToAPI = async (videoElement: HTMLVideoElement) => {
    if (processingRef.current) {
      console.warn("⚠️ [useCameraCV] Sedang memproses capture, mengabaikan request baru.");
      return;
    }
    processingRef.current = true;

    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = videoElement.videoWidth;
    tempCanvas.height = videoElement.videoHeight;

    const ctx = tempCanvas.getContext("2d");
    if (!ctx) {
      processingRef.current = false;
      return;
    }

    ctx.drawImage(videoElement, 0, 0, tempCanvas.width, tempCanvas.height);

    return new Promise<void>((resolve) => {
      tempCanvas.toBlob(async (blob) => {
        if (!blob) {
          processingRef.current = false;
          return resolve();
        }

        const formData = new FormData();
        formData.append("file", blob, "capture.jpg");

        try {
          console.log("📤 [useCameraCV] Capture → Python...");

          const API_URL =
            process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

          const res = await fetch(`${API_URL}/capture-payment`, {
            method: "POST",
            body: formData,
          });

          const data = await res.json();
          console.log("📦 [useCameraCV] Backend response:", data);

          // ✅ VALIDASI RESPONSE
          if (!data || data.status === "locked" || data.success === false) {
            console.warn("⚠️ Capture ditolak / invalid:", data);
            processingRef.current = false;
            return resolve();
          }

          // ✅ TRIGGER FRONTEND (HANYA SEKALI)
          if (onAutoCaptureRef.current) {
            onAutoCaptureRef.current(data);
          }
        } catch (err) {
          console.warn("⚠️ Backend error:", err);
        }

        processingRef.current = false;
        resolve();
      }, "image/jpeg", 0.95);
    });
  };

  // ============================================================
  // STOP LOOP
  // ============================================================
  const stopAll = () => {
    console.log("🛑 Stop detection loop");
    hasCapturedRef.current = true;
    requestLockRef.current = true;

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  // ============================================================
  // STABILITY TRIGGER (NO DOUBLE CALL)
  // ============================================================
  const onStableCallback = useCallback(async () => {
    if (hasCapturedRef.current || processingRef.current) return;

    console.log("📸 Stabil → capture ke backend");
    stopAll();

    const video = videoRef.current;
    if (video) {
      await captureToAPI(video);
    }
  }, []); // eslint-disable-line

  const { update, reset } = useStability(onStableCallback);

  // ============================================================
  // SHARPNESS (FIXED - VARIANCE)
  // ============================================================
  const getSharpness = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ): number => {
    const { data } = ctx.getImageData(0, 0, width, height);

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

    return Math.sqrt(variance);
  };

  const resetRef = useRef(reset);
  resetRef.current = reset;

  // RESET STATE
  useEffect(() => {
    if (!isCapturing) {
      hasCapturedRef.current = false;
      requestLockRef.current = false;
      processingRef.current = false;
      resetRef.current();
    }
  }, [isCapturing]);

  const updateRef = useRef(update);
  updateRef.current = update;

  const videoRefStable = videoRef;

  // ============================================================
  // DETECTION LOOP
  // ============================================================
  useEffect(() => {
    if (!isCVReady || isCapturing) return;

    const video = videoRefStable.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const DETECT_W = 640;
    const DETECT_H = 480;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const loop = async () => {
      if (
        hasCapturedRef.current ||
        requestLockRef.current ||
        processingRef.current ||
        !video ||
        video.videoWidth === 0 ||
        video.paused ||
        video.ended
      )
        return;

      requestLockRef.current = true;

      try {
        canvas.width = DETECT_W;
        canvas.height = DETECT_H;
        ctx.drawImage(video, 0, 0, DETECT_W, DETECT_H);

        const sharpness = getSharpness(ctx, DETECT_W, DETECT_H);

        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, "image/jpeg", 0.8)
        );

        if (!blob || hasCapturedRef.current) return;

        const result = await sendFrameToAPI(blob);
        
        // Handle API error (backend restart / connection refused)
        if (!result) {
          if (!hasCapturedRef.current) {
            updateRef.current(false, 0, null, 0, true);
          }
          return;
        }

        if (hasCapturedRef.current) return;

        const isTolerating = updateRef.current(
          result.detected,
          result.confidence,
          result.box,
          sharpness,
          false, // apiError = false
          result.status
        );

        let newBox = result.box || null;
        const prev = phoneBoxRef.current;

        if (isTolerating && prev) {
          newBox = { ...prev, isTolerating: true, status: prev.status };
        } else if (newBox) {
          newBox = { ...newBox, isTolerating: false, status: result.status };
        }

        const boxChanged =
          newBox === null
            ? prev !== null
            : prev === null ||
              prev.x !== newBox.x ||
              prev.y !== newBox.y ||
              prev.w !== newBox.w ||
              prev.h !== newBox.h ||
              prev.isTolerating !== newBox.isTolerating ||
              prev.status !== newBox.status;

        if (boxChanged) {
          phoneBoxRef.current = newBox;
          setPhoneBox(newBox);
        }
      } catch (err) {
        console.warn("⚠️ Loop camera exception:", err);
        if (!hasCapturedRef.current) {
          updateRef.current(false, 0, null, 0, true);
        }
      } finally {
        requestLockRef.current = false;
      }
    };

    intervalRef.current = setInterval(loop, 800);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isCVReady, isCapturing]);

  return { videoRef, canvasRef, phoneBox };
};