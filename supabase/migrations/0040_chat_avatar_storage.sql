begin;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('chat-avatars','chat-avatars',false,102400,array['image/jpeg']) on conflict(id) do nothing;
create policy "chat avatar own insert" on storage.objects for insert to authenticated with check(bucket_id='chat-avatars' and name=auth.uid()::text||'/chat-avatar.jpg');
create policy "chat avatar own update" on storage.objects for update to authenticated using(bucket_id='chat-avatars' and name=auth.uid()::text||'/chat-avatar.jpg') with check(bucket_id='chat-avatars' and name=auth.uid()::text||'/chat-avatar.jpg');
create policy "chat avatar own delete" on storage.objects for delete to authenticated using(bucket_id='chat-avatars' and name=auth.uid()::text||'/chat-avatar.jpg');
-- Existing private profiles table stays unreadable; this helper reveals only whether a stored avatar is shared.
create function public.chat_avatar_visible(p_path text) returns boolean language sql stable security definer set search_path='' as $$ select auth.uid() is not null and exists(select 1 from public.chat_profiles p where p.avatar_path=p_path and (p.user_id=auth.uid() or (p.visible and not public.chat_blocked_between(auth.uid(),p.user_id)))); $$;
revoke all on function public.chat_avatar_visible(text) from public,anon,authenticated;grant execute on function public.chat_avatar_visible(text) to authenticated;
create policy "chat avatar opt in read" on storage.objects for select to authenticated using(bucket_id='chat-avatars' and (name=auth.uid()::text||'/chat-avatar.jpg' or public.chat_avatar_visible(name)));
commit;
