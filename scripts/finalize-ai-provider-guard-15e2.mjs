import fs from 'node:fs';

const path='scripts/ai-provider-contract-check.mjs';
let source=fs.readFileSync(path,'utf8');
function replaceOnce(before,after,label){
  const i=source.indexOf(before);
  if(i<0)throw new Error(`Missing expected ${label}`);
  if(source.indexOf(before,i+before.length)>=0)throw new Error(`Ambiguous ${label}`);
  source=source.slice(0,i)+after+source.slice(i+before.length);
}

replaceOnce(
  "const startParsing = extractFunction(appHtml, 'async function startParsing()');",
  "const startParsing = extractFunction(appHtml, 'async function startParsing()');\nconst parseOffer = extractFunction(appHtml, 'async function parseOffer()');",
  'parseOffer extraction anchor'
);

const projectAnchor=`for (const [needle, label] of [\n  [\"MODEL_FAST='llama-3.1-8b-instant'\", 'legacy fast-model caller contract'],`;
const parseGuard=`for (const [needle, label] of [\n  [\"const ai=window.PSTAI\", 'explicit supplier-offer AI service lookup'],\n  [\"ai.requestJson({model:'llama-3.1-8b-instant',max_tokens:3000,temperature:0,response_format:{type:'json_object'}\", 'preserved supplier-offer AI request contract'],\n  [\"const code=String(aiErr&&aiErr.pstAiCode||'')\", 'typed supplier-offer response error lookup'],\n  [\"code==='HTTP'||code==='EMPTY'||code==='INVALID_JSON'\", 'preserved supplier-offer response warning semantics'],\n  [\"throw aiErr;\", 'supplier-offer network/untyped failure propagation'],\n  [\"Mungon API Key — shko te Cilësimet.\", 'preserved supplier-offer missing-key message'],\n  [\"⚠ Nuk u lexua saktë — provo të ngjitësh tekstin manualisht.\", 'preserved supplier-offer response warning'],\n  [\"document.getElementById('pdf-status').textContent='Gabim: '+err.message\", 'preserved supplier-offer outer error status']\n]) requireText(parseOffer, needle, \`${'${files.appHtml}'} parseOffer: ${'${label}'}\`);\nforbidText(parseOffer, \"https://api.groq.com/openai/v1/chat/completions\", \`${'${files.appHtml}'} parseOffer\`);\nforbidText(parseOffer, \"pristeel_apikey\", \`${'${files.appHtml}'} parseOffer\`);\n\n`;
replaceOnce(projectAnchor,parseGuard+projectAnchor,'project-analysis guard anchor');

replaceOnce(
  "console.log(`Migrated explicit callers: ${files.emailOfferIntake}, ${files.gmailAudit}, ${files.appHtml}::startParsing`);",
  "console.log(`Migrated explicit callers: ${files.emailOfferIntake}, ${files.gmailAudit}, ${files.appHtml}::startParsing, ${files.appHtml}::parseOffer`);",
  'migrated callers log'
);
replaceOnce(
  "console.log('Remaining inline HTML callers and project analysis still retain their audited legacy contracts.');",
  "console.log('Two remaining inline HTML request flows and project analysis still retain their audited legacy contracts.');",
  'remaining callers log'
);

fs.writeFileSync(path,source,'utf8');
console.log('Cleanup 15E2 provider guard finalized for parseOffer.');
