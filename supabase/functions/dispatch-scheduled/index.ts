// supabase/functions/dispatch-scheduled/index.ts
import { getServiceClient } from "../_shared/verifyAdmin.ts";
import { sendToTopic } from "../_shared/fcmClient.ts";

const BATCH_INSERT_SIZE = 500;

Deno.serve(async (req: Request) => {
  const authHeader = req.headers.get("Authorization") ?? "";
  const expected = `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`;
  if (authHeader !== expected) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const serviceClient = getServiceClient();

  const { data: due, error } = await serviceClient
    .from("notifications")
    .select("*")
    .eq("status", "scheduled")
    .lte("scheduled_at", new Date().toISOString());

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  if (!due || due.length === 0) return new Response(JSON.stringify({ ok: true, processed: 0 }), { status: 200 });

  let processed = 0;

  for (const notification of due) {
    if (notification.audience_type === "everyone" || notification.audience_type === "topic") {
      const topicName = notification.audience_type === "everyone" ? "all_users" : notification.audience_ref?.topic;
      const result = topicName
        ? await sendToTopic(topicName, {
            title: notification.title,
            body: notification.body,
            imageUrl: notification.image_url,
            deepLink: notification.deep_link,
            notificationId: notification.id,
            priority: notification.priority,
          })
        : { ok: false, errorCode: "MISSING_TOPIC", retryable: false };

      await serviceClient
        .from("notifications")
        .update({ status: result.ok ? "sent" : "failed", sent_at: new Date().toISOString() })
        .eq("id", notification.id);
      processed++;
      continue;
    }

    let userIds: string[] = [];
    if (notification.audience_type === "single_user" || notification.audience_type === "test_device") {
      userIds = [notification.audience_ref?.user_id].filter(Boolean);
    } else if (notification.audience_type === "selected_users") {
      userIds = Array.isArray(notification.audience_ref?.user_ids) ? notification.audience_ref.user_ids : [];
    }

    if (userIds.length === 0) {
      await serviceClient.from("notifications").update({ status: "failed" }).eq("id", notification.id);
      processed++;
      continue;
    }

    const { data: preferenceRows } = await serviceClient
      .from("push_preferences")
      .select("user_id")
      .eq("category", notification.category)
      .eq("enabled", false)
      .in("user_id", userIds);
    const optedOut = new Set((preferenceRows ?? []).map((r) => r.user_id));

    const { data: tokenRows } = await serviceClient
      .from("push_tokens")
      .select("id, user_id")
      .in("user_id", userIds)
      .eq("is_active", true);

    const targetTokens = (tokenRows ?? []).filter((t) => !optedOut.has(t.user_id));

    for (let i = 0; i < targetTokens.length; i += BATCH_INSERT_SIZE) {
      const chunk = targetTokens.slice(i, i + BATCH_INSERT_SIZE).map((t) => ({
        notification_id: notification.id,
        token_id: t.id,
        status: "pending",
      }));
      await serviceClient.from("notification_deliveries").upsert(chunk, {
        onConflict: "notification_id,token_id",
        ignoreDuplicates: true,
      });
    }

    await serviceClient.from("notifications").update({ status: "sending" }).eq("id", notification.id);
    processed++;
  }

  return new Response(JSON.stringify({ ok: true, processed }), { status: 200 });
});
