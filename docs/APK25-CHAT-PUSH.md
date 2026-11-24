# Chat reply notifications, APK25 preparation

## Verified cause, 24 November 2026 18:44 Cairo

Live Supabase read-only checks found one trigger on `public.chat_messages`: the BEFORE INSERT safety validator `enforce_chat_message_safety_v2`. There is no chat-push trigger. Live `chat_send` inserts the message and updates the conversation timestamp but does not dispatch push. The repository also has no chat-message push sender. Existing push paths cover owner broadcasts and encouragement, not private chat replies.

The owner's account has four active Android token rows. The newest `last_seen` was 2026-11-24 16:42:37.1 UTC. This proves recent registration, not OS permission state, FCM acceptance or physical delivery. No token value was copied. `app_version` currently records package.json's 0.1.0, not the installed APK number, so it cannot identify his installed APK.

Source: https://supabase.com/dashboard/project/ybkeshztehjeoeonpkih/sql/new . Function list baseline: https://supabase.com/dashboard/project/ybkeshztehjeoeonpkih/functions . No new live message body was accessed for this investigation.

## Prepared, not deployed

- `0046_chat_push_queue.sql` adds a paused control, private per-message/per-device queue, service-only claim/finish RPCs, and a new AFTER INSERT enqueue trigger. It does not replace any existing table/function/trigger. Old clients' inserts also qualify once enabled. No old messages are backfilled.
- `dispatch-chat-push` is a new scheduler-only function with its own server-side secret. It uses existing Firebase configuration without changing it.
- Every chat, including doctor chat, gets the same generic title/body. No message text, sender name, medical role, conversation identifier, image, or medical detail goes to FCM. Arabic body: عندك رسالة جديدة. افتح GYMAK عشان تشوفها.
- Recipient is derived from conversation participants, never caller-selected. Only active Android tokens seen within30days qualify. Block/token ownership/expiry are rechecked at claim time. Unique message/device prevents ordinary duplicates. Unknown provider outcomes remain unknown and are not retried blindly.
- Service acceptance is not recorded as device receipt. Existing chat read/delivery receipts remain independent.

## Activation still needed

This is a server fix, not an APK-only fix. Do not tell users APK25 alone fixes it.

1. Apply/test the additions in an isolated test namespace, including actual two-party conversations and two devices. Existing production objects must retain their prior definitions.
2. Verify the new trigger leaves successful old APK24 chat sends unchanged while control is off, and test rollback.
3. Set a new dispatch secret securely, deploy the new function, and wire a free server-side scheduler/webhook. An existing HTTP-capable scheduler can invoke it. This production has no pg_cron extension, so no expiry or notification job is presently configured. A new extension or change outside allowed additions needs approval. Do not use a slow GitHub cron as if it provided immediate chat alerts.
4. For prompt replies, use an additive after-commit DB webhook/outbox wake to the new function. The current prepared queue needs a dispatcher trigger; it is not active merely because the function exists. Secure service credentials must stay in provider secret storage, never hardcoded in SQL or source.
5. With explicit test audience authority, send synthetic generic notifications to two test participants. Verify background/killed/foreground behavior, each message/device once, blocks/logouts, no unrelated account access, denied OS permission and provider failure. Do not send old private-message notifications.
6. Only enable `chat_push_control` after the path and rollback pass. That activation is not done.

## Rollback

First set `chat_push_control.enabled=false` to stop new enqueue/claim. Disable the new scheduler/webhook. Remove only the new `chat_push_enqueue_v1` trigger, `dispatch-chat-push` function, its own secret, and the new claim/finish/enqueue SQL functions/queue/control after inspecting outstanding rows. Never touch the existing safety trigger, push tokens, broadcast/encouragement configuration, chat records or any preexisting function.

## Tests and limits

Seven focused PGlite/runner tests pass: paused default/no history, recipient-only queue, generic payload, blocks at enqueue/claim, token disable/reassignment,15min expiry, service-only access, provider acceptance versus receipt, unknown-outcome no-retry. Actual Deno check passes. Full regression suite still required after integrating these files. Live FCM delivery and an active scheduler are unverified. No production object was changed by this work.
