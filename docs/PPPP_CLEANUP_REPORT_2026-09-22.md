# PPPP CLEANUP REPORT

Audit date: 2026-09-22  
Canonical production: `awqfpnzqwfjrjefoktgd`  
Legacy project: `isymxqfqzkchbsrbhucf` (inspected only through repository/live dependency evidence; not modified)

The required live protocol was loaded first with `select public.pppp_chatgpt_bridge_manifest_v1();`. No external email was sent, no approval or business decision was made, and no historical business record was changed.

## 1. Current architecture

- Static browser application deployed by GitHub Pages from a verified `_site` artifact. `runtime-manifest.json` is the machine-readable runtime owner; `docs/ACTIVE_RUNTIME.md` is its human-readable companion.
- The active artifact contains 152 ordered bootstrap modules and 23 recursively discovered dynamic dependencies. The repository contains compatibility, test, migration, worker and archived material that is intentionally excluded from the public artifact.
- Canonical backend is Supabase project `awqfpnzqwfjrjefoktgd`: PostgreSQL 17, 83 public tables, 29 views, 260 public functions, 71 triggers and 196 RLS policies at audit time.
- 38 active Edge Functions and 11 active pg_cron jobs provide Gmail, Drive, tender, document, OCR, intelligence, outbound and reconciliation services.
- Three private Storage buckets exist: `expense-receipts`, `invoice-attachments`, and `project-source-files`. No table is currently in the `supabase_realtime` publication.
- Outbound is controlled by the shared queue, live-draft reconciliation, preflight/approval state, and guarded dispatcher. Human approval boundaries remain intact.

## 2. Removed

Classification A — safe cleanup:

- Removed six orphaned private request wrappers that still targeted the inactive Supabase project:
  - `private.dynamic_plan_internal_request(integer)`
  - `private.gmail_attachment_reconcile_internal_request(integer)`
  - `private.gmail_attachment_reconcile_message_request(text, integer)`
  - `private.gmail_ted_sales_reconcile_internal_request(integer)`
  - `private.project_document_intake_backfill_request(integer)`
  - `private.project_document_intake_process_id_request(bigint)`
- Evidence before removal: no cron caller, no database function dependency, no active repository/Edge caller, no tracked executions, and a verified canonical replacement path through the production HTTP queue/direct current endpoint.
- No table, business row, public RPC, trigger, Edge Function, cron job, frontend route or UI owner was deleted.

## 3. Consolidated

- Replaced active runtime/configuration fallback URLs in 34 current scripts, local workers, examples and operational SQL/docs so they point to `awqfpnzqwfjrjefoktgd`.
- Kept historical migration text unchanged. Applied migration history was not rewritten.
- Restored the common security model on three read-only projections: caller-context RLS plus read-only grants.
- No business workflow or planned V2 behavior was consolidated into the current system.

## 4. Legacy retained

Classification C — keep/compatibility:

- The layered frontend remains intentionally additive. Older-looking modules may be wrappers, bridges or captured compatibility surfaces; runtime ownership tests show they remain part of the current ordered bootstrap.
- `scripts/opportunity-engine-v2.mjs` retains `LEGACY_SUPABASE_REF` as an explicit cutover guard, not as a fallback endpoint.
- Legacy project references remain in historical migrations, one historical checkpoint, and tests that prove stale-session/fallback rejection. They are evidence, not active configuration.
- Gmail, HubSpot and Bitrix identity bridges remain because they feed canonical contacts and project relationships.
- Source-specific TED/GC/DACH logic remains behind the shared outbound controls; it is not a parallel unguarded sending path.

## 5. Database cleanup

- Applied `retire_orphaned_legacy_project_request_wrappers` to remove the six private functions listed above.
- Applied `harden_read_only_views_v1`:
  - `pppp_home_current_actions_v1` and `pppp_tender_price_dataset_v1` now use `security_invoker=true`.
  - `pppp_tender_price_work_queue_v1` already used `security_invoker=true`.
  - Removed INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER privileges for `anon` and `authenticated` from all three read-only views; authenticated SELECT remains.
- Applied `lock_trigger_functions_from_api_v1`: removed direct `anon`/`authenticated` execution from 32 `SECURITY DEFINER` trigger functions. Their 35 trigger bindings and service-role execution remain intact.
- No invalid index and no exact duplicate index group was found.
- No table/column cleanup was performed because no business-data object was proven obsolete and dependency-free.

## 6. Migration findings

- Live migration history is intact and was not rewritten: 437 applied entries after cleanup; the repository contains 197 SQL migration files after this work.
- The live schema contains migrations from 2026-09-21/22 that are not represented by source SQL on current `origin/main`, including morning brief, TED outbound gates, DACH target/bridge changes, and several outbound repair migrations.
- Four deployed Edge Functions also lack source directories in the repository: `pppp-storage-path-repair`, `pppp-gmail-fast-ingest-v2`, `pppp-whatsapp-import-v1`, and `pppp-ted-price-enrichment-v1`.
- This is repository provenance drift, not evidence that the live objects are obsolete. Reconstructing source from deployed artifacts should be a separate controlled backfill; invented migration SQL must not be committed.
- Historical migrations still contain the inactive project URL by design. Live functions and active cron commands contain zero dependency on it after cleanup.

## 7. Frontend cleanup

- No active UI component was deleted. The artifact audit proves that 759 repository files are excluded from production, but exclusion alone is not sufficient evidence for deletion because the set includes tests, build inputs, documentation, workers and compatibility material.
- Active stale Supabase URL fallbacks were corrected without changing screen behavior.
- No active `console.log`, `console.debug` or `debugger` occurrence was found outside tests in the audited JS/MJS/TS source patterns.
- The production artifact remains `_site`-only and passed recursive runtime dependency closure and deterministic Home ownership checks.

## 8. RPC/function cleanup

- Canonical/current: functions referenced by active runtime, triggers, cron, Edge Functions or the live bridge manifest were retained.
- Compatibility required: versioned bridge/workflow functions with current callers were retained; version number alone was not treated as replacement evidence.
- Orphaned: the six private legacy-project wrappers were removed after dependency checks.
- Security-only cleanup: 32 trigger-only functions are no longer callable as RPCs by `anon` or `authenticated`.
- Remaining review set: 93 public `SECURITY DEFINER` functions are executable by `anon` and `authenticated`. They mix intentional client bridges, secret-check helpers and internal operations, so bulk revocation is unsafe. Each requires caller/auth-contract classification before changes.

## 9. Edge Functions

- 38 functions are active; 34 have source directories in the repository.
- Most use platform JWT verification.
- Four use `verify_jwt=false`: `chatgpt-command-bridge`, `pppp-gc-outreach`, `pppp-outbound-dispatch`, and `pppp-outbound-sync`. Source inspection confirms custom `x-pppp-cron-secret` validation through a database authorization helper before protected work.
- The guarded dispatcher additionally validates queue claim/preflight state and live Gmail draft recipient before sending. No function was invoked to send mail during cleanup.
- No Edge Function was removed because none was proven caller-free across cron, database and integration paths.

## 10. Automation

- 11 active pg_cron jobs; zero failed runs in the last 24 hours at final audit.
- No duplicate active cron command was found and no active job points to the inactive Supabase project.
- Current jobs cover morning edition, memory baseline, intelligence snapshot, Gmail ingest, command bridge, project/attachment intake, retention, HTTP reconciliation, outbound synchronization and guarded dispatch.
- Two names say `hourly` while their schedules run every six hours. This is naming debt only; schedules were not changed because current business cadence is healthy and intentionality is not proven.

## 11. Outbound cleanup

- Shared queue, sync, preflight, approval, suppression/cooldown and dispatch controls were preserved.
- The server-side sync and shared dispatcher are the active scheduled path; no duplicate cron command was found.
- TED/GC/DACH source-specific preparation remains upstream of the common controls.
- No draft was approved, no outbound item was released and no email was sent.

## 12. Security

Fixed:

- Eliminated both advisor findings for security-definer views.
- Removed nonsensical write grants from three read-only views.
- Closed direct public/authenticated RPC access to 32 trigger-only `SECURITY DEFINER` functions while preserving trigger execution.
- Confirmed all public tables have RLS enabled.
- Confirmed the three Storage buckets are private; they currently have no client Storage policies and therefore remain service-controlled.

Remaining:

- 93 `SECURITY DEFINER` functions remain executable by `anon`/`authenticated` and need contract-by-contract review.
- 13 RLS-enabled tables have no policies. Most are clearly service/internal queues or control tables, which is secure deny-by-default; `pppp_tender_project_promotions` should be explicitly confirmed as service-only.
- Supabase Auth leaked-password protection is reported disabled by the security advisor.

Advisor references: [security-definer views](https://supabase.com/docs/guides/database/database-linter?lint=0010_security_definer_view), [anon SECURITY DEFINER RPCs](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable), [authenticated SECURITY DEFINER RPCs](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable), and [password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

## 13. Performance / Supabase usage

- Eight foreign keys lack supporting indexes, but their current tables contain only 0–54 estimated rows and occupy 32–208 kB. No speculative indexes were added.
- The advisor lists 70 unused indexes. Production was recently migrated and usage statistics do not establish that those indexes are permanently unused; none was dropped.
- No invalid or exact duplicate indexes were found.
- Cron concurrency is modest, there are no duplicate commands, and current jobs have no 24-hour failures.
- The public artifact is 4.19 MiB (47% of checkout bytes); only the verified artifact is deployed.

## 14. Data integrity

- Ran 21 targeted checks across projects, project/suggested-project email links, tasks, requirements, RFQs, offers, offer inbox, files, attachment links, project contacts, invoices, normalized contact emails, contact-source identities, Gmail message IDs, business references and candidate keys.
- Result: zero detected orphan links and zero duplicate business keys for the tested rules.
- No ambiguous contact, company, supplier, project or historical record was merged or rewritten.

## 15. Configuration / deployment

- This repository is deployed through GitHub Pages, not Vercel. No `vercel.json` or `.vercel` project configuration exists.
- `.github/workflows/static.yml` builds first and uploads only `_site`; the deployment policy audit passed.
- Active source/default endpoints now use `awqfpnzqwfjrjefoktgd`.
- Remaining inactive-project references are confined to historical migrations/checkpoint evidence, tests, and the explicit legacy cutover guard.
- Secrets are read from Supabase Vault or runtime environment; no secret value was printed or moved into source.

## 16. Remaining technical debt

- Repository/live provenance drift for recent migrations and four Edge Functions.
- 93 exposed `SECURITY DEFINER` RPCs need a maintained caller/auth classification.
- The runtime has many compatibility layers. The manifest and tests make it stable, but safe physical deletion requires per-module reachability evidence beyond production-artifact exclusion.
- Two cron job names no longer describe their six-hour cadence.
- The package test script shells out to `npm`; environments that provide only pnpm need a portable script invocation.
- The test suite logs one caught canonical-Home DOM error inside `navigation-system-smoke.js` while still passing. It should be made assertion-clean in a separate repair task.

## 17. Manual decisions required

1. Decide whether to backfill the missing live migration and Edge Function source into the repository from authoritative deployment artifacts. Do not synthesize it from names alone.
2. Approve a staged contract review of the remaining 93 exposed `SECURITY DEFINER` RPCs. Start with internal-request and maintenance helpers; preserve intentional browser/bridge endpoints.
3. Confirm whether `pppp_tender_project_promotions` and the other 12 no-policy tables are intentionally service-only. Add policies only if authenticated client access is required.
4. Enable leaked-password protection in Supabase Auth if compatible with the organization’s login policy.
5. Rename the two misleading `hourly` cron jobs only during a controlled scheduler maintenance window; do not change their cadence implicitly.
6. Retain or delete unused indexes only after a representative observation window and query-plan evidence.

## 18. Verification

Passed:

- Mandatory live bridge manifest read before changes.
- Three cleanup smoke tests: legacy project cleanup, read-only view hardening, trigger-function API lock.
- Full existing Node smoke chain from `package.json` executed directly (the wrapper's nested `npm` command is unavailable in this environment).
- Runtime ownership suite: 9/9 passed.
- GitHub Pages artifact audit passed: 152 bootstrap modules, 23 recursive dynamic dependencies, 257 public artifact files, correct `_site`-only upload policy.
- Syntax checks for every changed JS/MJS file passed.
- `git diff --check` passed.
- Post-DDL live checks: removed functions absent; legacy URL absent from live functions; three views are security invokers; authenticated SELECT preserved; write grants removed; 32 trigger functions locked; 35 trigger bindings and service execution preserved.
- Post-DDL Supabase security advisor rerun: security-definer view findings reduced from 2 to 0; exposed security-definer functions reduced from 125 to 93.
- Cron final check: 11 active, zero duplicate commands, zero failures in 24 hours.
- Data integrity checks: 21/21 returned zero issues.

Not fully clean:

- `pnpm test` wrapper reports failure because it invokes missing `npm`; its underlying Node test chain passed when run directly.
- One test emits a caught DOM error to stderr but exits successfully; recorded as technical debt rather than silently called clean.

## 19. Final status

- Build health: **PASS with tooling note** — syntax/runtime/artifact checks pass; wrapper assumes npm.
- Frontend health: **PASS** — production dependency closure and ownership checks pass; no redesign performed.
- Database health: **PASS** — no detected integrity failures, invalid indexes or duplicate indexes; safe DDL cleanup verified.
- Migration consistency: **PARTIAL** — live schema is healthy, but recent source provenance is incomplete in the repository.
- RPC/function consistency: **IMPROVED / PARTIAL** — six orphans removed and 32 trigger RPC exposures closed; 93 functions remain for staged review.
- Automation health: **PASS** — 11 active jobs, no duplicate command, no 24-hour failures.
- Security: **IMPROVED / PARTIAL** — view findings fixed and trigger RPCs locked; remaining RPC grants and Auth password setting require controlled follow-up.
- Deployment health: **PASS** — GitHub Pages artifact policy verified; Vercel is not the deployment owner for this repository.
- Supabase efficiency: **HEALTHY / OBSERVE** — no speculative index deletion/addition; small missing-FK-index tables and unused-index statistics should be monitored.

Cleanup stops here. No planned functional/V2 work was started.
