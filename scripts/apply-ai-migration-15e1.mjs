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

const oldTransport=String.raw`      const resp=await fetch('https://api.groq.com/openai/v1/chat/completions',{
        method:'POST',
        headers:{'Content-Type':'application/json','Authorization':'Bearer '+apiKey},
        body:JSON.stringify({model:'llama-3.1-8b-instant',max_tokens:8000,temperature:0,messages:[{role:'system',content:'You are a metals procurement AI. Respond with valid JSON only, no markdown. Every row in the source table is a real, separate line item — never merge, deduplicate, or omit rows.'},{role:'user',content:prompt}]})
      });
      const data=await resp.json();
      // ── Kap gabimet e API-t QARTË (para se të provohet JSON parse) ──
      if(!resp.ok || data.error){
        var apiErr=(data.error&&(data.error.message||data.error))||('HTTP '+resp.status);
        var human=apiErr;
        if(/too large|context|token/i.test(apiErr)) human='Dokumenti/pjesa është shumë e madhe për modelin AI. Ndaje dokumentin në pjesë më të vogla.';
        else if(/rate limit|429/i.test(apiErr)) human='Kufiri i shpejtësisë së API u arrit (rate limit). Prit pak minuta dhe provo sërish.';
        else if(/invalid api key|authentication|401|unauthorized/i.test(apiErr)) human='Groq API Key i pavlefshëm ose skaduar — kontrollo te Cilësimet.';
        else if(/model|not found|decommission/i.test(apiErr)) human='Modeli AI nuk është i disponueshëm më. Duhet përditësuar modeli te kodi.';
        merged.issues.push('Pjesa '+(ci+1)+'/'+chunks.length+': '+human+' ('+apiErr+')');
        merged.confidence='low';
        if(ci+1<chunks.length) await delay(400);
        continue;
      }
      const raw=data.choices?.[0]?.message?.content||'';
      if(!raw.trim()){
        merged.issues.push('Pjesa '+(ci+1)+'/'+chunks.length+': AI nuk ktheu përgjigje (bosh). Provo sërish ose verifiko manualisht.');
        merged.confidence='medium';
        if(ci+1<chunks.length) await delay(400);
        continue;
      }
      try{
        let jsonStr=raw.replace(/```json\s*/gi,'').replace(/```\s*/g,'').trim();
        const s=jsonStr.indexOf('{'), e=jsonStr.lastIndexOf('}');
        if(s!==-1&&e!==-1) jsonStr=jsonStr.slice(s,e+1);
        else throw new Error('nuk u gjet JSON në përgjigje');
        const p=JSON.parse(jsonStr);
        if(Array.isArray(p.items)) merged.items=merged.items.concat(p.items);
        if(p.issues&&p.issues.length) merged.issues=merged.issues.concat(p.issues.map(x=>'[Pjesa '+(ci+1)+'] '+x));
        if(!merged.project_summary&&p.project_summary) merged.project_summary=p.project_summary;
        if(p.confidence==='low') merged.confidence='low';
        else if(p.confidence==='medium'&&merged.confidence!=='low') merged.confidence='medium';
      }catch(pe){
        merged.issues.push('Pjesa '+(ci+1)+'/'+chunks.length+': JSON invalid ('+pe.message+') — pozicionet e kësaj pjese mund të mungojnë, verifiko manualisht.');
        merged.confidence='medium';
      }`;

const newTransport=String.raw`      try{
        const p=await ai.requestJson({model:'llama-3.1-8b-instant',max_tokens:8000,temperature:0,response_format:{type:'json_object'},messages:[{role:'system',content:'You are a metals procurement AI. Respond with valid JSON only, no markdown. Every row in the source table is a real, separate line item — never merge, deduplicate, or omit rows.'},{role:'user',content:prompt}]});
        if(Array.isArray(p.items)) merged.items=merged.items.concat(p.items);
        if(p.issues&&p.issues.length) merged.issues=merged.issues.concat(p.issues.map(x=>'[Pjesa '+(ci+1)+'] '+x));
        if(!merged.project_summary&&p.project_summary) merged.project_summary=p.project_summary;
        if(p.confidence==='low') merged.confidence='low';
        else if(p.confidence==='medium'&&merged.confidence!=='low') merged.confidence='medium';
      }catch(pe){
        const code=String(pe&&pe.pstAiCode||'');
        if(code==='HTTP'){
          var apiErr=String(pe&&pe.message||'HTTP');
          var human=apiErr;
          if(/too large|context|token/i.test(apiErr)) human='Dokumenti/pjesa është shumë e madhe për modelin AI. Ndaje dokumentin në pjesë më të vogla.';
          else if(/rate limit|429/i.test(apiErr)) human='Kufiri i shpejtësisë së API u arrit (rate limit). Prit pak minuta dhe provo sërish.';
          else if(/invalid api key|authentication|401|unauthorized/i.test(apiErr)) human='Groq API Key i pavlefshëm ose skaduar — kontrollo te Cilësimet.';
          else if(/model|not found|decommission/i.test(apiErr)) human='Modeli AI nuk është i disponueshëm më. Duhet përditësuar modeli te kodi.';
          merged.issues.push('Pjesa '+(ci+1)+'/'+chunks.length+': '+human+' ('+apiErr+')');
          merged.confidence='low';
        }else if(code==='EMPTY'){
          merged.issues.push('Pjesa '+(ci+1)+'/'+chunks.length+': AI nuk ktheu përgjigje (bosh). Provo sërish ose verifiko manualisht.');
          merged.confidence='medium';
        }else if(code==='INVALID_JSON'){
          merged.issues.push('Pjesa '+(ci+1)+'/'+chunks.length+': JSON invalid ('+pe.message+') — pozicionet e kësaj pjese mund të mungojnë, verifiko manualisht.');
          merged.confidence='medium';
        }else{
          throw pe;
        }
      }`;
fn=replaceOnce(fn,oldTransport,newTransport,'startParsing direct Groq transport and parse block');

if(fn.includes('api.groq.com/openai/v1/chat/completions'))die('startParsing still contains direct Groq endpoint.');
if(fn.includes('pristeel_apikey'))die('startParsing still contains direct legacy AI key.');
if(!fn.includes("ai.requestJson({model:'llama-3.1-8b-instant',max_tokens:8000,temperature:0"))die('startParsing explicit request contract missing.');
if(!fn.includes("code==='HTTP'" )||!fn.includes("code==='EMPTY'")||!fn.includes("code==='INVALID_JSON'"))die('startParsing typed soft-error mapping missing.');
if(!fn.includes('throw pe;'))die('startParsing network/untyped error propagation missing.');

html=html.slice(0,extracted.start)+fn+html.slice(extracted.end);
fs.writeFileSync(htmlPath,html,'utf8');

const manifest=JSON.parse(read(manifestPath));
manifest.auditedAtCommit=BASELINE;
fs.writeFileSync(manifestPath,`${JSON.stringify(manifest,null,2)}\n`,'utf8');

console.log('Cleanup 15E1 migration applied.');
console.log('Migrated inline caller: startParsing()');
console.log('Deterministic parser path unchanged.');
console.log('Chunking, prompt/model/token budget, soft chunk failures and outer network failure behavior preserved.');
