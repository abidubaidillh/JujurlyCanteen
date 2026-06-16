"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../scan/supabase-logic";
import { HiUser, HiLockClosed, HiEye, HiEyeSlash } from "react-icons/hi2";
import Mascot_Login from "../../../components/ui/Mascot_Login";

export default function AdminLoginPage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("admin")
        .select("*")
        .eq("username", username)
        .eq("password", password)
        .single();

      if (error || !data) {
        setErrorMsg("Username atau password salah!");
        return;
      }

      localStorage.setItem("admin_session", username);
      router.push("/admin/dashboard");
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : "Terjadi kesalahan koneksi."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const inputCls =
    "w-full h-12 border border-gray-300 rounded-xl px-4 pl-11 bg-gray-50 text-gray-900 placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-[#2B4C7E] focus:border-transparent transition-all";

  return (
    // ── CONTAINER UTAMA dengan background animasi ──
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4">
      
      {/* ═══ BACKGROUND HALAMAN ANIMASI ═══ */}
      <div className="absolute inset-0 z-0 bg-gradient-to-br from-[#1a2a4a] via-[#2B4C7E] to-[#487ADB]">
        
        {/* Pola grid titik-titik halus (tekstur) */}
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `radial-gradient(circle at 20px 20px, rgba(255,255,255,0.15) 1px, transparent 1px)`,
            backgroundSize: '40px 40px',
          }}
        />

        {/* Lingkaran besar 1 - bergerak lambat */}
        <div 
          className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full bg-blue-400/20 blur-3xl animate-float-slow"
          style={{ animationDuration: '8s' }}
        />
        
        {/* Lingkaran besar 2 - bergerak berlawanan */}
        <div 
          className="absolute -bottom-40 -left-40 w-[600px] h-[600px] rounded-full bg-indigo-300/15 blur-3xl animate-float-reverse"
          style={{ animationDuration: '10s' }}
        />
        
        {/* Lingkaran besar 3 - berdenyut di tengah */}
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-purple-300/10 blur-3xl animate-pulse-slow"
          style={{ animationDuration: '6s' }}
        />

        {/* Lingkaran kecil melayang (float) - 4 buah */}
        <div 
          className="absolute top-20 left-10 w-12 h-12 rounded-full bg-blue-300/20 blur-xl animate-float-slow" 
          style={{ animationDelay: '0s', animationDuration: '7s' }} 
        />
        <div 
          className="absolute bottom-20 right-20 w-16 h-16 rounded-full bg-teal-300/20 blur-xl animate-float-reverse" 
          style={{ animationDelay: '1s', animationDuration: '9s' }} 
        />
        <div 
          className="absolute top-1/3 right-10 w-8 h-8 rounded-full bg-pink-300/20 blur-lg animate-float-slow" 
          style={{ animationDelay: '2s', animationDuration: '5s' }} 
        />
        <div 
          className="absolute bottom-1/4 left-1/4 w-10 h-10 rounded-full bg-yellow-200/10 blur-xl animate-float-reverse" 
          style={{ animationDelay: '0.5s', animationDuration: '6s' }} 
        />
      </div>

      {/* ── CARD LOGIN (tetap di atas) ── */}
      <div className="relative z-10 w-full max-w-4xl min-h-[500px] flex flex-row bg-white rounded-2xl shadow-2xl overflow-hidden">

        {/* ── Left Panel ── dengan background yang konsisten */}
        <div className="hidden md:flex w-[35%] relative overflow-hidden bg-gradient-to-br from-[#487ADB] to-[#2B4C7E]">
          
          {/* Dekorasi latar panel kiri (konsisten dengan background halaman) */}
          <div 
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: `radial-gradient(circle at 20px 20px, rgba(255,255,255,0.2) 1px, transparent 1px)`,
              backgroundSize: '40px 40px',
            }}
          />
          
          <div className="absolute -top-20 -left-20 w-72 h-72 rounded-full bg-white/10 blur-3xl animate-float-slow" style={{ animationDuration: '10s' }} />
          <div className="absolute -bottom-24 -right-16 w-80 h-80 rounded-full bg-blue-300/20 blur-3xl animate-float-reverse" style={{ animationDuration: '12s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-white/5 blur-3xl animate-pulse-slow" style={{ animationDuration: '8s' }} />

          {/* Mascot tetap di atas */}
          <div className="absolute inset-0 flex items-center justify-center z-10 transform scale-[2] lg:scale-[2.5] xl:scale-[3] -translate-x-16 md:-translate-x-18 lg:-translate-x-26 -translate-y-10">
            <Mascot_Login />
          </div>
        </div>

        {/* ── Right Panel ── */}
        <div className="w-full md:w-[65%] p-10 lg:p-14 bg-white flex flex-col justify-center">

          {/* Title */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-[#2B4C7E]">Selamat Datang!</h1>
          </div>

          {/* Error */}
          {errorMsg && (
            <div className="mb-5 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-medium">
              {errorMsg}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3">

            {/* Username */}
            <div className="relative">
              <HiUser className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 text-base pointer-events-none" />
              <input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => { setUsername(e.target.value); setErrorMsg(""); }}
                required
                autoComplete="username"
                className={inputCls}
              />
            </div>

            {/* Password */}
            <div className="relative">
              <HiLockClosed className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 text-base pointer-events-none" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setErrorMsg(""); }}
                required
                autoComplete="current-password"
                className={`${inputCls} pr-11`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                tabIndex={-1}
                aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
              >
                {showPassword ? (
                  <HiEyeSlash className="text-base" />
                ) : (
                  <HiEye className="text-base" />
                )}
              </button>
            </div>

            {/* Forgot Password */}
            <div className="mt-2 mb-4">
              <span className="text-sm font-semibold text-gray-500 hover:text-[#2B4C7E] transition-colors cursor-pointer">
                Forgot Password?
              </span>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 bg-[#2B4C7E] hover:bg-[#1a3561] text-white font-bold text-sm rounded-xl shadow-md hover:shadow-lg transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed tracking-widest"
            >
              {isLoading ? "Memproses..." : "LOGIN"}
            </button>

          </form>
        </div>
      </div>

      {/* ═══ KEYFRAMES CSS untuk animasi ═══ */}
      <style jsx>{`
        @keyframes float-slow {
          0%, 100% { transform: translate(0, 0) scale(1); }
          25% { transform: translate(20px, -30px) scale(1.05); }
          50% { transform: translate(-10px, 20px) scale(0.95); }
          75% { transform: translate(30px, 10px) scale(1.02); }
        }
        @keyframes float-reverse {
          0%, 100% { transform: translate(0, 0) scale(1); }
          25% { transform: translate(-20px, 30px) scale(0.95); }
          50% { transform: translate(10px, -20px) scale(1.05); }
          75% { transform: translate(-30px, -10px) scale(1.02); }
        }
        @keyframes pulse-slow {
          0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.4; }
          50% { transform: translate(-50%, -50%) scale(1.1); opacity: 0.7; }
        }
        .animate-float-slow {
          animation: float-slow ease-in-out infinite;
        }
        .animate-float-reverse {
          animation: float-reverse ease-in-out infinite;
        }
        .animate-pulse-slow {
          animation: pulse-slow ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}