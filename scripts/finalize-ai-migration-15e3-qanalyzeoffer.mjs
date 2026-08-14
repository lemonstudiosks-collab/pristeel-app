import fs from 'node:fs';

function read(path){return fs.readFileSync(path,'utf8');}
function write(path,content){fs.writeFileSync(path,content,'utf8');}
function replaceOnce(source,before,after,label){
  const i=source.indexOf(before);
  if(i<0)throw new Error(`Missing expected ${label}`);
  if(source.indexOf(before,i+before.length)>=0)throw new Error(`Ambiguous ${label}`);
  return source.slice(0,i)+after+source.slice(i+before.length);
}

// Exact active-runtime allowlist after qAnalyzeOffer migration.
{
  const path='scripts/ai-runtime-callsite-inventory.mjs';
  let s=read(path);
  s=replaceOnce(s,"    { file: 'pristeel-procurement.html', count: 2 },\n    { file: 'pristeel-project-analysis.js', count: 1 }\n  ],\n  gemini_api_base:","    { file: 'pristeel-procurement.html', count: 1 },\n    { file: 'pristeel-project-analysis.js', count: 1 }\n  ],\n  gemini_api_base:",'Groq app endpoint count');
  s=replaceOnce(s,"    { file: 'pristeel-procurement.html', count: 4 },\n    { file: 'pristeel-project-analysis.js', count: 2 }\n  ],\n  gemini_key:","    { file: 'pristeel-procurement.html', count: 3 },\n    { file: 'pristeel-project-analysis.js', count: 2 }\n  ],\n  gemini_key:",'legacy app AI key count');
  s=replaceOnce(s,"    { file: 'pristeel-groq-rate-limit.js', count: 8 },\n    { file: 'pristeel-procurement.html', count: 2 }\n  ],\n  pstai_error_code:","    { file: 'pristeel-groq-rate-limit.js', count: 8 },\n    { file: 'pristeel-procurement.html', count: 3 }\n  ],\n  pstai_error_code:",'PSTAI app count');
  write(path,s);
}

// Provider contract guard: qAnalyzeOffer must stay migrated without changing its business flow.
{
  const path='scripts/ai-provider-contract-check.mjs';
  let s=read(path);
  s=replaceOnce(s,"const parseOffer = extractFunction(appHtml, 'async function parseOffer()');","const parseOffer = extractFunction(appHtml, 'async function parseOffer()');\nconst qAnalyzeOffer = extractFunction(appHtml, 'async function qAnalyzeOffer(');",'qAnalyzeOffer extraction');
  const projectAnchor=`for (const [needle, label] of [\n  [\"MODEL_FAST='llama-3.1-8b-instant'\", 'legacy fast-model caller contract'],`;
  const qGuard=`for (const [needle, label] of [\n  [\"var ai=window.PSTAI\", 'explicit inbox-offer AI service lookup'],\n  [\"ai.hasApiKey()\", 'explicit inbox-offer AI availability check'],\n  [\"ai.requestJson({model:'llama-3.1-8b-instant',max_tokens:3000,temperature:0,response_format:{type:'json_object'}\", 'preserved inbox-offer AI request contract'],\n  [\"You are a steel procurement AI. Respond with valid JSON only. Never merge or average line items.\", 'preserved inbox-offer system prompt'],\n  [\"if(!parsed||typeof parsed!=='object'||Array.isArray(parsed)) throw new Error('Unexpected end of JSON input')\", 'preserved object-only parse failure semantics'],\n  [\"Mungon Groq API Key — shko te Cilësimet fillimisht.\", 'preserved inbox-offer missing-key alert'],\n  [\"await supaFetch('offers','POST'\", 'preserved supplier-offer persistence'],\n  [\"await supaFetch('offers_inbox?id=eq.'+inboxId,'PATCH',{processed:true, project_id:proj.id})\", 'preserved inbox processed/project update'],\n  [\"alert('Gabim gjatë analizës: '+err.message)\", 'preserved inbox-offer outer error alert'],\n  [\"if(btn){btn.textContent=origTxt;btn.disabled=false;}\", 'preserved inbox-offer button restoration']\n]) requireText(qAnalyzeOffer, needle, \`${'${files.appHtml}'} qAnalyzeOffer: ${'${label}'}\`);\nforbidText(qAnalyzeOffer, \"https://api.groq.com/openai/v1/chat/completions\", \`${'${files.appHtml}'} qAnalyzeOffer\`);\nforbidText(qAnalyzeOffer, \"pristeel_apikey\", \`${'${files.appHtml}'} qAnalyzeOffer\`);\n\n`;
  s=replaceOnce(s,projectAnchor,qGuard+projectAnchor,'project-analysis guard anchor');
  s=replaceOnce(s,
    "console.log(`Migrated explicit callers: ${files.emailOfferIntake}, ${files.gmailAudit}, ${files.appHtml}::startParsing, ${files.appHtml}::parseOffer`);",
    "console.log(`Migrated explicit callers: ${files.emailOfferIntake}, ${files.gmailAudit}, ${files.appHtml}::startParsing, ${files.appHtml}::parseOffer, ${files.appHtml}::qAnalyzeOffer`);",
    'migrated caller log');
  s=replaceOnce(s,
    "console.log('Two remaining inline HTML request flows and project analysis still retain their audited legacy contracts.');",
    "console.log('The remaining inline batch request flow and project analysis still retain their audited legacy contracts.');",
    'remaining caller log');
  write(path,s);
}

// Keep dedicated migration smoke in the permanent PR test gate.
{
  const path='.github/workflows/pristeel-tests.yml';
  let s=read(path);
  s=replaceOnce(s,
    "      - name: Run parseOffer AI migration smoke\n        run: node scripts/parse-offer-ai-smoke.mjs\n      - name: Run project Drive cross-device smoke",
    "      - name: Run parseOffer AI migration smoke\n        run: node scripts/parse-offer-ai-smoke.mjs\n      - name: Run qAnalyzeOffer AI migration smoke\n        run: node scripts/q-analyze-offer-ai-smoke.mjs\n      - name: Run project Drive cross-device smoke",
    'PRISTEEL test workflow AI smoke anchor');
  write(path,s);
}

// Human-readable source of truth for the AI migration state.
{
  const path='docs/AI_PROVIDER_RUNTIME.md';
  let s=read(path);
  const heading='## Audited active runtime callsites after the fourth migration';
  const section=`### 5. Inline inbox supplier-offer \`qAnalyzeOffer()\`\n\n\`qAnalyzeOffer()\` now resolves the configured AI route through \`window.PSTAI\` and uses \`PSTAI.requestJson(...)\` while preserving the existing inbox workflow. PDF extraction, scanned/empty-PDF handling, project matching and manual project selection, supplier guessing, the \`llama-3.1-8b-instant\` model, 3,000-token budget, temperature \`0\`, prompt text, offer calculations, \`offers\` persistence, \`offers_inbox\` processed/project linking, success/error alerts and button restoration remain unchanged. It deliberately preserves its historical failure model: request/parse/network failures continue to reach \`alert('Gabim gjatë analizës: ...')\`. Non-object structured results are rejected before offer mapping so they follow that same legacy outer-error path. The exact missing-key text remains \`Mungon Groq API Key — shko te Cilësimet fillimisht.\` during this transport-only migration.\n\n\`qAnalyzeOffer()\` no longer reads \`pristeel_apikey\` or contains the Groq endpoint directly.\n\n## Audited active runtime callsites after the fifth migration`;
  s=replaceOnce(s,heading,section,'AI runtime migration heading');
  s=replaceOnce(s,"- two inline request flows in `pristeel-procurement.html`: `qAnalyzeOffer()` and the `qAnalyzeAll()` / `qAnalyzeOne()` batch flow","- one inline request flow in `pristeel-procurement.html`: the `qAnalyzeAll()` / `qAnalyzeOne()` batch flow",'remaining direct app flows');
  s=replaceOnce(s,"The application HTML still contains four `pristeel_apikey` references: two remaining request flows plus current Settings storage UI references. Settings is a separate ownership cleanup.","The application HTML still contains three `pristeel_apikey` references: the remaining batch request flow plus current Settings storage UI references. Settings is a separate ownership cleanup.",'legacy app key count documentation');
  s=replaceOnce(s,"- `pristeel-procurement.html::parseOffer()`","- `pristeel-procurement.html::parseOffer()`\n- `pristeel-procurement.html::qAnalyzeOffer()`",'PSTAI migrated caller list');
  s=replaceOnce(s,"Per-caller behavior is additionally executed by `scripts/start-parsing-ai-smoke.mjs` and `scripts/parse-offer-ai-smoke.mjs`.","Per-caller behavior is additionally executed by `scripts/start-parsing-ai-smoke.mjs`, `scripts/parse-offer-ai-smoke.mjs` and `scripts/q-analyze-offer-ai-smoke.mjs`.",'per-caller smoke docs');
  s=replaceOnce(s,"The legacy Groq-shaped interception path remains live because two inline application request flows and `pristeel-project-analysis.js` have not yet been migrated.","The legacy Groq-shaped interception path remains live because the inline `qAnalyzeAll()` / `qAnalyzeOne()` batch flow and `pristeel-project-analysis.js` have not yet been migrated.",'compatibility rationale');
  s=replaceOnce(s,"3. migrate `qAnalyzeOffer()` next;\n4. migrate the `qAnalyzeAll()` / `qAnalyzeOne()` batch flow separately;\n5. migrate `pristeel-project-analysis.js` last among application callers;\n6. remove direct application access to `pristeel_apikey` only after all application request callers are migrated;\n7. centralize Settings ownership only after wrapper order is no longer required;\n8. remove AI-specific global fetch monkey-patching only after no production caller depends on the Groq-shaped interception path, while preserving the independent Drive Intelligence wrapper;\n9. move provider secrets server-side as a separate security change.",
    "3. migrate the `qAnalyzeAll()` / `qAnalyzeOne()` batch flow separately;\n4. migrate `pristeel-project-analysis.js` last among application callers;\n5. remove direct application access to `pristeel_apikey` only after all application request callers are migrated;\n6. centralize Settings ownership only after wrapper order is no longer required;\n7. remove AI-specific global fetch monkey-patching only after no production caller depends on the Groq-shaped interception path, while preserving the independent Drive Intelligence wrapper;\n8. move provider secrets server-side as a separate security change.",
    'next migration sequence');
  write(path,s);
}

console.log('Cleanup 15E3 finalizer updated qAnalyzeOffer guards, inventory, CI and docs.');
