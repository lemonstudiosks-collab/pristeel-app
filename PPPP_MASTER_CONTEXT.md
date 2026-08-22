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

The user should normally answer three questions without searching through modules:

- **Home:** What requires my attention now?
- **Project Brief:** What is happening, what is missing, why now, and what should I do?
- **Project Workspace:** Give me the sources and tools to execute the work.

Complexity stays under the hood. Daily UI should remain calm and action-oriented.

## 3. Current runtime architecture

Read `runtime-manifest.json` before changing runtime ownership.

Key current ownership:

- **Shell foundation:** `pristeel-ui-v2.js`
- **Workspace shell:** `pristeel-workspace-architecture-v1.js`
- **Final shell cleanup/navigation:** `pristeel-task-source-actions-v1.js`
- **Home data owner:** `pristeel-home-canonical-v1.js`
- **Home startup owner:** `pristeel-home-runtime-owner-guard-v1.js`
- **Projects list:** `pristeel-projects-modern-v1.js` + lifecycle tracking
- **Project workspace data/tool owners:** `pristeel-project-first-v2.js` and its current project-first extensions
- **Final Project Workspace UI reconciler:** `pristeel-project-workflow-canonical-v1.js`
- **Legacy project ribbon compatibility bridge:** `pristeel-project-workflow-legacy-capture-v1.js`
- **Commercial comparison:** `pristeel-project-first-commercial-v1.js`
- **Gmail inbox:** live inbox + triage + follow-up layers in manifest
- **Tenders:** current tender business-flow layers in manifest
- **Contact Master:** `pristeel-contact-master-v1.js`, loaded by the final Workspace shell cleanup layer

The canonical Project Workspace now keeps one active project context with six top-level areas:

`Përmbledhja | Prokurimi | Ekzekutimi | Financat | Skedarët | Komunikimi`

Inside `Prokurimi`, the canonical sequence is:

`BOM -> RFQ -> Ofertat e furnitorëve -> Krahasimi i ofertave -> Çmimi i shitjes -> Oferta për klientin`

Important project-workflow rules:

- Every procurement stage is independently clickable.
- A stage status describes what data/state exists; it must not block navigation.
- Empty stages render an explicit explanation and next action instead of a blank page.
- Existing BOM, RFQ, normalized comparison, pricing calculator and client-offer engines are reused rather than duplicated.
- Where an older editor remains necessary, the canonical workflow opens it through a project-context bridge and returns the user to the same project.
- The old horizontal ribbon is compatibility-only and is captured back into the canonical flow instead of opening disconnected routes.
- The canonical workflow and legacy capture layers are UI-only: no business-data writes and no outbound actions.
- Final sell price, client offer and external send remain human-gated.

Do not infer authority from filenames alone. Later layers may intentionally wrap or constrain earlier ones.

## 4. Home / action engine

`pristeel-home-canonical-v1.js` is the sole final Home data owner.

Current model:

- Home section is **Për mua tani**.
- Maximum five concrete actions.
- A priority must explain **Pse tani?** and state a concrete next action.
- Waiting on another party is separated into **Në pritje** and is not treated as user work until follow-up becomes due.
- The whole priority card can open a **Project Brief**.
- Project Brief exposes current state, recent events, what exists, what is missing, deadlines/risks, sources and recommended actions.
- Snooze and dismiss are persisted.
- `Kryer` is reserved for work PPPP cannot verify automatically.
- Newer confirmed events supersede obsolete automatic tasks.

Important event examples:

- Supplier quote arrives -> project becomes actionable -> **Përgatit ofertën PRISTEEL**.
- Our offer is sent -> stale quote/dynamic-plan preparation tasks close -> project becomes **Në pritje të klientit**.
- Client responds after our offer -> **Shqyrto përgjigjen e klientit**.
- Tender/offer deadline with technical work open -> concrete technical action is promoted.

## 5. Project event automation

Supabase contains event/reactivity logic around linked `project_emails`, RFQs, offers and project decisions.

Critical behavior includes:

- supplier reply/quote recognition against project RFQ history;
- supplier email rate/scope reactivity where safely extractable;
- outgoing PRISTEEL offer recognition;
- project stage updates only where the current stage can safely move forward;
- stale-task reconciliation after a superseding event;
- current project decision snapshot generation.

Relevant functions/triggers must be inspected live before modification. Use `public.pppp_platform_snapshot_v1()` for a continuity snapshot and query trigger definitions when changing event logic.

## 6. Document intelligence -> structured requirements

Analyzed project attachments feed Project Intelligence and now also populate `public.project_requirements`.

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

## 7. Commercial automation

Do not build a second supplier comparison engine without first reading `pristeel-project-first-commercial-v1.js`.

Existing behavior already includes:

- normalized supplier component comparison;
- installation scope warnings;
- landed/same-scope comparison logic;
- preliminary margin checks;
- human gate where supplier scopes are not comparable.

Existing project-to-offer prefill helpers can carry supplier cost basis into a new PRISTEEL offer draft. Automation may prepare the draft, but it must not silently decide the sell price or send the offer.

## 8. Contact Master and CRM identity

PPPP keeps Gmail, HubSpot and Bitrix24 connected. They are sources/capabilities, not three separate people databases from the user's perspective.

Canonical relationship model:

- `contacts` = PPPP contact identity;
- `contact_sources` = source identities such as HubSpot, Bitrix24 and Gmail;
- `project_contacts` = relationship of the person/email to individual projects;
- `pppp_contact_master_v1` = unified read model used by the Workspace Contact Master.

Incoming linked Gmail messages update Contact Master automatically. The same email should resolve to an existing canonical contact before a new person is created.

Contact/project role is operational context:

- known supplier sender -> supplier event context;
- known client sender -> client event context;
- project linkage and RFQ history help decide the event type.

Do not disconnect HubSpot or Bitrix24 as part of simplification. Simplification means fewer daily navigation steps, not loss of data sources.

## 9. Daily navigation intent

Primary daily work:

- Home
- Projektet
- Tenderat
- Kontaktet

Back-office / tools remain available:

- Gmail
- Komerciale
- Financa
- Modulet

The `+ Krijo` path remains for exceptional/manual cases, but normal work should increasingly be created from project events and next actions.

## 10. Human approval boundaries

PPPP may automatically:

- read and link information;
- classify events;
- update non-contractual operational state;
- extract structured facts with trust markers;
- calculate and compare;
- close obsolete automatic tasks;
- generate next actions;
- prepare drafts;
- prepare follow-ups.

Human approval remains required for:

- sending external email;
- final client offer;
- sell-price/margin commitment;
- supplier selection where it creates commitment;
- PO / contract;
- final invoice/financial commitment;
- terminal commercial decisions such as won/lost where not already explicitly confirmed.

## 11. Connected systems

Keep connected and treat as systems of record/capabilities:

- Gmail: actual communication
- Google Drive: project files, one permanent folder per project
- HubSpot: CRM source
- Bitrix24: CRM source
- TED: EU opportunity source
- KRPP: Kosovo tender source
- APP Albania: Albania tender source

Integration policy is also recorded in `public.pppp_platform_integrations`.

## 12. Current regression projects

These projects are the minimum regression set for event automation and project-workflow continuity.

### Dukley Seafront Restaurant, Budva
- Project id: `6e0d2d19-3a51-4079-882f-b73f81cbe95e`
- Current commercial phase: client offer / waiting for client
- Latest offer: `PST-OFF-2026-08-025`
- Execution commitment recorded: **10.10.2026**
- Old `Aprovo planin dinamik` work is obsolete and must not return while the newer sent offer remains the current event.
- Project workflow must distinguish supplier offers, supplier comparison, selling price and the client offer without losing Dukley project context.

### ITALIAN STYLE - Hala - CARINVEST
- Project id: `655c4ce3-9845-4c15-8ecc-0306d9f1aa50`
- Eurosteel supplier response is linked.
- Current intended action: **Përgatit ofertën PRISTEEL**.
- Supplier response should automatically make the project actionable.
- Commercial workflow must retain Eurosteel cost basis and review flags while keeping selling price/final offer human-approved.

### TenneT / SPIE
- Project id: `c937aea1-af5e-4807-ae1e-e36864e46794`
- Offer deadline: **21.08.2026**
- Current intended action: close concrete technical issues before final offer, not a vague generic `process request` instruction.

Any future Home/event-engine or Project Workspace change should be checked against all three.

## 13. Continuity registry

Supabase continuity objects:

- `pppp_platform_context`
- `pppp_platform_changelog`
- `pppp_platform_protected_rules`
- `pppp_platform_integrations`
- `pppp_platform_snapshot_v1()`

These make cross-chat continuity independent of one conversation window.

## 14. Session start protocol

A new PPPP engineering session should begin by reading, in order:

1. GitHub `main` HEAD.
2. `PPPP_MASTER_CONTEXT.md`.
3. `PPPP_DO_NOT_BREAK.md`.
4. `runtime-manifest.json`.
5. `docs/ACTIVE_RUNTIME.md`.
6. Supabase `public.pppp_platform_snapshot_v1()` and latest `pppp_platform_changelog` entries.

Only then make architecture changes.

## 15. After a material change

Before considering work finished:

1. Verify the live DB/code state.
2. Run appropriate regression checks.
3. Update `PPPP_CHANGELOG.md` for architecture/automation changes.
4. Append the same material change to `public.pppp_platform_changelog`.
5. Update this file if architecture intent, ownership or protected behavior changed.
6. Run Supabase advisors after DDL.

## 16. Protected rules

Read `PPPP_DO_NOT_BREAK.md` and `public.pppp_platform_protected_rules` before removing/replacing existing behavior.

The core rule is simple: **improve the verified current system; do not restart PPPP from zero.**

Last major runtime change recorded here: canonical end-to-end Project Workspace workflow with six project areas and six procurement stages, 22.08.2026.