// supabase/functions/send-notification/index.ts
import { verifyAdmin } from "../_shared/verifyAdmin.ts";
import { writeAuditLog } from "../_shared/auditLog.ts";
import { checkAndIncrementRateLimit } from "../_shared/rateLimit.ts";
import { sendToTopic } from "../_shared/fcmClient.ts";

const BATCH_INSERT_SIZE = 500;

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  let admin;
  try {
    admin = await verifyAdmin(req);
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message ?? "Unauthorized" }), { status: e.status ?? 401 });
  }

  const { notificationId } = await req.json().catch(() => ({}));
  if (!notificationId) {
    return new Response(JSON.stringify({ error: "notificationId is required" }), { status: 400 });
  }

  const rate = await checkAndIncrementRateLimit(admin.serviceClient, admin.userId).catch((e) => {
    throw e;
  });
  if (!rate.allowed) {
    return new Response(
      JSON.stringify({ error: `Rate limit exceeded (${rate.count}/${rate.limit} per hour)` }),
      { status: 429 }
    );
  }

  const { data: notification, error: notifError } = await admin.serviceClient
    .from("notifications")
    .select("*")
    .eq("id", notificationId)
    .maybeSingle();

  if (notifError || !notification) {
    return new Response(JSON.stringify({ error: "Notification not found" }), { status: 404 });
  }
  if (notification.status !== "draft" && notification.status !== "scheduled") {
    return new Response(JSON.stringify({ error: `Notification already ${notification.status}` }), { status: 409 });
  }

  try {
    if (notification.audience_type === "everyone" || notification.audience_type === "topic") {
      const topicName =
        notification.audience_type === "everyone"
          ? "all_users"
          : (notification.audience_ref?.topic as string);

      if (!topicName) {
        return new Response(JSON.stringify({ error: "Missing topic name in audience_ref" }), { status: 400 });
      }

      const result = await sendToTopic(topicName, {
        title: notification.title,
        body: notification.body,
        imageUrl: notification.image_url,
        deepLink: notification.deep_link,
        notificationId: notification.id,
        priority: notification.priority,
      });

      await admin.serviceClient
        .from("notifications")
        .update({ status: result.ok ? "sent" : "failed", sent_at: new Date().toISOString() })
        .eq("id", notification.id);

      await writeAuditLog(admin.serviceClient, {
        adminId: admin.userId,
        action: "notification_sent",
        targetTable: "notifications",
        targetId: notification.id,
        details: { audience_type: notification.audience_type, topic: topicName, result },
      });

      return new Response(JSON.stringify({ ok: result.ok, mode: "topic", result }), { status: 200 });
    }

    // Token-based audiences: single_user / selected_users / test_device.
    let userIds: string[] = [];
    if (notification.audience_type === "single_user") {
      userIds = [notification.audience_ref?.user_id].filter(Boolean);
    } else if (notification.audience_type === "selected_users") {
      userIds = Array.isArray(notification.audience_ref?.user_ids) ? notification.audience_ref.user_ids : [];
    } else if (notification.audience_type === "test_device") {
      userIds = [notification.audience_ref?.user_id].filter(Boolean);
    }

    if (userIds.length === 0) {
      return new Response(JSON.stringify({ error: "No target users resolved from audience_ref" }), { status: 400 });
    }

    const { data: preferenceRows } = await admin.serviceClient
      .from("push_preferences")
      .select("user_id")
      .eq("category", notification.category)
      .eq("enabled", false)
      .in("user_id", userIds);
    const optedOut = new Set((preferenceRows ?? []).map((r) => r.user_id));

    const { data: tokenRows, error: tokenError } = await admin.serviceClient
      .from("push_tokens")
      .select("id, user_id")
      .in("user_id", userIds)
      .eq("is_active", true);

    if (tokenError) throw new Error(tokenError.message);

    const targetTokens = (tokenRows ?? []).filter((t) => !optedOut.has(t.user_id));

    if (targetTokens.length === 0) {
      await admin.serviceClient.from("notifications").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", notification.id);
      return new Response(JSON.stringify({ ok: true, mode: "tokens", targeted: 0 }), { status: 200 });
    }

    for (let i = 0; i < targetTokens.length; i += BATCH_INSERT_SIZE) {
      const chunk = targetTokens.slice(i, i + BATCH_INSERT_SIZE).map((t) => ({
        notification_id: notification.id,
        token_id: t.id,
        status: "pending",
      }));
      const { error: insertError } = await admin.serviceClient
        .from("notification_deliveries")
        .upsert(chunk, { onConflict: "notification_id,token_id", ignoreDuplicates: true });
      if (insertError) throw new Error(insertError.message);
    }

    await admin.serviceClient
      .from("notifications")
      .update({ status: "sending" })
      .eq("id", notification.id);

    await writeAuditLog(admin.serviceClient, {
      adminId: admin.userId,
      action: "notification_sent",
      targetTable: "notifications",
      targetId: notification.id,
      details: { audience_type: notification.audience_type, targeted: targetTokens.length },
    });

    return new Response(JSON.stringify({ ok: true, mode: "tokens", targeted: targetTokens.length }), { status: 200 });
  } catch (e) {
    await admin.serviceClient.from("notifications").update({ status: "failed" }).eq("id", notification.id);
    return new Response(JSON.stringify({ error: e.message ?? "Send failed" }), { status: 500 });
  }
});
