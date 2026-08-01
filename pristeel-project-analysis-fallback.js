/* PRISTEEL Project Intelligence: vazhdo me analizën operative kur AI key është i pavlefshëm */
(function(){
'use strict';
if(window.__pstProjectAnalysisFallbackLoaded)return;
window.__pstProjectAnalysisFallbackLoaded=true;

var retried={};

function stateText(pid){
  var el=document.getElementById('pai-state-'+pid);
  return el?String(el.textContent||''):''
}
function isAuthError(text){
  return /invalid api key|api key.*invalid|unauthori[sz]ed|authentication failed|invalid token|\b401\b/i.test(String(text||''))
}
function setState(pid,text,color){
  var el=document.getElementById('pai-state-'+pid);
  if(!el)return;
  el.textContent=text;
  el.style.color=color||'var(--text3)'
}
function wrap(){
  var original=window.pstAnalyzeProject;
  if(typeof original!=='function')return false;
  if(original.__pstInvalidKeyFallback)return true;

  var wrapped=async function(pid){
    pid=String(pid==null?'':pid);
    var hadKey=!!localStorage.getItem('pristeel_apikey');
    var args=arguments;
    var result=await original.apply(this,args);

    if(!hadKey||retried[pid]||!isAuthError(stateText(pid)))return result;

    retried[pid]=true;
    localStorage.removeItem('pristeel_apikey');
    setState(pid,'AI API Key është i pavlefshëm. Po vazhdohet me analizën operative pa AI…','#9B6A22');

    try{
      await original.apply(this,args);
      var current=stateText(pid);
      if(!/dështoi|gabim/i.test(current)){
        setState(pid,'Analiza operative u krijua. AI API Key i pavlefshëm u hoq; mund të shtosh një çelës të ri te Cilësimet.','#2F7657')
      }
    }catch(e){
      setState(pid,'Analiza operative dështoi: '+(e&&e.message?e.message:String(e)),'#A64B42')
    }
    return result
  };
  wrapped.__pstInvalidKeyFallback=true;
  wrapped.__pstOriginal=original;
  window.pstAnalyzeProject=wrapped;
  return true
}

var tries=0,t=setInterval(function(){
  if(wrap()||++tries>80)clearInterval(t)
},250);
})();
