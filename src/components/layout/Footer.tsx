"use client";

import { FaInstagram, FaTiktok } from "react-icons/fa";

export default function Footer() {
  return (
    <footer className="bg-[#487ADB] text-white px-4 sm:px-6 py-4">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-6 lg:gap-4">

        {/* LEFT - SOCIAL MEDIA */}
        <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-8 text-sm">
          <div className="flex items-center gap-3">
            <div className="bg-white text-[#487ADB] rounded-full p-2 shadow-md hover:scale-110 transition">
              <FaTiktok size={16} />
            </div>
            <span>@hmit.store</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-white text-[#487ADB] rounded-full p-2 shadow-md hover:scale-110 transition">
              <FaInstagram size={16} />
            </div>
            <span>@hmit.store</span>
          </div>
        </div>

        {/* CENTER - PROJECT */}
        <div className="text-sm font-medium text-center">
          Project Capstone
        </div>

        {/* RIGHT - TEAM */}
        <div className="flex flex-wrap justify-center items-center gap-2 text-sm">
          <span>Wira</span>
          <span>|</span>
          <span>Abid</span>
          <span>|</span>
          <span>Satya</span>
          <span>|</span>
          <span>Syahmi</span>
        </div>

      </div>
    </footer>
  );
}