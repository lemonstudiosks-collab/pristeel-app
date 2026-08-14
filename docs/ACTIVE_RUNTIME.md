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

The current production chain at the audited baseline is:

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
      │   138 ordered runtime modules
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

This hidden `pristeel-roles.js → pristeel-project-emails.js` relationship is exactly why the runtime manifest exists. The first draft of this audit assumed the HTML loaded the bootstrap directly; the new guard rejected that assumption and the chain was corrected from the production source before merge.

## Status meanings

- **BASE_DIRECT**: loaded directly by the application HTML. It may be foundational without owning the final visible UI.
- **FINAL_OWNER**: a verified current owner/finalizer for a visible application area. It does not mean it is the only file involved.
- **COMPATIBILITY**: a bridge, adapter, wrapper or migration layer still required by current code. Do not infer visible UI ownership from the filename.
- **LOADED_LEGACY_CANDIDATE**: still loaded in production, but likely superseded for visible behavior. These are investigation candidates, not deletion candidates.
- **DYNAMIC_CURRENT**: a current production module loaded dynamically by another runtime file rather than by the large ordered bootstrap.
- **ACTIVE_PROVIDER**: conditionally active runtime provider outside the main bootstrap.
- **LOADED_CURRENT_UNCLASSIFIED**: the safe default for every bootstrap module not yet explicitly classified. If it is loaded, we treat it as required until proven otherwise.

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

### Projects

Projects list:

- `pristeel-projects-modern-v1.js`

Current project workspace:

- `pristeel-project-first-v2.js`
- `pristeel-project-first-actions-v1.js`
- `pristeel-project-first-commercial-v1.js`
- `pristeel-project-first-execution-v1.js`

This distinction is important. Files such as `pristeel-project-intelligence-ui.js` and `pristeel-project-workspace.js` still exist and are still loaded, but they are **not** sufficient evidence that their older visible UI is what the user sees today.

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

The GPT-OSS provider module is loaded by the Gemini settings/test layer. GPT-OSS routing becomes active after successful explicit activation. The older `pristeel-groq-rate-limit.js` filename is now a compatibility-layer concern, not a reliable description of the final provider architecture.

## Compatibility layers that must not be casually removed

The manifest explicitly records current bridge/compatibility files including:

- project schema compatibility
- AI compatibility routing
- Gmail auth bridging
- offer draft-editor bridging
- commercial prefill rescue
- workspace release compatibility

Their awkward names are technical debt, but awkward naming is not evidence that a file is dead.

## Legacy-review candidates still loaded

The following are deliberately marked for future tracing, not deletion:

- `pristeel-project-intelligence-ui.js`
- `pristeel-project-workspace.js`
- `pristeel-ui-v2.js`
- `pristeel-ui-v2-polish.js`
- `pristeel-dashboard-operations.js`
- `pristeel-dashboard-calm.js`

For each candidate, removal requires all of the following:

1. trace globals/events/functions it exposes;
2. trace all callers;
3. run the full smoke suite without it;
4. verify the real browser UI;
5. only then remove it from the bootstrap.

## Retired runtime layers

These files remain in repository history/reference but are forbidden from returning to the active runtime unless deliberately re-reviewed:

- `pristeel-document-adjustments.js` — superseded by `pristeel-document-adjustments-v3.js`.
- `pristeel-dashboard-focus.js` — its focus tabs/style were removed by the later `pristeel-dashboard-operations.js` shell, which replaced `page-home` markup; the later `pristeel-dashboard-calm.js` then became the classic Home renderer captured by Workspace Architecture.

The runtime manifest's `deprecatedForbidden` list makes CI fail if one of these modules is accidentally re-added to the production bootstrap.

## CI guard

`scripts/runtime-manifest-check.mjs` validates that:

- the production entrypoint files exist;
- `index.html` still points to the application document;
- the expected local application scripts are still loaded directly and in the recorded order;
- the audited `pristeel-roles.js` loader Git blob has not silently changed;
- the loader still loads the ordered bootstrap;
- the audited bootstrap Git blob has not silently changed;
- bootstrap module entries have no duplicates;
- every bootstrap module exists;
- all manifest final owners/compatibility layers/review candidates still exist in the expected runtime;
- critical bootstrap load-order constraints remain true;
- known dynamically loaded runtime modules still have their loader and target file;
- deprecated/forbidden modules cannot silently return to the current runtime.

A loader/bootstrap change is allowed, but it must be accompanied by a deliberate manifest review/update. That is the point of the guard.

## What this manifest does not do

It does **not** claim the architecture is already clean. It prevents us from confusing repository history with current runtime while we clean it safely.

It also does not authorize deletion. The manifest is the map before the broom.
