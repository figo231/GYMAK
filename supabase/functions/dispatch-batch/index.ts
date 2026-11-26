// supabase/functions/dispatch-batch/index.ts
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

  const {data:pendingRows,error:pendingError}=await serviceClient.rpc('next_broadcast_notification_v1');
  const pendingNotification=pendingRows?.[0];

  if(pendingError)throw pendingError;
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
    const { count,error:countError } = await serviceClient
      .from("notification_deliveries")
      .select("id", { count: "exact", head: true })
      .eq("notification_id", pendingNotification.id)
      .in("status", ["pending", "dispatching", "failed_temporary"]);

    if(countError)throw countError;
    if (count === 0) {
      const {count:failed,error:failureError}=await serviceClient.from('notification_deliveries').select('id',{count:'exact',head:true}).eq('notification_id',pendingNotification.id).in('status',['failed_permanent','invalid_token','outcome_unknown']);if(failureError)throw failureError;
      await persist(serviceClient.from("notifications").update({ status: failed?'failed':'sent' }).eq("id", pendingNotification.id).eq('status','sending'));
    }
    return new Response(JSON.stringify({ ok: true, processed: 0 }), { status: 200 });
  }

  const tokenIds = claimed.map((d) => d.token_id);
  const { data: tokenRows,error:tokenError } = await serviceClient
    .from("push_tokens")
    .select("id, token")
    .in("id", tokenIds);
  if(tokenError)throw tokenError;
  const tokenById = new Map((tokenRows ?? []).map((t) => [t.id, t.token]));

  let sentCount = 0;
  let failedCount = 0;

  for (const delivery of claimed) {
    const deviceToken = tokenById.get(delivery.token_id);
    if (!deviceToken) {
      await persist(serviceClient
        .from("notification_deliveries")
        .update({ status: "failed_permanent", error_code: "token row missing" })
        .eq("id", delivery.id));
      failedCount++;
      continue;
    }

    let result;try{result = await sendToDeviceToken(deviceToken, {
      queuedBroadcast:true,
      category:pendingNotification.category,
      title: pendingNotification.title,
      body: pendingNotification.body,
      imageUrl: pendingNotification.image_url,
      deepLink: pendingNotification.deep_link,
      notificationId: pendingNotification.id,
      priority: pendingNotification.priority,
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
      const nextRetryAt = new Date(Date.now() + backoffMinutes * 60_000).toISOString();
      await persist(serviceClient
        .from("notification_deliveries")
        .update({
          status: "failed_temporary",
          attempts: nextRetryCount,
          next_retry_at: nextRetryAt,
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

  return new Response(
    JSON.stringify({ ok: true, notificationId: pendingNotification.id, processed: claimed.length, sentCount, failedCount }),
    { status: 200 }
  );
});
