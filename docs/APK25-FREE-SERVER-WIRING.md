# Free-only server wiring plan, not activated

## Release boundary

No production migration, extension, secret, webhook or scheduler is activated by this plan. Apply together only after explicit release approval and a successful disposable-project test. Stay on the FREE organization. No paid fallback or automatic upgrade.

## Hourly expiry

Preferred: provider-native pg_cron + pg_net + Supabase Vault. Enable the supported extensions during the approved release window. Store only a narrowly scoped cleanup secret in provider Vault and Edge secret storage. The current cleanup endpoint requires the project service JWT, so change it to accept a separate cleanup-only secret before wiring it; do not place a broad service credential in scheduler SQL. Create one hourly job at minute23 to POST to chat-photo with x-photo-action:cleanup and the dedicated secret. The function's own service credential stays only in the function runtime. Do not include paths, users or images in the job body. Verify a forced-expiry synthetic object is physically absent after an actual scheduled fire, and inspect job/HTTP failures. An expiry timestamp alone is not deletion.

Fallback: the existing prepared GitHub hourly cleanup workflow, but only if native scheduling cannot be used at no charge. It needs an encrypted repository secret and a dedicated cleanup secret rather than the broad service key currently named by the workflow. GitHub schedules can be late or skipped; they are not suitable for prompt chat notifications. Do not claim either route active until a scheduled fire passes.

## Prompt chat push

Use the existing message/device outbox and a new after-insert trigger on the new queue, not a raw-message webhook. The trigger sends a constant empty body to dispatch-chat-push through asynchronous pg_net after transaction commit. It reads the dedicated scheduler secret from provider Vault. This avoids forwarding chat text or token rows in a webhook payload. One recipient/device row must not cause unrelated data disclosure. A DB-side debounce/one wake per message avoids one invocation per recipient device.

A low-frequency retry/sweep job may drain pending rows left by failed wakes, but must preserve the existing unknown-provider-outcome rule: never blindly retry outcome_unknown. The dispatcher claims at most50rows/invocation. Define a bounded continuation or next sweep for larger queues. Respect kill switch and token/block/15-minute freshness checks. Test enqueue, after-commit wake, dispatcher authentication, provider rejection, account logout/reassignment, duplicates, rollback and message send while the dispatcher is unavailable. A failed wake must not fail the user's chat send transaction.

The current prepared source does NOT yet implement this wake trigger, continuation or scheduled retry. This document is a plan, not a deployed notification fix.

## Verification and safety

- Confirm FREE plan and organization-wide usage immediately before activation. Storage is not the only quota: egress, function invocations, database and auth also matter.
- Provider docs currently show500,000Edge Function invocations on Free. An hourly job is at most744invocations in a31-day month. Prompt push and photo actions consume additional invocations. This is arithmetic, not an unlimited-use guarantee.
- pg_net temporarily stores the request headers in its queue. Review database login roles and access; a dedicated secret limits the consequence, but it is still sensitive. Never put secrets in committed migration SQL, screenshots, logs or chat.
- Keep generic notifications unless an ordinary direct-chat recipient opted in. Doctor/coach override remains mandatory.
- FCM acceptance is not device receipt. Test real Android foreground/background/killed states and permission denial with synthetic accounts before marking push verified.
- Monitor failures and free-quota headroom. On exhausted quota, stop uploads/delivery or report unavailable; never purchase capacity automatically.

## Rollback order

1. Set chat_push_control.enabled=false.
2. Disable only the new cron jobs and queue wake trigger. Inspect pending/unknown rows before any removal.
3. Remove only new webhook/cron helper functions and scoped secrets. Do not alter broadcast push or existing tokens.
4. Keep photo expiry/delete routes available until outstanding private files are removed. Verify Storage API deletion, then disable the job. Never delete photo metadata first and lose paths.
5. Remove0047's three new guard triggers/functions only if reverting the feature; preserve all preexisting Storage policies and user objects.
6. Restore previously verified functions and app release only from the recorded baseline. Check APK24 text chat still works.

## Sources checked 24 November 2026

- https://supabase.com/docs/guides/cron
- https://supabase.com/docs/guides/database/webhooks
- https://supabase.com/docs/guides/functions/schedule-functions
- https://supabase.com/docs/guides/platform/manage-your-usage/edge-function-invocations
