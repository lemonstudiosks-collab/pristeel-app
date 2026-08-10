/* PRISTEEL BOM -> RFQ autoflow v1
 * After an explicit successful BOM save, continue directly to the native Project-first RFQ draft.
 * No email is sent and no RFQ is logged as sent here.
 */
(function(){
'use strict';
if(window.__pstBomRfqAutoflowV1)return;
window.__pstBomRfqAutoflowV1=true;

function H(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function loadBuyerRequestContext(){
  if(window.PSTRfqBuyerRequestContextV1||document.querySelector('script[data-pst-rfq-buyer-request]'))return;
  var s=document.createElement('script');
  s.src='pristeel-rfq-buyer-request-context-v1.js?v=20260810-3';
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
  s.src='pristeel-rfq-project-documentation-v1.js?v=20260810-4';
  s.defer=true;
  s.setAttribute('data-pst-rfq-project-docs','1');
  s.onload=function(){
    var D=window.PSTRfqProjectDocumentationV1;
    if(D&&typeof D.inject==='function'){
      [0,120,350,800,1600,3000].forEach(function(ms){setTimeout(function(){D.inject();D.patchRows();},ms);});
    }
  };
  document.head.appendChild(s);
}
function loadRfqLanguageTable(){
  if(window.PSTRfqLanguageTableV1||document.querySelector('script[data-pst-rfq-language-table]'))return;
  var s=document.createElement('script');
  s.src='pristeel-rfq-language-table-v1.js?v=20260810-2';
  s.defer=true;
  s.setAttribute('data-pst-rfq-language-table','1');
  s.onload=function(){var F=window.PSTRfqLanguageTableV1;if(F&&typeof F.rewrite==='function')setTimeout(function(){F.rewrite(false);},0);};
  document.head.appendChild(s);
}
function ensureDocField(){
  var box=document.getElementById('pst-pf2-rfq-draft');if(!box)return false;
  if(box.querySelector('[data-prfq-doc-link]'))return true;
  var list=box.querySelector('.prfq-list'),context=box.querySelector('.prfq-context');if(!list&&!context)return false;
  if(!document.getElementById('pst-rfq-doc-fallback-css')){
    var css=document.createElement('style');css.id='pst-rfq-doc-fallback-css';css.textContent='.prfq-docs{padding:10px 14px;border-bottom:1px solid #e8eef0;background:#fbfdfd}.prfq-docs label{display:block;font-size:8px;font-weight:780;color:#60727a;margin-bottom:5px}.prfq-docrow{display:flex;gap:7px;align-items:center}.prfq-docrow input{flex:1;min-width:0;height:34px;border:1px solid #d8e5e9;border-radius:8px;padding:0 9px;font:8.5px/1.4 Inter,sans-serif;color:#52646c;background:#fff}.prfq-docrow a{height:34px;display:inline-flex;align-items:center;padding:0 10px;border:1px solid #d4e2e7;border-radius:8px;background:#fff;color:#3f7f98;font-size:8px;font-weight:750;text-decoration:none;white-space:nowrap}.prfq-docnote{font-size:7.5px;color:#829096;margin-top:5px;line-height:1.45}.prfq-docnote b{color:#596d75}';document.head.appendChild(css);
  }
  var F=window.PSTRfqDraftFinalizerV1,link=F&&typeof F.safeBestLink==='function'?String(F.safeBestLink()||''):'';
  var div=document.createElement('div');div.className='prfq-docs';
  div.innerHTML='<label>Dokumentacioni i projektit · link për shkarkim</label><div class="prfq-docrow"><input type="url" data-prfq-doc-link placeholder="Ngjit linkun e PDF / ZIP / dosjes së projektit" value="'+H(link)+'"><a data-prfq-doc-open target="_blank" rel="noopener" href="'+H(link||'#')+'">Hap linkun</a></div><div class="prfq-docnote"><b>Dokumentacioni është burimi teknik:</b> linku futet vetëm një herë në draftin final. Kontrollo që furnitori ka qasje para dërgimit.</div>';
  if(list)box.insertBefore(div,list);else context.insertAdjacentElement('afterend',div);
  var inp=div.querySelector('[data-prfq-doc-link]'),open=div.querySelector('[data-prfq-doc-open]');
  inp.addEventListener('input',function(e){if(e&&e.isTrusted)inp.setAttribute('data-prfq-doc-user-edited','1');open.href=inp.value.trim()||'#';var X=window.PSTRfqDraftFinalizerV1;if(X&&typeof X.finalize==='function')setTimeout(function(){X.finalize();},0);});
  return true;
}
function refreshFinalDraft(){
  [0,120,350,800,1600,3000].forEach(function(ms){setTimeout(function(){
    ensureDocField();
    var D=window.PSTRfqProjectDocumentationV1;if(D&&typeof D.inject==='function'){D.inject();D.patchRows();}
    var F=window.PSTRfqDraftFinalizerV1;if(F&&typeof F.finalize==='function')F.finalize();
  },ms);});
}
function loadRfqDraftFinalizer(){
  if(window.PSTRfqDraftFinalizerV1||document.querySelector('script[data-pst-rfq-finalizer]'))return;
  var s=document.createElement('script');
  s.src='pristeel-rfq-draft-finalizer-v1.js?v=20260810-5';
  s.defer=true;
  s.setAttribute('data-pst-rfq-finalizer','1');
  s.onload=refreshFinalDraft;
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
        if(R&&typeof R.open==='function'){
          Promise.resolve(R.open(id)).then(function(){setTimeout(nativeButtons,0);setTimeout(nativeButtons,120);refreshFinalDraft();});
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
  var t=e.target&&e.target.closest?e.target.closest('[data-pf2-tab="procurement"],[data-prfq-open],#pst-pf2-rfq-draft [data-prfq-refresh]'):null;
  if(t){setTimeout(nativeButtons,0);setTimeout(nativeButtons,120);refreshFinalDraft();}
},true);
document.addEventListener('pst:modules-ready',function(){loadBuyerRequestContext();loadBomClarity();loadProjectDocumentation();loadRfqLanguageTable();loadRfqDraftFinalizer();loadRfqNavigation();setTimeout(nativeButtons,0);refreshFinalDraft();},{once:true});
loadBuyerRequestContext();
loadBomClarity();
loadProjectDocumentation();
loadRfqLanguageTable();
loadRfqDraftFinalizer();
loadRfqNavigation();
refreshFinalDraft();
window.PSTBomRfqAutoflowV1={nativeButtons:nativeButtons,ensureDocField:ensureDocField,refreshFinalDraft:refreshFinalDraft,loadBuyerRequestContext:loadBuyerRequestContext,loadBomClarity:loadBomClarity,loadProjectDocumentation:loadProjectDocumentation,loadRfqLanguageTable:loadRfqLanguageTable,loadRfqDraftFinalizer:loadRfqDraftFinalizer,loadRfqNavigation:loadRfqNavigation};
})();
