## 2026-10-07 - SPIE suggested offer review

Surface up to twelve unassigned messages that explicitly suggest SPIE, as a separate review-only offer section. The 25 September DDP quotation is visible without an active Google session, while its unresolved Tier C project association remains unconfirmed. Suggested evidence never enters assigned offers, completed work, project flow or phase decisions. No email assignment or business record is changed.

The operational bundle now uses six bounded reads plus its existing snapshot and retains five-minute coalescing. Verified sixteen Node regressions and an authenticated-fixture browser check with no Google session, seven total requests, source links, zero errors and GET-only provider traffic. Live production review confirms source visibility; UI display does not resolve the underlying assignment.

# PPPP Active Runtime

## 2026-10-07 — SPIE operational project overview

The dedicated /spie workspace preserves its existing sidebar, font scale and layout. Overview now prioritizes the current project situation, evidence-backed completed work, review-only next steps, supplier/client offers and requested sample dates. The Offers route separates supplier quotations, sent PriSteel offer versions and accompanying terms; the existing Projects route becomes a chronological communication flow with filters. Files merges existing Drive metadata and exact project-linked attachments with working source links.

The read adapter uses six bounded project-scoped data reads plus its existing project snapshot, coalesced for five minutes across routes. An existing PPPP Google session can additionally read six recent commercial message identities and eight recent communication identities, hydrate at most six missing exact-reference messages, and read at most six missing attachment metadata messages. The UI marks Google-only evidence as outside the PPPP register. It never requests automatic consent, persists source facts, ingests messages, sends email, changes a task or decides a commercial commitment. No schema, worker, scheduler or shared bootstrap changes.

Keep the commercial pipeline field at pricing and read Samples from the source-backed workspace context and current SPIE communication; Samples is not added to the commercial pipeline schema. The sent DDP revision dated 25 September exists as an unassigned PPPP email with a legacy SPIE suggestion; its canonical project association and project-linked attachments remain unconfirmed. UI reads do not silently reconcile those records. Quotation values/margins remain unknown until verified structured evidence exists; document timestamps and filenames never prove acceptance, production or delivery.

Validation: existing authentication/read-only/session/currency tests plus targeted offer identity/version, ambiguity, template exclusion, DDP workbook and sample-evidence regressions; browser interaction tests cover all seven routes, offer/workflow/file filters, source links, stable desktop typography/sidebar, mobile overflow, cache reuse, optional Google source absence, partial failure and logout. Browser provider responses are mocked from read-only source metadata; this does not claim authenticated production provider testing.


## 2026-10-06 — Opportunities stage actions

The existing Opportunity Desk and Action Console expose one primary action per stage plus **Hiqe** and a native **⋯** menu. Dossier preparation delegates to the existing fetch/analysis pipeline; complete analysis replaces preparation with the explicit project-creation action. Supplier Intelligence continues after dossier readiness and reuses its result for five minutes; external discovery remains on demand. Arianit selects RFQ-ready suppliers through checkboxes. Once an existing project and shortlist are present, **Dërgo te Oltiani** replaces the console primary action and calls the existing `tasks` handoff. Oltian continues through the canonical Project RFQ surface; secondary utilities remain in its menu. The first-page Gmail draft action matches the compact white Gmail-branded console button and preserves preview/approval behavior. No scheduler, worker, Edge Function, schema or protected business gate is changed. See `docs/OPPORTUNITIES_STAGE_ACTIONS_20261006.md`.


## 2026-10-05 — Home navigation stability

Primary Navigation retains the existing sidebar DOM across repeated repairs. Task Source Actions and the Home startup label normalizer defer to that owner. Home queues the latest early module click until the ordered runtime is ready; startup completion preserves an already selected destination. EU Direct restores the missing scope/contact display helpers, without adding data reads or business writes. The bootstrap versions for the launcher, primary navigation and EU Direct are updated together.

Validation: real Home-button interaction regression for four primary destinations, stable sidebar identity across late repair cycles, populated EU Direct list/detail rendering and startup destination preservation, plus existing Home/Primary Navigation/SPIE presentation smoke checks. Supabase use is limited to the initial read-only bridge manifest.

## 2026-10-05 — Opportunities draft/typography regression

SPIE standard CSS owns stable Opportunities list/filter/detail/draft typography. Platform Readability retains translation and legacy fallback but skips delayed font classification in these surfaces under `pst-spie-standard`. Candidate RPC accepts an exact TED-declared email for the selected canonical winner even when its brand domain differs from its legal name. Existing identity, eligibility and manual draft/send gates remain.

## 2026-10-05 — SPIE platform standard

`pristeel-spie-standard.css` is the shared static presentation owner in `pristeel-procurement.html`. Its root flag owns stable desktop shell geometry from first paint. Home Launcher and Production Surface Owner defer imperative geometry in this mode; existing routes, canonical data, role/action gates and mobile gestures stay intact. The primary navigation exposes existing direct-client, steel-buyer, document, email, SPIE and event destinations. Home uses calm rows; Finance/Partner maps retain their original handlers in list presentation. No new Supabase reads, polling, writes, schema or migrations.

This document is the human-readable companion to `runtime-manifest.json`.

### Desktop Home launcher contract (2026-10-05)

`pristeel-home-launcher-v4.js` is the final visual owner of desktop Home. Native UI and Redesign Finalizer retain compatibility functions but cannot retire its DOM, set it hidden, or claim its visual ownership. Canonical Home remains the existing data provider.

While Home or one of its four primary module destinations owns the shell boundary, `pst-home-shell-owned` makes Global Full-width Shell and Production Surface Owner defer sidebar visibility to the launcher. Home reserves no sidebar space; the primary module routes restore their canonical navigation sidebar. Other routes retain the existing full-width shell contract. The Representation fallback stylesheet is restricted to active Representations. Back navigation prefers visible local controls, with one visible global fallback where needed.

For project continuity also read:

- `PPPP_MASTER_CONTEXT.md`
- `PPPP_DO_NOT_BREAK.md`
- `PPPP_CONTINUITY_PROTOCOL.md`
- `PPPP_CHANGELOG.md`

## Mundësitë — RFQ & Sourcing handoff

- `pristeel-tender-supplier-sourcing-v1.js` remains the Supplier Intelligence evidence/ranking surface. Arianiti makes the shortlist; ranking never becomes selection.
- `pristeel-rfq-sourcing-workflow-v1.js` persists that explicit handoff in the existing `tasks` lifecycle and adds the assigned Oltian queue without replacing Projects or Workbench ownership.
- Project dossier upload, AI requirement extraction, RFQ draft preparation, quotation intake and normalized comparison remain owned by their existing Project modules.
- `pristeel-project-first-commercial-v1.js` may record one human-confirmed supplier per sourcing package and display the resulting internal cost plan. It cannot send, commit, approve price/margin or create a PO.
- Technical documentation is manual by design.

## Blerësit e çelikut — runtime canonical

- Owner UI: `pristeel-dach-steel-sales-v1.js`; data operative: `public.pppp_dach_steel_targets_v1`.
- `public.pppp_company_identity_v1` dhe `public.pppp_company_module_roles_v1` japin identitetin e vetëm të kompanisë dhe routing ndërmjet moduleve.
- Discovery Edge `pppp-steel-buyer-discovery` ekzekutohet një herë në ditë në 20:15 UTC. Kandidatët mbeten në review queue deri te “Prano”; ky cikël nuk krijon email/draft/outbound.
- `pppp-dach-steel-draft-generator` mban preview, draft dhe follow-up me human gate. Preview nuk prek Gmail; drafti krijohet vetëm me klikim të përdoruesit dhe asnjë funksion nuk dërgon email automatikisht.
- `pppp-chatgpt-command-bridge` punon në 06:15, 12:15 dhe 18:15 UTC; Gmail/outbound reconciliation ruan frekuencën ekzistuese.

## Kompanitë EU — zhvillim direkt në Evropë

- Owner i dukshëm: `pristeel-eu-companies-v1.js`.
- Të dhënat canonical të reja ruhen në `public.pppp_eu_direct_targets_v1`; pamja operative `public.pppp_eu_direct_operational_v1` integron edhe batch-in historik direct-web pa futur fituesit TED.
- Routing është i prerë: tenderët/projektet dhe fituesit e tyre mbeten te **Mundësitë**; blerësit e lëndës së parë te **Blerësit e çelikut**; hyrja në treg/JV/përfaqësimi te **Përfaqësime**.
- **Blerësit e çelikut** mban disa kontakte për kompani në shared outbound, një draft të veçantë për recipient dhe një follow-up të kontrolluar pas shtatë ditësh pa reply. Preview-i dhe drafti krijohen nga i njëjti Edge copy engine; asnjë email nuk dërgohet automatikisht.
- Pas reply/RFQ dhe konfirmimit njerëzor, targeti bëhet Project `trading`; furnitorët, RFQ-të dhe oferta vazhdojnë vetëm në rrjedhën canonical të Project-it.
- Para regjistrimit kontrollohen domeni zyrtar dhe përplasjet ndërmjet moduleve. Para kontaktimit lexohet historiku i përbashkët i outbound-it/kontakteve.
- Moduli nuk krijon projekt, partner, kontakt, draft ose dërgim emaili automatik. Dërgimi i jashtëm mbetet human gate.
- Fronti është qëllimisht minimal: Kthehu, Kërko, Rifresko, listë dhe profil.

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

- `pristeel-mobile-responsive-v1.js`, `pristeel-mobile-home-v1.js` and `pristeel-mobile-control-tower-v1.js` remain loaded as compatibility/navigation/utility providers for narrow screens.
- `pristeel-mobile-app-v2.js` is the final <=900px mobile presentation owner (runtime v3). It mounts outside the legacy app container, fully covers/hides legacy dashboard surfaces while active, and presents a dedicated four-page shell: Home, Projects, Discover and Inbox with a raised central + action.
- Home consumes `PSTHomeCanonicalV1.snapshot()`; Projects reuses existing project caches/owners; Discover delegates to Tender Priority Actions, Material Trade and Representations; Inbox delegates to Gmail Live Inbox. Mobile App v2 does not create a second business-state engine.
- Home, Projects, Discover and Inbox share one full-screen horizontal pager. The bottom bar is the direct shortcut, while left/right touch swipe changes the entire primary page. Nested Home/Discover card swipes are not used, so there is one unambiguous horizontal gesture owner. Any status-changing opportunity action remains an explicit user gesture/button; protected commercial actions remain human gated.
- Weather, ECB FX conversion and steel-market access remain fixed as compact utility icons and delegate to the existing mobile utility provider. No duplicate public/API fetch path is introduced by Mobile App v2.
- Partnerët, Financat, Material Trade, Përfaqësime and Sistemi remain reachable from the profile/more sheet and open their existing canonical owners.
- Mobile App v2 adds no direct Supabase reads/writes, no polling and no independent network fetches. Existing page/detail owners continue to render when the user opens a project, opportunity or secondary module.
- `pristeel-mobile-pin-unlock-v1.js` owns trusted-device mobile re-entry. After first-time normal authentication and PIN setup, routine re-entry — including access-token expiry — is PIN-only: PIN verification restores the remembered refresh-token session and lets the existing auth refresh path renew it. Explicit logout still clears the trusted-device PIN/session state.
- The linked `pristeel.webmanifest` prepares installable-app metadata. Service-worker caching remains deliberately deferred to avoid stale-runtime risk.

### Home

**Final data owner:**

- `pristeel-home-canonical-v1.js`

**Startup/final handoff owner:**

- `pristeel-home-runtime-owner-guard-v1.js`

Home Canonical remains the sole business-state/data owner. Operating Experience may decorate the surface and route an existing action button, but it does not create or infer Home business state.

Current behavior:

- `pristeel-home-launcher-v4.js` owns the final desktop Home presentation. `pristeel-home-operator-dashboard-v1.js` and the earlier Home layers remain loaded only for compatibility/data continuity underneath it.
- Desktop Home is intentionally a calm launcher, not an operational dashboard. It does not show task backlogs, priority cards, recent-email feeds or duplicate module KPIs.
- The left sidebar is hidden only while Home is active. As soon as a work module opens, the existing canonical sidebar returns automatically.
- The top strip contains PRISTEEL, Gmail, Gazeta PPPP, calculator, compact local time/date and Prishtina weather. All top-strip icons use the same visual footprint.
- Universal Search opens the existing stable PRISTEEL search owner. The four primary Home destinations are Mundësitë, Përfaqësime, Klientë të drejtpërdrejtë and Blerësit e çelikut.
- The lower utility row exposes Projektet, Partnerët, Financa, Kursi and Çmimet e çelikut. Projects/Partners/Finance delegate to their existing canonical owners.
- Weather uses Open-Meteo and currency uses Frankfurter/ECB as free, read-only public sources. The steel-price utility shows existing internal PPPP price-history references and states explicitly that they are not live exchange/commodity quotes.
- Home itself performs no protected business action. External email sending, supplier selection/commitment, pricing/margin, contracts/POs and project won/lost decisions remain human-gated.
- `pristeel-mobile-app-v2.js` continues to own the final <=900px mobile Home presentation.

### Opportunities

Underlying owners remain:

- `pristeel-kek-tender-watch-v1.js`
- `pristeel-tender-business-flow-v1.js`
- `pristeel-tender-winner-contacts-v1.js`

The first filename is legacy. Current behavior covers KRPP Kosovo, APP Albania, TED direct opportunities and TED award-winner outreach.

The visible Opportunity Desk is owned by `pristeel-opportunities-filter-polish-v1.js`. Selecting a company is an in-place interaction: it must preserve the existing Desk, filter column, 60-row center column, project-row nodes, right-column container and contacted-company list while updating only selection state and the detail card. `pristeel-project-centric-workflow-v1.js` coalesces route repairs into one animation-frame update; delayed multi-render bursts are not part of the active contract.

External procurement discovery has one scheduled morning session per source. Cloud collectors must pass the service-only `pppp_claim_external_source_daily_access_v1` gate before contacting TED, KRPP, APP Albania or the multilateral/WB source group. Duplicate/manual runs after the first claim skip external access. The authenticated KRPP Mac worker runs once at 06:00 local time and exits; continuous polling and `KeepAlive` are forbidden.

The active KRPP cloud collector detail-scans the bounded B05/B54 feed without a title-keyword gate. Its authority-neutral capability model consumes title, FPP, short/full/technical descriptions, lots and available dossier-derived scope. `main` records are direct PRISTEEL opportunities, `review` records are plausible packages requiring scope verification, and `excluded` records do not enter the working list. The final daily decision surface accepts only KRPP `main`; `review` remains available through the existing review layer.

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

## SPIE Workspace · Phase 1 (2026-10-05)

`spie/index.html` is the same-origin dedicated entry at `/spie/` (under the deployment base path). `spie/workspace.js` owns only that document; `spie/data.mjs` reuses the canonical PPPP `pristeel_session` and project snapshot RPC. It does not load or wrap the global PPPP bootstrap. Home provides a SPIE Workspace shortcut and `index.html?view=spie` forwards to the dedicated entry. Public assets are included explicitly in `pages-artifact-manifest.json`.

The workspace links canonical TenneT project `c937aea1-af5e-4807-ae1e-e36864e46794`, uses one bounded project snapshot plus three latest document metadata rows for Overview, and loads larger Files, Emails, Partners and Finance metadata only on navigation. Reads are cached and coalesced for five minutes in memory; there is no polling or realtime subscription. Expired or absent sessions return the user to existing PPPP authentication instead of adding another refresh/login owner. Samples is operator-declared and differences from the canonical pipeline remain visible. Health and latest drawing revisions require explicit evidence.

No records, Gmail bodies, documents or business decisions are created or modified. Physical files remain in the permanent Drive folder and original communication remains in Gmail. See `docs/SPIE_WORKSPACE_PHASE1.md` for limitations and verification.


## SPIE commercial documents — 2026-10-07

SPIE now opens existing canonical offer/invoice/credit controllers through a guarded same-origin child editor. `spie/document-models.mjs` owns only the uploaded-source document layouts; `spie/documents.mjs` owns the project dialog and draft composer; `spie/editor-host.mjs` adapts the existing document owners. `spie/editor-safety.js` is the first direct runtime script, but returns immediately outside a human-opened `spieEditor` child frame. Within the iframe it blocks background writes and unrelated dynamic owners; authenticated role checks and server constraints remain authoritative. The shared ordered bootstrap, loader, schema, schedulers and existing project record owners are unchanged.

Approved Gmail draft receipts reuse `spie/bridge.mjs` and the live context-fact protocol. They use a separate `spie.document.email.v1.*` namespace and never become shipment or sent-offer evidence. Operator verification is required after worker processing. Read/save/export boundaries and remaining pilot limitations are documented in `docs/SPIE_DOCUMENT_MODELS.md`.
