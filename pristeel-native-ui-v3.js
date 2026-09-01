/* PRISTEEL Native UI v3 entry — stable ownership and recovery gate
 * Loads before the ordered runtime. Business engines remain untouched.
 */
(function(){
'use strict';
if(window.__pstNativeUiV3Entry)return;
window.__pstNativeUiV3Entry=true;
window.PSTNativeUIV3Entry={version:'stable-20260901-3'};

var NAV={home:'Home',tenders:'Opportunities',projects:'Projects',contacts:'Partners',finance:'Finance',apps:'System'};
var TEXT={
  'Mundësitë':'Opportunities','Projektet':'Projects','Partnerët':'Partners','Financat':'Finance','Sistemi':'System',
  'PYET PPPP':'ASK PPPP','Pyet PPPP':'Ask PPPP','Pyet platformën për çdo projekt':'Ask the platform about any project',
  'PPPP lexon gjendjen live dhe të kthen përgjigje nga të dhënat e platformës.':'PPPP reads live platform data and answers from the current project state.',
  'PPPP ruajti punë të pambyllur':'PPPP found unfinished work','Rikthe':'Restore','Mbaje për më vonë':'Keep for later'
};

function recoveryState(){
  var seen={},count=0;
  try{
    if(typeof window.loadOpQueue==='function'){
      var q=window.loadOpQueue()||[];
      if(Array.isArray(q))q.forEach(function(op,i){if(op&&!op.done){var k='q:'+(op.id||i);if(!seen[k]){seen[k]=1;count++;}}});
    }
  }catch(e){}
  try{
    for(var i=0;i<localStorage.length;i++){
      var key=localStorage.key(i);
      if(key&&key.indexOf('pristeel_unsaved_')===0&&!seen['ls:'+key]){seen['ls:'+key]=1;count++;}
    }
  }catch(e){}
  return {count:count};
}
function recoveryDeferred(){try{return sessionStorage.getItem('pst_recovery_deferred_v3')==='1';}catch(e){return false;}}
function deferRecovery(){try{sessionStorage.setItem('pst_recovery_deferred_v3','1');}catch(e){}}
function clearRecoveryDeferred(){try{sessionStorage.removeItem('pst_recovery_deferred_v3');}catch(e){}}

function showRecovery(count){
  count=Number(count||0);if(!count||recoveryDeferred())return;
  var old=document.getElementById('pst-ui-recovery-clean');if(old){var c=old.querySelector('[data-recovery-count]');if(c)c.textContent=String(count);return;}
  var host=document.body;if(!host)return;
  var box=document.createElement('div');box.id='pst-ui-recovery-clean';box.setAttribute('role','status');
  box.innerHTML='<div><b>PPPP found unfinished work</b><span><strong data-recovery-count>'+count+'</strong> item'+(count===1?'':'s')+' from the previous session '+(count===1?'is':'are')+' available. Nothing is changed until you choose.</span></div><div class="pst-rec-actions"><button type="button" data-rec="restore">Restore</button><button type="button" data-rec="later">Keep for later</button></div>';
  box.addEventListener('click',function(e){
    var b=e.target.closest('[data-rec]');if(!b)return;
    if(b.dataset.rec==='later'){deferRecovery();box.remove();return;}
    var original=window.__pstOriginalRecoverUnsavedWork;
    clearRecoveryDeferred();box.remove();
    if(typeof original==='function')Promise.resolve(original()).catch(function(){});
  });
  host.appendChild(box);
}

function installRecoveryGate(){
  var fn=window.recoverUnsavedWork;
  if(typeof fn!=='function'||fn.__pstUiRecoveryGate)return false;
  if(!window.__pstOriginalRecoverUnsavedWork)window.__pstOriginalRecoverUnsavedWork=fn;
  var original=window.__pstOriginalRecoverUnsavedWork;
  var gated=function(){
    var state=recoveryState();
    if(state.count){
      window.__pstPendingRecoveryNotice=state.count;
      showRecovery(state.count);
      try{document.dispatchEvent(new CustomEvent('pst:recovery-deferred',{detail:{pending:state.count}}));}catch(e){}
      return Promise.resolve({ok:false,pending:state.count,deferred:true});
    }
    return typeof original==='function'?original.apply(this,arguments):Promise.resolve([]);
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
    shell.querySelectorAll('input,textarea').forEach(function(el){var ph=el.getAttribute('placeholder')||'';if(/STACON|Çfarë po ndodh|Cfare po ndodh/i.test(ph))el.setAttribute('placeholder','e.g. What is happening with STACON?');});
  }catch(e){}
}
function suppressLegacyRecovery(){
  var nodes=[];
  try{nodes=Array.prototype.slice.call(document.querySelectorAll('#pst-session-recovery,#session-recovery,[data-recovery-banner],.pst-recovery-banner,.session-recovery'));}catch(e){}
  try{Array.prototype.forEach.call(document.body?document.body.children:[],function(el){if(el&&el.id!=='pst-ui-recovery-clean'&&el.children.length<12){var t=(el.textContent||'').trim();if(t&&t.length<420&&(/PPPP ruajti punë të pambyllur/i.test(t)||/Ka \d+ veprime? nga sesioni i mëparshëm/i.test(t)))nodes.push(el);}});}catch(e){}
  nodes.forEach(function(el){if(el&&el.id!=='pst-ui-recovery-clean')el.style.setProperty('display','none','important');});
}
function installOwnershipCss(){
  var id='pst-ui-ownership-cleanup-css',s=document.getElementById(id);if(s)return;
  s=document.createElement('style');s.id=id;s.textContent=`
#page-workspace-home>#pst-native-home-v3{display:block!important;visibility:visible!important}#page-workspace-home>*:not(#pst-native-home-v3){display:none!important;visibility:hidden!important}
#pst-ui-recovery-clean{position:fixed;z-index:2147483000;top:16px;left:50%;transform:translateX(-50%);width:min(720px,calc(100vw - 32px));display:flex;align-items:center;justify-content:space-between;gap:20px;padding:14px 16px;background:#fff;border:1px solid #E5E7EB;border-left:3px solid #F59E0B;border-radius:12px;box-shadow:0 12px 34px rgba(17,24,39,.14);font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#111827}#pst-ui-recovery-clean>div:first-child{display:grid;gap:3px}#pst-ui-recovery-clean b{font-size:13px}#pst-ui-recovery-clean span{font-size:11px;color:#6B7280;line-height:1.45}.pst-rec-actions{display:flex;gap:8px;flex-shrink:0}.pst-rec-actions button{min-height:36px;padding:0 13px;border-radius:8px;border:1px solid #D1D5DB;background:#fff;color:#374151;font-weight:700;cursor:pointer}.pst-rec-actions button[data-rec="restore"]{background:#1E3A8A;border-color:#1E3A8A;color:#fff}@media(max-width:720px){#pst-ui-recovery-clean{align-items:stretch;flex-direction:column}.pst-rec-actions{justify-content:flex-end}}
`;
  document.head.appendChild(s);
}
function cleanVisibleUi(){installRecoveryGate();normalizeNav();translateAsk();suppressLegacyRecovery();}
function boundedCleanup(){[0,120,450,1200,3000,6500,12000].forEach(function(ms){setTimeout(cleanVisibleUi,ms);});}

installOwnershipCss();
[0,40,120,300,700,1400,2800,5200,8500,12000,20000].forEach(function(ms){setTimeout(installRecoveryGate,ms);});
document.addEventListener('pst:modules-ready',function(){cleanVisibleUi();setTimeout(cleanVisibleUi,300);},{once:true});
document.addEventListener('pst:home-canonical-rendered',function(){setTimeout(cleanVisibleUi,0);});
document.addEventListener('click',function(){installRecoveryGate();setTimeout(function(){installRecoveryGate();normalizeNav();translateAsk();},0);},true);
document.addEventListener('submit',function(){installRecoveryGate();setTimeout(installRecoveryGate,0);},true);
window.addEventListener('pageshow',boundedCleanup,{once:true});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boundedCleanup,{once:true});else boundedCleanup();

function loadCore(){
  if(window.__pstNativeUiV3Stable||document.querySelector('script[data-pst-native-ui-v3-core-stable]'))return;
  var s=document.createElement('script');s.src='pristeel-native-ui-v3-core-stable.js?v=20260901-stable1';s.defer=true;s.setAttribute('data-pst-native-ui-v3-core-stable','1');
  s.onload=function(){boundedCleanup();};
  s.onerror=function(){console.error('Native UI v3 stable core failed to load');};
  document.head.appendChild(s);
}
loadCore();
window.PSTUiOwnershipCleanupV1={apply:cleanVisibleUi,installRecoveryGate:installRecoveryGate,recoveryState:recoveryState};
})();