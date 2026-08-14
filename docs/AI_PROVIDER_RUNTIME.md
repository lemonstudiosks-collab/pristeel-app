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

- `pristeel_apikey`: compatibility marker retained for the current provider/Settings bridge
- `pristeel_gemini_apikey`: Gemini browser key
- `pristeel_gemini_model`: selected Gemini model
- `pristeel_groq_apikey`: Groq browser key
- `pristeel_ai_provider`: active provider selector

Compatibility markers remain `__GEMINI_COMPAT__` and `__GROQ_GPTOSS_COMPAT__`. Application request callers are migrated and the base application Settings UI no longer reads or writes the marker directly. Marker ownership now remains only inside the provider/compatibility layers until routing is refactored separately.

## Current public browser API

The provider stack extends `window.PSTAI` with provider/model information, Gemini configuration/testing, Groq testing, GPT-OSS activation/deactivation, `PSTAI.hasApiKey()` and `PSTAI.requestJson(options)`.

The base Settings `saveApiKey()` now delegates key configuration to `PSTAI.configureGemini(...)` and no longer owns AI browser storage. The base `renderSettings()` no longer reads `pristeel_apikey`. The existing `s-apikey` and `key-status` DOM anchors remain intentionally stable. Provider UI layers still decorate `window.renderSettings`, and the compatibility layer still replaces `window.saveApiKey` at runtime so current Gemini/GPT-OSS behavior is unchanged.

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

### 5. Inline inbox supplier-offer `qAnalyzeOffer()`

`qAnalyzeOffer()` now resolves the configured AI route through `window.PSTAI` and uses `PSTAI.requestJson(...)` while preserving the existing inbox workflow. PDF extraction, scanned/empty-PDF handling, project matching and manual project selection, supplier guessing, the `llama-3.1-8b-instant` model, 3,000-token budget, temperature `0`, prompt text, offer calculations, `offers` persistence, `offers_inbox` processed/project linking, success/error alerts and button restoration remain unchanged. It deliberately preserves its historical failure model: request/parse/network failures continue to reach `alert('Gabim gjatë analizës: ...')`. Non-object structured results are rejected before offer mapping so they follow that same legacy outer-error path. The exact missing-key text remains `Mungon Groq API Key — shko te Cilësimet fillimisht.` during this transport-only migration.

`qAnalyzeOffer()` no longer reads `pristeel_apikey` or contains the Groq endpoint directly.

### 6. Inline batch `qAnalyzeAll()` / `qAnalyzeOne()`

The final inline application AI request flow is now migrated. `qAnalyzeAll()` resolves AI through `window.PSTAI`, preserves its exact missing-key alert, reads the same unprocessed inbox rows, asks the same confirmation, and still auto-processes only project matches where `qGuessProjectMatch(...).strong` is true. Weak matches remain for manual per-row analysis. Progress text, ok/skip/fail counting, final summary alert, `loadQInbox()` and `loadCockpit()` are unchanged.

`qAnalyzeOne()` now receives the resolved AI service and uses `PSTAI.requestJson(...)` while preserving PDF loading, the 8-page extraction cap, short/scanned-PDF rejection, trusted-supplier requirement, `llama-3.1-8b-instant`, 3,000-token budget, temperature `0`, system/user prompts, offer calculations, `offers` persistence and `offers_inbox` PATCH. Response-level `HTTP`, `EMPTY` and `INVALID_JSON` failures remain soft `false` results for batch counting; network/untyped failures still propagate to `qAnalyzeAll()` where they increment the same fail counter. Non-object structured results also return `false` before any write.

Neither batch function now contains the Groq endpoint or direct `pristeel_apikey` access.

### 7. Project Analysis

`pristeel-project-analysis.js`, the final legacy application request caller, now uses the explicit `PSTAI` API. Its internal helper still preserves the exact user-facing missing-key message `Mungon Groq API Key te Cilësimet.` and empty-output message `Modeli nuk ktheu analizë.` for this transport-only migration. Requests retain the caller-supplied model, messages, token budget, temperature `0` and JSON response mode.

The existing `ask()` fallback remains unchanged: `MODEL_MAIN = llama-3.3-70b-versatile` falls back to `MODEL_FAST = llama-3.1-8b-instant` only for model/permission/403/404-style failures. Extraction still uses 4,800 output tokens and final synthesis still uses 7,000. When no configured AI route is available, `pstAnalyzeProject()` still runs `localAnalysis()` with rules instead of semantic AI. Existing `engine='groq'`, model metadata and user-facing fallback wording are deliberately preserved as compatibility semantics; renaming provider-facing metadata/UI is a separate cleanup.

Project Analysis no longer reads `pristeel_apikey` or contains the Groq endpoint directly. All audited application request callers now use `PSTAI.requestJson(...)`.

## Audited active runtime callsites after the seventh migration

Direct Groq-shaped **application** requests: **none**.

Provider/compatibility implementation files still contain the Groq endpoint by design:

- `pristeel-groq-rate-limit.js`
- `pristeel-groq-gptoss-provider-v1.js`

The application HTML contains **zero** `pristeel_apikey` references. The compatibility marker is now owned only by `pristeel-groq-rate-limit.js` and `pristeel-groq-gptoss-provider-v1.js`. The base Settings UI delegates to `PSTAI.configureGemini(...)` while preserving the existing input/status anchors and runtime provider wrappers.

`PSTAI` is now used by the provider stack plus:

- `pristeel-email-offer-intake-v1.js`
- `pristeel-gmail-audit.js`
- `pristeel-procurement.html::startParsing()`
- `pristeel-procurement.html::parseOffer()`
- `pristeel-procurement.html::qAnalyzeOffer()`
- `pristeel-procurement.html::qAnalyzeAll()/qAnalyzeOne()`
- `pristeel-project-analysis.js`

Global `window.fetch` monkey-patching remains in the two AI provider/compatibility layers and independently in `pristeel-drive-intelligence.js`. The Drive wrapper must not be removed as collateral damage.

The exact active-runtime file/count inventory is enforced by `scripts/ai-runtime-callsite-inventory.mjs`. Per-caller behavior is additionally executed by `scripts/start-parsing-ai-smoke.mjs`, `scripts/parse-offer-ai-smoke.mjs`, `scripts/q-analyze-offer-ai-smoke.mjs`, `scripts/q-analyze-batch-ai-smoke.mjs` and `scripts/project-analysis-ai-smoke.mjs`.

## Why compatibility is still required

`PSTAI.requestJson(...)` still deliberately routes through the current Groq-shaped fetch contract so the existing GPT-OSS/Gemini/legacy provider wrappers continue to work. The interception path is therefore still a provider-routing dependency even though no application caller accesses the endpoint directly. The independent Drive Intelligence fetch wrapper remains unrelated and must be preserved.

## Consolidation boundary

The safe sequence is:

1. keep provider-contract, Settings-ownership, typed-error, callsite and per-caller behavior smokes green;
2. treat `PSTAI.requestJson(...)` as the only application-facing AI request API; all audited application callers are migrated;
3. keep `pristeel_apikey` compatibility-marker ownership confined to provider layers while current routing still depends on it;
4. refactor provider routing behind `PSTAI.requestJson(...)` so AI routing no longer requires global Groq-shaped fetch interception;
5. remove AI-specific global fetch monkey-patching and then retire the compatibility marker only after that routing change is independently proven, while preserving the unrelated Drive Intelligence wrapper;
6. move provider secrets server-side as a separate security change.
