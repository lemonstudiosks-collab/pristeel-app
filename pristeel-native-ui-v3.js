/* PRISTEEL Native UI v3 entry — ownership cleanup
 * Loads before the ordered runtime. Keeps business engines untouched.
 * Prevents duplicate startup recovery prompts and normalizes the visible UI.
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
var cleanupStarted=false;

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
  var old=document.getElementById('pst-ui-recovery-clean');if(old){old.querySelector('[data-recovery-count]').textContent=String(count);return;}
  var host=document.body;if(!host)return;
  var box=document.createElement('div');box.id='pst-ui-recovery-clean';box.setAttribute('role','status');
  box.innerHTML='<div><b>PPPP found unfinished work</b><span><strong data-recovery-count>'+count+'</strong> action'+(count===1?'':'s')+' from your previous session '+(count===1?'is':'are')+' available. Nothing is deleted without your decision.</span></div><div class="pst-rec-actions"><button type="button" data-rec="restore">Restore</button><button type="button" data-rec="later">Keep for later</button></div>';
  box.addEventListener('click',function(e){
    var b=e.target.closest('[data-rec]');if(!b)return;
    if(b.dataset.rec==='later'){box.remove();return;}
    var original=window.__pstOriginalRecoverUnsavedWork;
    box.remove();
    if(typeof original==='function')Promise.resolve(original()).catch(function(){});
  });
  host.appendChild(box);
}

function installRecoveryGate(){
  var fn=window.recoverUnsavedWork;
  if(typeof fn!=='function'||fn.__pstUiRecoveryGate)return false;
  if(!window.__pstOriginalRecoverUnsavedWork)window.__pstOriginalRecoverUnsavedWork=fn;
  var gated=function(){
    var p=pendingRecovery();
    if(p.length){
      window.__pstPendingRecoveryNotice=p.length;
      showRecovery(p.length);
      try{document.dispatchEvent(new CustomEvent('pst:recovery-deferred',{detail:{pending:p.length}}));}catch(e){}
      return Promise.resolve({ok:false,pending:p.length,deferred:true});
    }
    return fn.apply(this,arguments);
  };
  gated.__pstUiRecoveryGate=true;
  window.recoverUnsavedWork=gated;
  return true;
}

function normalizeNav(){
  Object.keys(NAV).forEach(function(k){
    var b=document.querySelector('#pst-ws-canonical-nav .pst-ws-navbtn[data-key="'+k+'"]');
    if(!b)return;var s=b.querySelector('.pst-nav-label')||b.querySelector('span');if(s)s.textContent=NAV[k];
  });
}

function translateAsk(){
  var shell=document.querySelector('#pst-native-home-v3 .pst-live-command-shell')||document.querySelector('#page-workspace-home .pst-live-command-shell');
  if(!shell)return;
  try{
    var w=document.createTreeWalker(shell,NodeFilter.SHOW_TEXT),n;
    while((n=w.nextNode())){var raw=n.nodeValue,t=String(raw||'').trim();if(TEXT[t])n.nodeValue=raw.replace(t,TEXT[t]);}
    shell.querySelectorAll('input,textarea').forEach(function(el){
      var ph=el.getAttribute('placeholder')||'';
      if(/STACON|Çfarë po ndodh|Cfare po ndodh/i.test(ph))el.setAttribute('placeholder','e.g. What is happening with STACON?');
    });
  }catch(e){}
}

function suppressLegacyRecovery(){
  document.querySelectorAll('body *').forEach(function(el){
    if(el.id==='pst-ui-recovery-clean'||el.closest&&el.closest('#pst-ui-recovery-clean'))return;
    if(el.children.length>16)return;
    var t=(el.textContent||'').trim();
    if(t&&t.length<500&&(/PPPP ruajti punë të pambyllur/i.test(t)||/Ka \d+ veprime? nga sesioni i mëparshëm/i.test(t))){
      el.style.setProperty('display','none','important');
    }
  });
}

function installOwnershipCss(){
  var id='pst-ui-ownership-cleanup-css',s=document.getElementById(id);if(s)return;
  s=document.createElement('style');s.id=id;s.textContent=`
#pst-ui-recovery-clean{position:fixed;z-index:2147483000;top:16px;left:50%;transform:translateX(-50%);width:min(720px,calc(100vw - 32px));display:flex;align-items:center;justify-content:space-between;gap:20px;padding:14px 16px;background:#fff;border:1px solid #E3E8EE;border-left:3px solid #A7874F;border-radius:12px;box-shadow:0 12px 34px rgba(36,52,71,.12);font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#243447}
#pst-ui-recovery-clean>div:first-child{display:grid;gap:3px}#pst-ui-recovery-clean b{font-size:13px}#pst-ui-recovery-clean span{font-size:11px;color:#7A8798;line-height:1.45}.pst-rec-actions{display:flex;gap:8px;flex-shrink:0}.pst-rec-actions button{min-height:36px;padding:0 13px;border-radius:8px;border:1px solid #D8E0E8;background:#fff;color:#526170;font-weight:700;cursor:pointer}.pst-rec-actions button[data-rec="restore"]{background:#2F5F86;border-color:#2F5F86;color:#fff}
#pst-native-home-v3 #pn-ask .pst-live-command-shell{background:#fff!important;border:1px solid #E3E8EE!important;border-left:3px solid #2F5F86!important;border-radius:10px!important;box-shadow:none!important;padding:14px 16px!important;color:#243447!important;min-height:0!important}
#pst-native-home-v3 #pn-ask .pst-live-command-shell *{text-shadow:none!important}
#pst-native-home-v3 #pn-ask .pst-live-command-shell h1,#pst-native-home-v3 #pn-ask .pst-live-command-shell h2,#pst-native-home-v3 #pn-ask .pst-live-command-shell h3,#pst-native-home-v3 #pn-ask .pst-live-command-shell b,#pst-native-home-v3 #pn-ask .pst-live-command-shell strong{color:#243447!important}
#pst-native-home-v3 #pn-ask .pst-live-command-shell p,#pst-native-home-v3 #pn-ask .pst-live-command-shell small,#pst-native-home-v3 #pn-ask .pst-live-command-shell span{color:#7A8798!important}
#pst-native-home-v3 #pn-ask .pst-live-command-shell form{margin-top:10px!important;background:#F4F6F8!important;border:1px solid #E3E8EE!important;border-radius:9px!important;padding:7px!important}
#pst-native-home-v3 #pn-ask .pst-live-command-shell input,#pst-native-home-v3 #pn-ask .pst-live-command-shell textarea{background:transparent!important;color:#243447!important;border:0!important;box-shadow:none!important}
#pst-native-home-v3 #pn-ask .pst-live-command-shell button{background:#2F5F86!important;border-color:#2F5F86!important;color:#fff!important;border-radius:8px!important;box-shadow:none!important}
@media(max-width:720px){#pst-ui-recovery-clean{align-items:stretch;flex-direction:column}.pst-rec-actions{justify-content:flex-end}}
`;
  document.head.appendChild(s);
}

function cleanVisibleUi(){installRecoveryGate();normalizeNav();translateAsk();suppressLegacyRecovery();}
function boundedCleanup(){if(cleanupStarted){cleanVisibleUi();return;}cleanupStarted=true;[0,250].forEach(function(ms){setTimeout(cleanVisibleUi,ms);});}

installOwnershipCss();installRecoveryGate();
[0,40,120,300].forEach(function(ms){setTimeout(installRecoveryGate,ms);});

document.addEventListener('pst:modules-ready',function(){cleanVisibleUi();setTimeout(cleanVisibleUi,250);},{once:true});
document.addEventListener('pst:home-canonical-rendered',function(){setTimeout(cleanVisibleUi,0);});
document.addEventListener('click',function(){setTimeout(function(){normalizeNav();translateAsk();},0);},true);
window.addEventListener('pageshow',boundedCleanup,{once:true});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boundedCleanup,{once:true});else boundedCleanup();

function loadCore(){
  if(document.querySelector('script[data-pst-native-ui-v3-core]'))return;
  var s=document.createElement('script');s.src='pristeel-native-ui-v3-core.js?v=20260901-ownership1';s.defer=true;s.setAttribute('data-pst-native-ui-v3-core','1');
  s.onload=function(){installOwnershipCss();boundedCleanup();};
  s.onerror=function(){console.error('Native UI v3 core failed to load');};document.head.appendChild(s);
}
loadCore();
window.PSTUiOwnershipCleanupV1={apply:cleanVisibleUi,installRecoveryGate:installRecoveryGate};
})();