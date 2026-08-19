# PPPP CHANGELOG

This file records material architecture/automation changes. It is not a substitute for Git history. It exists to make project continuity readable across long ChatGPT/engineering sessions.

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

### Structured project requirements

- Added `project_requirements` and `pppp_project_requirements_summary_v1`.
- Analyzed attachments now convert supported extracted evidence into structured standards, execution classes, steel grades, certificates, surface requirements, dynamic-plan and selected commercial/deadline signals.
- OCR/conflict evidence remains review-gated.
- Historical analyzed-document backfill produced 482 structured requirement rows.
- Migrations: `pppp_structured_project_requirements_v1`, `pppp_structured_requirements_project_id_cast_v1`.

### Regression project state corrected

- Dukley: revised offer `PST-OFF-2026-08-025` recognized as sent; obsolete dynamic-plan action closed; project deadline recorded as 10.10.2026; project waits for client.
- CARINVEST: Eurosteel supplier response promotes `Përgatit ofertën PRISTEEL` and project pricing stage.
- TenneT / SPIE: concrete technical-closeout action used before 21.08.2026 offer deadline.

### Human gates retained

Automation may read, classify, reconcile, calculate, compare and prepare drafts. External sends, final commercial commitments, supplier commitment, PO/contract and final financial commitments remain human-approved.