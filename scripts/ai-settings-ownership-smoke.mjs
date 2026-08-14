import fs from 'node:fs';
import vm from 'node:vm';

const html=fs.readFileSync('pristeel-procurement.html','utf8');
const compat=fs.readFileSync('pristeel-groq-rate-limit.js','utf8');
const groq=fs.readFileSync('pristeel-groq-gptoss-provider-v1.js','utf8');

function assert(condition,message){if(!condition)throw new Error(`AI SETTINGS OWNERSHIP SMOKE FAILED: ${message}`);}
function extractFunction(source,needle){
  const start=source.indexOf(needle);if(start<0)throw new Error(`Missing ${needle}`);
  const brace=source.indexOf('{',start);let depth=0,quote='',escaped=false,line=false,block=false;
  for(let i=brace;i<source.length;i++){
    const ch=source[i],nx=source[i+1]||'';
    if(line){if(ch==='\n')line=false;continue;}
    if(block){if(ch==='*'&&nx==='/'){block=false;i++;}continue;}
    if(quote){if(escaped){escaped=false;continue;}if(ch==='\\'){escaped=true;continue;}if(ch===quote)quote='';continue;}
    if(ch==='/'&&nx==='/'){line=true;i++;continue;}
    if(ch==='/'&&nx==='*'){block=true;i++;continue;}
    if(ch==='"'||ch==="'"||ch==='`'){quote=ch;continue;}
    if(ch==='{')depth++;else if(ch==='}'){depth--;if(depth===0)return source.slice(start,i+1);}
  }
  throw new Error(`Unclosed ${needle}`);
}

const saveFn=extractFunction(html,'function saveApiKey()');
const renderFn=extractFunction(html,'function renderSettings()');

assert((html.match(/pristeel_apikey/g)||[]).length===0,'application HTML still owns legacy pristeel_apikey storage.');
assert(html.includes('id="s-apikey"'),'Settings API key input anchor was removed.');
assert(html.includes('id="key-status"'),'Settings key-status anchor was removed.');
assert(saveFn.includes('window.PSTAI'),'base saveApiKey does not resolve PSTAI.');
assert(saveFn.includes("typeof ai.configureGemini!=='function'"),'base saveApiKey does not guard configureGemini availability.');
assert(saveFn.includes('ai.configureGemini(k)'),'base saveApiKey does not delegate Gemini configuration.');
assert(saveFn.includes('✓ API Key e ruajtur në browser'),'base saved-status wording changed.');
assert(saveFn.includes('API Key u fshi.'),'base cleared-status wording changed.');
assert(!saveFn.includes('localStorage.'),'base saveApiKey still owns browser key storage.');
assert(!renderFn.includes('pristeel_apikey'),'base renderSettings still reads retired storage.');
assert(renderFn.includes("localStorage.getItem('pristeel_gclient')"),'unrelated Google Settings rendering changed.');

assert((compat.match(/pristeel_apikey/g)||[]).length===1,'compatibility layer must retain exactly one legacy storage-name occurrence for one-time migration.');
assert(compat.includes("var LEGACY_AI_STORAGE='pristeel_apikey'"),'legacy storage migration name is missing.');
assert(compat.includes('function migrateLegacyAiStorage()'),'one-time legacy storage migration shim is missing.');
assert(compat.includes("localStorage.getItem('pristeel_groq_apikey')"),'dedicated Groq key storage is not authoritative.');
assert(compat.includes("localStorage.getItem('pristeel_gemini_apikey')"),'dedicated Gemini key storage is not authoritative.');
assert(compat.includes('window.PSTAI.configureGemini=function'),'Gemini configuration API disappeared.');
assert(compat.includes('window.PSTAI.hasApiKey=function(){return !!(geminiKey()||groqKey())}'),'AI availability still depends on marker semantics.');
assert(compat.includes('window.PSTAI.requestJson=async function(options){var o=options||{},key=geminiKey()||groqKey();'),'requestJson does not select real provider keys.');
assert(compat.includes('function installSettingsBridge()'),'Settings runtime bridge disappeared.');
assert(compat.includes('window.saveApiKey=function()'),'Settings save wrapper disappeared.');
assert(compat.includes('oldRender=window.renderSettings'),'Settings render wrapper disappeared.');
assert(!compat.includes('__GEMINI_COMPAT__'),'Gemini compatibility marker semantics remain in compatibility layer.');
assert(!compat.includes('__GROQ_GPTOSS_COMPAT__'),'GPT-OSS compatibility marker semantics leaked into compatibility layer.');

assert((groq.match(/pristeel_apikey/g)||[]).length===0,'GPT-OSS provider still owns retired legacy storage.');
assert(!groq.includes('__GEMINI_COMPAT__'),'GPT-OSS provider still contains Gemini marker semantics.');
assert(!groq.includes('__GROQ_GPTOSS_COMPAT__'),'GPT-OSS provider still contains GPT marker semantics.');
assert(!groq.includes('salvageLegacyKey'),'GPT-OSS provider still owns legacy key migration.');
for(const needle of [
  "setStore('pristeel_groq_apikey',k)",
  "setStore('pristeel_ai_provider',PROVIDER)",
  "setStore('pristeel_ai_provider','')",
  'oldRender=window.renderSettings'
]) assert(groq.includes(needle),`GPT-OSS provider lost dedicated Settings/provider contract: ${needle}`);

async function runSave(value,withAi=true){
  const status={textContent:''};
  const input={value};
  const calls=[];
  const context={document:{getElementById:(id)=>id==='s-apikey'?input:id==='key-status'?status:null},PSTAI:withAi?{configureGemini:(key)=>calls.push(String(key))}:undefined};
  context.window=context;
  vm.createContext(context);
  vm.runInContext(`${saveFn}\nthis.__save=saveApiKey;`,context);
  context.__save();
  return{calls,status:status.textContent};
}

{
  const out=await runSave('gemini-key');
  assert(out.calls.length===1&&out.calls[0]==='gemini-key','base saveApiKey did not delegate entered key exactly once.');
  assert(out.status==='✓ API Key e ruajtur në browser','saved status changed.');
}
{
  const out=await runSave('');
  assert(out.calls.length===1&&out.calls[0]==='','base saveApiKey did not delegate key clearing.');
  assert(out.status==='API Key u fshi.','cleared status changed.');
}
{
  const out=await runSave('gemini-key',false);
  assert(out.calls.length===0,'missing-PSTAI fallback unexpectedly called configuration.');
  assert(out.status==='AI Settings nuk janë ngarkuar.','missing-PSTAI fallback status changed.');
}

console.log('AI Settings ownership smoke passed');
