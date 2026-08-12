-- 0005_push_tokens_hardening.sql
-- Additive hardening of 0004_push_tokens.sql for long-term scale and for
-- the future features listed in the Sprint 8 architecture requirements
-- (topics, scheduled notifications, notification history, delivery
-- tracking, analytics, deep links, rich notifications). Nothing here is a
-- breaking change — every statement is ADD/CREATE, safe to run against a
-- table that may already have rows.

-- ---------------------------------------------------------------------
-- Indexes for the four access patterns the future sending backend (a
-- separate Admin Dashboard, using the service_role key — never this app)
-- will need at scale:
--   - user_id:   "all of this user's devices" (fan-out to every device on
--                 a per-user send)
--   - token:     uniqueness check + point lookup when FCM reports a token
--                 as invalid/unregistered and the row needs updating
--   - is_active: "all active tokens" for a bulk/topic send, filtering out
--                 devices that have gone inactive or been logged out
--   - last_seen: pruning/inactivity queries ("mark inactive if not seen in
--                 90 days") without a full table scan
-- ---------------------------------------------------------------------
create index if not exists push_tokens_user_id_idx on public.push_tokens (user_id);
create index if not exists push_tokens_is_active_idx on public.push_tokens (is_active);
create index if not exists push_tokens_last_seen_idx on public.push_tokens (last_seen);

-- A composite index for the single most common future query shape: "active
-- tokens for this user", which the two single-column indexes above don't
-- serve as efficiently together.
create index if not exists push_tokens_user_active_idx
  on public.push_tokens (user_id, is_active);

-- ---------------------------------------------------------------------
-- Prevent duplicate tokens (requirement #7): 0004 already prevents a
-- second row for the same device_id. This adds the complementary case —
-- the same literal FCM token string should never appear on two different
-- rows either (can happen on a factory-reset-and-restore, or an emulator
-- clone, where the OS briefly hands out the same token under a new
-- device_id). Enforced as a unique index rather than a table constraint so
-- it can be added without a table rewrite.
create unique index if not exists push_tokens_token_unique_idx
  on public.push_tokens (token);

-- ---------------------------------------------------------------------
-- Forward-compatibility notes (design-only — none of the following tables
-- are created in this migration; documented here so the shape of
-- push_tokens never needs a breaking change when they're built):
--
-- - Topics: a future `push_topic_subscriptions` table would reference
--   `push_tokens.id` (uuid) as a foreign key, e.g.
--   (token_id uuid references push_tokens(id) on delete cascade, topic text).
--   No column needs to move or change type for this.
--
-- - Scheduled notifications / notification history / delivery tracking:
--   a future `notifications` (or `campaigns`) table owned entirely by the
--   Admin Dashboard's backend, plus a `notification_deliveries` table with
--   (notification_id, token_id, status, sent_at, delivered_at) — again,
--   only ever referencing push_tokens.id, never requiring push_tokens
--   itself to change shape.
--
-- - Analytics (Firebase Analytics or otherwise) — "received" / "opened" /
--   "click-through" / "campaign performance": these are events, not
--   properties of a token, so they belong in a future append-only
--   `notification_events` table: (id uuid, token_id uuid references
--   push_tokens(id), notification_id uuid, event_type text, occurred_at
--   timestamptz). push_tokens.id being a stable uuid (already true today)
--   is the only prerequisite for that table to exist later — satisfied
--   already, nothing to change now.
--
-- - Rich notifications (image support) / deep links: these are properties
--   of a *notification* (what's sent), not of a *token* (who receives it)
--   — they belong on the future `notifications` table's own columns
--   (image_url, deep_link), never on push_tokens.
-- ---------------------------------------------------------------------
