# Database backup

Workflow: `.github/workflows/db-backup.yml`. Runs daily (01:43 UTC) and on demand (Actions tab > Database backup > Run workflow).
Output: an AES-256 encrypted pg_dump (public + auth schemas), kept 30 days as the `gymak-db-backup` artifact.
The repo is public, so it is encrypted with the BACKUP_PASSPHRASE secret. Lose the passphrase and the backups are useless.

Secrets (repo Settings > Secrets and variables > Actions):
- SUPABASE_DB_URL: Supabase "Connect" > "Session pooler" URI with the database password filled in (the pooler works from GitHub's IPv4 runners; the direct connection does not).
- BACKUP_PASSPHRASE: long random password, also kept in a password manager.

Restore:
    gpg --decrypt gymak-db-YYYY-MM-DD.dump.gpg > backup.dump
    pg_restore --no-owner --no-privileges -d "<target db url>" backup.dump
Try a restore on a throwaway Supabase project before you ever need it.

Safety notes
- The repo is public, so artifacts are downloadable by any GitHub user. They are AES-256 encrypted, and the workflow refuses a passphrase shorter than 24 characters. Do not make the repo private to "fix" this without checking the in-app APK updater, which downloads releases from it.
- Session/refresh-token tables are not dumped. Password hashes are (so users restore without a reset).
- Each run restores the dump into a throwaway Postgres and compares row counts; a failure turns the run red but the encrypted artifact is already uploaded.
- Only direct DB connections use the database password: this workflow. The app uses API keys; edge functions use the service role key. Resetting the DB password does not affect them.
