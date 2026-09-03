/* PRISTEEL Home Ask functional-owner bridge v1
 * Ensures Native UI v4 adopts the live Ask shell owned and bound by Project Control Home.
 * Presentation-only bridge: no network calls and no business writes.
 */
(function(){
'use strict';
if(window.__pstHomeAskFunctionalOwnerV1)return;
window.__pstHomeAskFunctionalOwnerV1=true;
function apply(){
  var home=document.getElementById('pst-native-home-v4');
  var slot=home&&home.querySelector('#pn-ask');
  var owner=document.getElementById('pst-project-control-home-v2');
  if(!home||!slot||!owner)return false;
  var shell=null;
  try{
    var original=owner.__pstAskOriginalQuerySelector;
    if(typeof original==='function')shell=original('.pst-live-command-shell');
    if(!shell) shell=Array.prototype.slice.call(owner.children||[]).find(function(x){return x&&x.classList&&x.classList.contains('pst-live-command-shell');})||null;
  }catch(e){}
  if(!shell){
    var current=slot.querySelector('.pst-live-command-shell');
    if(current&&owner.dataset.bound==='1')shell=current;
  }
  if(!shell)return false;
  if(shell.parentNode!==slot){slot.innerHTML='';slot.appendChild(shell);}
  shell.style.display='block';shell.style.visibility='visible';
  try{if(window.PSTUiOwnershipCleanupV1&&typeof window.PSTUiOwnershipCleanupV1.installAskModalChrome==='function')window.PSTUiOwnershipCleanupV1.installAskModalChrome();}catch(e){}
  return true;
}
function schedule(){[0,80,220,600,1400,3200,7000].forEach(function(ms){setTimeout(apply,ms);});}
document.addEventListener('pst:project-control-home-rendered',schedule);
document.addEventListener('pst:native-home-ready',schedule);
document.addEventListener('pst:modules-ready',schedule,{once:true});
window.addEventListener('pageshow',schedule);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
window.PSTHomeAskFunctionalOwnerV1={apply:apply};
})();