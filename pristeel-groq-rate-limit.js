/* PRISTEEL Groq guard: përdor modelin me kufi më të lartë dhe respekton TPM */
(function(){
'use strict';
if(window.__pstGroqRateLimitGuardLoaded)return;
window.__pstGroqRateLimitGuardLoaded=true;

var nativeFetch=window.fetch.bind(window);
var GROQ_URL='api.groq.com/openai/v1/chat/completions';
var queue=Promise.resolve();

function sleep(ms){return new Promise(function(resolve){setTimeout(resolve,ms)})}
function isGroq(input){
  var url=typeof input==='string'?input:(input&&input.url)||'';
  return String(url).indexOf(GROQ_URL)>-1
}
function cloneJson(v){return JSON.parse(JSON.stringify(v))}
function parseBody(init){
  if(!init||typeof init.body!=='string')return null;
  try{return JSON.parse(init.body)}catch(e){return null}
}
function shape(body,attempt){
  var out=cloneJson(body||{});
  var original=Number(out.max_tokens)||0;

  // Free tier: llama-3.1-8b-instant ka 6K TPM; 70B ka 12K TPM.
  // Përdorim 70B edhe për nxjerrjen e fakteve, pastaj ulim completion budget.
  if(out.model==='llama-3.1-8b-instant'){
    out.model='llama-3.3-70b-versatile';
    out.max_tokens=Math.min(original||1800,attempt===0?1800:attempt===1?1300:950)
  }else{
    out.max_tokens=Math.min(original||2600,attempt===0?2600:attempt===1?1900:1300)
  }

  // Në retry-n e fundit, kufizo vetëm mesazhin më të gjatë pa prishur fillimin/fundin.
  if(attempt>=2&&Array.isArray(out.messages)){
    out.messages=out.messages.map(function(m){
      var c=String((m&&m.content)||'');
      if(c.length<=18000)return m;
      var copy=Object.assign({},m);
      copy.content=c.slice(0,11500)+'\n\n[...pjesa e mesit u shkurtua për kufirin TPM...]\n\n'+c.slice(-5500);
      return copy
    })
  }
  return out
}
function limitError(text,status){
  return status===429||/request too large|tokens per minute|\bTPM\b|rate limit|reduce your message size/i.test(String(text||''))
}
function retryDelay(response,text,attempt){
  var h=response&&response.headers;
  var sec=h&&Number(h.get('retry-after'));
  if(!isFinite(sec)||sec<=0){
    var m=String(text||'').match(/try again in\s*([0-9.]+)s/i);
    sec=m?Number(m[1]):(attempt===0?8:18)
  }
  return Math.min(65000,Math.max(1500,Math.ceil(sec*1000)+500))
}
async function groqFetch(input,init){
  var body=parseBody(init);
  if(!body)return nativeFetch(input,init);

  var lastResponse=null;
  for(var attempt=0;attempt<3;attempt++){
    var nextInit=Object.assign({},init,{body:JSON.stringify(shape(body,attempt))});
    lastResponse=await nativeFetch(input,nextInit);
    if(lastResponse.ok)return lastResponse;

    var text='';
    try{text=await lastResponse.clone().text()}catch(e){}
    if(!limitError(text,lastResponse.status))return lastResponse;

    if(attempt<2){
      console.warn('PRISTEEL: Groq TPM limit, retry '+(attempt+1)+'/2');
      await sleep(retryDelay(lastResponse,text,attempt))
    }
  }
  return lastResponse
}

window.fetch=function(input,init){
  if(!isGroq(input))return nativeFetch(input,init);
  // Serializimi ndalon dy kërkesa AI që të konsumojnë TPM në të njëjtën kohë.
  var run=function(){return groqFetch(input,init)};
  var result=queue.then(run,run);
  queue=result.then(function(){},function(){});
  return result
};
})();
