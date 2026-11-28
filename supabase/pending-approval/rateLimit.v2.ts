// Replacement for supabase/functions/_shared/rateLimit.ts (use only after 0064 is applied).
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
const WINDOW_MS = 60 * 60 * 1000;
const MAX_SENDS_PER_WINDOW = 20;
export async function checkAndIncrementRateLimit(serviceClient: SupabaseClient, adminId: string): Promise<{ allowed: boolean; count: number; limit: number }> {
  const windowStart = new Date(Math.floor(Date.now() / WINDOW_MS) * WINDOW_MS).toISOString();
  const { data, error } = await serviceClient.rpc("admin_rate_limit_hit", { p_admin: adminId, p_window: windowStart, p_max: MAX_SENDS_PER_WINDOW });
  if (error) throw new Error(`rate limit failed: ${error.message}`);
  const row = Array.isArray(data) ? data[0] : data;
  return { allowed: !!row?.allowed, count: Number(row?.count ?? 0), limit: MAX_SENDS_PER_WINDOW };
}
