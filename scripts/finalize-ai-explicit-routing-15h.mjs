import fs from 'node:fs';

function read(path){return fs.readFileSync(path,'utf8');}
function write(path,content){fs.writeFileSync(path,content,'utf8');}
function replaceOnce(source,before,after,label){
  const i=source.indexOf(before);
  if(i<0)throw new Error(`Missing expected ${label}`);
  if(source.indexOf(before,i+before.length)>=0)throw new Error(`Ambiguous ${label}`);
  return source.slice(0,i)+after+source.slice(i+before.length);
}

// Active-runtime inventory: explicit transport adds PSTAI surfaces but retains endpoint/fetch-wrapper compatibility counts.
{
  const path='scripts/ai-runtime-callsite-inventory.mjs';
  let s=read(path);
  s=replaceOnce(s,"    { file: 'pristeel-groq-gptoss-provider-v1.js', count: 13 },","    { file: 'pristeel-groq-gptoss-provider-v1.js', count: 16 },",'GPT-OSS PSTAI count');
  s=replaceOnce(s,"    { file: 'pristeel-groq-rate-limit.js', count: 8 },","    { file: 'pristeel-groq-rate-limit.js', count: 10 },",'compatibility PSTAI count');
  write(path,s);
}

// Provider guard: application request API must route through explicit transport, while old fetch wrappers remain available only as safety fallback.
{
  const path='scripts/ai-provider-contract-check.mjs';
  let s=read(path);
  s=replaceOnce(s,
    "const baseRenderSettings = extractFunction(appHtml, 'function renderSettings()');",
    "const baseRenderSettings = extractFunction(appHtml, 'function renderSettings()');\nconst explicitRequestJson = extractFunction(compat, 'window.PSTAI.requestJson=async function(options)');\nconst gptOssRequestTransport = extractFunction(groqProvider, 'window.PSTAI.requestTransport=async function(body,key)');",
    'explicit routing function extraction');
  s=replaceOnce(s,
    "  [\"window.PSTAI.requestJson\", 'explicit JSON request API'],",
    "  [\"window.PSTAI.requestTransport=compatibilityRequestTransport\", 'explicit compatibility transport API'],\n  [\"window.PSTAI.requestJson\", 'explicit JSON request API'],",
    'compat explicit transport guard');
  s=replaceOnce(s,
    "  [\"function pstAiError\", 'typed explicit-request error helper'],",
    "  [\"function compatibilityRequestTransport\", 'compatibility response transport implementation'],\n  [\"function pstAiError\", 'typed explicit-request error helper'],",
    'compat transport implementation guard');
  const geminiAnchor=`for (const [needle, label] of [\n  [\"window.PSTAI.testGeminiConnection\", 'Gemini connectivity API'],`;
  const requestGuard=`for (const [needle, label] of [\n  [\"window.PSTAI.requestTransport(body,key)\", 'explicit request transport dispatch'],\n  [\"response_format:o.response_format||{type:'json_object'}\", 'preserved request JSON contract'],\n  [\"parseModelJson(c)\", 'preserved tolerant model JSON parser']\n]) requireText(explicitRequestJson, needle, \`${'${files.compat}'} requestJson: ${'${label}'}\`);\nforbidText(explicitRequestJson, \"window.fetch(\", \`${'${files.compat}'} requestJson\`);\n\n`;
  s=replaceOnce(s,geminiAnchor,requestGuard+geminiAnchor,'Gemini guard anchor');
  s=replaceOnce(s,
    "  [\"previousFetch=window.fetch.bind(window)\", 'provider wrapper chaining'],",
    "  [\"previousFetch=window.fetch.bind(window)\", 'provider wrapper chaining'],\n  [\"previousRequestTransport=typeof window.PSTAI.requestTransport==='function'?window.PSTAI.requestTransport:null\", 'explicit provider transport chaining'],\n  [\"window.PSTAI.requestTransport=async function\", 'GPT-OSS explicit transport override'],",
    'GPT-OSS explicit transport guard');
  const emailAnchor=`for (const [needle, label] of [\n  [\"var ai=window.PSTAI\", 'explicit AI service lookup'],`;
  const gptTransportGuard=`for (const [needle, label] of [\n  [\"if(!active())\", 'inactive-provider transport delegation'],\n  [\"previousRequestTransport(body,key)\", 'previous explicit transport delegation'],\n  [\"groqFetch(GROQ_URL,init)\", 'active GPT-OSS explicit transport'],\n  [\"Authorization':'Bearer '+groqKey()\", 'Groq explicit transport key header']\n]) requireText(gptOssRequestTransport, needle, \`${'${files.groqProvider}'} requestTransport: ${'${label}'}\`);\n\n`;
  s=replaceOnce(s,emailAnchor,gptTransportGuard+emailAnchor,'email caller guard anchor');
  write(path,s);
}

// Human-readable routing state.
{
  const path='docs/AI_PROVIDER_RUNTIME.md';
  let s=read(path);
  const oldChain=`1. \`pristeel-groq-rate-limit.js\` loads from the ordered bootstrap as a compatibility layer.\n2. It wraps \`window.fetch\` for legacy Groq-shaped chat-completions calls.\n3. Without a configured Gemini key, those calls continue to the legacy Groq-shaped path with retry/token shaping.\n4. With a configured Gemini key, the compatibility layer translates the same OpenAI/Groq-shaped request to the Gemini Developer API and translates the response back to an OpenAI-like shape.\n5. The compatibility layer exposes \`PSTAI.hasApiKey()\` and \`PSTAI.requestJson(options)\` as the explicit application-facing request API. \`requestJson\` deliberately calls the current \`window.fetch\`, so existing GPT-OSS/Gemini/legacy routing remains intact.\n6. \`PSTAI.requestJson\` classifies response-level failures with \`pstAiCode\`: \`MISSING_KEY\`, \`HTTP\`, \`EMPTY\`, and \`INVALID_JSON\`. Network/transport failures are deliberately not converted and still propagate as transport errors.\n7. \`pristeel-gemini-test-ui-v1.js\` loads later and dynamically loads \`pristeel-groq-gptoss-provider-v1.js\`.\n8. When \`pristeel_ai_provider === \"groq-gptoss\"\` and a Groq key exists, the GPT-OSS wrapper sends Groq chat-completions calls directly by XHR using \`openai/gpt-oss-20b\`; otherwise it delegates to the previous fetch chain.`;
  const newChain=`1. \`pristeel-groq-rate-limit.js\` loads from the ordered bootstrap as the compatibility/provider base.\n2. It still installs the historical Groq-shaped \`window.fetch\` wrapper as a temporary safety fallback, but \`PSTAI.requestJson(...)\` no longer depends on that wrapper.\n3. The compatibility layer exposes \`PSTAI.requestTransport(body,key)\` and implements it with the existing serialized Gemini/legacy routing logic. Without a Gemini key it calls the legacy Groq path with the same retry/token shaping; with Gemini configured it calls Gemini directly through the captured native fetch and preserves model fallback/response translation.\n4. \`PSTAI.requestJson(options)\` now sends its normalized request body to \`PSTAI.requestTransport(...)\`, then preserves the same typed \`MISSING_KEY\`, \`HTTP\`, \`EMPTY\` and \`INVALID_JSON\` semantics and tolerant JSON parsing. Network/transport failures still propagate untyped.\n5. \`pristeel-gemini-test-ui-v1.js\` loads later and dynamically loads \`pristeel-groq-gptoss-provider-v1.js\`.\n6. The GPT-OSS provider captures the previous explicit transport and overrides \`PSTAI.requestTransport(...)\`. When \`pristeel_ai_provider === \"groq-gptoss\"\` and a Groq key exists, it uses the existing queued XHR/GPT-OSS path directly; when inactive it delegates to the previous explicit transport.\n7. The two AI \`window.fetch\` wrappers remain installed in this phase for compatibility/rollback safety and still delegate unrelated traffic, but normal application AI requests route through the explicit transport chain instead.`;
  s=replaceOnce(s,oldChain,newChain,'runtime routing chain');
  s=replaceOnce(s,
    'The provider stack extends `window.PSTAI` with provider/model information, Gemini configuration/testing, Groq testing, GPT-OSS activation/deactivation, `PSTAI.hasApiKey()` and `PSTAI.requestJson(options)`.',
    'The provider stack extends `window.PSTAI` with provider/model information, Gemini configuration/testing, Groq testing, GPT-OSS activation/deactivation, `PSTAI.hasApiKey()`, `PSTAI.requestTransport(body,key)` and `PSTAI.requestJson(options)`. `requestTransport` is the explicit provider-routing contract; application code continues to call only `requestJson`.',
    'public browser API routing description');
  s=replaceOnce(s,
    'Global `window.fetch` monkey-patching remains in the two AI provider/compatibility layers and independently in `pristeel-drive-intelligence.js`. The Drive wrapper must not be removed as collateral damage.',
    'Global `window.fetch` monkey-patching still exists in the two AI provider/compatibility layers as a temporary compatibility fallback and independently in `pristeel-drive-intelligence.js`. The explicit `PSTAI.requestJson → PSTAI.requestTransport` path no longer relies on the AI fetch wrappers. The Drive wrapper must not be removed as collateral damage.',
    'fetch monkey-patch status');
  s=replaceOnce(s,
    'The exact active-runtime file/count inventory is enforced by `scripts/ai-runtime-callsite-inventory.mjs`. Per-caller behavior is additionally executed by `scripts/start-parsing-ai-smoke.mjs`, `scripts/parse-offer-ai-smoke.mjs`, `scripts/q-analyze-offer-ai-smoke.mjs`, `scripts/q-analyze-batch-ai-smoke.mjs` and `scripts/project-analysis-ai-smoke.mjs`.',
    'The exact active-runtime file/count inventory is enforced by `scripts/ai-runtime-callsite-inventory.mjs`. Provider routing is executed by `scripts/ai-provider-routing-smoke.mjs`; per-caller behavior is additionally executed by `scripts/start-parsing-ai-smoke.mjs`, `scripts/parse-offer-ai-smoke.mjs`, `scripts/q-analyze-offer-ai-smoke.mjs`, `scripts/q-analyze-batch-ai-smoke.mjs` and `scripts/project-analysis-ai-smoke.mjs`.',
    'routing smoke documentation');
  s=replaceOnce(s,
    '`PSTAI.requestJson(...)` still deliberately routes through the current Groq-shaped fetch contract so the existing GPT-OSS/Gemini/legacy provider wrappers continue to work. The interception path is therefore still a provider-routing dependency even though no application caller accesses the endpoint directly. The independent Drive Intelligence fetch wrapper remains unrelated and must be preserved.',
    '`PSTAI.requestJson(...)` now routes through the explicit `PSTAI.requestTransport(...)` chain. Gemini/legacy routing is owned by the compatibility transport and active GPT-OSS overrides that transport directly. The historical AI fetch wrappers remain only as a compatibility/rollback layer and are no longer a normal application-request dependency. The independent Drive Intelligence fetch wrapper remains unrelated and must be preserved.',
    'compatibility rationale');
  s=replaceOnce(s,
    '1. keep provider-contract, Settings-ownership, typed-error, callsite and per-caller behavior smokes green;\n2. treat `PSTAI.requestJson(...)` as the only application-facing AI request API; all audited application callers are migrated;\n3. keep `pristeel_apikey` compatibility-marker ownership confined to provider layers while current routing still depends on it;\n4. refactor provider routing behind `PSTAI.requestJson(...)` so AI routing no longer requires global Groq-shaped fetch interception;\n5. remove AI-specific global fetch monkey-patching and then retire the compatibility marker only after that routing change is independently proven, while preserving the unrelated Drive Intelligence wrapper;\n6. move provider secrets server-side as a separate security change.',
    '1. keep provider-contract, provider-routing, Settings-ownership, typed-error, callsite and per-caller behavior smokes green;\n2. treat `PSTAI.requestJson(...)` as the only application-facing AI request API and `PSTAI.requestTransport(...)` as the provider-routing contract;\n3. keep the historical AI fetch wrappers temporarily while the explicit transport path is independently proven in production CI;\n4. remove only the AI-specific global fetch monkey-patching in a separate guarded change, while preserving the unrelated Drive Intelligence wrapper;\n5. after fetch-wrapper removal is proven, simplify/retire the `pristeel_apikey` compatibility marker without changing real Gemini/Groq key storage;\n6. move provider secrets server-side as a separate security change.',
    'post-routing consolidation sequence');
  write(path,s);
}

console.log('Cleanup 15H finalizer updated explicit provider routing guard, inventory and docs.');
