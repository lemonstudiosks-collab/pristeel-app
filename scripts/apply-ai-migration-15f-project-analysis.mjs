import fs from 'node:fs';

function replaceOnce(source,before,after,label){
  const i=source.indexOf(before);
  if(i<0)throw new Error(`Missing expected ${label}`);
  if(source.indexOf(before,i+before.length)>=0)throw new Error(`Ambiguous ${label}`);
  return source.slice(0,i)+after+source.slice(i+before.length);
}

const path='pristeel-project-analysis.js';
let source=fs.readFileSync(path,'utf8');
const groqStart=source.indexOf('async function groq(model,messages,maxTokens){');
const askStart=source.indexOf('async function ask(model,messages,maxTokens){',groqStart);
if(groqStart<0||askStart<0)throw new Error('Project Analysis AI helper boundary not found.');
const oldGroq=source.slice(groqStart,askStart);
for(const needle of ["localStorage.getItem('pristeel_apikey')","https://api.groq.com/openai/v1/chat/completions","safeJson(c)","Modeli nuk ktheu analizë."]){
  if(!oldGroq.includes(needle))throw new Error(`Legacy groq helper missing expected contract: ${needle}`);
}
const newGroq=`async function groq(model,messages,maxTokens){
  var ai=window.PSTAI;if(!ai||typeof ai.hasApiKey!=='function'||typeof ai.requestJson!=='function'||!ai.hasApiKey())throw new Error('Mungon Groq API Key te Cilësimet.');
  try{return await ai.requestJson({model:model,messages:messages,max_tokens:maxTokens||5000,temperature:0,response_format:{type:'json_object'}})}
  catch(e){var code=String(e&&e.pstAiCode||'');if(code==='MISSING_KEY')throw new Error('Mungon Groq API Key te Cilësimet.');if(code==='EMPTY')throw new Error('Modeli nuk ktheu analizë.');throw e}
}
`;
source=source.slice(0,groqStart)+newGroq+source.slice(askStart);

source=replaceOnce(
  source,
  "setState(pid,'Po mblidhen të dhënat e projektit…');var previous=await latest(pid),b=await collect(pid),key=localStorage.getItem('pristeel_apikey')||'',a,engine='rules',model=null;prog(pid,true,44);\n    if(key){",
  "setState(pid,'Po mblidhen të dhënat e projektit…');var previous=await latest(pid),b=await collect(pid),ai=window.PSTAI,a,engine='rules',model=null;prog(pid,true,44);\n    if(ai&&typeof ai.hasApiKey==='function'&&ai.hasApiKey()){",""project analysis AI-vs-rules gate""
);
fs.writeFileSync(path,source,'utf8');

const manifestPath='runtime-manifest.json';
let manifest=fs.readFileSync(manifestPath,'utf8');
manifest=replaceOnce(
  manifest,
  '"auditedAtCommit": "bc076390c156a94ac9e2bf74c348837437b6c57e"',
  '"auditedAtCommit": "74791c4f9c57746e2bae4df4796ef14f419776af"',
  'runtime manifest audited baseline'
);
fs.writeFileSync(manifestPath,manifest,'utf8');

console.log('Project Analysis AI migration applied from main 74791c4f9c57746e2bae4df4796ef14f419776af.');
