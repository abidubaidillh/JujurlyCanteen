"use client";

import { useRef } from "react";

interface PhoneBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const useStability = (onStable: () => void) => {
  const stableStartRef = useRef<number | null>(null);
  const lastBoxRef = useRef<PhoneBox | null>(null);
  const lastDetectRef = useRef<number>(0);

  const hasTriggeredRef = useRef<boolean>(false);

  const REQUIRED_STABLE_DURATION = 1000;
  const DETECTION_TIMEOUT = 1200;
  const MOVEMENT_THRESHOLD = 90;

  const CONF_THRESHOLD = 0.6;
  // 🔥 FIX: Turunkan threshold agar lebih mudah capture tanpa harus terlalu diam
  const SHARPNESS_THRESHOLD = 65;

  const isStableBox = (prev: PhoneBox | null, curr: PhoneBox) => {
    if (!prev) return false;

    const movement =
      Math.abs(prev.x - curr.x) +
      Math.abs(prev.y - curr.y) +
      Math.abs(prev.w - curr.w) +
      Math.abs(prev.h - curr.h);

    return movement < MOVEMENT_THRESHOLD;
  };

  const update = (
    detected: boolean,
    confidence: number,
    box: PhoneBox | null,
    sharpness: number
  ) => {
    if (hasTriggeredRef.current) return;

    const now = Date.now();

    console.log("CHECK:", {
      detected,
      confidence,
      sharpness,
      hasTriggered: hasTriggeredRef.current,
    });

    if (
      detected &&
      box &&
      confidence >= CONF_THRESHOLD &&
      sharpness > SHARPNESS_THRESHOLD
    ) {
      const stable = isStableBox(lastBoxRef.current, box);

      if (!stable) {
        stableStartRef.current = null;
        lastBoxRef.current = box;
        return;
      }

      lastBoxRef.current = box;
      lastDetectRef.current = now;

      if (!stableStartRef.current) {
        stableStartRef.current = now;
      }

      const duration = now - stableStartRef.current;

      console.log("🔥 STABLE:", Math.round(duration), "ms");

      if (duration >= REQUIRED_STABLE_DURATION) {
        console.log("📸 FINAL TRIGGER");

        hasTriggeredRef.current = true;
        stableStartRef.current = null;
        lastBoxRef.current = null;

        onStable();
      }
    } else {
      if (now - lastDetectRef.current > DETECTION_TIMEOUT) {
        stableStartRef.current = null;
        lastBoxRef.current = null;
      }
    }
  };

  const reset = () => {
    console.log("♻️ RESET STABILITY");
    hasTriggeredRef.current = false;
    stableStartRef.current = null;
    lastBoxRef.current = null;
    lastDetectRef.current = 0;
  };

  return { update, reset };
};