-- PPPP managed HTTP request-id reuse guard v1
--
-- pg_net request IDs are queue-local implementation identifiers, not permanent
-- globally unique business/audit identifiers. If pg_net is rebuilt/reset, its
-- sequence can restart below request IDs retained in PPPP automation history.
-- A global UNIQUE(request_id) therefore blocks new managed HTTP dispatches even
-- though the new request belongs to a different queue generation.
--
-- Keep the real idempotency invariant UNIQUE(correlation_id, attempt), retain a
-- non-unique lookup index for diagnostics, and preserve all retry/watchdog logic.
-- No business workflow, approval gate, email-send behavior, supplier selection,
-- pricing, contract/PO, or project disposition behavior is changed here.

alter table public.pppp_automation_http_runs
  drop constraint if exists pppp_automation_http_runs_request_id_key;

create index if not exists pppp_automation_http_runs_request_id_idx
  on public.pppp_automation_http_runs(request_id)
  where request_id is not null;

comment on column public.pppp_automation_http_runs.request_id is
  'pg_net request identifier used to correlate an in-flight managed HTTP run with net._http_response. It is intentionally non-unique across retained PPPP history because pg_net IDs can be reused after queue/extension reset; correlation_id + attempt remains the durable run identity.';
