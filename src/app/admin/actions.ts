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
