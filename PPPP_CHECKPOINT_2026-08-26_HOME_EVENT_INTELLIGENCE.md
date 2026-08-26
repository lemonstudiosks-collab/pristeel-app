# PPPP checkpoint — Home + event intelligence

Date: 2026-08-26

This file is the recovery point if the ChatGPT thread is interrupted. Do not redesign PPPP from zero. Continue from the verified current state below.

## Authoritative repository / database
- GitHub: `lemonstudiosks-collab/pristeel-app`
- Production branch: `main`
- Supabase project: `isymxqfqzkchbsrbhucf`
- Active work branch: `fix/live-home-event-state-20260826`
- Open PR: #284 — `Make PPPP Home reflect live project state`

## What has already been fixed live in Supabase
1. STACON release-readiness false blocker is superseded by confirmed release evidence. The old `execution_release_readiness` Home blocker is closed and must not be recreated as daily urgency once confirmed release exists.
2. Wolff & Müller recent email thread is linked to project `W&M Kiel - Sporthalle RBZ Wirtschaft`; the outgoing reply of 2026-08-25 supersedes the old follow-up task.
3. RSB Hamburg has confirmed operator context that no action is currently required; the stale `telefono Christian Meyer` task is closed and the project is in `wait_for_client`.
4. SSP EWAS has linked outgoing offer evidence `PST-OFF-2026-08-027`; pre-send tasks `Finalizo sasite dhe oferten SSP - EWAS` and `Urgjent: Rishiko gjendjen komerciale` are closed.
5. A conservative unique project-contact email backfill exists so an email can inherit a project only when the active contact identity maps uniquely.
6. `pppp_home_current_actions_v1` exists as the Home projection for current user-facing actions. Technical document queues, old SLA heuristic follow-ups and raw release-readiness machinery must not be presented as the daily Home wall.

## Home redesign in PR #284
The new Home intentionally keeps the left navigation and replaces the old radar/metrics wall with only:
- PPPP Live / AI input
- `KËRKON VEPRIMIN TËND`
- `LËVIZJET E FUNDIT`

It must not show raw `BLLOKUES`, `VONUAR`, `[AUTO]`, project-register metrics or every active project merely because it exists.

PR #284 contains the Home implementation, smoke-test updates, the repository source for project-event intelligence, and the migration continuity record.

## Semantic AI finding
The local semantic path stopped completing new semantic jobs after 2026-08-22. Gmail ingestion and other cron processes remain active, but some `semantic_ai_jobs` are pending. Therefore incoming information can reach PPPP without being interpreted quickly enough.

## New OpenAI event-intelligence fallback
A Supabase Edge Function named `pppp-project-event-intelligence` was deployed on 2026-08-26. Its purpose is:
`linked Gmail event -> inspect current project truth -> OpenAI structured interpretation -> store auditable project event fact -> supersede obsolete automated actions conservatively`.

Human gates remain mandatory. The function must never send outbound email, select/commit a supplier, approve price/margin, create legal/financial commitments, or decide won/lost automatically.

### Current blocker at this checkpoint
The first scheduled invocation returned HTTP 502 and no `openai-email-event` context facts were created. This is NOT considered finished.

## Exact continuation order
1. Inspect live `pppp-project-event-intelligence` source and Edge Function logs / cron response body for the 502.
2. Fix the 502 at the Edge Function level, preserving human gates and current project identity safeguards.
3. Invoke it against a real newly linked email and verify end-to-end evidence in `pppp_project_context_facts` / current context.
4. Verify that stale actions are superseded only when the new event actually proves they are obsolete.
5. Verify Home query `pppp_home_current_actions_v1` returns current business actions, not backstage technical noise.
6. Run / confirm PR #284 smoke checks and merge PR #284 only after the event-intelligence path is working.
7. Verify GitHub Pages production deployment and inspect the actual production Home after merge.
8. Update this checkpoint or `PPPP_MASTER_CONTEXT.md` with the final production commit and verification results.

## Safety / architecture rules that remain binding
- `main` + live Supabase are authoritative.
- Do not rebuild PPPP from zero.
- Preserve Gmail-to-project identity safety.
- One permanent Drive project identity/folder per project.
- External emails, final offers, supplier decisions, PO/contracts and financial commitments remain human-approved.
- Newer confirmed events supersede obsolete automated tasks.
- Platform improvements must be implemented canonically, not as one-project hacks.

## Definition of done for this phase
This phase is complete only when all four are true:
1. OpenAI project-event intelligence succeeds on a real event.
2. PR #284 is merged.
3. GitHub Pages production deploy succeeds.
4. Production Home visibly shows current actions + recent movements without stale heuristic alarm noise.
