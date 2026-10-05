# SPIE Workspace · Phase 1

Canonical source: GitHub main + Supabase awqfpnzqwfjrjefoktgd. Project: c937aea1-af5e-4807-ae1e-e36864e46794.
Route: `spie/` relative to the existing Pages base URL; root deployments expose `/spie/`. Home shortcut and `?view=spie` are included.

Dedicated document, sidebar (Overview, Projects, Finance, Partners, Files, Emails), executive overview, source links and bounded project metadata. Only the dedicated document loads these modules. Global runtime order, Finance engines, Gmail ingestion and Google authorizations are unchanged.

## Read contract

- Overview: authenticated stable RPC `pppp_chatgpt_project_snapshot_v1` (6 emails, 8 facts, 6 tasks, 3 documents) and 3 project_docs metadata rows. The RPC also bounds supplier decision rows at 20 internally.
- Files: up to 50 project_docs metadata rows, never physical files or base64.
- Emails: up to 40 project_emails metadata rows, original thread links, no message-body copying.
- Partners: up to 40 project_contacts; no global company/contact scan.
- Finance: up to 50 customer invoices, 50 supplier invoices, 20 guarantees, 30 commercial registry documents/payment plans, and 50 contract/document metadata rows.
- Five-minute in-memory coalescing per access token. No timed refresh, polling, realtime, schema changes or writes.
- Existing PPPP session is required; it is never logged, copied into URLs or replaced. JWT project/role/expiry are checked, with backend authorization/RLS authoritative. The adapter does not create an anonymous fallback, a new PIN or refresh-token owner.
- An expired session requires the existing PPPP re-entry flow, then return to SPIE. Another-tab logout/account switch immediately clears the displayed project view. Failed reads preserve uncertainty and display the actual error.

## Evidence rules and limits

Samples is the operator-declared phase as of 05 Oct 2026; canonical pricing remains unchanged and visible as a discrepancy. Later explicit canonical stages take precedence. Stage position does not imply previous stages completed.

Sample production/delivery review is a proposal derived from the exact linked 02 Oct SPIE request. The requested date is not a commitment. Official order receipt remains unverified. No sent draft, supplier choice, contract, payment or won/lost outcome is assumed.

Health is Unknown unless current observed context explicitly supplies project_health.<domain>.status and evidence/source_ref. Latest drawing revision is Unknown unless document metadata explicitly has is_latest:true and revision_verified:true. Filenames/timestamps alone never prove release status.

Files stay in Drive. Categories derive from stored doc_type or explicit JSON notes.category. Optional existing JSON notes supports revision/drawing_revision, document_key, document_kind, is_latest and revision_verified. No metadata is written in Phase 1. Unclassified metadata remains visible. File metadata may be incomplete relative to the existing Drive dossier; the permanent folder link gives access to the whole dossier.

Email context labels are clearly suggestions based on subjects. Only strict project links are read; needs_review links remain visibly unverified.

Finance keeps each currency separate. Missing currencies stay Unknown; bank guarantee currency is unavailable in the current schema. No cash is inferred. Unpaid invoice face values are labelled and may differ from outstanding balances due to partial payments. No-record and failed-read states are Unknown, not zero. Signed contract values require explicit signed/executed document status. Offers and payment plans do not become signed contracts or receivables. All lists are bounded; totals are partial when caps are reached.

SPIE/AKTIVA roles are operator-provided, not commercial commitments. Importer identity/German territory remains unverified without explicit canonical contact evidence.

What changed shows timestamped latest evidence updates. It does not fabricate a historical delta.

## Verification

Run `node --test tests/spie-workspace-smoke.mjs` and syntax checks for spie/workspace.js and spie/data.mjs. Focused browser acceptance uses intercepted fixture responses (no real Supabase reads) for six views, lazy loading, currency separation, empty/error states, logout, repeated navigation and viewport overflow. Live permissions/signature for the bounded snapshot RPC were checked without changing permissions.

## Phase 2

Confirm and register the canonical Samples phase through the approved write bridge, normalize sample commitments and project health, enrich verified revision/category metadata and importer identity, improve contract/retention/importer cost evidence, exact partial-payment balances, richer Drive inventory/Google account linking and email context, and real historical change comparison. Preserve all human approval gates.

No migration or Supabase business write was required.
