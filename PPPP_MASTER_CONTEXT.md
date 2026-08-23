# PPPP MASTER CONTEXT

**Purpose:** canonical continuity document for the PRISTEEL Procurement Projects Platform (PPPP).

This file exists so a new ChatGPT/Codex/engineering session can continue the same platform without reconstructing the project from chat history or accidentally replacing working architecture.

## 1. Source of truth

For any claim about the current PPPP, use this order:

1. **GitHub `main` HEAD** for deployed application code.
2. **Supabase `PRISTEEL` live schema/data** for operational state.
3. `runtime-manifest.json` and `docs/ACTIVE_RUNTIME.md` for runtime ownership/load order.
4. This file for architecture intent, protected decisions and continuity.
5. Chat history only as supporting context, never as the sole technical source of truth.

A file existing in an old commit/branch does not make it current.

## 2. Platform purpose

PPPP is not intended to be a collection of manual modules. It is PRISTEEL's operational procurement/project system.

The intended operating loop is:

`incoming event -> identify project/contact -> classify event -> update project state -> reconcile obsolete work -> choose next best action -> prioritize -> prepare the work -> human approval where required`

The user should normally answer these questions without searching through technical modules:

- **Home:** What requires my attention now?
- **Opportunities:** Which opportunity is GO, REVIEW or NO-GO?
- **Project:** Where are we in the business lifecycle, and what is the next action?
- **System:** Where are the integrations/technical tools when an exception needs investigation?

Complexity stays under the hood. Daily UI must remain calm, action-oriented and obvious enough that the user should not need to ask “where do I click next?”.

## 3. Current runtime architecture

Read `runtime-manifest.json` before changing runtime ownership.

Key current ownership:

- **Shell foundation:** `pristeel-ui-v2.js`
- **Workspace shell:** `pristeel-workspace-architecture-v1.js`
- **Safe shell/source-shortcut reconciler:** `pristeel-task-source-actions-v1.js`
- **Late redesign finalizer:** `pristeel-redesign-finalizer-v1.js`
- **Final cross-area operating presentation/navigation:** `pristeel-operating-experience-v1.js`
- **Home data owner:** `pristeel-home-canonical-v1.js`
- **Home startup owner:** `pristeel-home-runtime-owner-guard-v1.js`
- **Projects list:** `pristeel-projects-modern-v1.js` + lifecycle tracking
- **Project workspace data/tool owners:** `pristeel-project-first-v2.js` and current Project-First extensions
- **Canonical Project Workspace workflow reconciler:** `pristeel-project-workflow-canonical-v1.js`
- **Legacy project ribbon compatibility bridge:** `pristeel-project-workflow-legacy-capture-v1.js`
- **Commercial comparison:** `pristeel-project-first-commercial-v1.js`
- **Gmail inbox:** live inbox + triage + follow-up layers in manifest
- **Opportunities/tenders:** current tender business-flow layers in manifest
- **Contact Master:** `pristeel-contact-master-v1.js`

`pristeel-operating-experience-v1.js` is dynamically loaded by `pristeel-redesign-finalizer-v1.js`. It is presentation/navigation only: no Supabase reads/writes, no business-state ownership and no outbound actions.

Do not infer authority from filenames alone. Later layers may intentionally wrap or constrain earlier ones.

## 4. Daily operating model

Primary daily business zones are:

- **Home**
- **Opportunities**
- **Projects**
- **Partners**
- **Finance**
- **System**

Each zone has a distinct visual color identity. Color is orientation, not state truth: business state still comes from canonical data owners.

Technical/back-office surfaces remain connected but are not primary daily navigation:

- Gmail
- Commercial intake/review tools
- Automation Health
- other module/debug/exception surfaces

These are grouped under **System** or opened directly from a concrete Home/project action.

The `+ Krijo` path remains for exceptional/manual cases. Normal work should increasingly be created from events and next actions.

## 5. Home / action engine

`pristeel-home-canonical-v1.js` remains the sole final Home data owner.

Current model:

- Action surface is presented as **Duhet veprimi yt**.
- Maximum five concrete actions.
- A priority must explain **Pse tani?** and state a concrete next action.
- Waiting on another party is separated into **Në pritje** and is not treated as user work until follow-up becomes due.
- The whole priority card can open **Project Brief**.
- Project Brief exposes current state, recent events, what exists, what is missing, deadlines/risks, sources and recommended actions.
- Snooze and dismiss remain persisted by Canonical Home.
- `Kryer` is reserved for work PPPP cannot verify automatically.
- Newer confirmed events supersede obsolete automatic tasks.

Operating Experience may make **Vepro** route directly to the existing decision surface when the target is safely known, including:

- Communication for client/email work;
- RFQ for procurement preparation;
- supplier comparison for procurement decisions;
- client offer for review/finalization;
- Execution for execution-readiness work;
- Commercial intake review for candidate review.

Direct routing is navigation only. It does not approve, save, send or create commitments.

Important event examples:

- Supplier quote arrives -> project becomes actionable -> **Përgatit ofertën PRISTEEL**.
- Our offer is sent -> stale preparation tasks close -> project becomes **Në pritje të klientit**.
- Client responds after our offer -> **Shqyrto përgjigjen e klientit**.
- Tender/offer deadline with technical work open -> concrete technical action is promoted.
- Execution/won state -> next action points to Execution rather than restarting procurement.

## 6. Opportunities

Underlying source/business owners cover:

- KRPP Kosovo;
- APP Albania;
- TED direct opportunities;
- TED awarded-contract / winner intelligence.

Current user-facing decision vocabulary is:

- **GO · Krijo projekt**
- **REVIEW**
- **NO-GO**

This vocabulary is presentation only. Existing tender review/status/project-promotion logic remains authoritative and human-gated.

Raw discovery/candidate queues are not promoted into daily UI merely because they exist. Technical candidate queues stay under the hood until they become an actionable business decision.

## 7. Project Workspace

Project-First remains the data/tool workspace and `pristeel-project-workflow-canonical-v1.js` remains the canonical workflow reconciler.

The user-facing business phases are now:

`Përgatitja -> Prokurimi -> Komerciale -> Ekzekutimi -> Financa`

Utilities remain separately accessible:

`Skedarët | Komunikimi`

The existing detailed workflow remains reused under those phases:

`BOM -> RFQ -> Ofertat e furnitorëve -> Krahasimi i ofertave -> Çmimi i shitjes -> Oferta për klientin`

Important project-workflow rules:

- Every detailed stage remains independently clickable.
- A stage status describes what data/state exists; it must not block navigation.
- Empty stages render an explicit explanation and next action instead of a blank page.
- Existing BOM, RFQ, normalized comparison, pricing calculator and client-offer engines are reused rather than duplicated.
- Procurement and Commercial are visually distinct, but not duplicated as separate engines.
- Where an older editor remains necessary, canonical project context is preserved through the existing bridge.
- The old horizontal ribbon is compatibility-only and is captured back into the canonical flow.
- `Hapi i radhës` must respect lifecycle/operational state, not just procurement completeness.
- `wait_for_client` must explicitly show that no user action is required now.
- Won/execution projects must point to Execution and must not regress to RFQ/procurement suggestions.
- Final sell price, client offer, supplier commitment and external send remain human-gated.
- Canonical Workflow and Operating Experience perform no business-data writes.

## 8. Project event automation

Supabase contains event/reactivity logic around linked `project_emails`, RFQs, offers, project decisions, document intake and execution readiness.

Critical behavior includes:

- supplier reply/quote recognition against project RFQ history;
- supplier email rate/scope reactivity where safely extractable;
- outgoing PRISTEEL offer recognition;
- project stage updates only where the current stage can safely move forward;
- stale-task reconciliation after a superseding event;
- current project decision snapshot generation;
- execution-release readiness checks;
- commercial-intake candidate review queues;
- local semantic orchestration;
- local OCR orchestration.

Relevant functions/triggers must be inspected live before modification. Use `public.pppp_platform_snapshot_v1()` for continuity and query trigger definitions when changing event logic.

## 9. Document intelligence -> structured requirements

Analyzed project attachments feed Project Intelligence and populate `public.project_requirements`.

Structured requirement categories include, when present in extracted evidence:

- standards;
- execution classes;
- steel grades;
- certificates;
- surface requirements;
- project/drawing references;
- dynamic plan;
- selected commercial/deadline signals.

OCR-derived or conflict/review evidence remains `review`, not silently upgraded to confirmed fact.

`public.pppp_project_requirements_summary_v1` is the read model for project requirement summaries.

Local OCR is a backend capability. `local_ocr_jobs` and `local_ocr_workers` are not daily navigation surfaces.

## 10. Commercial automation

Do not build a second supplier comparison engine without first reading `pristeel-project-first-commercial-v1.js`.

Existing behavior includes:

- normalized supplier component comparison;
- installation scope warnings;
- landed/same-scope comparison logic;
- preliminary margin checks;
- human gate where supplier scopes are not comparable;
- project-to-offer prefill/rescue for carrying supplier cost context into a new PRISTEEL offer draft.

Automation may prepare the draft, but it must not silently decide the sell price, select a committing supplier or send the offer.

The technical Commercial intake/review surface may be opened directly from a Home action when a candidate needs human review, but it remains a back-office decision tool rather than a primary navigation destination.

## 11. Contact Master and CRM identity

PPPP keeps Gmail, HubSpot and Bitrix24 connected. They are sources/capabilities, not three separate people databases from the user's perspective.

Canonical relationship model:

- `contacts` = PPPP contact identity;
- `contact_sources` = source identities such as HubSpot, Bitrix24 and Gmail;
- `project_contacts` = relationship of the person/email to individual projects;
- `pppp_contact_master_v1` = unified read model used by the Workspace Contact Master.

Incoming linked Gmail messages update Contact Master automatically. The same email should resolve to an existing canonical contact before a new person is created.

Do not disconnect HubSpot or Bitrix24 as part of simplification. Simplification means fewer daily navigation steps, not loss of data sources.

## 12. Finance

Finance is now a first-class daily business zone. Existing finance/invoice engines and gates remain unchanged.

The UI change must not weaken invoice/payment evidence routing, project linkage, currency handling or final financial approval boundaries.

## 13. Human approval boundaries

PPPP may automatically:

- read and link information;
- classify events;
- update non-contractual operational state;
- extract structured facts with trust markers;
- calculate and compare;
- close obsolete automatic tasks;
- generate next actions;
- prepare drafts;
- prepare follow-ups;
- route the user directly to an existing decision surface.

Human approval remains required for:

- sending external email;
- final client offer;
- sell-price/margin commitment;
- supplier selection where it creates commitment;
- PO / contract;
- final invoice/financial commitment;
- terminal commercial decisions such as won/lost where not already explicitly confirmed.

## 14. Connected systems

Keep connected and treat as systems of record/capabilities:

- Gmail: actual communication
- Google Drive: project files, one permanent folder per project
- HubSpot: CRM source
- Bitrix24: CRM source
- TED: EU opportunity source
- KRPP: Kosovo tender source
- APP Albania: Albania tender source

Integration policy is also recorded in `public.pppp_platform_integrations`.

## 15. Current regression projects

These projects are the minimum regression set for event automation and workflow continuity.

### Dukley Seafront Restaurant, Budva

- Project id: `6e0d2d19-3a51-4079-882f-b73f81cbe95e`
- Commercial phase: client offer / waiting for client
- Latest offer: `PST-OFF-2026-08-025`
- Execution commitment recorded: **10.10.2026**
- Old `Aprovo planin dinamik` work is obsolete and must not return while the newer sent offer remains current.
- UI must show waiting rather than a false procurement action.

### ITALIAN STYLE - Hala - CARINVEST

- Project id: `655c4ce3-9845-4c15-8ecc-0306d9f1aa50`
- Eurosteel supplier response is linked.
- Current decision is client-offer review/send while preserving supplier cost basis and review flags.
- Selling price/final offer remain human-approved.

### TenneT / SPIE

- Project id: `c937aea1-af5e-4807-ae1e-e36864e46794`
- Recorded offer deadline: **21.08.2026**
- Technical-closeout logic must remain concrete and source-grounded rather than a vague generic task.

### STACON - Lagerhalle Hamburg

- Project id: `38bdf772-d73e-47b2-9d0f-6020e105aa62`
- Won / execution project.
- UI and Home routing must keep it in execution and must not fall back to offer/procurement actions.

Any future Home/event-engine or Project Workspace change should be checked against these states as appropriate.

## 16. Continuity registry

Supabase continuity objects:

- `pppp_platform_context`
- `pppp_platform_changelog`
- `pppp_platform_protected_rules`
- `pppp_platform_integrations`
- `pppp_platform_snapshot_v1()`

These make cross-chat continuity independent of one conversation window.

## 17. Current protected principles

At minimum preserve these live protected rules:

- `main_is_current`
- `no_rebuild_from_zero`
- `preserve_gmail_matching`
- `preserve_drive_identity`
- `no_duplicate_entities`
- `human_gate_outbound`
- `no_sent_offer_overwrite`
- `event_supersedes_old_tasks`
- `automation_prepares_not_hides`
- `legacy_not_dead_by_name`
- `manufacturer_terms_flow_down`
- `project_improvements_must_be_platform_level`

The live table `public.pppp_platform_protected_rules` is authoritative for exact current wording.

## 18. Latest operating-experience rollout

PR #233 introduced the current simplified operating experience and was merged to `main` as commit `48c264cab7116ee36f7c485231510e6529891ba6` after the full PRISTEEL test suite, runtime-manifest guard, Pages artifact audit, production Pages build and Local Semantic AI checks all passed.

The rollout intentionally changed presentation/navigation, not backend ownership. Live Supabase automation, Gmail matching, Drive identity, supplier/commercial engines and human gates remain in place.
