/* PRISTEEL Gemini connection test UI v1
 * Read-only connectivity test for the Gemini Developer API.
 * Sends only a tiny synthetic JSON prompt; no project, email, supplier or tender data.
 */
(function(){
'use strict';
if(window.__pstGeminiTestUiV1Loaded)return;
window.__pstGeminiTestUiV1Loaded=true;

var GEMINI_BASE='https://generativelanguage.googleapis.com/v1beta/models/';
var MODEL_PREFERRED='gemini-3.5-flash-lite';
var MODEL_FALLBACK='gemini-3.1-flash-lite';

function key(){
  try{return String(localStorage.getItem('pristeel_gemini_apikey')||'').trim();}
  catch(e){return'';}
}
function model(){
  try{return String(localStorage.getItem('pristeel_gemini_model')||MODEL_PREFERRED).trim()||MODEL_PREFERRED;}
  catch(e){return MODEL_PREFERRED;}
}
function candidateText(data){
  var c=data&&data.candidates&&data.candidates[0];
  var parts=c&&c.content&&c.content.parts;
  if(!Array.isArray(parts))return'';
  return parts.map(function(p){return p&&p.text?String(p.text):'';}).join('').trim();
}
function errorMessage(text,status){
  var msg=String(text||'').trim();
  try{
    var parsed=JSON.parse(msg);
    msg=(parsed.error&&parsed.error.message)||msg;
  }catch(e){}
  if(status===400&&/api key|key not valid|invalid/i.test(msg))return'API key nuk është valid.';
  if(status===401||status===403)return'API key nuk ka qasje në Gemini API ose projekti nuk e lejon këtë model.';
  if(status===429)return'Gemini rate limit / quota u arrit. Provo përsëri pak më vonë.';
  if(status===404)return'Modeli Gemini nuk u gjet për këtë projekt.';
  return 'Gemini '+status+': '+(msg||'kërkesa dështoi.').slice(0,260);
}
function modelUnavailable(status,text){
  return status===404||(status===400&&/model|not found|unsupported|not available/i.test(String(text||'')));
}
async function request(testModel,apiKey){
  var payload={
    contents:[{role:'user',parts:[{text:'Return only this JSON object: {"ok":true,"service":"PPPP"}'}]}],
    generationConfig:{maxOutputTokens:64,responseMimeType:'application/json'}
  };
  var response=await fetch(GEMINI_BASE+encodeURIComponent(testModel)+':generateContent',{
    method:'POST',
    headers:{'Content-Type':'application/json','x-goog-api-key':apiKey},
    body:JSON.stringify(payload)
  });
  var text=await response.text();
  if(!response.ok)return{ok:false,status:response.status,text:text,model:testModel};
  var data={};
  try{data=JSON.parse(text);}catch(e){return{ok:false,status:502,text:'Gemini ktheu metadata jo-valide.',model:testModel};}
  var output=candidateText(data);
  if(!output)return{ok:false,status:502,text:'Gemini nuk ktheu tekst.',model:testModel};
  return{ok:true,status:200,model:testModel,output:output,usage:data.usageMetadata||null};
}
async function testConnection(){
  var apiKey=key();
  if(!apiKey)return{ok:false,message:'Ruaje fillimisht Gemini API Key në këtë browser.'};
  var started=(window.performance&&performance.now)?performance.now():Date.now();
  var selected=model();
  var result;
  try{
    result=await request(selected,apiKey);
    if(!result.ok&&selected!==MODEL_FALLBACK&&modelUnavailable(result.status,result.text)){
      selected=MODEL_FALLBACK;
      result=await request(selected,apiKey);
    }
  }catch(e){
    return{ok:false,message:'Nuk u arrit Gemini API: '+String((e&&e.message)||e||'network error')};
  }
  var ended=(window.performance&&performance.now)?performance.now():Date.now();
  if(!result.ok)return{ok:false,message:errorMessage(result.text,result.status),status:result.status,model:selected,latencyMs:Math.max(0,Math.round(ended-started))};
  return{ok:true,provider:'Google Gemini',model:selected,latencyMs:Math.max(0,Math.round(ended-started)),usage:result.usage};
}

window.PSTAI=window.PSTAI||{};
window.PSTAI.testGeminiConnection=testConnection;

function style(){
  if(document.getElementById('pst-gemini-test-style'))return;
  var s=document.createElement('style');
  s.id='pst-gemini-test-style';
  s.textContent='\
#pst-gemini-test-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:10px}\
#pst-gemini-test-btn{height:34px;padding:0 13px;border:1px solid #BFDDE8;border-radius:8px;background:#EAF5F8;color:#326F87;font-size:11px;font-weight:700;cursor:pointer}\
#pst-gemini-test-btn:hover{background:#DDEFF4;border-color:#9EC9D8}\
#pst-gemini-test-btn:disabled{opacity:.55;cursor:wait}\
#pst-gemini-test-result{font-size:11px;line-height:1.4;color:#718087}\
#pst-gemini-test-result.ok{color:#2F7657}\
#pst-gemini-test-result.err{color:#A64B42}\
';
  document.head.appendChild(s);
}
function install(){
  var input=document.getElementById('s-apikey');
  var status=document.getElementById('key-status');
  if(!input||!status)return false;
  style();
  if(document.getElementById('pst-gemini-test-row'))return true;
  var row=document.createElement('div');
  row.id='pst-gemini-test-row';
  row.innerHTML='<button type="button" id="pst-gemini-test-btn">Test Gemini</button><div id="pst-gemini-test-result" aria-live="polite"></div>';
  status.insertAdjacentElement('afterend',row);
  var button=document.getElementById('pst-gemini-test-btn');
  var result=document.getElementById('pst-gemini-test-result');
  button.onclick=async function(){
    button.disabled=true;
    result.className='';
    result.textContent='Duke testuar lidhjen me Gemini…';
    var out=await testConnection();
    button.disabled=false;
    if(out.ok){
      result.className='ok';
      result.textContent='✓ Gemini connected · '+out.model+' · '+out.latencyMs+' ms · Google Gemini';
    }else{
      result.className='err';
      result.textContent='✕ Gemini test failed · '+out.message;
    }
  };
  return true;
}

var oldRender=window.renderSettings;
if(typeof oldRender==='function'&&!oldRender.__pstGeminiTestWrapped){
  var wrapped=function(){
    var value=oldRender.apply(this,arguments);
    setTimeout(install,0);
    return value;
  };
  wrapped.__pstGeminiTestWrapped=true;
  window.renderSettings=wrapped;
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(install,0);},{once:true});
else setTimeout(install,0);

/* Load the optional Groq GPT-OSS provider after the Gemini test UI.
 * This keeps the active production bootstrap change isolated to this already-loaded module.
 */
if(!window.__pstGroqGptOssLoaderV1){
  window.__pstGroqGptOssLoaderV1=true;
  var groqScript=document.createElement('script');
  groqScript.src='pristeel-groq-gptoss-provider-v1.js?v=20260814-1';
  groqScript.defer=true;
  document.head.appendChild(groqScript);
}
})();
