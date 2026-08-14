-- 0017_admin_topic_subscriptions_read.sql
-- Sprint 11.5. push_topic_subscriptions' existing RLS (0010_push_topics.sql)
-- only lets a user see their own device's subscriptions — that policy is
-- untouched. This migration only ADDS a second, admin-only select policy
-- alongside it (RLS policies are OR'd), needed so the Topics Manager can
-- show a subscriber count per topic.

drop policy if exists "push_topic_subscriptions: admin read" on public.push_topic_subscriptions;
create policy "push_topic_subscriptions: admin read"
  on public.push_topic_subscriptions for select
  to authenticated
  using (public.is_admin(auth.uid()));

-- Verification:
-- select policyname, cmd from pg_policies where tablename = 'push_topic_subscriptions';
--   -- expect the three original owner policies PLUS this one, all present

-- Rollback (manual):
-- drop policy if exists "push_topic_subscriptions: admin read" on public.push_topic_subscriptions;
