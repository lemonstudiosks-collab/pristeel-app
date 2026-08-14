import fs from 'node:fs';

function replaceOnce(source,before,after,label){
  const i=source.indexOf(before);
  if(i<0)throw new Error(`Missing expected ${label}`);
  if(source.indexOf(before,i+before.length)>=0)throw new Error(`Ambiguous ${label}`);
  return source.slice(0,i)+after+source.slice(i+before.length);
}

const htmlPath='pristeel-procurement.html';
let html=fs.readFileSync(htmlPath,'utf8');

const oldKey=`async function qAnalyzeOffer(inboxId, subject, sender){
  var apiKey=localStorage.getItem('pristeel_apikey')||'';
  if(!apiKey){alert('Mungon Groq API Key — shko te Cilësimet fillimisht.');return;}`;
const newKey=`async function qAnalyzeOffer(inboxId, subject, sender){
  var ai=window.PSTAI;
  if(!ai||typeof ai.hasApiKey!=='function'||typeof ai.requestJson!=='function'||!ai.hasApiKey()){alert('Mungon Groq API Key — shko te Cilësimet fillimisht.');return;}`;
html=replaceOnce(html,oldKey,newKey,'qAnalyzeOffer legacy key block');

const oldRequest=`    var resp=await fetch('https://api.groq.com/openai/v1/chat/completions',{
      method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+apiKey},
      body:JSON.stringify({model:'llama-3.1-8b-instant',max_tokens:3000,temperature:0,
        messages:[{role:'system',content:'You are a steel procurement AI. Respond with valid JSON only. Never merge or average line items.'},{role:'user',content:prompt2}]})
    });
    var data=await resp.json();
    var raw=data.choices&&data.choices[0]&&data.choices[0].message.content||'';
    var s=raw.indexOf('{'), e=raw.lastIndexOf('}');
    var parsed=JSON.parse(raw.slice(s,e+1));`;
const newRequest=`    var parsed=await ai.requestJson({model:'llama-3.1-8b-instant',max_tokens:3000,temperature:0,response_format:{type:'json_object'},
      messages:[{role:'system',content:'You are a steel procurement AI. Respond with valid JSON only. Never merge or average line items.'},{role:'user',content:prompt2}]});
    if(!parsed||typeof parsed!=='object'||Array.isArray(parsed)) throw new Error('Unexpected end of JSON input');`;
html=replaceOnce(html,oldRequest,newRequest,'qAnalyzeOffer direct Groq request block');
fs.writeFileSync(htmlPath,html,'utf8');

const manifestPath='runtime-manifest.json';
let manifest=fs.readFileSync(manifestPath,'utf8');
manifest=replaceOnce(
  manifest,
  '"auditedAtCommit": "064b0374d69154b6ffaaed85b72d3878ec1ba81c"',
  '"auditedAtCommit": "4861f4a8720823676d98c97cee381054aa480ab0"',
  'runtime manifest audited baseline'
);
fs.writeFileSync(manifestPath,manifest,'utf8');

console.log('qAnalyzeOffer migration applied from main 4861f4a8720823676d98c97cee381054aa480ab0.');
