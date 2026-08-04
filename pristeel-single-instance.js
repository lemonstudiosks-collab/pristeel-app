/* PRISTEEL: mban vetëm një instancë aktive të platformës */
(function(){
'use strict';

if(window.__pstSingleInstanceLoaded)return;
window.__pstSingleInstanceLoaded=true;

/* Gmail intake është një rrjedhë e veçantë. Ajo duhet të qëndrojë e hapur
   edhe kur platforma kryesore është tashmë e hapur në një tab tjetër. */
try{
  var intakeParams=new URLSearchParams(window.location.search);
  if(intakeParams.get('gmail_intake')==='1'){
    window.__pstSingleInstanceBypassedForGmail=true;
    window.name='PRISTEEL_MAIN';
    return;
  }
}catch(e){}

var CHANNEL_NAME='pristeel-single-instance-v1';
var OWNER_KEY='pst_single_instance_owner_v1';
var MESSAGE_KEY='pst_single_instance_message_v1';
var TAB_KEY='pst_single_instance_tab_id_v1';
var APP_WINDOW_NAME='PRISTEEL_MAIN';
var HEARTBEAT_MS=1500;
var OWNER_TTL_MS=9000;

/* sessionStorage mbijeton reload-in, por është i ndarë për çdo tab.
   Kjo bën që refresh-i të njihet si i njëjti tab, jo si instancë e dytë. */
var instanceId='';
try{
  instanceId=sessionStorage.getItem(TAB_KEY)||'';
  if(!instanceId){
    instanceId=Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10);
    sessionStorage.setItem(TAB_KEY,instanceId);
  }
}catch(e){
  instanceId=Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10);
}

var channel=null;
var owner=false;
var duplicate=false;
var heartbeatTimer=null;
var primaryId='';
var seenMessages={};

try{window.name=APP_WINDOW_NAME;}catch(e){}

function now(){return Date.now();}
function jsonParse(value){try{return JSON.parse(value||'null');}catch(e){return null;}}
function getOwner(){try{return jsonParse(localStorage.getItem(OWNER_KEY));}catch(e){return null;}}
function ownerIsFresh(record){return !!(record&&record.id&&record.ts&&(now()-Number(record.ts)<OWNER_TTL_MS));}
function setOwner(){
  if(!owner)return;
  try{localStorage.setItem(OWNER_KEY,JSON.stringify({id:instanceId,ts:now(),url:location.href}));}catch(e){}
}
function clearOwner(){
  try{
    var current=getOwner();
    if(current&&current.id===instanceId)localStorage.removeItem(OWNER_KEY);
  }catch(e){}
}
function messageId(){return instanceId+'-'+now().toString(36)+'-'+Math.random().toString(36).slice(2,7);}
function send(message){
  message=message||{};
  message.mid=message.mid||messageId();
  message.from=instanceId;
  message.at=now();
  try{if(channel)channel.postMessage(message);}catch(e){}
  try{
    localStorage.setItem(MESSAGE_KEY,JSON.stringify(message));
    localStorage.removeItem(MESSAGE_KEY);
  }catch(e){}
}
function safeTarget(value){
  try{
    var url=new URL(value,location.href);
    if(url.origin!==location.origin)return '';
    if(url.pathname.indexOf('/pristeel-app/')!==0)return '';
    return url.href;
  }catch(e){return '';}
}
function hasDeepLink(value){
  try{
    var url=new URL(value,location.href);
    return !!(url.search||url.hash);
  }catch(e){return false;}
}
function focusPrimary(target){
  try{window.focus();}catch(e){}
  var safe=safeTarget(target);
  if(safe&&hasDeepLink(safe)&&safe!==location.href){
    setTimeout(function(){location.assign(safe);},30);
  }
}
function handleMessage(message){
  if(!message||message.from===instanceId||!message.mid||seenMessages[message.mid])return;
  seenMessages[message.mid]=1;
  setTimeout(function(){delete seenMessages[message.mid];},15000);

  if(message.type==='probe'&&owner){
    send({type:'alive',to:message.from,owner:instanceId});
    return;
  }
  if(message.type==='alive'&&message.to===instanceId&&!owner){
    primaryId=message.owner||message.from||'';
    becomeDuplicate();
    return;
  }
  if(message.type==='handoff'&&owner){
    if(message.to&&message.to!==instanceId)return;
    focusPrimary(message.target||'');
    setOwner();
  }
}
function closeDuplicateWindow(){
  try{window.close();}catch(e){}
  setTimeout(function(){
    if(window.closed)return;
    try{window.open('','_self');window.close();}catch(e){}
  },80);
}
function showDuplicateNotice(){
  if(window.closed)return;
  var target=document.body||document.documentElement;
  if(!target)return;
  document.title='PRISTEEL është tashmë e hapur';
  target.innerHTML=''
    +'<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#F6F7F8;font-family:Inter,-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;color:#25282B;padding:24px">'
    +'<div style="width:min(430px,100%);background:#fff;border:1px solid #E6E8EA;border-radius:16px;padding:28px;box-shadow:0 10px 35px rgba(24,30,36,.08);text-align:center">'
    +'<div style="width:44px;height:44px;border-radius:12px;background:#EAF5F8;color:#3E7E96;display:flex;align-items:center;justify-content:center;margin:0 auto 14px;font-size:20px;font-weight:750">P</div>'
    +'<div style="font-size:17px;font-weight:720">PRISTEEL është tashmë e hapur</div>'
    +'<div style="font-size:12px;line-height:1.6;color:#73797F;margin-top:8px">Kërkesa u dërgua te dritarja ekzistuese. Këtë dritare mund ta mbyllësh.</div>'
    +'<button onclick="window.close()" style="margin-top:18px;border:0;border-radius:9px;background:#5B9BB3;color:#fff;padding:10px 16px;font-size:12px;font-weight:700;cursor:pointer">Mbylle këtë dritare</button>'
    +'</div></div>';
}
function becomeDuplicate(){
  if(duplicate||owner)return;
  duplicate=true;
  window.__pstAbortBootstrap=true;
  var record=getOwner();
  primaryId=primaryId||(record&&record.id)||'';
  send({type:'handoff',to:primaryId,target:location.href});
  setTimeout(closeDuplicateWindow,40);
  setTimeout(showDuplicateNotice,450);
}
function becomeOwner(){
  if(duplicate)return;
  owner=true;
  setOwner();
  clearInterval(heartbeatTimer);
  heartbeatTimer=setInterval(setOwner,HEARTBEAT_MS);
  send({type:'owner-ready',owner:instanceId});
}
function claimOwnership(){
  if(duplicate||owner)return;
  var existing=getOwner();
  if(ownerIsFresh(existing)&&existing.id!==instanceId){
    primaryId=existing.id;
    becomeDuplicate();
    return;
  }
  try{localStorage.setItem(OWNER_KEY,JSON.stringify({id:instanceId,ts:now(),url:location.href}));}catch(e){}
  setTimeout(function(){
    var check=getOwner();
    if(check&&check.id!==instanceId&&ownerIsFresh(check)){
      primaryId=check.id;
      becomeDuplicate();
    }else{
      becomeOwner();
    }
  },90);
}
function injectManifest(){
  if(document.querySelector('link[rel="manifest"]'))return;
  var link=document.createElement('link');
  link.rel='manifest';
  link.href='pristeel.webmanifest?v=20260731-1';
  (document.head||document.documentElement).appendChild(link);
}

try{
  if('BroadcastChannel' in window){
    channel=new BroadcastChannel(CHANNEL_NAME);
    channel.addEventListener('message',function(event){handleMessage(event.data);});
  }
}catch(e){channel=null;}
window.addEventListener('storage',function(event){
  if(event.key===MESSAGE_KEY&&event.newValue)handleMessage(jsonParse(event.newValue));
});
window.addEventListener('pagehide',function(){
  clearInterval(heartbeatTimer);
  clearOwner();
  try{if(channel)channel.close();}catch(e){}
});
document.addEventListener('visibilitychange',function(){if(owner&&!document.hidden)setOwner();});

injectManifest();
var existing=getOwner();
if(ownerIsFresh(existing)&&existing.id!==instanceId){
  primaryId=existing.id;
  becomeDuplicate();
}else{
  send({type:'probe'});
  setTimeout(claimOwnership,360);
}

})();