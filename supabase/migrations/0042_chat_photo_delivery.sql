begin;
create table public.chat_photos(id uuid primary key default gen_random_uuid(),conversation_id uuid not null references public.chat_conversations(id) on delete cascade,sender_id uuid not null references auth.users(id) on delete cascade,recipient_id uuid not null references auth.users(id) on delete cascade,nonce uuid not null,path text not null unique,bytes integer not null check(bytes between 1 and 204800),status text not null default 'reserved' check(status in('reserved','ready','saved','expired')),created_at timestamptz not null default now(),expires_at timestamptz not null default now()+interval '7 days',saved_at timestamptz,message_id uuid unique references public.chat_messages(id) on delete cascade,unique(sender_id,nonce));
alter table public.chat_messages add column photo_id uuid references public.chat_photos(id) on delete set null;
alter table public.chat_photos enable row level security;
revoke all on public.chat_photos from public,anon,authenticated;grant all on public.chat_photos to service_role;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('chat-delivery','chat-delivery',false,204800,array['image/jpeg']) on conflict(id) do nothing;
-- No client Storage policies. All bytes pass through a participant-authorized delivery endpoint.
create function public.chat_photo_reserve(p_thread uuid,p_nonce uuid,p_bytes integer) returns jsonb language plpgsql security definer set search_path='' as $$
declare c public.chat_conversations;r public.chat_photos;v_id uuid:=gen_random_uuid();begin
 if auth.uid() is null then raise exception 'not_authenticated' using errcode='42501';end if;
 if not public.chat_has_consent_v2() then raise exception 'consent_required' using errcode='42501';end if;
 select * into c from public.chat_conversations where id=p_thread and auth.uid() in(client_id,professional_id);
 if not found or not public.chat_link_active_v2(c.client_id,c.professional_id,c.kind) then raise exception 'chat_not_allowed' using errcode='42501';end if;
 if public.chat_blocked_between(c.client_id,c.professional_id) then raise exception 'chat_blocked' using errcode='42501';end if;
 if p_nonce is null or p_bytes is null or p_bytes not between 1 and 204800 then raise exception 'invalid_photo';end if;
 perform pg_advisory_xact_lock(hashtext('chat-photo-cap'));
 select * into r from public.chat_photos where sender_id=auth.uid() and nonce=p_nonce;
 if found then if r.conversation_id<>p_thread or r.bytes<>p_bytes then raise exception 'idempotency_conflict';end if;return to_jsonb(r);end if;
 if (select count(*) from public.chat_photos where sender_id=auth.uid() and created_at>now()-interval '1 day')>=10 then raise exception 'photo_daily_limit';end if;
 if (select coalesce(sum(bytes),0) from public.chat_photos where status in('reserved','ready'))+p_bytes>209715200 then raise exception 'photo_capacity';end if;
 insert into public.chat_photos(id,conversation_id,sender_id,recipient_id,nonce,path,bytes) values(v_id,p_thread,auth.uid(),case when c.client_id=auth.uid() then c.professional_id else c.client_id end,p_nonce,p_thread::text||'/'||v_id::text||'.jpg',p_bytes) returning * into r;
 return to_jsonb(r);
end $$;
create function public.chat_photo_publish(p_photo uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.chat_photos;m public.chat_messages;begin
 select * into r from public.chat_photos where id=p_photo and sender_id=auth.uid() for update;
 if not found then raise exception 'photo_not_allowed' using errcode='42501';end if;
 if r.message_id is not null then select * into m from public.chat_messages where id=r.message_id;return to_jsonb(m);end if;
 if r.expires_at<=now() or r.status<>'reserved' or not exists(select 1 from storage.objects where bucket_id='chat-delivery' and name=r.path) then raise exception 'photo_unavailable';end if;
 select * into m from public.chat_send_v2(r.conversation_id,'📷 صورة',r.nonce);
 update public.chat_messages set photo_id=r.id where id=m.id returning * into m;
 update public.chat_photos set status='ready',message_id=m.id where id=r.id;
 return to_jsonb(m);
end $$;
create function public.chat_photo_access(p_photo uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare r public.chat_photos;begin
 if not public.chat_has_consent_v2() then raise exception 'consent_required' using errcode='42501';end if;
 select * into r from public.chat_photos where id=p_photo and auth.uid() in(sender_id,recipient_id);
 if not found then raise exception 'photo_not_allowed' using errcode='42501';end if;
 return jsonb_build_object('id',r.id,'conversation_id',r.conversation_id,'sender_id',r.sender_id,'recipient_id',r.recipient_id,'path',r.path,'status',r.status,'expires_at',r.expires_at,'bytes',r.bytes,'blocked',public.chat_blocked_between(r.sender_id,r.recipient_id));
end $$;
-- The service confirms physical object deletion, then records terminal state. Client cannot fake server cleanup.
create function public.chat_photo_removed(p_photo uuid,p_saved boolean) returns void language plpgsql security definer set search_path='' as $$begin
 update public.chat_photos set status=case when p_saved then 'saved' else 'expired' end,saved_at=case when p_saved then now() else null end where id=p_photo;
end $$;
revoke all on function public.chat_photo_reserve(uuid,uuid,integer),public.chat_photo_publish(uuid),public.chat_photo_access(uuid),public.chat_photo_removed(uuid,boolean) from public,anon,authenticated;
grant execute on function public.chat_photo_reserve(uuid,uuid,integer),public.chat_photo_publish(uuid),public.chat_photo_access(uuid) to authenticated;
grant execute on function public.chat_photo_removed(uuid,boolean) to service_role;
commit;
