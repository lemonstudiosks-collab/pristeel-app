# PPPP checkpoint — Home + event intelligence

Date: 2026-08-26
Status: PR #284 merged; production deployment verification in progress.

This file is the recovery point if the ChatGPT thread is interrupted. Do not redesign PPPP from zero. Continue from the verified current state below.

## Authoritative repository / database
- GitHub: `lemonstudiosks-collab/pristeel-app`
- Production branch: `main`
- Supabase project: `isymxqfqzkchbsrbhucf`
- PR #284 `Make PPPP Home reflect live project state`: MERGED
- PR #284 squash merge commit: `4e0a88a40881a1f7ee1f9df08245df7df0e621b6`

## What is fixed live in Supabase
1. STACON release-readiness false blocker is superseded by confirmed release evidence. The old `execution_release_readiness` Home blocker is closed and must not be recreated as daily urgency once confirmed release exists.
2. Wolff & Müller recent email thread is linked to project `W&M Kiel - Sporthalle RBZ Wirtschaft`; the outgoing reply of 2026-08-25 supersedes the old follow-up task.
3. RSB Hamburg has confirmed operator context that no action is currently required; the stale `telefono Christian Meyer` task is closed and the project is in `wait_for_client`.
4. SSP EWAS has linked outgoing offer evidence `PST-OFF-2026-08-027`; pre-send tasks `Finalizo sasite dhe oferten SSP - EWAS` and `Urgjent: Rishiko gjendjen komerciale` are closed.
5. A conservative unique project-contact email backfill exists so an email can inherit a project only when the active contact identity maps uniquely.
6. `pppp_home_current_actions_v1` is the Home projection for current user-facing actions. Technical document queues, SLA heuristics, generic execution bootstrap tasks and release-readiness machinery stay backstage.
7. Normal future reminders are hidden from Home until they are within seven days. Urgent/high-priority actions remain visible outside that horizon.

## Verified Home action projection after the horizon fix
At the checkpoint, `pppp_home_current_actions_v1` returns only four timely/current rows:
- STACON — `ISO 9001 Eurosteel e skaduar — kërko rinovimin` (urgent)
- Jola AH36 Heavy Plate — `Kontrollo dhe dërgo ofertën PST-QUO-2026-022`
- ITALIAN STYLE - Hala - CARINVEST — `Kontrollo dhe dërgo ofertën PST-OFF-2026-08-026`
- STACON — `Dokumentacioni i cilesise — para ngarkimit`

Far-future normal reminders such as September delivery and November bank-guarantee release remain in the project but are no longer daily Home clutter.

## Home v3 now on main
`pristeel-project-control-home-v1.js` is `PRISTEEL Live Home v3` and retains the compatibility API `PSTProjectControlHomeV1`.

The Home intentionally keeps the left navigation and shows only:
- `PPPP LIVE` + AI/operator input
- `KËRKON VEPRIMIN TËND`
- `LËVIZJET E FUNDIT`

It does not reproduce the old project radar, project-register metrics, raw `BLLOKUES`, `VONUAR`, `[AUTO]`, or every active project merely because it exists.

## Event intelligence investigation and safe state
A Supabase Edge Function `pppp-project-event-intelligence` was introduced as an optional unattended semantic event layer.

### What was found
- Initial 502 was traced to a code bug: a constant named `URL` shadowed the global URL constructor.
- That runtime bug was fixed. The function now returns HTTP 200.
- The newly deployed function does not currently receive `OPENAI_API_KEY` in its runtime.
- A conservative attempt to call the existing user-scoped `pppp-openai-assistant` from a service-only context correctly failed with `no_visible_projects`. Its visibility guard was NOT weakened.

### Current safe behavior
Live function version 4 fails closed when the provider is unavailable:
- HTTP 200
- `provider_configured: false`
- `status: paused_provider_unavailable`
- `queued: 0`
- `processed: 0`
- no task creation and no project-state mutation.

The `project-event-intelligence-5m` pg_cron job is deliberately `active=false` until a real semantic end-to-end event succeeds. Deterministic Gmail/project-state reconciliation remains active and authoritative, so this optional provider is not allowed to block the Home release.

A SECURITY DEFINER helper `pppp_project_event_intelligence_internal_request(days,limit)` exists so future tests can invoke the function without exposing the cron secret.

## Local semantic worker finding
The Mac mini local semantic worker is a separate Automation Health issue:
- `semantic_ai_jobs` has pending jobs with no claimant.
- the active semantic worker key has not been used since 2026-08-22.
- OCR worker traffic remains active, so this is specifically a semantic-worker path issue rather than proof that the whole Mac mini is offline.

When someone has shell access to the Mac mini, use the repository-supported semantic worker update/restart path (`local-ai/update_semantic_worker.sh` / LaunchAgent `com.pristeel.pppp-semantic-worker`) and then verify the pending queue drains. Do not bypass worker authentication or expose its key.

## Repository continuity now merged
PR #284 merged these production-facing/replayable files:
- `pristeel-project-control-home-v1.js`
- `tests/project-control-home-smoke.mjs`
- `supabase/functions/pppp-project-event-intelligence/index.ts`
- `supabase/migrations/20260826164600_live_home_event_state_v2.sql`
- `supabase/migrations/20260826171200_home_actions_and_event_provider_pause.sql`

The second migration contains the concrete replayable Home view, safe internal request wrapper, and fail-closed cron pause.

## Exact continuation order if this chat stops now
1. Verify GitHub Actions / GitHub Pages for the current `main` commit after PR #284 and this checkpoint update.
2. Confirm syntax/smoke/deployment workflows are green. If deployment fails, fix only the failing surface and preserve the Live Home architecture.
3. Verify the production Pages artifact contains `PRISTEEL Live Home v3` and `__pstLiveHomeV3`.
4. Verify the actual production Home loads current actions + recent movements and does not show stale heuristic alarm noise.
5. Treat restoration of local semantic processing as a separate Automation Health task: restart/update the Mac mini semantic worker when shell access is available, confirm pending jobs complete, then decide whether the optional `project-event-intelligence-5m` fallback is still needed.
6. Only re-enable the optional event-intelligence cron after an actual end-to-end semantic event is verified. Never weaken project visibility or human approval guards to make it pass.
7. Update this checkpoint with the final production deployment run/commit and semantic-worker status.

## Safety / architecture rules that remain binding
- `main` + live Supabase are authoritative.
- Do not rebuild PPPP from zero.
- Preserve Gmail-to-project identity safety.
- One permanent Drive project identity/folder per project.
- External emails, final offers, supplier decisions, PO/contracts and financial commitments remain human-approved.
- Newer confirmed events supersede obsolete automated tasks.
- Platform improvements must be implemented canonically, not as one-project hacks.

## Definition of done for the Home phase
The Home phase is done when:
1. PR #284 is merged. ✅
2. Live Home projection contains only current/timely work. ✅
3. GitHub Pages deployment for the merged Home succeeds. PENDING VERIFICATION.
4. Production artifact / UI is verified as Live Home v3. PENDING VERIFICATION.

Unattended semantic-worker restoration is tracked separately and must not be falsely reported as complete.
