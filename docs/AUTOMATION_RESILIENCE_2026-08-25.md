# PPPP Automation Resilience - 2026-08-25

## Why this change exists

A live audit found that `pg_cron` could report a job as `succeeded` when it had only succeeded in enqueueing a `pg_net` HTTP request. The Edge Function could still answer with HTTP 4xx/5xx afterwards.

The concrete failure was Gmail returning `404 Requested entity was not found` for historical Gmail message ids that were already linked to canonical PPPP projects. Those records are still useful project history, but body/attachment hydration must not retry them forever.

The same audit found a second health-reporting trap: a configured local worker could still have `is_active=true` even when its heartbeat had stopped. A configured worker is not the same thing as a live worker.

## Canonical behavior

### Automation Health

`public.pppp_automation_health_v1()` reports both:

- scheduler/cron outcome;
- recent `pg_net` HTTP failures, including 4xx, 5xx, timeout and network errors;
- the recorded heartbeat/use timestamps for local OCR and Semantic AI workers.

`pristeel-automation-health-v1.js` remains read-only and shows the real async HTTP signal in the existing System health surface.

Worker presentation is heartbeat-aware:

- `Mac mini OCR` is online only when the worker is enabled and `last_seen_at` is fresh;
- `Semantic worker` is online only when its key is active and `last_used_at` is fresh;
- the UI uses a 15-minute freshness window;
- an active/configured worker with an old heartbeat is shown as `stale`, never `online`;
- queued Semantic AI work plus a stale worker is a failure state, not a healthy queue.

For the Semantic AI worker, `last_used_at` is updated by `semantic_worker_authorize()` on every authenticated queue poll, so it is a real liveness signal rather than only an installation timestamp.

### Missing Gmail messages

`public.pppp_reconcile_gmail_missing_http_v1()` reads recent confirmed Gmail `404` responses from `net._http_response` and terminal-marks only the affected hydration work:

- missing body hydration receives provenance `server-full-mime-gmail-missing-v1` only when it was not already hydrated;
- missing attachment metadata receives the existing terminal outcome `no_downloadable` with provenance `server-metadata-gmail-missing-v1`;
- canonical `project_emails`, project identity, subject, snippet, dates and project links are preserved;
- no historical project email is deleted;
- non-404 failures are not silently suppressed by this reconciler.

The reconciliation runs automatically every five minutes on a minute offset that does not coincide with the attachment-sync minute.

## Live evidence that triggered the fix

Confirmed stale Gmail ids included records linked to:

- `SSP - EWAS Siren Poles - Kosovo`;
- `ITALIAN STYLE - Dukley Seafront Restoran - BUDVA`.

The Gmail issue was an automation retry problem, not a project-identity problem. Existing project identities therefore remain unchanged.

At the same audit point, OCR on `mac-mini-01` was still reporting fresh heartbeats while the Semantic AI worker had four pending jobs and its last authenticated queue use was from 2026-08-22. The Mac itself was therefore reachable, but the semantic worker process was not live. Automation Health must expose that condition accurately instead of hiding it behind `is_active=true`.

## Human gates

This change does not send email, approve commercial terms, alter selling prices/margins, commit a supplier, create a PO/contract, mark Won/Lost, or make a final financial commitment.
