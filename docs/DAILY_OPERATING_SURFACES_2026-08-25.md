# PPPP Daily Operating Surfaces - 2026-08-25

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

The daily surface is capped to concrete human-needed work. Waiting projects are not treated as active priorities.

## Opportunities

Final daily presentation: `pristeel-opportunities-daily-v1.js`.

It does not discover or rank tenders independently. It reuses `PSTTenderPriorityActionsV1` for:

- priority rows;
- GO;
- REVIEW;
- NO-GO;
- winner-outreach draft preparation.

The full KRPP / APP / TED feed and filters remain intact under the collapsed full-list section.

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

Old board view, passive badges/counters and technical classification controls are not part of the normal daily surface.

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

Maintenance controls and passive counters are hidden from daily use, not deleted.

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

System contains or provides access to technical/back-office surfaces such as:

- Gmail raw inbox;
- Commercial intake/review;
- automation health;
- OCR / semantic processing status;
- integrations;
- diagnostic and fallback modules.

## ChatGPT / OpenAI project context

See `docs/CHATGPT_CONTEXT_BRIDGE.md`.

The context bridge writes durable structured observations/suggestions into canonical PPPP project context. It is not a second project database and it does not give PPPP unrestricted access to personal ChatGPT history.

## Non-negotiable presentation safety

- No global ancestor hiding.
- No global MutationObserver or polling used to win UI ownership races.
- No second business engine hidden behind a simplified UI.
- No deletion of a fallback provider until equivalent behavior is verified.
- No presentation layer may silently write project/commercial/financial commitments.
