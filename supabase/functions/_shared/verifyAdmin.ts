// supabase/functions/_shared/verifyAdmin.ts
// Verifies the caller's JWT and checks admin_users (via the service_role
// client, which bypasses RLS — the check itself is an explicit query, not
// a reliance on RLS to filter results).

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export interface AdminContext {
  userId: string;
  role: "super_admin" | "sender";
  serviceClient: SupabaseClient;
}

export function getServiceClient(): SupabaseClient {
  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(url, serviceRoleKey, { auth: { persistSession: false } });
}

/**
 * Verifies the request carries a valid Supabase JWT for a user present in
 * admin_users. Throws a Response-friendly error object on failure —
 * callers should catch and return it directly.
 */
export async function verifyAdmin(req: Request): Promise<AdminContext> {
  const authHeader = req.headers.get("Authorization") ?? "";
  const jwt = authHeader.replace(/^Bearer\s+/i, "");
  if (!jwt) {
    throw { status: 401, message: "Missing Authorization header" };
  }

  const serviceClient = getServiceClient();
  const { data: userData, error: userError } = await serviceClient.auth.getUser(jwt);
  if (userError || !userData?.user) {
    throw { status: 401, message: "Invalid session" };
  }

  const userId = userData.user.id;
  const { data: adminRow, error: adminError } = await serviceClient
    .from("admin_users")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();

  if (adminError) throw { status: 500, message: "Failed to verify admin status" };
  if (!adminRow) throw { status: 403, message: "Not an admin" };

  return { userId, role: adminRow.role, serviceClient };
}

/**
 * Verifies the request carries a valid Supabase JWT for ANY signed-in
 * user (not necessarily an admin) — used by track-event, where the mobile
 * app itself (not the Admin Dashboard) is the caller.
 */
export async function verifyUser(req: Request): Promise<{ userId: string; serviceClient: SupabaseClient }> {
  const authHeader = req.headers.get("Authorization") ?? "";
  const jwt = authHeader.replace(/^Bearer\s+/i, "");
  if (!jwt) throw { status: 401, message: "Missing Authorization header" };

  const serviceClient = getServiceClient();
  const { data: userData, error } = await serviceClient.auth.getUser(jwt);
  if (error || !userData?.user) throw { status: 401, message: "Invalid session" };

  return { userId: userData.user.id, serviceClient };
}
