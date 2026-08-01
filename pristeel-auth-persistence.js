/* PRISTEEL: ruan sesionin e hyrjes mes tab-eve pa ruajtur fjalëkalimin */
(function(){
'use strict';
if(window.__pstAuthPersistenceLoaded)return;
window.__pstAuthPersistenceLoaded=true;

var SNAPSHOT_KEY='pst_auth_session_snapshot_v2';
var SNAPSHOT_TTL=30*24*60*60*1000;
var RESTORE_MARKER='pst_auth_restore_marker_v2';
var CHANNEL_NAME='pristeel-auth-session-v2';
var channel=null;
var instanceId=Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,9);
var lastSnapshot='';

function parse(v){try{return JSON.parse(v||'null');}catch(e){return null}}
function dumpSession(){
  var data={};
  try{
    for(var i=0;i<sessionStorage.length;i++){
      var key=sessionStorage.key(i);
      if(!key||key===RESTORE_MARKER)continue;
      data[key]=sessionStorage.getItem(key);
    }
  }catch(e){}
  return data
}
function looksAuthenticated(data){
  var text='';
  try{text=JSON.stringify(data||{}).toLowerCase()}catch(e){}
  if(/access[_-]?token|refresh[_-]?token|bearer|auth[_-]?session|supabase|sb-/.test(text))return true;
  try{
    if(typeof window.authGetSession==='function'){
      var s=window.authGetSession();
      if(s&&(s.access_token||s.user||s.email))return true
    }
  }catch(e){}
  return false
}
function saveSnapshot(force){
  var data=dumpSession();
  if(!force&&!looksAuthenticated(data))return null;
  var raw='';
  try{raw=JSON.stringify({at:Date.now(),data:data})}catch(e){return null}
  if(raw===lastSnapshot)return data;
  lastSnapshot=raw;
  try{localStorage.setItem(SNAPSHOT_KEY,raw)}catch(e){}
  return data
}
function readSnapshot(){
  var snap=null;
  try{snap=parse(localStorage.getItem(SNAPSHOT_KEY))}catch(e){}
  if(!snap||!snap.at||!snap.data||Date.now()-Number(snap.at)>SNAPSHOT_TTL){
    try{localStorage.removeItem(SNAPSHOT_KEY)}catch(e){}
    return null
  }
  return snap
}
function restoreData(data){
  var count=0;
  if(!data||typeof data!=='object')return 0;
  try{
    Object.keys(data).forEach(function(key){
      if(key===RESTORE_MARKER||data[key]==null)return;
      sessionStorage.setItem(key,String(data[key]));
      count++
    })
  }catch(e){}
  return count
}
function gateVisible(){
  var gate=document.getElementById('auth-gate');
  if(!gate)return false;
  var style=window.getComputedStyle?getComputedStyle(gate):null;
  return !style||style.display!=='none'
}
function reloadAfterRestore(){
  var marker='done:'+location.pathname+location.search;
  try{
    if(sessionStorage.getItem(RESTORE_MARKER)===marker)return;
    sessionStorage.setItem(RESTORE_MARKER,marker)
  }catch(e){}
  setTimeout(function(){location.reload()},80)
}
function restoreLocal(){
  if(looksAuthenticated(dumpSession()))return false;
  var snap=readSnapshot();
  if(!snap)return false;
  var restored=restoreData(snap.data);
  if(restored&&gateVisible())reloadAfterRestore();
  return restored>0
}
function clearRememberedSession(){
  try{localStorage.removeItem(SNAPSHOT_KEY)}catch(e){}
  lastSnapshot=''
}
function enhanceLoginForm(){
  var form=document.getElementById('auth-form');
  var email=document.getElementById('auth-email');
  var pass=document.getElementById('auth-pass');
  if(!form||form.__pstRememberEnhanced)return false;
  form.__pstRememberEnhanced=true;
  form.setAttribute('autocomplete','on');
  if(email){
    email.setAttribute('name','username');
    email.setAttribute('autocomplete','username');
    email.setAttribute('data-form-type','username');
    email.removeAttribute('data-lpignore')
  }
  if(pass){
    pass.setAttribute('name','password');
    pass.setAttribute('autocomplete','current-password');
    pass.setAttribute('data-form-type','password');
    pass.removeAttribute('data-lpignore')
  }
  form.addEventListener('submit',function(){
    var attempts=0;
    var timer=setInterval(function(){
      attempts++;
      var data=saveSnapshot(false);
      if((data&&looksAuthenticated(data))||attempts>=20)clearInterval(timer)
    },400)
  });
  return true
}
function send(msg){
  msg=msg||{};msg.from=instanceId;
  try{if(channel)channel.postMessage(msg)}catch(e){}
}
function initChannel(){
  if(!('BroadcastChannel' in window))return;
  try{
    channel=new BroadcastChannel(CHANNEL_NAME);
    channel.onmessage=function(event){
      var msg=event.data||{};
      if(msg.from===instanceId)return;
      if(msg.type==='request-session'){
        var data=saveSnapshot(false)||dumpSession();
        if(looksAuthenticated(data))send({type:'session-response',to:msg.from,data:data})
      }else if(msg.type==='session-response'&&msg.to===instanceId&&!looksAuthenticated(dumpSession())){
        if(restoreData(msg.data)&&gateVisible())reloadAfterRestore()
      }else if(msg.type==='clear-session'){
        clearRememberedSession()
      }
    };
    send({type:'request-session'})
  }catch(e){channel=null}
}
function watchLogout(){
  document.addEventListener('click',function(event){
    var el=event.target&&event.target.closest?event.target.closest('button,a,[onclick]'):null;
    if(!el)return;
    var text=((el.textContent||'')+' '+(el.getAttribute('onclick')||'')+' '+(el.id||'')).toLowerCase();
    if(/\bdil\b|logout|log out|signout|sign out/.test(text)){
      clearRememberedSession();send({type:'clear-session'})
    }
  },true)
}
function init(){
  enhanceLoginForm();
  restoreLocal();
  initChannel();
  watchLogout();
  var tries=0;
  var formTimer=setInterval(function(){
    enhanceLoginForm();
    if(++tries>30)clearInterval(formTimer)
  },500);
  setInterval(function(){saveSnapshot(false)},1500);
  window.addEventListener('pageshow',function(){restoreLocal();saveSnapshot(false)});
  window.addEventListener('storage',function(event){
    if(event.key===SNAPSHOT_KEY&&!looksAuthenticated(dumpSession()))restoreLocal()
  })
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init()
})();
