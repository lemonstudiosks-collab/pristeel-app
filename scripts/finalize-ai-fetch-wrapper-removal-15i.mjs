import fs from 'node:fs';

function read(path){return fs.readFileSync(path,'utf8');}
function write(path,content){fs.writeFileSync(path,content,'utf8');}
function replaceOnce(source,before,after,label){
  const i=source.indexOf(before);
  if(i<0)throw new Error(`Missing expected ${label}`);
  if(source.indexOf(before,i+before.length)>=0)throw new Error(`Ambiguous ${label}`);
  return source.slice(0,i)+after+source.slice(i+before.length);
}

// Inventory: Drive Intelligence is now the only active-runtime global fetch monkey patch.
{
  const path='scripts/ai-runtime-callsite-inventory.mjs';
  let s=read(path);
  s=replaceOnce(s,
    "  fetch_monkey_patch: [\n    { file: 'pristeel-drive-intelligence.js', count: 1 },\n    { file: 'pristeel-groq-gptoss-provider-v1.js', count: 1 },\n    { file: 'pristeel-groq-rate-limit.js', count: 1 }\n  ],",
    "  fetch_monkey_patch: [\n    { file: 'pristeel-drive-intelligence.js', count: 1 }\n  ],",
    'AI fetch monkey-patch inventory');
  write(path,s);
}

// Provider guard: explicit transports remain required and both AI files are forbidden from reintroducing a global fetch wrapper.
{
  const path='scripts/ai-provider-contract-check.mjs';
  let s=read(path);
  s=replaceOnce(s,
    "  [\"window.fetch=function\", 'compatibility fetch wrapper'],\n",
    '',
    'compatibility fetch-wrapper requirement');
  s=replaceOnce(s,
    "  [\"window.fetch=function\", 'active provider fetch wrapper'],\n",
    '',
    'GPT-OSS fetch-wrapper requirement');
  s=replaceOnce(s,
    "]) requireText(compat, needle, `${files.compat}: ${label}`);\n\nfor (const [needle, label] of [\n  [\"window.PSTAI.requestTransport(body,key)\", 'explicit request transport dispatch'],",
    "]) requireText(compat, needle, `${files.compat}: ${label}`);\nforbidText(compat, \"window.fetch=function\", `${files.compat} global fetch ownership`);\n\nfor (const [needle, label] of [\n  [\"window.PSTAI.requestTransport(body,key)\", 'explicit request transport dispatch'],",
    'compatibility wrapper prohibition');
  s=replaceOnce(s,
    "]) requireText(groqProvider, needle, `${files.groqProvider}: ${label}`);\n\nfor (const [needle, label] of [\n  [\"if(!active())\", 'inactive-provider transport delegation'],",
    "]) requireText(groqProvider, needle, `${files.groqProvider}: ${label}`);\nforbidText(groqProvider, \"window.fetch=function\", `${files.groqProvider} global fetch ownership`);\n\nfor (const [needle, label] of [\n  [\"if(!active())\", 'inactive-provider transport delegation'],",
    'GPT-OSS wrapper prohibition');
  write(path,s);
}

// Human-readable runtime state after wrapper removal.
{
  const path='docs/AI_PROVIDER_RUNTIME.md';
  let s=read(path);
  s=replaceOnce(s,
    '2. It still installs the historical Groq-shaped `window.fetch` wrapper as a temporary safety fallback, but `PSTAI.requestJson(...)` no longer depends on that wrapper.',
    '2. It no longer installs a global `window.fetch` wrapper. AI requests use the explicit `PSTAI.requestJson(...) → PSTAI.requestTransport(...)` path.',
    'compatibility runtime-chain wrapper description');
  s=replaceOnce(s,
    '7. The two AI `window.fetch` wrappers remain installed in this phase for compatibility/rollback safety and still delegate unrelated traffic, but normal application AI requests route through the explicit transport chain instead.',
    '7. Neither AI provider layer monkey-patches global `window.fetch`. Unrelated browser fetch traffic is no longer intercepted by AI routing. The independent Drive Intelligence wrapper remains separate.',
    'runtime-chain wrapper removal');
  s=replaceOnce(s,
    'Global `window.fetch` monkey-patching still exists in the two AI provider/compatibility layers as a temporary compatibility fallback and independently in `pristeel-drive-intelligence.js`. The explicit `PSTAI.requestJson → PSTAI.requestTransport` path no longer relies on the AI fetch wrappers. The Drive wrapper must not be removed as collateral damage.',
    'Global `window.fetch` monkey-patching has been removed from both AI provider/compatibility layers. The only active-runtime `window.fetch` monkey patch recorded by the AI inventory is the independent `pristeel-drive-intelligence.js` wrapper, which must remain untouched by AI cleanup.',
    'global fetch ownership summary');
  s=replaceOnce(s,
    'The exact active-runtime file/count inventory is enforced by `scripts/ai-runtime-callsite-inventory.mjs`. Provider routing is executed by `scripts/ai-provider-routing-smoke.mjs`; per-caller behavior is additionally executed by `scripts/start-parsing-ai-smoke.mjs`, `scripts/parse-offer-ai-smoke.mjs`, `scripts/q-analyze-offer-ai-smoke.mjs`, `scripts/q-analyze-batch-ai-smoke.mjs` and `scripts/project-analysis-ai-smoke.mjs`.',
    'The exact active-runtime file/count inventory is enforced by `scripts/ai-runtime-callsite-inventory.mjs`. Provider routing is executed by `scripts/ai-provider-routing-smoke.mjs`; wrapper-free global-fetch ownership is executed by `scripts/ai-fetch-wrapper-removal-smoke.mjs`; per-caller behavior is additionally executed by `scripts/start-parsing-ai-smoke.mjs`, `scripts/parse-offer-ai-smoke.mjs`, `scripts/q-analyze-offer-ai-smoke.mjs`, `scripts/q-analyze-batch-ai-smoke.mjs` and `scripts/project-analysis-ai-smoke.mjs`.',
    'wrapper-removal smoke documentation');
  s=replaceOnce(s,
    '`PSTAI.requestJson(...)` now routes through the explicit `PSTAI.requestTransport(...)` chain. Gemini/legacy routing is owned by the compatibility transport and active GPT-OSS overrides that transport directly. The historical AI fetch wrappers remain only as a compatibility/rollback layer and are no longer a normal application-request dependency. The independent Drive Intelligence fetch wrapper remains unrelated and must be preserved.',
    '`PSTAI.requestJson(...)` routes through the explicit `PSTAI.requestTransport(...)` chain. Gemini/legacy routing is owned by the compatibility transport and active GPT-OSS overrides that transport directly. The historical AI fetch wrappers have been removed; the independent Drive Intelligence fetch wrapper remains unrelated and must be preserved.',
    'post-wrapper compatibility rationale');
  s=replaceOnce(s,
    '1. keep provider-contract, provider-routing, Settings-ownership, typed-error, callsite and per-caller behavior smokes green;\n2. treat `PSTAI.requestJson(...)` as the only application-facing AI request API and `PSTAI.requestTransport(...)` as the provider-routing contract;\n3. keep the historical AI fetch wrappers temporarily while the explicit transport path is independently proven in production CI;\n4. remove only the AI-specific global fetch monkey-patching in a separate guarded change, while preserving the unrelated Drive Intelligence wrapper;\n5. after fetch-wrapper removal is proven, simplify/retire the `pristeel_apikey` compatibility marker without changing real Gemini/Groq key storage;\n6. move provider secrets server-side as a separate security change.',
    '1. keep provider-contract, provider-routing, fetch-wrapper-removal, Settings-ownership, typed-error, callsite and per-caller behavior smokes green;\n2. treat `PSTAI.requestJson(...)` as the only application-facing AI request API and `PSTAI.requestTransport(...)` as the provider-routing contract;\n3. preserve the independent Drive Intelligence fetch wrapper while AI provider files remain wrapper-free;\n4. simplify/retire the `pristeel_apikey` compatibility marker without changing real Gemini/Groq key storage or provider selection behavior;\n5. move provider secrets server-side as a separate security change.',
    'post-wrapper cleanup sequence');
  write(path,s);
}

console.log('Cleanup 15I finalizer updated wrapper-free provider guard, inventory and docs.');
