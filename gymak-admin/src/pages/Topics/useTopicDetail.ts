import { useQuery } from "@tanstack/react-query";
import { supabase } from "../../lib/supabaseClient";

export function useTopicDetail(topicId: string | undefined) {
  return useQuery({
    queryKey: ["topic-detail", topicId],
    enabled: Boolean(topicId),
    queryFn: async () => {
      const { data: topic, error } = await supabase
        .from("push_topics")
        .select("id, name, description, created_at")
        .eq("id", topicId!)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!topic) throw new Error("الموضوع غير موجود");

      const { count, error: countError } = await supabase
        .from("push_topic_subscriptions")
        .select("id", { count: "exact", head: true })
        .eq("topic_id", topicId!);
      if (countError) throw new Error(countError.message);

      return { topic, subscriberCount: count ?? 0 };
    },
  });
}
