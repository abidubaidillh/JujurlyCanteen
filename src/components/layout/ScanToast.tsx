"use client";

import { motion, AnimatePresence } from "framer-motion";

export const ScanToast = ({ status }: { status: string }) => {
  const map = {
    idle: null,
    detecting: "Mendeteksi layar pembayaran...",
    stable: "✔ Stabil! Siap capture",
    captured: "🎉 Berhasil diambil!",
    lost: "❌ Target hilang",
  };

  if (!map[status as keyof typeof map]) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        className="fixed top-5 left-1/2 -translate-x-1/2
                   bg-black/80 text-white px-4 py-2 rounded-xl
                    text-sm z-50"
      >
        {map[status as keyof typeof map]}
      </motion.div>
    </AnimatePresence>
  );
};