# Production migration history snapshots

This directory contains exact SQL statement exports from
`supabase_migrations.schema_migrations` in canonical production project
`awqfpnzqwfjrjefoktgd`.

These files preserve authoritative source that was applied directly to production
but was absent from the repository. They are intentionally outside
`supabase/migrations`.

Do not move them into the active migration directory or replay them blindly.
Their live version IDs already exist in production, while the repository's
historical migration filenames do not consistently share the server-assigned
versions. A future migration-baseline task must reconcile the full history before
`supabase db push` is used as a deployment mechanism.

Export scope: missing production changes from 2026-09-21 through
2026-09-22. The existing local
`20260921170821_outbound_sync_server_canonical_v1.sql` corresponds to the
live migration `20260921180429_outbound_sync_server_canonical_v1` and is not
duplicated here. Cleanup migrations added on 2026-09-22 already have local
source under `supabase/migrations`.

