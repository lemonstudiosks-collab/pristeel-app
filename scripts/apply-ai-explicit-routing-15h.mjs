import fs from 'node:fs';

function replaceOnce(source,before,after,label){
  const i=source.indexOf(before);
  if(i<0)throw new Error(`Missing expected ${label}`);
  if(source.indexOf(before,i+before.length)>=0)throw new Error(`Ambiguous ${label}`);
  return source.slice(0,i)+after+source.slice(i+before.length);
}

// Compatibility layer: expose an explicit response transport that preserves the current Gemini/legacy queue and retry behavior.
{
  const path='pristeel-groq-rate-limit.js';
  let s=fs.readFileSync(path,'utf8');
  s=replaceOnce(s,
    "window.PSTAI=window.PSTAI||{};\nwindow.PSTAI.provider=function(){return geminiKey()?'gemini':'groq'};",
    "window.PSTAI=window.PSTAI||{};\nasync function compatibilityRequestTransport(body,key){var input='https://'+LEGACY_GROQ_URL;var init={method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+String(key||'')},body:JSON.stringify(body||{})};var run=function(){return geminiCompatFetch(input,init)};var result=queue.then(run,run);queue=result.then(function(){},function(){});return result}\nwindow.PSTAI.requestTransport=compatibilityRequestTransport;\nwindow.PSTAI.provider=function(){return geminiKey()?'gemini':'groq'};",
    'compatibility explicit transport insertion');
  s=replaceOnce(s,
    "var r=await window.fetch('https://'+LEGACY_GROQ_URL,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+key},body:JSON.stringify(body)});",
    "var r=await window.PSTAI.requestTransport(body,key);",
    'requestJson global-fetch routing');
  fs.writeFileSync(path,s,'utf8');
}

// GPT-OSS provider: chain the explicit transport when active while preserving the existing global fetch wrapper as fallback compatibility.
{
  const path='pristeel-groq-gptoss-provider-v1.js';
  let s=fs.readFileSync(path,'utf8');
  s=replaceOnce(s,
    "window.PSTAI=window.PSTAI||{};\nvar previousProvider=typeof window.PSTAI.provider==='function'?window.PSTAI.provider:null;",
    "window.PSTAI=window.PSTAI||{};\nvar previousRequestTransport=typeof window.PSTAI.requestTransport==='function'?window.PSTAI.requestTransport:null;\nvar previousProvider=typeof window.PSTAI.provider==='function'?window.PSTAI.provider:null;",
    'GPT-OSS previous explicit transport capture');
  s=replaceOnce(s,
    "window.PSTAI.model=function(){return active()?MODEL:(previousModel?previousModel():'unknown');};\nwindow.PSTAI.groqKey=groqKey;",
    "window.PSTAI.model=function(){return active()?MODEL:(previousModel?previousModel():'unknown');};\nwindow.PSTAI.requestTransport=async function(body,key){if(!active()){if(!previousRequestTransport)throw new Error('PSTAI request transport chain is unavailable.');return previousRequestTransport(body,key)}var init={method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+groqKey()},body:JSON.stringify(body||{})};var run=function(){return groqFetch(GROQ_URL,init)};var result=queue.then(run,run);queue=result.then(function(){},function(){});return result};\nwindow.PSTAI.groqKey=groqKey;",
    'GPT-OSS explicit transport override');
  fs.writeFileSync(path,s,'utf8');
}

const manifestPath='runtime-manifest.json';
let manifest=fs.readFileSync(manifestPath,'utf8');
manifest=replaceOnce(
  manifest,
  '"auditedAtCommit": "bbb60f733734263da1582a18145eb0f271c9ed36"',
  '"auditedAtCommit": "87a6f5c82d9350811ea09de9cd083470a0d6483c"',
  'runtime manifest audited baseline'
);
fs.writeFileSync(manifestPath,manifest,'utf8');

console.log('Explicit AI provider routing applied from main 87a6f5c82d9350811ea09de9cd083470a0d6483c.');
