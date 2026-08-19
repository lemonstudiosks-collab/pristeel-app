# PPPP Active Runtime

This document is the human-readable companion to `runtime-manifest.json`.

For project continuity also read:

- `PPPP_MASTER_CONTEXT.md`
- `PPPP_DO_NOT_BREAK.md`
- `PPPP_CONTINUITY_PROTOCOL.md`
- `PPPP_CHANGELOG.md`

## The rule that matters most

**Current PPPP means the current HEAD of `main` plus the live Supabase state.**

A file existing somewhere in the repository, an old branch, a backup branch or an older commit does not describe the current application unless historical comparison is the task.

Before making a current-state claim:

1. Read `main` HEAD.
2. Read `runtime-manifest.json` from current `main`.
3. Follow the real boot chain and dynamic loaders.
4. Respect load order and wrapping/finalizer behavior.
5. Prefer manifest `FINAL_OWNER` modules over plausible older filenames.
6. Read live Supabase state for operational project/automation claims.

PPPP grew through additive safety layers. A filename may describe what a module originally did, not what owns final visible behavior today.

## Production chain

```text
GitHub main HEAD
      ↓
index.html
      ↓
pristeel-procurement.html
      ↓
application-direct scripts
      ↓
pristeel-roles.js
      ├── Home runtime owner guard
      ├── commercial live overrides
      ├── tender/current utility modules
      ├── Workspace shell cleanup
      │      └── Contact Master
      └── pristeel-project-emails.js
               ↓
         ordered runtime modules
               ↓
         late finalizers / safety layers
```

The nine local application-direct files are still recorded in `runtime-manifest.json`. `pristeel-roles.js` is both RBAC and a historical runtime loader. `pristeel-project-emails.js` is historically named but acts as the large ordered bootstrap.

## Current visible ownership

### Application shell

Foundation:

- `pristeel-ui-v2.js`

Current owners/finalizers:

- `pristeel-workspace-architecture-v1.js`
- `pristeel-ui-corrections-v2.js`
- `pristeel-redesign-finalizer-v1.js`
- `pristeel-task-source-actions-v1.js`

`pristeel-ui-v2.js` remains a required foundation because it creates the shell host used by the Workspace.

`pristeel-task-source-actions-v1.js` is the final visual shell/navigation reconciler. It keeps one Workspace sidebar, hides legacy right rail/chrome on Workspace routes, removes legacy lower-sidebar clutter and maintains the automation-first daily navigation without writing business data.

Daily navigation intent:

- Home
- Projektet
- Tenderat
- Kontaktet

Back-office tools remain available:

- Gmail
- Komerciale
- Financa
- Modulet

### Home

**Final data owner:**

- `pristeel-home-canonical-v1.js`

**Startup/final handoff owner:**

- `pristeel-home-runtime-owner-guard-v1.js`

Home Canonical is now an event/action engine, not a passive dashboard aggregator.

Current behavior:

- `Për mua tani` contains at most five concrete actions.
- `Në pritje` separates projects waiting on another party.
- Project events drive current state and next action.
- Newer confirmed events reconcile obsolete automatic tasks.
- Priority cards explain `Pse tani?`.
- Priority cards open a Project Brief with current state, sources, recent events, missing information, risks/deadlines and recommended next actions.
- Snooze/dismiss state is persisted.

Older Home visual modules may still be loaded as compatibility/classic fallback providers, but they are not the final Home data owner.

### Projects list

- `pristeel-projects-modern-v1.js`
- `pristeel-project-lifecycle-tracking-v1.js`

### Project workspace

- `pristeel-project-first-v2.js`
- `pristeel-project-first-actions-v1.js`
- `pristeel-project-first-commercial-v1.js`
- `pristeel-project-first-execution-v1.js`
- `pristeel-project-summary-command-v1.js`
- `pristeel-project-intelligence-conversation-v1.js`
- `pristeel-project-lifecycle-tracking-v1.js`
- `pristeel-project-intelligence-resilience-v1.js`

The classic project overview remains intentionally reachable as a fallback. Do not delete its providers until the fallback/merge behavior has an equivalent replacement.

### Contacts

**Daily relationship owner:**

- `pristeel-contact-master-v1.js`

Contact Master is a read-only Workspace register over:

- canonical `contacts`;
- `contact_sources` for Gmail / HubSpot / Bitrix24 identities;
- `project_contacts` for project relationships.

Gmail, HubSpot and Bitrix24 remain connected systems. The daily UI unifies their identities rather than copying them into separate visible address books.

Classic contacts remain a back-office fallback.

### Gmail / Inbox

- `pristeel-gmail-live-inbox-v2.js`
- `pristeel-gmail-live-triage-v1.js`
- `pristeel-outreach-followup-v1.js`

Linked project email is also a core event source for project-state automation.

### Commercial

Current project supplier comparison/final commercial decision view includes:

- `pristeel-project-first-commercial-v1.js`

It already contains component normalization, installation-scope safeguards and preliminary margin logic. Do not create a second comparison engine without tracing this one first.

Project-to-client-offer prefill is supported by current commercial prefill/rescue layers. They prepare data but do not silently send/finalize an offer.

### Document intelligence

- `pristeel-project-analysis.js`
- `pristeel-project-analysis-document-intelligence-v1.js`

Supabase now also stores extracted structured evidence in `project_requirements`, with OCR/review evidence kept review-gated.

### Document Center

- `pristeel-document-center-stable-v2.js`
- `pristeel-document-adjustments-v3.js`

### Finance / invoices

- `pristeel-finance-stability-v2.js`
- `pristeel-invoice-project-link-v1.js`
- `pristeel-document-currency-v1.js`
- `pristeel-invoice-original-document-v1.js`

### Tenders

- `pristeel-kek-tender-watch-v1.js`
- `pristeel-tender-business-flow-v1.js`
- `pristeel-tender-winner-contacts-v1.js`

The first filename is legacy. Current tender behavior covers KRPP Kosovo, APP Albania, TED direct opportunities and TED award-winner outreach layers.

### AI

- `pristeel-gemini-test-ui-v1.js`
- `pristeel-groq-gptoss-provider-v1.js`
- Project Intelligence resilience/conversation layers recorded in the manifest.

Provider activation and rate-limit compatibility must be traced from the current runtime before changing AI routing.

## Required legacy fallbacks

These remain because current user-accessible fallbacks still depend on them:

- `pristeel-ui-v2-polish.js` — classic Home behavior.
- `pristeel-dashboard-calm.js` — classic Home renderer captured by Workspace Architecture.
- `pristeel-project-intelligence-ui.js` — classic project overview analysis/layout behavior.
- `pristeel-project-workspace.js` — classic project folder/duplicate-project merge workflow.

Do not delete these based on naming alone.

## Deprecated runtime layers forbidden from returning

See `runtime-manifest.json` `deprecatedForbidden`, currently including:

- `pristeel-document-adjustments.js`
- `pristeel-dashboard-focus.js`
- `pristeel-dashboard-operations.js`

## CI/runtime guard

`scripts/runtime-manifest-check.mjs` validates entrypoints, loader/bootstrap integrity, module existence, dynamic-loader relationships, ownership/compatibility declarations, critical ordering and forbidden runtime returns.

A loader/bootstrap change is allowed only with deliberate manifest review.

## Supabase continuity

Cross-session state is available through:

- `public.pppp_platform_snapshot_v1()`
- `public.pppp_platform_context`
- `public.pppp_platform_changelog`
- `public.pppp_platform_protected_rules`
- `public.pppp_platform_integrations`

These are the durable technical continuity layer. Chat memory is supporting context, not the operational source of truth.

## Safe-change principle

The runtime manifest maps ownership. It does not authorize deletion.

**Trace first, preserve working behavior, change narrowly, verify, then record the change.**