/* PRISTEEL: dërgon hyrjen nga Gmail te tab-i ekzistues i platformës */
(function(){
'use strict';
if(window.__pstGmailTabHandoffLoaded)return;
window.__pstGmailTabHandoffLoaded=true;

var REQUEST_KEY='pst_gmail_handoff_request_v2';
var ACK_KEY='pst_gmail_handoff_ack_v2';
var READY_KEY='pst_gmail_handoff_ready_v2';
var CHANNEL_NAME='pristeel-gmail-handoff-v2';
var instanceId=Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,9);
var channel=null;
var lastHandled='';
var readyTimer=null;

function parse(value){try{return JSON.parse(value||'null');}catch(e){return null;}}
function now(){return Date.now();}
function safeTarget(value){
  try{
    var url=new URL(value,location.href);
    if(url.origin!==location.origin)return '';
    if(url.pathname!=='/pristeel-app/pristeel-procurement.html')return '';
    if(url.searchParams.get('gmail_intake')!=='1')return '';
    return url.href;
  }catch(e){return '';}
}
function writeReady(){
  try{
    localStorage.setItem(READY_KEY,JSON.stringify({id:instanceId,ts:now(),url:location.href}));
  }catch(e){}
}
function clearReady(){
  try{
    var ready=parse(localStorage.getItem(READY_KEY));
    if(ready&&ready.id===instanceId)localStorage.removeItem(READY_KEY);
  }catch(e){}
}
function sendAck(requestId){
  var ack={type:'ack',id:requestId,from:instanceId,ts:now()};
  try{if(channel)channel.postMessage(ack);}catch(e){}
  try{localStorage.setItem(ACK_KEY,JSON.stringify(ack));}catch(e){}
}
function handleRequest(request){
  if(!request||request.type!=='request'||!request.id||request.id===lastHandled)return false;
  if(!request.ts||Math.abs(now()-Number(request.ts))>20000)return false;
  var target=safeTarget(request.target);
  if(!target)return false;

  lastHandled=request.id;
  sendAck(request.id);
  try{localStorage.removeItem(REQUEST_KEY);}catch(e){}

  setTimeout(function(){
    try{window.name='PRISTEEL_MAIN';}catch(e){}
    if(location.href!==target)location.assign(target);
  },80);
  return true;
}

try{
  if('BroadcastChannel' in window){
    channel=new BroadcastChannel(CHANNEL_NAME);
    channel.addEventListener('message',function(event){handleRequest(event.data||{});});
  }
}catch(e){channel=null;}

window.addEventListener('storage',function(event){
  if(event.key===REQUEST_KEY&&event.newValue)handleRequest(parse(event.newValue));
});
window.addEventListener('pagehide',function(){
  clearInterval(readyTimer);
  clearReady();
  try{if(channel)channel.close();}catch(e){}
});
document.addEventListener('visibilitychange',function(){if(!document.hidden)writeReady();});

try{window.name='PRISTEEL_MAIN';}catch(e){}
writeReady();
readyTimer=setInterval(writeReady,1500);

/* Kap edhe një kërkesë që mund të jetë shkruar pak para ngarkimit të modulit. */
setTimeout(function(){
  try{handleRequest(parse(localStorage.getItem(REQUEST_KEY)));}catch(e){}
},0);
})();
