import fs from 'node:fs';
import vm from 'node:vm';

function assert(condition,message){if(!condition)throw new Error(`AI COMPAT MARKER RETIREMENT SMOKE FAILED: ${message}`);}
const compatSource=fs.readFileSync('pristeel-groq-rate-limit.js','utf8');
const groqSource=fs.readFileSync('pristeel-groq-gptoss-provider-v1.js','utf8');

assert((compatSource.match(/pristeel_apikey/g)||[]).length===1,'compatibility layer should retain exactly one legacy storage-name occurrence for one-time migration.');
assert((groqSource.match(/pristeel_apikey/g)||[]).length===0,'GPT-OSS provider still owns legacy compatibility storage.');
assert(!compatSource.includes('__GEMINI_COMPAT__'),'Gemini compatibility marker semantics still exist.');
assert(!groqSource.includes('__GROQ_GPTOSS_COMPAT__'),'GPT-OSS compatibility marker semantics still exist.');
assert(!groqSource.includes('__GEMINI_COMPAT__'),'GPT-OSS provider still writes Gemini compatibility marker.');
assert(compatSource.includes("function groqKey(){try{return String(localStorage.getItem('pristeel_groq_apikey')"),'compatibility layer does not read the dedicated Groq key.');
assert(compatSource.includes('function migrateLegacyAiStorage()'),'one-time legacy storage migration shim missing.');
assert(compatSource.includes('window.PSTAI.hasApiKey=function(){return !!(geminiKey()||groqKey())}'),'availability still depends on compatibility marker instead of real keys.');
assert(compatSource.includes('key=geminiKey()||groqKey()'),'requestJson does not select a real provider key.');

function makeEnv(seed={}){
  const store=new Map(Object.entries(seed));
  const calls=[];const xhrCalls=[];
  const context={console,JSON,Array,String,Number,Math,Date,Response,Headers,URL,encodeURIComponent,setTimeout,clearTimeout,queueMicrotask,performance:{now:()=>Date.now()}};
  context.localStorage={getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)};
  context.document={readyState:'complete',activeElement:null,head:{appendChild(){}},getElementById(){return null;},addEventListener(){},createElement(){return{style:{},appendChild(){}};}};
  const nativeFetch=async(url,init={})=>{
    calls.push({url:String(url),init});
    if(String(url).includes('generativelanguage.googleapis.com'))return new Response(JSON.stringify({candidates:[{content:{parts:[{text:'{"route":"gemini"}'}]}}]}),{status:200,headers:{'Content-Type':'application/json'}});
    if(String(url).includes('api.groq.com/openai/v1/chat/completions'))return new Response(JSON.stringify({choices:[{message:{content:'{"route":"groq"}'}}]}),{status:200,headers:{'Content-Type':'application/json'}});
    return new Response('ok',{status:200});
  };
  context.fetch=nativeFetch;
  class FakeXHR{constructor(){this.headers={};this.readyState=0;this.status=0;this.responseText='';this.statusText='';}open(m,u){this.method=m;this.url=u;}setRequestHeader(k,v){this.headers[k]=v;}getAllResponseHeaders(){return 'content-type: application/json\r\n';}send(body){xhrCalls.push({url:this.url,headers:{...this.headers},body:String(body||'')});this.status=200;this.statusText='OK';this.responseText=JSON.stringify({choices:[{message:{content:'{"route":"gptoss"}'}}]});this.readyState=4;queueMicrotask(()=>this.onreadystatechange&&this.onreadystatechange());}}
  context.XMLHttpRequest=FakeXHR;
  context.window=context;
  vm.createContext(context);
  vm.runInContext(compatSource,context,{filename:'compat.js'});
  return{context,store,calls,xhrCalls,nativeFetch};
}

// A real historic Groq key must migrate exactly once to dedicated storage and old storage must disappear.
{
  const h=makeEnv({pristeel_apikey:'gsk_legacy_real'});
  assert(h.store.get('pristeel_groq_apikey')==='gsk_legacy_real','historic real Groq key was not migrated.');
  assert(!h.store.has('pristeel_apikey'),'historic storage was not removed after migration.');
  assert(h.context.PSTAI.hasApiKey()===true,'migrated Groq key is not detected.');
  h.calls.length=0;
  const out=await h.context.PSTAI.requestJson({messages:[{role:'user',content:'json'}]});
  assert(out.route==='groq','migrated legacy key does not route through Groq compatibility transport.');
  assert(h.calls[0].init.headers.Authorization==='Bearer gsk_legacy_real','migrated legacy key Authorization changed.');
}

// Old marker values are removed, not migrated as real credentials; dedicated real keys survive.
{
  const h=makeEnv({pristeel_apikey:'__GEMINI_COMPAT__',pristeel_gemini_apikey:'gemini-real',pristeel_gemini_model:'gemini-3.1-flash-lite'});
  assert(!h.store.has('pristeel_apikey'),'old Gemini marker was not removed.');
  assert(h.store.get('pristeel_gemini_apikey')==='gemini-real','real Gemini key changed during marker cleanup.');
  assert(h.context.PSTAI.hasApiKey()===true,'real Gemini key is not detected without marker.');
  const out=await h.context.PSTAI.requestJson({messages:[{role:'user',content:'json'}]});
  assert(out.route==='gemini','Gemini route still depends on old marker.');
}
{
  const h=makeEnv({pristeel_apikey:'__GROQ_GPTOSS_COMPAT__',pristeel_groq_apikey:'gsk_dedicated'});
  assert(!h.store.has('pristeel_apikey'),'old GPT-OSS marker was not removed.');
  assert(h.store.get('pristeel_groq_apikey')==='gsk_dedicated','dedicated Groq key changed during marker cleanup.');
  assert(h.context.PSTAI.hasApiKey()===true,'dedicated Groq key is not detected without marker.');
}

// Fresh storage without either real key remains unavailable.
{
  const h=makeEnv();
  assert(h.context.PSTAI.hasApiKey()===false,'empty real-key storage reports AI available.');
  let e=null;try{await h.context.PSTAI.requestJson({messages:[]});}catch(err){e=err;}
  assert(e&&e.pstAiCode==='MISSING_KEY','empty real-key storage did not preserve MISSING_KEY behavior.');
}

// GPT provider activation/deactivation must use only dedicated real storage and provider selection.
{
  const h=makeEnv({pristeel_groq_apikey:'gsk_dedicated'});
  vm.runInContext(groqSource,h.context,{filename:'gptoss.js'});
  assert(h.context.PSTAI.activateGroqGptOss('gsk_active')===true,'GPT-OSS activation changed.');
  assert(h.store.get('pristeel_groq_apikey')==='gsk_active','GPT-OSS activation did not store dedicated key.');
  assert(h.store.get('pristeel_ai_provider')==='groq-gptoss','GPT-OSS activation did not store provider selection.');
  assert(!h.store.has('pristeel_apikey'),'GPT-OSS activation recreated retired compatibility storage.');
  h.context.PSTAI.deactivateGroqGptOss();
  assert(!h.store.has('pristeel_ai_provider'),'GPT-OSS deactivation did not clear provider selection.');
  assert(h.store.get('pristeel_groq_apikey')==='gsk_active','GPT-OSS deactivation unexpectedly deleted the real Groq key.');
  assert(h.context.PSTAI.hasApiKey()===true,'real Groq key became unavailable after GPT-OSS deactivation.');
}

console.log('AI compatibility-marker retirement smoke passed');
