import { useQuery } from "@tanstack/react-query";
import { supabase } from "../../lib/supabaseClient";

export interface TemplateRow {
  id: string;
  key: string;
  title_template: string;
  body_template: string;
  category: string;
  created_at: string;
  updated_at: string;
}

export interface TemplatesFilter {
  search: string;
  category: string; // "all" or a category value
}

export function useTemplatesList(filter: TemplatesFilter) {
  return useQuery({
    queryKey: ["templates-list", filter],
    queryFn: async () => {
      let query = supabase.from("notification_templates").select("*").order("key");

      if (filter.search.trim()) {
        query = query.ilike("key", `%${filter.search.trim()}%`);
      }
      if (filter.category !== "all") {
        query = query.eq("category", filter.category);
      }

      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return (data ?? []) as TemplateRow[];
    },
  });
}
