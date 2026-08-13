import { useQuery } from "@tanstack/react-query";
import { supabase } from "../../lib/supabaseClient";

export interface TopicRow {
  id: string;
  name: string;
  description: string | null;
}

export function useTopics() {
  return useQuery({
    queryKey: ["topics-for-sender"],
    queryFn: async () => {
      const { data, error } = await supabase.from("push_topics").select("id, name, description").order("name");
      if (error) throw new Error(error.message);
      return (data ?? []) as TopicRow[];
    },
  });
}
