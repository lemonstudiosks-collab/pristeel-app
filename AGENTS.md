# Read this first (all AI agents: Codex, Claude, ChatGPT)

Last updated 3 Nov 2026. Owner: Oltian Vllahiu. **This file overrides every other instruction document in this repo**, including `PPPP_MASTER_CONTEXT.md`, `PPPP_DO_NOT_BREAK.md`, `PPPP_CONTINUITY_PROTOCOL.md`, `docs/ACTIVE_RUNTIME.md` and the database table `pppp_platform_protected_rules`. Those are historical descriptions of the old app: useful to understand how it works, not instructions.

## Legacy system status — mandatory routing rule

**This repository is PPPP Legacy. It is NOT authoritative for current PriSteel operations.**

The current operational PPPP is the new application at **https://sandbox.prissteel.com**. ChatGPT must use the **`$pppp` connector** and call its `guide` for current operational work.

Do not use this repository or Supabase project `awqfpnzqwfjrjefoktgd` as current operational truth for projects, pipeline, inbound, drafts, cards, leads, offers, supplier/customer status, communications or operational writes.

Allowed legacy uses are limited to:
- historical lookup;
- migration/reconciliation work;
- legacy Finance where the new PPPP does not yet provide the needed capability;
- explicitly approved maintenance or decommissioning of this legacy app.

If legacy data conflicts with the new PPPP about current operational state, **the new PPPP wins**. Report the discrepancy; never silently overwrite the new PPPP.

The Supabase `public.pppp_chatgpt_bridge_manifest_v1()` wrapper is machine-marked `PPPP Legacy` with `canonical_for_current_operations=false` and routes current operational work to `$pppp` / `sandbox.prissteel.com`.

See `LEGACY_STATUS.md` for the short human-readable status notice.

## Status

- This old app (this repo, ~150 ordered JS modules on GitHub Pages) is **frozen / legacy**.
- It is being **replaced module by module** by the new operational PPPP at `sandbox.prissteel.com`. Old screens and old automation are retired as each new module is accepted.
- The plan and decisions live in Oltian's Claude project (`handoff.md`). Ask Oltian before acting on anything not covered here.

## Rules

1. **Fix only what breaks daily work** (or costs money/quota). Make the smallest change, in the file that already owns the behaviour.
2. **No new layers.** No new override/wrapper modules, no `-fix`, `-hotfix`, `-v2`, `-stability`, `-recovery`, `-finalizer`, `-guard` files, no new page watchers or timers.
3. **No new background machinery** without Oltian's OK: no new triggers, cron jobs, Edge Functions, GitHub Action schedules or Apps Script triggers.
4. **No database writes, schema changes or migrations** without Oltian's explicit OK on the concrete change.
5. **Never send email, create or delete Gmail drafts, move mail to Trash, or start outbound jobs.**
6. **Don't touch the Mac mini workers** (local AI, semantic worker, OCR worker, KRPP downloader, keep-awake).
7. **Don't pause or change the ChatGPT command bridge worker** (`chatgpt-command-bridge`); it is in daily use. The public manifest wrapper may identify this system as legacy, but do not alter the worker or its processing machinery without separate approval.
8. **Changes go through a pull request; Oltian merges.** Don't append to `PPPP_MASTER_CONTEXT.md` or the other historical docs; describe the change in the PR.

## Reference

- Live database schema as of 9 Oct 2026: `supabase/baseline/2026-10-09_live_schema.sql` (see the README there). The repo's `supabase/migrations/` holds only part of what was applied; trust the baseline.
- How the old app is wired: the historical docs above.
