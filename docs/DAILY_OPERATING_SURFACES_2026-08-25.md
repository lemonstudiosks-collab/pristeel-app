## 2026-10-08 — TED action desk and outreach eligibility
The current presentation owner remains `pristeel-opportunities-filter-polish-v1.js`, backed by Project-Centric Opportunities. The default view is operator attention, with Waiting for replies, Drafts and All companies as separate routes. Companies group by profile/legal identity or business domain; public mailbox domains do not merge unrelated companies. A stored Gmail draft does not imply a send. Registry drafts remain reachable even if the company also has older sent communication. Transport/logistics exclusions and evidence gaps remain visible through separate review views. `ted-sales.html` follows the same action-first structure and retains access to its full historical register.

The shared pure policy `pristeel-ted-outreach-policy-v1.js` is loaded by the existing presentation owner and imported by the draft generator, follow-up and outbound dispatcher. It requires evidenced steel scope and verified company activity, and excludes irrelevant contact functions. Warehouse keyword/category/relevance alone cannot authorize steel outreach. Explicit approval, cooldown override or manual template selection cannot bypass the scope gate. The generator is based on live v55, retaining deployed verified-name and draft-content corrections rather than reverting them to older main.

Automatic sending remains OFF and human send approval remains required. No sender verification or campaign authorization was asserted. Future TED dispatch additionally requires a dated, expiring `PPPP_TED_SEND_READINESS` record for the actual sending domain with SPF/DKIM/DMARC, opt-out handling and campaign approval; the environment variable is deliberately unset. The existing daily, per-domain and recipient/domain cooldown guards remain authoritative. Dispatch stops for observed bounce/error deterioration and validates one live To recipient with no Cc/Bcc. This does not provide a spam-placement guarantee or activate automatic sending.

Validation: executable transport/unknown-company/contact/readiness regressions; zero-write generator test with explicit approval and override; action-desk grouping and draft/sent/thread separation tests; existing multi-contact, registry-preservation, future-cron and dispatch guards; production Pages artifact build. Local browser verification was denied by the browser permission policy, so no authenticated browser QA is claimed. The prior live draft-copy subject differs from an older standalone copy-test expectation; the copy was retained unchanged.

Rosebrock notice 628114-2026: 27 exact unsent drafts were moved to Gmail Trash and an active-draft search returned zero. No email was sent. Canonical historical business rows were not rewritten to fabricate a new lifecycle; normal Gmail reconciliation remains the source of draft-state updates.

# PPPP Daily Operating Surfaces - 2026-08-25

## 2026-10-05 — SPIE platform standard

`pristeel-spie-standard.css` is the shared static presentation owner in `pristeel-procurement.html`. Its root flag owns stable desktop shell geometry from first paint. Home Launcher and Production Surface Owner defer imperative geometry in this mode; existing routes, canonical data, role/action gates and mobile gestures stay intact. The primary navigation exposes existing direct-client, steel-buyer, document, email, SPIE and event destinations. Home uses calm rows; Finance/Partner maps retain their original handlers in list presentation. No new Supabase reads, polling, writes, schema or migrations.

This document records the final daily-use presentation after the August 25 simplification. It does not replace runtime ownership records or backend engines.

## Primary navigation

The daily navigation is exactly:

1. Home
2. Opportunities
3. Projects
4. Partners
5. Finance
6. System

Final cross-area presentation/navigation owner remains `pristeel-operating-experience-v1.js`.

`pristeel-daily-zones-cleanup-v1.js` is the bounded presentation cleanup loaded through `pristeel-redesign-finalizer-v1.js`. It may relabel/hide passive daily chrome and load existing final daily surfaces. It does not own project/business state or perform business writes.

## Home

Purpose: **What requires my intervention now?**

Canonical business-state owner remains `pristeel-home-canonical-v1.js`.

The desktop daily surface is capped to concrete human-needed work. Waiting projects are not treated as active priorities.

On phone/tablet (<=900px), `pristeel-mobile-home-v1.js` deliberately uses a different presentation because the fixed bottom navigation already exposes Opportunities, Projects, Partners, Finance and System. Mobile Home therefore avoids duplicating those areas and instead shows `Pyet PPPP`, live Prishtina weather/date, current-source steel-market links, compact local tools and market resources. Stale/sample steel prices are not displayed as current. The currency tool uses the ECB daily reference-rate feed on demand. It performs no PPPP business writes and does not create a second workflow owner.

After first-time account authentication and PIN setup, trusted-device mobile re-entry is PIN-only across normal access-session expiry. The existing refresh-token path remains the server authentication mechanism; the local four-digit PIN only unlocks the remembered device session. Explicit logout clears that trusted-device state.

## Opportunities

Final daily presentation: `pristeel-opportunities-daily-v1.js`.

It does not discover or rank tenders independently. It reuses `PSTTenderPriorityActionsV1` for:

- priority rows;
- GO;
- REVIEW;
- NO-GO;
- winner-outreach draft preparation.

The full KRPP / APP / TED feed and filters remain intact under the collapsed full-list section.

For Mundësitë, Arianiti explicitly shortlists RFQ-ready suppliers from Supplier Intelligence and hands the Project to Oltian. This creates one internal assigned task only; it never sends an RFQ or commits a supplier.

## RFQ & Sourcing

Oltian sees an assigned **RFQ & Sourcing** queue above the existing Projects desk. Each row opens the canonical Project flow: upload dossier, run AI requirement extraction, prepare RFQ drafts, upload supplier quotations, compare them and assemble an internal multi-supplier sourcing plan. Technical documentation remains manual. All external sends, final supplier choices, prices/margins and purchase orders still require human approval.

No project is created before the existing human GO gate. No outreach email is sent automatically.

## Projects

Projects list remains owned by the existing modern Projects/lifecycle layers.

Daily list vocabulary:

- Action
- Waiting
- Execution
- Closed

Daily list focuses on:

- project;
- client;
- real operating state;
- next step;
- meaningful deadline;
- Open.

Old board view, passive badges/counters, duplicate-manager control, manual refresh, technical classification controls and the daily sort selector are not part of the normal work surface. The page keeps search plus the five canonical work-state filters.

`+ Projekt i ri` is no longer a daily Projects-header action. Manual project creation remains available through the exceptional `+ Krijo` path, while normal project creation/intake should increasingly come from confirmed business events and the existing automation.

A project must open through `pstOpenProjectWorkspace(project_id)`.

## Project Workspace

One canonical workspace with five business phases:

`Përgatitja -> Prokurimi -> Komerciale -> Ekzekutimi -> Financa`

Utilities:

`Skedarët | Komunikimi`

Existing engines remain reused underneath:

`BOM -> RFQ -> Supplier Offers -> Comparison -> Selling Price -> Client Offer`

The old ribbon and old-view controls are compatibility-only. Providers remain in code until their fallback dependencies are deliberately retired.

## Commercial

Final project Commercial presentation remains `pristeel-project-commercial-simplified-v1.js` over existing commercial engines.

Target daily path:

`Supplier quote -> structured project context -> supplier comparison -> PRISTEEL offer draft -> human pricing/approval -> PDF -> Gmail Draft -> human send`

Human gates remain on:

- final selling price;
- margin;
- supplier commitment;
- final customer wording/approval;
- external send.

## Partners

Canonical relationship engine remains `pristeel-contact-master-v1.js`.

Daily presentation is `Partners`, with Gmail / HubSpot / Bitrix24 treated as sources under one person/company identity rather than separate contact systems.

Maintenance controls and passive counters are hidden from daily use, not deleted. Search, useful business-category filters and source filtering remain available.

## Finance

Final daily presentation: `pristeel-finance-daily-v1.js`.

It reads the canonical task system and surfaces only human-needed finance work such as:

- overdue receivable;
- supplier invoice needing due-date completion;
- invoice candidate needing review;
- payment/finance/SWIFT task requiring intervention.

Existing Finance registries and reports remain under `Mjete financiare`.

Finance Daily does not mark invoices paid, complete tasks or create financial commitments.

## System

System is the engine room, not a competing business workspace.

`pristeel-daily-zones-cleanup-v1.js` presents the System shell and loads the existing `pristeel-automation-health-v1.js` health owner when System is active.

Automation Health is the primary visible System surface. The large technical app/module grid is preserved but collapsed under **Mjete teknike** by default. The old duplicate System shortcut strip is hidden from daily use.

System contains or provides access to technical/back-office surfaces such as:

- Gmail raw inbox;
- Commercial intake/review;
- automation health;
- OCR / semantic processing status;
- integrations;
- diagnostic and fallback modules.

No integration is disconnected by hiding or collapsing its daily UI entry point.

## Automation posture

Daily work should not depend on manual refresh buttons or on the user moving records between technical queues. Existing event/cron engines continue to ingest Gmail, intake projects/documents, reconcile actions/tasks, process commercial intake, check execution readiness, and orchestrate OCR/semantic work in the background.

Automation may prepare and reconcile work aggressively where evidence is safe, but the existing human gates for commitments remain unchanged.

## ChatGPT / OpenAI project context

See `docs/CHATGPT_CONTEXT_BRIDGE.md`.

The context bridge writes durable structured observations/suggestions into canonical PPPP project context. It is not a second project database and it does not give PPPP unrestricted access to personal ChatGPT history.

## Non-negotiable presentation safety

- No global ancestor hiding.
- No global MutationObserver or polling used to win UI ownership races.
- No second business engine hidden behind a simplified UI.
- No deletion of a fallback provider until equivalent behavior is verified.
- No presentation layer may silently write project/commercial/financial commitments.
