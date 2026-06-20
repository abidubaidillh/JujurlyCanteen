"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";

// Supabase instance untuk server-side (anon key, sama permission dengan client)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ─── Action: Hapus Cache Next.js ──────────────────────────────────────────

export async function clearAppCache(): Promise<{ success: boolean; error?: string }> {
  try {
    revalidatePath("/", "layout");
    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Gagal me-revalidate cache.",
    };
  }
}

// ─── Action: Toggle Maintenance Mode ─────────────────────────────────────

export async function toggleMaintenanceMode(
  status: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from("global_settings")
      .update({ is_maintenance: status })
      .eq("id", 1);

    if (error) throw error;
    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Gagal memperbarui maintenance mode.",
    };
  }
}

// ─── Types ────────────────────────────────────────────────────────────────

export interface AdminSession {
  id: string;
  username: string;
  token: string;
  user_agent: string | null;
  created_at: string;
  last_active: string;
}

// ─── Action: Catat sesi login baru ───────────────────────────────────────

export async function createAdminSession(data: {
  username: string;
  token: string;
  userAgent: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from("admin_sessions").insert([{
      username: data.username,
      token: data.token,
      user_agent: data.userAgent,
    }]);
    if (error) throw error;
    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Gagal mencatat sesi.",
    };
  }
}

// ─── Action: Ambil semua sesi aktif ──────────────────────────────────────

export async function getAdminSessions(
  username: string
): Promise<{ success: boolean; data?: AdminSession[]; error?: string }> {
  try {
    const { data, error } = await supabase
      .from("admin_sessions")
      .select("id, username, token, user_agent, created_at, last_active")
      .eq("username", username)
      .order("last_active", { ascending: false });
    if (error) throw error;
    return { success: true, data: (data as AdminSession[]) ?? [] };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Gagal mengambil data sesi.",
    };
  }
}

// ─── Action: Hapus sesi berdasarkan token ────────────────────────────────

export async function deleteAdminSession(
  token: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from("admin_sessions")
      .delete()
      .eq("token", token);
    if (error) throw error;
    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Gagal menghapus sesi.",
    };
  }
}

// ─── Action: Verifikasi token sesi ───────────────────────────────────────

export async function verifyAdminSession(token: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("admin_sessions")
      .select("id")
      .eq("token", token)
      .maybeSingle();

    if (error) return true; // fallback: error DB → jangan kick admin
    return data !== null;   // token ada → valid, null → sudah dihapus
  } catch {
    return true; // fallback: network/timeout → jangan kick admin
  }
}
