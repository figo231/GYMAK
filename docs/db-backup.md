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
