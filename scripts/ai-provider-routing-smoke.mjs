import fs from 'node:fs';
import vm from 'node:vm';

function assert(condition,message){if(!condition)throw new Error(`AI PROVIDER ROUTING SMOKE FAILED: ${message}`);}

const compatSource=fs.readFileSync('pristeel-groq-rate-limit.js','utf8');
const groqSource=fs.readFileSync('pristeel-groq-gptoss-provider-v1.js','utf8');
assert(compatSource.includes('window.PSTAI.requestTransport='),'compatibility layer does not publish explicit requestTransport.');
assert(compatSource.includes('window.PSTAI.requestJson=async function'),'explicit requestJson API disappeared.');
assert(compatSource.includes('window.PSTAI.requestTransport(body,key)'),'requestJson does not call explicit requestTransport.');
assert(!/window\.PSTAI\.requestJson=async function\([^]*?await window\.fetch\(/.test(compatSource),'requestJson still depends directly on global window.fetch.');
assert(groqSource.includes('previousRequestTransport'),'GPT-OSS provider does not chain the explicit transport.');
assert(groqSource.includes('window.PSTAI.requestTransport=async function'),'GPT-OSS provider does not override explicit requestTransport.');

const store=new Map();
globalThis.localStorage={
  getItem(k){return store.has(k)?store.get(k):null;},
  setItem(k,v){store.set(k,String(v));},
  removeItem(k){store.delete(k);}
};
globalThis.document={
  readyState:'complete',activeElement:null,head:{appendChild(){}},
  getElementById(){return null;},addEventListener(){},createElement(){return{style:{},appendChild(){}};}
};
globalThis.window=globalThis;
globalThis.performance={now:()=>Date.now()};

let nativeCalls=[];
let xhrCalls=[];
const nativeFetch=async function nativeFetchStub(url,init={}){
  nativeCalls.push({url:String(url),init});
  if(String(url).includes('generativelanguage.googleapis.com')){
    return new Response(JSON.stringify({candidates:[{content:{parts:[{text:'{"route":"gemini"}'}]}}],usageMetadata:{promptTokenCount:4,candidatesTokenCount:2,totalTokenCount:6}}),{status:200,headers:{'Content-Type':'application/json'}});
  }
  if(String(url).includes('api.groq.com/openai/v1/chat/completions')){
    return new Response(JSON.stringify({choices:[{message:{content:'{"route":"legacy"}'}}]}),{status:200,headers:{'Content-Type':'application/json'}});
  }
  return new Response('ok',{status:200,headers:{'Content-Type':'text/plain'}});
};
globalThis.fetch=nativeFetch;

class FakeXHR{
  constructor(){this.headers={};this.readyState=0;this.status=0;this.statusText='';this.responseText='';}
  open(method,url){this.method=method;this.url=url;}
  setRequestHeader(k,v){this.headers[k]=v;}
  getAllResponseHeaders(){return 'content-type: application/json\r\n';}
  send(body){
    xhrCalls.push({method:this.method,url:this.url,headers:{...this.headers},body:String(body||'')});
    this.status=200;this.statusText='OK';this.responseText=JSON.stringify({choices:[{message:{content:'{"route":"gptoss"}'}}],usage:{prompt_tokens:3,completion_tokens:2,total_tokens:5}});this.readyState=4;
    queueMicrotask(()=>{if(typeof this.onreadystatechange==='function')this.onreadystatechange();});
  }
}
globalThis.XMLHttpRequest=FakeXHR;

vm.runInThisContext(compatSource,{filename:'pristeel-groq-rate-limit.js'});
assert(globalThis.fetch===nativeFetch,'compatibility layer changed global fetch after wrapper removal.');
assert(typeof window.PSTAI.requestTransport==='function','compatibility explicit transport missing at runtime.');
assert(typeof window.PSTAI.requestJson==='function','requestJson missing at runtime.');

// Legacy compatibility path must route directly through the captured native fetch, preserving body/key.
localStorage.setItem('pristeel_apikey','legacy-test-key');
nativeCalls=[];xhrCalls=[];
let out=await window.PSTAI.requestJson({model:'llama-3.3-70b-versatile',messages:[{role:'user',content:'Return JSON.'}],max_tokens:2400,temperature:0,response_format:{type:'json_object'}});
assert(out&&out.route==='legacy','legacy explicit transport returned wrong parsed result.');
assert(nativeCalls.length===1&&nativeCalls[0].url.includes('api.groq.com/openai/v1/chat/completions'),'legacy explicit transport did not use Groq endpoint exactly once.');
assert(nativeCalls[0].init.headers.Authorization==='Bearer legacy-test-key','legacy explicit transport Authorization changed.');
assert(xhrCalls.length===0,'legacy compatibility route unexpectedly used GPT-OSS XHR transport.');

// Gemini must route directly through compatibility transport, not global fetch interception.
localStorage.setItem('pristeel_gemini_apikey','gemini-test-key');
localStorage.setItem('pristeel_gemini_model','gemini-3.1-flash-lite');
localStorage.setItem('pristeel_apikey','__GEMINI_COMPAT__');
nativeCalls=[];xhrCalls=[];
out=await window.PSTAI.requestJson({model:'llama-3.3-70b-versatile',messages:[{role:'system',content:'Return JSON only.'},{role:'user',content:'Return JSON.'}],max_tokens:2400,temperature:0,response_format:{type:'json_object'}});
assert(out&&out.route==='gemini','Gemini explicit transport returned wrong parsed result.');
assert(nativeCalls.length===1&&nativeCalls[0].url.includes('/gemini-3.1-flash-lite:generateContent'),'Gemini explicit transport did not use configured Gemini model.');
assert(nativeCalls[0].init.headers['x-goog-api-key']==='gemini-test-key','Gemini explicit transport key header changed.');
assert(xhrCalls.length===0,'Gemini route unexpectedly used GPT-OSS XHR transport.');

// Load GPT-OSS provider. It must chain requestTransport explicitly without changing global fetch.
vm.runInThisContext(groqSource,{filename:'pristeel-groq-gptoss-provider-v1.js'});
assert(globalThis.fetch===nativeFetch,'GPT-OSS provider changed global fetch after wrapper removal.');
assert(typeof window.PSTAI.requestTransport==='function','GPT-OSS explicit transport override missing at runtime.');
localStorage.setItem('pristeel_groq_apikey','gsk-test-key');
assert(window.PSTAI.activateGroqGptOss('gsk-test-key')===true,'GPT-OSS activation changed.');
nativeCalls=[];xhrCalls=[];
out=await window.PSTAI.requestJson({model:'llama-3.3-70b-versatile',messages:[{role:'user',content:'Return JSON.'}],max_tokens:2400,temperature:0,response_format:{type:'json_object'}});
assert(out&&out.route==='gptoss','GPT-OSS explicit transport returned wrong parsed result.');
assert(xhrCalls.length===1,'GPT-OSS explicit transport did not use one XHR request.');
assert(nativeCalls.length===0,'GPT-OSS explicit transport leaked through native/global fetch chain.');
const gBody=JSON.parse(xhrCalls[0].body);
assert(gBody.model==='openai/gpt-oss-20b','GPT-OSS model override changed.');
assert(gBody.max_tokens===2200,'GPT-OSS first-attempt token shaping changed.');
assert(xhrCalls[0].headers.Authorization==='Bearer gsk-test-key','GPT-OSS Authorization changed.');

// Deactivation must delegate to the previous explicit transport, preserving Gemini behavior.
window.PSTAI.deactivateGroqGptOss();
localStorage.setItem('pristeel_gemini_apikey','gemini-test-key');
localStorage.setItem('pristeel_apikey','__GEMINI_COMPAT__');
nativeCalls=[];xhrCalls=[];
out=await window.PSTAI.requestJson({messages:[{role:'user',content:'Return JSON.'}],max_tokens:100});
assert(out&&out.route==='gemini','deactivated GPT-OSS did not delegate to previous explicit transport.');
assert(nativeCalls.length===1&&xhrCalls.length===0,'deactivated GPT-OSS routing chain changed.');

// With AI wrappers removed, unrelated fetch traffic remains direct/native.
nativeCalls=[];xhrCalls=[];
const unrelated=await window.fetch('https://example.com/health');
assert(unrelated.ok,'unrelated native fetch failed.');
assert(nativeCalls.length===1&&nativeCalls[0].url==='https://example.com/health','unrelated fetch is no longer native/direct.');
assert(xhrCalls.length===0,'unrelated traffic reached GPT-OSS XHR.');

console.log('Explicit AI provider routing smoke passed');
