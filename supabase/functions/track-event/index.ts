// supabase/functions/track-event/index.ts
import { verifyUser } from "../_shared/verifyAdmin.ts";

const VALID_EVENT_TYPES = ["received", "opened", "click_through"];

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  let ctx;
  try {
    ctx = await verifyUser(req);
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message ?? "Unauthorized" }), { status: e.status ?? 401 });
  }

  const { notificationId, tokenId, eventType } = await req.json().catch(() => ({}));
  if (!notificationId || !tokenId || !VALID_EVENT_TYPES.includes(eventType)) {
    return new Response(JSON.stringify({ error: "notificationId, tokenId and a valid eventType are required" }), {
      status: 400,
    });
  }

  const { data: tokenRow, error: tokenError } = await ctx.serviceClient
    .from("push_tokens")
    .select("id, user_id")
    .eq("id", tokenId)
    .maybeSingle();

  if (tokenError || !tokenRow || tokenRow.user_id !== ctx.userId) {
    return new Response(JSON.stringify({ error: "Token does not belong to the caller" }), { status: 403 });
  }

  const { error: insertError } = await ctx.serviceClient.from("notification_events").insert({
    notification_id: notificationId,
    token_id: tokenId,
    event_type: eventType,
  });

  if (insertError) {
    return new Response(JSON.stringify({ error: insertError.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
});
