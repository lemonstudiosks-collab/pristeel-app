/* PRISTEEL Home Ask functional-owner bridge v2
 * Keeps the single visible Native UI v4 Home while reconnecting the moved Ask shell
 * to the already-bound Project Control Home renderer, even when that owner arrives late.
 * No business writes and no duplicate AI/request path.
 */
(function(){
'use strict';
if(window.__pstHomeAskFunctionalOwnerV2)return;
window.__pstHomeAskFunctionalOwnerV2=true;
window.__pstHomeAskFunctionalOwnerV1=true;
var observer=null,stopTimer=null;
function installOwnerQueryBridge(owner){
  if(!owner)return false;
  try{
    if(window.PSTUiOwnershipCleanupV1&&typeof window.PSTUiOwnershipCleanupV1.installAskOwnerQueryBridge==='function'){
      if(window.PSTUiOwnershipCleanupV1.installAskOwnerQueryBridge())return true;
    }
  }catch(e){}
  if(owner.__pstAskQueryBridge)return true;
  var original=owner.querySelector.bind(owner);
  owner.__pstAskOriginalQuerySelector=owner.__pstAskOriginalQuerySelector||original;
  owner.querySelector=function(selector){
    if(selector==='.pst-live-result'||selector==='.pst-live-send'||selector==='.pst-live-input'||selector==='.pst-live-command'){
      var live=document.querySelector('#pst-native-home-v4 .pst-live-command-shell'),found=live&&live.querySelector(selector);
      if(found)return found;
    }
    return original(selector);
  };
  owner.__pstAskQueryBridge=true;
  return true;
}
function apply(){
  var home=document.getElementById('pst-native-home-v4');
  var slot=home&&home.querySelector('#pn-ask');
  var owner=document.getElementById('pst-project-control-home-v2');
  if(!home||!slot||!owner)return false;
  var shell=null;
  try{
    var original=owner.__pstAskOriginalQuerySelector;
    if(typeof original==='function')shell=original('.pst-live-command-shell');
    if(!shell)shell=Array.prototype.slice.call(owner.children||[]).find(function(x){return x&&x.classList&&x.classList.contains('pst-live-command-shell');})||null;
  }catch(e){}
  if(!shell) shell=slot.querySelector('.pst-live-command-shell');
  if(!shell)return false;
  /* The form must already belong to the canonical Project Control Home owner. */
  if(owner.dataset.bound!=='1'&&shell.parentNode===owner)return false;
  if(shell.parentNode!==slot){slot.innerHTML='';slot.appendChild(shell);}
  shell.style.display='block';shell.style.visibility='visible';
  installOwnerQueryBridge(owner);
  try{if(window.PSTUiOwnershipCleanupV1&&typeof window.PSTUiOwnershipCleanupV1.installAskModalChrome==='function')window.PSTUiOwnershipCleanupV1.installAskModalChrome();}catch(e){}
  try{if(window.PSTProjectControlHomeV1&&typeof window.PSTProjectControlHomeV1.render==='function')window.PSTProjectControlHomeV1.render();}catch(e){}
  if(observer){observer.disconnect();observer=null;}
  if(stopTimer){clearTimeout(stopTimer);stopTimer=null;}
  return true;
}
function watchUntilReady(){
  if(apply())return true;
  if(observer||!window.MutationObserver)return false;
  var target=document.getElementById('page-workspace-home')||document.body||document.documentElement;
  if(!target)return false;
  observer=new MutationObserver(function(){apply();});
  observer.observe(target,{childList:true,subtree:true});
  stopTimer=setTimeout(function(){if(observer){observer.disconnect();observer=null;}stopTimer=null;},120000);
  return false;
}
function schedule(){[0,80,220,600,1400,3200,7000,15000,30000,60000,90000].forEach(function(ms){setTimeout(watchUntilReady,ms);});}
function loadOpportunityDraftState(){
  if(window.PSTOpportunityDraftStateV1||document.querySelector('script[data-pst-opportunity-draft-state]'))return;
  var s=document.createElement('script');
  s.src='pristeel-opportunity-draft-state-v1.js?v=20260903-draftstate1';
  s.defer=true;s.setAttribute('data-pst-opportunity-draft-state','1');
  document.head.appendChild(s);
}
document.addEventListener('pst:native-home-ready',schedule);
document.addEventListener('pst:modules-ready',schedule,{once:true});
window.addEventListener('pageshow',schedule);
document.addEventListener('click',function(e){var n=e.target&&e.target.closest?e.target.closest('.pst-ws-navbtn,[data-key="home"]'):null;if(n)setTimeout(watchUntilReady,120);},true);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){schedule();loadOpportunityDraftState();},{once:true});else{schedule();loadOpportunityDraftState();}
window.PSTHomeAskFunctionalOwnerV1=window.PSTHomeAskFunctionalOwnerV2={apply:apply,watch:watchUntilReady};
})();
