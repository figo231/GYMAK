create table if not exists public.push_tokens (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    device_id text not null unique,
    platform text not null default 'android',
    app_version text,
    token text not null,
    language text,
    timezone text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    last_seen timestamptz not null default now(),
    is_active boolean not null default true
);

alter table public.push_tokens enable row level security;

create policy "push_tokens_select_own"
on public.push_tokens
for select
to authenticated
using (auth.uid() = user_id);

create policy "push_tokens_insert_own"
on public.push_tokens
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "push_tokens_update_own"
on public.push_tokens
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "push_tokens_delete_own"
on public.push_tokens
for delete
to authenticated
using (auth.uid() = user_id);

create index if not exists idx_push_tokens_user_id
on public.push_tokens(user_id);

create index if not exists idx_push_tokens_is_active
on public.push_tokens(is_active);

create index if not exists idx_push_tokens_last_seen
on public.push_tokens(last_seen);

create index if not exists idx_push_tokens_user_active
on public.push_tokens(user_id, is_active);

create unique index if not exists idx_push_tokens_token
on public.push_tokens(token);