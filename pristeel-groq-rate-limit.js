/* PRISTEEL AI compatibility adapter: existing Groq call-sites -> Gemini Developer API.
 * Inert until pristeel_gemini_apikey is deliberately configured.
 * Preferred model: gemini-3.5-flash-lite; confirmed free-tier fallback: gemini-3.1-flash-lite.
 */
(function(){
'use strict';
if(window.__pstAiCompatibilityLoaded)return;
window.__pstAiCompatibilityLoaded=true;
var nativeFetch=window.fetch.bind(window);
var LEGACY_GROQ_URL='api.groq.com/openai/v1/chat/completions';
var GEMINI_BASE='https://generativelanguage.googleapis.com/v1beta/models/';
var MODEL_PREFERRED='gemini-3.5-flash-lite';
var MODEL_FREE_FALLBACK='gemini-3.1-flash-lite';
var queue=Promise.resolve();
function sleep(ms){return new Promise(function(resolve){setTimeout(resolve,ms)})}
function isLegacyGroq(input){var url=typeof input==='string'?input:(input&&input.url)||'';return String(url).indexOf(LEGACY_GROQ_URL)>-1}
function parseBody(init){if(!init||typeof init.body!=='string')return null;try{return JSON.parse(init.body)}catch(e){return null}}
function geminiKey(){try{return String(localStorage.getItem('pristeel_gemini_apikey')||'').trim()}catch(e){return''}}
function configuredModel(){try{return String(localStorage.getItem('pristeel_gemini_model')||MODEL_PREFERRED).trim()||MODEL_PREFERRED}catch(e){return MODEL_PREFERRED}}
function textOf(v){return typeof v==='string'?v:String(v==null?'':v)}
function toGemini(body){var messages=Array.isArray(body&&body.messages)?body.messages:[];var systems=[],contents=[];messages.forEach(function(m){var role=String((m&&m.role)||'user');var content=textOf(m&&m.content);if(role==='system')systems.push(content);else contents.push({role:role==='assistant'?'model':'user',parts:[{text:content}]})});if(!contents.length)contents=[{role:'user',parts:[{text:'Return a valid JSON object.'}]}];var cfg={maxOutputTokens:Math.max(64,Math.min(16000,Number(body&&body.max_tokens)||5000)),responseMimeType:'application/json'};var out={contents:contents,generationConfig:cfg};if(systems.length)out.systemInstruction={parts:[{text:systems.join('\n\n')}]};return out}
function candidateText(data){var c=data&&data.candidates&&data.candidates[0];var parts=c&&c.content&&c.content.parts;if(!Array.isArray(parts))return'';return parts.map(function(p){return p&&p.text?String(p.text):''}).join('')}
function openAiLike(text,data,model){return{id:'gemini-compat-'+Date.now(),object:'chat.completion',model:model,choices:[{index:0,message:{role:'assistant',content:text},finish_reason:'stop'}],usage:data&&data.usageMetadata?{prompt_tokens:data.usageMetadata.promptTokenCount||0,completion_tokens:data.usageMetadata.candidatesTokenCount||0,total_tokens:data.usageMetadata.totalTokenCount||0}:undefined,provider:'google-gemini'}}
function jsonResponse(obj,status){return new Response(JSON.stringify(obj),{status:status||200,headers:{'Content-Type':'application/json'}})}
function isRetryable(status,text){return status===429||status===503||/resource_exhausted|rate limit|temporar|unavailable|try again/i.test(String(text||''))}
function modelUnavailable(status,text){return status===403||status===404||(status===400&&/model|not available|not found|permission|unsupported/i.test(String(text||'')))}
function retryDelay(response,attempt){var sec=0;try{sec=Number(response.headers.get('retry-after'))||0}catch(e){}if(sec>0)return Math.min(30000,Math.max(1000,Math.ceil(sec*1000)+250));return attempt===0?1800:4500}
async function callGemini(model,payload,key){var url=GEMINI_BASE+encodeURIComponent(model)+':generateContent';var last=null,lastText='';for(var attempt=0;attempt<3;attempt++){last=await nativeFetch(url,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},body:JSON.stringify(payload)});lastText=await last.text();if(last.ok){var data={};try{data=JSON.parse(lastText)}catch(e){return jsonResponse({error:{message:'Gemini returned invalid JSON metadata.'}},502)}var text=candidateText(data);if(!text)return jsonResponse({error:{message:'Gemini model returned no text output.'}},502);return jsonResponse(openAiLike(text,data,model),200)}if(!isRetryable(last.status,lastText)||attempt===2)break;await sleep(retryDelay(last,attempt))}return{__geminiError:true,status:last?last.status:502,text:lastText||'Gemini request failed.'}}
async function geminiCompatFetch(input,init){var key=geminiKey();if(!key)return nativeFetch(input,init);var body=parseBody(init);if(!body)return nativeFetch(input,init);var payload=toGemini(body);var preferred=configuredModel();var result=await callGemini(preferred,payload,key);if(result&&result.__geminiError&&preferred!==MODEL_FREE_FALLBACK&&modelUnavailable(result.status,result.text)){console.warn('PRISTEEL: '+preferred+' unavailable; falling back to '+MODEL_FREE_FALLBACK+'.');result=await callGemini(MODEL_FREE_FALLBACK,payload,key)}if(result&&result.__geminiError){var msg=result.text;try{var parsed=JSON.parse(result.text);msg=(parsed.error&&parsed.error.message)||msg}catch(e){}return jsonResponse({error:{message:'Gemini '+result.status+': '+String(msg||'request failed').slice(0,500)}},result.status||502)}return result}
window.fetch=function(input,init){if(!isLegacyGroq(input))return nativeFetch(input,init);var run=function(){return geminiCompatFetch(input,init)};var result=queue.then(run,run);queue=result.then(function(){},function(){});return result};
window.PSTAI=window.PSTAI||{};
window.PSTAI.provider=function(){return geminiKey()?'gemini':'groq'};
window.PSTAI.model=function(){return geminiKey()?configuredModel():'legacy-groq'};
window.PSTAI.configureGemini=function(key,model){var k=String(key||'').trim();if(k)localStorage.setItem('pristeel_gemini_apikey',k);else localStorage.removeItem('pristeel_gemini_apikey');if(model)localStorage.setItem('pristeel_gemini_model',String(model).trim());return{provider:k?'gemini':'groq',model:k?(model||configuredModel()):'legacy-groq'}};
})();
