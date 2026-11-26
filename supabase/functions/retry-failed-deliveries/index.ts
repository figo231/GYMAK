// supabase/functions/retry-failed-deliveries/index.ts
import { getServiceClient } from "../_shared/verifyAdmin.ts";
import { sendToDeviceToken } from "../_shared/fcmClient.ts";

const BATCH_SIZE = 5;
const RETRY_BACKOFF_MINUTES = [1, 5, 30, 120];
const MAX_RETRIES = RETRY_BACKOFF_MINUTES.length;
async function persist(query:any){const result=await query;if(result.error)throw result.error;return result;}

Deno.serve(async (req: Request) => {
  const authHeader = req.headers.get("Authorization") ?? "";
  const secret=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const expected = `Bearer ${secret}`;
  if (req.method!=="POST" || !secret || authHeader !== expected) {
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
  const { data: notificationRows,error:notificationError } = await serviceClient
    .from("notifications")
    .select("id, title, body, image_url, deep_link, priority, category, status")
    .in("id", notificationIds);
  if(notificationError)throw notificationError;
  const notificationById = new Map((notificationRows ?? []).map((n) => [n.id, n]));

  const tokenIds = claimed.map((d) => d.token_id);
  const { data: tokenRows,error:tokenError } = await serviceClient.from("push_tokens").select("id, token").in("id", tokenIds);
  if(tokenError)throw tokenError;
  const tokenById = new Map((tokenRows ?? []).map((t) => [t.id, t.token]));

  let sentCount = 0;
  let failedCount = 0;

  for (const delivery of claimed) {
    const notification = notificationById.get(delivery.notification_id);
    const deviceToken = tokenById.get(delivery.token_id);

    if (!notification || notification.status!=="sending" || !deviceToken) {
      await persist(serviceClient
        .from("notification_deliveries")
        .update({ status: "failed_permanent", error_code: "notification or token missing on retry" })
        .eq("id", delivery.id));
      failedCount++;
      continue;
    }

    let result;try{result = await sendToDeviceToken(deviceToken, {
      queuedBroadcast:true,
      category:notification.category,
      title: notification.title,
      body: notification.body,
      imageUrl: notification.image_url,
      deepLink: notification.deep_link,
      notificationId: notification.id,
      priority: notification.priority,
    });
    }catch{
      const {error:unknownError}=await persist(serviceClient.from('notification_deliveries').update({status:'outcome_unknown',error_code:'provider_outcome_unknown'}).eq('id',delivery.id));if(unknownError)throw unknownError;
      failedCount++;continue;
    }

    if (result.ok) {
      await persist(serviceClient
        .from("notification_deliveries")
        .update({ status: "sent", error_code: null })
        .eq("id", delivery.id));
      sentCount++;
      continue;
    }

    if (result.errorCode === "UNREGISTERED" || result.errorCode === "INVALID_ARGUMENT") {
      await persist(serviceClient
        .from("notification_deliveries")
        .update({ status: "invalid_token", error_code: result.errorCode })
        .eq("id", delivery.id));
      await persist(serviceClient.from("push_tokens").update({ is_active: false }).eq("id", delivery.token_id));
      failedCount++;
      continue;
    }

    const nextRetryCount = (Number(delivery.attempts)||0) + 1;
    if (result.retryable && nextRetryCount <= MAX_RETRIES) {
      const backoffMinutes = RETRY_BACKOFF_MINUTES[nextRetryCount - 1];
      await persist(serviceClient
        .from("notification_deliveries")
        .update({
          status: "failed_temporary",
          attempts: nextRetryCount,
          next_retry_at: new Date(Date.now() + backoffMinutes * 60_000).toISOString(),
          error_code: result.errorCode,
        })
        .eq("id", delivery.id));
    } else {
      await persist(serviceClient
        .from("notification_deliveries")
        .update({ status: "failed_permanent", attempts: nextRetryCount, error_code: result.errorCode })
        .eq("id", delivery.id));
    }
    failedCount++;
  }

  return new Response(JSON.stringify({ ok: true, processed: claimed.length, sentCount, failedCount }), { status: 200 });
});
