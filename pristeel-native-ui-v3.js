/* PRISTEEL Native UI v3 entry — soft UI + fast routing
 * Early presentation owner. Keeps business engines and approval gates authoritative.
 * Removes repeated whole-document cleanup passes and routes the primary sidebar directly.
 */
(function(){
'use strict';
if(window.__pstNativeUiV3Entry)return;
window.__pstNativeUiV3Entry=true;

var NAV={home:'Home',tenders:'Opportunities',projects:'Projects',contacts:'Partners',finance:'Finance',apps:'System'};
var TEXT={
  'Mundësitë':'Opportunities','Projektet':'Projects','Partnerët':'Partners','Financat':'Finance','Sistemi':'System',
  'PYET PPPP':'ASK PPPP','Pyet PPPP':'Ask PPPP','Pyet platformën për çdo projekt':'Ask the platform about any project',
  'PPPP lexon gjendjen live dhe të kthen përgjigje nga të dhënat e platformës.':'PPPP reads live platform data and answers from the current project state.',
  'PPPP ruajti punë të pambyllur':'PPPP found unfinished work','Rikthe':'Restore','Mbaje për më vonë':'Keep for later'
};

function pendingRecovery(){
  try{
    if(typeof window.loadOpQueue==='function'){
      var q=window.loadOpQueue()||[];
      return Array.isArray(q)?q.filter(function(op){return op&&!op.done;}):[];
    }
  }catch(e){}
  return [];
}

function showRecovery(count){
  count=Number(count||0);if(!count)return;
  var old=document.getElementById('pst-ui-recovery-clean');
  if(old){var n=old.querySelector('[data-recovery-count]');if(n)n.textContent=String(count);return;}
  if(!document.body)return;
  var box=document.createElement('div');box.id='pst-ui-recovery-clean';box.setAttribute('role','status');
  box.innerHTML='<div><b>PPPP found unfinished work</b><span><strong data-recovery-count>'+count+'</strong> action'+(count===1?'':'s')+' from your previous session '+(count===1?'is':'are')+' available.</span></div><div class="pst-rec-actions"><button type="button" data-rec="restore">Restore</button><button type="button" data-rec="later">Keep for later</button></div>';
  box.addEventListener('click',function(e){
    var b=e.target.closest('[data-rec]');if(!b)return;
    if(b.dataset.rec==='later'){box.remove();return;}
    var original=window.__pstOriginalRecoverUnsavedWork;
    box.remove();
    if(typeof original==='function')Promise.resolve(original()).catch(function(){});
  });
  document.body.appendChild(box);
}

function installRecoveryGate(){
  var fn=window.recoverUnsavedWork;
  if(typeof fn!=='function'||fn.__pstUiRecoveryGate)return false;
  if(!window.__pstOriginalRecoverUnsavedWork)window.__pstOriginalRecoverUnsavedWork=fn;
  var gated=function(){
    var p=pendingRecovery();
    if(p.length){showRecovery(p.length);return Promise.resolve({ok:false,pending:p.length,deferred:true});}
    return fn.apply(this,arguments);
  };
  gated.__pstUiRecoveryGate=true;window.recoverUnsavedWork=gated;return true;
}

function normalizeNav(){
  Object.keys(NAV).forEach(function(k){
    var b=document.querySelector('#pst-ws-canonical-nav .pst-ws-navbtn[data-key="'+k+'"]');
    if(!b)return;var s=b.querySelector('.pst-nav-label')||b.querySelector('span');if(s)s.textContent=NAV[k];
  });
}

function markNav(key){
  var aliases={opportunities:'tenders',partners:'contacts',system:'apps'};key=aliases[key]||key;
  document.querySelectorAll('#pst-ws-canonical-nav .pst-ws-navbtn[data-key]').forEach(function(b){b.classList.toggle('active',b.dataset.key===key);});
}

function directRoute(key){
  key=String(key||'').toLowerCase();
  try{
    if(key==='home'){
      if(window.PSTHomeCanonicalV1&&typeof window.PSTHomeCanonicalV1.activateHome==='function')window.PSTHomeCanonicalV1.activateHome();
      else if(typeof window.pstWorkspaceGo==='function')window.pstWorkspaceGo('home');
      markNav('home');
      if(window.PSTNativeUiV3&&typeof window.PSTNativeUiV3.refreshHome==='function')window.PSTNativeUiV3.refreshHome(false);
      return true;
    }
    if(key==='tenders'||key==='opportunities'){
      if(window.PSTProjectCentricWorkflowV1&&typeof window.PSTProjectCentricWorkflowV1.openOpportunities==='function')window.PSTProjectCentricWorkflowV1.openOpportunities(false);
      else if(typeof window.pstWsKekTenders==='function')window.pstWsKekTenders();
      else if(typeof window.pstWorkspaceGo==='function')window.pstWorkspaceGo('tenders');
      markNav('tenders');return true;
    }
    if(key==='projects'){
      if(typeof window.pstProjectsModernOpen==='function')window.pstProjectsModernOpen();
      else if(typeof window.pstWorkspaceGo==='function')window.pstWorkspaceGo('projects');
      markNav('projects');return true;
    }
    if(key==='contacts'||key==='partners'){
      if(window.PSTContactMasterV1&&typeof window.PSTContactMasterV1.open==='function')window.PSTContactMasterV1.open();
      else if(typeof window.pstWorkspaceGo==='function')window.pstWorkspaceGo('contacts');
      markNav('contacts');return true;
    }
    if(key==='finance'){
      if(typeof window.pstWorkspaceGo==='function')window.pstWorkspaceGo('finance');
      else if(typeof window.showPage==='function')window.showPage('finance');
      markNav('finance');return true;
    }
    if(key==='apps'||key==='system'){
      if(typeof window.pstWorkspaceGo==='function')window.pstWorkspaceGo('apps');
      else if(typeof window.openModuleHub==='function')window.openModuleHub();
      markNav('apps');return true;
    }
  }catch(e){console.warn('PPPP direct route fallback',e);}
  return false;
}

function translateAsk(){
  var shell=document.querySelector('#pst-native-home-v3 .pst-live-command-shell')||document.querySelector('#page-workspace-home .pst-live-command-shell');
  if(!shell)return;
  try{
    var w=document.createTreeWalker(shell,NodeFilter.SHOW_TEXT),n;
    while((n=w.nextNode())){var raw=n.nodeValue,t=String(raw||'').trim();if(TEXT[t])n.nodeValue=raw.replace(t,TEXT[t]);}
    shell.querySelectorAll('input,textarea').forEach(function(el){var ph=el.getAttribute('placeholder')||'';if(/STACON|Çfarë po ndodh|Cfare po ndodh/i.test(ph))el.setAttribute('placeholder','e.g. What is happening with STACON?');});
  }catch(e){}
}

function suppressLegacyRecoveryOnce(){
  var nodes=document.querySelectorAll('body>div,#page-workspace-home>div,[role="alert"],[role="status"]');
  nodes.forEach(function(el){
    if(el.id==='pst-ui-recovery-clean'||el.closest&&el.closest('#pst-ui-recovery-clean'))return;
    var t=(el.textContent||'').trim();
    if(t&&t.length<500&&(/PPPP ruajti punë të pambyllur/i.test(t)||/Ka \d+ veprime? nga sesioni i mëparshëm/i.test(t)))el.style.setProperty('display','none','important');
  });
}

function installOwnershipCss(){
  var id='pst-ui-ownership-cleanup-css',s=document.getElementById(id);if(s)return;
  s=document.createElement('style');s.id=id;s.textContent=`
:root{--pst-soft-ink:#365565;--pst-soft-blue:#7899AA;--pst-soft-sage:#87A191;--pst-soft-amber:#C5A066;--pst-soft-rose:#B98585;--pst-soft-bg:#F5F7F7;--pst-soft-border:#DDE5E8}
#pst-ui-recovery-clean{position:fixed;z-index:2147483000;top:16px;left:50%;transform:translateX(-50%);width:min(720px,calc(100vw - 32px));display:flex;align-items:center;justify-content:space-between;gap:20px;padding:13px 15px;background:#fff;border:1px solid var(--pst-soft-border);border-left:2px solid var(--pst-soft-amber);border-radius:10px;box-shadow:0 10px 26px rgba(34,55,65,.10);font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#26343C}
#pst-ui-recovery-clean>div:first-child{display:grid;gap:3px}#pst-ui-recovery-clean b{font-size:13px}#pst-ui-recovery-clean span{font-size:11px;color:#70808A;line-height:1.45}.pst-rec-actions{display:flex;gap:8px;flex-shrink:0}.pst-rec-actions button{min-height:34px;padding:0 12px;border-radius:7px;border:1px solid #D3DDE1;background:#fff;color:#52646E;font-weight:700;cursor:pointer}.pst-rec-actions button[data-rec="restore"]{background:#F7FAFB;border-color:#BFD0D8;color:#365565}
#pst-native-home-v3 #pn-ask .pst-live-command-shell{background:#fff!important;border:1px solid var(--pst-soft-border)!important;border-top:2px solid var(--pst-soft-blue)!important;border-radius:9px!important;box-shadow:none!important;padding:13px 15px!important;color:#26343C!important;min-height:0!important}
#pst-native-home-v3 #pn-ask .pst-live-command-shell *{text-shadow:none!important}#pst-native-home-v3 #pn-ask .pst-live-command-shell h1,#pst-native-home-v3 #pn-ask .pst-live-command-shell h2,#pst-native-home-v3 #pn-ask .pst-live-command-shell h3,#pst-native-home-v3 #pn-ask .pst-live-command-shell b,#pst-native-home-v3 #pn-ask .pst-live-command-shell strong{color:#26343C!important}#pst-native-home-v3 #pn-ask .pst-live-command-shell p,#pst-native-home-v3 #pn-ask .pst-live-command-shell small,#pst-native-home-v3 #pn-ask .pst-live-command-shell span{color:#70808A!important}
#pst-native-home-v3 #pn-ask .pst-live-command-shell form{margin-top:9px!important;background:#FAFBFB!important;border:1px solid #E2E8EA!important;border-radius:8px!important;padding:6px!important}#pst-native-home-v3 #pn-ask .pst-live-command-shell input,#pst-native-home-v3 #pn-ask .pst-live-command-shell textarea{background:transparent!important;color:#26343C!important;border:0!important;box-shadow:none!important}#pst-native-home-v3 #pn-ask .pst-live-command-shell button{background:#F4F7F8!important;border:1px solid #BFD0D8!important;color:#365565!important;border-radius:7px!important;box-shadow:none!important}
@media(max-width:720px){#pst-ui-recovery-clean{align-items:stretch;flex-direction:column}.pst-rec-actions{justify-content:flex-end}}
`;
  document.head.appendChild(s);
}

function cleanVisibleUi(){installRecoveryGate();normalizeNav();translateAsk();}
function startupCleanup(){cleanVisibleUi();setTimeout(function(){cleanVisibleUi();suppressLegacyRecoveryOnce();},180);setTimeout(cleanVisibleUi,700);}

installOwnershipCss();installRecoveryGate();setTimeout(installRecoveryGate,80);setTimeout(installRecoveryGate,220);

document.addEventListener('pst:modules-ready',function(){cleanVisibleUi();suppressLegacyRecoveryOnce();},{once:true});
document.addEventListener('pst:home-canonical-rendered',function(){translateAsk();normalizeNav();});
document.addEventListener('click',function(e){var b=e.target&&e.target.closest?e.target.closest('#pst-ws-canonical-nav .pst-ws-navbtn[data-key]'):null;if(!b)return;e.preventDefault();e.stopPropagation();if(typeof e.stopImmediatePropagation==='function')e.stopImmediatePropagation();directRoute(b.dataset.key);},true);
window.addEventListener('pageshow',startupCleanup,{once:true});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',startupCleanup,{once:true});else startupCleanup();

function loadCore(){
  if(document.querySelector('script[data-pst-native-ui-v3-core]'))return;
  var s=document.createElement('script');s.src='pristeel-native-ui-v3-core.js?v=20260901-softperf1';s.defer=true;s.setAttribute('data-pst-native-ui-v3-core','1');
  s.onload=function(){cleanVisibleUi();};s.onerror=function(){console.error('Native UI v3 core failed to load');};document.head.appendChild(s);
}
loadCore();
window.PSTUiOwnershipCleanupV1={apply:cleanVisibleUi,installRecoveryGate:installRecoveryGate,directRoute:directRoute};
})();