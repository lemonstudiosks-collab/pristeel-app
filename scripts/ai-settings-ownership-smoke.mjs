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
assert(saveFn.includes('ai.configureGemini(k)'),'base saveApiKey does not delegate Gemini storage/configuration.');
assert(saveFn.includes('✓ API Key e ruajtur në browser'),'base saved-status wording changed.');
assert(saveFn.includes('API Key u fshi.'),'base cleared-status wording changed.');
assert(!saveFn.includes('localStorage.'),'base saveApiKey still owns browser key storage.');
assert(!renderFn.includes('pristeel_apikey'),'base renderSettings still reads legacy compatibility marker.');
assert(renderFn.includes("localStorage.getItem('pristeel_gclient')"),'unrelated Google Settings rendering changed.');

for(const needle of [
  "localStorage.setItem('pristeel_apikey','__GEMINI_COMPAT__')",
  "localStorage.removeItem('pristeel_apikey')",
  'window.PSTAI.configureGemini=function',
  'window.PSTAI.hasApiKey=function',
  'function installSettingsBridge()',
  'window.saveApiKey=function()',
  'oldRender=window.renderSettings',
  "localStorage.getItem('pristeel_apikey')"
]) assert(compat.includes(needle),`compatibility layer lost required Settings/provider contract: ${needle}`);

for(const needle of [
  "setStore('pristeel_apikey','__GROQ_GPTOSS_COMPAT__')",
  "getStore('pristeel_apikey')==='__GROQ_GPTOSS_COMPAT__'",
  "setStore('pristeel_apikey','__GEMINI_COMPAT__')",
  'function salvageLegacyKey()',
  "var legacy=getStore('pristeel_apikey')",
  "setStore('pristeel_groq_apikey',legacy)",
  'oldRender=window.renderSettings'
]) assert(groq.includes(needle),`GPT-OSS provider lost required compatibility contract: ${needle}`);

async function runSave(value,withAi=true){
  const status={textContent:''};
  const input={value};
  const calls=[];
  const context={
    document:{getElementById:(id)=>id==='s-apikey'?input:id==='key-status'?status:null},
    PSTAI:withAi?{configureGemini:(key)=>calls.push(String(key))}:undefined
  };
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
