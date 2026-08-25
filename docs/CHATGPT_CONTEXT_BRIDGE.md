# PPPP ChatGPT / OpenAI Context Bridge

## Purpose

The bridge exists so durable business facts discovered or confirmed during AI-assisted work can become canonical PPPP project context instead of remaining trapped in a chat transcript.

PPPP remains the source of truth. ChatGPT/OpenAI is an extraction and reasoning layer, not a second project database.

## Live backend

Supabase project: `isymxqfqzkchbsrbhucf`

Edge Function:

- `pppp-openai-context`
- current deployed version: **v3**
- `verify_jwt = true`

Canonical storage/read contracts:

- `public.pppp_project_context_facts`
- `public.pppp_project_context_current_v`
- `public.pppp_ingest_context_fact_v1(...)`

The current view excludes dismissed facts and keeps the latest active fact per `(project_id, fact_key)`.

## Supported intake

The edge function accepts either:

1. already structured `facts[]`; or
2. source `content`, which may be extracted through the OpenAI Responses API when `OPENAI_API_KEY` is configured in the Edge Function environment.

Default extraction model is `gpt-5.6-luna`, unless `OPENAI_CONTEXT_MODEL` overrides it.

Source types:

- `chatgpt`
- `email`
- `phone`
- `document`
- `system`
- `user`
- `api`
- `other`

Evidence states:

- `unverified`
- `observed`
- `verbal`
- `documented`
- `confirmed`

Automated fact state is restricted to:

- `observed`
- `suggested`

## Project identity safety, v3

Never trust a project UUID remembered from a conversation.

The bridge supports:

- `project_id`
- `project_name`
- `project_ref`
- `project_query`

Rules:

- If `project_id` is supplied alone, it must resolve to a visible project.
- If `project_id` plus a name/ref/query hint are supplied, the hint must exactly match the resolved project's normalized canonical identity.
- If no UUID is supplied, the bridge resolves only an **exact normalized** project name/ref/business-ref match.
- Zero matches return `project_identity_not_found`.
- Multiple matches return `project_identity_ambiguous` and ingest nothing.
- A UUID/hint conflict returns `project_identity_mismatch` and ingest nothing.
- The bridge must never fuzzy-autoselect between projects.

This guard was added after a live audit on 2026-08-25 found manually seeded conversational context attached to the wrong projects. The historical rows were retained for audit, marked `dismissed`, and correct copies were inserted through the canonical ingest RPC.

## Human gates

The bridge must not create an approved/committed business state from AI output.

It must never automatically:

- send an external email;
- approve the final client offer;
- choose a final selling price or margin;
- commit a supplier;
- create a PO or contract commitment;
- mark a project won/lost;
- turn an assumption into a confirmed fact.

AI may extract observations and suggestions. Human approval remains authoritative for commitments.

## ChatGPT account limitation

This bridge does **not** give PPPP unrestricted access to a user's personal ChatGPT conversation history or ChatGPT Memory.

The intended flow is:

```text
ChatGPT / AI-assisted work
        ↓ durable fact or suggestion
pppp-openai-context
        ↓
pppp_ingest_context_fact_v1
        ↓
pppp_project_context_facts
        ↓
pppp_project_context_current_v
        ↓
Project Workspace / Project Intelligence / future PPPP automations
```

Do not store entire chat transcripts when a smaller structured fact with provenance is sufficient.

## Provenance example

A supplier price reported by phone should be stored as a structured value with:

- `source_type = phone`
- a traceable `source_ref`
- `evidence_status = verbal`
- an appropriate confidence

It should not be upgraded to `documented` or `confirmed` until written evidence exists.

## Regression facts repaired on 2026-08-25

Canonical identities used in the repair:

- Dukley: `6e0d2d19-3a51-4079-882f-b73f81cbe95e`
- SSP EWAS Siren Poles: `25f7c374-6830-4cae-b2b5-bd5d694c00e0`
- TenneT / SPIE: `c937aea1-af5e-4807-ae1e-e36864e46794`

Current context after repair:

- Dukley owns the verbal Eurosteel production / galvanizing / paint-over-galvanizing / installation rates.
- SSP owns the 67-pole, 6/9/12 m, five-siren-type and incomplete-mapping context.
- TenneT no longer inherits those unrelated facts.

Do not hard-code these UUIDs into conversational logic. They are listed here only as an audit record; runtime ingestion must use the identity guard above.
