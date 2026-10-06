# Material Trade controlled ChatGPT bridge repair — 2026-10-06

Production: `awqfpnzqwfjrjefoktgd`. Repository: `lemonstudiosks-collab/pristeel-app`, production `main`.

## Evidence and scope

The exact manifest SQL call succeeded through the connected Supabase tool before and after the repair. It delegates to v29 and advertises all 33 eligible countries. The previously reported OpenAI safety rejection occurs before Supabase execution; this Work session does not reproduce it and cannot diagnose the safety layer's internal reason or guarantee future background approvals.

Before the repair, 58 dach_steel_target receipts existed: 33 succeeded, 25 failed, zero pending/processing. All failures were contact_status constraint violations. The 25 recent failed sheet commands used verified_public, which is not an allowed canonical enum. They have exhausted three worker attempts. Their original rows/IDs/receipts remain untouched; automatic replay is unsafe because source review also found a placeholder email and claims that conflate production capacity with purchase tonnage.

The deployed worker (Edge version 11, bridge v29) consumes the same approved Commands sheet every ten minutes and records canonical receipts. Its terminal succeeded/rejected skip and three-attempt cap remain unchanged.

## Narrow changes

Migration: `20261006042651_material_trade_bridge_incremental_contract_repair.sql`.

- `pppp_chatgpt_upsert_dach_steel_target_v1`: retain omitted existing target fields during enrichment; append and deduplicate evidence in original order; merge supplied material_scope top-level keys. Validate contact/outreach enums with clear errors. Existing approved processing receipt checks, advisory locks, service-only privileges, source-key conflict handling and succeeded-command replay guard remain intact.
- `pppp_chatgpt_bridge_manifest_v29`: publish the existing contact/outreach enum values and incremental enrichment contract, including input evidence shape and calculated intelligence field paths. No transport or human gates changed.
- `pppp_dach_steel_contact_resolution_v1` (migration `20261006042935_material_trade_generic_contact_evidence_guard.sql`): keep an explicitly general mailbox classified as general when the same source claim also mentions purchasing phone-only contacts; do not infer an individual purchasing email.
- `pppp_chatgpt_dach_steel_target_v1`: grant only EXECUTE to the existing supabase_read_only_user. Function remains SECURITY INVOKER; no new table write privilege or RLS bypass introduced.

intelligence_profile and intelligence_refreshed_at are calculated by the existing intelligence trigger. intelligence_gaps is inside intelligence_profile, not a standalone column. Do not submit raw calculated profiles. Verified research is stored as claim/email/person/url evidence and approved material fields; the trigger refreshes the profile.

## Operating rules

1. Call the canonical manifest exactly once at run start. If any connector/safety call is rejected, stop and report it; never bypass it with another transport or direct business SQL.
2. Read bounded batches and reuse them. Enrich missing/high-value evidence only.
3. Keep EU + GB + CH + NO + IS + ME + RS, Tier 1 direct consumers / evidenced Tier 2, and existing eu:* keys unchanged. New keys use mt:<lowercase country>:<official domain>.
4. Approved dach_steel_target commands use the same command sheet and trusted worker. Allowed contact_status values: missing, searching, found, verified. Never verified_public.
5. Verify canonical command_status plus dach_steel_target read-back. Sheet status cells are not the receipt authority.
6. Never replay pending/succeeded commands; review exhausted failures separately. Match domains and existing source keys before any new registration.
7. No Projects, Partners, Contacts, Gmail drafts, email sends or commercial commitments arise from this action.

## Legitimate end-to-end probe

Command: `mt-enrich:20261006:hollandstaal-purchasing-phones`.
Existing target: `eu:nl:hollandstaal.nl`.
Source: https://www.hollandstaal.nl/contact/

Append only the published purchasing telephone routes for Rick Hoogeboom and Wim van Rijn. The company general email is not attributed to either person. Preserve sent state and all omitted business fields. Verify the normal scheduled worker result and the existing target's evidence/intelligence read-back. Do not submit a second sheet row to test replay; normal reprocessing skips the succeeded receipt.
