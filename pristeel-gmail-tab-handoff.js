/* PRISTEEL Gmail direct launch v5
 * Gmail intake has two explicit gates, in order:
 *   1) PRISTEEL platform session
 *   2) Google Gmail + Drive authorization
 * Only then is the Gmail thread intake opened.
 * No automatic OAuth popup, global polling, cross-tab negotiation or navigation takeover.
 */
(function(){
'use strict';
if(window.__pstGmailDirectLaunchV5)return;
window.__pstGmailDirectLaunchV5=true;
/* Compatibility marker used by older guards. */
window.__pstGmailDirectLaunchV4=true;

var PARAMS=['gmail_intake','gmail_message_id','gmail_thread_id','subject','from'];
var gate={target:'',holding:false,released:false,timers:[],loginBound:false};

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
function googleModuleReady(){return !!(window.PSTGoogleWorkspaceAuth&&window.PSTGmailIntakeAuthBridgeV1);}
function googleReady(){
  var G=window.PSTGoogleWorkspaceAuth;
  if(!G||!G.currentToken)return false;
  try{return !!G.currentToken([G.gmailScope,G.driveScope]);}catch(e){return false;}
}
function clearGateTimers(){gate.timers.forEach(function(t){clearTimeout(t);});gate.timers=[];}
function dispatchFallback(target){
  gate.released=true;gate.holding=false;
  window.__pstGmailHandoffPending=false;
  window.__pstPendingGmailIntakeTarget=target;
  try{document.dispatchEvent(new CustomEvent('pst:gmail-handoff-fallback',{detail:{target:target}}));}catch(e){}
  return true;
}
function releaseWhenReady(){
  if(!gate.holding||gate.released||!gate.target)return false;
  if(!platformReady())return false;
  if(!googleModuleReady())return false;

  window.__pstGmailHandoffPending=false;
  window.__pstPendingGmailIntakeTarget=gate.target;

  if(!googleReady()){
    var B=window.PSTGmailIntakeAuthBridgeV1;
    if(B&&typeof B.render==='function'&&B.render()){
      gate.released=true;gate.holding=false;clearGateTimers();return true;
    }
    return false;
  }

  clearGateTimers();
  return dispatchFallback(gate.target);
}
function boundedLoginChecks(){
  clearGateTimers();
  [120,300,650,1200,2200,4000,7000].forEach(function(ms){gate.timers.push(setTimeout(releaseWhenReady,ms));});
}
function bindLogin(){
  if(gate.loginBound)return true;
  var form=document.getElementById('auth-form');
  if(!form)return false;
  gate.loginBound=true;
  form.addEventListener('submit',boundedLoginChecks,true);
  return true;
}
function hold(target){
  target=safeTarget(target);if(!target)return false;
  gate.target=target;gate.holding=true;gate.released=false;
  window.__pstGmailHandoffPending=true;
  window.__pstPendingGmailIntakeTarget=target;
  if(!platformReady()&&!bindLogin()){
    [100,250,500,900,1500,2500].forEach(function(ms){
      gate.timers.push(setTimeout(function(){if(platformReady())releaseWhenReady();else bindLogin();},ms));
    });
  }
  return true;
}
function openTarget(target){
  target=safeTarget(target);if(!target)return false;
  var localTarget=copyIntakeParams(target);
  window.__pstPendingGmailIntakeTarget=localTarget;

  /* If either gate is unresolved, keep the target and let the explicit gate UI continue it. */
  if(!platformReady()||!googleModuleReady()||!googleReady()){
    hold(localTarget);
    if(platformReady()&&googleModuleReady())releaseWhenReady();
    return true;
  }

  window.__pstGmailHandoffPending=false;
  if(window.PSTGmailIntakeV3&&typeof window.PSTGmailIntakeV3.open==='function')window.PSTGmailIntakeV3.open(localTarget);
  else if(window.PSTGmailIntakeV2&&typeof window.PSTGmailIntakeV2.open==='function')window.PSTGmailIntakeV2.open(localTarget);
  else try{document.dispatchEvent(new CustomEvent('pst:gmail-intake-request',{detail:{target:localTarget}}));}catch(e){}
  return true;
}

/* Initial direct Gmail URL is always held until both gates are resolved. */
var initial=safeTarget(location.href);
if(initial)hold(initial);

document.addEventListener('pst:modules-ready',function(){releaseWhenReady();},{once:true});

window.PSTGmailHandoffV5={openTarget:openTarget,isIntake:!!initial,isHolding:function(){return gate.holding&&!gate.released;},releaseWhenReady:releaseWhenReady};
window.PSTGmailHandoffV4=window.PSTGmailHandoffV5;
window.PSTGmailHandoffV3=window.PSTGmailHandoffV5;
})();
