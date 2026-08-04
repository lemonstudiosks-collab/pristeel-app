/* PRISTEEL credit/debit notes v4 UI repair */
(function(){
'use strict';
if(window.__pstDocumentAdjustmentsV4UiFixLoaded)return;
window.__pstDocumentAdjustmentsV4UiFixLoaded=true;

function repair(){
  var box=document.getElementById('pst-adj-v4-recovery');
  var manual=document.getElementById('pst-adj-v3-manual-wrap');
  if(box&&manual&&manual.parentNode&&box.parentNode!==manual.parentNode){
    manual.parentNode.insertBefore(box,manual);
  }
}
var obs=new MutationObserver(function(){repair();});
if(document.documentElement)obs.observe(document.documentElement,{childList:true,subtree:true});
setInterval(repair,250);

function wrapUse(){
  var fn=window.pstAdjV4UseRecovery;
  if(typeof fn!=='function'||fn.__pstUiFixed)return false;
  var wrapped=function(){
    var result=fn.apply(this,arguments);
    setTimeout(function(){var box=document.getElementById('pst-adj-v4-recovery');if(box)box.remove();},40);
    return result;
  };
  wrapped.__pstUiFixed=true;
  window.pstAdjV4UseRecovery=wrapped;
  return true;
}
var tries=0,t=setInterval(function(){repair();if(wrapUse()||++tries>160)clearInterval(t);},100);
wrapUse();
})();
