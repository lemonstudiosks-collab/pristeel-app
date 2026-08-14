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
7. `pristeel-gemini-test-ui-v1.js` loads later and dynamically loads `pristeel-groq-gptoss-provider-v1.js`.
8. When `pristeel_ai_provider === "groq-gptoss"` and a Groq key exists, the GPT-OSS wrapper sends Groq chat-completions calls directly by XHR using `openai/gpt-oss-20b`; otherwise it delegates to the previous fetch chain.

## Browser storage contracts

Current keys are intentionally preserved:

- `pristeel_apikey`: legacy caller/compatibility marker
- `pristeel_gemini_apikey`: Gemini browser key
- `pristeel_gemini_model`: selected Gemini model
- `pristeel_groq_apikey`: Groq browser key
- `pristeel_ai_provider`: active provider selector

Compatibility markers remain `__GEMINI_COMPAT__` and `__GROQ_GPTOSS_COMPAT__`. Do not rename or remove them until all current callers are migrated.

## Current public browser API

The provider stack extends `window.PSTAI` with provider/model information, Gemini configuration/testing, Groq testing, GPT-OSS activation/deactivation, `PSTAI.hasApiKey()` and `PSTAI.requestJson(options)`.

Both provider UI layers currently decorate `window.renderSettings`; the compatibility layer also bridges the legacy `window.saveApiKey` function.

## Migrated application callers

### 1. Email Offer Intake

`pristeel-email-offer-intake-v1.js` uses `window.PSTAI`, `PSTAI.hasApiKey()` and `PSTAI.requestJson(...)`. Its model, prompt, temperature, token budget, JSON requirement and deterministic no-AI fallback remain unchanged. It no longer reads `pristeel_apikey` or contains the Groq endpoint directly.

### 2. Gmail Audit

`pristeel-gmail-audit.js` uses the explicit API while preserving its `llama-3.1-8b-instant` request, 4,000-token budget and batch behavior. HTTP, empty-content and invalid-JSON response failures still skip the affected AI batch; network/untyped failures still propagate. Its saved-progress namespace remains exactly `VERSION='20260801-1'`.

### 3. Inline BOM `startParsing()`

The BOM parser in `pristeel-procurement.html` still runs `deterministicParseGermanMengenliste(text)` before checking AI availability. AI chunks now use `PSTAI.requestJson(...)` with the same model, prompt, 8,000-token budget, line-based 8,000-character chunks and 12-chunk cap. HTTP/EMPTY/INVALID_JSON remain soft per-chunk failures; network/untyped failures still reach the existing outer `Lidhja dështoi` fallback.

### 4. Inline supplier-offer `parseOffer()`

`parseOffer()` is the second migrated inline caller.

It now:

- preserves the existing text/supplier validation and exact missing-key text `Mungon API Key — shko te Cilësimet.`
- resolves AI through `window.PSTAI` and calls `PSTAI.requestJson(...)`
- preserves `llama-3.1-8b-instant`, temperature `0`, the 3,000-token budget, supplier/document prompt and system instruction
- keeps the downstream deterministic corrections for `Amount A`, `Summary A+B` and duplicated-weight text
- preserves all commercial-field mapping, local offer creation, optional Supabase persistence, `renderOffers()` and post-success reset behavior
- maps response-level `HTTP`, `EMPTY` and `INVALID_JSON` failures to the existing warning `⚠ Nuk u lexua saktë — provo të ngjitësh tekstin manualisht.` and returns without creating an offer
- preserves network/untyped failure propagation to the existing outer `Gabim: ...` status

`parseOffer()` no longer contains the Groq endpoint or direct `pristeel_apikey` access.

## Audited active runtime callsites after the fourth migration

Direct Groq-shaped **application** requests now remain only in:

- two inline request flows in `pristeel-procurement.html`: `qAnalyzeOffer()` and the `qAnalyzeAll()` / `qAnalyzeOne()` batch flow
- `pristeel-project-analysis.js`

Provider/compatibility implementation files still contain the Groq endpoint by design:

- `pristeel-groq-rate-limit.js`
- `pristeel-groq-gptoss-provider-v1.js`

The application HTML still contains four `pristeel_apikey` references: two remaining request flows plus current Settings storage UI references. Settings is a separate ownership cleanup.

`PSTAI` is now used by the provider stack plus:

- `pristeel-email-offer-intake-v1.js`
- `pristeel-gmail-audit.js`
- `pristeel-procurement.html::startParsing()`
- `pristeel-procurement.html::parseOffer()`

Global `window.fetch` monkey-patching remains in the two AI provider/compatibility layers and independently in `pristeel-drive-intelligence.js`. The Drive wrapper must not be removed as collateral damage.

The exact active-runtime file/count inventory is enforced by `scripts/ai-runtime-callsite-inventory.mjs`. Per-caller behavior is additionally executed by `scripts/start-parsing-ai-smoke.mjs` and `scripts/parse-offer-ai-smoke.mjs`.

## Why compatibility is still required

The legacy Groq-shaped interception path remains live because two inline application request flows and `pristeel-project-analysis.js` have not yet been migrated.

## Consolidation boundary

The safe sequence is:

1. keep provider-contract, typed-error, callsite and per-caller behavior smokes green;
2. keep `PSTAI.requestJson` routing through the existing wrapper stack while legacy callers remain;
3. migrate `qAnalyzeOffer()` next;
4. migrate the `qAnalyzeAll()` / `qAnalyzeOne()` batch flow separately;
5. migrate `pristeel-project-analysis.js` last among application callers;
6. remove direct application access to `pristeel_apikey` only after all application request callers are migrated;
7. centralize Settings ownership only after wrapper order is no longer required;
8. remove AI-specific global fetch monkey-patching only after no production caller depends on the Groq-shaped interception path, while preserving the independent Drive Intelligence wrapper;
9. move provider secrets server-side as a separate security change.
