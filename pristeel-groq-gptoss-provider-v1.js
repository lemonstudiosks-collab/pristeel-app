/* PRISTEEL Groq GPT-OSS provider v1
 * Adds a separate Groq key, a direct GPT-OSS connectivity test, and an opt-in provider switch.
 * Existing Gemini behavior remains unchanged unless GPT-OSS is explicitly activated.
 */
(function(){
'use strict';
if(window.__pstGroqGptOssProviderV1Loaded)return;
window.__pstGroqGptOssProviderV1Loaded=true;

var previousFetch=window.fetch.bind(window);
var GROQ_URL='https://api.groq.com/openai/v1/chat/completions';
var GROQ_MATCH='api.groq.com/openai/v1/chat/completions';
var MODEL='openai/gpt-oss-20b';
var PROVIDER='groq-gptoss';
var queue=Promise.resolve();

function getStore(k){try{return String(localStorage.getItem(k)||'').trim();}catch(e){return'';}}
function setStore(k,v){try{if(v)localStorage.setItem(k,v);else localStorage.removeItem(k);}catch(e){}}
function groqKey(){return getStore('pristeel_groq_apikey');}
function active(){return getStore('pristeel_ai_provider')===PROVIDER&&!!groqKey();}
function isGroqUrl(input){var url=typeof input==='string'?input:(input&&input.url)||'';return String(url).indexOf(GROQ_MATCH)>-1;}
function parseBody(init){if(!init||typeof init.body!=='string')return null;try{return JSON.parse(init.body);}catch(e){return null;}}
function clone(v){try{return JSON.parse(JSON.stringify(v));}catch(e){return{};}}
function sleep(ms){return new Promise(function(resolve){setTimeout(resolve,ms);});}
function prepareBody(body,attempt){
  var out=clone(body||{});
  out.model=MODEL;
  var max=Number(out.max_completion_tokens||out.max_tokens)||2200;
  max=Math.min(max,attempt===0?2200:attempt===1?1600:1100);
  if('max_completion_tokens' in out)out.max_completion_tokens=max;
  else out.max_tokens=max;
  if(Array.isArray(out.messages)&&attempt>=2){
    out.messages=out.messages.map(function(m){
      var c=String((m&&m.content)||'');
      if(c.length<=16000)return m;
      var copy=Object.assign({},m);
      copy.content=c.slice(0,10500)+'\n\n[...pjesa e mesit u shkurtua për kufirin e Free Tier...]\n\n'+c.slice(-4500);
      return copy;
    });
  }
  return out;
}
function xhrPost(url,key,body){
  return new Promise(function(resolve,reject){
    var x=new XMLHttpRequest();
    x.open('POST',url,true);
    x.setRequestHeader('Content-Type','application/json');
    x.setRequestHeader('Authorization','Bearer '+key);
    x.onreadystatechange=function(){
      if(x.readyState!==4)return;
      var headers=new Headers();
      try{
        String(x.getAllResponseHeaders()||'').trim().split(/[\r\n]+/).forEach(function(line){
          var p=line.indexOf(':');if(p>0)headers.append(line.slice(0,p).trim(),line.slice(p+1).trim());
        });
      }catch(e){}
      resolve(new Response(x.responseText||'',{status:x.status||502,statusText:x.statusText||'',headers:headers}));
    };
    x.onerror=function(){reject(new TypeError('Groq network request failed'));};
    x.ontimeout=function(){reject(new TypeError('Groq request timed out'));};
    x.timeout=45000;
    x.send(JSON.stringify(body));
  });
}
function retryable(status,text){return status===429||status===503||/rate limit|resource exhausted|temporar|unavailable|try again/i.test(String(text||''));}
function retryDelay(response,attempt){
  var sec=0;try{sec=Number(response.headers.get('retry-after'))||0;}catch(e){}
  if(sec>0)return Math.min(30000,Math.max(1000,Math.ceil(sec*1000)+250));
  return attempt===0?1800:4500;
}
async function groqFetch(input,init){
  var key=groqKey();
  if(!key)return previousFetch(input,init);
  var body=parseBody(init);
  if(!body)return previousFetch(input,init);
  var last=null,lastText='';
  for(var attempt=0;attempt<3;attempt++){
    last=await xhrPost(GROQ_URL,key,prepareBody(body,attempt));
    if(last.ok)return last;
    try{lastText=await last.clone().text();}catch(e){lastText='';}
    if(!retryable(last.status,lastText)||attempt===2)return last;
    await sleep(retryDelay(last,attempt));
  }
  return last;
}
function groqError(text,status){
  var msg=String(text||'').trim();
  try{var p=JSON.parse(msg);msg=(p.error&&p.error.message)||msg;}catch(e){}
  if(status===400&&/api key|invalid.*key|key.*invalid/i.test(msg))return'Groq API key nuk është valid.';
  if(status===401)return'Groq API key nuk është valid ose është revokuar.';
  if(status===403)return'Groq e refuzoi qasjen: '+(msg||'access denied').slice(0,220);
  if(status===429)return'Groq Free Plan quota / rate limit u arrit. Provo përsëri pak më vonë.';
  if(status===404)return'Modeli '+MODEL+' nuk është i disponueshëm për këtë account.';
  return'Groq '+status+': '+(msg||'kërkesa dështoi.').slice(0,260);
}
async function testGroqConnection(apiKey){
  var key=String(apiKey||groqKey()||'').trim();
  if(!key)return{ok:false,message:'Vendose fillimisht Groq API Key.'};
  var started=(window.performance&&performance.now)?performance.now():Date.now();
  var body={model:MODEL,messages:[{role:'user',content:'Return only this JSON object: {"ok":true,"service":"PPPP"}'}],response_format:{type:'json_object'},temperature:0,max_tokens:64};
  var response;
  try{response=await xhrPost(GROQ_URL,key,body);}catch(e){return{ok:false,message:'Nuk u arrit Groq API: '+String((e&&e.message)||e||'network error')};}
  var ended=(window.performance&&performance.now)?performance.now():Date.now();
  var text='';try{text=await response.text();}catch(e){}
  if(!response.ok)return{ok:false,status:response.status,message:groqError(text,response.status),latencyMs:Math.max(0,Math.round(ended-started))};
  var data={};try{data=JSON.parse(text);}catch(e){return{ok:false,status:502,message:'Groq ktheu përgjigje jo-valide.',latencyMs:Math.max(0,Math.round(ended-started))};}
  var output=data&&data.choices&&data.choices[0]&&data.choices[0].message&&data.choices[0].message.content;
  if(!output)return{ok:false,status:502,message:'GPT-OSS nuk ktheu tekst.',latencyMs:Math.max(0,Math.round(ended-started))};
  return{ok:true,provider:'GroqCloud',model:MODEL,latencyMs:Math.max(0,Math.round(ended-started)),usage:data.usage||null};
}

window.PSTAI=window.PSTAI||{};
var previousRequestTransport=typeof window.PSTAI.requestTransport==='function'?window.PSTAI.requestTransport:null;
var previousProvider=typeof window.PSTAI.provider==='function'?window.PSTAI.provider:null;
var previousModel=typeof window.PSTAI.model==='function'?window.PSTAI.model:null;
window.PSTAI.provider=function(){return active()?'groq':(previousProvider?previousProvider():'unknown');};
window.PSTAI.model=function(){return active()?MODEL:(previousModel?previousModel():'unknown');};
window.PSTAI.requestTransport=async function(body,key){if(!active()){if(!previousRequestTransport)throw new Error('PSTAI request transport chain is unavailable.');return previousRequestTransport(body,key)}var init={method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+groqKey()},body:JSON.stringify(body||{})};var run=function(){return groqFetch(GROQ_URL,init)};var result=queue.then(run,run);queue=result.then(function(){},function(){});return result};
window.PSTAI.groqKey=groqKey;
window.PSTAI.testGroqConnection=testGroqConnection;
window.PSTAI.activateGroqGptOss=function(key){
  var k=String(key||groqKey()||'').trim();
  if(!k)return false;
  setStore('pristeel_groq_apikey',k);
  setStore('pristeel_ai_provider',PROVIDER);
  setStore('pristeel_apikey','__GROQ_GPTOSS_COMPAT__');
  return true;
};
window.PSTAI.deactivateGroqGptOss=function(){
  setStore('pristeel_ai_provider','');
  if(getStore('pristeel_apikey')==='__GROQ_GPTOSS_COMPAT__')setStore('pristeel_apikey','__GEMINI_COMPAT__');
  return true;
};

function salvageLegacyKey(){
  if(groqKey())return;
  var legacy=getStore('pristeel_apikey');
  if(/^gsk_/i.test(legacy))setStore('pristeel_groq_apikey',legacy);
}
function css(){
  if(document.getElementById('pst-groq-gptoss-style'))return;
  var s=document.createElement('style');s.id='pst-groq-gptoss-style';
  s.textContent='\
#pst-groq-gptoss-card{margin-top:18px;padding-top:16px;border-top:1px solid var(--border,#e4e9ed)}\
#pst-groq-gptoss-card .pst-ai-title{font-size:12px;font-weight:800;color:var(--bronze,#3F7F98);margin-bottom:6px;text-transform:uppercase;letter-spacing:.4px}\
#pst-groq-gptoss-card .pst-ai-note{font-size:11px;line-height:1.5;color:#6f7d84;margin-bottom:10px}\
#pst-groq-gptoss-key{width:min(520px,100%);height:38px;border:1px solid #d5e1e6;border-radius:9px;padding:0 11px;font-size:12px;background:#fff}\
#pst-groq-gptoss-actions{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:10px}\
#pst-groq-gptoss-test{height:34px;padding:0 13px;border:1px solid #BFDDE8;border-radius:8px;background:#EAF5F8;color:#326F87;font-size:11px;font-weight:700;cursor:pointer}\
#pst-groq-gptoss-test:hover{background:#DDEFF4;border-color:#9EC9D8}\
#pst-groq-gptoss-test:disabled{opacity:.55;cursor:wait}\
#pst-groq-gptoss-result{font-size:11px;line-height:1.4;color:#718087}\
#pst-groq-gptoss-result.ok{color:#2F7657}\
#pst-groq-gptoss-result.err{color:#A64B42}\
';document.head.appendChild(s);
}
function install(){
  var apiInput=document.getElementById('s-apikey');
  if(!apiInput)return false;
  var group=apiInput.closest?apiInput.closest('.field-group'):null;
  var anchor=(document.getElementById('pst-gemini-test-row')||document.getElementById('key-status')||group);
  if(!anchor||document.getElementById('pst-groq-gptoss-card'))return !!document.getElementById('pst-groq-gptoss-card');
  css();salvageLegacyKey();
  var card=document.createElement('div');card.id='pst-groq-gptoss-card';
  card.innerHTML='<div class="pst-ai-title">Groq GPT-OSS</div><div class="pst-ai-note">Free Plan kandidat për PPPP. Testi dërgon vetëm një prompt sintetik. Nëse testi kalon, GPT-OSS 20B aktivizohet si motori AI i PPPP në këtë browser.</div><label class="lbl" for="pst-groq-gptoss-key">Groq API Key</label><br><input type="password" id="pst-groq-gptoss-key" placeholder="gsk_..." autocomplete="off"><div id="pst-groq-gptoss-actions"><button type="button" id="pst-groq-gptoss-test">Test & aktivizo GPT-OSS</button><div id="pst-groq-gptoss-result" aria-live="polite"></div></div>';
  anchor.insertAdjacentElement('afterend',card);
  var input=document.getElementById('pst-groq-gptoss-key');
  var button=document.getElementById('pst-groq-gptoss-test');
  var result=document.getElementById('pst-groq-gptoss-result');
  var saved=groqKey();if(saved)input.value=saved;
  if(active()){result.className='ok';result.textContent='✓ Aktiv · '+MODEL+' · GroqCloud';}
  input.addEventListener('input',function(){setStore('pristeel_groq_apikey',String(input.value||'').trim());});
  button.onclick=async function(){
    var k=String(input.value||'').trim();setStore('pristeel_groq_apikey',k);
    button.disabled=true;result.className='';result.textContent='Duke testuar Groq nga ky browser…';
    var out=await testGroqConnection(k);button.disabled=false;
    if(out.ok){window.PSTAI.activateGroqGptOss(k);result.className='ok';result.textContent='✓ GPT-OSS aktiv · '+out.model+' · '+out.latencyMs+' ms · GroqCloud';}
    else{result.className='err';result.textContent='✕ GPT-OSS test failed · '+out.message;}
  };
  return true;
}

var oldRender=window.renderSettings;
if(typeof oldRender==='function'&&!oldRender.__pstGroqGptOssWrapped){
  var wrapped=function(){var v=oldRender.apply(this,arguments);setTimeout(install,0);return v;};
  wrapped.__pstGroqGptOssWrapped=true;window.renderSettings=wrapped;
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(install,0);},{once:true});
else setTimeout(install,0);
})();
