/* PRISTEEL remembered login
 * Keeps the existing Supabase refresh-token session available across browser restarts.
 * Never stores or reads the user's password. Explicit logout clears the remembered session.
 */
(function(){
'use strict';
if(window.__pstAuthPersistenceLoaded)return;
window.__pstAuthPersistenceLoaded=true;

/* Critical project workspace recovery: activate before layered project UI modules. */
(function loadProjectWorkspaceRepair(){
  if(window.__pstProjectWorkspaceRepairLoaderV1||document.querySelector('script[data-pst-project-workspace-repair-loader]'))return;
  var s=document.createElement('script');
  s.src='pristeel-project-workspace-repair-loader-v1.js?v=20260830-workspace2';
  s.defer=true;
  s.setAttribute('data-pst-project-workspace-repair-loader','1');
  document.head.appendChild(s);
})();

/* Load the automation/state truth layer as the first ordered runtime dependency. */
(function loadAutomationTruth(){
  if(window.__pstAutomationTruthV1||document.querySelector('script[data-pst-automation-truth]'))return;
  var s=document.createElement('script');
  s.src='pristeel-automation-truth-v1.js?v=20260821-bigbutik1';
  s.defer=true;
  s.setAttribute('data-pst-automation-truth','1');
  document.head.appendChild(s);
})();

/* General Commercial rule: supplier/manufacturer conditions flow into buyer offer drafts. */
(function loadManufacturerTermsFlowdown(){
  if(window.__pstManufacturerTermsFlowdownV1||document.querySelector('script[data-pst-manufacturer-flowdown]'))return;
  var s=document.createElement('script');
  s.src='pristeel-manufacturer-terms-flowdown-v1.js?v=20260821-flowdown1';
  s.defer=true;
  s.setAttribute('data-pst-manufacturer-flowdown','1');
  document.head.appendChild(s);
})();

/* Universal Home policy: one project has one operational role at a time. */
(function loadHomeOperationalStatePolicy(){
  if(window.__pstHomeOperationalStatePolicyV1||document.querySelector('script[data-pst-home-operational-policy]'))return;
  var s=document.createElement('script');
  s.src='pristeel-home-operational-state-policy-v1.js?v=20260821-homeop1';
  s.defer=true;
  s.setAttribute('data-pst-home-operational-policy','1');
  document.head.appendChild(s);
})();

var SESSION_KEY='pristeel_session';
var BACKUP_KEY='pst_auth_remembered_session_v3';
var ATTEMPT_KEY='pst_auth_restore_attempt_v3';
var REFRESH_LOCK_KEY='pst_auth_refresh_lock_v1';
var BACKUP_TTL=30*24*60*60*1000;
var refreshInFlight=null;
var refreshBackoffUntil=0;

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
  try{localStorage.removeItem(REFRESH_LOCK_KEY);}catch(e){}
  try{sessionStorage.removeItem(ATTEMPT_KEY);}catch(e){}
}
function restoreOnce(){
  if(usable(currentSession()))return false;
  var b=readBackup();if(!b)return false;
  var marker=String(b.at)+'|'+location.pathname;
  try{if(sessionStorage.getItem(ATTEMPT_KEY)===marker)return false;}catch(e){}
  var s={};Object.keys(b.session||{}).forEach(function(k){s[k]=b.session[k];});
  /* Keep an unexpired access token. Only expired/invalid backups need one refresh validation. */
  if(!Number(s.expires_at)||Date.now()>=Number(s.expires_at))s.expires_at=0;
  try{
    localStorage.setItem(SESSION_KEY,JSON.stringify(s));
    sessionStorage.setItem(ATTEMPT_KEY,marker);
    return true;
  }catch(e){return false;}
}
function readRefreshLock(){
  try{return parse(localStorage.getItem(REFRESH_LOCK_KEY));}catch(e){return null;}
}
function releaseRefreshLock(owner){
  try{var l=readRefreshLock();if(l&&l.owner===owner)localStorage.removeItem(REFRESH_LOCK_KEY);}catch(e){}
}
function waitForPeerRefresh(beforeToken,timeoutMs){
  var started=Date.now();
  return new Promise(function(resolve){
    function check(){
      var s=currentSession();
      if(s&&s.access_token&&s.access_token!==beforeToken&&Number(s.expires_at)>Date.now()){resolve(s);return;}
      if(Date.now()-started>=timeoutMs){resolve(null);return;}
      setTimeout(check,120);
    }
    setTimeout(check,120);
  });
}
function installRefreshSingleFlight(){
  var original=window.authRefreshIfNeeded;
  if(typeof original!=='function')return false;
  if(original.__pstSingleFlightV1)return true;
  function guardedRefresh(){
    var s=currentSession(),now=Date.now();
    if(!s||!s.refresh_token)return Promise.resolve(null);
    if(Number(s.expires_at)&&now<Number(s.expires_at))return Promise.resolve(s);
    if(refreshInFlight)return refreshInFlight;
    if(now<refreshBackoffUntil)return Promise.resolve(currentSession());
    var lock=readRefreshLock(),before=s.access_token||'',owner=String(now)+'|'+Math.random().toString(36).slice(2);
    if(lock&&Number(lock.until)>now){
      refreshInFlight=waitForPeerRefresh(before,Math.min(4000,Math.max(500,Number(lock.until)-now+250))).then(function(peer){
        return peer||currentSession();
      }).finally(function(){refreshInFlight=null;});
      return refreshInFlight;
    }
    try{localStorage.setItem(REFRESH_LOCK_KEY,JSON.stringify({owner:owner,until:now+8000}));}catch(e){}
    refreshInFlight=Promise.resolve().then(function(){return original();}).then(function(fresh){
      if(fresh){refreshBackoffUntil=0;remember();return fresh;}
      refreshBackoffUntil=Date.now()+5000;
      return null;
    }).catch(function(){
      refreshBackoffUntil=Date.now()+10000;
      return null;
    }).finally(function(){releaseRefreshLock(owner);refreshInFlight=null;});
    return refreshInFlight;
  }
  guardedRefresh.__pstSingleFlightV1=true;
  guardedRefresh.__pstOriginal=original;
  window.authRefreshIfNeeded=guardedRefresh;
  return true;
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
  installRefreshSingleFlight();
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
  installRefreshSingleFlight();
  enhanceForm();
  if(usable(currentSession()))remember();else restoreOnce();
  document.addEventListener('click',onLogoutClick,true);
  if(document.readyState==='complete')setTimeout(recoverVisibleGate,120);
  else window.addEventListener('load',function(){setTimeout(recoverVisibleGate,120);},{once:true});
  window.addEventListener('pageshow',function(){installRefreshSingleFlight();enhanceForm();if(usable(currentSession()))remember();});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
window.PSTAuthPersistence={remember:remember,restoreOnce:restoreOnce,clear:clearRemembered,enhanceForm:enhanceForm,recover:recoverVisibleGate,installRefreshSingleFlight:installRefreshSingleFlight,_test:{currentSession:currentSession,readBackup:readBackup,usable:usable,readRefreshLock:readRefreshLock}};
})();