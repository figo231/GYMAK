import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../lib/supabaseClient";

export interface TemplateFormValues {
  key: string;
  title_template: string;
  body_template: string;
  category: string;
}

function friendlyError(error: { code?: string; message: string }): string {
  if (error.code === "23505") return "المفتاح (key) ده مستخدم بالفعل — اختار مفتاح مختلف";
  return error.message;
}

export function useCreateTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (values: TemplateFormValues) => {
      const { error } = await supabase.from("notification_templates").insert(values);
      if (error) throw new Error(friendlyError(error));
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["templates-list"] });
      void queryClient.invalidateQueries({ queryKey: ["templates-for-sender"] });
    },
  });
}

export function useUpdateTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: TemplateFormValues }) => {
      const { error } = await supabase.from("notification_templates").update(values).eq("id", id);
      if (error) throw new Error(friendlyError(error));
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["templates-list"] });
      void queryClient.invalidateQueries({ queryKey: ["templates-for-sender"] });
    },
  });
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("notification_templates").delete().eq("id", id);
      if (error) throw new Error(friendlyError(error));
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["templates-list"] });
      void queryClient.invalidateQueries({ queryKey: ["templates-for-sender"] });
    },
  });
}
