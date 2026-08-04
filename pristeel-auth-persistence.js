/* PRISTEEL: ruan sesionin e hyrjes dhe e mbron nga logout-i pas refresh-it */
(function(){
'use strict';
if(window.__pstAuthPersistenceLoaded)return;
window.__pstAuthPersistenceLoaded=true;

var PRIMARY_KEY='pristeel_session';
var BACKUP_KEY='pst_pristeel_session_backup_v1';
var BACKUP_TTL=30*24*60*60*1000;
var SNAPSHOT_KEY='pst_auth_session_snapshot_v3';
var RESTORE_MARKER='pst_auth_restore_marker_v3';
var CHANNEL_NAME='pristeel-auth-session-v3';
var channel=null;
var instanceId=Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,9);
var originalRefresh=typeof window.authRefreshIfNeeded==='function'?window.authRefreshIfNeeded:null;

function parse(v){try{return JSON.parse(v||'null');}catch(e){return null;}}
function readPrimary(){try{return parse(localStorage.getItem(PRIMARY_KEY));}catch(e){return null;}}
function writePrimary(s){try{if(s)localStorage.setItem(PRIMARY_KEY,JSON.stringify(s));}catch(e){}}
function backupSession(s){
  if(!s||!s.access_token||!s.refresh_token)return;
  try{localStorage.setItem(BACKUP_KEY,JSON.stringify({at:Date.now(),session:s}));}catch(e){}
}
function readBackup(){
  var b=null;try{b=parse(localStorage.getItem(BACKUP_KEY));}catch(e){}
  if(!b||!b.at||!b.session||Date.now()-Number(b.at)>BACKUP_TTL){
    try{localStorage.removeItem(BACKUP_KEY);}catch(e){}
    return null;
  }
  return b.session;
}
function restorePrimaryFromBackup(){
  var current=readPrimary();
  if(current&&current.access_token&&current.refresh_token){backupSession(current);return current;}
  var saved=readBackup();
  if(saved&&saved.access_token&&saved.refresh_token){writePrimary(saved);return saved;}
  return null;
}

/* Kryhet menjëherë, para event-it window.load të aplikacionit. */
restorePrimaryFromBackup();

function dumpSessionStorage(){
  var data={};
  try{
    for(var i=0;i<sessionStorage.length;i++){
      var key=sessionStorage.key(i);
      if(!key||key===RESTORE_MARKER)continue;
      data[key]=sessionStorage.getItem(key);
    }
  }catch(e){}
  return data;
}
function saveStorageSnapshot(){
  var data=dumpSessionStorage();
  try{localStorage.setItem(SNAPSHOT_KEY,JSON.stringify({at:Date.now(),data:data}));}catch(e){}
}
function restoreStorageSnapshot(){
  var snap=null;try{snap=parse(localStorage.getItem(SNAPSHOT_KEY));}catch(e){}
  if(!snap||!snap.data)return 0;
  var n=0;try{Object.keys(snap.data).forEach(function(k){if(k!==RESTORE_MARKER&&snap.data[k]!=null){sessionStorage.setItem(k,String(snap.data[k]));n++;}});}catch(e){}
  return n;
}
restoreStorageSnapshot();

function saveReturnedSession(payload){
  if(!payload)return null;
  var base=payload.session||payload;
  if(!base.access_token||!base.refresh_token)return null;
  if(typeof window.authSaveSession==='function'){
    try{window.authSaveSession(base);}catch(e){}
  }else{
    writePrimary({
      access_token:base.access_token,
      refresh_token:base.refresh_token,
      expires_at:Date.now()+((base.expires_in||3600)*1000)-30000,
      email:base.user&&base.user.email
    });
  }
  var saved=readPrimary();
  if(saved)backupSession(saved);
  return saved;
}
function explicitInvalid(status,text){
  text=String(text||'').toLowerCase();
  return (status===400||status===401)&&(/invalid[_ ]?grant|invalid[_ ]?refresh|refresh token.*not found|already used|expired refresh/.test(text));
}
async function refreshDirect(s){
  if(!s||!s.refresh_token||!window._SB_URL||!window._SB_KEY)return null;
  var response;
  try{
    response=await fetch(window._SB_URL+'/auth/v1/token?grant_type=refresh_token',{
      method:'POST',
      headers:{'apikey':window._SB_KEY,'Authorization':'Bearer '+window._SB_KEY,'Content-Type':'application/json'},
      body:JSON.stringify({refresh_token:s.refresh_token})
    });
  }catch(networkError){
    backupSession(s);
    return s;
  }
  var text='';try{text=await response.text();}catch(e){}
  if(response.ok){
    var payload=parse(text);
    return saveReturnedSession(payload)||s;
  }
  if(explicitInvalid(response.status,text)){
    try{localStorage.removeItem(PRIMARY_KEY);localStorage.removeItem(BACKUP_KEY);}catch(e){}
    return null;
  }
  /* 429, 5xx ose përgjigje e përkohshme: mos e fshi sesionin. */
  backupSession(s);
  return s;
}

window.authRefreshIfNeeded=async function(){
  var s=restorePrimaryFromBackup();
  if(!s||!s.refresh_token)return null;
  if(!s.expires_at||Date.now()<Number(s.expires_at)){
    backupSession(s);
    return s;
  }
  var refreshed=await refreshDirect(s);
  if(refreshed)return refreshed;
  /* Vetëm nëse refresh-i direkt e konfirmoi tokenin invalid, lejo logout. */
  return null;
};

function enhanceLoginForm(){
  var form=document.getElementById('auth-form');
  var email=document.getElementById('auth-email');
  var pass=document.getElementById('auth-pass');
  if(!form||form.__pstRememberEnhanced)return false;
  form.__pstRememberEnhanced=true;
  form.setAttribute('autocomplete','on');
  if(email){email.setAttribute('name','username');email.setAttribute('autocomplete','username');email.setAttribute('data-form-type','username');email.removeAttribute('data-lpignore');}
  if(pass){pass.setAttribute('name','password');pass.setAttribute('autocomplete','current-password');pass.setAttribute('data-form-type','password');pass.removeAttribute('data-lpignore');}
  form.addEventListener('submit',function(){
    var attempts=0,t=setInterval(function(){
      attempts++;
      var s=readPrimary();
      if(s&&s.access_token&&s.refresh_token){backupSession(s);clearInterval(t);}
      else if(attempts>=30)clearInterval(t);
    },300);
  });
  return true;
}
function clearRememberedSession(){
  try{localStorage.removeItem(PRIMARY_KEY);localStorage.removeItem(BACKUP_KEY);localStorage.removeItem(SNAPSHOT_KEY);}catch(e){}
}
function send(msg){msg=msg||{};msg.from=instanceId;try{if(channel)channel.postMessage(msg);}catch(e){}}
function initChannel(){
  if(!('BroadcastChannel' in window))return;
  try{
    channel=new BroadcastChannel(CHANNEL_NAME);
    channel.onmessage=function(event){
      var msg=event.data||{};if(msg.from===instanceId)return;
      if(msg.type==='request-session'){
        var s=restorePrimaryFromBackup();if(s)send({type:'session-response',to:msg.from,session:s});
      }else if(msg.type==='session-response'&&msg.to===instanceId&&!readPrimary()&&msg.session){
        writePrimary(msg.session);backupSession(msg.session);
      }else if(msg.type==='clear-session')clearRememberedSession();
    };
    send({type:'request-session'});
  }catch(e){channel=null;}
}
function watchLogout(){
  document.addEventListener('click',function(event){
    var el=event.target&&event.target.closest?event.target.closest('button,a,[onclick]'):null;
    if(!el)return;
    var text=((el.textContent||'')+' '+(el.getAttribute('onclick')||'')+' '+(el.id||'')).toLowerCase();
    if(/\bdil\b|logout|log out|signout|sign out/.test(text)){
      clearRememberedSession();send({type:'clear-session'});
    }
  },true);
}
function init(){
  restorePrimaryFromBackup();
  enhanceLoginForm();
  initChannel();
  watchLogout();
  var tries=0,formTimer=setInterval(function(){enhanceLoginForm();if(++tries>40)clearInterval(formTimer);},400);
  setInterval(function(){var s=readPrimary();if(s)backupSession(s);saveStorageSnapshot();},1200);
  window.addEventListener('pageshow',function(){restorePrimaryFromBackup();var s=readPrimary();if(s)backupSession(s);});
  window.addEventListener('storage',function(event){if((event.key===PRIMARY_KEY||event.key===BACKUP_KEY)&&!readPrimary())restorePrimaryFromBackup();});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();