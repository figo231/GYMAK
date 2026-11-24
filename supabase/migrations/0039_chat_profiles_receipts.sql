begin;
alter table public.chat_conversations add column receipt_updated_at timestamptz;
create table public.chat_profiles(user_id uuid primary key references auth.users(id) on delete cascade,display_name text not null default '' check(char_length(display_name)<=80),bio text not null default '' check(char_length(bio)<=400),avatar_path text,visible boolean not null default false,read_receipts boolean not null default true,updated_at timestamptz not null default now());
create table public.chat_receipts(conversation_id uuid not null references public.chat_conversations(id) on delete cascade,user_id uuid not null references auth.users(id) on delete cascade,delivered_seq bigint not null default 0,read_seq bigint not null default 0,primary key(conversation_id,user_id));
alter table public.chat_profiles enable row level security;alter table public.chat_receipts enable row level security;
revoke all on public.chat_profiles,public.chat_receipts from public,anon,authenticated;grant all on public.chat_profiles,public.chat_receipts to service_role;
create function public.chat_profile_save(p_name text,p_bio text,p_avatar text,p_visible boolean,p_reads boolean) returns void language plpgsql security definer set search_path='' as $$begin
 if auth.uid() is null then raise exception 'not_authenticated' using errcode='42501';end if;
 if p_name is null or char_length(btrim(p_name))>80 or p_bio is null or char_length(btrim(p_bio))>400 or p_visible is null or p_reads is null then raise exception 'invalid_profile';end if;
 if p_visible and char_length(btrim(p_name))<1 then raise exception 'invalid_profile';end if;
 if p_avatar is not null and p_avatar<>auth.uid()::text||'/chat-avatar.jpg' then raise exception 'invalid_avatar';end if;
 insert into public.chat_profiles(user_id,display_name,bio,avatar_path,visible,read_receipts) values(auth.uid(),btrim(p_name),btrim(p_bio),p_avatar,p_visible,p_reads)
 on conflict(user_id) do update set display_name=excluded.display_name,bio=excluded.bio,avatar_path=excluded.avatar_path,visible=excluded.visible,read_receipts=excluded.read_receipts,updated_at=now();
end $$;
create function public.chat_profile_get(p_user_id uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare p public.chat_profiles;dev boolean;v boolean;begin
 if auth.uid() is null then raise exception 'not_authenticated' using errcode='42501';end if;
 select * into p from public.chat_profiles where user_id=p_user_id;
 select exists(select 1 from public.admin_users where user_id=p_user_id and role='super_admin') into dev;
 select exists(select 1 from public.chat_verifications where user_id=p_user_id) into v;
 if p_user_id=auth.uid() then return jsonb_build_object('user_id',p_user_id,'display_name',coalesce(p.display_name,''),'bio',coalesce(p.bio,''),'avatar_path',p.avatar_path,'visible',coalesce(p.visible,false),'read_receipts',coalesce(p.read_receipts,true),'verified',v or dev,'is_developer',dev,'role',public.chat_role_for(p_user_id));end if;
 if public.chat_blocked_between(auth.uid(),p_user_id) or not exists(select 1 from auth.users where id=p_user_id) or (not coalesce(p.visible,false) and not dev and not exists(select 1 from public.chat_conversations c where auth.uid() in(c.client_id,c.professional_id) and p_user_id in(c.client_id,c.professional_id))) then raise exception 'profile_unavailable';end if;
 return jsonb_build_object('user_id',p_user_id,'display_name',case when p.visible then p.display_name when dev then 'مطور GYMAK' else coalesce((select coalesce(nullif(name,''),nullif(username,'')) from public.profiles where id=p_user_id),'مستخدم') end,'bio',case when p.visible then p.bio else '' end,'avatar_path',case when p.visible then p.avatar_path else null end,'visible',coalesce(p.visible,false),'verified',v or dev,'is_developer',dev,'role',public.chat_role_for(p_user_id));
end $$;
create function public.chat_ack(p_thread uuid,p_through bigint,p_read boolean default false) returns void language plpgsql security definer set search_path='' as $$
declare c public.chat_conversations;v_max bigint;v_read bigint:=0;begin
 if auth.uid() is null then raise exception 'not_authenticated' using errcode='42501';end if;
 if not public.chat_has_consent_v2() then raise exception 'consent_required' using errcode='42501';end if;
 select * into c from public.chat_conversations where id=p_thread and auth.uid() in(client_id,professional_id);
 if not found then raise exception 'chat_not_allowed' using errcode='42501';end if;
 if p_through is null or p_through<0 or p_read is null then raise exception 'invalid_receipt';end if;
 select coalesce(max(seq),0) into v_max from public.chat_messages where conversation_id=p_thread and seq<=p_through;
 if p_read and coalesce((select read_receipts from public.chat_profiles where user_id=auth.uid()),true) then v_read:=v_max;end if;
 insert into public.chat_receipts(conversation_id,user_id,delivered_seq,read_seq) values(p_thread,auth.uid(),v_max,v_read) on conflict(conversation_id,user_id) do update set delivered_seq=greatest(public.chat_receipts.delivered_seq,excluded.delivered_seq),read_seq=greatest(public.chat_receipts.read_seq,excluded.read_seq) where public.chat_receipts.delivered_seq<excluded.delivered_seq or public.chat_receipts.read_seq<excluded.read_seq;
 if found then update public.chat_conversations set receipt_updated_at=now() where id=p_thread;end if;
end $$;
create function public.chat_receipt_status(p_thread uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare c public.chat_conversations;peer uuid;r public.chat_receipts;reads boolean;begin
 if auth.uid() is null then raise exception 'not_authenticated' using errcode='42501';end if;
 if not public.chat_has_consent_v2() then raise exception 'consent_required' using errcode='42501';end if;
 select * into c from public.chat_conversations where id=p_thread and auth.uid() in(client_id,professional_id);
 if not found then raise exception 'chat_not_allowed' using errcode='42501';end if;
 peer:=case when c.client_id=auth.uid() then c.professional_id else c.client_id end;
 select * into r from public.chat_receipts where conversation_id=p_thread and user_id=peer;
 reads:=coalesce((select read_receipts from public.chat_profiles where user_id=auth.uid()),true) and coalesce((select read_receipts from public.chat_profiles where user_id=peer),true);
 return jsonb_build_object('delivered_seq',coalesce(r.delivered_seq,0),'read_seq',case when reads then coalesce(r.read_seq,0) else 0 end,'reads_enabled',reads);
end $$;
revoke all on function public.chat_profile_save(text,text,text,boolean,boolean),public.chat_profile_get(uuid),public.chat_ack(uuid,bigint,boolean),public.chat_receipt_status(uuid) from public,anon,authenticated;
grant execute on function public.chat_profile_save(text,text,text,boolean,boolean),public.chat_profile_get(uuid),public.chat_ack(uuid,bigint,boolean),public.chat_receipt_status(uuid) to authenticated;
commit;
