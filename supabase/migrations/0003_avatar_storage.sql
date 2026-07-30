-- 0003_avatar_storage.sql
-- Adds Supabase Storage support for profile avatar/cover images.
--
-- This migration does NOT touch the `profiles` table or its existing RLS
-- policies (0001_init.sql / 0002_sync_support.sql are untouched). The
-- `profiles.avatar` / `profiles.cover` columns stay `text` exactly as
-- before — they now hold either a legacy base64 data URL (old rows,
-- untouched, keep working indefinitely) or a Storage public URL (new
-- uploads going forward). No existing row is modified by this migration.

-- 1. Bucket for profile images. Public read: the URL itself is what gets
--    embedded in <img src>, and profile row visibility is already gated by
--    the existing `profiles` RLS (auth.uid() = id), so a public bucket does
--    not expose anything beyond what the app already renders to its owner.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- 2. Per-user folder isolation: a user may only write inside a folder named
--    after their own auth.uid(), e.g. avatars/<user_id>/avatar.jpg. This is
--    the standard Supabase Storage pattern (storage.foldername() splits the
--    object path into an array of folder segments).
create policy "avatar uploads are per-user folder (insert)"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatar uploads are per-user folder (update)"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatar uploads are per-user folder (delete)"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- 3. Public read for anyone (matches the bucket's public=true setting above;
--    an explicit policy is still required for select on storage.objects).
create policy "avatar images are publicly readable"
  on storage.objects for select
  to public
  using (bucket_id = 'avatars');
