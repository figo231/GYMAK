// supabase/functions/dispatch-batch/index.ts
import { getServiceClient } from "../_shared/verifyAdmin.ts";
import { sendToDeviceToken } from "../_shared/fcmClient.ts";

const BATCH_SIZE = 500;
const RETRY_BACKOFF_MINUTES = [1, 5, 30, 120];
const MAX_RETRIES = RETRY_BACKOFF_MINUTES.length;

Deno.serve(async (req: Request) => {
  const authHeader = req.headers.get("Authorization") ?? "";
  const expected = `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`;
  if (authHeader !== expected) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const serviceClient = getServiceClient();

  const { data: pendingNotification } = await serviceClient
    .from("notifications")
    .select("id, title, body, image_url, deep_link, priority")
    .eq("status", "sending")
    .order("created_at")
    .limit(1)
    .maybeSingle();

  if (!pendingNotification) {
    return new Response(JSON.stringify({ ok: true, processed: 0 }), { status: 200 });
  }

  const { data: claimed, error: claimError } = await serviceClient.rpc("claim_pending_deliveries", {
    p_notification_id: pendingNotification.id,
    p_batch_size: BATCH_SIZE,
  });

  if (claimError) {
    return new Response(JSON.stringify({ error: claimError.message }), { status: 500 });
  }

  if (!claimed || claimed.length === 0) {
    const { count } = await serviceClient
      .from("notification_deliveries")
      .select("id", { count: "exact", head: true })
      .eq("notification_id", pendingNotification.id)
      .in("status", ["pending", "dispatching", "failed_temporary"]);

    if (!count || count === 0) {
      await serviceClient.from("notifications").update({ status: "sent" }).eq("id", pendingNotification.id);
    }
    return new Response(JSON.stringify({ ok: true, processed: 0 }), { status: 200 });
  }

  const tokenIds = claimed.map((d) => d.token_id);
  const { data: tokenRows } = await serviceClient
    .from("push_tokens")
    .select("id, token")
    .in("id", tokenIds);
  const tokenById = new Map((tokenRows ?? []).map((t) => [t.id, t.token]));

  let sentCount = 0;
  let failedCount = 0;

  for (const delivery of claimed) {
    const deviceToken = tokenById.get(delivery.token_id);
    if (!deviceToken) {
      await serviceClient
        .from("notification_deliveries")
        .update({ status: "failed_permanent", error: "token row missing" })
        .eq("id", delivery.id);
      failedCount++;
      continue;
    }

    const result = await sendToDeviceToken(deviceToken, {
      title: pendingNotification.title,
      body: pendingNotification.body,
      imageUrl: pendingNotification.image_url,
      deepLink: pendingNotification.deep_link,
      notificationId: pendingNotification.id,
      priority: pendingNotification.priority,
    });

    if (result.ok) {
      await serviceClient
        .from("notification_deliveries")
        .update({ status: "sent", fcm_message_id: result.messageId, sent_at: new Date().toISOString() })
        .eq("id", delivery.id);
      sentCount++;
      continue;
    }

    if (result.errorCode === "UNREGISTERED" || result.errorCode === "INVALID_ARGUMENT") {
      await serviceClient
        .from("notification_deliveries")
        .update({ status: "invalid_token", error: result.errorCode })
        .eq("id", delivery.id);
      await serviceClient.from("push_tokens").update({ is_active: false }).eq("id", delivery.token_id);
      failedCount++;
      continue;
    }

    const nextRetryCount = delivery.retry_count + 1;
    if (result.retryable && nextRetryCount <= MAX_RETRIES) {
      const backoffMinutes = RETRY_BACKOFF_MINUTES[nextRetryCount - 1];
      const nextRetryAt = new Date(Date.now() + backoffMinutes * 60_000).toISOString();
      await serviceClient
        .from("notification_deliveries")
        .update({
          status: "failed_temporary",
          retry_count: nextRetryCount,
          next_retry_at: nextRetryAt,
          error: result.errorCode,
        })
        .eq("id", delivery.id);
    } else {
      await serviceClient
        .from("notification_deliveries")
        .update({ status: "failed_permanent", retry_count: nextRetryCount, error: result.errorCode })
        .eq("id", delivery.id);
    }
    failedCount++;
  }

  return new Response(
    JSON.stringify({ ok: true, notificationId: pendingNotification.id, processed: claimed.length, sentCount, failedCount }),
    { status: 200 }
  );
});
