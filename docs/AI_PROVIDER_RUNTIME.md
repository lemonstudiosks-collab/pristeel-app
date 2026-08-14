# PPPP AI Provider Runtime

## Scope

This document records the current production AI routing contracts. It is descriptive, not a target architecture. The current stack must stay behaviorally stable until a deliberate provider consolidation is implemented and tested.

## Current runtime chain

1. `pristeel-groq-rate-limit.js` loads from the ordered bootstrap as a compatibility layer.
2. It wraps `window.fetch` for legacy Groq-shaped chat-completions calls.
3. Without a configured Gemini key, those calls continue to the legacy Groq-shaped path with retry/token shaping.
4. With a configured Gemini key, the compatibility layer translates the same OpenAI/Groq-shaped request to the Gemini Developer API and translates the response back to an OpenAI-like shape.
5. `pristeel-gemini-test-ui-v1.js` loads later, provides the Gemini connectivity test/settings UI, and dynamically loads `pristeel-groq-gptoss-provider-v1.js`.
6. The GPT-OSS provider captures the previous `window.fetch`. When `pristeel_ai_provider === "groq-gptoss"` and a Groq key exists, it intercepts Groq chat-completions requests and sends them directly to Groq with XHR using `openai/gpt-oss-20b`.
7. When GPT-OSS is not active, that later wrapper delegates to the previous fetch chain.

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

Both provider UI layers currently decorate `window.renderSettings`; the Gemini compatibility layer also bridges the legacy `window.saveApiKey` function.

## Audited active runtime callsites

The active-runtime scanner derives its file set from `runtime-manifest.json` and `runtime-bootstrap-order.json`. It found six active files containing the Groq chat-completions endpoint or its provider/compatibility implementation:

- `pristeel-email-offer-intake-v1.js`
- `pristeel-gmail-audit.js`
- `pristeel-groq-gptoss-provider-v1.js`
- `pristeel-groq-rate-limit.js`
- `pristeel-procurement.html`
- `pristeel-project-analysis.js`

The actual legacy application callers that must be migrated away from direct Groq-shaped requests are therefore:

- `pristeel-email-offer-intake-v1.js`
- `pristeel-gmail-audit.js`
- `pristeel-procurement.html`
- `pristeel-project-analysis.js`

Gemini API-base usage is currently limited to:

- `pristeel-gemini-test-ui-v1.js`
- `pristeel-groq-rate-limit.js`

`PSTAI` usage is currently limited to the three provider-stack files:

- `pristeel-groq-rate-limit.js`
- `pristeel-gemini-test-ui-v1.js`
- `pristeel-groq-gptoss-provider-v1.js`

Global `window.fetch` monkey-patching is not AI-only. It is currently present in:

- `pristeel-groq-rate-limit.js`
- `pristeel-groq-gptoss-provider-v1.js`
- `pristeel-drive-intelligence.js`

That Drive wrapper is independent of the AI provider stack and must not be removed as collateral damage during AI consolidation.

The exact file/count inventory is enforced by `scripts/ai-runtime-callsite-inventory.mjs`. Any change requires deliberate review and an allowlist update.

## Why compatibility is still required

At least four application surfaces still use the legacy Groq-shaped contract. For example, `pristeel-project-analysis.js` still:

- reads `localStorage.getItem('pristeel_apikey')`
- uses the legacy model names `llama-3.1-8b-instant` and `llama-3.3-70b-versatile`
- posts to `https://api.groq.com/openai/v1/chat/completions`

Therefore the Groq-shaped compatibility contract is still live. Removing it or replacing the compatibility marker before migrating all four application caller surfaces would break current AI behavior.

## Consolidation boundary

A later cleanup may centralize provider constants, storage helpers, transport selection and Settings integration, but it must preserve these behaviors until each caller has been migrated deliberately.

The safe sequence is:

1. keep the provider-contract and callsite-inventory guards green;
2. introduce one explicit `PSTAI` request API while keeping the old interception path intact;
3. migrate legacy application callers one at a time: email offer intake, Gmail audit, inline application callers, then project analysis;
4. remove direct caller access to `pristeel_apikey` only after all callers are migrated;
5. centralize Settings ownership only after wrapper order is no longer required;
6. remove AI-specific global fetch monkey-patching only after no production caller depends on the Groq-shaped interception path, while preserving the independent Drive Intelligence fetch wrapper;
7. move provider secrets server-side as a separate security change, not bundled into the compatibility refactor.
