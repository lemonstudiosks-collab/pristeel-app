# PPPP ↔ ChatGPT / OpenAI Context Bridge

## Purpose

PPPP remains the source of truth. ChatGPT/OpenAI is a reasoning and extraction layer, not a second project database.

The bridge stores only durable business facts, decisions, assumptions and evidence that are useful to a project. It does not store full ChatGPT transcripts.

## Canonical storage

`public.pppp_project_context_facts`

Current facts are read through:

`public.pppp_project_context_current_v`

Writes use the existing invoker-security RPC:

`public.pppp_ingest_context_fact_v1`

Each fact carries:

- project identity
- category / subject / fact key
- structured JSON value
- source type (`chatgpt`, `email`, `phone`, `document`, `system`, `user`, `api`, `other`)
- source reference
- evidence status (`unverified`, `observed`, `verbal`, `documented`, `confirmed`)
- confidence
- fact status (`observed`, `suggested`, `dismissed`)
- idempotency / supersession provenance

## OpenAI server bridge

Supabase Edge Function:

`pppp-openai-context`

The function requires an authenticated PPPP user JWT and supports two modes:

1. **Direct fact ingest**
   - receives already structured facts from ChatGPT/another trusted integration
   - writes them through `pppp_ingest_context_fact_v1`

2. **OpenAI extraction**
   - receives source text plus `project_id`
   - calls the OpenAI Responses API
   - extracts strict structured project facts
   - writes only observed/suggested facts

The OpenAI API key is server-side only:

`OPENAI_API_KEY`

Optional model override:

`OPENAI_CONTEXT_MODEL`

Default model:

`gpt-5.6-luna`

Browser code must never receive the OpenAI API key.

## Human-gate contract

The extraction prompt and database contract must not create approved/committed business states. AI may observe or suggest, but it must not autonomously:

- send external email
- approve a final client offer
- choose the final selling price or margin
- commit a supplier
- create a PO or contract commitment
- mark a project won/lost

## Runtime consumption

`pristeel-project-classification-v1.js` now exposes:

`window.PSTProjectContextBridge`

When a project is active, it loads current canonical context facts and publishes them to:

- `window.__pstPPPPContextFacts`
- `window.__pstIntegrityLastData.contextFacts` when the active snapshot matches
- event `pst:project-context-ready`

This lets existing project/workflow/commercial modules consume the same canonical context without introducing a second workflow engine.

## Example

Eurosteel phone pricing for Dukley should be represented as four durable facts with:

- source type: `phone`
- evidence status: `verbal`
- fact status: `observed`

A suggested design assumption for SSP Siren Poles stays:

- source type: `chatgpt`
- evidence status: `unverified`
- fact status: `suggested`

The distinction prevents an AI suggestion from silently becoming a confirmed commercial or technical commitment.
