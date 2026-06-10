"use client";
import { MdLightbulbOutline, MdOutlineLightMode } from "react-icons/md";
import { HiOutlineDevicePhoneMobile } from "react-icons/hi2";
import { LuScanLine } from "react-icons/lu";

export const TipsPanel = () => {
  return (
    <div className="flex flex-col gap-5">
      <div className="bg-white rounded-3xl shadow-md p-6 border border-gray-50">
        <div className="flex items-center gap-4 mb-4">
          <div className="bg-[#E6F1FD] text-[#487ADB] rounded-2xl p-3 shadow-sm">
            <MdLightbulbOutline size={32} />
          </div>
          <h3 className="text-[#487ADB] font-bold text-xl uppercase tracking-tight">Tips AI</h3>
        </div>
        <p className="text-sm text-gray-700 leading-relaxed font-medium">
          Pastikan bukti pembayaran terlihat jelas dan tidak buram. AI akan otomatis memotret jika posisi stabil.
        </p>
      </div>

      <div className="bg-[#487ADB] rounded-[32px] p-6 shadow-xl text-white flex flex-col gap-6">
        <div className="flex items-center gap-4">
          <div className="bg-white/20 backdrop-blur-md rounded-xl p-2.5">
            <MdOutlineLightMode size={24} />
          </div>
          <span className="font-semibold">Cahaya cukup terang</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="bg-white/20 backdrop-blur-md rounded-xl p-2.5">
            <LuScanLine size={24} />
          </div>
          <span className="font-semibold">Posisikan di dalam frame</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="bg-white/20 backdrop-blur-md rounded-xl p-2.5">
            <HiOutlineDevicePhoneMobile size={24} />
          </div>
          <span className="font-semibold">Jangan miring</span>
        </div>
      </div>
    </div>
  );
};