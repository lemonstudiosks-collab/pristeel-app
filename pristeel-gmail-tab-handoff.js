/* PRISTEEL Gmail direct launch v5
 * Gmail opens the platform in the current tab and reuses the existing same-origin session.
 * If PRISTEEL itself is locked, the Gmail target is held until explicit platform login.
 * Google authorization is a second gate and never opens automatically.
 * No cross-tab negotiation, automatic closing, navigation takeover, global polling or observers.
 */
(function(){
'use strict';
if(window.__pstGmailDirectLaunchV5)return;
window.__pstGmailDirectLaunchV5=true;
/* Compatibility marker used by older guards. */
window.__pstGmailDirectLaunchV4=true;

var PARAMS=['gmail_intake','gmail_message_id','gmail_thread_id','subject','from'];
var gate={target:'',holding:false,released:false,timers:[],loginBound:false};

/* Clear the legacy named-window marker and any stale handoff flags. */
try{window.name='';}catch(e){}
window.__pstAbortBootstrap=false;
window.__pstGmailHandoffPending=false;

function safeTarget(value){
  try{
    var url=new URL(value||location.href,location.href);
    if(url.origin!==location.origin)return'';
    if(url.searchParams.get('gmail_intake')!=='1')return'';
    if(!url.searchParams.get('gmail_message_id'))return'';
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
function platformSession(){
  try{
    if(typeof window.authGetSession!=='function')return null;
    return window.authGetSession()||null;
  }catch(e){return null;}
}
function platformReady(){return !!platformSession();}
function googleReady(){
  var G=window.PSTGoogleWorkspaceAuth;
  if(!G||!G.currentToken)return false;
  try{return !!G.currentToken([G.gmailScope,G.driveScope]);}catch(e){return false;}
}
function clearGateTimers(){gate.timers.forEach(function(t){clearTimeout(t);});gate.timers=[];}
function dispatchFallback(target){
  window.__pstGmailHandoffPending=false;
  window.__pstPendingGmailIntakeTarget=target;
  try{document.dispatchEvent(new CustomEvent('pst:gmail-handoff-fallback',{detail:{target:target}}));}catch(e){}
}
function releaseAfterLogin(){
  if(!gate.holding||gate.released||!gate.target||!platformReady())return false;
  gate.released=true;
  gate.holding=false;
  clearGateTimers();
  window.__pstGmailHandoffPending=false;
  window.__pstPendingGmailIntakeTarget=gate.target;

  /* Google auth is independent from PRISTEEL login. Show only if actually needed. */
  if(!googleReady()){
    var B=window.PSTGmailIntakeAuthBridgeV1;
    if(B&&typeof B.render==='function'&&B.render())return true;
  }
  dispatchFallback(gate.target);
  return true;
}
function boundedLoginChecks(){
  clearGateTimers();
  [120,300,650,1200,2200,4000,7000].forEach(function(ms){
    gate.timers.push(setTimeout(releaseAfterLogin,ms));
  });
}
function bindLogin(){
  if(gate.loginBound)return true;
  var form=document.getElementById('auth-form');
  if(!form)return false;
  gate.loginBound=true;
  form.addEventListener('submit',boundedLoginChecks,true);
  return true;
}
function holdUntilPlatformLogin(target){
  target=safeTarget(target);if(!target)return false;
  gate.target=target;gate.holding=true;gate.released=false;
  window.__pstGmailHandoffPending=true;
  window.__pstPendingGmailIntakeTarget=target;
  if(!bindLogin()){
    [100,250,500,900,1500,2500].forEach(function(ms){
      gate.timers.push(setTimeout(function(){
        if(platformReady())releaseAfterLogin();else bindLogin();
      },ms));
    });
  }
  return true;
}
function openTarget(target){
  target=safeTarget(target);if(!target)return false;
  var localTarget=copyIntakeParams(target);
  window.__pstPendingGmailIntakeTarget=localTarget;

  if(!platformReady())return holdUntilPlatformLogin(localTarget);

  window.__pstGmailHandoffPending=false;
  if(window.PSTGmailIntakeV3&&typeof window.PSTGmailIntakeV3.open==='function'){
    window.PSTGmailIntakeV3.open(localTarget);
  }else if(window.PSTGmailIntakeV2&&typeof window.PSTGmailIntakeV2.open==='function'){
    window.PSTGmailIntakeV2.open(localTarget);
  }else{
    try{document.dispatchEvent(new CustomEvent('pst:gmail-intake-request',{detail:{target:localTarget}}));}catch(e){}
  }
  return true;
}

/* A Gmail link is already the destination platform tab. Keep it alive for bootstrap. */
var initial=safeTarget(location.href);
if(initial){
  window.__pstPendingGmailIntakeTarget=initial;
  if(!platformReady())holdUntilPlatformLogin(initial);
}

window.PSTGmailHandoffV5={openTarget:openTarget,isIntake:!!initial,isHolding:function(){return gate.holding&&!gate.released;},releaseAfterLogin:releaseAfterLogin};
window.PSTGmailHandoffV4=window.PSTGmailHandoffV5;
window.PSTGmailHandoffV3=window.PSTGmailHandoffV5;
})();
