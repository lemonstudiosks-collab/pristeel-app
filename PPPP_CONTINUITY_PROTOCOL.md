# PPPP CONTINUITY PROTOCOL

Use this protocol whenever work continues in a new chat, agent session, browser session or after a long interruption.

## Start of session

Do not ask the user to reconstruct the platform from memory if the technical sources are available.

1. Read GitHub `main` HEAD.
2. Read `PPPP_MASTER_CONTEXT.md`.
3. Read `PPPP_DO_NOT_BREAK.md`.
4. Read `runtime-manifest.json`.
5. Read `docs/ACTIVE_RUNTIME.md`.
6. Query Supabase live state:
   - `select public.pppp_platform_snapshot_v1();`
   - latest rows from `public.pppp_platform_changelog`.
7. When the task concerns a specific project, read its current project row, latest decision snapshot, open tasks, linked emails, RFQ/offers/documents and relevant structured requirements before changing anything.
8. Use old chat history only to fill intent/context gaps that are not already resolved by canonical technical state.

## During work

- Extend current owners instead of creating parallel owners.
- Keep external/financial commitments human-gated.
- Prefer event-driven state transitions over manual task creation.
- A new confirmed event should reconcile stale automatic work.
- Keep recommendations source-grounded and explainable.
- Do not alter unrelated areas while solving a narrow regression.

## Before finishing a material change

1. Verify DB writes and current code.
2. Check regression projects appropriate to the change.
3. Run syntax/runtime/CI checks available for modified code.
4. Run Supabase advisors after DDL.
5. Append a row to `public.pppp_platform_changelog`.
6. Update `PPPP_CHANGELOG.md`.
7. Update `PPPP_MASTER_CONTEXT.md` if architecture, ownership, integrations, human gates or protected behavior changed.
8. Update `runtime-manifest.json` / `docs/ACTIVE_RUNTIME.md` when runtime ownership/load relationships changed.

## Continuity rule

**The chat is not the platform memory.**

Chat history is useful context. Current GitHub `main`, live Supabase state and the canonical PPPP context/changelog are the durable source of operational truth.

This protocol is intentionally simple so a future session can resume with the instruction: **“Vazhdo me PPPP.”**