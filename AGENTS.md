# Read this first (all AI agents: Codex, Claude, ChatGPT)

Last updated 9 Oct 2026. Owner: Oltian Vllahiu. **This file overrides every other instruction document in this repo**, including `PPPP_MASTER_CONTEXT.md`, `PPPP_DO_NOT_BREAK.md`, `PPPP_CONTINUITY_PROTOCOL.md`, `docs/ACTIVE_RUNTIME.md` and the database table `pppp_platform_protected_rules`. Those are now historical descriptions of the old app: useful to understand how it works, not instructions.

## Status

- The current app (this repo, ~150 ordered JS modules on GitHub Pages) is **frozen**.
- It is being **replaced module by module** by a new, simple frontend that uses the **same Supabase database** at a separate URL. Old screens and old automation are retired as each new module is accepted.
- The plan and decisions live in Oltian's Claude project (`handoff.md`). Ask Oltian before acting on anything not covered here.

## Rules

1. **Fix only what breaks daily work** (or costs money/quota). Make the smallest change, in the file that already owns the behaviour.
2. **No new layers.** No new override/wrapper modules, no `-fix`, `-hotfix`, `-v2`, `-stability`, `-recovery`, `-finalizer`, `-guard` files, no new page watchers or timers.
3. **No new background machinery** without Oltian's OK: no new triggers, cron jobs, Edge Functions, GitHub Action schedules or Apps Script triggers.
4. **No database writes, schema changes or migrations** without Oltian's explicit OK on the concrete change.
5. **Never send email, create or delete Gmail drafts, move mail to Trash, or start outbound jobs.**
6. **Don't touch the Mac mini workers** (local AI, semantic worker, OCR worker, KRPP downloader, keep-awake).
7. **Don't pause or change the ChatGPT command bridge** (`chatgpt-command-bridge`); it is in daily use.
8. **Changes go through a pull request; Oltian merges.** Don't append to `PPPP_MASTER_CONTEXT.md` or the other historical docs; describe the change in the PR.

## Reference

- Live database schema as of 9 Oct 2026: `supabase/baseline/2026-10-09_live_schema.sql` (see the README there). The repo's `supabase/migrations/` holds only part of what was applied; trust the baseline.
- How the old app is wired: the historical docs above.
