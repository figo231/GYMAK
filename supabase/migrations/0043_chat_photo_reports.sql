begin;
alter table public.moderation_reports add column photo_evidence_path text,add column photo_evidence_expires_at timestamptz;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('chat-report-evidence','chat-report-evidence',false,204800,array['image/jpeg']) on conflict(id) do nothing;
-- A reporter-provided copy is not proof of the original. This distinction is kept in the owner UI.
create function public.chat_photo_report(p_photo uuid,p_reason text,p_details text,p_include boolean) returns uuid language plpgsql security definer set search_path='' as $$
declare r public.chat_photos;report uuid;begin
 if p_include is null then raise exception 'invalid_report';end if;
 select * into r from public.chat_photos where id=p_photo and recipient_id=auth.uid() and message_id is not null;
 if not found then raise exception 'report_not_allowed' using errcode='42501';end if;
 if p_include then
 perform pg_advisory_xact_lock(hashtext('chat-photo-evidence-cap'));
 if (select count(*) from public.moderation_reports where photo_evidence_path is not null and photo_evidence_expires_at>now())>=250 then raise exception 'photo_capacity';end if;
 end if;
 report:=public.moderation_report('chat_message',p_reason,null,r.conversation_id,r.message_id,null,left(coalesce(p_details,'')||case when p_include then E'\n[Photo: reporter-provided device copy requested]' else E'\n[Photo: original not attached]' end,1000));
 if p_include then update public.moderation_reports set photo_evidence_path=report::text||'.jpg',photo_evidence_expires_at=now()+interval '30 days' where id=report;end if;
 return report;
end $$;
create function public.chat_report_photo_access(p_report uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare r public.moderation_reports;begin
 select * into r from public.moderation_reports where id=p_report and (reporter_id=auth.uid() or public.chat_is_owner());
 if not found then raise exception 'report_not_allowed' using errcode='42501';end if;
 return jsonb_build_object('reporter_id',r.reporter_id,'owner',public.chat_is_owner(),'path',r.photo_evidence_path,'expires_at',r.photo_evidence_expires_at);
end $$;
revoke all on function public.chat_photo_report(uuid,text,text,boolean),public.chat_report_photo_access(uuid) from public,anon,authenticated;
grant execute on function public.chat_photo_report(uuid,text,text,boolean),public.chat_report_photo_access(uuid) to authenticated;
commit;
