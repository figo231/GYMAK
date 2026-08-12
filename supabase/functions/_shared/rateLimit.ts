// supabase/functions/_shared/rateLimit.ts
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_SENDS_PER_WINDOW = 20;

function currentWindowStart(): string {
  const now = Date.now();
  const windowStartMs = Math.floor(now / WINDOW_MS) * WINDOW_MS;
  return new Date(windowStartMs).toISOString();
}

/**
 * Checks and atomically increments the admin's send counter for the
 * current hourly window. Returns { allowed: false } without incrementing
 * if the admin has already hit the limit.
 */
export async function checkAndIncrementRateLimit(
  serviceClient: SupabaseClient,
  adminId: string
): Promise<{ allowed: boolean; count: number; limit: number }> {
  const windowStart = currentWindowStart();

  const { data: existing, error: selectError } = await serviceClient
    .from("admin_rate_limits")
    .select("send_count")
    .eq("admin_id", adminId)
    .eq("window_start", windowStart)
    .maybeSingle();

  if (selectError) throw new Error(`rate limit check failed: ${selectError.message}`);

  const currentCount = existing?.send_count ?? 0;
  if (currentCount >= MAX_SENDS_PER_WINDOW) {
    return { allowed: false, count: currentCount, limit: MAX_SENDS_PER_WINDOW };
  }

  const { error: upsertError } = await serviceClient
    .from("admin_rate_limits")
    .upsert(
      { admin_id: adminId, window_start: windowStart, send_count: currentCount + 1 },
      { onConflict: "admin_id,window_start" }
    );
  if (upsertError) throw new Error(`rate limit increment failed: ${upsertError.message}`);

  return { allowed: true, count: currentCount + 1, limit: MAX_SENDS_PER_WINDOW };
}
