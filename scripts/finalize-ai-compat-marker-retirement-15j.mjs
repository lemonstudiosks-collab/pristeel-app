import fs from 'node:fs';

function read(path){return fs.readFileSync(path,'utf8');}
function write(path,content){fs.writeFileSync(path,content,'utf8');}
function replaceOnce(source,before,after,label){const i=source.indexOf(before);if(i<0)throw new Error(`Missing expected ${label}`);if(source.indexOf(before,i+before.length)>=0)throw new Error(`Ambiguous ${label}`);return source.slice(0,i)+after+source.slice(i+before.length);}

// Inventory: retired legacy storage may appear only once as the historical migration input.
{
  const path='scripts/ai-runtime-callsite-inventory.mjs';
  let s=read(path);
  s=replaceOnce(s,
    "  legacy_ai_key: [\n    { file: 'pristeel-groq-gptoss-provider-v1.js', count: 4 },\n    { file: 'pristeel-groq-rate-limit.js', count: 4 }\n  ],",
    "  legacy_ai_key: [\n    { file: 'pristeel-groq-rate-limit.js', count: 1 }\n  ],",
    'retired legacy-key inventory');
  write(path,s);
}

// Provider guard: require one-time migration shim and real-key routing; forbid compatibility-marker semantics.
{
  const path='scripts/ai-provider-contract-check.mjs';
  let s=read(path);
  s=replaceOnce(s,
    "  [\"pristeel_apikey\", 'legacy compatibility key marker'],",
    "  [\"LEGACY_AI_STORAGE='pristeel_apikey'\", 'one-time legacy storage migration input'],\n  [\"function migrateLegacyAiStorage()\", 'one-time legacy storage migration shim'],\n  [\"pristeel_groq_apikey\", 'dedicated Groq browser key storage'],",
    'compatibility marker requirement');
  s=replaceOnce(s,
    "]) requireText(compat, needle, `${files.compat}: ${label}`);\nforbidText(compat, \"window.fetch=function\", `${files.compat} global fetch ownership`);",
    "]) requireText(compat, needle, `${files.compat}: ${label}`);\nforbidText(compat, \"__GEMINI_COMPAT__\", `${files.compat} retired Gemini marker`);\nforbidText(compat, \"__GROQ_GPTOSS_COMPAT__\", `${files.compat} retired GPT marker`);\nforbidText(compat, \"window.fetch=function\", `${files.compat} global fetch ownership`);",
    'compatibility retired-marker prohibitions');
  s=replaceOnce(s,
    "  [\"__GROQ_GPTOSS_COMPAT__\", 'legacy key compatibility marker'],\n",
    '',
    'GPT marker requirement');
  s=replaceOnce(s,
    "]) requireText(groqProvider, needle, `${files.groqProvider}: ${label}`);\nforbidText(groqProvider, \"window.fetch=function\", `${files.groqProvider} global fetch ownership`);",
    "]) requireText(groqProvider, needle, `${files.groqProvider}: ${label}`);\nforbidText(groqProvider, \"pristeel_apikey\", `${files.groqProvider} retired legacy storage`);\nforbidText(groqProvider, \"__GEMINI_COMPAT__\", `${files.groqProvider} retired Gemini marker`);\nforbidText(groqProvider, \"__GROQ_GPTOSS_COMPAT__\", `${files.groqProvider} retired GPT marker`);\nforbidText(groqProvider, \"salvageLegacyKey\", `${files.groqProvider} retired legacy salvage`);\nforbidText(groqProvider, \"window.fetch=function\", `${files.groqProvider} global fetch ownership`);",
    'GPT retired-marker prohibitions');
  write(path,s);
}

// Human-readable storage/routing source of truth.
{
  const path='docs/AI_PROVIDER_RUNTIME.md';
  let s=read(path);
  s=replaceOnce(s,
    "Current keys are intentionally preserved:\n\n- `pristeel_apikey`: compatibility marker retained for the current provider/Settings bridge\n- `pristeel_gemini_apikey`: Gemini browser key\n- `pristeel_gemini_model`: selected Gemini model\n- `pristeel_groq_apikey`: Groq browser key\n- `pristeel_ai_provider`: active provider selector\n\nCompatibility markers remain `__GEMINI_COMPAT__` and `__GROQ_GPTOSS_COMPAT__`. Application request callers are migrated and the base application Settings UI no longer reads or writes the marker directly. Marker ownership now remains only inside the provider/compatibility layers until routing is refactored separately.",
    "Current runtime storage contracts are:\n\n- `pristeel_gemini_apikey`: Gemini browser key\n- `pristeel_gemini_model`: selected Gemini model\n- `pristeel_groq_apikey`: Groq browser key\n- `pristeel_ai_provider`: active provider selector\n\n`pristeel_apikey` is **retired as a runtime key/marker**. `pristeel-groq-rate-limit.js` retains that storage name only as a one-time historical migration input: a real non-marker legacy value is copied to `pristeel_groq_apikey` if needed, then the old storage entry is removed. Historical marker literals `__GEMINI_COMPAT__` and `__GROQ_GPTOSS_COMPAT__` are removed rather than treated as credentials. GPT-OSS no longer reads or writes the retired storage.",
    'browser storage contracts');
  s=replaceOnce(s,
    'The base Settings `saveApiKey()` now delegates key configuration to `PSTAI.configureGemini(...)` and no longer owns AI browser storage. The base `renderSettings()` no longer reads `pristeel_apikey`. The existing `s-apikey` and `key-status` DOM anchors remain intentionally stable. Provider UI layers still decorate `window.renderSettings`, and the compatibility layer still replaces `window.saveApiKey` at runtime so current Gemini/GPT-OSS behavior is unchanged.',
    'The base Settings `saveApiKey()` delegates key configuration to `PSTAI.configureGemini(...)` and owns no AI browser storage. The base `renderSettings()` has zero retired-storage references. The existing `s-apikey` and `key-status` DOM anchors remain stable. The compatibility layer still bridges `window.saveApiKey`/`renderSettings`, but availability and requests now depend only on real dedicated Gemini/Groq keys. GPT-OSS activation/deactivation uses only `pristeel_groq_apikey` and `pristeel_ai_provider`.',
    'Settings storage ownership');
  s=replaceOnce(s,
    'The application HTML contains **zero** `pristeel_apikey` references. The compatibility marker is now owned only by `pristeel-groq-rate-limit.js` and `pristeel-groq-gptoss-provider-v1.js`. The base Settings UI delegates to `PSTAI.configureGemini(...)` while preserving the existing input/status anchors and runtime provider wrappers.',
    'The application HTML contains **zero** `pristeel_apikey` references. GPT-OSS contains zero retired-storage references. The compatibility layer contains exactly one occurrence, solely as the one-time historical migration storage name. Runtime availability and routing use `pristeel_gemini_apikey` / `pristeel_groq_apikey` directly.',
    'audited legacy-storage ownership');
  s=replaceOnce(s,
    'The exact active-runtime file/count inventory is enforced by `scripts/ai-runtime-callsite-inventory.mjs`. Provider routing is executed by `scripts/ai-provider-routing-smoke.mjs`; wrapper-free global-fetch ownership is executed by `scripts/ai-fetch-wrapper-removal-smoke.mjs`; per-caller behavior is additionally executed by `scripts/start-parsing-ai-smoke.mjs`, `scripts/parse-offer-ai-smoke.mjs`, `scripts/q-analyze-offer-ai-smoke.mjs`, `scripts/q-analyze-batch-ai-smoke.mjs` and `scripts/project-analysis-ai-smoke.mjs`.',
    'The exact active-runtime file/count inventory is enforced by `scripts/ai-runtime-callsite-inventory.mjs`. Provider routing is executed by `scripts/ai-provider-routing-smoke.mjs`; wrapper-free global-fetch ownership by `scripts/ai-fetch-wrapper-removal-smoke.mjs`; legacy-storage migration/marker retirement by `scripts/ai-compat-marker-retirement-smoke.mjs`; Settings ownership by `scripts/ai-settings-ownership-smoke.mjs`; per-caller behavior by the dedicated caller smokes.',
    'marker-retirement smoke documentation');
  s=replaceOnce(s,
    '1. keep provider-contract, provider-routing, fetch-wrapper-removal, Settings-ownership, typed-error, callsite and per-caller behavior smokes green;\n2. treat `PSTAI.requestJson(...)` as the only application-facing AI request API and `PSTAI.requestTransport(...)` as the provider-routing contract;\n3. preserve the independent Drive Intelligence fetch wrapper while AI provider files remain wrapper-free;\n4. simplify/retire the `pristeel_apikey` compatibility marker without changing real Gemini/Groq key storage or provider selection behavior;\n5. move provider secrets server-side as a separate security change.',
    '1. keep provider-contract, provider-routing, fetch-wrapper-removal, marker-retirement, Settings-ownership, typed-error, callsite and per-caller behavior smokes green;\n2. treat `PSTAI.requestJson(...)` as the only application-facing AI request API and `PSTAI.requestTransport(...)` as the provider-routing contract;\n3. preserve the independent Drive Intelligence fetch wrapper while AI provider files remain wrapper-free;\n4. keep only the one-time historical `pristeel_apikey` migration shim until the legacy-browser compatibility window is deliberately retired; it is not a runtime routing contract;\n5. move provider secrets server-side as a separate security change.',
    'post-marker consolidation sequence');
  write(path,s);
}

console.log('Cleanup 15J finalizer updated marker-retirement guard, inventory and docs.');
