/* PRISTEEL Gmail direct launch v4
 * Gmail opens the platform in the current tab and reuses the existing same-origin session.
 * No cross-tab negotiation, automatic closing, navigation takeover, polling or observers.
 */
(function(){
'use strict';
if(window.__pstGmailDirectLaunchV4)return;
window.__pstGmailDirectLaunchV4=true;

var PARAMS=['gmail_intake','gmail_message_id','gmail_thread_id','subject','from'];

/* Clear the legacy named-window marker and any stale handoff flags. */
try{window.name='';}catch(e){}
window.__pstAbortBootstrap=false;
window.__pstGmailHandoffPending=false;

function safeTarget(value){
  try{
    var url=new URL(value||location.href,location.href);
    if(url.origin!==location.origin)return'';
    if(url.searchParams.get('gmail_intake')!=='1')return'';
    return url.href;
  }catch(e){return'';}
}
function copyIntakeParams(target){
  var incoming=new URL(target,location.href),current=new URL(location.href);
  PARAMS.forEach(function(key){
    var value=incoming.searchParams.get(key);
    if(value!==null)current.searchParams.set(key,value);else current.searchParams.delete(key);
  });
  history.replaceState({},'',current.pathname+current.search+current.hash);
  return current.href;
}
function openTarget(target){
  target=safeTarget(target);if(!target)return false;
  var localTarget=copyIntakeParams(target);
  window.__pstPendingGmailIntakeTarget=localTarget;
  window.__pstGmailHandoffPending=false;
  if(window.PSTGmailIntakeV2&&typeof window.PSTGmailIntakeV2.open==='function'){
    window.PSTGmailIntakeV2.open(localTarget);
  }else{
    try{document.dispatchEvent(new CustomEvent('pst:gmail-intake-request',{detail:{target:localTarget}}));}catch(e){}
  }
  return true;
}

/* A Gmail link is already the destination platform tab. Keep it alive and let intake v2 open after bootstrap. */
var initial=safeTarget(location.href);
if(initial)window.__pstPendingGmailIntakeTarget=initial;

window.PSTGmailHandoffV4={openTarget:openTarget,isIntake:!!initial};
/* Compatibility for callers that still reference the previous object name. */
window.PSTGmailHandoffV3=window.PSTGmailHandoffV4;
})();
