# PPPP CHANGELOG

This file records material architecture/automation changes. It is not a substitute for Git history. It exists to make project continuity readable across long ChatGPT/engineering sessions.

## 2026-09-05

### Finance presentation now fails open instead of rendering a blank page

- Production verification after PR #390 exposed a separate presentation-owner conflict: the Operating Assistant CSS hid every Finance child before its compact Finance panel existed.
- The terminal navigation owner now explicitly asks the presentation owner to render after Finance or System activation.
- Compact Finance/System CSS is enabled only after the corresponding replacement panel exists; if that layer is late or unavailable, the existing core tools remain visible.
- Updated regression coverage reproduces the terminal-route handoff and protects the fail-open contract. No business data, Supabase schema, automation, outbound action or approval gate changed.

## 2026-09-04

### Finance and System terminal routes isolated from shared router wrappers

- Production verification after PR #388 proved that Partnerët → Financat could still block the browser before any Finance surface became active.
- Daily Finance and System navigation now activates its authoritative page directly and never enters the multiply decorated `pstWorkspaceGo` chain.
- The early native Finance capture hydrates the existing Finance core directly, and its asset version is bumped so returning browsers cannot reuse the stale route owner.
- Dynamic navigation regressions, the complete 175-check suite, runtime manifest and deterministic bootstrap guards pass. No business data, Supabase schema, automation or approval gate changed.

### Finance navigation recursion hotfix

- Stopped late Finance, Tender and canonical Home wrappers from repeatedly recapturing one another.
- The canonical Home router now closes over its immutable base instead of a mutable shared reference, preventing cyclic calls and `Maximum call stack size exceeded` on Finance navigation.
- Added regression coverage for repeated router installation through later wrapper owners.

### Inline boot continuity and canonical project preload stabilized

- Removed a synchronous `loadHub is not defined` failure from the application HTML. The retired cockpit owner is now an optional compatibility callback, so its absence cannot abort the remaining inline runtime.
- Changed the early Project Workspace preloader to verify the stable `PSTProjectIntegrityUIV1.open` module API instead of racing presentation wrappers on the mutable global opener.
- Bumped the preloader cache key so production browsers receive the corrected activation contract.
- Added a regression smoke for both failures and made the ordered-bootstrap timeout smoke portable to Windows timer granularity.
- Made the runtime-manifest blob check normalize CRLF checkouts to Git's canonical LF representation.
- No Supabase schema/data, automation, Gmail, OCR, scheduled job, outbound action or approval-gate logic changed.

## 2026-09-03

### TED winner email preparation restored in Action Console

- Every TED award-winner popup now exposes `Përgatit emailin`, including rows whose company role is still unverified; those rows use neutral capacity-support wording instead of losing the email action.
- Outreach copy follows the actual PRISTEEL messages sent on 2 September 2026: public-award context, additional fabrication capacity, PRISTEEL technical/fabrication coordination, DAP delivery, partner-plant EN 1090-2 / EXC-4 capability and a request for drawings/BOQ/BOM.
- Language routing is deterministic: German for DACH, Serbo-Croatian for Croatia/Montenegro/Serbia and English for all other countries.
- The editable preview remains mandatory. An explicit user click creates a Gmail draft; no message is sent automatically.
- Gmail draft creation prefers the verified `arianit.vllahiu@prissteel.com` send-as alias and appends that alias's live Gmail HTML signature, including its stored logo and links.
- Runtime cache keys were bumped for both the tender-action provider and the Action Console owner. No tender discovery, automation, Supabase schema or project-state logic changed.

## 2026-08-25

### Final daily-surface polish removes the remaining visible control clutter

- PR #268 tightens the already-canonical daily surfaces without replacing any business engine.
- Projects keeps search plus `Të gjitha / Action / Waiting / Execution / Closed` and retires the remaining normal-page maintenance chrome: duplicate manager, manual refresh, board/list toggle, legacy counters/filters, sort selector and the header-level `+ Projekt i ri` button.
- Manual project creation is not deleted. The exceptional `+ Krijo` path remains available, while normal project intake is expected to come increasingly from confirmed Gmail/tender/project events and existing automation.
- System now treats `Automation Health` as the primary visible operational surface.
- The large System app/module grid remains intact but is collapsed under `Mjete teknike` by default, instead of presenting a wall of technical tiles during normal work.
- The duplicate System shortcut strip is hidden from daily use. Gmail, Commercial intake, integrations, diagnostics and fallback modules remain connected and reachable.
- The cleanup remains presentation-only: no Supabase reads/writes, no routing ownership, no polling, no MutationObserver, no provider deletion and no automatic external/financial commitment.
- `tests/daily-zones-cleanup-smoke.js` now protects the calmer Projects/System presentation and `.github/workflows/finance-daily-smoke.yml` runs that regression in CI.
- Canonical daily operating documentation was updated in `docs/DAILY_OPERATING_SURFACES_2026-08-25.md`.

## 2026-08-23

### PPPP operating experience simplified without replacing backend engines

- Added `pristeel-operating-experience-v1.js` as a late presentation/navigation layer loaded dynamically by `pristeel-redesign-finalizer-v1.js`.
- Primary daily navigation is now `Home`, `Opportunities`, `Projects`, `Partners`, `Finance`, `System`.
- Gmail, Commercial intake/review and technical automation surfaces remain connected but are moved out of primary daily navigation and remain reachable through `System` or direct contextual actions.
- Added distinct visual color identity by business zone so location is recognizable through both text and color.
- Project Workspace is presented as five business phases: `Përgatitja -> Prokurimi -> Komerciale -> Ekzekutimi -> Financa`, with `Skedarët` and `Komunikimi` treated as utilities.
- Existing detailed project engines remain reused: `BOM -> RFQ -> Ofertat e furnitorëve -> Krahasimi i ofertave -> Çmimi i shitjes -> Oferta për klientin`.
- Procurement and Commercial are visually separated without creating duplicate comparison/pricing/client-offer engines.
- `Hapi i radhës` is now lifecycle-aware: won/execution projects route to Execution, technical review routes to preparation, pricing/client-offer states route to the commercial decision, and `wait_for_client` explicitly shows that no user action is required.
- Home action surface is presented as `Duhet veprimi yt`.
- Where a safe existing target is known, Home `Vepro` routes directly to Communication, RFQ, supplier comparison, client offer, Execution or Commercial intake review instead of forcing the user to navigate manually.
- Opportunities now exposes clearer final decision labels: `GO · Krijo projekt`, `REVIEW`, `NO-GO`; underlying tender status/promotion gates are unchanged.
- The new layer performs no Supabase reads/writes, no outbound actions and does not own Home/project business state.
- Final client offer, sell price/margin, supplier commitment, external send and final financial commitment remain human-gated.
- PR #233 merged to `main` as `48c264cab7116ee36f7c485231510e6529891ba6`.
- Before merge, the synthetic merge tree passed the full PRISTEEL test suite, runtime-manifest guard, Pages artifact audit, production Pages build and Local Semantic AI checks.
- Post-merge live backend verification confirmed all active pg_cron jobs at their latest run were `succeeded`; Semantic AI had `48 completed / 21 superseded / 0 pending/failed`; local OCR had `14 completed / 17 no_text` and no failed/pending jobs; `mac-mini-01` remained enabled and online.
- Continuity docs and runtime ownership records were updated in the follow-up continuity PR.

## 2026-08-22

### Project Workspace becomes one canonical end-to-end workflow

- Added `pristeel-project-workflow-canonical-v1.js` as the final UI-only reconciler over the existing Project-First workspace.
- The Project Workspace now exposes six top-level areas: `Përmbledhja`, `Prokurimi`, `Ekzekutimi`, `Financat`, `Skedarët`, `Komunikimi`.
- `Prokurimi` now has one explicit six-stage sequence: `BOM -> RFQ -> Ofertat e furnitorëve -> Krahasimi i ofertave -> Çmimi i shitjes -> Oferta për klientin`.
- Every procurement stage is independently clickable; state badges describe what exists instead of blocking navigation.
- Empty states now explain what is missing and what the next action is instead of leaving blank pages.
- Existing BOM, RFQ, normalized supplier comparison, pricing calculator and client-offer engines are reused rather than duplicated.
- Added `pristeel-project-workflow-legacy-capture-v1.js` so the old horizontal ribbon is compatibility-only and returns into the same canonical project flow instead of opening disconnected legacy routes.
- Legacy capture installation is idempotent, preventing duplicate global click listeners across delayed bootstrap retries.
- Project context is preserved when a legacy editor is still required, with explicit return to the same active project.
- Supplier offers and the PRISTEEL client offer are separated as distinct stages so `Ofertat` is no longer commercially ambiguous.
- Final sell price, client offer and outbound communication remain human-gated.
- The new workflow layers perform no business-data writes.

### Runtime ownership and regression protection updated

- `runtime-manifest.json`, `runtime-bootstrap-order.json`, `docs/ACTIVE_RUNTIME.md` and bootstrap-sequence guards were updated deliberately for the new final workflow layers.
- Canonical workflow loads after lifecycle, commercial and Project Intelligence owners; legacy ribbon capture loads after the canonical workflow.
- Regression coverage now protects the six project areas, six procurement stages, no-BOM path, supplier-offer empty state, normalized comparison reuse, pricing bridge, client-offer draft-vs-sent state, legacy-ribbon capture and duplicate-listener prevention.
- GitHub checks passed for runtime manifest, production Pages build, Pages artifact audit, Local Semantic AI and the full PRISTEEL test suite before merge.
- Backup branch before the change: `backup/pre-canonical-project-workflow-20260822` at `ea1b2976916fbebd402740137fec6320269b4406`.

## 2026-08-20

### Home visual ownership stabilized

- Retired delayed `Home Happy` timers and legacy hero counter rewrites that continued modifying Home after the canonical render.
- `pristeel-home-command-center-v2.js` v6 is the stable presentation owner over Canonical Home data.
- Home keeps `Për mua tani` consistently, without switching back to `Prioritetet` after load.
- Legacy hero counters are removed.
- Priority cards use the same neutral white visual family as active project cards, with only a subtle top accent/category icon.
- Home remains two-column for priorities and does not introduce business-data writes.
- Key commits: `5c3dbc9f26cdde3c39d29659cab05a11209ce5af`, `448d8a69578b7dfd831777c4dd8ee3425bb7a605`.

### CARINVEST supplier quote made operational

- Eurosteel quotation `ES287-08/2026` from the verified CARINVEST Gmail thread is now registered as an actual supplier offer for project `ITALIAN STYLE - Hala - CARINVEST`.
- Supplier offer total: `359,612.40 EUR`; structured lines retain the two fabrication rates, bolts/anchors, erection and transport.
- Eurosteel RFQ is marked replied and linked to the supplier offer.
- The attached PDF is linked/analyzed against CARINVEST with structured commercial data and review flags.
- Review flags retained rather than silently corrected: the supplier PDF says transport to Budva, Montenegro, and the erection quantity `29,456 kg` does not reconcile with the fabrication quantity `171,100 kg`.
- Project Commercial can therefore show the real supplier quote instead of `0 burime`.

### Project-aware client offer bridge

- `pristeel-project-commercial-prefill-rescue-v1.js` upgraded to v2.
- Opening a new client offer explicitly from a project clears legacy/demo defaults only for that new offer.
- The bridge reloads canonical project data before prefilling, so stale project state does not win over current procurement data.
- Client offer identity is prefilled from the active project, including project name, reference, client and the best project-specific buyer contact.
- CARINVEST reference `MARKO JOVANOVIC` therefore resolves to Marko Jovanovic / `marko@italianstyle.me`, rather than unrelated STACON demo data.
- Supplier quantity can seed the draft quantity when the project itself has no BOM quantity.
- A supplier quote with one coherent cost rate may be selected as procurement cost basis, but mixed-rate/review-flagged quotes are not flattened into one automatic €/kg value.
- For mixed quotes such as CARINVEST, the offer editor shows the exact supplier line summary and total while leaving selling price/margin blank for human approval.
- Existing/saved client offers are not overwritten.
- Key commits: `288f4384083573877d9b783352850a9a11e48496`, `f98b23fe0c9d0c4b7c5e25ce338803939b0d1c24`, `5f5d8281e6cce2dec3948a3407261c9a78d995b1`.

### Client-offer continuation fixed after supplier quote

- `pristeel-project-commercial-prefill-rescue-v1.js` upgraded to v3 after reproducing the real `Krijo / edito ofertë` failure.
- Root cause: the Commercial Document Builder deliberately reset a fresh offer again after opening it, so the earlier project prefill ran too early and was erased.
- The project bridge now owns the explicit Project -> Client Offer handoff and waits until the builder's fresh-form reset is complete before hydrating the draft.
- For a project with one supplier quotation, the supplier's structured quotation rows are carried into the PRISTEEL offer editor as editable sales rows with selling price `0` / pending approval, while supplier costs remain internal metadata/reference.
- CARINVEST therefore carries Eurosteel `ES287-08/2026` lines for the two fabrication rates, bolts/anchors, erection and transport into the client-offer preparation step instead of opening a blank generic offer.
- The project identity, client, buyer contact and supplier quantity context are also carried forward.
- Review flags remain visible internally, including the Budva transport inconsistency and the erection/fabrication quantity mismatch; they are not silently copied into customer-facing notes.
- The bridge never saves, finalizes or sends the offer automatically. Pricing, margin and final commercial approval remain human-gated.
- Runtime bootstrap cache key bumped to `20260820-bridge3` so the corrected bridge is loaded after deployment.
- Key commits: `edc108eb90bf54a78fafc9cde6b14cb93d0f5429`, `b18835c1b432721c11715e72ec7d0218a3f30ecb`.

### Regression coverage updated

- Home smoke coverage now protects stable five-action behavior, removal of legacy counters, neutral priority presentation and unambiguous action tagging.
- Commercial prefill regression coverage reproduces CARINVEST with legacy STACON defaults, project/ref/contact replacement and a multi-rate supplier quote that must remain review-gated rather than flattened.
- Key commits: `7b3118d7189d79c7924066179693d2ee32fdcdbf`, `bd6397a8b0e616a2d2cdb74fe521f279dc5abe92`.

## 2026-08-19

### Home becomes an operational action engine

- `pristeel-home-canonical-v1.js` upgraded from passive Home aggregation to current-state/action logic.
- Home is now `Për mua tani`, capped at five concrete actions.
- Added `Në pritje` for projects where no user action is currently due.
- Added Project Brief popup with current state, recent activity, missing information, source context and recommended next actions.
- Added supplier-quote, client-reply, technical-deadline and sent-offer state handling.
- Automatic stale-task reconciliation introduced for superseded project events.
- Commit: `9f98da502aa6e720d1d110e6d58b4e7814e4c61b`.

### Workspace shell cleanup

- Removed visible right legacy rail from current Workspace routes while keeping compatibility providers in DOM where required.
- Enforced a single Workspace sidebar.
- Cleaned legacy lower-sidebar remnants and old floating search behavior.
- Home priority cards normalized to two-column neutral presentation.
- Project sort control compacted without removing function.
- Key commits: `432102919a37acb8fec039cbb9c8d68d12f6b8b8`, `127f857f3f1530ba15fed5bf6f00bef9fca3498e`.

### Automation-first daily navigation

- Sidebar daily path standardized around Home, Projektet, Tenderat and Kontaktet.
- Gmail, Komerciale, Financa and Modulet kept connected under tools/back-office navigation.
- Duplicate/concatenated `Modulet` presentation cleaned by reconstructing canonical nav buttons rather than stacking decorators.
- `pristeel-task-source-actions-v1.js` upgraded to v15.
- Commit: `9c38f51db88cac5fc0e8505fa6b820e5f1759a4f`.

### Contact Master

- Added `pristeel-contact-master-v1.js` as the unified Workspace relationship register.
- Contact view combines canonical PPPP identity with Gmail, HubSpot and Bitrix24 source identities and linked projects.
- Existing CRM/contact pages remain as back-office/classic fallback.
- Commit introducing UI: `3d5f0bf2bc30357a91da503702ad5877600ac8ba`.
- Supabase migration `pppp_contact_master_gmail_sync_v1` added incoming Gmail-to-contact/project synchronization.
- Historical backfill processed 86 email/project sender pairs.
- `pppp_contact_party_guard_v1` corrects supplier identity from actual RFQ/partner evidence instead of treating every external sender as a client.
- `pppp_contact_master_v1` now canonicalizes duplicate contact rows by email without deleting HubSpot/Bitrix24/Gmail source history.
- Verified sample identities: Aleksandar Cingelic = Italian Style/client; Ermal Rula = Eurosteel/supplier; Zoran Ilievski = AKTIVA/supplier/production-side relationship.

### Durable PPPP continuity

- Added live continuity registry in Supabase:
  - `pppp_platform_context`
  - `pppp_platform_changelog`
  - `pppp_platform_protected_rules`
  - `pppp_platform_integrations`
  - `pppp_platform_snapshot_v1()`
- Added repository continuity documents:
  - `PPPP_MASTER_CONTEXT.md`
  - `PPPP_DO_NOT_BREAK.md`
  - `PPPP_CONTINUITY_PROTOCOL.md`
  - `PPPP_CHANGELOG.md`
- New sessions no longer need to reconstruct the platform only from chat memory.
- `runtime-manifest.json` and `docs/ACTIVE_RUNTIME.md` were refreshed to record Canonical Home, the final Workspace shell reconciler and Contact Master ownership.

### Structured project requirements

- Added `project_requirements` and `pppp_project_requirements_summary_v1`.
- Analyzed attachments now convert supported extracted evidence into structured standards, execution classes, steel grades, certificates, surface requirements, dynamic-plan and selected commercial/deadline signals.
- OCR/conflict evidence remains review-gated.
- Historical analyzed-document backfill produced 482 structured requirement rows.
- Migrations: `pppp_structured_project_requirements_v1`, `pppp_structured_requirements_project_id_cast_v1`.

### Security verification for new automation objects

- Supabase advisors were run after the new DDL.
- New security-definer-view findings were removed by converting Contact Master and requirements summary views to `security_invoker`.
- `project_requirements` now has RLS enabled with authenticated read access.
- New SECURITY DEFINER trigger/helper functions have `search_path` fixed and are not executable by anon/authenticated users.
- Remaining advisor warnings are pre-existing platform items, not introduced by this work.

### Regression project state corrected

- Dukley: revised offer `PST-OFF-2026-08-025` recognized as sent; obsolete dynamic-plan action closed; project deadline recorded as 10.10.2026; project waits for client.
- CARINVEST: Eurosteel supplier response promotes `Përgatit ofertën PRISTEEL` and project pricing stage.
- TenneT / SPIE: concrete technical-closeout action used before 21.08.2026 offer deadline.

### Human gates retained

Automation may read, classify, reconcile, calculate, compare and prepare drafts. External sends, final commercial commitments, supplier commitment, PO/contract and final financial commitments remain human-approved.

# 2026-09-05 — Finance canonical click owner follow-up

- Production verification after #389 showed that the earlier Finance stability capture listener still consumed `Partnerët → Financat` before the refreshed primary navigation owner could run.
- The early capture now hands Finance directly to `PSTPrimaryNavResilienceV1.openFinance()` when available and retains only a bounded local recovery fallback during bootstrap.
- Cache identities for both the early Finance capture and the terminal primary navigation owner were advanced together so returning browsers cannot retain the stale routing behavior.
