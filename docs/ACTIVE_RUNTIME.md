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
5. Prefer manifest `FINAL_OWNER` / `DYNAMIC_CURRENT` relationships over plausible older filenames.
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
         pristeel-redesign-finalizer-v1.js
               ↓ dynamic
         pristeel-operating-experience-v1.js
```

The nine local application-direct files remain recorded in `runtime-manifest.json`. `pristeel-roles.js` is both RBAC and a historical runtime loader. `pristeel-project-emails.js` is historically named but acts as the large ordered bootstrap.

## Current visible ownership

### Application shell and daily operating experience

Foundation:

- `pristeel-ui-v2.js`

Shell/current reconciler layers:

- `pristeel-workspace-architecture-v1.js`
- `pristeel-ui-corrections-v2.js`
- `pristeel-task-source-actions-v1.js`
- `pristeel-redesign-finalizer-v1.js`
- `pristeel-ui-runtime-stability-v1.js` (bounded route-settling observer; never a page snapshot or router owner)

**Final cross-area presentation/navigation layer:**

- `pristeel-operating-experience-v1.js`

`pristeel-task-source-actions-v1.js` remains the safe shell/source-shortcut reconciler. `pristeel-operating-experience-v1.js` is loaded dynamically by the redesign finalizer and applies only bounded presentation/navigation changes. It performs no Supabase reads/writes and no outbound actions.

`pristeel-ui-runtime-stability-v1.js` does not intercept or replay navigation. It observes protected route clicks, disables layout animation during the short settling window, and releases automatically when the destination has stable content. It must not clone a page, duplicate ids, or install another route owner.

Primary daily business zones are now:

- **Home**
- **Opportunities**
- **Projects**
- **Partners**
- **Finance**
- **System**

Each zone has a distinct color identity so the user can orient by both text and visual context. Technical/back-office surfaces such as Gmail, Commercial intake and automation health are kept under **System** instead of competing with the daily business path.

### Mobile / tablet presentation

- `pristeel-mobile-responsive-v1.js` is the bounded mobile shell for narrow screens.
- It is presentation/navigation only: no Supabase reads/writes, no polling, no outbound actions and no second business engine.
- At <=640px it replaces the desktop sidebar with a fixed bottom navigation that delegates to the existing canonical PPPP routes: Ballina, Mundësitë, Projektet, Partnerët, Financat and Sistemi.
- Existing page owners keep their own responsive rules; the mobile shell only normalizes the global shell, safe-area spacing, touch navigation and constrained modal/table behavior.
- The linked `pristeel.webmanifest` prepares installable-app metadata. Service-worker caching is intentionally not introduced in this phase so mobile cannot pin stale PPPP runtime code.

### Home

**Final data owner:**

- `pristeel-home-canonical-v1.js`

**Startup/final handoff owner:**

- `pristeel-home-runtime-owner-guard-v1.js`

Home Canonical remains the sole business-state/data owner. Operating Experience may decorate the surface and route an existing action button, but it does not create or infer Home business state.

Current behavior:

- `pristeel-home-morning-command-center-v1.js` owns the final visible Home composition while Canonical Home remains the business-state/data owner.
- Home exposes at most three priority rows. Repeated equivalent actions are grouped and route to the canonical Projects area rather than opening only one hidden item.
- The lower layout prioritizes active projects and uses Opportunities, Material Trade and the compact assistant as supporting modules.
- If the canonical project snapshot is briefly empty, Home may reuse the already-loaded workspace project cache; it performs no extra database request.
- PRISTEEL Daily is mounted in the Home header and `Pyet PPPP` expands only on request while preserving its existing runtime shell.
- `Në pritje` separates projects waiting on another party.
- Project events drive current state and next action.
- Newer confirmed events reconcile obsolete automatic tasks.
- Priority cards explain `Pse tani?` and can open Project Brief.
- Where a safe existing target is known, **Vepro** routes directly to the decision surface, e.g. Communication, RFQ, supplier comparison, client offer, Execution or Commercial intake review.
- Direct routing changes navigation only. It does not approve, save, send or commit on behalf of the user.
- Snooze/dismiss state remains persisted by Canonical Home.

### Opportunities

Underlying owners remain:

- `pristeel-kek-tender-watch-v1.js`
- `pristeel-tender-business-flow-v1.js`
- `pristeel-tender-winner-contacts-v1.js`

The first filename is legacy. Current behavior covers KRPP Kosovo, APP Albania, TED direct opportunities and TED award-winner outreach.

The visible Opportunity Desk is owned by `pristeel-opportunities-filter-polish-v1.js`. Selecting a company is an in-place interaction: it must preserve the existing Desk, filter column, 60-row center column, project-row nodes, right-column container and contacted-company list while updating only selection state and the detail card. `pristeel-project-centric-workflow-v1.js` coalesces route repairs into one animation-frame update; delayed multi-render bursts are not part of the active contract.

External procurement discovery has one scheduled morning session per source. Cloud collectors must pass the service-only `pppp_claim_external_source_daily_access_v1` gate before contacting TED, KRPP, APP Albania or the multilateral/WB source group. Duplicate/manual runs after the first claim skip external access. The authenticated KRPP Mac worker runs once at 06:00 local time and exits; continuous polling and `KeepAlive` are forbidden.

Operating Experience adds the final decision vocabulary:

- **GO · Krijo projekt**
- **REVIEW**
- **NO-GO**

This is presentation only. Existing review/project-promotion/status gates remain authoritative.

### Projects list

- `pristeel-projects-modern-v1.js`
- `pristeel-project-lifecycle-tracking-v1.js`

### Project workspace

Core data/tool owners remain:

- `pristeel-project-first-v2.js`
- `pristeel-project-first-actions-v1.js`
- `pristeel-project-first-commercial-v1.js`
- `pristeel-project-first-execution-v1.js`
- `pristeel-project-summary-command-v1.js`
- `pristeel-project-intelligence-conversation-v1.js`
- `pristeel-project-lifecycle-tracking-v1.js`
- `pristeel-project-intelligence-resilience-v1.js`

**Canonical workflow reconciler:**

- `pristeel-project-workflow-canonical-v1.js`

**Final Project workspace presentation owner:**

- `pristeel-project-workbench-v2.js` (compatibility filename; exports Workbench V3)

**Legacy ribbon compatibility bridge:**

- `pristeel-project-workflow-legacy-capture-v1.js`

The user-facing project flow now uses the explicit PPPP V2 lane stored in `projects.workflow_type` and the read-only `public.pppp_project_workflow_state_v1` evidence model. Three entry lanes converge on one shared supplier/commercial/post-award flow:

- `eu_award_sales`: Opportunity → Kontaktimi → Client RFQ
- `self_tender`: Tenderi → Kërkesat
- `steel_trading`: Client RFQ
- shared: Furnitorët → Krahasimi → Çmimi / dosja → Oferta / aplikimi → Won / Lost
- post-award: Customer PO → Supplier PO → Procurement → Transport → Delivery → Invoice → Payment → Closed

Projects without a V2 classification retain the established compact five-phase fallback:

`Përgatitja → Prokurimi → Komerciale → Ekzekutimi → Financa`

Utilities remain separately accessible:

`Skedarët | Komunikimi`

The existing detailed flow is still reused under those phases:

`BOM → RFQ → Ofertat e furnitorëve → Krahasimi i ofertave → Çmimi i shitjes → Oferta për klientin`

Important behavior:

- Every detailed stage remains independently clickable.
- Stage status describes available data/state and does not block navigation.
- Procurement and Commercial are visually distinct, but they still reuse the same existing engines.
- `Hapi i radhës` is lifecycle-aware. Execution/won projects point to Execution; technical review points to preparation; pricing/client-offer states point to their commercial decision; `wait_for_client` explicitly shows that no user action is required now.
- Existing normalized supplier comparison, BOM, RFQ, calculator and client-offer engines are reused, not duplicated.
- The old horizontal workflow ribbon remains captured back into the canonical project flow.
- Final offer, sell price, supplier commitment and outbound communication remain human-gated.
- The V2 workflow state is read-only and derives its stage from existing project, RFQ, supplier-decision, offer and invoice evidence. It does not introduce a second business-data writer.
- Neither Canonical Workflow, Workbench V3 nor Operating Experience performs business-data writes.

The classic project overview remains intentionally reachable as a fallback. Do not delete its providers until the fallback/merge behavior has an equivalent replacement.

### Partners / Contact Master

**Daily relationship owner:**

- `pristeel-contact-master-v1.js`

Contact Master is the read-only Workspace register over canonical `contacts`, `contact_sources` and `project_contacts`. Gmail, HubSpot and Bitrix24 remain connected systems and classic contacts remain a fallback.

### Gmail / Inbox

- `pristeel-gmail-live-inbox-v2.js`
- `pristeel-gmail-live-triage-v1.js`
- `pristeel-outreach-followup-v1.js`

Linked project email is also a core event source for project-state automation. Gmail is no longer a top-level daily business zone; it remains available through System and project Communication.

### Commercial

Current supplier comparison/final commercial decision logic includes:

- `pristeel-project-first-commercial-v1.js`

It contains component normalization, installation-scope safeguards and preliminary margin logic. Project-to-client-offer prefill/rescue layers may prepare data but do not silently send/finalize an offer. The technical Commercial intake/review surface remains available through System or direct Home routing where appropriate.

### Document intelligence

- `pristeel-project-analysis.js`
- `pristeel-project-analysis-document-intelligence-v1.js`

Supabase also stores extracted structured evidence in `project_requirements`, with OCR/review evidence kept review-gated.

### Document Center

- `pristeel-document-center-stable-v2.js`
- `pristeel-document-adjustments-v3.js`

### Finance / invoices

- `pristeel-finance-stability-v2.js`
- `pristeel-invoice-project-link-v1.js`
- `pristeel-document-currency-v1.js`
- `pristeel-invoice-original-document-v1.js`

Finance is now a first-class daily business zone; underlying financial gates are unchanged.

### AI

- `pristeel-gemini-test-ui-v1.js`
- `pristeel-groq-gptoss-provider-v1.js`
- Project Intelligence resilience/conversation layers recorded in the manifest.

Provider activation and rate-limit compatibility must be traced from the current runtime before changing AI routing.

## Required legacy fallbacks

These remain because current user-accessible fallbacks still depend on them:

- `pristeel-ui-v2-polish.js`
- `pristeel-dashboard-calm.js`
- `pristeel-project-intelligence-ui.js`
- `pristeel-project-workspace.js`

Do not delete these based on naming alone.

## Deprecated runtime layers forbidden from returning

See `runtime-manifest.json` `deprecatedForbidden`, including:

- `pristeel-document-adjustments.js`
- `pristeel-dashboard-focus.js`
- `pristeel-dashboard-operations.js`

## CI/runtime guard

`scripts/runtime-manifest-check.mjs` validates entrypoints, loader/bootstrap integrity, module existence, dynamic-loader relationships, ownership/compatibility declarations, critical ordering and forbidden runtime returns.

A loader/bootstrap change is allowed only with deliberate manifest review.

The Operating Experience rollout is protected by `tests/operating-experience-smoke.js` plus the full PRISTEEL suite. The rollout was merged as PR #233 after PRISTEEL Tests, runtime-manifest guard, Pages artifact audit, production Pages build and Local Semantic AI all passed.

## Supabase continuity

Cross-session state is available through:

- `public.pppp_platform_snapshot_v1()`
- `public.pppp_platform_context`
- `public.pppp_platform_changelog`
- `public.pppp_platform_protected_rules`
- `public.pppp_platform_integrations`

The operating-experience layer does not replace Supabase automation. Cron/event engines, semantic jobs, OCR workers and human approval boundaries remain under the existing backend owners.
