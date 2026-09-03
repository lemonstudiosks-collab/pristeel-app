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
function installCompactHomeCss(){
  var s=document.getElementById('pst-home-compact-normal-css');
  if(!s){s=document.createElement('style');s.id='pst-home-compact-normal-css';}
  s.textContent=`
@media(min-width:1025px){
  html.pst-native-ui-v4-ready #pst-ws-sidebar,
  html.pst-native-ui-v4-ready .workspace-shell>.sidebar{width:200px!important;min-width:200px!important;max-width:200px!important;flex:0 0 200px!important}
}
#pst-native-home-v4{padding-top:22px!important}
#pst-native-home-v4 .pn-head{margin-bottom:10px!important}
#pst-native-home-v4 .pn-ask-slot{min-height:56px!important;height:56px!important;margin-bottom:10px!important;overflow:visible!important}
#pst-native-home-v4 .pn-ask-wait{min-height:56px!important;height:56px!important;padding:0 14px!important}
#pst-native-home-v4 .pst-live-command-shell{position:relative!important;min-height:56px!important;height:56px!important;margin:0!important;padding:0!important;overflow:visible!important;border:1px solid #D9E2E5!important;border-left:3px solid #4F97AF!important;border-radius:12px!important;background:#FCFCFA!important;box-shadow:0 3px 12px rgba(48,58,62,.025)!important}
#pst-native-home-v4 .pst-live-command-shell:before{display:none!important}
#pst-native-home-v4 .pst-live-command-intro{display:none!important}
#pst-native-home-v4 .pst-live-command{display:flex!important;align-items:center!important;min-height:54px!important;height:54px!important;margin:0!important;padding:5px 6px!important;border:0!important;border-radius:10px!important;background:#F4F5F3!important}
#pst-native-home-v4 .pst-live-command-mark{width:32px!important;height:32px!important;min-width:32px!important}
#pst-native-home-v4 .pst-live-input{min-height:42px!important;height:42px!important;max-height:42px!important;resize:none!important;padding:9px 4px!important;font-size:13px!important}
#pst-native-home-v4 .pst-live-send{width:42px!important;height:42px!important;min-width:42px!important;border-radius:10px!important;background:#4F97AF!important;border-color:#4F97AF!important;color:#fff!important}
#pst-native-home-v4 .pst-live-result[hidden],#pst-native-home-v4 .pst-live-result[data-pst-dismissed="1"]{display:none!important}
#pst-native-home-v4 .pst-live-result:not([hidden]):not([data-pst-dismissed="1"]){position:fixed!important;z-index:2147482500!important;left:50%!important;top:12vh!important;transform:translateX(-50%)!important;width:min(720px,calc(100vw - 32px))!important;max-height:76vh!important;overflow:auto!important;margin:0!important;padding:24px 56px 24px 24px!important;border:1px solid #D9E2E5!important;border-left:4px solid #4F97AF!important;border-radius:14px!important;background:#FCFCFA!important;color:#2F3437!important;box-shadow:0 0 0 100vmax rgba(24,38,43,.42),0 24px 70px rgba(24,38,43,.22)!important}
#pst-native-home-v4 .pst-live-result .pst-live-answer{color:#2F3437!important;font-size:14px!important;line-height:1.65!important}
#pst-native-home-v4 .pst-live-result .pst-live-suggest{border-top-color:#E6E3DE!important;color:#59666B!important}
#pst-native-home-v4 .pst-live-result .pst-live-suggest b{color:#3F7F98!important}
#pst-native-home-v4 .pst-live-result .pst-live-msg{color:#2F3437!important}
#pst-native-home-v4 .pst-live-result .pst-live-msg.ok b{color:#55775F!important}
#pst-native-home-v4 .pst-live-result .pst-live-msg.err{color:#934C45!important}
#pst-native-home-v4 .pst-live-result .pst-live-thinking b{color:#2F3437!important}
#pst-native-home-v4 .pst-live-result .pst-live-thinking span{color:#647278!important}
#pst-native-home-v4 .pst-live-result .pst-live-thinking small{color:#8A9599!important}
#pst-native-home-v4 .pst-live-result .pst-live-thinking-orb i{background:#4F97AF!important}
#pst-native-home-v4 .pst-live-result .pst-live-open-answer{background:#4F97AF!important;border-color:#4F97AF!important;color:#fff!important}
#pst-native-home-v4 .pst-ask-modal-close{display:none;position:fixed;z-index:2147482600;top:calc(12vh + 14px);right:max(24px,calc((100vw - 720px)/2 + 16px));width:32px;height:32px;place-items:center;border:1px solid #D9E2E5;border-radius:9px;background:#FCFCFA;color:#59666B;font-size:20px;line-height:1;cursor:pointer;box-shadow:none}
#pst-native-home-v4 .pst-live-result:not([hidden]):not([data-pst-dismissed="1"])+.pst-ask-modal-close{display:grid!important}
#pst-native-home-v4 .pn-kpis{gap:8px!important;margin-bottom:10px!important}
#pst-native-home-v4 .pn-kpi{min-height:68px!important;padding:8px 10px!important;border-radius:10px!important}
#pst-native-home-v4 .pn-kpi span{font-size:8.5px!important}
#pst-native-home-v4 .pn-kpi b{font-size:19px!important;margin-top:3px!important}
#pst-native-home-v4 .pn-kpi small{font-size:8px!important;margin-top:2px!important;line-height:1.25!important}
#pst-native-home-v4 .pn-kpi em{right:8px!important;top:7px!important}
#pst-native-home-v4 .pn-kpi:nth-child(-n+2):after{left:10px!important;right:10px!important}
@media(max-width:760px){
  #pst-native-home-v4 .pst-live-result:not([hidden]):not([data-pst-dismissed="1"]){top:7vh!important;max-height:84vh!important;padding:20px 48px 20px 18px!important}
  #pst-native-home-v4 .pst-ask-modal-close{top:calc(7vh + 10px);right:22px}
}
`;
  document.head.appendChild(s);
}
function currentAskResult(){return document.querySelector('#pst-native-home-v4 .pst-live-result')||document.querySelector('#page-workspace-home .pst-live-result');}
function dismissAskModal(){var r=currentAskResult();if(!r)return false;r.setAttribute('data-pst-dismissed','1');r.hidden=true;return true;}
function installAskOwnerQueryBridge(){
  var owner=document.getElementById('pst-project-control-home-v2'),shell=document.querySelector('#pst-native-home-v4 .pst-live-command-shell');
  if(!owner||!shell||owner.__pstAskQueryBridge)return !!(owner&&owner.__pstAskQueryBridge);
  var original=owner.querySelector.bind(owner);
  owner.querySelector=function(selector){
    if(selector==='.pst-live-result'||selector==='.pst-live-send'||selector==='.pst-live-input'||selector==='.pst-live-command'){
      var live=document.querySelector('#pst-native-home-v4 .pst-live-command-shell'),found=live&&live.querySelector(selector);
      if(found)return found;
    }
    return original(selector);
  };
  owner.__pstAskQueryBridge=true;
  return true;
}
function installAskModalChrome(){
  var shell=document.querySelector('#pst-native-home-v4 .pst-live-command-shell');
  if(!shell)return false;
  var result=shell.querySelector('.pst-live-result');
  if(!result)return false;
  installAskOwnerQueryBridge();
  var close=shell.querySelector('.pst-ask-modal-close');
  if(!close){close=document.createElement('button');close.type='button';close.className='pst-ask-modal-close';close.setAttribute('aria-label','Mbyll përgjigjen');close.title='Mbyll';close.textContent='×';result.insertAdjacentElement('afterend',close);close.addEventListener('click',dismissAskModal);}
  if(shell.dataset.pstAskModalBound!=='1'){
    shell.dataset.pstAskModalBound='1';
    shell.addEventListener('submit',function(){var r=currentAskResult();if(r){r.removeAttribute('data-pst-dismissed');}});
  }
  if(!window.__pstAskModalEscapeInstalled){
    window.__pstAskModalEscapeInstalled=true;
    document.addEventListener('keydown',function(e){if(e.key==='Escape')dismissAskModal();});
  }
  return true;
}
function applyHomePresentation(){installCompactHomeCss();installAskModalChrome();}
function apply(){installEntryCss();installRecoveryGate();var X=window.PSTNativeUiV4||window.PSTNativeUiV3;if(X&&typeof X.apply==='function'){X.apply();applyHomePresentation();[120,360,900,1800].forEach(function(ms){setTimeout(applyHomePresentation,ms);});}return true;}
function loadCore(){
  if(window.PSTNativeUiV4){apply();return;}
  if(document.querySelector('script[data-pst-native-ui-v4-core]'))return;
  var s=document.createElement('script');s.src='pristeel-native-ui-v4-core.js?v=20260903-singleowner1';s.defer=true;s.setAttribute('data-pst-native-ui-v4-core','1');
  s.onload=apply;s.onerror=function(){console.error('Nuk u ngarkua Native UI v4 core.');};document.head.appendChild(s);
}
installEntryCss();installRecoveryGate();[0,80,220].forEach(function(ms){setTimeout(installRecoveryGate,ms);});
document.addEventListener('pst:modules-ready',apply,{once:true});
document.addEventListener('pst:native-home-ready',function(){applyHomePresentation();setTimeout(applyHomePresentation,240);});
window.addEventListener('pageshow',apply,{once:true});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){installRecoveryGate();loadCore();},{once:true});else loadCore();
window.PSTUiOwnershipCleanupV1={apply:apply,installRecoveryGate:installRecoveryGate,installAskModalChrome:installAskModalChrome,installAskOwnerQueryBridge:installAskOwnerQueryBridge,dismissAskModal:dismissAskModal};
})();