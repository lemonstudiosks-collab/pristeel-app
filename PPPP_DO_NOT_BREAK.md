# PPPP DO NOT BREAK

This is the protected-behavior checklist for PRISTEEL PPPP. It is deliberately conservative because the platform has accumulated working automation, compatibility bridges and commercial history over a long period.

## Before changing anything material

- Read `PPPP_MASTER_CONTEXT.md`.
- Read current `runtime-manifest.json` and `docs/ACTIVE_RUNTIME.md`.
- Verify current GitHub `main` HEAD.
- Inspect the live Supabase objects that own the behavior.
- Prefer a narrow additive/wrapping change over replacing a working subsystem.

## Protected behavior

### 1. Do not rebuild PPPP from zero

Do not create a new parallel architecture because the current one looks complicated. First trace current ownership and reuse the working system.

### 2. Do not infer dead code from filenames

Legacy-looking names can still provide foundations, compatibility or user-accessible fallback behavior. Never delete a module because its filename looks old.

### 3. Preserve runtime order

PPPP uses additive runtime layers. A later module can intentionally wrap, hide or constrain an earlier module. Bootstrap/load-order changes require manifest review and regression testing.

### 4. Preserve Gmail project identity

Do not weaken or replace Gmail-to-project matching, thread continuity, attachment linking or supplier identity logic without regression tests. A false project match is a commercial data-integrity failure.

Minimum regression identities include Dukley, CARINVEST and TenneT/SPIE.

### 5. Preserve one project identity

Do not create duplicate project records for the same business project when a canonical project can be matched safely.

### 6. Preserve one permanent Drive folder per project

Do not create a new Google Drive folder when the project already has a permanent folder. Workspace and automation should use the existing folder.

### 7. Never overwrite sent offers silently

A sent/final PRISTEEL offer is commercial history. A change becomes a new offer or explicit revision. Never mutate the old sent document in place as though it had always contained the new terms.

### 8. Keep outbound commitments human-gated

PPPP may prepare, calculate and draft automatically. Human approval remains required for external sending and legal/financial commitments, including:

- client email send;
- final client offer;
- sell-price/margin commitment;
- supplier selection when committing spend;
- PO/contract;
- final financial commitment.

### 9. New events must supersede obsolete automatic work

Do not leave stale Home priorities after a newer confirmed event resolves them. Example: once a revised offer containing the approved dynamic plan is sent, `Aprovo planin dinamik` must not remain open.

### 10. Waiting is not a priority

A project waiting on a client or supplier is not automatically user work. It belongs in `Në pritje` until a follow-up or other concrete action becomes due.

### 11. Every priority must be explainable

A Home priority must answer:

- What should I do?
- Why now?
- Which project/source caused this recommendation?

If PPPP cannot answer these, it should not create a priority.

### 12. Preserve source auditability

AI/automation recommendations must remain traceable to project email, document, RFQ, offer, deadline or structured evidence. OCR/review evidence must not silently become confirmed fact.

### 13. Do not duplicate contact identities

Gmail, HubSpot and Bitrix24 are source identities, not three separate people. Match safely into canonical `contacts` and attach source records through `contact_sources`.

### 14. Keep integrations connected during UI simplification

Removing a navigation button is not the same as disconnecting a system. Gmail, HubSpot, Bitrix24, Drive and tender sources should remain available unless a deliberate migration proves they are no longer required.

### 15. Do not create a second supplier comparison engine

Inspect and extend `pristeel-project-first-commercial-v1.js` first. It already handles normalized components, scope mismatches and preliminary margin logic.

### 16. Do not bypass existing offer-prefill logic

Inspect current project-commercial prefill/rescue layers before implementing new supplier-quote-to-client-offer automation.

### 17. Preserve classic fallbacks until replaced deliberately

User-accessible classic/old project views and merge workflows may still depend on legacy modules. Remove the fallback first or provide an equivalent before retiring its provider.

### 18. Do not silently change project stage backward

Automatic event logic may move a project forward when evidence is clear. It must not regress a more advanced/terminal project into an earlier stage because a late email/document is imported.

### 19. Terminal states need explicit evidence

Do not mark a project won/lost/closed based only on speculative language. Terminal commercial state should come from explicit confirmation or human action.

### 20. Verify after DDL/runtime changes

- Check changed rows/functions/triggers.
- Run Supabase advisors after DDL.
- Confirm current runtime code from `main`.
- Record material changes in GitHub and Supabase changelogs.

## Regression projects

Always consider at least:

- **Dukley Seafront Restaurant**: latest sent offer 025, execution deadline 10.10.2026, waiting for client.
- **CARINVEST**: Eurosteel quote/reply should promote `Përgatit ofertën PRISTEEL`.
- **TenneT / SPIE**: concrete technical-closeout action before 21.08.2026 deadline.

If a change makes one of these states less accurate, stop and inspect before broadening it.