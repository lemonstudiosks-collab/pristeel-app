import fs from 'node:fs';

function replaceOnce(source,before,after,label){
  const i=source.indexOf(before);
  if(i<0)throw new Error(`Missing expected ${label}`);
  if(source.indexOf(before,i+before.length)>=0)throw new Error(`Ambiguous ${label}`);
  return source.slice(0,i)+after+source.slice(i+before.length);
}

const htmlPath='pristeel-procurement.html';
let html=fs.readFileSync(htmlPath,'utf8');

html=replaceOnce(
  html,
  `async function qAnalyzeAll(){\n  var apiKey=localStorage.getItem('pristeel_apikey')||'';\n  if(!apiKey){alert('Mungon Groq API Key — Cilësimet.');return;}`,
  `async function qAnalyzeAll(){\n  var ai=window.PSTAI;\n  if(!ai||typeof ai.hasApiKey!=='function'||typeof ai.requestJson!=='function'||!ai.hasApiKey()){alert('Mungon Groq API Key — Cilësimet.');return;}`,
  'qAnalyzeAll legacy key block'
);
html=replaceOnce(
  html,
  `var done=await qAnalyzeOne(r.id, r.subject, r.sender, guess.match, apiKey);`,
  `var done=await qAnalyzeOne(r.id, r.subject, r.sender, guess.match, ai);`,
  'qAnalyzeAll qAnalyzeOne AI argument'
);
html=replaceOnce(
  html,
  `async function qAnalyzeOne(inboxId, subject, sender, proj, apiKey){`,
  `async function qAnalyzeOne(inboxId, subject, sender, proj, ai){`,
  'qAnalyzeOne signature'
);

const oldRequest=`  var resp=await fetch('https://api.groq.com/openai/v1/chat/completions',{\n    method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+apiKey},\n    body:JSON.stringify({model:'llama-3.1-8b-instant',max_tokens:3000,temperature:0,\n      messages:[{role:'system',content:'Steel procurement AI. Valid JSON only. Never merge line items.'},{role:'user',content:prompt}]})\n  });\n  var data=await resp.json();\n  var raw=(data.choices&&data.choices[0]&&data.choices[0].message.content)||'';\n  var s=raw.indexOf('{'), e=raw.lastIndexOf('}');\n  if(s<0||e<0) return false;\n  var p=JSON.parse(raw.slice(s,e+1));`;
const newRequest=`  var p;\n  try{\n    p=await ai.requestJson({model:'llama-3.1-8b-instant',max_tokens:3000,temperature:0,response_format:{type:'json_object'},\n      messages:[{role:'system',content:'Steel procurement AI. Valid JSON only. Never merge line items.'},{role:'user',content:prompt}]});\n  }catch(aiErr){\n    var code=String(aiErr&&aiErr.pstAiCode||'');\n    if(code==='HTTP'||code==='EMPTY'||code==='INVALID_JSON') return false;\n    throw aiErr;\n  }\n  if(!p||typeof p!=='object'||Array.isArray(p)) return false;`;
html=replaceOnce(html,oldRequest,newRequest,'qAnalyzeOne direct Groq request block');
fs.writeFileSync(htmlPath,html,'utf8');

const manifestPath='runtime-manifest.json';
let manifest=fs.readFileSync(manifestPath,'utf8');
manifest=replaceOnce(
  manifest,
  '"auditedAtCommit": "4861f4a8720823676d98c97cee381054aa480ab0"',
  '"auditedAtCommit": "bc076390c156a94ac9e2bf74c348837437b6c57e"',
  'runtime manifest audited baseline'
);
fs.writeFileSync(manifestPath,manifest,'utf8');

console.log('qAnalyze batch migration applied from main bc076390c156a94ac9e2bf74c348837437b6c57e.');
