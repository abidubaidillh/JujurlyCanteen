"use client";

/**
 * Fungsi untuk mengirim frame kamera ke backend Python (FastAPI).
 * Dilengkapi dengan error handling yang lebih deskriptif untuk membedakan
 * antara server down vs respon invalid.
 */
export const sendFrameToAPI = async (blob: Blob) => {
  // Menggunakan 127.0.0.1 secara eksplisit untuk mencegah masalah resolusi IPv6 (::1) pada localhost
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
  
  const formData = new FormData();
  // Kita beri nama file frame.jpg agar FastAPI membacanya sebagai UploadFile
  formData.append("file", blob, "frame.jpg");

  try {
    const res = await fetch(`${API_URL}/detect-payment-screen`, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      // Jika server memberikan respon selain 2xx (misal 500 Internal Server Error)
      console.warn(`⚠️ API Response Error (Server menyala tapi mengembalikan error): ${res.status}`);
      return null;
    }

    const data = await res.json();
    return data;

  } catch (error: any) {
    /**
     * Mengatasi ERR_CONNECTION_REFUSED atau network error lainnya.
     * Logika ini penting agar kita bisa membedakan apakah server mati atau CORS diblokir.
     */
    if (error.name === 'TypeError') {
      console.warn("⚠️ Network Error / Server Down (Koneksi ditolak ke 127.0.0.1:8000)");
    } else {
      console.warn("⚠️ Error saat mem-parsing response:", error.message);
    }
    
    return null;
  }
};