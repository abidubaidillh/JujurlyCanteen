"use client";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://jujurly-ai-detector.onrender.com";

/**
 * Mengirim frame kamera ke backend Python (FastAPI) untuk deteksi layar HP.
 */
export const sendFrameToAPI = async (blob: Blob) => {
  const formData = new FormData();
  formData.append("file", blob, "frame.jpg");

  try {
    const res = await fetch(`${API_URL}/detect-payment-screen`, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      console.warn(`⚠️ [sendFrameToAPI] Server error ${res.status}`);
      return null;
    }

    return await res.json();

  } catch (error: any) {
    if (error.name === "TypeError") {
      console.warn(`⚠️ [sendFrameToAPI] Network error / server down → ${API_URL}`);
    } else {
      console.warn("⚠️ [sendFrameToAPI] Parse error:", error.message);
    }
    return null;
  }
};