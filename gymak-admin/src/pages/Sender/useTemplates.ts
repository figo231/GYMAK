import { useQuery } from "@tanstack/react-query";
import { supabase } from "../../lib/supabaseClient";

export interface TemplateRow {
  id: string;
  key: string;
  title_template: string;
  body_template: string;
  category: string;
}

export function useTemplates() {
  return useQuery({
    queryKey: ["templates-for-sender"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notification_templates")
        .select("id, key, title_template, body_template, category")
        .order("key");
      if (error) throw new Error(error.message);
      return (data ?? []) as TemplateRow[];
    },
  });
}
