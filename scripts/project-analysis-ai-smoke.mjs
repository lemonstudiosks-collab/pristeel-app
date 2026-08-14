import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync('pristeel-project-analysis.js','utf8');
function assert(condition,message){if(!condition)throw new Error(`PROJECT ANALYSIS AI SMOKE FAILED: ${message}`);}
function extractFunction(src,needle){
  const start=src.indexOf(needle); if(start<0)throw new Error(`Missing ${needle}`);
  const brace=src.indexOf('{',start); let depth=0,quote='',escaped=false,line=false,block=false;
  for(let i=brace;i<src.length;i++){
    const ch=src[i],nx=src[i+1]||'';
    if(line){if(ch==='\n')line=false;continue;}
    if(block){if(ch==='*'&&nx==='/'){block=false;i++;}continue;}
    if(quote){if(escaped){escaped=false;continue;}if(ch==='\\'){escaped=true;continue;}if(ch===quote)quote='';continue;}
    if(ch==='/'&&nx==='/'){line=true;i++;continue;}
    if(ch==='/'&&nx==='*'){block=true;i++;continue;}
    if(ch==='"'||ch==="'"||ch==='`'){quote=ch;continue;}
    if(ch==='{')depth++; else if(ch==='}'){depth--;if(depth===0)return src.slice(start,i+1);}
  }
  throw new Error(`Unclosed ${needle}`);
}

const groqFn=extractFunction(source,'async function groq(');
const askFn=extractFunction(source,'async function ask(');
const analyzeFn=extractFunction(source,'window.pstAnalyzeProject=async function(pid)');

assert(!source.includes('https://api.groq.com/openai/v1/chat/completions'),'Project Analysis still contains direct Groq endpoint.');
assert(!source.includes("localStorage.getItem('pristeel_apikey')"),'Project Analysis still reads legacy AI key directly.');
assert(groqFn.includes('window.PSTAI'),'groq helper does not resolve PSTAI.');
assert(groqFn.includes('ai.requestJson'),'groq helper does not use PSTAI.requestJson.');
assert(analyzeFn.includes('window.PSTAI'),'analysis entry does not resolve PSTAI for AI-vs-rules choice.');
assert(analyzeFn.includes('localAnalysis(b)'),'rules fallback was removed.');
assert(analyzeFn.includes("engine='groq';model=MODEL_MAIN"),'existing engine/model metadata changed.');
assert(analyzeFn.includes('Shto Groq API Key për analizë semantike.'),'existing no-AI success message changed.');

async function makeHarness({hasKey=true,handler}={}){
  const requests=[];
  const context={
    console,JSON,Array,String,Number,Math,Date,
    PSTAI:{
      hasApiKey:()=>hasKey,
      requestJson:async(options)=>{requests.push(options);return handler?handler(options,requests.length):{ok:true};}
    }
  };
  context.window=context;
  context.MODEL_FAST='llama-3.1-8b-instant';
  context.MODEL_MAIN='llama-3.3-70b-versatile';
  vm.createContext(context);
  vm.runInContext(`${groqFn}\n${askFn}\nthis.__groq=groq;this.__ask=ask;`,context);
  return {context,requests};
}

{
  const h=await makeHarness({hasKey:false});
  let msg='';try{await h.context.__groq('m',[{role:'user',content:'x'}],123);}catch(e){msg=e.message;}
  assert(msg==='Mungon Groq API Key te Cilësimet.','missing-key helper message changed.');
  assert(h.requests.length===0,'missing-key helper must not request AI.');
}

{
  const h=await makeHarness();
  const result=await h.context.__groq('llama-3.1-8b-instant',[{role:'system',content:'S'},{role:'user',content:'U'}],4800);
  assert(result&&result.ok===true,'successful structured result changed.');
  assert(h.requests.length===1,'groq helper should issue one explicit AI request.');
  const r=h.requests[0];
  assert(r.model==='llama-3.1-8b-instant','model changed.');
  assert(r.max_tokens===4800,'token budget changed.');
  assert(r.temperature===0,'temperature changed.');
  assert(r.response_format&&r.response_format.type==='json_object','JSON response contract missing.');
  assert(Array.isArray(r.messages)&&r.messages.length===2,'messages changed.');
}

{
  const h=await makeHarness({handler:(_o,n)=>{if(n===1){const e=new Error('model not found 404');e.pstAiCode='HTTP';throw e;}return {fallback:true};}});
  const result=await h.context.__ask('llama-3.3-70b-versatile',[{role:'user',content:'x'}],7000);
  assert(result&&result.fallback===true,'main-model fallback no longer succeeds.');
  assert(h.requests.map(x=>x.model).join(',')==='llama-3.3-70b-versatile,llama-3.1-8b-instant','main-model fallback sequence changed.');
  assert(h.requests.every(x=>x.max_tokens===7000),'fallback token budget changed.');
}

{
  const h=await makeHarness({handler:()=>{const e=new Error('rate limit 429');e.pstAiCode='HTTP';throw e;}});
  let msg='';try{await h.context.__ask('llama-3.3-70b-versatile',[{role:'user',content:'x'}],7000);}catch(e){msg=e.message;}
  assert(msg==='rate limit 429','non-model HTTP error should propagate unchanged.');
  assert(h.requests.length===1,'non-model HTTP error must not trigger model fallback.');
}

{
  const h=await makeHarness({handler:()=>{const e=new Error('model 404');e.pstAiCode='HTTP';throw e;}});
  let threw=false;try{await h.context.__ask('llama-3.1-8b-instant',[{role:'user',content:'x'}],4800);}catch(e){threw=true;}
  assert(threw,'fast-model failure should propagate.');
  assert(h.requests.length===1,'fast model must not fallback recursively.');
}

{
  const h=await makeHarness({handler:()=>{const e=new Error('AI nuk ktheu rezultat.');e.pstAiCode='EMPTY';throw e;}});
  let msg='';try{await h.context.__groq('m',[{role:'user',content:'x'}],100);}catch(e){msg=e.message;}
  assert(msg==='Modeli nuk ktheu analizë.','legacy empty-response message changed.');
}

console.log('Project Analysis AI smoke passed');
