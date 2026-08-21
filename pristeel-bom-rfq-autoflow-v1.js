/* PRISTEEL BOM -> RFQ autoflow v1
 * Connects an explicit successful BOM save to the native Project-first RFQ draft.
 * RFQ presentation is owned exclusively by pristeel-project-first-rfq-draft-v1.js unless server semantic drafts exist.
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
function loadSemanticRfqUi(){
  if(window.PSTSemanticRfqDraftsV1||document.querySelector('script[data-pst-semantic-rfq-ui]'))return;
  var s=document.createElement('script');
  s.src='pristeel-semantic-rfq-drafts-v1.js?v=20260821-semantic1';
  s.defer=true;
  s.setAttribute('data-pst-semantic-rfq-ui','1');
  s.onload=function(){var R=window.PSTSemanticRfqDraftsV1;if(R&&typeof R.refresh==='function')R.refresh();};
  document.head.appendChild(s);
}
function loadHistorySync(done){
  var H=window.PSTRfqGmailHistorySyncV2;
  if(H){if(done)done(H);return;}
  var existing=document.querySelector('script[data-pst-rfq-history-native]');
  if(existing){if(done)existing.addEventListener('load',function(){done(window.PSTRfqGmailHistorySyncV2);},{once:true});return;}
  var s=document.createElement('script');
  s.src='pristeel-rfq-gmail-history-sync-v1.js?v=20260815-body1';
  s.defer=true;
  s.setAttribute('data-pst-rfq-history-native','1');
  if(done)s.onload=function(){done(window.PSTRfqGmailHistorySyncV2);};
  document.head.appendChild(s);
}
function loadFinalOfferOutputFix(){
  if(window.PSTFinalOfferOutputFixV1||document.querySelector('script[data-pst-final-offer-output-fix]'))return;
  var s=document.createElement('script');
  s.src='pristeel-final-offer-output-fix-v1.js?v=20260810-1';
  s.defer=true;
  s.setAttribute('data-pst-final-offer-output-fix','1');
  s.onload=function(){var F=window.PSTFinalOfferOutputFixV1;if(F&&typeof F.wrapGenerator==='function')F.wrapGenerator();if(F&&typeof F.patch==='function')F.patch();};
  document.head.appendChild(s);
}
function installGateCss(){
  if(document.getElementById('pst-rfq-gate-visibility-css'))return;
  var s=document.createElement('style');s.id='pst-rfq-gate-visibility-css';
  s.textContent='#pst-pi-body:has(#pst-pf2-rfq-draft) .pf2-gate:has([data-pf2-action="rfq"], [data-prfq-open]){display:none!important}';
  document.head.appendChild(s);
}
function projectId(){var d=window.__pstIntegrityLastData||{};return String(window.__pstCurrentProjectId||window._curProjId||(d.project&&d.project.id)||'');}
function currentDraft(){return document.getElementById('pst-pf2-rfq-draft');}
function installHistoryButton(){
  var draft=currentDraft();if(!draft)return false;
  var actions=draft.querySelector('.prfq-actions');if(!actions)return false;
  if(actions.querySelector('[data-prfq-history-sync-native]'))return true;
  var b=document.createElement('button');
  b.type='button';b.className='prfq-btn';b.setAttribute('data-prfq-history-sync-native','1');b.textContent='Sinkronizo nga Gmail';
  var refresh=actions.querySelector('[data-prfq-refresh]');
  if(refresh)actions.insertBefore(b,refresh);else actions.appendChild(b);
  return true;
}
function nativeButtons(){
  var host=document.getElementById('pst-pi-body');if(!host)return;
  var draft=currentDraft();
  host.querySelectorAll('[data-pf2-action="rfq"],[data-prfq-open]').forEach(function(b){
    var gate=b.closest&&b.closest('.pf2-gate');
    if(draft){
      if(gate)gate.style.display='none';
      else b.style.display='none';
      return;
    }
    if(b.hasAttribute('data-pf2-action')){
      b.removeAttribute('data-pf2-action');
      b.setAttribute('data-prfq-open','1');
      b.textContent='Pergatit / hap RFQ';
    }
  });
  installHistoryButton();
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
window.addEventListener('click',function(e){
  var b=e.target&&e.target.closest?e.target.closest('[data-prfq-open]'):null;
  if(!b)return;
  var draft=currentDraft();if(!draft)return;
  e.preventDefault();e.stopPropagation();
  var gate=b.closest&&b.closest('.pf2-gate');if(gate)gate.style.display='none';
  try{draft.scrollIntoView({behavior:'smooth',block:'start'});}catch(err){draft.scrollIntoView();}
},true);
document.addEventListener('click',function(e){
  var sync=e.target&&e.target.closest?e.target.closest('[data-prfq-history-sync-native]'):null;
  if(sync){
    e.preventDefault();
    sync.disabled=true;sync.textContent='Duke hapur Gmail…';
    loadHistorySync(function(H){
      sync.disabled=false;sync.textContent='Sinkronizo nga Gmail';
      if(H&&typeof H.scan==='function')H.scan();
      else alert('Moduli i sinkronizimit Gmail nuk u ngarkua.');
    });
    return;
  }
  var btn=e.target&&e.target.closest?e.target.closest('[data-pbp-save]'):null;
  if(!btn)return;
  var id=projectId();
  setTimeout(function(){if(btn.disabled)waitForSave(btn,id);},0);
},false);
document.addEventListener('click',function(e){
  var t=e.target&&e.target.closest?e.target.closest('[data-pf2-tab="procurement"]'):null;
  if(t){loadSemanticRfqUi();setTimeout(nativeButtons,0);setTimeout(nativeButtons,120);setTimeout(installHistoryButton,360);}
  var b=e.target&&e.target.closest?e.target.closest('[data-prfq-open]'):null;
  if(b){setTimeout(nativeButtons,180);setTimeout(nativeButtons,360);}
},true);
document.addEventListener('pst:modules-ready',function(){loadBomClarity();loadRfqNavigation();loadFinalOfferOutputFix();loadSemanticRfqUi();installGateCss();setTimeout(nativeButtons,0);setTimeout(installHistoryButton,240);},{once:true});
installGateCss();
loadBomClarity();
loadRfqNavigation();
loadFinalOfferOutputFix();
loadSemanticRfqUi();
[0,120,400].forEach(function(ms){setTimeout(installHistoryButton,ms);});
window.PSTBomRfqAutoflowV1={nativeButtons:nativeButtons,installHistoryButton:installHistoryButton,loadBomClarity:loadBomClarity,loadRfqNavigation:loadRfqNavigation,loadFinalOfferOutputFix:loadFinalOfferOutputFix,loadSemanticRfqUi:loadSemanticRfqUi};
})();
