import { useMutation } from "@tanstack/react-query";
import { supabase } from "../../lib/supabaseClient";

export type AudienceChoice = "everyone" | "topic" | "single_user";

export interface SendNotificationInput {
  title: string;
  body: string;
  category: string;
  priority: "normal" | "high";
  audienceType: AudienceChoice;
  topicName: string | null;
  selectedUserId: string | null;
  templateId: string | null;
}

export function useSendNotification() {
  return useMutation({
    mutationFn: async (input: SendNotificationInput) => {
      const audience_ref =
        input.audienceType === "topic"
          ? { topic: input.topicName }
          : input.audienceType === "single_user"
            ? { user_id: input.selectedUserId }
            : null;

      const { data: inserted, error: insertError } = await supabase
        .from("notifications")
        .insert({
          template_id: input.templateId,
          title: input.title,
          body: input.body,
          category: input.category,
          priority: input.priority,
          audience_type: input.audienceType === "everyone" ? "everyone" : input.audienceType,
          audience_ref,
          status: "draft",
        })
        .select("id")
        .single();

      if (insertError) throw new Error(insertError.message);

      // Delegates entirely to the existing Sprint 10 backend: audience
      // resolution, push_preferences opt-out filtering, rate limiting, and
      // admin_audit_log recording all happen server-side inside this
      // function already — nothing is duplicated here.
      const { data: fnData, error: fnError } = await supabase.functions.invoke("send-notification", {
        body: { notificationId: inserted.id },
      });

      if (fnError) throw new Error(fnError.message);
      return { notificationId: inserted.id as string, result: fnData };
    },
  });
}
