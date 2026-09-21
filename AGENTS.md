# PPPP V2 Development Rules

PPPP is a live production business system.

## Branches
- `main` is LIVE PRODUCTION. Never commit or push directly to `main`.
- `v2` is the V2 integration branch.
- All active development must happen on a feature branch created from `v2`.
- The current working branch is expected to be a `feature/...` branch.

## Legacy application
- Existing PPPP production files are LEGACY and must not be modified unless explicitly instructed.
- New PPPP V2 development belongs under `v2-app/`.
- Do not "clean up", rename, delete, or reorganize legacy code opportunistically.

## Production backend
- Production Supabase must NEVER be used as a development environment.
- Do not modify production tables, functions, triggers, views, RLS, Edge Functions, cron jobs, storage, or data unless explicitly instructed.
- Do not change Gmail ingestion, outbound email, finance automation, OCR pipelines, tender automation, supplier workflows, or background jobs unless explicitly instructed.

## Secrets
- Never commit or expose passwords, API keys, service-role keys, database passwords, OAuth tokens, Google service-account credentials, or other secrets.
- Never place a Supabase service-role key in frontend code.

## Architecture
- PPPP V2 will initially replace the human-facing application while preserving the existing canonical backend where practical.
- Before changing existing backend behavior, identify upstream callers, downstream effects, triggers, scheduled jobs, and external integrations.
- Unknown behavior must be investigated rather than guessed.

## Safety
- Prefer additive and reversible changes.
- Do not deploy to production automatically.
- Do not merge V2 work into `main` unless explicitly instructed by a human.
- If an instruction could affect live business data or send something externally, stop and flag the risk first.
