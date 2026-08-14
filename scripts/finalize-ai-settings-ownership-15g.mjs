import fs from 'node:fs';

function read(path){return fs.readFileSync(path,'utf8');}
function write(path,content){fs.writeFileSync(path,content,'utf8');}
function replaceOnce(source,before,after,label){
  const i=source.indexOf(before);
  if(i<0)throw new Error(`Missing expected ${label}`);
  if(source.indexOf(before,i+before.length)>=0)throw new Error(`Ambiguous ${label}`);
  return source.slice(0,i)+after+source.slice(i+before.length);
}

// Active-runtime inventory: application HTML no longer owns the legacy compatibility marker.
{
  const path='scripts/ai-runtime-callsite-inventory.mjs';
  let s=read(path);
  s=replaceOnce(s,
    "  legacy_ai_key: [\n    { file: 'pristeel-groq-gptoss-provider-v1.js', count: 4 },\n    { file: 'pristeel-groq-rate-limit.js', count: 4 },\n    { file: 'pristeel-procurement.html', count: 2 }\n  ],",
    "  legacy_ai_key: [\n    { file: 'pristeel-groq-gptoss-provider-v1.js', count: 4 },\n    { file: 'pristeel-groq-rate-limit.js', count: 4 }\n  ],",
    'Settings legacy-key inventory');
  s=replaceOnce(s,
    "    { file: 'pristeel-groq-rate-limit.js', count: 8 },\n    { file: 'pristeel-procurement.html', count: 4 },\n    { file: 'pristeel-project-analysis.js', count: 2 }",
    "    { file: 'pristeel-groq-rate-limit.js', count: 8 },\n    { file: 'pristeel-procurement.html', count: 5 },\n    { file: 'pristeel-project-analysis.js', count: 2 }",
    'Settings PSTAI inventory');
  write(path,s);
}

// Provider guard: preserve Settings DOM/API while forbidding base application marker ownership.
{
  const path='scripts/ai-provider-contract-check.mjs';
  let s=read(path);
  s=replaceOnce(s,
    "const projectAnalyze = extractFunction(projectAnalysis, 'window.pstAnalyzeProject=async function(pid)');",
    "const projectAnalyze = extractFunction(projectAnalysis, 'window.pstAnalyzeProject=async function(pid)');\nconst baseSaveApiKey = extractFunction(appHtml, 'function saveApiKey()');\nconst baseRenderSettings = extractFunction(appHtml, 'function renderSettings()');",
    'base Settings extraction');

  const compatAnchor=`for (const [needle, label] of [\n  [\"api.groq.com/openai/v1/chat/completions\", 'legacy Groq-shaped endpoint'],`;
  const settingsGuard=`for (const [needle, label] of [\n  [\"id=\\\"s-apikey\\\"\", 'Settings API-key input anchor'],\n  [\"id=\\\"key-status\\\"\", 'Settings key-status anchor']\n]) requireText(appHtml, needle, \`${'${files.appHtml}'}: ${'${label}'}\`);\nfor (const [needle, label] of [\n  [\"const ai=window.PSTAI\", 'base Settings PSTAI delegation'],\n  [\"typeof ai.configureGemini!=='function'\", 'base Settings configureGemini availability guard'],\n  [\"ai.configureGemini(k)\", 'base Settings Gemini configuration delegation'],\n  [\"AI Settings nuk janë ngarkuar.\", 'base Settings unavailable status'],\n  [\"✓ API Key e ruajtur në browser\", 'preserved base saved status'],\n  [\"API Key u fshi.\", 'preserved base cleared status']\n]) requireText(baseSaveApiKey, needle, \`${'${files.appHtml}'} saveApiKey: ${'${label}'}\`);\nforbidText(baseSaveApiKey, \"localStorage.\", \`${'${files.appHtml}'} saveApiKey\`);\nforbidText(baseRenderSettings, \"pristeel_apikey\", \`${'${files.appHtml}'} renderSettings\`);\nforbidText(appHtml, \"pristeel_apikey\", files.appHtml);\n\n`;
  s=replaceOnce(s,compatAnchor,settingsGuard+compatAnchor,'compatibility guard anchor');
  write(path,s);
}

// Human-readable ownership state.
{
  const path='docs/AI_PROVIDER_RUNTIME.md';
  let s=read(path);
  s=replaceOnce(s,
    'Compatibility markers remain `__GEMINI_COMPAT__` and `__GROQ_GPTOSS_COMPAT__`. Application request callers are now migrated, but these markers remain until Settings/provider routing is consolidated separately.',
    'Compatibility markers remain `__GEMINI_COMPAT__` and `__GROQ_GPTOSS_COMPAT__`. Application request callers are migrated and the base application Settings UI no longer reads or writes the marker directly. Marker ownership now remains only inside the provider/compatibility layers until routing is refactored separately.',
    'compatibility marker ownership');
  s=replaceOnce(s,
    'Both provider UI layers currently decorate `window.renderSettings`; the compatibility layer also bridges the legacy `window.saveApiKey` function.',
    'The base Settings `saveApiKey()` now delegates key configuration to `PSTAI.configureGemini(...)` and no longer owns AI browser storage. The base `renderSettings()` no longer reads `pristeel_apikey`. The existing `s-apikey` and `key-status` DOM anchors remain intentionally stable. Provider UI layers still decorate `window.renderSettings`, and the compatibility layer still replaces `window.saveApiKey` at runtime so current Gemini/GPT-OSS behavior is unchanged.',
    'Settings ownership description');
  s=replaceOnce(s,
    'The application HTML now contains only two `pristeel_apikey` references, both in the current Settings/storage compatibility UI. There are no remaining direct application request callers in the HTML. Settings is a separate ownership cleanup.',
    'The application HTML contains **zero** `pristeel_apikey` references. The compatibility marker is now owned only by `pristeel-groq-rate-limit.js` and `pristeel-groq-gptoss-provider-v1.js`. The base Settings UI delegates to `PSTAI.configureGemini(...)` while preserving the existing input/status anchors and runtime provider wrappers.',
    'application HTML Settings ownership summary');
  s=replaceOnce(s,
    '1. keep provider-contract, typed-error, callsite and per-caller behavior smokes green;\n2. treat `PSTAI.requestJson(...)` as the only application-facing AI request API; all audited application callers are now migrated;\n3. consolidate Settings ownership and retire direct application/UI dependence on `pristeel_apikey` without changing provider behavior;\n4. refactor provider routing behind `PSTAI.requestJson(...)` so AI routing no longer requires global Groq-shaped fetch interception;\n5. remove AI-specific global fetch monkey-patching only after that routing change is independently proven, while preserving the unrelated Drive Intelligence wrapper;\n6. move provider secrets server-side as a separate security change.',
    '1. keep provider-contract, Settings-ownership, typed-error, callsite and per-caller behavior smokes green;\n2. treat `PSTAI.requestJson(...)` as the only application-facing AI request API; all audited application callers are migrated;\n3. keep `pristeel_apikey` compatibility-marker ownership confined to provider layers while current routing still depends on it;\n4. refactor provider routing behind `PSTAI.requestJson(...)` so AI routing no longer requires global Groq-shaped fetch interception;\n5. remove AI-specific global fetch monkey-patching and then retire the compatibility marker only after that routing change is independently proven, while preserving the unrelated Drive Intelligence wrapper;\n6. move provider secrets server-side as a separate security change.',
    'post-Settings consolidation sequence');
  write(path,s);
}

console.log('Cleanup 15G finalizer updated Settings ownership guard, inventory and AI runtime docs.');
