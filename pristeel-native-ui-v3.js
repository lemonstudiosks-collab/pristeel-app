/* PRISTEEL Native UI v3 compatibility entry
 * The former v3 presentation layer translated Albanian back to English and
 * competed with later Home renderers. v4 is now the only visible Home owner.
 */
(function(){
'use strict';
if(window.__pstNativeUiV3Entry)return;
window.__pstNativeUiV3Entry=true;

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
  var old=document.getElementById('pst-ui-recovery-clean');if(old){var c=old.querySelector('[data-recovery-count]');if(c)c.textContent=String(count);return;}
  if(!document.body)return;
  var box=document.createElement('div');box.id='pst-ui-recovery-clean';box.setAttribute('role','status');
  box.innerHTML='<div><b>PPPP gjeti punë të pambyllur</b><span><strong data-recovery-count>'+count+'</strong> veprime nga sesioni i mëparshëm janë në dispozicion. Asgjë nuk fshihet pa vendimin tënd.</span></div><div class="pst-rec-actions"><button type="button" data-rec="restore">Rikthe</button><button type="button" data-rec="later">Mbaje për më vonë</button></div>';
  box.addEventListener('click',function(e){var b=e.target.closest('[data-rec]');if(!b)return;if(b.dataset.rec==='later'){box.remove();return;}var original=window.__pstOriginalRecoverUnsavedWork;box.remove();if(typeof original==='function')Promise.resolve(original()).catch(function(){});});
  document.body.appendChild(box);
}
function installRecoveryGate(){
  var fn=window.recoverUnsavedWork;
  if(typeof fn!=='function'||fn.__pstUiRecoveryGate)return false;
  if(!window.__pstOriginalRecoverUnsavedWork)window.__pstOriginalRecoverUnsavedWork=fn;
  var gated=function(){var p=pendingRecovery();if(p.length){window.__pstPendingRecoveryNotice=p.length;showRecovery(p.length);try{document.dispatchEvent(new CustomEvent('pst:recovery-deferred',{detail:{pending:p.length}}));}catch(e){}return Promise.resolve({ok:false,pending:p.length,deferred:true});}return fn.apply(this,arguments);};
  gated.__pstUiRecoveryGate=true;window.recoverUnsavedWork=gated;return true;
}
function installEntryCss(){
  if(document.getElementById('pst-ui-ownership-cleanup-css'))return;
  var s=document.createElement('style');s.id='pst-ui-ownership-cleanup-css';s.textContent=`
#pst-ui-recovery-clean{position:fixed;z-index:2147483000;top:16px;left:50%;transform:translateX(-50%);width:min(720px,calc(100vw - 32px));display:flex;align-items:center;justify-content:space-between;gap:20px;padding:14px 16px;background:#FCFCFA;border:1px solid #E6E3DE;border-left:3px solid #4F97AF;border-radius:12px;box-shadow:0 12px 34px rgba(48,58,62,.07);font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#2F3437}
#pst-ui-recovery-clean>div:first-child{display:grid;gap:3px}#pst-ui-recovery-clean b{font-size:13px}#pst-ui-recovery-clean span{font-size:11px;color:#7C8488;line-height:1.45}.pst-rec-actions{display:flex;gap:8px;flex-shrink:0}.pst-rec-actions button{min-height:36px;padding:0 13px;border-radius:8px;border:1px solid #D9E2E5;background:#FCFCFA;color:#59666B;font-weight:700;cursor:pointer}.pst-rec-actions button[data-rec="restore"]{background:#4F97AF;border-color:#4F97AF;color:#fff}
@media(max-width:720px){#pst-ui-recovery-clean{align-items:stretch;flex-direction:column}.pst-rec-actions{justify-content:flex-end}}
`;
  document.head.appendChild(s);
}
function apply(){installEntryCss();installRecoveryGate();var X=window.PSTNativeUiV4||window.PSTNativeUiV3;if(X&&typeof X.apply==='function')X.apply();return true;}
function loadCore(){
  if(window.PSTNativeUiV4){apply();return;}
  if(document.querySelector('script[data-pst-native-ui-v4-core]'))return;
  var s=document.createElement('script');s.src='pristeel-native-ui-v4-core.js?v=20260903-singleowner1';s.defer=true;s.setAttribute('data-pst-native-ui-v4-core','1');
  s.onload=apply;s.onerror=function(){console.error('Nuk u ngarkua Native UI v4 core.');};document.head.appendChild(s);
}
installEntryCss();installRecoveryGate();[0,80,220].forEach(function(ms){setTimeout(installRecoveryGate,ms);});
document.addEventListener('pst:modules-ready',apply,{once:true});
window.addEventListener('pageshow',apply,{once:true});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){installRecoveryGate();loadCore();},{once:true});else loadCore();
window.PSTUiOwnershipCleanupV1={apply:apply,installRecoveryGate:installRecoveryGate};
})();
