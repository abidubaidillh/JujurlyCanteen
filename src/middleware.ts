import { NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isAdminPath       = pathname.startsWith("/admin");
  const isMaintenancePage = pathname === "/maintenance";

  // Jika bukan rute admin dan bukan /maintenance, biarkan lewat tanpa cek DB
  if (!isAdminPath && !isMaintenancePage) {
    return NextResponse.next();
  }

  // ── Cek status maintenance dari Supabase ──────────────────────────────────
  let isMaintenance = false;

  try {
    const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const res = await fetch(
      `${supabaseUrl}/rest/v1/global_settings?id=eq.1&select=is_maintenance`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          "Content-Type": "application/json",
        },
        // Jangan cache — kita butuh nilai terkini setiap request
        cache: "no-store",
      }
    );

    if (res.ok) {
      const data: { is_maintenance: boolean }[] = await res.json();
      isMaintenance = data?.[0]?.is_maintenance ?? false;
    }
    // Jika res tidak ok, isMaintenance tetap false → biarkan lewat (fallback)
  } catch {
    // Supabase tidak dapat dihubungi → fallback: biarkan semua lewat
    return NextResponse.next();
  }

  // ── Logika routing ────────────────────────────────────────────────────────

  // 1. Maintenance aktif + akses ke /admin → blokir, redirect ke /maintenance
  if (isMaintenance && isAdminPath) {
    return NextResponse.redirect(new URL("/maintenance", request.url));
  }

  // 2. Maintenance tidak aktif + akses ke /maintenance → redirect ke /admin
  if (!isMaintenance && isMaintenancePage) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  // 3. Semua kondisi lain → biarkan lewat
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Jalankan middleware hanya pada rute yang relevan.
     * Kecualikan: aset statis Next.js, gambar, font, favicon, file publik.
     */
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.svg$|.*\\.webp$|.*\\.ico$|.*\\.js$|.*\\.css$).*)",
  ],
};
