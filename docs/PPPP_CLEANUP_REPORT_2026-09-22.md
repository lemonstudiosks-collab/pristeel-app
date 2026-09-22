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
- Applied `lock_service_only_tables_v8`: removed all direct `anon`/`authenticated` table privileges from 13 worker queues, control tables and internal-state tables. `service_role`/`postgres` access and the audited `supabase_read_only_user` SELECT bridge remain intact.
- No invalid index and no exact duplicate index group was found.
- No table/column cleanup was performed because no business-data object was proven obsolete and dependency-free.

## 6. Migration findings

- Live migration history is intact and was not rewritten: 446 applied entries after cleanup; the repository contains 205 SQL migration files after this work.
- The live schema contains migrations from 2026-09-21/22 that are not represented by source SQL on current `origin/main`, including morning brief, TED outbound gates, DACH target/bridge changes, and several outbound repair migrations.
- The four previously missing deployed Edge Functions were exported from their authoritative live deployments into `supabase/functions`: `pppp-storage-path-repair`, `pppp-gmail-fast-ingest-v2`, `pppp-whatsapp-import-v1`, and `pppp-ted-price-enrichment-v1`.
- Fifteen missing production migration statements from 2026-09-21/22 were exported exactly from `supabase_migrations.schema_migrations` into `supabase/live-migration-history`. They are intentionally outside the replayable migration directory because live server-assigned versions and historical local filenames are not consistently aligned.
- `supabase/functions/PRODUCTION_DEPLOYMENT_SNAPSHOT_2026-09-22.json` records all 38 deployed versions, JWT settings and deployment hashes.
- Source provenance for the identified gap is now preserved. A future full-baseline task is still required before `supabase db push` can safely become the deployment mechanism.
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
- A caller-contract review identified 24 scheduler/worker RPCs whose active callers are `postgres`, pg_cron or service-role Edge Functions. Browser-role execution was revoked while `service_role`/`postgres` execution was preserved.
- A second contract-restoration pass closed 22 additional helpers already declared internal by their canonical migrations: 19 retain service-role/postgres execution and three historical-intelligence implementation helpers are postgres-only.
- Six legacy internal helpers explicitly covered by the August production hardening contract were also restored to service/postgres-only execution.
- The final contract passes restored six maintenance RPCs, four authenticated UI/admin RPCs, 27 ChatGPT bridge RPCs, and four otherwise unguarded maintenance RPCs to their intended roles.
- Final public exposure: zero public `SECURITY DEFINER` functions are executable by `anon`. Four remain executable by `authenticated` intentionally: automation control health, expense receipt confirm/ignore, and manual supplier-offer creation.
- The ChatGPT bridge remains fully usable through `supabase_read_only_user` for its 24 read functions and through `service_role` for its three controlled write functions; browser roles cannot invoke either surface.

## 9. Edge Functions

- 38 functions are active and all 38 now have source directories in the repository.
- Most use platform JWT verification.
- Four use `verify_jwt=false`: `chatgpt-command-bridge`, `pppp-gc-outreach`, `pppp-outbound-dispatch`, and `pppp-outbound-sync`. Source inspection confirms custom `x-pppp-cron-secret` validation through a database authorization helper before protected work.
- The guarded dispatcher additionally validates queue claim/preflight state and live Gmail draft recipient before sending. No function was invoked to send mail during cleanup.
- `pppp-storage-path-repair` was a hard-coded, destructive, one-off repair function with no discovered repository, cron or database caller. The original implementation is preserved under `supabase/retired-functions`; production version 4 is a non-privileged HTTP 410 tombstone with JWT verification and no service-role key.
- The Supabase CLI could not delete the function because no CLI access token was available. The reversible tombstone removes its destructive capability without losing audit history or endpoint provenance.

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
- Closed direct public/authenticated RPC access to 24 internal scheduler/worker `SECURITY DEFINER` functions while preserving all 24 service-role/postgres grants.
- Restored canonical ACLs for 22 additional internal helpers: 19 service/postgres-only and three postgres-only historical-intelligence helpers.
- Restored service/postgres-only ACLs for six legacy internal helpers already covered by the August production hardening migrations.
- Formalized all 13 no-policy tables as service-only at the table-privilege layer, while preserving the dedicated audited read-only bridge.
- Confirmed all public tables have RLS enabled.
- Confirmed the three Storage buckets are private; they currently have no client Storage policies and therefore remain service-controlled.

Remaining:

- Zero `SECURITY DEFINER` functions remain executable by `anon`.
- Four authenticated-only `SECURITY DEFINER` functions remain by explicit product contract; all four are active UI/admin endpoints and are not anonymous APIs.
- 13 RLS-enabled tables intentionally have no client policies. Repository caller inspection and live ACL verification classify all 13 as service/internal surfaces: browser roles have zero direct privileges, while `service_role` retains access. The advisor still reports this deny-by-default pattern as informational.
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

- Live migration version IDs and historical local migration filenames remain non-aligned; the missing statements are preserved as non-replayable production history, but a full migration baseline is still required.
- The four intentional authenticated-only RPCs should remain covered by their UI/admin contract tests when changed.
- The runtime has many compatibility layers. The manifest and tests make it stable, but safe physical deletion requires per-module reachability evidence beyond production-artifact exclusion.
- Two cron job names no longer describe their six-hour cadence.
- The package test script shells out to `npm`; environments that provide only pnpm need a portable script invocation.
- The test suite logs one caught canonical-Home DOM error inside `navigation-system-smoke.js` while still passing. It should be made assertion-clean in a separate repair task.

## 17. Manual decisions required

1. Enable leaked-password protection in Supabase Auth if compatible with the organization’s login policy.
2. Rename the two misleading `hourly` cron jobs only during a controlled scheduler maintenance window; do not change their cadence implicitly.
3. Retain or delete unused indexes only after a representative observation window and query-plan evidence.
4. Create a controlled full migration baseline before enabling CLI-driven `supabase db push`; do not move the live-history snapshots into the active directory.

## 18. Verification

Passed:

- Mandatory live bridge manifest read before changes.
- Twelve cleanup smoke tests cover legacy-project removal, view/trigger hardening, source backfill/retirement, worker/internal/maintenance ACL restoration, authenticated UI contracts, the ChatGPT bridge role split, the final maintenance lock, and service-only table contracts.
- Full existing Node smoke chain from `package.json` executed directly (the wrapper's nested `npm` command is unavailable in this environment).
- Runtime ownership suite: 9/9 passed.
- GitHub Pages artifact audit passed: 152 bootstrap modules, 23 recursive dynamic dependencies, 257 public artifact files, correct `_site`-only upload policy.
- Syntax checks for every changed JS/MJS file passed.
- `git diff --check` passed.
- Post-DDL live checks: removed functions absent; legacy URL absent from live functions; three views are security invokers; authenticated SELECT preserved; write grants removed; 32 trigger functions locked; 35 trigger bindings preserved; all internal RPCs deny browser roles and retain their intended service/postgres execution; three intelligence helpers are postgres-only; ChatGPT reads retain the dedicated read-only role; all 13 service-only tables deny browser roles while retaining service and read-only bridge access.
- Production Edge verification: `pppp-storage-path-repair` version 4 is active with JWT verification, exact tombstone source/hash, HTTP 410 behavior and no service-role credential use.
- Post-DDL Supabase security advisor rerun: security-definer view findings reduced from 2 to 0; anonymous security-definer functions reduced from 125 to 0. The remaining four authenticated findings are the intentional UI/admin endpoints listed above.
- Cron final check: 11 active, zero duplicate commands, zero failures in 24 hours.
- Data integrity checks: 21/21 returned zero issues.

Not fully clean:

- `pnpm test` wrapper reports failure because it invokes missing `npm`; its underlying Node test chain passed when run directly.
- One test emits a caught DOM error to stderr but exits successfully; recorded as technical debt rather than silently called clean.

## 19. Final status

- Build health: **PASS with tooling note** — syntax/runtime/artifact checks pass; wrapper assumes npm.
- Frontend health: **PASS** — production dependency closure and ownership checks pass; no redesign performed.
- Database health: **PASS** — no detected integrity failures, invalid indexes or duplicate indexes; safe DDL cleanup verified.
- Migration consistency: **IMPROVED / PARTIAL** — the identified source gap is preserved, but version history still needs a controlled baseline before automated replay.
- RPC/function consistency: **PASS** — six orphans removed, all 125 anonymous security-definer exposures closed, four intentional authenticated UI/admin contracts retained, and the ChatGPT role split verified.
- Automation health: **PASS** — 11 active jobs, no duplicate command, no 24-hour failures.
- Security: **IMPROVED / PARTIAL** — view findings fixed, anonymous privileged RPC exposure eliminated, trigger/internal-worker RPCs locked and the destructive repair endpoint neutralized; only the Auth leaked-password setting requires an organization-policy decision.
- Deployment health: **PASS** — GitHub Pages artifact policy verified; Vercel is not the deployment owner for this repository.
- Supabase efficiency: **HEALTHY / OBSERVE** — no speculative index deletion/addition; small missing-FK-index tables and unused-index statistics should be monitored.

Cleanup stops here. No planned functional/V2 work was started.
