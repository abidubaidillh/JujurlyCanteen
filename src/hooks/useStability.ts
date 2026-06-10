"use client";

import { useRef, useCallback } from "react";

const REQUIRED_STABLE_DURATION = 400; // ms — trigger after 400ms of good frames
const CONF_THRESHOLD            = 0.85;
const SHARPNESS_THRESHOLD       = 65;
const API_ERROR_TOLERANCE       = 3000; // ms — toleransi API error sebelum reset timer

export const useStability = (onStable: () => void) => {
  const onStableRef = useRef(onStable);
  onStableRef.current = onStable;

  // Memindahkan variabel state ke useRef agar timer berjalan independen 
  // dan bertahan dari Fast Refresh Next.js
  const stableStartRef = useRef<number | null>(null);
  const hasTriggeredRef = useRef(false);
  const lastValidTimeRef = useRef<number | null>(null);
  const missedFramesRef = useRef<number>(0);

  const update = useCallback(
    (
      detected: boolean,
      confidence: number,
      box: { x: number; y: number; w: number; h: number } | null,
      sharpness: number,
      apiError: boolean = false,
      status: string = ""
    ): boolean => {
      if (hasTriggeredRef.current) return false;

      const now = Date.now();

      // ==========================================
      // 1. TOLERANSI KONEKSI API
      // ==========================================
      if (apiError) {
        if (lastValidTimeRef.current && (now - lastValidTimeRef.current > API_ERROR_TOLERANCE)) {
          stableStartRef.current = null;
          lastValidTimeRef.current = null;
        }
        return false; 
      }

      // ==========================================
      // 1.5. STRICT LABEL CHECK
      // ==========================================
      if (status === "phone_detected" || status === "unknown_object" || (detected && status !== "payment_detected")) {
        stableStartRef.current = null;
        missedFramesRef.current = 0;
        return false;
      }

      // ==========================================
      // 2. VALIDASI FRAME & TOLERANSI
      // ==========================================
      const isGoodFrame =
        detected &&
        status === "payment_detected" &&
        box !== null &&
        confidence >= CONF_THRESHOLD &&
        sharpness > SHARPNESS_THRESHOLD;

      if (!isGoodFrame) {
        missedFramesRef.current += 1;
        
        if (missedFramesRef.current > 6) {
          stableStartRef.current = null;
          missedFramesRef.current = 0;
          return false;
        } else if (stableStartRef.current) {
          return true; // isTolerating = true
        }
        return false;
      }

      // Frame valid, reset hitungan miss
      missedFramesRef.current = 0;

      // ==========================================
      // 3. FRAME VALID - UPDATE TIMER
      // ==========================================
      lastValidTimeRef.current = now;

      if (!stableStartRef.current) {
        stableStartRef.current = now;
      }

      // Dynamic Threshold: jika sangat yakin (conf >= 0.9), trigger lebih cepat (200ms)
      const requiredDuration = confidence >= 0.9 ? 200 : REQUIRED_STABLE_DURATION;

      const duration = now - stableStartRef.current;

      if (duration >= requiredDuration) {
        console.log("📸 FINAL TRIGGER");
        hasTriggeredRef.current = true;
        stableStartRef.current = null;
        onStableRef.current();
      }

      return false;
    },
    []
  );

  const reset = useCallback(() => {
    stableStartRef.current = null;
    hasTriggeredRef.current = false;
    lastValidTimeRef.current = null;
  }, []);

  return { update, reset };
};
