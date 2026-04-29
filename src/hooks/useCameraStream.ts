"use client";

import { useEffect, useRef } from "react";

export const useCameraStream = () => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;

    const initCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "environment",
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });

        if (videoRef.current) {
          const video = videoRef.current;

          if (!video.srcObject) {
            video.srcObject = stream;
          }

          video.onloadedmetadata = async () => {
            await video.play();
            console.log("✅ Camera ready");
          };
        }
      } catch (err) {
        console.error("Camera error:", err);
      }
    };

    initCamera();

    return () => {
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return { videoRef };
};
