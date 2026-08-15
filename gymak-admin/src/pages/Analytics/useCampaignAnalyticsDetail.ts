import { useQuery } from "@tanstack/react-query";
import { supabase } from "../../lib/supabaseClient";
import { computeMetrics, type CampaignMetrics } from "./analyticsMath";

interface EdgeFunctionResponse {
  own: {
    variant_group: string | null;
    notificationId: string;
    totalTargeted: number;
    deliveryCounts: {
      pending: number;
      dispatching: number;
      sent: number;
      failed_temporary: number;
      failed_permanent: number;
      invalid_token: number;
    };
    eventCounts: { received: number; opened: number; click_through: number };
  };
  variants: Array<{ variant_group: string | null; totalTargeted: number }>;
}

export interface CampaignAnalyticsDetail {
  metrics: CampaignMetrics;
  hasDeliveryData: boolean;
}

export function useCampaignAnalyticsDetail(notificationId: string | null) {
  return useQuery({
    queryKey: ["campaign-analytics-detail", notificationId],
    enabled: Boolean(notificationId),
    queryFn: async (): Promise<CampaignAnalyticsDetail> => {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const baseUrl = import.meta.env.VITE_SUPABASE_URL as string;
      const url = `${baseUrl}/functions/v1/get-campaign-analytics?notificationId=${encodeURIComponent(notificationId!)}`;

      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `فشل تحميل التحليلات (${res.status})`);
      }
      const data = (await res.json()) as EdgeFunctionResponse;

      const failed =
        data.own.deliveryCounts.failed_temporary +
        data.own.deliveryCounts.failed_permanent +
        data.own.deliveryCounts.invalid_token;

      return {
        hasDeliveryData: data.own.totalTargeted > 0,
        metrics: computeMetrics({
          totalTargeted: data.own.totalTargeted,
          sentCount: data.own.deliveryCounts.sent,
          failedCount: failed,
          openedCount: data.own.eventCounts.opened,
          clickedCount: data.own.eventCounts.click_through,
        }),
      };
    },
  });
}
