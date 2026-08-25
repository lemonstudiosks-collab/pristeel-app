# PPPP Automation Resilience - 2026-08-25

## Why this change exists

A live audit found that `pg_cron` could report a job as `succeeded` when it had only succeeded in enqueueing a `pg_net` HTTP request. The Edge Function could still answer with HTTP 4xx/5xx afterwards.

The concrete failure was Gmail returning `404 Requested entity was not found` for historical Gmail message ids that were already linked to canonical PPPP projects. Those records are still useful project history, but body/attachment hydration must not retry them forever.

## Canonical behavior

### Automation Health

`public.pppp_automation_health_v1()` now reports both:

- scheduler/cron outcome;
- recent `pg_net` HTTP failures, including 4xx, 5xx, timeout and network errors.

`pristeel-automation-health-v1.js` remains read-only and shows the real async HTTP signal in the existing System health surface.

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

The issue was an automation retry problem, not a project-identity problem. Existing project identities therefore remain unchanged.

## Human gates

This change does not send email, approve commercial terms, alter selling prices/margins, commit a supplier, create a PO/contract, mark Won/Lost, or make a final financial commitment.
