-- Internal worker and scan state is accessed through controlled service/RPC paths, not directly from the browser API.
-- Keep RLS deny-by-default and remove redundant anon/authenticated table grants as defense in depth.

revoke all privileges on table public.project_attachment_scan_state from anon, authenticated;
revoke all privileges on table public.semantic_ai_jobs from anon, authenticated;
revoke all privileges on table public.semantic_worker_keys from anon, authenticated;
