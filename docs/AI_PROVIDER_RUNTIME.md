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

`pristeel-email-offer-intake-v1.js` now uses `window.PSTAI`, `PSTAI.hasApiKey()` and `PSTAI.requestJson(...)`. Its model, prompt, temperature, token budget, JSON response requirement and deterministic no-AI fallback remain unchanged. It no longer reads `pristeel_apikey` or contains the Groq endpoint directly.

### 2. Gmail Audit

`pristeel-gmail-audit.js` now uses the explicit API while preserving its `llama-3.1-8b-instant` request, 4,000-token budget and batch behavior. HTTP, empty-content and invalid-JSON response failures still skip the affected AI batch; network/untyped failures still propagate. Its saved-progress namespace remains exactly `VERSION='20260801-1'`.

### 3. Inline BOM `startParsing()`

The BOM parser inside `pristeel-procurement.html` is the first migrated inline application caller.

It now:

- still runs `deterministicParseGermanMengenliste(text)` before checking AI availability, so recognized German Mengenliste/Materialauszug documents remain fully deterministic and AI-free
- resolves AI through `window.PSTAI` rather than reading `pristeel_apikey`
- sends each chunk through `PSTAI.requestJson(...)`
- preserves `llama-3.1-8b-instant`, temperature `0`, the 8,000-token request, prompt text, 8,000-character line-based chunking and maximum 12 chunks
- preserves chunk-level soft failure semantics: `HTTP` lowers confidence to `low`; `EMPTY` and `INVALID_JSON` lower it to `medium`; analysis continues with later chunks
- preserves untyped/network failure propagation to the existing outer catch, which still applies `{confidence:'low', issues:['Lidhja dështoi']}`
- preserves the existing missing-key UI text and the final merged BOM behavior

`startParsing()` no longer contains the Groq endpoint or direct `pristeel_apikey` access.

## Audited active runtime callsites after the third migration

Direct Groq-shaped **application** requests now remain only in:

- three other inline callers in `pristeel-procurement.html`
- `pristeel-project-analysis.js`

Provider/compatibility implementation files still contain the Groq endpoint by design:

- `pristeel-groq-rate-limit.js`
- `pristeel-groq-gptoss-provider-v1.js`

The application HTML still contains legacy key references for its three remaining AI callers plus the current Settings storage UI. Those Settings references are not application request callsites and will not be removed until Settings ownership is consolidated separately.

`PSTAI` is now used by the provider stack plus:

- `pristeel-email-offer-intake-v1.js`
- `pristeel-gmail-audit.js`
- `pristeel-procurement.html::startParsing()`

Global `window.fetch` monkey-patching remains present in:

- `pristeel-groq-rate-limit.js`
- `pristeel-groq-gptoss-provider-v1.js`
- `pristeel-drive-intelligence.js`

The Drive wrapper is independent and must not be removed as collateral damage.

The exact active-runtime file/count inventory is enforced by `scripts/ai-runtime-callsite-inventory.mjs`. The `startParsing()` behavior is additionally executed by `scripts/start-parsing-ai-smoke.mjs`.

## Why compatibility is still required

The legacy Groq-shaped interception path remains live because three inline application request callsites and `pristeel-project-analysis.js` have not yet been migrated. Project Analysis still reads `pristeel_apikey` and posts directly to the Groq-shaped endpoint.

## Consolidation boundary

The safe sequence is:

1. keep provider-contract, typed-error, callsite and per-caller behavior smokes green;
2. keep `PSTAI.requestJson` routing through the existing wrapper stack while legacy callers remain;
3. migrate the remaining inline callers separately: `parseOffer()`, `qAnalyzeOffer()`, then the `qAnalyzeAll()`/`qAnalyzeOne()` batch flow;
4. migrate `pristeel-project-analysis.js` last among application callers;
5. remove direct application access to `pristeel_apikey` only after all application request callers are migrated;
6. centralize Settings ownership only after wrapper order is no longer required;
7. remove AI-specific global fetch monkey-patching only after no production caller depends on the Groq-shaped interception path, while preserving the independent Drive Intelligence wrapper;
8. move provider secrets server-side as a separate security change.
