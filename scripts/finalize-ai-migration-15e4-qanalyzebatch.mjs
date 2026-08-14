import fs from 'node:fs';

function read(path){return fs.readFileSync(path,'utf8');}
function write(path,content){fs.writeFileSync(path,content,'utf8');}
function replaceOnce(source,before,after,label){
  const i=source.indexOf(before);
  if(i<0)throw new Error(`Missing expected ${label}`);
  if(source.indexOf(before,i+before.length)>=0)throw new Error(`Ambiguous ${label}`);
  return source.slice(0,i)+after+source.slice(i+before.length);
}

// Exact active-runtime callsite allowlist after the final inline HTML request migration.
{
  const path='scripts/ai-runtime-callsite-inventory.mjs';
  let s=read(path);
  s=replaceOnce(s,"    { file: 'pristeel-groq-rate-limit.js', count: 1 },\n    { file: 'pristeel-procurement.html', count: 1 },\n    { file: 'pristeel-project-analysis.js', count: 1 }","    { file: 'pristeel-groq-rate-limit.js', count: 1 },\n    { file: 'pristeel-project-analysis.js', count: 1 }",'remove final inline Groq endpoint');
  s=replaceOnce(s,"    { file: 'pristeel-groq-rate-limit.js', count: 4 },\n    { file: 'pristeel-procurement.html', count: 3 },\n    { file: 'pristeel-project-analysis.js', count: 2 }","    { file: 'pristeel-groq-rate-limit.js', count: 4 },\n    { file: 'pristeel-procurement.html', count: 2 },\n    { file: 'pristeel-project-analysis.js', count: 2 }",'legacy app AI key count');
  s=replaceOnce(s,"    { file: 'pristeel-groq-rate-limit.js', count: 8 },\n    { file: 'pristeel-procurement.html', count: 3 }","    { file: 'pristeel-groq-rate-limit.js', count: 8 },\n    { file: 'pristeel-procurement.html', count: 4 }",'PSTAI app count');
  s=replaceOnce(s,"  pstai_error_code: [\n    { file: 'pristeel-gmail-audit.js', count: 1 },\n    { file: 'pristeel-groq-rate-limit.js', count: 1 },\n    { file: 'pristeel-procurement.html', count: 2 }\n  ],\n  fetch_monkey_patch:","  pstai_error_code: [\n    { file: 'pristeel-gmail-audit.js', count: 1 },\n    { file: 'pristeel-groq-rate-limit.js', count: 1 },\n    { file: 'pristeel-procurement.html', count: 3 }\n  ],\n  fetch_monkey_patch:",'typed AI error-code app count');
  write(path,s);
}

// Provider contract guard for both batch orchestration and per-document analysis.
{
  const path='scripts/ai-provider-contract-check.mjs';
  let s=read(path);
  s=replaceOnce(s,"const qAnalyzeOffer = extractFunction(appHtml, 'async function qAnalyzeOffer(');","const qAnalyzeOffer = extractFunction(appHtml, 'async function qAnalyzeOffer(');\nconst qAnalyzeAll = extractFunction(appHtml, 'async function qAnalyzeAll()');\nconst qAnalyzeOne = extractFunction(appHtml, 'async function qAnalyzeOne(');",'batch function extraction');
  const projectAnchor=`for (const [needle, label] of [\n  [\"MODEL_FAST='llama-3.1-8b-instant'\", 'legacy fast-model caller contract'],`;
  const batchGuard=`for (const [needle, label] of [\n  [\"var ai=window.PSTAI\", 'explicit batch AI service lookup'],\n  [\"ai.hasApiKey()\", 'explicit batch AI availability check'],\n  [\"Mungon Groq API Key — Cilësimet.\", 'preserved batch missing-key alert'],\n  [\"if(!guess.strong){ skip++; continue; }\", 'preserved strong-match-only auto-write gate'],\n  [\"qAnalyzeOne(r.id, r.subject, r.sender, guess.match, ai)\", 'AI service passed into per-document batch analyzer'],\n  [\"if(done) ok++; else fail++;\", 'preserved batch success/failure counting'],\n  [\"catch(e){ fail++; }\", 'preserved batch exception counting'],\n  [\"loadQInbox(); loadCockpit();\", 'preserved batch final refresh']\n]) requireText(qAnalyzeAll, needle, \`${'${files.appHtml}'} qAnalyzeAll: ${'${label}'}\`);\nforbidText(qAnalyzeAll, \"https://api.groq.com/openai/v1/chat/completions\", \`${'${files.appHtml}'} qAnalyzeAll\`);\nforbidText(qAnalyzeAll, \"pristeel_apikey\", \`${'${files.appHtml}'} qAnalyzeAll\`);\n\nfor (const [needle, label] of [\n  [\"ai.requestJson({model:'llama-3.1-8b-instant',max_tokens:3000,temperature:0,response_format:{type:'json_object'}\", 'preserved batch AI request contract'],\n  [\"Steel procurement AI. Valid JSON only. Never merge line items.\", 'preserved batch system prompt'],\n  [\"var code=String(aiErr&&aiErr.pstAiCode||'')\", 'typed batch response error lookup'],\n  [\"code==='HTTP'||code==='EMPTY'||code==='INVALID_JSON'\", 'preserved soft batch response failure semantics'],\n  [\"throw aiErr;\", 'preserved network/untyped failure propagation'],\n  [\"if(!p||typeof p!=='object'||Array.isArray(p)) return false;\", 'preserved non-object soft failure'],\n  [\"if(text.trim().length<20) return false;\", 'preserved short/scan PDF soft failure'],\n  [\"if(!supplierGuess) return false;\", 'preserved untrusted supplier soft failure'],\n  [\"await supaFetch('offers','POST'\", 'preserved batch offer persistence'],\n  [\"await supaFetch('offers_inbox?id=eq.'+inboxId,'PATCH',{processed:true, project_id:proj.id})\", 'preserved batch inbox PATCH'],\n  [\"return true;\", 'preserved batch success result']\n]) requireText(qAnalyzeOne, needle, \`${'${files.appHtml}'} qAnalyzeOne: ${'${label}'}\`);\nforbidText(qAnalyzeOne, \"https://api.groq.com/openai/v1/chat/completions\", \`${'${files.appHtml}'} qAnalyzeOne\`);\nforbidText(qAnalyzeOne, \"pristeel_apikey\", \`${'${files.appHtml}'} qAnalyzeOne\`);\n\n`;
  s=replaceOnce(s,projectAnchor,batchGuard+projectAnchor,'project-analysis guard anchor');
  s=replaceOnce(s,
    "console.log(`Migrated explicit callers: ${files.emailOfferIntake}, ${files.gmailAudit}, ${files.appHtml}::startParsing, ${files.appHtml}::parseOffer, ${files.appHtml}::qAnalyzeOffer`);",
    "console.log(`Migrated explicit callers: ${files.emailOfferIntake}, ${files.gmailAudit}, ${files.appHtml}::startParsing, ${files.appHtml}::parseOffer, ${files.appHtml}::qAnalyzeOffer, ${files.appHtml}::qAnalyzeAll/qAnalyzeOne`);",
    'migrated caller log');
  s=replaceOnce(s,
    "console.log('The remaining inline batch request flow and project analysis still retain their audited legacy contracts.');",
    "console.log('All inline HTML application request flows are migrated; project analysis retains the final audited legacy application request contract.');",
    'remaining caller log');
  write(path,s);
}

// Human-readable migration state.
{
  const path='docs/AI_PROVIDER_RUNTIME.md';
  let s=read(path);
  const heading='## Audited active runtime callsites after the fifth migration';
  const section=`### 6. Inline batch \`qAnalyzeAll()\` / \`qAnalyzeOne()\`\n\nThe final inline application AI request flow is now migrated. \`qAnalyzeAll()\` resolves AI through \`window.PSTAI\`, preserves its exact missing-key alert, reads the same unprocessed inbox rows, asks the same confirmation, and still auto-processes only project matches where \`qGuessProjectMatch(...).strong\` is true. Weak matches remain for manual per-row analysis. Progress text, ok/skip/fail counting, final summary alert, \`loadQInbox()\` and \`loadCockpit()\` are unchanged.\n\n\`qAnalyzeOne()\` now receives the resolved AI service and uses \`PSTAI.requestJson(...)\` while preserving PDF loading, the 8-page extraction cap, short/scanned-PDF rejection, trusted-supplier requirement, \`llama-3.1-8b-instant\`, 3,000-token budget, temperature \`0\`, system/user prompts, offer calculations, \`offers\` persistence and \`offers_inbox\` PATCH. Response-level \`HTTP\`, \`EMPTY\` and \`INVALID_JSON\` failures remain soft \`false\` results for batch counting; network/untyped failures still propagate to \`qAnalyzeAll()\` where they increment the same fail counter. Non-object structured results also return \`false\` before any write.\n\nNeither batch function now contains the Groq endpoint or direct \`pristeel_apikey\` access.\n\n## Audited active runtime callsites after the sixth migration`;
  s=replaceOnce(s,heading,section,'AI runtime migration heading');
  s=replaceOnce(s,"Direct Groq-shaped **application** requests now remain in:\n\n- one inline request flow in `pristeel-procurement.html`: the `qAnalyzeAll()` / `qAnalyzeOne()` batch flow\n- `pristeel-project-analysis.js`","Direct Groq-shaped **application** requests now remain only in:\n\n- `pristeel-project-analysis.js`",'remaining direct application callers');
  s=replaceOnce(s,"The application HTML still contains three `pristeel_apikey` references: the remaining batch request flow plus current Settings storage UI references. Settings is a separate ownership cleanup.","The application HTML now contains only two `pristeel_apikey` references, both in the current Settings/storage compatibility UI. There are no remaining direct application request callers in the HTML. Settings is a separate ownership cleanup.",'HTML legacy key documentation');
  s=replaceOnce(s,"- `pristeel-procurement.html::qAnalyzeOffer()`","- `pristeel-procurement.html::qAnalyzeOffer()`\n- `pristeel-procurement.html::qAnalyzeAll()/qAnalyzeOne()`",'PSTAI migrated list');
  s=replaceOnce(s,"Per-caller behavior is additionally executed by `scripts/start-parsing-ai-smoke.mjs`, `scripts/parse-offer-ai-smoke.mjs` and `scripts/q-analyze-offer-ai-smoke.mjs`.","Per-caller behavior is additionally executed by `scripts/start-parsing-ai-smoke.mjs`, `scripts/parse-offer-ai-smoke.mjs`, `scripts/q-analyze-offer-ai-smoke.mjs` and `scripts/q-analyze-batch-ai-smoke.mjs`.",'per-caller smoke docs');
  s=replaceOnce(s,"The legacy Groq-shaped interception path remains live because the inline `qAnalyzeAll()` / `qAnalyzeOne()` batch flow and `pristeel-project-analysis.js` have not yet been migrated.","The legacy Groq-shaped interception path remains live only because `pristeel-project-analysis.js` has not yet been migrated.",'compatibility rationale');
  s=replaceOnce(s,"3. migrate the `qAnalyzeAll()` / `qAnalyzeOne()` batch flow separately;\n4. migrate `pristeel-project-analysis.js` last among application callers;\n5. remove direct application access to `pristeel_apikey` only after all application request callers are migrated;\n6. centralize Settings ownership only after wrapper order is no longer required;\n7. remove AI-specific global fetch monkey-patching only after no production caller depends on the Groq-shaped interception path, while preserving the independent Drive Intelligence wrapper;\n8. move provider secrets server-side as a separate security change.",
    "3. migrate `pristeel-project-analysis.js`, the final legacy application request caller;\n4. remove direct application access to `pristeel_apikey` only after that migration is complete;\n5. centralize Settings ownership only after wrapper order is no longer required;\n6. remove AI-specific global fetch monkey-patching only after no production caller depends on the Groq-shaped interception path, while preserving the independent Drive Intelligence wrapper;\n7. move provider secrets server-side as a separate security change.",
    'next migration sequence');
  write(path,s);
}

console.log('Cleanup 15E4 finalizer updated batch guards, inventory and AI runtime docs.');
