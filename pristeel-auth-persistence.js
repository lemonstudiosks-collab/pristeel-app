/* PRISTEEL remembered login
 * Keeps the existing Supabase refresh-token session available across browser restarts.
 * Never stores or reads the user's password. Explicit logout clears the remembered session.
 */
(function(){
'use strict';
if(window.__pstAuthPersistenceLoaded)return;
window.__pstAuthPersistenceLoaded=true;

/* Load the automation/state truth layer as the first ordered runtime dependency. */
(function loadAutomationTruth(){
  if(window.__pstAutomationTruthV1||document.querySelector('script[data-pst-automation-truth]'))return;
  var s=document.createElement('script');
  s.src='pristeel-automation-truth-v1.js?v=20260821-truth2';
  s.defer=true;
  s.setAttribute('data-pst-automation-truth','1');
  document.head.appendChild(s);
})();

var SESSION_KEY='pristeel_session';
var BACKUP_KEY='pst_auth_remembered_session_v3';
var ATTEMPT_KEY='pst_auth_restore_attempt_v3';
var BACKUP_TTL=30*24*60*60*1000;

function parse(v){try{return JSON.parse(v||'null');}catch(e){return null;}}
function currentSession(){
  try{return parse(localStorage.getItem(SESSION_KEY));}catch(e){return null;}
}
function usable(s){return !!(s&&s.refresh_token);}
function remember(){
  var s=currentSession();
  if(!usable(s))return false;
  try{localStorage.setItem(BACKUP_KEY,JSON.stringify({at:Date.now(),session:s}));return true;}catch(e){return false;}
}
function readBackup(){
  var b=null;
  try{b=parse(localStorage.getItem(BACKUP_KEY));}catch(e){}
  if(!b||!b.at||!usable(b.session)||Date.now()-Number(b.at)>BACKUP_TTL){
    try{localStorage.removeItem(BACKUP_KEY);}catch(e){}
    return null;
  }
  return b;
}
function clearRemembered(){
  try{localStorage.removeItem(BACKUP_KEY);}catch(e){}
  try{sessionStorage.removeItem(ATTEMPT_KEY);}catch(e){}
}
function restoreOnce(){
  if(usable(currentSession()))return false;
  var b=readBackup();if(!b)return false;
  var marker=String(b.at)+'|'+location.pathname;
  try{if(sessionStorage.getItem(ATTEMPT_KEY)===marker)return false;}catch(e){}
  var s={};Object.keys(b.session||{}).forEach(function(k){s[k]=b.session[k];});
  s.expires_at=0; // force the existing auth code to validate/rotate the refresh token
  try{
    localStorage.setItem(SESSION_KEY,JSON.stringify(s));
    sessionStorage.setItem(ATTEMPT_KEY,marker);
    return true;
  }catch(e){return false;}
}
function gateVisible(){
  var gate=document.getElementById('auth-gate');if(!gate)return false;
  var style=window.getComputedStyle?window.getComputedStyle(gate):null;
  return !style||style.display!=='none';
}
function enhanceForm(){
  var form=document.getElementById('auth-form'),email=document.getElementById('auth-email'),pass=document.getElementById('auth-pass');
  if(!form||form.__pstRememberEnhanced)return false;
  form.__pstRememberEnhanced=true;
  form.setAttribute('autocomplete','on');
  if(email){email.setAttribute('name','username');email.setAttribute('autocomplete','username');}
  if(pass){pass.setAttribute('name','password');pass.setAttribute('autocomplete','current-password');}
  form.addEventListener('submit',function(){
    [450,950,1800,3200].forEach(function(ms){setTimeout(function(){if(remember())try{sessionStorage.removeItem(ATTEMPT_KEY);}catch(e){}},ms);});
  });
  return true;
}
function recoverVisibleGate(){
  if(!gateVisible()){remember();return;}
  var s=currentSession();
  if(!usable(s)&&!restoreOnce())return;
  if(typeof window.authRefreshIfNeeded!=='function'){
    setTimeout(function(){location.reload();},90);return;
  }
  Promise.resolve(window.authRefreshIfNeeded()).then(function(fresh){
    if(!fresh)return;
    remember();
    try{sessionStorage.removeItem(ATTEMPT_KEY);}catch(e){}
    if(typeof window.startApp==='function')window.startApp();
  }).catch(function(){});
}
function onLogoutClick(event){
  var el=event.target&&event.target.closest?event.target.closest('button,a,[onclick]'):null;if(!el)return;
  var text=((el.textContent||'')+' '+(el.getAttribute('onclick')||'')+' '+(el.id||'')).toLowerCase();
  if(/\bdil\b|logout|log out|signout|sign out|dologout/.test(text))clearRemembered();
}
function init(){
  enhanceForm();
  if(usable(currentSession()))remember();else restoreOnce();
  document.addEventListener('click',onLogoutClick,true);
  if(document.readyState==='complete')setTimeout(recoverVisibleGate,120);
  else window.addEventListener('load',function(){setTimeout(recoverVisibleGate,120);},{once:true});
  window.addEventListener('pageshow',function(){enhanceForm();if(usable(currentSession()))remember();});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
window.PSTAuthPersistence={remember:remember,restoreOnce:restoreOnce,clear:clearRemembered,enhanceForm:enhanceForm,recover:recoverVisibleGate,_test:{currentSession:currentSession,readBackup:readBackup,usable:usable}};
})();