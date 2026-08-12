// supabase/functions/retry-failed-deliveries/index.ts
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

  const { data: claimed, error: claimError } = await serviceClient.rpc("claim_due_retries", {
    p_batch_size: BATCH_SIZE,
  });

  if (claimError) {
    return new Response(JSON.stringify({ error: claimError.message }), { status: 500 });
  }
  if (!claimed || claimed.length === 0) {
    return new Response(JSON.stringify({ ok: true, processed: 0 }), { status: 200 });
  }

  const notificationIds = [...new Set(claimed.map((d) => d.notification_id))];
  const { data: notificationRows } = await serviceClient
    .from("notifications")
    .select("id, title, body, image_url, deep_link, priority")
    .in("id", notificationIds);
  const notificationById = new Map((notificationRows ?? []).map((n) => [n.id, n]));

  const tokenIds = claimed.map((d) => d.token_id);
  const { data: tokenRows } = await serviceClient.from("push_tokens").select("id, token").in("id", tokenIds);
  const tokenById = new Map((tokenRows ?? []).map((t) => [t.id, t.token]));

  let sentCount = 0;
  let failedCount = 0;

  for (const delivery of claimed) {
    const notification = notificationById.get(delivery.notification_id);
    const deviceToken = tokenById.get(delivery.token_id);

    if (!notification || !deviceToken) {
      await serviceClient
        .from("notification_deliveries")
        .update({ status: "failed_permanent", error: "notification or token missing on retry" })
        .eq("id", delivery.id);
      failedCount++;
      continue;
    }

    const result = await sendToDeviceToken(deviceToken, {
      title: notification.title,
      body: notification.body,
      imageUrl: notification.image_url,
      deepLink: notification.deep_link,
      notificationId: notification.id,
      priority: notification.priority,
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
      await serviceClient
        .from("notification_deliveries")
        .update({
          status: "failed_temporary",
          retry_count: nextRetryCount,
          next_retry_at: new Date(Date.now() + backoffMinutes * 60_000).toISOString(),
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

  return new Response(JSON.stringify({ ok: true, processed: claimed.length, sentCount, failedCount }), { status: 200 });
});
