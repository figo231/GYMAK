import { useQuery } from "@tanstack/react-query";
import { supabase } from "../../lib/supabaseClient";

export interface TopicRow {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  subscriberCount: number;
}

export interface TopicsFilter {
  search: string;
}

export function useTopicsList(filter: TopicsFilter) {
  return useQuery({
    queryKey: ["topics-list", filter],
    queryFn: async () => {
      let query = supabase.from("push_topics").select("id, name, description, created_at").order("name");
      if (filter.search.trim()) {
        query = query.ilike("name", `%${filter.search.trim()}%`);
      }

      const { data: topics, error } = await query;
      if (error) throw new Error(error.message);

      const rows = topics ?? [];
      const withCounts: TopicRow[] = await Promise.all(
        rows.map(async (t) => {
          const { count, error: countError } = await supabase
            .from("push_topic_subscriptions")
            .select("id", { count: "exact", head: true })
            .eq("topic_id", t.id);
          if (countError) throw new Error(countError.message);
          return { ...t, subscriberCount: count ?? 0 };
        })
      );

      return withCounts;
    },
  });
}
