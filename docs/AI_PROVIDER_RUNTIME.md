# PPPP AI Provider Runtime

## Scope

This document records the current production AI routing contracts. It is descriptive, not a target architecture. The current stack must stay behaviorally stable until a deliberate provider consolidation is implemented and tested.

## Current runtime chain

1. `pristeel-groq-rate-limit.js` loads from the ordered bootstrap as a compatibility layer.
2. It wraps `window.fetch` for legacy Groq-shaped chat-completions calls.
3. Without a configured Gemini key, those calls continue to the legacy Groq-shaped path with retry/token shaping.
4. With a configured Gemini key, the compatibility layer translates the same OpenAI/Groq-shaped request to the Gemini Developer API and translates the response back to an OpenAI-like shape.
5. The compatibility layer now also exposes `PSTAI.hasApiKey()` and `PSTAI.requestJson(options)` as the explicit application-facing request API. `requestJson` deliberately calls the current `window.fetch`, so existing GPT-OSS/Gemini/legacy routing remains intact.
6. `pristeel-gemini-test-ui-v1.js` loads later, provides the Gemini connectivity test/settings UI, and dynamically loads `pristeel-groq-gptoss-provider-v1.js`.
7. The GPT-OSS provider captures the previous `window.fetch`. When `pristeel_ai_provider === "groq-gptoss"` and a Groq key exists, it intercepts Groq chat-completions requests and sends them directly to Groq with XHR using `openai/gpt-oss-20b`.
8. When GPT-OSS is not active, that later wrapper delegates to the previous fetch chain.

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

## First migrated application caller

`pristeel-email-offer-intake-v1.js` is the first application surface migrated to the explicit API.

It now:

- obtains the AI service through `window.PSTAI`
- checks availability through `PSTAI.hasApiKey()`
- requests structured JSON through `PSTAI.requestJson(...)`
- preserves the same model, messages, temperature, token budget and JSON response requirement
- keeps the same deterministic non-AI fallback when no configured AI route is available

It no longer reads `pristeel_apikey` directly and no longer contains the Groq chat-completions endpoint.

## Audited active runtime callsites after the first migration

The remaining legacy **application** callers that still contain direct Groq-shaped requests are:

- `pristeel-gmail-audit.js`
- `pristeel-procurement.html`
- `pristeel-project-analysis.js`

Provider/compatibility implementation files still contain the Groq endpoint by design:

- `pristeel-groq-rate-limit.js`
- `pristeel-groq-gptoss-provider-v1.js`

Gemini API-base usage remains limited to:

- `pristeel-gemini-test-ui-v1.js`
- `pristeel-groq-rate-limit.js`

`PSTAI` is now used by the provider stack plus the first migrated application caller:

- `pristeel-email-offer-intake-v1.js`
- `pristeel-groq-rate-limit.js`
- `pristeel-gemini-test-ui-v1.js`
- `pristeel-groq-gptoss-provider-v1.js`

Global `window.fetch` monkey-patching is not AI-only. It remains present in:

- `pristeel-groq-rate-limit.js`
- `pristeel-groq-gptoss-provider-v1.js`
- `pristeel-drive-intelligence.js`

That Drive wrapper is independent of the AI provider stack and must not be removed as collateral damage during AI consolidation.

The exact file/count inventory is enforced by `scripts/ai-runtime-callsite-inventory.mjs`. Any change requires deliberate review and an allowlist update.

## Why compatibility is still required

Three application surfaces still use the legacy Groq-shaped contract. For example, `pristeel-project-analysis.js` still:

- reads `localStorage.getItem('pristeel_apikey')`
- uses the legacy model names `llama-3.1-8b-instant` and `llama-3.3-70b-versatile`
- posts to `https://api.groq.com/openai/v1/chat/completions`

Therefore the Groq-shaped compatibility/interception path is still live. Removing it before migrating all three remaining application caller surfaces would break current AI behavior.

## Consolidation boundary

The safe sequence is:

1. keep the provider-contract and callsite-inventory guards green;
2. keep `PSTAI.requestJson` routing through the existing wrapper stack while legacy callers remain;
3. migrate remaining application callers one at a time: Gmail audit, inline application callers, then project analysis;
4. remove direct caller access to `pristeel_apikey` only after all callers are migrated;
5. centralize Settings ownership only after wrapper order is no longer required;
6. remove AI-specific global fetch monkey-patching only after no production caller depends on the Groq-shaped interception path, while preserving the independent Drive Intelligence fetch wrapper;
7. move provider secrets server-side as a separate security change, not bundled into the compatibility refactor.
