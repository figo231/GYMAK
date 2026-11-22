# Findings
Existing topic all_users bypasses per-user preferences. Native init and register subscribe even guests, logout keeps topic. Scheduled encouragement must not use this path.
Token dispatcher source does not recheck user preference after enqueue and marks FCM acceptance as sent. Must separate accepted from device receipt, add last-moment opt-out check and ambiguous-outcome handling.
CLI 3.2.0 installed and --use-api supported. projects list proves no token. GitHub secret metadata no SUPABASE_ACCESS_TOKEN, vault metadata no deployment credential. No credential value read. Browser Via CLI is instructions only.
No production mutation, cron activation, broadcast, test push or paid service performed during research.
