/* PRISTEEL Home Happy v3
 * Compatibility shim only. Visual ownership belongs to Home Command Center v6.
 * No timers, counters, sidebar rewrites or business-data writes.
 */
(function(){
'use strict';
if(window.__pstHomeHappyV1)return;
window.__pstHomeHappyV1=true;
function decorate(){
 var p=document.getElementById('page-workspace-home');
 if(!p||!p.classList.contains('active')||p.style.display==='none')return false;
 var pulse=document.getElementById('pst-home-pulse');if(pulse)pulse.remove();
 p.querySelectorAll('.pst-happy-stats').forEach(function(x){x.remove();});
 try{if(window.PSTHomeCommandCenterV2&&typeof window.PSTHomeCommandCenterV2.decorate==='function')window.PSTHomeCommandCenterV2.decorate();}catch(e){}
 return true;
}
window.PSTHomeHappyV1={decorate:decorate,refresh:decorate,applyNow:decorate};
})();
