import fs from 'node:fs';
import vm from 'node:vm';

function assert(condition,message){if(!condition)throw new Error(`START PARSING AI SMOKE FAILED: ${message}`);}

function extractFunction(source,needle){
  const start=source.indexOf(needle);if(start<0)throw new Error(`Missing ${needle}`);
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
  if(end<0)throw new Error(`Unclosed ${needle}`);
  return source.slice(start,end);
}

const html=fs.readFileSync('pristeel-procurement.html','utf8');
const startParsingSource=extractFunction(html,'async function startParsing()');
assert(!startParsingSource.includes('api.groq.com/openai/v1/chat/completions'),'direct Groq endpoint remains in startParsing.');
assert(!startParsingSource.includes('pristeel_apikey'),'direct legacy AI key remains in startParsing.');

function makeElement(value=''){
  const classes=new Set();
  return {
    value,
    textContent:'',
    className:'',
    style:{width:''},
    classList:{
      add(name){classes.add(name);},
      remove(name){classes.delete(name);},
      contains(name){return classes.has(name);}
    }
  };
}

async function runScenario({deterministic=null,hasKey=true,requestImpl}){
  const elements={
    'i-text':makeElement('HEA 300 S355JR 6000 mm 2 Stk'),
    'i-projname':makeElement('Test Projekt'),
    'i-client':makeElement('Test Client'),
    'parsing-card':makeElement(),
    st1:makeElement(),st2:makeElement(),st3:makeElement(),st4:makeElement(),
    st1d:makeElement(),st2d:makeElement(),st3d:makeElement(),st4d:makeElement(),
    prog:makeElement()
  };
  const alerts=[];
  const applied=[];
  const requests=[];
  const ai={
    hasApiKey(){return hasKey;},
    async requestJson(options){requests.push(options);return requestImpl?requestImpl(options):{};}
  };
  const context={
    console,
    window:{PSTAI:ai},
    document:{getElementById(id){if(!elements[id])elements[id]=makeElement();return elements[id];}},
    alert(message){alerts.push(String(message));},
    delay:async()=>{},
    deterministicParseGermanMengenliste(){return deterministic;},
    applyParsedBom(value){applied.push(value);}
  };
  vm.createContext(context);
  vm.runInContext(startParsingSource,context,{filename:'startParsing-inline.js'});
  await context.startParsing();
  return {elements,alerts,applied,requests};
}

const deterministic={confidence:'high',issues:[],items:[{pos:1}],project_summary:'deterministic'};
let result=await runScenario({deterministic,hasKey:false,requestImpl(){throw new Error('AI must not run');}});
assert(result.requests.length===0,'deterministic parser should run before AI availability.');
assert(result.applied.length===1 && result.applied[0]===deterministic,'deterministic result was not applied unchanged.');

result=await runScenario({hasKey:false});
assert(result.requests.length===0,'missing AI key should not issue a request.');
assert(result.elements.st1d.textContent==='Mungon Groq API Key — shko te Cilësimet.','missing-key user message changed.');
assert(result.elements['parsing-card'].classList.contains('hidden'),'missing-key path should hide parsing card.');

const successPayload={project_summary:'ok',detected_language:'de',confidence:'high',issues:[],items:[{pos:1,description_raw:'HEA 300'}]};
result=await runScenario({requestImpl:async()=>successPayload});
assert(result.requests.length===1,'single chunk should issue exactly one AI request.');
const req=result.requests[0];
assert(req.model==='llama-3.1-8b-instant','startParsing model changed.');
assert(req.max_tokens===8000,'startParsing token budget changed.');
assert(req.temperature===0,'startParsing temperature changed.');
assert(req.response_format && req.response_format.type==='json_object','startParsing JSON response format missing.');
assert(result.applied.length===1 && result.applied[0].items.length===1,'successful AI result was not merged/applied.');
assert(result.elements.st4d.textContent.includes('1 pozicione'),'completion status changed unexpectedly.');

for(const [code,expectedConfidence,fragment] of [
  ['HTTP','low','rate limit'],
  ['EMPTY','medium','bosh'],
  ['INVALID_JSON','medium','JSON invalid']
]){
  result=await runScenario({requestImpl:async()=>{const e=new Error(code==='HTTP'?'rate limit 429':code==='EMPTY'?'AI nuk ktheu rezultat.':'synthetic-json-error');e.pstAiCode=code;throw e;}});
  assert(result.applied.length===1,`${code} soft chunk failure should still apply a merged BOM result.`);
  assert(result.applied[0].confidence===expectedConfidence,`${code} confidence mapping changed.`);
  assert(result.applied[0].issues.some(x=>String(x).toLowerCase().includes(fragment.toLowerCase())),`${code} issue message mapping changed.`);
}

result=await runScenario({requestImpl:async()=>{throw new Error('synthetic-network-error');}});
assert(result.applied.length===1,'network error should still reach outer fallback applyParsedBom.');
assert(result.applied[0].confidence==='low','network fallback confidence changed.');
assert(Array.isArray(result.applied[0].issues)&&result.applied[0].issues[0]==='Lidhja dështoi','network fallback issue changed.');
assert(result.elements.st4d.textContent.includes('synthetic-network-error'),'network error status no longer surfaces original error.');

console.log('PPPP startParsing AI smoke');
console.log('Deterministic parser-first behavior: OK');
console.log('Missing-key UI behavior: OK');
console.log('Explicit request options/result merge: OK');
console.log('HTTP/EMPTY/INVALID_JSON soft chunk behavior: OK');
console.log('Network outer-fallback behavior: OK');
