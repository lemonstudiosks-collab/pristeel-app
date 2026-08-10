/* PRISTEEL BOM -> RFQ autoflow v1
 * After an explicit successful BOM save, continue directly to the native Project-first RFQ draft.
 * No email is sent and no RFQ is logged as sent here.
 */
(function(){
'use strict';
if(window.__pstBomRfqAutoflowV1)return;
window.__pstBomRfqAutoflowV1=true;

function loadBuyerRequestContext(){
  if(window.PSTRfqBuyerRequestContextV1||document.querySelector('script[data-pst-rfq-buyer-request]'))return;
  var s=document.createElement('script');
  s.src='pristeel-rfq-buyer-request-context-v1.js?v=20260810-2';
  s.defer=true;
  s.setAttribute('data-pst-rfq-buyer-request','1');
  s.onload=function(){
    var B=window.PSTRfqBuyerRequestContextV1;
    if(B&&typeof B.apply==='function'){
      [0,160,500,1200].forEach(function(ms){setTimeout(function(){B.apply();},ms);});
    }
  };
  document.head.appendChild(s);
}
function loadBomClarity(){
  if(window.PSTProjectFirstBomClarityV1||document.querySelector('script[data-pst-bom-clarity]'))return;
  var s=document.createElement('script');
  s.src='pristeel-project-first-bom-clarity-v1.js?v=20260810-2';
  s.defer=true;
  s.setAttribute('data-pst-bom-clarity','1');
  s.onload=function(){var B=window.PSTProjectFirstBomClarityV1;if(B&&typeof B.apply==='function')B.apply();};
  document.head.appendChild(s);
}
function loadProjectDocumentation(){
  if(window.PSTRfqProjectDocumentationV1||document.querySelector('script[data-pst-rfq-project-docs]'))return;
  var s=document.createElement('script');
  s.src='pristeel-rfq-project-documentation-v1.js?v=20260810-1';
  s.defer=true;
  s.setAttribute('data-pst-rfq-project-docs','1');
  s.onload=function(){
    var D=window.PSTRfqProjectDocumentationV1;
    if(D&&typeof D.inject==='function'){
      [0,120,350,800].forEach(function(ms){setTimeout(function(){D.inject();D.patchRows();},ms);});
    }
  };
  document.head.appendChild(s);
}
function loadRfqLanguageTable(){
  if(window.PSTRfqLanguageTableV1||document.querySelector('script[data-pst-rfq-language-table]'))return;
  var s=document.createElement('script');
  s.src='pristeel-rfq-language-table-v1.js?v=20260810-1';
  s.defer=true;
  s.setAttribute('data-pst-rfq-language-table','1');
  s.onload=function(){var F=window.PSTRfqLanguageTableV1;if(F&&typeof F.rewrite==='function')setTimeout(function(){F.rewrite(false);},0);};
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
        if(R&&typeof R.open==='function'){
          Promise.resolve(R.open(id)).then(function(){setTimeout(nativeButtons,0);setTimeout(nativeButtons,120);});
        }
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
document.addEventListener('pst:modules-ready',function(){loadBuyerRequestContext();loadBomClarity();loadProjectDocumentation();loadRfqLanguageTable();setTimeout(nativeButtons,0);},{once:true});
loadBuyerRequestContext();
loadBomClarity();
loadProjectDocumentation();
loadRfqLanguageTable();
window.PSTBomRfqAutoflowV1={nativeButtons:nativeButtons,loadBuyerRequestContext:loadBuyerRequestContext,loadBomClarity:loadBomClarity,loadProjectDocumentation:loadProjectDocumentation,loadRfqLanguageTable:loadRfqLanguageTable};
})();
