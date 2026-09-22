# Retired Edge Functions

`pppp-storage-path-repair` was a one-off destructive repair utility with
hard-coded Storage object counts. No repository, database-function or cron caller
was found. Its production implementation was replaced by a non-privileged HTTP
410 tombstone on 2026-09-22.

The original source is retained here for audit and emergency reconstruction. Do
not move it back under `supabase/functions` or redeploy it without a new
dependency review and explicit authorization.

