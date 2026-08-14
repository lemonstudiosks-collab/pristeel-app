import fs from 'node:fs';

function replaceOnce(source,before,after,label){
  const i=source.indexOf(before);
  if(i<0)throw new Error(`Missing expected ${label}`);
  if(source.indexOf(before,i+before.length)>=0)throw new Error(`Ambiguous ${label}`);
  return source.slice(0,i)+after+source.slice(i+before.length);
}

// Compatibility layer: retire marker semantics, preserve one-time historical real-key migration.
{
  const path='pristeel-groq-rate-limit.js';
  let s=fs.readFileSync(path,'utf8');
  s=replaceOnce(s,
    "function legacyKey(){try{return String(localStorage.getItem('pristeel_apikey')||'').trim()}catch(e){return''}}",
    "var LEGACY_AI_STORAGE='pristeel_apikey';\nfunction groqKey(){try{return String(localStorage.getItem('pristeel_groq_apikey')||'').trim()}catch(e){return''}}\nfunction migrateLegacyAiStorage(){try{var legacy=String(localStorage.getItem(LEGACY_AI_STORAGE)||'').trim();if(legacy&&!/^__.*COMPAT__$/.test(legacy)&&!groqKey())localStorage.setItem('pristeel_groq_apikey',legacy);localStorage.removeItem(LEGACY_AI_STORAGE)}catch(e){}}\nmigrateLegacyAiStorage();",
    'legacy compatibility key helper');
  s=replaceOnce(s,
    "window.PSTAI.provider=function(){return geminiKey()?'gemini':'groq'};\nwindow.PSTAI.model=function(){return geminiKey()?configuredModel():'legacy-groq'};\nwindow.PSTAI.configureGemini=function(key,model){var k=String(key||'').trim();if(k){localStorage.setItem('pristeel_gemini_apikey',k);localStorage.setItem('pristeel_apikey','__GEMINI_COMPAT__')}else{localStorage.removeItem('pristeel_gemini_apikey');if(localStorage.getItem('pristeel_apikey')==='__GEMINI_COMPAT__')localStorage.removeItem('pristeel_apikey')}if(model)localStorage.setItem('pristeel_gemini_model',String(model).trim());return{provider:k?'gemini':'groq',model:k?(model||configuredModel()):'legacy-groq'}};\nwindow.PSTAI.hasApiKey=function(){return !!legacyKey()};",
    "window.PSTAI.provider=function(){return geminiKey()?'gemini':(groqKey()?'groq':'none')};\nwindow.PSTAI.model=function(){return geminiKey()?configuredModel():(groqKey()?'legacy-groq':'none')};\nwindow.PSTAI.configureGemini=function(key,model){var k=String(key||'').trim();if(k)localStorage.setItem('pristeel_gemini_apikey',k);else localStorage.removeItem('pristeel_gemini_apikey');if(model)localStorage.setItem('pristeel_gemini_model',String(model).trim());return{provider:k?'gemini':(groqKey()?'groq':'none'),model:k?(model||configuredModel()):(groqKey()?'legacy-groq':'none')}};\nwindow.PSTAI.hasApiKey=function(){return !!(geminiKey()||groqKey())};",
    'provider/model/configure/availability marker semantics');
  s=replaceOnce(s,
    "window.PSTAI.requestJson=async function(options){var o=options||{},key=legacyKey();if(!key)throw pstAiError('MISSING_KEY','Mungon AI API Key te Cilësimet.');",
    "window.PSTAI.requestJson=async function(options){var o=options||{},key=geminiKey()||groqKey();if(!key)throw pstAiError('MISSING_KEY','Mungon AI API Key te Cilësimet.');",
    'requestJson real-key selection');
  s=replaceOnce(s,
    "if(key&&document.activeElement!==input)input.value=key;else if(!key&&input.value==='__GEMINI_COMPAT__')input.value='';",
    "if(key&&document.activeElement!==input)input.value=key;else if(!key&&document.activeElement!==input)input.value='';",
    'Gemini Settings marker display cleanup');
  fs.writeFileSync(path,s,'utf8');
}

// GPT-OSS layer: provider selection and dedicated Groq key are sufficient; no marker writes/salvage ownership.
{
  const path='pristeel-groq-gptoss-provider-v1.js';
  let s=fs.readFileSync(path,'utf8');
  s=replaceOnce(s,
    "  setStore('pristeel_ai_provider',PROVIDER);\n  setStore('pristeel_apikey','__GROQ_GPTOSS_COMPAT__');\n  return true;",
    "  setStore('pristeel_ai_provider',PROVIDER);\n  return true;",
    'GPT-OSS activation marker write');
  s=replaceOnce(s,
    "window.PSTAI.deactivateGroqGptOss=function(){\n  setStore('pristeel_ai_provider','');\n  if(getStore('pristeel_apikey')==='__GROQ_GPTOSS_COMPAT__')setStore('pristeel_apikey','__GEMINI_COMPAT__');\n  return true;\n};\n\nfunction salvageLegacyKey(){\n  if(groqKey())return;\n  var legacy=getStore('pristeel_apikey');\n  if(/^gsk_/i.test(legacy))setStore('pristeel_groq_apikey',legacy);\n}\n",
    "window.PSTAI.deactivateGroqGptOss=function(){\n  setStore('pristeel_ai_provider','');\n  return true;\n};\n",
    'GPT-OSS deactivation and legacy salvage marker ownership');
  s=replaceOnce(s,
    "  css();salvageLegacyKey();\n",
    "  css();\n",
    'GPT-OSS install legacy salvage call');
  fs.writeFileSync(path,s,'utf8');
}

const manifestPath='runtime-manifest.json';
let manifest=fs.readFileSync(manifestPath,'utf8');
manifest=replaceOnce(
  manifest,
  '"auditedAtCommit": "0dcffdf80fcb16f6198bdc43b1e82ec876b8bd34"',
  '"auditedAtCommit": "bd7377591df760594d444a4da75d1ef3f6c7a09a"',
  'runtime manifest audited baseline'
);
fs.writeFileSync(manifestPath,manifest,'utf8');

console.log('AI compatibility-marker runtime semantics retired from main bd7377591df760594d444a4da75d1ef3f6c7a09a.');
