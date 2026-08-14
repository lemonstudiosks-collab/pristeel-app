import fs from 'node:fs';

const BASELINE='064b0374d69154b6ffaaed85b72d3878ec1ba81c';
const htmlPath='pristeel-procurement.html';
const manifestPath='runtime-manifest.json';

function die(message){console.error(`CLEANUP 15E2 MIGRATION ERROR: ${message}`);process.exit(1);}
function read(path){if(!fs.existsSync(path))die(`Missing file: ${path}`);return fs.readFileSync(path,'utf8');}
function extractFunction(source,needle){
  const start=source.indexOf(needle);if(start<0)die(`Function not found: ${needle}`);
  const brace=source.indexOf('{',start);let depth=0,quote='',escaped=false,lineComment=false,blockComment=false,end=-1;
  for(let i=brace;i<source.length;i++){
    const ch=source[i],nx=source[i+1]||'';
    if(lineComment){if(ch==='\n')lineComment=false;continue;}
    if(blockComment){if(ch==='*'&&nx==='/'){blockComment=false;i++;}continue;}
    if(quote){if(escaped){escaped=false;continue;}if(ch==='\\'){escaped=true;continue;}if(ch===quote)quote='';continue;}
    if(ch==='/'&&nx==='/'){lineComment=true;i++;continue;}
    if(ch==='/'&&nx==='*'){blockComment=true;i++;continue;}
    if(ch==='"'||ch==="'"||ch==='`'){quote=ch;continue;}
    if(ch==='{')depth++;else if(ch==='}'){depth--;if(depth===0){end=i+1;break;}}
  }
  if(end<0)die(`Function closing brace not found: ${needle}`);
  return {start,end,text:source.slice(start,end)};
}
function replaceOnce(source,before,after,label){const i=source.indexOf(before);if(i<0)die(`Expected contract not found: ${label}`);if(source.indexOf(before,i+before.length)>=0)die(`Ambiguous contract: ${label}`);return source.slice(0,i)+after+source.slice(i+before.length);}

let html=read(htmlPath);
const extracted=extractFunction(html,'async function parseOffer()');
let fn=extracted.text;
if((fn.match(/api\.groq\.com\/openai\/v1\/chat\/completions/g)||[]).length!==1)die('parseOffer direct Groq endpoint count is not exactly 1.');
if((fn.match(/pristeel_apikey/g)||[]).length!==1)die('parseOffer legacy key count is not exactly 1.');

const oldKey="  const apiKey=localStorage.getItem('pristeel_apikey')||'';\n  if(!apiKey){document.getElementById('pdf-status').textContent='Mungon API Key — shko te Cilësimet.';return;}";
const newKey="  const ai=window.PSTAI;\n  if(!ai||typeof ai.hasApiKey!=='function'||typeof ai.requestJson!=='function'||!ai.hasApiKey()){document.getElementById('pdf-status').textContent='Mungon API Key — shko te Cilësimet.';return;}";
fn=replaceOnce(fn,oldKey,newKey,'parseOffer AI availability contract');

const requestStart="    const resp=await fetch('https://api.groq.com/openai/v1/chat/completions',{";
const requestStartIndex=fn.indexOf(requestStart);
if(requestStartIndex<0)die('parseOffer direct request start not found.');
const correctionsStart="  const mA=text.match(/Amount\\s*A[\\s\\S]{0,40}?([\\d.,]+)/i);";
const correctionsIndex=fn.indexOf(correctionsStart,requestStartIndex);
if(correctionsIndex<0)die('parseOffer post-AI correction block not found.');
const prefixBeforeRequest=fn.slice(0,requestStartIndex);
const suffixFromCorrections=fn.slice(correctionsIndex);
const newRequest=`    let parsed;\n    try{\n      parsed=await ai.requestJson({model:'llama-3.1-8b-instant',max_tokens:3000,temperature:0,response_format:{type:'json_object'},messages:[{role:'system',content:'You are a steel procurement AI. Respond with valid JSON only. Never merge or average line items.'},{role:'user',content:prompt}]});\n    }catch(aiErr){\n      const code=String(aiErr&&aiErr.pstAiCode||'');\n      if(code==='HTTP'||code==='EMPTY'||code==='INVALID_JSON'){\n        document.getElementById('pdf-status').textContent='⚠ Nuk u lexua saktë — provo të ngjitësh tekstin manualisht.';\n        return;\n      }\n      throw aiErr;\n    }\n    document.getElementById('pdf-prog').style.width='100%';\n    try{\n`;
fn=prefixBeforeRequest+newRequest+suffixFromCorrections;

if(fn.includes('api.groq.com/openai/v1/chat/completions'))die('parseOffer still contains direct Groq endpoint.');
if(fn.includes('pristeel_apikey'))die('parseOffer still contains direct legacy AI key.');
if(!fn.includes("ai.requestJson({model:'llama-3.1-8b-instant',max_tokens:3000,temperature:0"))die('parseOffer explicit request contract missing.');
if(!fn.includes("code==='HTTP'||code==='EMPTY'||code==='INVALID_JSON'"))die('parseOffer typed response failure mapping missing.');
if(!fn.includes("document.getElementById('pdf-status').textContent='⚠ Nuk u lexua saktë — provo të ngjitësh tekstin manualisht.';"))die('parseOffer warning text changed.');
if(!fn.includes('throw aiErr;'))die('parseOffer network/untyped failure propagation missing.');
for(const marker of [
  "const mA=text.match(/Amount\\s*A[\\s\\S]{0,40}?([\\d.,]+)/i);",
  "const mSum=text.match(/Summary\\s*A\\+B[\\s\\S]{0,60}?([\\d.,]+)/i);",
  "const mW=text.match(/(\\d{4,7})\\s+\\1(?!\\d)/);",
  "offers.push({",
  "supaFetch('offers','POST'",
  "renderOffers();"
]) if(!fn.includes(marker))die(`parseOffer downstream contract missing: ${marker}`);

html=html.slice(0,extracted.start)+fn+html.slice(extracted.end);
fs.writeFileSync(htmlPath,html,'utf8');

const manifest=JSON.parse(read(manifestPath));
manifest.auditedAtCommit=BASELINE;
fs.writeFileSync(manifestPath,`${JSON.stringify(manifest,null,2)}\n`,'utf8');

console.log('Cleanup 15E2 migration applied.');
console.log('Migrated inline caller: parseOffer()');
console.log('Prompt/model/token budget, commercial extraction, deterministic regex corrections and persistence flow preserved.');
console.log('Response-level AI failures preserve warning/return; network/untyped errors preserve outer catch.');
