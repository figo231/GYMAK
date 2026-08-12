// supabase/functions/_shared/auditLog.ts
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export async function writeAuditLog(
  serviceClient: SupabaseClient,
  entry: {
    adminId: string | null;
    action: string;
    targetTable?: string;
    targetId?: string;
    details?: Record<string, unknown>;
  }
): Promise<void> {
  const { error } = await serviceClient.from("admin_audit_log").insert({
    admin_id: entry.adminId,
    action: entry.action,
    target_table: entry.targetTable ?? null,
    target_id: entry.targetId ?? null,
    details: entry.details ?? {},
  });
  if (error) {
    console.error("[audit-log] failed to write entry", error, entry);
  }
}
