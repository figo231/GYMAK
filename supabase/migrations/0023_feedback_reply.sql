-- 0023_feedback_reply.sql
-- Admin replies to contact-us messages, shown to the user inside the app.
-- Users can still only INSERT and read their own rows; only admins UPDATE (policy from 0022).
-- Safe to re-run.
alter table public.feedback add column if not exists admin_reply text check (admin_reply is null or char_length(admin_reply) between 1 and 2000);
alter table public.feedback add column if not exists replied_at timestamptz;
notify pgrst, 'reload schema';
-- Verification:
-- select column_name from information_schema.columns where table_name = 'feedback' and column_name in ('admin_reply','replied_at');
