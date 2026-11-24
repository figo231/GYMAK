-- Conservative free-only image budget. No paid fallback.
-- Shared with avatar/evidence writes; counts every bucket, including expired
-- objects until physically removed. Unknown object size uses its bucket cap,
-- or the full budget for an unrelated bucket with no cap (fail closed).
begin;
create function public.chat_storage_budget_check(p_extra bigint default 0) returns void language plpgsql security definer set search_path='' as $$
declare used bigint;reserved bigint;evidence bigint;
begin
 perform pg_advisory_xact_lock(hashtext('chat-free-storage-budget'));
 select coalesce(sum(case when coalesce(o.metadata->>'size','') ~ '^[0-9]{1,18}$' then (o.metadata->>'size')::bigint else coalesce(b.file_size_limit,419430400) end),0) into used from storage.objects o left join storage.buckets b on b.id=o.bucket_id;
 select coalesce(sum(p.bytes),0) into reserved from public.chat_photos p where p.status in('reserved','ready') and not exists(select 1 from storage.objects o where o.bucket_id='chat-delivery' and o.name=p.path);
 select count(*)*204800 into evidence from public.moderation_reports r where r.photo_evidence_path is not null and not exists(select 1 from storage.objects o where o.bucket_id='chat-report-evidence' and o.name=r.photo_evidence_path);
 if used+reserved+evidence+greatest(coalesce(p_extra,0),0)>419430400 then raise exception 'photo_storage_full';end if;
end $$;
create function public.chat_photo_budget_reserve() returns trigger language plpgsql security definer set search_path='' as $$begin
 perform public.chat_storage_budget_check(new.bytes);return new;
end $$;
create trigger chat_photo_free_budget before insert on public.chat_photos for each row execute function public.chat_photo_budget_reserve();
create function public.chat_evidence_budget_reserve() returns trigger language plpgsql security definer set search_path='' as $$begin
 if new.photo_evidence_path is not null and (TG_OP='INSERT' or old.photo_evidence_path is distinct from new.photo_evidence_path) then perform public.chat_storage_budget_check(204800);end if;return new;
end $$;
create trigger chat_evidence_free_budget before insert or update on public.moderation_reports for each row execute function public.chat_evidence_budget_reserve();
-- Storage writes are checked again, so concurrent uploads/avatars cannot all
-- pass an earlier usage snapshot. Double-counting the incoming reservation is
-- intentional headroom, never extra quota. Old avatar bytes count on overwrite.
create function public.chat_image_budget_write() returns trigger language plpgsql security definer set search_path='' as $$
declare extra bigint;
begin
 if new.bucket_id not in('chat-delivery','chat-report-evidence','chat-avatars') then return new;end if;
 extra:=case when coalesce(new.metadata->>'size','') ~ '^[0-9]{1,18}$' then (new.metadata->>'size')::bigint when new.bucket_id='chat-avatars' then 102400 else 204800 end;
 perform public.chat_storage_budget_check(extra);return new;
end $$;
create trigger chat_image_free_budget before insert or update on storage.objects for each row execute function public.chat_image_budget_write();
revoke all on function public.chat_storage_budget_check(bigint),public.chat_photo_budget_reserve(),public.chat_evidence_budget_reserve(),public.chat_image_budget_write() from public,anon,authenticated;
grant execute on function public.chat_storage_budget_check(bigint) to service_role;
commit;
