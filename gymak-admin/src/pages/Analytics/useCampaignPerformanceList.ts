import { useQuery } from "@tanstack/react-query";
import { supabase } from "../../lib/supabaseClient";
import { computeMetrics, type CampaignMetrics } from "./analyticsMath";
import type { NotificationStatus } from "../../types/notification";

export const PAGE_SIZE = 10;

export interface AnalyticsFilter {
  page: number;
  status: NotificationStatus | "all";
  category: string;
  dateFrom: string;
  dateTo: string;
}

export interface CampaignPerformanceRow {
  id: string;
  title: string;
  status: NotificationStatus;
  category: string;
  audience_type: string;
  created_at: string;
  metrics: CampaignMetrics;
}

export function useCampaignPerformanceList(filter: AnalyticsFilter) {
  return useQuery({
    queryKey: ["campaign-performance-list", filter],
    queryFn: async () => {
      const from = (filter.page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from("notifications")
        .select("id, title, status, category, audience_type, created_at", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to);

      if (filter.status !== "all") query = query.eq("status", filter.status);
      if (filter.category !== "all") query = query.eq("category", filter.category);
      if (filter.dateFrom) query = query.gte("created_at", `${filter.dateFrom}T00:00:00`);
      if (filter.dateTo) query = query.lte("created_at", `${filter.dateTo}T23:59:59`);

      const { data: campaigns, error, count } = await query;
      if (error) throw new Error(error.message);

      const rows = campaigns ?? [];
      const ids = rows.map((r) => r.id);

      const deliveryCountByCampaign = new Map<string, { total: number; sent: number; failed: number }>();
      const eventCountByCampaign = new Map<string, { opened: number; clicked: number }>();

      if (ids.length > 0) {
        const { data: deliveries, error: deliveriesError } = await supabase
          .from("notification_deliveries")
          .select("notification_id, status")
          .in("notification_id", ids);
        if (deliveriesError) throw new Error(deliveriesError.message);

        for (const d of deliveries ?? []) {
          const bucket = deliveryCountByCampaign.get(d.notification_id) ?? { total: 0, sent: 0, failed: 0 };
          bucket.total += 1;
          if (d.status === "sent") bucket.sent += 1;
          if (d.status === "failed_temporary" || d.status === "failed_permanent" || d.status === "invalid_token") {
            bucket.failed += 1;
          }
          deliveryCountByCampaign.set(d.notification_id, bucket);
        }

        const { data: events, error: eventsError } = await supabase
          .from("notification_events")
          .select("notification_id, event_type")
          .in("notification_id", ids);
        if (eventsError) throw new Error(eventsError.message);

        for (const e of events ?? []) {
          const bucket = eventCountByCampaign.get(e.notification_id) ?? { opened: 0, clicked: 0 };
          if (e.event_type === "opened") bucket.opened += 1;
          if (e.event_type === "click_through") bucket.clicked += 1;
          eventCountByCampaign.set(e.notification_id, bucket);
        }
      }

      const result: CampaignPerformanceRow[] = rows.map((r) => {
        const d = deliveryCountByCampaign.get(r.id) ?? { total: 0, sent: 0, failed: 0 };
        const e = eventCountByCampaign.get(r.id) ?? { opened: 0, clicked: 0 };
        return {
          id: r.id,
          title: r.title,
          status: r.status,
          category: r.category,
          audience_type: r.audience_type,
          created_at: r.created_at,
          metrics: computeMetrics({
            totalTargeted: d.total,
            sentCount: d.sent,
            failedCount: d.failed,
            openedCount: e.opened,
            clickedCount: e.clicked,
          }),
        };
      });

      return { rows: result, totalCount: count ?? 0 };
    },
    placeholderData: (prev) => prev,
  });
}
