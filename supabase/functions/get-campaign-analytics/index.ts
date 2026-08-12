// supabase/functions/get-campaign-analytics/index.ts
import { verifyAdmin } from "../_shared/verifyAdmin.ts";

async function summarize(serviceClient, notificationId: string) {
  const { data: deliveries } = await serviceClient
    .from("notification_deliveries")
    .select("status")
    .eq("notification_id", notificationId);

  const { data: events } = await serviceClient
    .from("notification_events")
    .select("event_type")
    .eq("notification_id", notificationId);

  const deliveryCounts = { pending: 0, dispatching: 0, sent: 0, failed_temporary: 0, failed_permanent: 0, invalid_token: 0 };
  for (const d of deliveries ?? []) deliveryCounts[d.status] = (deliveryCounts[d.status] ?? 0) + 1;

  const eventCounts = { received: 0, opened: 0, click_through: 0 };
  for (const e of events ?? []) eventCounts[e.event_type] = (eventCounts[e.event_type] ?? 0) + 1;

  return {
    notificationId,
    totalTargeted: deliveries?.length ?? 0,
    deliveryCounts,
    eventCounts,
  };
}

Deno.serve(async (req: Request) => {
  let admin;
  try {
    admin = await verifyAdmin(req);
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message ?? "Unauthorized" }), { status: e.status ?? 401 });
  }

  const url = new URL(req.url);
  const notificationId = url.searchParams.get("notificationId");
  if (!notificationId) {
    return new Response(JSON.stringify({ error: "notificationId query param is required" }), { status: 400 });
  }

  const { data: notification, error: notifError } = await admin.serviceClient
    .from("notifications")
    .select("id, parent_campaign_id, variant_group")
    .eq("id", notificationId)
    .maybeSingle();

  if (notifError || !notification) {
    return new Response(JSON.stringify({ error: "Notification not found" }), { status: 404 });
  }

  const own = await summarize(admin.serviceClient, notification.id);

  const campaignRootId = notification.parent_campaign_id ?? notification.id;
  const { data: siblings } = await admin.serviceClient
    .from("notifications")
    .select("id, variant_group")
    .or(`id.eq.${campaignRootId},parent_campaign_id.eq.${campaignRootId}`);

  const variants = [];
  for (const sibling of siblings ?? []) {
    if (sibling.id === notification.id) continue;
    variants.push({ variant_group: sibling.variant_group, ...(await summarize(admin.serviceClient, sibling.id)) });
  }

  return new Response(
    JSON.stringify({
      own: { variant_group: notification.variant_group, ...own },
      variants,
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
});
