# PPPP Edge Function Runtime

Status snapshot: 2026-08-15.

This document tracks the server-side Supabase Edge Functions that are part of the PRISTEEL PPPP production workflow. Repository copies under `supabase/functions/` are the canonical reviewed source for future changes. Supabase remains the live deployment target.

## gmail-tracker

Production version at this snapshot: **v6**.

Purpose:
- read the `sales@prissteel.com` Gmail mailbox through the configured Google service account;
- identify actual RFQ replies;
- maintain supplier contact recency;
- create supplier SLA follow-up tasks for unanswered RFQs.

Safety contracts:
- `verify_jwt` is intentionally disabled because the pg_cron caller uses custom server-to-server authentication;
- every non-OPTIONS request must pass `x-pppp-cron-secret`;
- the secret is generated/stored in Supabase Vault as `gmail_tracker_cron_secret` and is never stored in repository source;
- validation is performed by `public.gmail_tracker_cron_authorized(text)`, executable by `service_role`, not browser roles;
- Google service-account OAuth uses `urn:ietf:params:oauth:grant-type:jwt-bearer`;
- RFQ auto-reply matching requires sender + normalized subject + reply time after the RFQ was sent;
- one incoming message may mark at most one RFQ;
- `scan_preview` performs the same matching without writes;
- SLA task creation skips terminal projects: `humbur`, `arkivuar`, `mbyllur`, `realizuar`;
- `fituar` is deliberately not terminal for supplier procurement because won projects may still require purchasing/execution RFQs.

Cron:
- job: `gmail-tracker-hourly`;
- schedule: minute 05 every hour;
- cron reads the shared secret directly from Supabase Vault and sends it as `x-pppp-cron-secret`.

Operational verification on 2026-08-15:
- unauthenticated request returned HTTP 401;
- authenticated cron command returned HTTP 200;
- latest audited run scanned 56 messages from 23 senders, produced 0 RFQ matches and 0 new SLA tasks;
- two historical false-positive `replied_at` values caused by the former sender-only matcher were reconciled with audit notes;
- no RFQ currently has `replied_at < sent_at`;
- no open task remains on a terminal project.

## hubspot-sync

Production version at this snapshot: **v5**.

Purpose:
- pull HubSpot deals, companies and contacts into the PPPP CRM mirror;
- retain the protected `push_deal` capability for controlled server-side use.

Safety contracts:
- `verify_jwt` is intentionally disabled because pg_cron uses custom server-to-server authentication;
- every non-OPTIONS request must pass `x-pppp-cron-secret`;
- the secret is generated/stored in Supabase Vault as `hubspot_sync_cron_secret`;
- validation is performed by `public.hubspot_sync_cron_authorized(text)`, executable by `service_role`, not browser roles.

Cron:
- job: `hubspot-sync-every-15min`;
- schedule: every 15 minutes;
- cron reads the shared secret directly from Vault.

Operational verification on 2026-08-15:
- unauthenticated request returned HTTP 401;
- authenticated cron command returned HTTP 200 and synced 27 deals, 865 companies and 1004 contacts.

## github-deploy

Production version at this snapshot: **v2**, intentionally retired.

The former function was an unauthenticated GitHub mutation helper capable of reading, writing and deleting files on `main` with a server-side GitHub token. The production audit found no current repository caller and no cron dependency.

Current contract:
- `verify_jwt` is enabled;
- source contains no `GITHUB_TOKEN` access and no GitHub mutation logic;
- authenticated execution only returns HTTP 410 explaining that the function is retired;
- repository changes must continue through guarded branch/PR/CI workflows.

## Change discipline

For future Edge Function changes:
1. edit the corresponding source under `supabase/functions/<function>/` on a branch;
2. run `tests/edge-functions-security-smoke.js` and the full PPPP test suite;
3. review/merge through PR;
4. deploy the reviewed source to Supabase;
5. verify the live function and its caller after deployment;
6. update this document when runtime contracts, auth, cron schedules or deployment ownership change.

Never place Vault secrets, Google credentials, HubSpot tokens, GitHub tokens or Supabase service-role keys in repository source, logs or test fixtures.
