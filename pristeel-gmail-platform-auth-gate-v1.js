/* PRISTEEL Gmail -> platform auth gate v1
 * Direct Gmail intake must not run on top of the PRISTEEL login screen.
 * Keeps the Gmail target pending, waits for an explicit platform login, then
 * continues with Google authorization (only if needed) and the same thread.
 * Bounded checks only. No global polling, no automatic OAuth popup.
 */
(function(){
'use strict';
if(window.__pstGmailPlatformAuthGateV1)return;
window.__pstGmailPlatformAuthGateV1=true;

var PARAMS=['gmail_intake','gmail_message_id','gmail_thread_id','subject','from'];
var state={target:'',holding:false,released:false,installed:false,timers:[]};

function intakeTarget(){
  try{
    var u=new URL(location.href);
    if(u.searchParams.get('gmail_intake')!=='1')return'';
    if(!u.searchParams.get('gmail_message_id'))return'';
    return u.href;
  }catch(e){return'';}
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
function clearTimers(){state.timers.forEach(function(t){clearTimeout(t);});state.timers=[];}
function dispatchTarget(){
  if(state.released||!state.target)return false;
  state.released=true;
  window.__pstGmailHandoffPending=false;
  window.__pstPendingGmailIntakeTarget=state.target;
  try{document.dispatchEvent(new CustomEvent('pst:gmail-handoff-fallback',{detail:{target:state.target}}));}catch(e){}
  return true;
}
function continueAfterPlatformLogin(){
  if(!state.holding||state.released||!platformReady())return false;
  window.__pstGmailHandoffPending=false;

  /* Google auth is a second, independent gate. Never open it before platform login. */
  if(!googleReady()){
    var B=window.PSTGmailIntakeAuthBridgeV1;
    if(B&&typeof B.render==='function'){
      var shown=B.render();
      if(shown){clearTimers();return true;}
    }
  }
  clearTimers();
  return dispatchTarget();
}
function boundedChecks(){
  clearTimers();
  [120,300,650,1200,2200,4000,7000].forEach(function(ms){
    state.timers.push(setTimeout(function(){continueAfterPlatformLogin();},ms));
  });
}
function bindLogin(){
  if(state.installed)return true;
  var form=document.getElementById('auth-form');
  if(!form)return false;
  state.installed=true;
  form.addEventListener('submit',function(){boundedChecks();},true);
  return true;
}
function install(){
  state.target=intakeTarget();
  if(!state.target)return false;

  /* Existing active PRISTEEL session: leave the normal Gmail path untouched. */
  if(platformReady())return false;

  state.holding=true;
  state.released=false;
  window.__pstGmailHandoffPending=true;
  window.__pstPendingGmailIntakeTarget=state.target;

  if(!bindLogin()){
    [100,250,500,900,1500,2500].forEach(function(ms){
      state.timers.push(setTimeout(function(){
        if(platformReady())continueAfterPlatformLogin();
        else bindLogin();
      },ms));
    });
  }
  return true;
}

install();
window.PSTGmailPlatformAuthGateV1={
  isHolding:function(){return state.holding&&!state.released;},
  continueAfterLogin:continueAfterPlatformLogin,
  target:function(){return state.target;},
  _test:{intakeTarget:intakeTarget,platformReady:platformReady,googleReady:googleReady}
};
})();
