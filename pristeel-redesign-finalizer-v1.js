/* PRISTEEL redesign finalizer v1
 * Preview revision: 20260807-2.
 * Re-applies the read-only redesign after legacy workspace renders.
 * Bounded timeouts only. No polling, observers, writes, auth or project-open overrides.
 */
(function(){
'use strict';
if(window.__pstRedesignFinalizerV1)return;
window.__pstRedesignFinalizerV1=true;

function apply(){
  try{
    var C=window.PSTBusinessCommandCenterV1;
    if(C&&typeof C.open==='function')window.openCmdK=C.open;
    if(C&&typeof C.decorateHome==='function')C.decorateHome();
  }catch(e){console.warn('PRISTEEL finalizer search:',e);}
  try{
    var D=window.PSTDashboardTaskCardsV1;
    if(D&&typeof D.decorate==='function')D.decorate();
  }catch(e){console.warn('PRISTEEL finalizer cards:',e);}
  try{
    var H=window.PSTHomeCommandCenterV2;
    if(H&&typeof H.decorate==='function')H.decorate(false);
  }catch(e){console.warn('PRISTEEL finalizer home:',e);}
  try{
    var G=window.PSTBusinessCommandCenterDeepGmail;
    if(G&&document.getElementById('pst-bcc')&&typeof G.decorate==='function')G.decorate();
  }catch(e){console.warn('PRISTEEL finalizer Gmail search:',e);}
  try{
    var P=window.PSTProjectCommandViewV1;
    var projectPage=document.getElementById('page-workspace-project');
    if(P&&projectPage&&projectPage.style.display!=='none'&&typeof P.load==='function')P.load(window.__pstCurrentProjectId||window._curProjId||'',false);
  }catch(e){console.warn('PRISTEEL finalizer project:',e);}
}
function schedule(){[0,80,220,500,1000,1800,3200,5500,8500].forEach(function(ms){setTimeout(apply,ms);});}

document.addEventListener('pst:modules-ready',schedule,{once:true});
document.addEventListener('DOMContentLoaded',schedule,{once:true});
window.addEventListener('pageshow',schedule,{once:true});
document.addEventListener('click',function(event){
  var t=event.target&&event.target.closest?event.target.closest('.pst-ws-navbtn,#pst-ws-home-refresh,[onclick*="pstWorkspaceGo"],[data-pm-open],[data-release-filter]'):null;
  if(t)[0,80,250,700].forEach(function(ms){setTimeout(apply,ms);});
},true);
if(document.readyState!=='loading')schedule();
window.PSTRedesignFinalizerV1={apply:apply,schedule:schedule};
})();
