# PPPP AI Provider Runtime

## Scope

This document records the current production AI routing contracts. It is descriptive, not a target architecture. The current stack must stay behaviorally stable until a deliberate provider consolidation is implemented and tested.

## Current runtime chain

1. `pristeel-groq-rate-limit.js` loads from the ordered bootstrap as the compatibility/provider base.
2. It no longer installs a global `window.fetch` wrapper. AI requests use the explicit `PSTAI.requestJson(...) → PSTAI.requestTransport(...)` path.
3. The compatibility layer exposes `PSTAI.requestTransport(body,key)` and implements it with the existing serialized Gemini/legacy routing logic. Without a Gemini key it calls the legacy Groq path with the same retry/token shaping; with Gemini configured it calls Gemini directly through the captured native fetch and preserves model fallback/response translation.
4. `PSTAI.requestJson(options)` now sends its normalized request body to `PSTAI.requestTransport(...)`, then preserves the same typed `MISSING_KEY`, `HTTP`, `EMPTY` and `INVALID_JSON` semantics and tolerant JSON parsing. Network/transport failures still propagate untyped.
5. `pristeel-gemini-test-ui-v1.js` loads later and dynamically loads `pristeel-groq-gptoss-provider-v1.js`.
6. The GPT-OSS provider captures the previous explicit transport and overrides `PSTAI.requestTransport(...)`. When `pristeel_ai_provider === "groq-gptoss"` and a Groq key exists, it uses the existing queued XHR/GPT-OSS path directly; when inactive it delegates to the previous explicit transport.
7. Neither AI provider layer monkey-patches global `window.fetch`. Unrelated browser fetch traffic is no longer intercepted by AI routing. The independent Drive Intelligence wrapper remains separate.

## Browser storage contracts

Current runtime storage contracts are:

- `pristeel_gemini_apikey`: Gemini browser key
- `pristeel_gemini_model`: selected Gemini model
- `pristeel_groq_apikey`: Groq browser key
- `pristeel_ai_provider`: active provider selector

`pristeel_apikey` is **retired as a runtime key/marker**. `pristeel-groq-rate-limit.js` retains that storage name only as a one-time historical migration input: a real non-marker legacy value is copied to `pristeel_groq_apikey` if needed, then the old storage entry is removed. Historical marker literals `__GEMINI_COMPAT__` and `__GROQ_GPTOSS_COMPAT__` are removed rather than treated as credentials. GPT-OSS no longer reads or writes the retired storage.

## Current public browser API

The provider stack extends `window.PSTAI` with provider/model information, Gemini configuration/testing, Groq testing, GPT-OSS activation/deactivation, `PSTAI.hasApiKey()`, `PSTAI.requestTransport(body,key)` and `PSTAI.requestJson(options)`. `requestTransport` is the explicit provider-routing contract; application code continues to call only `requestJson`.

The base Settings `saveApiKey()` delegates key configuration to `PSTAI.configureGemini(...)` and owns no AI browser storage. The base `renderSettings()` has zero retired-storage references. The existing `s-apikey` and `key-status` DOM anchors remain stable. The compatibility layer still bridges `window.saveApiKey`/`renderSettings`, but availability and requests now depend only on real dedicated Gemini/Groq keys. GPT-OSS activation/deactivation uses only `pristeel_groq_apikey` and `pristeel_ai_provider`.

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

The application HTML contains **zero** `pristeel_apikey` references. GPT-OSS contains zero retired-storage references. The compatibility layer contains exactly one occurrence, solely as the one-time historical migration storage name. Runtime availability and routing use `pristeel_gemini_apikey` / `pristeel_groq_apikey` directly.

`PSTAI` is now used by the provider stack plus:

- `pristeel-email-offer-intake-v1.js`
- `pristeel-gmail-audit.js`
- `pristeel-procurement.html::startParsing()`
- `pristeel-procurement.html::parseOffer()`
- `pristeel-procurement.html::qAnalyzeOffer()`
- `pristeel-procurement.html::qAnalyzeAll()/qAnalyzeOne()`
- `pristeel-project-analysis.js`

Global `window.fetch` monkey-patching has been removed from both AI provider/compatibility layers. The only active-runtime `window.fetch` monkey patch recorded by the AI inventory is the independent `pristeel-drive-intelligence.js` wrapper, which must remain untouched by AI cleanup.

The exact active-runtime file/count inventory is enforced by `scripts/ai-runtime-callsite-inventory.mjs`. Provider routing is executed by `scripts/ai-provider-routing-smoke.mjs`; wrapper-free global-fetch ownership by `scripts/ai-fetch-wrapper-removal-smoke.mjs`; legacy-storage migration/marker retirement by `scripts/ai-compat-marker-retirement-smoke.mjs`; Settings ownership by `scripts/ai-settings-ownership-smoke.mjs`; per-caller behavior by the dedicated caller smokes.

## Why compatibility is still required

`PSTAI.requestJson(...)` routes through the explicit `PSTAI.requestTransport(...)` chain. Gemini/legacy routing is owned by the compatibility transport and active GPT-OSS overrides that transport directly. The historical AI fetch wrappers have been removed; the independent Drive Intelligence fetch wrapper remains unrelated and must be preserved.

## Consolidation boundary

The safe sequence is:

1. keep provider-contract, provider-routing, fetch-wrapper-removal, marker-retirement, Settings-ownership, typed-error, callsite and per-caller behavior smokes green;
2. treat `PSTAI.requestJson(...)` as the only application-facing AI request API and `PSTAI.requestTransport(...)` as the provider-routing contract;
3. preserve the independent Drive Intelligence fetch wrapper while AI provider files remain wrapper-free;
4. keep only the one-time historical `pristeel_apikey` migration shim until the legacy-browser compatibility window is deliberately retired; it is not a runtime routing contract;
5. move provider secrets server-side as a separate security change.
