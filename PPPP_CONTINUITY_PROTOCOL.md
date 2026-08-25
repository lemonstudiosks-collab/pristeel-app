# PPPP CONTINUITY PROTOCOL

Use this protocol whenever work continues in a new chat, agent session, browser session or after a long interruption.

## Start of session

Do not ask the user to reconstruct the platform from memory if the technical sources are available.

1. Read GitHub `main` HEAD.
2. Read `PPPP_MASTER_CONTEXT.md`.
3. Read `PPPP_DO_NOT_BREAK.md`.
4. Read `runtime-manifest.json`.
5. Read `docs/ACTIVE_RUNTIME.md`.
6. Read `docs/DAILY_OPERATING_SURFACES_2026-08-25.md` when work concerns daily navigation, Projects, Opportunities, Partners, Finance or System.
7. Read `docs/CHATGPT_CONTEXT_BRIDGE.md` when work concerns ChatGPT/OpenAI, project context, AI-extracted business facts or conversational continuity.
8. Query Supabase live state:
   - `select public.pppp_platform_snapshot_v1();`
   - latest rows from `public.pppp_platform_changelog`.
9. When the task concerns a specific project, read its current project row, latest decision snapshot, open tasks, linked emails, RFQ/offers/documents and relevant structured requirements/context before changing anything.
10. Use old chat history only to fill intent/context gaps that are not already resolved by canonical technical state.

## During work

- Extend current owners instead of creating parallel owners.
- Keep external/financial commitments human-gated.
- Prefer event-driven state transitions over manual task creation.
- A new confirmed event should reconcile stale automatic work.
- Keep recommendations source-grounded and explainable.
- Do not alter unrelated areas while solving a narrow regression.
- Do not treat a project UUID remembered from chat as authoritative. Resolve the live project identity first. If a conversational fact is written into PPPP context, use the canonical project identity contract from `docs/CHATGPT_CONTEXT_BRIDGE.md`.
- AI-derived project context may be `observed` or `suggested`; it must not silently become an approved commercial/financial commitment.

## Before finishing a material change

1. Verify DB writes and current code.
2. Check regression projects appropriate to the change.
3. Run syntax/runtime/CI checks available for modified code.
4. Run Supabase advisors after DDL.
5. Append a row to `public.pppp_platform_changelog`.
6. Update `PPPP_CHANGELOG.md`.
7. Update `PPPP_MASTER_CONTEXT.md` if architecture, ownership, integrations, human gates or protected behavior changed.
8. Update `runtime-manifest.json` / `docs/ACTIVE_RUNTIME.md` when runtime ownership/load relationships changed.
9. If the change affects ChatGPT/OpenAI context behavior, update `docs/CHATGPT_CONTEXT_BRIDGE.md`.
10. If the change affects the primary daily user experience, update `docs/DAILY_OPERATING_SURFACES_2026-08-25.md` or its successor.

## Continuity rule

**The chat is not the platform memory.**

Chat history is useful context. Current GitHub `main`, live Supabase state and the canonical PPPP context/changelog are the durable source of operational truth.

Business facts discovered in a chat should become small, structured, source-attributed project context when they are durable enough to matter. Full conversation transcripts should not become the default project memory.

This protocol is intentionally simple so a future session can resume with the instruction: **“Vazhdo me PPPP.”**