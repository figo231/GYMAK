import { useQuery } from "@tanstack/react-query";
import { supabase } from "../../lib/supabaseClient";
import type { DeliveryCounts, EventCounts, NotificationRow } from "../../types/notification";

async function countByStatus(notificationId: string): Promise<DeliveryCounts> {
  const statuses: (keyof DeliveryCounts)[] = [
    "pending",
    "dispatching",
    "sent",
    "failed_temporary",
    "failed_permanent",
    "invalid_token",
  ];

  const counts = {} as DeliveryCounts;
  await Promise.all(
    statuses.map(async (status) => {
      const { count, error } = await supabase
        .from("notification_deliveries")
        .select("id", { count: "exact", head: true })
        .eq("notification_id", notificationId)
        .eq("status", status);
      if (error) throw new Error(error.message);
      counts[status] = count ?? 0;
    })
  );
  return counts;
}

async function countByEventType(notificationId: string): Promise<EventCounts> {
  const types: (keyof EventCounts)[] = ["received", "opened", "click_through"];
  const counts = {} as EventCounts;
  await Promise.all(
    types.map(async (type) => {
      const { count, error } = await supabase
        .from("notification_events")
        .select("id", { count: "exact", head: true })
        .eq("notification_id", notificationId)
        .eq("event_type", type);
      if (error) throw new Error(error.message);
      counts[type] = count ?? 0;
    })
  );
  return counts;
}

export function useCampaignDetail(notificationId: string | undefined) {
  return useQuery({
    queryKey: ["campaign-detail", notificationId],
    enabled: Boolean(notificationId),
    queryFn: async () => {
      const { data: notification, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("id", notificationId!)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!notification) throw new Error("الحملة غير موجودة");

      const [deliveryCounts, eventCounts] = await Promise.all([
        countByStatus(notificationId!),
        countByEventType(notificationId!),
      ]);

      return { notification: notification as NotificationRow, deliveryCounts, eventCounts };
    },
  });
}
