import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../lib/supabaseClient";

function friendlyError(error: { code?: string; message: string }): string {
  if (error.code === "23505") return "اسم الموضوع (topic) ده مستخدم بالفعل — اختار اسم مختلف";
  return error.message;
}

export function useCreateTopic() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (values: { name: string; description: string }) => {
      const { error } = await supabase.from("push_topics").insert(values);
      if (error) throw new Error(friendlyError(error));
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["topics-list"] });
      void queryClient.invalidateQueries({ queryKey: ["topics-for-sender"] });
    },
  });
}

export function useUpdateTopicDescription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, description }: { id: string; description: string }) => {
      const { error } = await supabase.from("push_topics").update({ description }).eq("id", id);
      if (error) throw new Error(friendlyError(error));
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["topics-list"] });
    },
  });
}

export function useDeleteTopic() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("push_topics").delete().eq("id", id);
      if (error) throw new Error(friendlyError(error));
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["topics-list"] });
      void queryClient.invalidateQueries({ queryKey: ["topics-for-sender"] });
    },
  });
}
