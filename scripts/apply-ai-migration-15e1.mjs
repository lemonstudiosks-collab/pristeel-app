import fs from 'node:fs';

const BASELINE = '77a0df563690c340abf145d73bc9b4a67917049e';
const htmlPath = 'pristeel-procurement.html';
const manifestPath = 'runtime-manifest.json';

function die(message){
  console.error(`CLEANUP 15E1 MIGRATION ERROR: ${message}`);
  process.exit(1);
}
function read(path){
  if(!fs.existsSync(path)) die(`Missing file: ${path}`);
  return fs.readFileSync(path,'utf8');
}
function extractFunction(source, needle){
  const start=source.indexOf(needle);
  if(start<0) die(`Function not found: ${needle}`);
  const brace=source.indexOf('{',start);
  let depth=0, quote='', escaped=false, lineComment=false, blockComment=false, end=-1;
  for(let i=brace;i<source.length;i++){
    const ch=source[i], nx=source[i+1]||'';
    if(lineComment){if(ch==='\n')lineComment=false;continue;}
    if(blockComment){if(ch==='*'&&nx==='/'){blockComment=false;i++;}continue;}
    if(quote){if(escaped){escaped=false;continue;}if(ch==='\\'){escaped=true;continue;}if(ch===quote)quote='';continue;}
    if(ch==='/'&&nx==='/'){lineComment=true;i++;continue;}
    if(ch==='/'&&nx==='*'){blockComment=true;i++;continue;}
    if(ch==='"'||ch==="'"||ch==='`'){quote=ch;continue;}
    if(ch==='{')depth++;
    else if(ch==='}'){depth--;if(depth===0){end=i+1;break;}}
  }
  if(end<0) die(`Function closing brace not found: ${needle}`);
  return {start,end,text:source.slice(start,end)};
}
function replaceOnce(source,before,after,label){
  const i=source.indexOf(before);
  if(i<0)die(`Expected contract not found: ${label}`);
  if(source.indexOf(before,i+before.length)>=0)die(`Ambiguous contract: ${label}`);
  return source.slice(0,i)+after+source.slice(i+before.length);
}

let html=read(htmlPath);
const extracted=extractFunction(html,'async function startParsing()');
let fn=extracted.text;
if((fn.match(/api\.groq\.com\/openai\/v1\/chat\/completions/g)||[]).length!==1)die('startParsing direct Groq endpoint count is not exactly 1.');
if((fn.match(/pristeel_apikey/g)||[]).length!==1)die('startParsing legacy key count is not exactly 1.');

const oldKey=`  const apiKey=localStorage.getItem('pristeel_apikey')||'';\n  if(!apiKey){document.getElementById('st1d').textContent='Mungon Groq API Key — shko te Cilësimet.';document.getElementById('parsing-card').classList.add('hidden');return;}`;
const newKey=`  const ai=window.PSTAI;\n  if(!ai||typeof ai.hasApiKey!=='function'||typeof ai.requestJson!=='function'||!ai.hasApiKey()){document.getElementById('st1d').textContent='Mungon Groq API Key — shko te Cilësimet.';document.getElementById('parsing-card').classList.add('hidden');return;}`;
fn=replaceOnce(fn,oldKey,newKey,'startParsing AI availability contract');

const transportStartNeedle="      const resp=await fetch('https://api.groq.com/openai/v1/chat/completions',{";
const transportStart=fn.indexOf(transportStartNeedle);
if(transportStart<0)die('startParsing direct Groq transport start not found.');
const genericDelayNeedle="      if(ci+1<chunks.length) await delay(400);";
const transportEnd=fn.lastIndexOf(genericDelayNeedle);
if(transportEnd<=transportStart)die('startParsing audited transport end marker not found.');
if(fn.indexOf(genericDelayNeedle,transportEnd+genericDelayNeedle.length)>=0)die('Unexpected marker after audited startParsing transport block.');

const newTransport=`      try{\n        const p=await ai.requestJson({model:'llama-3.1-8b-instant',max_tokens:8000,temperature:0,response_format:{type:'json_object'},messages:[{role:'system',content:'You are a metals procurement AI. Respond with valid JSON only, no markdown. Every row in the source table is a real, separate line item — never merge, deduplicate, or omit rows.'},{role:'user',content:prompt}]});\n        if(Array.isArray(p.items)) merged.items=merged.items.concat(p.items);\n        if(p.issues&&p.issues.length) merged.issues=merged.issues.concat(p.issues.map(x=>'[Pjesa '+(ci+1)+'] '+x));\n        if(!merged.project_summary&&p.project_summary) merged.project_summary=p.project_summary;\n        if(p.confidence==='low') merged.confidence='low';\n        else if(p.confidence==='medium'&&merged.confidence!=='low') merged.confidence='medium';\n      }catch(pe){\n        const code=String(pe&&pe.pstAiCode||'');\n        if(code==='HTTP'){\n          var apiErr=String(pe&&pe.message||'HTTP');\n          var human=apiErr;\n          if(/too large|context|token/i.test(apiErr)) human='Dokumenti/pjesa është shumë e madhe për modelin AI. Ndaje dokumentin në pjesë më të vogla.';\n          else if(/rate limit|429/i.test(apiErr)) human='Kufiri i shpejtësisë së API u arrit (rate limit). Prit pak minuta dhe provo sërish.';\n          else if(/invalid api key|authentication|401|unauthorized/i.test(apiErr)) human='Groq API Key i pavlefshëm ose skaduar — kontrollo te Cilësimet.';\n          else if(/model|not found|decommission/i.test(apiErr)) human='Modeli AI nuk është i disponueshëm më. Duhet përditësuar modeli te kodi.';\n          merged.issues.push('Pjesa '+(ci+1)+'/'+chunks.length+': '+human+' ('+apiErr+')');\n          merged.confidence='low';\n        }else if(code==='EMPTY'){\n          merged.issues.push('Pjesa '+(ci+1)+'/'+chunks.length+': AI nuk ktheu përgjigje (bosh). Provo sërish ose verifiko manualisht.');\n          merged.confidence='medium';\n        }else if(code==='INVALID_JSON'){\n          merged.issues.push('Pjesa '+(ci+1)+'/'+chunks.length+': JSON invalid ('+pe.message+') — pozicionet e kësaj pjese mund të mungojnë, verifiko manualisht.');\n          merged.confidence='medium';\n        }else{\n          throw pe;\n        }\n      }\n`;
fn=fn.slice(0,transportStart)+newTransport+fn.slice(transportEnd);

if(fn.includes('api.groq.com/openai/v1/chat/completions'))die('startParsing still contains direct Groq endpoint.');
if(fn.includes('pristeel_apikey'))die('startParsing still contains direct legacy AI key.');
if(!fn.includes("ai.requestJson({model:'llama-3.1-8b-instant',max_tokens:8000,temperature:0"))die('startParsing explicit request contract missing.');
if(!fn.includes("code==='HTTP'" )||!fn.includes("code==='EMPTY'")||!fn.includes("code==='INVALID_JSON'"))die('startParsing typed soft-error mapping missing.');
if(!fn.includes('throw pe;'))die('startParsing network/untyped error propagation missing.');
if((fn.match(new RegExp(genericDelayNeedle.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'g'))||[]).length!==1)die('startParsing final inter-chunk delay contract changed unexpectedly.');

html=html.slice(0,extracted.start)+fn+html.slice(extracted.end);
fs.writeFileSync(htmlPath,html,'utf8');

const manifest=JSON.parse(read(manifestPath));
manifest.auditedAtCommit=BASELINE;
fs.writeFileSync(manifestPath,`${JSON.stringify(manifest,null,2)}\n`,'utf8');

console.log('Cleanup 15E1 migration applied.');
console.log('Migrated inline caller: startParsing()');
console.log('Deterministic parser path unchanged.');
console.log('Chunking, prompt/model/token budget, soft chunk failures and outer network failure behavior preserved.');
