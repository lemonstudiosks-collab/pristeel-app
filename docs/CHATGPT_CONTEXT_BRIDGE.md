# PPPP ChatGPT / OpenAI Bridge

## Purpose

The bridge has two complementary jobs:

1. durable business facts discovered or confirmed during AI-assisted work can become canonical PPPP project context instead of remaining trapped in a chat transcript; and
2. the user can ask PPPP questions in natural language from Home or from a Project Workspace and receive an answer grounded in live PPPP data.

PPPP remains the source of truth. OpenAI is a reasoning/extraction layer, not a second project database or a second workflow engine.

## Live backend

Supabase project: `isymxqfqzkchbsrbhucf`

### Durable context Edge Function

- `pppp-openai-context`
- current deployed version: **v3**
- `verify_jwt = true`

Canonical storage/read contracts:

- `public.pppp_project_context_facts`
- `public.pppp_project_context_current_v`
- `public.pppp_ingest_context_fact_v1(...)`

The current view excludes dismissed facts and keeps the latest active fact per `(project_id, fact_key)`.

### Operating assistant Edge Function

- `pppp-openai-assistant`
- first deployed version: **v1** on 2026-08-25
- `verify_jwt = true`
- OpenAI is called only from the server-side Edge Function. The OpenAI API key is not exposed in the browser.
- default model follows `OPENAI_ASSISTANT_MODEL`, then `OPENAI_CONTEXT_MODEL`, with `gpt-5.6-luna` as the final configured fallback.

The assistant is **read-only**. It reads the current user-visible PPPP project/task/email/context/commercial records, optionally receives the richer current Project Intelligence context, and returns:

- a grounded answer;
- confidence and uncertainty;
- one suggested next step;
- evidence labels;
- an optional validated project navigation target.

It does not perform business writes.

## User-facing runtime

`pristeel-openai-operating-assistant-v1.js` is loaded by `pristeel-redesign-finalizer-v1.js`.

It provides:

- one compact **PPPP AI / Pyete platformën** command bar on Home;
- only the latest answer is shown so Home does not become another long chat transcript;
- optional direct navigation to an existing project when the backend returns a validated project id;
- a server-side OpenAI transport for the existing `pristeel-project-intelligence-conversation-v1.js` project discussion surface;
- `PSTProjectContextBridge.ask(...)` as the common authenticated read-only assistant contract.

The old browser AI provider remains available for legacy/fallback functions, but the daily PPPP question flow no longer requires a browser OpenAI/Groq/Gemini key.

## Ask PPPP flow

```text
User question in PPPP
        ↓
pristeel-openai-operating-assistant-v1.js
        ↓ authenticated JWT
pppp-openai-assistant
        ↓ read-only live PPPP records
OpenAI Responses API
        ↓ structured answer
PPPP Home / Project Intelligence
```

This is intentionally different from a generic chatbot. The assistant reasons over the platform's current operational records and uses existing project navigation instead of creating a parallel task/project state model.

## Supported durable-context intake

`pppp-openai-context` accepts either:

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

The durable context bridge supports:

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

The operating assistant applies the same principle to explicit project-scoped questions: supplied project identity is validated against the projects visible to the authenticated PPPP user. A navigation target returned by the model is accepted only if the id exists in that live project set.

This guard was added after a live audit on 2026-08-25 found manually seeded conversational context attached to the wrong projects. The historical rows were retained for audit, marked `dismissed`, and correct copies were inserted through the canonical ingest RPC.

## Human gates

Neither bridge may create an approved/committed business state from AI output.

They must never automatically:

- send an external email;
- approve the final client offer;
- choose a final selling price or margin;
- commit a supplier;
- create a PO or contract commitment;
- mark a project won/lost;
- turn an assumption into a confirmed fact.

AI may explain, calculate, extract observations, propose drafts and suggest next actions. Human approval remains authoritative for commitments.

## ChatGPT account limitation

This integration does **not** give PPPP unrestricted access to a user's personal ChatGPT conversation history or ChatGPT Memory.

The durable-fact flow remains:

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
Project Workspace / Project Intelligence / PPPP automations
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