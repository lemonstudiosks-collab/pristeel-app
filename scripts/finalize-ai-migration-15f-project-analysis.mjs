import fs from 'node:fs';

function read(path){return fs.readFileSync(path,'utf8');}
function write(path,content){fs.writeFileSync(path,content,'utf8');}
function replaceOnce(source,before,after,label){
  const i=source.indexOf(before);
  if(i<0)throw new Error(`Missing expected ${label}`);
  if(source.indexOf(before,i+before.length)>=0)throw new Error(`Ambiguous ${label}`);
  return source.slice(0,i)+after+source.slice(i+before.length);
}

// Final active-runtime application callsite inventory: provider implementations only keep direct endpoint/key routing.
{
  const path='scripts/ai-runtime-callsite-inventory.mjs';
  let s=read(path);
  s=replaceOnce(s,
    "  groq_chat_endpoint: [\n    { file: 'pristeel-groq-gptoss-provider-v1.js', count: 2 },\n    { file: 'pristeel-groq-rate-limit.js', count: 1 },\n    { file: 'pristeel-project-analysis.js', count: 1 }\n  ],",
    "  groq_chat_endpoint: [\n    { file: 'pristeel-groq-gptoss-provider-v1.js', count: 2 },\n    { file: 'pristeel-groq-rate-limit.js', count: 1 }\n  ],",
    'final direct Groq endpoint inventory');
  s=replaceOnce(s,
    "  legacy_ai_key: [\n    { file: 'pristeel-groq-gptoss-provider-v1.js', count: 4 },\n    { file: 'pristeel-groq-rate-limit.js', count: 4 },\n    { file: 'pristeel-procurement.html', count: 2 },\n    { file: 'pristeel-project-analysis.js', count: 2 }\n  ],",
    "  legacy_ai_key: [\n    { file: 'pristeel-groq-gptoss-provider-v1.js', count: 4 },\n    { file: 'pristeel-groq-rate-limit.js', count: 4 },\n    { file: 'pristeel-procurement.html', count: 2 }\n  ],",
    'final direct legacy key inventory');
  s=replaceOnce(s,
    "    { file: 'pristeel-groq-rate-limit.js', count: 8 },\n    { file: 'pristeel-procurement.html', count: 4 }\n  ],\n  pstai_error_code:",
    "    { file: 'pristeel-groq-rate-limit.js', count: 8 },\n    { file: 'pristeel-procurement.html', count: 4 },\n    { file: 'pristeel-project-analysis.js', count: 2 }\n  ],\n  pstai_error_code:",
    'Project Analysis PSTAI inventory');
  s=replaceOnce(s,
    "    { file: 'pristeel-groq-rate-limit.js', count: 1 },\n    { file: 'pristeel-procurement.html', count: 3 }\n  ],\n  fetch_monkey_patch:",
    "    { file: 'pristeel-groq-rate-limit.js', count: 1 },\n    { file: 'pristeel-procurement.html', count: 3 },\n    { file: 'pristeel-project-analysis.js', count: 1 }\n  ],\n  fetch_monkey_patch:",
    'Project Analysis typed error inventory');
  write(path,s);
}

// Provider contract guard: Project Analysis becomes the final migrated application request caller.
{
  const path='scripts/ai-provider-contract-check.mjs';
  let s=read(path);
  s=replaceOnce(s,
    "const qAnalyzeOne = extractFunction(appHtml, 'async function qAnalyzeOne(');",
    "const qAnalyzeOne = extractFunction(appHtml, 'async function qAnalyzeOne(');\nconst projectAnalysisGroq = extractFunction(projectAnalysis, 'async function groq(');\nconst projectAnalysisAsk = extractFunction(projectAnalysis, 'async function ask(');\nconst projectAnalyze = extractFunction(projectAnalysis, 'window.pstAnalyzeProject=async function(pid)');",
    'Project Analysis function extraction');
  const legacyBlock=`for (const [needle, label] of [\n  [\"MODEL_FAST='llama-3.1-8b-instant'\", 'legacy fast-model caller contract'],\n  [\"MODEL_MAIN='llama-3.3-70b-versatile'\", 'legacy main-model caller contract'],\n  [\"localStorage.getItem('pristeel_apikey')\", 'legacy AI key caller contract'],\n  [\"https://api.groq.com/openai/v1/chat/completions\", 'Groq-shaped project analysis call']\n]) requireText(projectAnalysis, needle, \`${'${files.projectAnalysis}'}: ${'${label}'}\`);`;
  const migratedBlock=`for (const [needle, label] of [\n  [\"MODEL_FAST='llama-3.1-8b-instant'\", 'preserved fast model contract'],\n  [\"MODEL_MAIN='llama-3.3-70b-versatile'\", 'preserved main model contract']\n]) requireText(projectAnalysis, needle, \`${'${files.projectAnalysis}'}: ${'${label}'}\`);\nfor (const [needle, label] of [\n  [\"var ai=window.PSTAI\", 'explicit Project Analysis AI service lookup'],\n  [\"ai.hasApiKey()\", 'explicit Project Analysis AI availability check'],\n  [\"ai.requestJson({model:model,messages:messages,max_tokens:maxTokens||5000,temperature:0,response_format:{type:'json_object'}\", 'preserved Project Analysis request contract'],\n  [\"code==='MISSING_KEY'\", 'preserved missing-key mapping'],\n  [\"code==='EMPTY'\", 'preserved empty-output mapping'],\n  [\"Mungon Groq API Key te Cilësimet.\", 'preserved Project Analysis missing-key message'],\n  [\"Modeli nuk ktheu analizë.\", 'preserved Project Analysis empty-output message']\n]) requireText(projectAnalysisGroq, needle, \`${'${files.projectAnalysis}'} groq helper: ${'${label}'}\`);\nfor (const [needle, label] of [\n  [\"model!==MODEL_FAST&&/model|permission|403|404/i.test(e.message)\", 'preserved main-to-fast fallback condition'],\n  [\"return groq(MODEL_FAST,messages,maxTokens)\", 'preserved fast-model fallback request']\n]) requireText(projectAnalysisAsk, needle, \`${'${files.projectAnalysis}'} ask helper: ${'${label}'}\`);\nfor (const [needle, label] of [\n  [\"ai=window.PSTAI\", 'Project Analysis entry AI lookup'],\n  [\"if(ai&&typeof ai.hasApiKey==='function'&&ai.hasApiKey())\", 'preserved AI-vs-rules gate'],\n  [\"a=normalize(localAnalysis(b))\", 'preserved rules-only fallback'],\n  [\"engine='groq';model=MODEL_MAIN\", 'preserved analysis engine/model metadata'],\n  [\"Shto Groq API Key për analizë semantike.\", 'preserved rules fallback user message']\n]) requireText(projectAnalyze, needle, \`${'${files.projectAnalysis}'} analyze entry: ${'${label}'}\`);\nforbidText(projectAnalysis, \"https://api.groq.com/openai/v1/chat/completions\", files.projectAnalysis);\nforbidText(projectAnalysis, \"pristeel_apikey\", files.projectAnalysis);`;
  s=replaceOnce(s,legacyBlock,migratedBlock,'legacy Project Analysis guard block');
  s=replaceOnce(s,
    "console.log('All inline HTML application request flows are migrated; project analysis retains the final audited legacy application request contract.');",
    "console.log('All audited application AI request callers now use the explicit PSTAI request API; direct endpoint/key access remains provider/Settings compatibility only.');",
    'final migrated caller log');
  write(path,s);
}

// Human-readable source of truth after the final application caller migration.
{
  const path='docs/AI_PROVIDER_RUNTIME.md';
  let s=read(path);
  s=replaceOnce(s,
    '- `pristeel_apikey`: legacy caller/compatibility marker',
    '- `pristeel_apikey`: compatibility marker retained for the current provider/Settings bridge',
    'legacy key description');
  s=replaceOnce(s,
    'Compatibility markers remain `__GEMINI_COMPAT__` and `__GROQ_GPTOSS_COMPAT__`. Do not rename or remove them until all current callers are migrated.',
    'Compatibility markers remain `__GEMINI_COMPAT__` and `__GROQ_GPTOSS_COMPAT__`. Application request callers are now migrated, but these markers remain until Settings/provider routing is consolidated separately.',
    'compatibility marker lifecycle');
  const heading='## Audited active runtime callsites after the sixth migration';
  const section=`### 7. Project Analysis\n\n\`pristeel-project-analysis.js\`, the final legacy application request caller, now uses the explicit \`PSTAI\` API. Its internal helper still preserves the exact user-facing missing-key message \`Mungon Groq API Key te Cilësimet.\` and empty-output message \`Modeli nuk ktheu analizë.\` for this transport-only migration. Requests retain the caller-supplied model, messages, token budget, temperature \`0\` and JSON response mode.\n\nThe existing \`ask()\` fallback remains unchanged: \`MODEL_MAIN = llama-3.3-70b-versatile\` falls back to \`MODEL_FAST = llama-3.1-8b-instant\` only for model/permission/403/404-style failures. Extraction still uses 4,800 output tokens and final synthesis still uses 7,000. When no configured AI route is available, \`pstAnalyzeProject()\` still runs \`localAnalysis()\` with rules instead of semantic AI. Existing \`engine='groq'\`, model metadata and user-facing fallback wording are deliberately preserved as compatibility semantics; renaming provider-facing metadata/UI is a separate cleanup.\n\nProject Analysis no longer reads \`pristeel_apikey\` or contains the Groq endpoint directly. All audited application request callers now use \`PSTAI.requestJson(...)\`.\n\n## Audited active runtime callsites after the seventh migration`;
  s=replaceOnce(s,heading,section,'final application migration heading');
  s=replaceOnce(s,
    'Direct Groq-shaped **application** requests now remain only in:\n\n- `pristeel-project-analysis.js`',
    'Direct Groq-shaped **application** requests: **none**.',
    'direct application request summary');
  s=replaceOnce(s,
    '- `pristeel-procurement.html::qAnalyzeAll()/qAnalyzeOne()`',
    '- `pristeel-procurement.html::qAnalyzeAll()/qAnalyzeOne()`\n- `pristeel-project-analysis.js`',
    'PSTAI migrated list');
  s=replaceOnce(s,
    'Per-caller behavior is additionally executed by `scripts/start-parsing-ai-smoke.mjs`, `scripts/parse-offer-ai-smoke.mjs`, `scripts/q-analyze-offer-ai-smoke.mjs` and `scripts/q-analyze-batch-ai-smoke.mjs`.',
    'Per-caller behavior is additionally executed by `scripts/start-parsing-ai-smoke.mjs`, `scripts/parse-offer-ai-smoke.mjs`, `scripts/q-analyze-offer-ai-smoke.mjs`, `scripts/q-analyze-batch-ai-smoke.mjs` and `scripts/project-analysis-ai-smoke.mjs`.',
    'per-caller smoke list');
  s=replaceOnce(s,
    'The legacy Groq-shaped interception path remains live only because `pristeel-project-analysis.js` has not yet been migrated.',
    '`PSTAI.requestJson(...)` still deliberately routes through the current Groq-shaped fetch contract so the existing GPT-OSS/Gemini/legacy provider wrappers continue to work. The interception path is therefore still a provider-routing dependency even though no application caller accesses the endpoint directly. The independent Drive Intelligence fetch wrapper remains unrelated and must be preserved.',
    'post-migration compatibility rationale');
  s=replaceOnce(s,
    '1. keep provider-contract, typed-error, callsite and per-caller behavior smokes green;\n2. keep `PSTAI.requestJson` routing through the existing wrapper stack while legacy callers remain;\n3. migrate `pristeel-project-analysis.js`, the final legacy application request caller;\n4. remove direct application access to `pristeel_apikey` only after that migration is complete;\n5. centralize Settings ownership only after wrapper order is no longer required;\n6. remove AI-specific global fetch monkey-patching only after no production caller depends on the Groq-shaped interception path, while preserving the independent Drive Intelligence wrapper;\n7. move provider secrets server-side as a separate security change.',
    '1. keep provider-contract, typed-error, callsite and per-caller behavior smokes green;\n2. treat `PSTAI.requestJson(...)` as the only application-facing AI request API; all audited application callers are now migrated;\n3. consolidate Settings ownership and retire direct application/UI dependence on `pristeel_apikey` without changing provider behavior;\n4. refactor provider routing behind `PSTAI.requestJson(...)` so AI routing no longer requires global Groq-shaped fetch interception;\n5. remove AI-specific global fetch monkey-patching only after that routing change is independently proven, while preserving the unrelated Drive Intelligence wrapper;\n6. move provider secrets server-side as a separate security change.',
    'post-application consolidation sequence');
  write(path,s);
}

console.log('Cleanup 15F finalizer updated Project Analysis guards, inventory and AI runtime docs.');
