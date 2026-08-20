# PPPP CHANGELOG

This file records material architecture/automation changes. It is not a substitute for Git history. It exists to make project continuity readable across long ChatGPT/engineering sessions.

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
- New SECURITY DEFININER trigger/helper functions have `search_path` fixed and are not executable by anon/authenticated users.
- Remaining advisor warnings are pre-existing platform items, not introduced by this work.

### Regression project state corrected

- Dukley: revised offer `PST-OFF-2026-08-025` recognized as sent; obsolete dynamic-plan action closed; project deadline recorded as 10.10.2026; project waits for client.
- CARINVEST: Eurosteel supplier response promotes `Përgatit ofertën PRISTEEL` and project pricing stage.
- TenneT / SPIE: concrete technical-closeout action used before 21.08.2026 offer deadline.

### Human gates retained

Automation may read, classify, reconcile, calculate, compare and prepare drafts. External sends, final commercial commitments, supplier commitment, PO/contract and final financial commitments remain human-approved.