/* PRISTEEL outreach follow-up render lock v1
 * Browser-only guard for the async Workspace Inbox race.
 * It performs a few bounded checks after Inbox navigation and asks the existing
 * follow-up module to re-render only if the legacy "Lidhe" rows won the race.
 * No polling loop, no MutationObserver, no Gmail reader and no data writes here.
 */
(function(){
'use strict';
if(window.__pstOutreachFollowupRenderLockV1)return;
window.__pstOutreachFollowupRenderLockV1=true;

var timers=[];
var DELAYS=[700,1800,4000,7500];

function activeInbox(){
  var p=document.getElementById('page-workspace-inbox');
  return !!(p&&p.classList.contains('active')&&p.style.display!=='none');
}
function legacyWon(){
  var root=document.getElementById('pst-ws-inbox-emails');
  if(!root)return false;
  if(root.querySelector('.pst-ofu-toolbar'))return false;
  var buttons=root.querySelectorAll('.pst-ws-rowaction');
  for(var i=0;i<buttons.length;i++)if(String(buttons[i].textContent||'').trim()==='Lidhe')return true;
  return false;
}
function ensure(){
  if(!activeInbox()||!legacyWon())return;
  var F=window.PSTOutreachFollowupV1;
  if(!F||typeof F.refresh!=='function')return;
  var s=F.state;
  if(s&&s.loading)return;
  F.refresh();
}
function clear(){
  timers.forEach(function(t){clearTimeout(t);});
  timers=[];
}
function arm(){
  clear();
  DELAYS.forEach(function(ms){timers.push(setTimeout(ensure,ms));});
}

var original=window.pstWorkspaceGo;
if(typeof original==='function'&&!original.__pstOutreachFollowupRenderLockV1){
  var wrapped=function(key){var out=original.apply(this,arguments);if(String(key)==='inbox')arm();return out;};
  wrapped.__pstOutreachFollowupRenderLockV1=true;
  window.pstWorkspaceGo=wrapped;
}

document.addEventListener('pst:modules-ready',function(){if(activeInbox())arm();},{once:true});
setTimeout(function(){if(activeInbox())arm();},300);
window.PSTOutreachFollowupRenderLockV1={arm:arm,ensure:ensure,_test:{legacyWon:legacyWon,delays:DELAYS.slice()}};
})();