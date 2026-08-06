/* PRISTEEL Gmail handoff v3
 * Opens Gmail intake inside the already authenticated platform tab.
 * No navigation reload, window-name takeover, polling or background observer.
 */
(function(){
'use strict';
if(window.__pstGmailHandoffV3)return;
window.__pstGmailHandoffV3=true;

var params=new URLSearchParams(location.search);
var isIntake=params.get('gmail_intake')==='1';
var CHANNEL='pristeel-gmail-handoff-v3';
var REQUEST_KEY='pst_gmail_handoff_request_v3';
var ACK_KEY='pst_gmail_handoff_ack_v3';
var instanceId=Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,9);
var channel=null;
var requestId='';
var completed=false;

/* Remove the old named-window behavior. Gmail must never replace the platform tab. */
try{window.name='';}catch(e){}

function parse(value){try{return JSON.parse(value||'null');}catch(e){return null;}}
function safeTarget(value){
  try{
    var url=new URL(value,location.href);
    if(url.origin!==location.origin)return'';
    if(url.searchParams.get('gmail_intake')!=='1')return'';
    return url.href;
  }catch(e){return'';}
}
function post(message,key){
  message=message||{};
  try{if(channel)channel.postMessage(message);}catch(e){}
  try{localStorage.setItem(key,JSON.stringify(message));localStorage.removeItem(key);}catch(e){}
}
function copyIntakeParams(target){
  var incoming=new URL(target,location.href),current=new URL(location.href);
  ['gmail_intake','gmail_message_id','gmail_thread_id','subject','from'].forEach(function(key){
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
  try{window.focus();}catch(e){}
  if(window.PSTGmailIntakeV2&&typeof window.PSTGmailIntakeV2.open==='function'){
    window.PSTGmailIntakeV2.open(localTarget);
  }else{
    try{document.dispatchEvent(new CustomEvent('pst:gmail-intake-request',{detail:{target:localTarget}}));}catch(e){}
  }
  return true;
}
function sendAck(id){post({type:'ack',id:id,to:id,from:instanceId,at:Date.now()},ACK_KEY);}
function handleRequest(message){
  if(isIntake||!message||message.type!=='request'||!message.id)return false;
  if(Date.now()-Number(message.at||0)>15000)return false;
  var target=safeTarget(message.target);if(!target)return false;
  sendAck(message.id);
  return openTarget(target);
}
function showTransferred(){
  if(document.getElementById('pst-gmail-transferred'))return;
  var el=document.createElement('div');el.id='pst-gmail-transferred';
  el.style.cssText='position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;background:#F3F8FA;font-family:Inter,-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;color:#273238;padding:24px';
  el.innerHTML='<div style="max-width:430px;background:#fff;border:1px solid #DCE8EC;border-radius:16px;padding:26px;text-align:center;box-shadow:0 16px 45px rgba(35,65,78,.10)"><b style="font-size:16px">Kërkesa u hap në platformën ekzistuese</b><p style="font-size:11px;line-height:1.6;color:#718087;margin:9px 0 0">Këtë tab mund ta mbyllësh. PRISTEEL nuk është rifreskuar dhe sesioni yt ka mbetur aktiv.</p></div>';
  (document.body||document.documentElement).appendChild(el);
}
function completeHandoff(message){
  if(!isIntake||completed||!message||message.type!=='ack'||message.to!==requestId)return false;
  completed=true;
  window.__pstAbortBootstrap=true;
  try{window.close();}catch(e){}
  setTimeout(function(){if(!window.closed)showTransferred();},120);
  return true;
}
function receive(message){if(isIntake)completeHandoff(message);else handleRequest(message);}

try{
  if('BroadcastChannel' in window){
    channel=new BroadcastChannel(CHANNEL);
    channel.addEventListener('message',function(event){receive(event.data||{});});
  }
}catch(e){channel=null;}
window.addEventListener('storage',function(event){
  if(event.key===REQUEST_KEY&&event.newValue)handleRequest(parse(event.newValue));
  if(event.key===ACK_KEY&&event.newValue)completeHandoff(parse(event.newValue));
});

if(isIntake){
  window.__pstGmailHandoffPending=true;
  requestId=instanceId+'-'+Date.now().toString(36);
  post({type:'request',id:requestId,from:instanceId,target:location.href,at:Date.now()},REQUEST_KEY);
  setTimeout(function(){
    if(completed)return;
    window.__pstGmailHandoffPending=false;
    try{document.dispatchEvent(new CustomEvent('pst:gmail-handoff-fallback',{detail:{target:location.href}}));}catch(e){}
  },900);
}

window.PSTGmailHandoffV3={openTarget:openTarget,isIntake:isIntake};
})();
