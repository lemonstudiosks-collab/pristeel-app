/* PRISTEEL BOM -> RFQ autoflow v1
 * Connects an explicit successful BOM save to the native Project-first RFQ draft.
 * RFQ presentation is owned exclusively by pristeel-project-first-rfq-draft-v1.js.
 * No email is sent and no RFQ is logged as sent here.
 */
(function(){
'use strict';
if(window.__pstBomRfqAutoflowV1)return;
window.__pstBomRfqAutoflowV1=true;

function loadBomClarity(){
  if(window.PSTProjectFirstBomClarityV1||document.querySelector('script[data-pst-bom-clarity]'))return;
  var s=document.createElement('script');
  s.src='pristeel-project-first-bom-clarity-v1.js?v=20260810-2';
  s.defer=true;
  s.setAttribute('data-pst-bom-clarity','1');
  s.onload=function(){var B=window.PSTProjectFirstBomClarityV1;if(B&&typeof B.apply==='function')B.apply();};
  document.head.appendChild(s);
}
function loadRfqNavigation(){
  if(window.PSTProjectFirstRfqNavigationV1||document.querySelector('script[data-pst-rfq-navigation]'))return;
  var s=document.createElement('script');
  s.src='pristeel-project-first-rfq-navigation-v1.js?v=20260810-1';
  s.defer=true;
  s.setAttribute('data-pst-rfq-navigation','1');
  s.onload=function(){var N=window.PSTProjectFirstRfqNavigationV1;if(N&&typeof N.install==='function')N.install();};
  document.head.appendChild(s);
}
function projectId(){var d=window.__pstIntegrityLastData||{};return String(window.__pstCurrentProjectId||window._curProjId||(d.project&&d.project.id)||'');}
function nativeButtons(){
  var host=document.getElementById('pst-pi-body');if(!host)return;
  host.querySelectorAll('[data-pf2-action="rfq"]').forEach(function(b){
    b.removeAttribute('data-pf2-action');
    b.setAttribute('data-prfq-open','1');
    b.textContent='Pergatit / hap RFQ';
  });
}
function waitForSave(btn,id){
  var tries=0,successSeen=false;
  function tick(){
    var txt=String(btn&&btn.textContent||'');
    if(/U ruajt|✓\s*U ruajt/i.test(txt))successSeen=true;
    if(successSeen){
      var d=window.__pstIntegrityLastData||{},savedBom=Array.isArray(d.bom)?d.bom:[];
      if((!btn.isConnected&&savedBom.length)||tries>80){
        var R=window.PSTProjectFirstRfqDraftV1;
        if(R&&typeof R.open==='function')Promise.resolve(R.open(id)).then(function(){setTimeout(nativeButtons,0);setTimeout(nativeButtons,120);});
        return;
      }
    }
    if(!successSeen&&btn&&!btn.disabled&&/Ruaj BOM/i.test(txt))return;
    tries++;
    if(tries<160)setTimeout(tick,100);
  }
  setTimeout(tick,80);
}
document.addEventListener('click',function(e){
  var btn=e.target&&e.target.closest?e.target.closest('[data-pbp-save]'):null;
  if(!btn)return;
  var id=projectId();
  setTimeout(function(){if(btn.disabled)waitForSave(btn,id);},0);
},false);
document.addEventListener('click',function(e){
  var t=e.target&&e.target.closest?e.target.closest('[data-pf2-tab="procurement"]'):null;
  if(t){setTimeout(nativeButtons,0);setTimeout(nativeButtons,120);}
},true);
document.addEventListener('pst:modules-ready',function(){loadBomClarity();loadRfqNavigation();setTimeout(nativeButtons,0);},{once:true});
loadBomClarity();
loadRfqNavigation();
window.PSTBomRfqAutoflowV1={nativeButtons:nativeButtons,loadBomClarity:loadBomClarity,loadRfqNavigation:loadRfqNavigation};
})();
