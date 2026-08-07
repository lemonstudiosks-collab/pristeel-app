/* PRISTEEL Finance Stability v2
 * Keeps Finance usable if a read request stalls. Does not retry or alter write operations.
 */
(function(){
'use strict';
if(window.__pstFinanceStabilityV2)return;
window.__pstFinanceStabilityV2=true;
var WAIT=6000;
function loadingText(el){return el&&/duke ngarkuar/i.test(String(el.textContent||''));}
function guard(id,label){
  setTimeout(function(){
    var el=document.getElementById(id);
    if(!loadingText(el))return;
    el.innerHTML='<div style="color:var(--text3);font-size:12px;padding:10px 0">'+label+' nuk u ngarkua brenda afatit. Mund të vazhdosh në modul tjetër dhe të provosh përsëri.</div>';
  },WAIT);
}
function install(){
  if(typeof window.finSwitchTab!=='function'||window.finSwitchTab.__pstStabilityV2)return;
  var original=window.finSwitchTab;
  var wrapped=function(tab){
    var out=original.apply(this,arguments);
    if(tab==='inv')guard('fin-inv-list','Faturat');
    if(tab==='supp')guard('ivin-list','Faturat e furnitorëve');
    if(tab==='exp')guard('fin-exp-list','Shpenzimet');
    if(tab==='atk')guard('fin-atk-list','Tatimet');
    if(tab==='aging')guard('fin-aging-list','Afatet e pagesave');
    return out;
  };
  wrapped.__pstStabilityV2=true;
  window.finSwitchTab=wrapped;
}
install();
document.addEventListener('pst:modules-ready',install,{once:true});
window.PSTFinanceStabilityV2={install:install,guard:guard};
})();