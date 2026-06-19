"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import AdminSidebar from "../../components/admin/AdminSidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [authorized, setAuthorized] = useState(false);

  // Login page tidak butuh auth guard
  const isLoginPage = pathname === "/admin/login";

  useEffect(() => {
    if (isLoginPage) {
      setAuthorized(true);
      return;
    }
    const session = localStorage.getItem("admin_session");
    if (!session) {
      router.push("/admin/login");
    } else {
      setAuthorized(true);
    }
  }, [isLoginPage, router]);

  if (!authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-400 text-sm">Memeriksa otorisasi...</p>
      </div>
    );
  }

  // Login page: render tanpa sidebar
  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900 font-sans">
      <AdminSidebar />
      <div className="ml-64 flex-1 overflow-y-auto text-slate-800 dark:text-slate-100">
        {children}
      </div>
    </div>
  );
}
