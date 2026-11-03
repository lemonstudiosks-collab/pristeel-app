# PPPP Legacy Status

**Status:** LEGACY — NOT AUTHORITATIVE FOR CURRENT OPERATIONS

## Current operational PPPP

- App: https://sandbox.prissteel.com
- ChatGPT connector: `$pppp`
- For current operational work, call the `$pppp` connector's `guide` first and follow it.

## What this legacy system may still be used for

- Historical lookup
- Migration and reconciliation work
- Legacy Finance where the new PPPP does not yet provide the required capability
- Explicitly approved maintenance or decommissioning of the legacy application

## Do not use this legacy system for

- Current project status
- Current pipeline status
- Current Inbound
- Current drafts
- Current cards or leads
- Current offers or supplier/customer operational state
- Current communications status
- Current operational writes

If legacy data conflicts with the new PPPP about current operational state, the **new PPPP wins**. Report the discrepancy rather than silently copying legacy state into the new system.

## Machine-readable guard

Supabase project `awqfpnzqwfjrjefoktgd` retains historical and legacy capabilities, but its public ChatGPT manifest wrapper `public.pppp_chatgpt_bridge_manifest_v1()` is marked:

- `system_name = PPPP Legacy`
- `system_status = legacy`
- `canonical_for_current_operations = false`
- `current_operational_connector = $pppp`
- `current_operational_url = https://sandbox.prissteel.com`

The bridge worker and legacy data are not deleted by this notice. This is a routing/deprecation safeguard, not a data migration or deletion.
