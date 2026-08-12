import { useQuery } from "@tanstack/react-query";
import { supabase } from "../../lib/supabaseClient";
import type { NotificationRow, NotificationStatus } from "../../types/notification";

export const PAGE_SIZE = 20;

export interface CampaignsFilter {
  page: number;
  search: string;
  status: NotificationStatus | "all";
}

export function useCampaigns(filter: CampaignsFilter) {
  return useQuery({
    queryKey: ["campaigns", filter],
    queryFn: async () => {
      const from = (filter.page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from("notifications")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to);

      if (filter.search.trim()) {
        query = query.ilike("title", `%${filter.search.trim()}%`);
      }
      if (filter.status !== "all") {
        query = query.eq("status", filter.status);
      }

      const { data, error, count } = await query;
      if (error) throw new Error(error.message);

      return { rows: (data ?? []) as NotificationRow[], totalCount: count ?? 0 };
    },
    placeholderData: (prev) => prev,
  });
}
