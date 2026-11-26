-- Preparation only. Immutable, owner-only revisions. No data rewrite or overwrite.
begin;
create table public.private_draft_revisions(
 id uuid primary key,
 user_id uuid not null references auth.users(id) on delete cascade,
 kind text not null check(kind in ('workout','meal_plan')),
 entity_id text not null check(char_length(entity_id) between 1 and 150),
 payload jsonb not null check(jsonb_typeof(payload)='object' and octet_length(payload::text)<=250000),
 client_created_at timestamptz not null,
 created_at timestamptz not null default now()
);
alter table public.private_draft_revisions enable row level security;
revoke all on public.private_draft_revisions from public,anon,authenticated;
grant select,insert,delete on public.private_draft_revisions to authenticated;
create policy private_drafts_read on public.private_draft_revisions for select to authenticated using(user_id=auth.uid());
create policy private_drafts_insert on public.private_draft_revisions for insert to authenticated with check(user_id=auth.uid());
create policy private_drafts_delete on public.private_draft_revisions for delete to authenticated using(user_id=auth.uid());
create index private_drafts_owner_created on public.private_draft_revisions(user_id,created_at desc);
notify pgrst,'reload schema';
commit;
