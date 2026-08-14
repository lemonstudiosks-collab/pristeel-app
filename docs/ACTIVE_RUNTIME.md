# PPPP Active Runtime

This document is the human-readable companion to `runtime-manifest.json`.

## The rule that matters most

**Current PPPP means the current HEAD of `main`.**

A file existing somewhere in the repository, an old branch, a closed PR, a backup branch, or an older commit does **not** describe the current application unless we are explicitly doing historical comparison.

Before making a current-state claim about PPPP:

1. Read `refs/heads/main` and record the exact commit SHA.
2. Read `runtime-manifest.json` from that exact commit.
3. Follow the manifest's actual boot chain from the application HTML through its bootstrap loader into the ordered bootstrap.
4. Respect load order. A module loaded later can wrap, replace, hide, decorate or constrain an earlier module.
5. For visible UI questions, prefer the manifest's `FINAL_OWNER` modules over older modules with plausible filenames.
6. Do not use backup/feature/verification branches unless the task explicitly asks for them.

This rule exists because PPPP grew through additive safety layers. A filename may describe what a module originally did, not what owns the final visible behavior today.

## Traced production chain

```text
GitHub main HEAD
      ↓
index.html
      ↓
pristeel-procurement.html
      ↓
9 local scripts loaded directly by the HTML
      ↓
pristeel-roles.js
      ├── dynamically loads pristeel-project-emails.js
      │         ↓
      │   137 ordered runtime modules
      │         ↓
      │   late finalizers / safety layers
      │
      ├── dynamically loads pristeel-invoice-original-document-v1.js
      └── dynamically loads pristeel-tender-business-flow-v1.js

pristeel-gemini-test-ui-v1.js
      └── dynamically loads pristeel-groq-gptoss-provider-v1.js
```

The nine local files loaded directly by `pristeel-procurement.html`, in current order, are:

1. `pristeel-kpi.js`
2. `pristeel-search.js`
3. `pristeel-drive.js`
4. `pristeel-roles.js`
5. `pristeel-export.js`
6. `pristeel-offer-editor.js`
7. `pristeel-finance.js`
8. `pristeel-contracts.js`
9. `pristeel-outreach.js`

`index.html` is only the Pages entry/redirect. `pristeel-procurement.html` is the application document. `pristeel-roles.js` is both a real RBAC module and, historically, the hidden loader for the additive PPPP runtime. `pristeel-project-emails.js` is historically named but currently acts as the large ordered module bootstrap.

## Status meanings

- **BASE_DIRECT**: loaded directly by the application HTML before the additive runtime bootstrap.
- **FINAL_OWNER**: a verified current owner/finalizer for a visible application area.
- **COMPATIBILITY**: a bridge, adapter, wrapper or migration layer still required by current code.
- **LOADED_LEGACY_CANDIDATE**: still loaded in production, but likely superseded for visible behavior. Investigation candidate, not deletion candidate.
- **LEGACY_FALLBACK_REQUIRED**: older layer intentionally retained because a user-accessible current fallback still depends on it. It is not a deletion candidate while that fallback exists.
- **DYNAMIC_CURRENT**: a current module loaded dynamically by another runtime file.
- **ACTIVE_PROVIDER**: conditionally active runtime provider outside the main bootstrap.
- **LOADED_CURRENT_UNCLASSIFIED**: safe default for bootstrap modules not yet explicitly classified.

## Current visible ownership map

### Application shell

- `pristeel-workspace-architecture-v1.js`
- `pristeel-ui-corrections-v2.js`
- `pristeel-redesign-finalizer-v1.js`

### Home

- `pristeel-home-command-center-v2.js`
- `pristeel-home-stability-v2.js`
- `pristeel-home-visual-cleanup-v1.js`
- `pristeel-redesign-finalizer-v1.js`

The current Workspace also exposes **Apps → Pamja klasike**. That route intentionally keeps two older Home layers alive:

- `pristeel-dashboard-calm.js` supplies the `renderHome` implementation captured by Workspace Architecture as the classic Home renderer.
- `pristeel-ui-v2-polish.js` still reacts when legacy `page-home` becomes active and performs the classic dashboard's opportunity triage, KPI/inbox cleanup and row limiting.

These are classified as **LEGACY_FALLBACK_REQUIRED**, not as removal candidates. Retiring them would require first removing or replacing the user-accessible classic fallback.

### Projects

Projects list:
- `pristeel-projects-modern-v1.js`

Current project workspace:
- `pristeel-project-first-v2.js`
- `pristeel-project-first-actions-v1.js`
- `pristeel-project-first-commercial-v1.js`
- `pristeel-project-first-execution-v1.js`

The current Workspace replaces the normal `openOverview()` route with the modern 360 project workspace, but deliberately captures the previous `openOverview` implementation and exposes it through the current **“Pamja e vjetër”** project action.

`pristeel-project-intelligence-ui.js` is therefore also **LEGACY_FALLBACK_REQUIRED**. In that old project overview, `pristeel-project-analysis.js` injects the analysis panel and `pristeel-project-intelligence-ui.js` repositions it to the top of the modal, widens the overview, manages scrolling, watches for legacy overview openings and provides the analysis-load fallback. Removing it while **Pamja e vjetër** remains accessible would change that fallback UI.

`pristeel-project-workspace.js` is still loaded but remains a review candidate; its presence alone does not mean it owns the current project UI.

### Gmail / Inbox

- `pristeel-gmail-live-inbox-v2.js`
- `pristeel-gmail-live-triage-v1.js`
- `pristeel-outreach-followup-v1.js`

### Document Center

- `pristeel-document-center-stable-v2.js`
- `pristeel-document-adjustments-v3.js`

### Finance / invoices

- `pristeel-finance-stability-v2.js`
- `pristeel-invoice-project-link-v1.js`
- `pristeel-document-currency-v1.js`
- `pristeel-invoice-original-document-v1.js` (dynamically loaded by `pristeel-roles.js`)

### Tenders

- `pristeel-kek-tender-watch-v1.js`
- `pristeel-tender-business-flow-v1.js` (dynamically loaded by `pristeel-roles.js`)

The first filename is legacy. The current tender layer covers Kosovo/KRPP and Albania/APP direct opportunities plus EU/TED awarded-contract winner outreach.

### AI

- `pristeel-gemini-test-ui-v1.js`
- `pristeel-groq-gptoss-provider-v1.js` (dynamically loaded)

GPT-OSS routing becomes active after successful explicit activation. `pristeel-groq-rate-limit.js` is now a compatibility-layer concern, not a reliable description of the final provider architecture.

## Compatibility layers that must not be casually removed

The manifest records current bridge/compatibility files including project schema compatibility, AI routing, Gmail auth bridging, offer draft-editor bridging, commercial prefill rescue and workspace release compatibility.

Awkward naming is technical debt, not evidence that a file is dead.

## Legacy fallbacks required by current UI

- `pristeel-ui-v2-polish.js` — classic Home triage/polish.
- `pristeel-dashboard-calm.js` — classic Home renderer captured by Workspace Architecture.
- `pristeel-project-intelligence-ui.js` — classic project overview layout/analysis behavior used by **Pamja e vjetër**.

These have been traced and deliberately removed from the cleanup-candidate list. They remain loaded because current Workspace actions still expose their fallback surfaces.

## Legacy-review candidates still loaded

- `pristeel-project-workspace.js`
- `pristeel-ui-v2.js`

For each candidate, removal requires tracing globals/events/functions, tracing callers, running the full smoke suite without it, verifying the real browser UI, and only then removing it from the bootstrap.

## Retired runtime layers

These files remain in repository history/reference but are forbidden from returning to the active runtime unless deliberately re-reviewed:

- `pristeel-document-adjustments.js` — superseded by `pristeel-document-adjustments-v3.js`.
- `pristeel-dashboard-focus.js` — its focus UI was destroyed by the later legacy Home layers and its polling loop had no surviving UI owner.
- `pristeel-dashboard-operations.js` — its Home renderer was fully superseded by `pristeel-dashboard-calm`; its `page-all-modules` surface had no surviving trigger, while the current Workspace provides the authoritative Apps surface.

The runtime manifest's `deprecatedForbidden` list makes CI fail if one of these modules is accidentally re-added to the production bootstrap.

## CI guard

`scripts/runtime-manifest-check.mjs` validates that:

- the production entrypoint files exist;
- `index.html` still points to the application document;
- expected local application scripts are loaded directly and in recorded order;
- the audited `pristeel-roles.js` loader has not silently changed;
- the loader still loads the ordered bootstrap;
- the audited bootstrap blob has not silently changed;
- bootstrap entries have no duplicates and every module exists;
- all manifest final owners, compatibility layers, required legacy fallbacks and review candidates remain valid;
- critical load-order constraints remain true;
- dynamic runtime modules still have their loader and target file;
- deprecated/forbidden modules cannot silently return.

A loader/bootstrap change is allowed, but it must be accompanied by a deliberate manifest review/update.

## What this manifest does not do

It does **not** claim the architecture is already clean. It prevents us from confusing repository history with current runtime while we clean it safely.

It also does not authorize deletion. The manifest is the map before the broom.
