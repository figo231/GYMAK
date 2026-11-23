-- Dedicated identity avoids older profile sync overwriting a reserved username.
-- Existing users are NOT renamed, forced to choose, or automatically enrolled.
create table public.account_identities (
 user_id uuid primary key references auth.users(id) on delete cascade,
 display_name text,
 gender text check(gender in ('male','female')),
 username text unique check(username ~ '^[a-z][a-z0-9_]{2,23}$'),
 completed_at timestamptz,
 prompted_at timestamptz not null default now(),
 check(completed_at is null or (char_length(trim(display_name)) between 2 and 40 and gender is not null and username is not null))
);
alter table public.account_identities enable row level security;
revoke all on public.account_identities from anon,authenticated;
grant all on public.account_identities to service_role;
create function public.my_account_identity() returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if auth.uid() is null then raise exception 'sign_in_required';end if;
 return (select to_jsonb(i)-'user_id' from public.account_identities i where user_id=auth.uid());
end $$;
create function public.complete_account_identity(p_name text,p_gender text,p_username text,p_expected_user uuid) returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare handle text:=lower(trim(p_username));label text:=trim(p_name);
begin
 if auth.uid() is null or p_expected_user is distinct from auth.uid() then raise exception 'session_changed';end if;
 if label is null or char_length(label) not between 2 and 40 then raise exception 'invalid_name';end if;
 if p_gender is null or p_gender not in ('male','female') then raise exception 'invalid_gender';end if;
 if handle is null or handle !~ '^[a-z][a-z0-9_]{2,23}$' then raise exception 'invalid_username';end if;
 insert into public.account_identities(user_id,display_name,gender,username,completed_at) values(auth.uid(),label,p_gender,handle,now())
 on conflict(user_id) do update set display_name=excluded.display_name,gender=excluded.gender,username=excluded.username,completed_at=now();
 update public.profiles set name=label,gender=p_gender,username=handle where id=auth.uid();
 exception when unique_violation then raise exception 'username_taken';
end $$;
create function public.skip_account_identity(p_expected_user uuid) returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if auth.uid() is null or p_expected_user is distinct from auth.uid() then raise exception 'session_changed';end if;
 insert into public.account_identities(user_id) values(auth.uid()) on conflict(user_id) do nothing;
end $$;
-- Runs in signup transaction: concurrent identical handles cannot both win.
create function public.capture_signup_identity() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare m jsonb:=new.raw_user_meta_data;handle text;label text;sex text;
begin
 if m->>'identity_version' is distinct from 'v1' then return new;end if;
 handle:=lower(trim(m->>'username'));label:=trim(m->>'display_name');sex:=m->>'gender';
 if label is null or char_length(label) not between 2 and 40 then raise exception 'invalid_name';end if;
 if sex is null or sex not in ('male','female') then raise exception 'invalid_gender';end if;
 if handle is null or handle !~ '^[a-z][a-z0-9_]{2,23}$' then raise exception 'invalid_username';end if;
 insert into public.account_identities(user_id,display_name,gender,username,completed_at) values(new.id,label,sex,handle,now());
 -- Trigger ordering may put this before or after the existing profile trigger.
 insert into public.profiles(id,name,gender,username) values(new.id,label,sex,handle)
 on conflict(id) do update set name=excluded.name,gender=excluded.gender,username=excluded.username;
 return new;
end $$;
create trigger zz_capture_signup_identity after insert on auth.users for each row execute function public.capture_signup_identity();
revoke all on function public.my_account_identity(),public.complete_account_identity(text,text,text,uuid),public.skip_account_identity(uuid),public.capture_signup_identity() from public,anon,authenticated;
grant execute on function public.my_account_identity(),public.complete_account_identity(text,text,text,uuid),public.skip_account_identity(uuid) to authenticated;
notify pgrst,'reload schema';
-- Old/offline clients may push stale profile defaults after signup. Preserve
-- authoritative completed identity; no workout or other profile fields changed.
create function public.protect_account_identity() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare i public.account_identities;
begin
 select * into i from public.account_identities where user_id=new.id and completed_at is not null;
 if found then new.name:=i.display_name;new.gender:=i.gender;new.username:=i.username;end if;
 return new;
end $$;
create trigger protect_account_identity before insert or update on public.profiles for each row execute function public.protect_account_identity();
revoke all on function public.protect_account_identity() from public,anon,authenticated;
