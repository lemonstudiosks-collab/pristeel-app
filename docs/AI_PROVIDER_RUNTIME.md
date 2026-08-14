# PPPP AI Provider Runtime

## Scope

This document records the current production AI routing contracts. It is descriptive, not a target architecture. The current stack must stay behaviorally stable until a deliberate provider consolidation is implemented and tested.

## Current runtime chain

1. `pristeel-groq-rate-limit.js` loads from the ordered bootstrap as a compatibility layer.
2. It wraps `window.fetch` for legacy Groq-shaped chat-completions calls.
3. Without a configured Gemini key, those calls continue to the legacy Groq-shaped path with retry/token shaping.
4. With a configured Gemini key, the compatibility layer translates the same OpenAI/Groq-shaped request to the Gemini Developer API and translates the response back to an OpenAI-like shape.
5. The compatibility layer exposes `PSTAI.hasApiKey()` and `PSTAI.requestJson(options)` as the explicit application-facing request API. `requestJson` deliberately calls the current `window.fetch`, so existing GPT-OSS/Gemini/legacy routing remains intact.
6. `PSTAI.requestJson` classifies response-level failures with `pstAiCode`: `MISSING_KEY`, `HTTP`, `EMPTY`, and `INVALID_JSON`. Network/transport failures are deliberately not converted and still propagate as transport errors.
7. `pristeel-gemini-test-ui-v1.js` loads later, provides the Gemini connectivity test/settings UI, and dynamically loads `pristeel-groq-gptoss-provider-v1.js`.
8. The GPT-OSS provider captures the previous `window.fetch`. When `pristeel_ai_provider === "groq-gptoss"` and a Groq key exists, it intercepts Groq chat-completions requests and sends them directly to Groq with XHR using `openai/gpt-oss-20b`.
9. When GPT-OSS is not active, that later wrapper delegates to the previous fetch chain.

## Browser storage contracts

Current keys are intentionally preserved:

- `pristeel_apikey`: legacy caller/compatibility marker
- `pristeel_gemini_apikey`: Gemini browser key
- `pristeel_gemini_model`: selected Gemini model
- `pristeel_groq_apikey`: Groq browser key
- `pristeel_ai_provider`: active provider selector

Compatibility marker values currently include:

- `__GEMINI_COMPAT__`
- `__GROQ_GPTOSS_COMPAT__`

Do not rename or remove these until all current callers are migrated.

## Current public browser API

The provider stack extends `window.PSTAI` with current provider/model information, Gemini configuration/testing, Groq testing and GPT-OSS activation/deactivation.

The compatibility layer additionally owns:

- `PSTAI.hasApiKey()`
- `PSTAI.requestJson(options)`

Both provider UI layers currently decorate `window.renderSettings`; the Gemini compatibility layer also bridges the legacy `window.saveApiKey` function.

## Migrated application callers

### 1. Email Offer Intake

`pristeel-email-offer-intake-v1.js` now:

- obtains the AI service through `window.PSTAI`
- checks availability through `PSTAI.hasApiKey()`
- requests structured JSON through `PSTAI.requestJson(...)`
- preserves the same model, messages, temperature, token budget and JSON response requirement
- keeps the same deterministic non-AI fallback when no configured AI route is available

It no longer reads `pristeel_apikey` directly and no longer contains the Groq chat-completions endpoint.

### 2. Gmail Audit

`pristeel-gmail-audit.js` is the second migrated application surface.

It now:

- resolves the current AI service through `window.PSTAI`
- uses `PSTAI.hasApiKey()` instead of reading `pristeel_apikey`
- submits the same `llama-3.1-8b-instant` request contract through `PSTAI.requestJson(...)`
- preserves the same 4,000-token budget and JSON response requirement
- preserves its prior batch behavior: HTTP, empty-content and invalid-JSON response failures skip the affected AI batch, while network/untyped transport failures still propagate and stop the audit
- keeps its internal progress namespace exactly `VERSION='20260801-1'`, so existing saved Gmail Audit progress is not reset by this migration

It no longer contains the Groq endpoint or direct AI-key storage access.

## Audited active runtime callsites after the second migration

The remaining legacy **application** callers that still contain direct Groq-shaped requests are now only:

- `pristeel-procurement.html`
- `pristeel-project-analysis.js`

Provider/compatibility implementation files still contain the Groq endpoint by design:

- `pristeel-groq-rate-limit.js`
- `pristeel-groq-gptoss-provider-v1.js`

Gemini API-base usage remains limited to:

- `pristeel-gemini-test-ui-v1.js`
- `pristeel-groq-rate-limit.js`

`PSTAI` is now used by the provider stack plus the two migrated application callers:

- `pristeel-email-offer-intake-v1.js`
- `pristeel-gmail-audit.js`
- `pristeel-groq-rate-limit.js`
- `pristeel-gemini-test-ui-v1.js`
- `pristeel-groq-gptoss-provider-v1.js`

Global `window.fetch` monkey-patching is not AI-only. It remains present in:

- `pristeel-groq-rate-limit.js`
- `pristeel-groq-gptoss-provider-v1.js`
- `pristeel-drive-intelligence.js`

That Drive wrapper is independent of the AI provider stack and must not be removed as collateral damage during AI consolidation.

The exact file/count inventory, including the typed `pstAiCode` use sites, is enforced by `scripts/ai-runtime-callsite-inventory.mjs`. Any change requires deliberate review and an allowlist update.

## Why compatibility is still required

Two application surfaces still use the legacy Groq-shaped contract. `pristeel-project-analysis.js`, for example, still:

- reads `localStorage.getItem('pristeel_apikey')`
- uses the legacy model names `llama-3.1-8b-instant` and `llama-3.3-70b-versatile`
- posts to `https://api.groq.com/openai/v1/chat/completions`

The application HTML also still contains four direct Groq chat-completions callsites. Therefore the Groq-shaped compatibility/interception path remains live.

## Consolidation boundary

The safe sequence is:

1. keep the provider-contract, typed-error smoke and callsite-inventory guards green;
2. keep `PSTAI.requestJson` routing through the existing wrapper stack while legacy callers remain;
3. migrate the remaining application callers one surface at a time: inline application callers, then project analysis;
4. remove direct caller access to `pristeel_apikey` only after all application callers are migrated;
5. centralize Settings ownership only after wrapper order is no longer required;
6. remove AI-specific global fetch monkey-patching only after no production caller depends on the Groq-shaped interception path, while preserving the independent Drive Intelligence fetch wrapper;
7. move provider secrets server-side as a separate security change, not bundled into the compatibility refactor.
