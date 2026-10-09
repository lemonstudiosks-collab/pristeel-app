# Live schema baseline

`2026-10-09_live_schema.sql` is a schema-only `pg_dump` of the production Supabase database (project `awqfpnzqwfjrjefoktgd`, Postgres 17.6), taken 9 Oct 2026 14:11 with pg_dump 18.6. No table data.

- It is the **real** schema: 144 tables, 406 functions, 93 triggers across `public`, `private`, `pppp_internal_api`, `auth`, `storage`, `vault` and the other Supabase schemas. The files in `supabase/migrations/` cover only part of what was applied (~205 of ~525 migrations), so they cannot rebuild the database; this file can.
- A full backup (schema + data) restored cleanly into a local Postgres from the same dump on 9 Oct 2026, so this file is known to load.
- Cron job definitions (`cron.job`) and Edge Function code are not in this file. Edge Functions are in `supabase/functions/`.
- Treat it as a snapshot: the live database will move on. Take a new dump when the schema changes materially and add it next to this one with its date.
