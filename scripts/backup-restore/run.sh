#!/usr/bin/env bash
# Backup + restore proof on a THROWAWAY Postgres with FAKE data. No production URL, no secret, no network.
# Usage: PGHOST=... PGPORT=... PGUSER=... [PGPASSWORD=...] scripts/backup-restore/run.sh
# Needs psql, pg_dump, pg_restore (client >= server major). Creates and drops databases gymak_src, gymak_dst.
set -euo pipefail
cd "$(dirname "$0")/../.."
case "${PGHOST:-}" in ""|*supabase*|*pooler*|*amazonaws*) echo "Refusing: PGHOST must be a local throwaway server." >&2; exit 1;; esac
P="psql -v ON_ERROR_STOP=1 -q -X"
work=$(mktemp -d); trap 'rm -rf "$work"' EXIT
$P -d postgres -c "drop database if exists gymak_src" -c "drop database if exists gymak_dst" -c "create database gymak_src" -c "create database gymak_dst"
roles="do \$\$ declare r text; begin
 for r in select unnest(array['authenticated','anon','service_role','postgres_x','supabase_auth_admin','supabase_admin','authenticator']) loop
  if not exists(select 1 from pg_roles where rolname=r) then execute format('create role %I nologin',r); end if; end loop; end \$\$;"
$P -d postgres -c "$roles"
# 1. build the source: stub Supabase base objects + every repo migration + fake rows
$P -d gymak_src -f scripts/backup-restore/stub.sql
fail=0; for f in $(ls supabase/migrations/*.sql | sort); do
  psql -X -q -d gymak_src -v ON_ERROR_STOP=1 --single-transaction -f "$f" >/dev/null 2>&1 || echo "$(basename "$f")" >> "$work/failed.txt"; done
echo "migrations that cannot replay on a vanilla server (known, hosted-only): $(tr '\n' ' ' < "$work/failed.txt")"
$P -d gymak_src -f scripts/backup-restore/seed-fake.sql 2>&1 | grep SEED || true
# 2. backup, same flags as the daily backup workflow
pg_dump -d gymak_src --no-owner --no-privileges --schema=public --schema=auth -Fc -f "$work/backup.dump"
echo "dump bytes: $(stat -c %s "$work/backup.dump")"
# 3. restore into a different empty database
$P -d gymak_dst -c "drop schema public cascade" -c "create schema if not exists extensions"
pg_restore --no-owner --no-privileges --exit-on-error -d gymak_dst "$work/backup.dump" 2> "$work/restore.err" || { echo "restore failed"; head -20 "$work/restore.err"; exit 1; }
# 4. compare every table: row count and an order-independent content hash
fp() {
  for t in $(psql -X -q -At -d "$1" -c "select n.nspname||'.'||c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where c.relkind='r' and n.nspname in ('public','auth') order by 1"); do
    echo "$t $(psql -X -q -At -d "$1" -c "select count(*),coalesce(md5(string_agg(md5(x::text),'' order by md5(x::text))),'empty') from $t x")"
  done
}
fp gymak_src > "$work/src.fp"; fp gymak_dst > "$work/dst.fp"
tables=$(wc -l < "$work/src.fp"); rows=$(awk -F'[ |]' '{s+=$2} END{print s+0}' "$work/src.fp")
echo "compared $tables tables, $rows fake rows in total"
if ! diff "$work/src.fp" "$work/dst.fp" > "$work/diff.txt"; then echo "RESTORE MISMATCH:"; head -20 "$work/diff.txt"; exit 1; fi
test "$rows" -gt 100 || { echo "too little fake data seeded: $rows"; exit 1; }
echo "PASS: restored database matches the backup exactly"
# 5. the check itself must be able to fail: damage the restored copy, expect a mismatch
victim=$(awk '$2+0>0 && $1 ~ /^public\./{print $1; exit}' "$work/src.fp")
$P -d gymak_dst -c "delete from $victim where ctid=(select ctid from $victim limit 1)"
fp gymak_dst > "$work/dst2.fp"
if diff -q "$work/src.fp" "$work/dst2.fp" >/dev/null; then echo "NEGATIVE CHECK FAILED: damage was not detected"; exit 1; fi
echo "PASS: deleting one row from $victim is detected (the test can fail)"
# 6. a truncated dump must be rejected by pg_restore
head -c 2000 "$work/backup.dump" > "$work/cut.dump"
if pg_restore --list "$work/cut.dump" >/dev/null 2>&1; then echo "NEGATIVE CHECK FAILED: truncated dump accepted"; exit 1; fi
echo "PASS: truncated dump is rejected"
$P -d postgres -c "drop database gymak_src" -c "drop database gymak_dst"
