// supabase/functions/delete-account/index.ts
// Lets a signed-in user permanently delete their OWN account and all rows
// (every table references auth.users with ON DELETE CASCADE). Required by
// Google Play for apps with account creation.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: cors });

  const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!jwt) return new Response(JSON.stringify({ error: "Missing Authorization header" }), { status: 401, headers: cors });

  const service = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });
  const { data, error } = await service.auth.getUser(jwt);
  if (error || !data?.user) return new Response(JSON.stringify({ error: "Invalid session" }), { status: 401, headers: cors });

  // Only ever the caller's own id, taken from the verified token.
  const { error: delError } = await service.auth.admin.deleteUser(data.user.id);
  if (delError) return new Response(JSON.stringify({ error: delError.message }), { status: 500, headers: cors });
  return new Response(JSON.stringify({ ok: true }), { headers: { ...cors, "Content-Type": "application/json" } });
});
