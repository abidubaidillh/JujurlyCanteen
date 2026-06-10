"use client";

import { useState, useRef } from "react";

type Status = "idle" | "detecting" | "stable" | "captured" | "lost";

export const useScanNotifier = () => {
  const [status, setStatus] = useState<Status>("idle");
  const lastSeenRef = useRef<number>(0);

  const updateStatus = (
    detected: boolean,
    confidence: number,
    stableDuration: number
  ) => {
    const now = Date.now();

    if (detected) {
      lastSeenRef.current = now;

      if (confidence > 0.7) {
        if (stableDuration > 2000) {
          setStatus("stable");
        } else {
          setStatus("detecting");
        }
      } else {
        setStatus("detecting");
      }
    } else {
      if (now - lastSeenRef.current > 800) {
        setStatus("lost");
      }
    }
  };

  const setCaptured = () => setStatus("captured");

  return {
    status,
    updateStatus,
    setCaptured,
  };
};