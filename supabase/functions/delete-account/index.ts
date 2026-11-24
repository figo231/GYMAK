// supabase/functions/delete-account/index.ts
// Lets a signed-in user permanently delete their OWN account and all rows
// (every table references auth.users with ON DELETE CASCADE). Required by
// Google Play for apps with account creation.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: cors });

  const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!jwt) return new Response(JSON.stringify({ error: "Missing Authorization header" }), { status: 401, headers: cors });

  const service = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });
  const { data, error } = await service.auth.getUser(jwt);
  if (error || !data?.user) return new Response(JSON.stringify({ error: "Invalid session" }), { status: 401, headers: cors });

  // Storage objects are not removed by the auth cascade: delete the user's avatar folder first.
  try {
    const { data: files } = await service.storage.from("avatars").list(data.user.id, { limit: 100 });
    if (files?.length) await service.storage.from("avatars").remove(files.map((f) => `${data.user.id}/${f.name}`));
  } catch (_) { /* best effort; account deletion proceeds */ }

  // Photo originals and avatars must be physically removed before the row cascade loses their paths.
  // Fail closed for these private files, so retrying account deletion can finish cleanup.
  try {
    const uid=data.user.id;
    const {data:photos,error:photoError}=await service.from('chat_photos').select('id,path').or(`sender_id.eq.${uid},recipient_id.eq.${uid}`);
    if(photoError)throw photoError;
    for(let i=0;i<(photos||[]).length;i+=100){const {error:e}=await service.storage.from('chat-delivery').remove(photos!.slice(i,i+100).map(p=>p.path));if(e)throw e;}
    const {error:avatarError}=await service.storage.from('chat-avatars').remove([`${uid}/chat-avatar.jpg`]);if(avatarError)throw avatarError;
    const {data:reports,error:reportError}=await service.from('moderation_reports').select('photo_evidence_path').or(`reporter_id.eq.${uid},target_user_id.eq.${uid}`).not('photo_evidence_path','is',null);if(reportError)throw reportError;
    for(let i=0;i<(reports||[]).length;i+=100){const {error:e}=await service.storage.from('chat-report-evidence').remove(reports!.slice(i,i+100).map(p=>p.photo_evidence_path));if(e)throw e;}
  } catch (_) { return new Response(JSON.stringify({error:'Photo cleanup could not finish. Please retry account deletion.'}),{status:503,headers:{...cors,'Content-Type':'application/json'}}); }

  // Only ever the caller's own id, taken from the verified token.
  const { error: delError } = await service.auth.admin.deleteUser(data.user.id);
  if (delError) return new Response(JSON.stringify({ error: delError.message }), { status: 500, headers: cors });
  return new Response(JSON.stringify({ ok: true }), { headers: { ...cors, "Content-Type": "application/json" } });
});
