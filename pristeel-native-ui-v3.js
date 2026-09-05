/* PRISTEEL Native UI v3 compatibility entry
 * v4 remains the visible Home owner. This compatibility layer now only keeps
 * presentation stable and provides bounded recovery for the two daily routes
 * that must never remain blank: Finance and Project workspace.
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
function installStablePresentationCss(){
  var s=document.getElementById('pst-home-compact-normal-css');
  if(!s){s=document.createElement('style');s.id='pst-home-compact-normal-css';document.head.appendChild(s);}
  s.textContent=`
/* Stable presentation: do not resize the sidebar or shrink typography after startup. */
#pst-ws-sidebar .pst-nav-label,#pst-ws-canonical-nav .pst-nav-label{font-size:13px!important;line-height:1.25!important}
#pst-ws-sidebar .pst-ws-navbtn,#pst-ws-canonical-nav .pst-ws-navbtn{font-size:13px!important;min-height:48px!important}
#pst-native-home-v4{padding-top:24px!important}
#pst-native-home-v4 .pn-head{margin-bottom:12px!important}
#pst-native-home-v4 .pn-ask-slot{min-height:60px!important;margin-bottom:12px!important;overflow:visible!important}
#pst-native-home-v4 .pn-ask-wait{min-height:60px!important;padding:0 14px!important}
#pst-native-home-v4 .pst-live-command-shell{position:relative!important;min-height:60px!important;margin:0!important;padding:0!important;overflow:visible!important;border:1px solid #D9E2E5!important;border-left:3px solid #4F97AF!important;border-radius:12px!important;background:#FCFCFA!important;box-shadow:0 3px 12px rgba(48,58,62,.025)!important}
#pst-native-home-v4 .pst-live-command-shell:before,#pst-native-home-v4 .pst-live-command-intro{display:none!important}
#pst-native-home-v4 .pst-live-command{display:flex!important;align-items:center!important;min-height:58px!important;margin:0!important;padding:6px!important;border:0!important;border-radius:10px!important;background:#F4F5F3!important}
#pst-native-home-v4 .pst-live-command-mark{width:34px!important;height:34px!important;min-width:34px!important}
#pst-native-home-v4 .pst-live-input{min-height:44px!important;height:44px!important;max-height:44px!important;resize:none!important;padding:10px 6px!important;font-size:14px!important}
#pst-native-home-v4 .pst-live-send{width:44px!important;height:44px!important;min-width:44px!important;border-radius:10px!important;background:#4F97AF!important;border-color:#4F97AF!important;color:#fff!important}
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
#pst-native-home-v4 .pn-kpis{gap:10px!important;margin-bottom:12px!important}
#pst-native-home-v4 .pn-kpi{min-height:82px!important;padding:11px 12px!important;border-radius:10px!important}
#pst-native-home-v4 .pn-kpi span{font-size:10.5px!important;line-height:1.25!important}
#pst-native-home-v4 .pn-kpi b{font-size:22px!important;margin-top:4px!important;line-height:1.15!important}
#pst-native-home-v4 .pn-kpi small{font-size:10px!important;margin-top:4px!important;line-height:1.3!important}
#pst-native-home-v4 .pn-kpi em{right:10px!important;top:9px!important}
#pst-native-home-v4 .pn-kpi:nth-child(-n+2):after{left:12px!important;right:12px!important}
/* Keep the project workspace readable; late compatibility layers must not reduce it to 7–9px text. */
#page-workspace-project .pst-pi-sub{font-size:12px!important}
#page-workspace-project .pst-pi-btn,#page-workspace-project .pst-pi-tab{font-size:11.5px!important}
#page-workspace-project .pst-pi-stat span,#page-workspace-project .pst-pi-hd small,#page-workspace-project .pst-pi-meta,#page-workspace-project .pst-pi-contactmain div,#page-workspace-project .pst-pi-integr span{font-size:10.5px!important}
#page-workspace-project .pst-pi-hd b,#page-workspace-project .pst-pi-name,#page-workspace-project .pst-pi-contactmain b,#page-workspace-project .pst-pi-integr b{font-size:12px!important}
#page-workspace-project .pst-pi-link,#page-workspace-project .pst-pi-empty,#page-workspace-project .pst-pi-note{font-size:10.5px!important}
#page-workspace-project .pst-pi-badge{font-size:9px!important}
#page-workspace-project .pst-pi-step{font-size:9.5px!important}
@media(max-width:760px){
  #pst-native-home-v4 .pst-live-result:not([hidden]):not([data-pst-dismissed="1"]){top:7vh!important;max-height:84vh!important;padding:20px 48px 20px 18px!important}
  #pst-native-home-v4 .pst-ask-modal-close{top:calc(7vh + 10px);right:22px}
}
`;
}
function currentAskResult(){return document.querySelector('#pst-native-home-v4 .pst-live-result')||document.querySelector('#page-workspace-home .pst-live-result');}
function dismissAskModal(){var r=currentAskResult();if(!r)return false;r.setAttribute('data-pst-dismissed','1');r.hidden=true;return true;}
function installAskOwnerQueryBridge(){
  var owner=document.getElementById('pst-project-control-home-v2'),shell=document.querySelector('#pst-native-home-v4 .pst-live-command-shell');
  if(!owner||!shell||owner.__pstAskQueryBridge)return !!(owner&&owner.__pstAskQueryBridge);
  var original=owner.querySelector.bind(owner);
  owner.__pstAskOriginalQuerySelector=original;
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
function markFinanceNav(){
  var host=document.getElementById('pst-ws-canonical-nav');if(!host)return;
  host.querySelectorAll('.pst-ws-navbtn[data-key]').forEach(function(b){b.classList.toggle('active',String(b.dataset.key||'').toLowerCase()==='finance');});
}
function showFinancePage(){
  var p=document.getElementById('page-finance');if(!p)return false;
  document.querySelectorAll('.page').forEach(function(x){if(x!==p){x.classList.remove('active');x.style.display='none';}});
  p.hidden=false;p.removeAttribute('hidden');p.classList.add('active');p.style.setProperty('display','block','important');markFinanceNav();
  return true;
}
function ensureFinanceCore(){
  if(typeof window.finShowHub==='function')return Promise.resolve(true);
  var old=document.querySelector('script[data-pst-ui-finance-core]');
  if(old)return new Promise(function(resolve){if(typeof window.finShowHub==='function')return resolve(true);old.addEventListener('load',function(){resolve(typeof window.finShowHub==='function');},{once:true});old.addEventListener('error',function(){resolve(false);},{once:true});});
  return new Promise(function(resolve){var s=document.createElement('script');s.src='pristeel-finance.js?v=20260904-finance-hardfix2';s.defer=true;s.setAttribute('data-pst-ui-finance-core','1');s.onload=function(){resolve(typeof window.finShowHub==='function');};s.onerror=function(){resolve(false);};document.head.appendChild(s);});
}
function recoverFinanceHard(){
  markFinanceNav();showFinancePage();
  /* Finance is a terminal UI route. Never enter the shared workspace router or
   * another recovery wrapper from this capture lane: both can be decorated by
   * late modules, while the existing Finance page/core are sufficient here. */
  return ensureFinanceCore().then(function(){showFinancePage();if(typeof window.finShowHub==='function'){try{window.finShowHub();}catch(e){}}try{var D=window.PSTFinanceDailyV1;if(D&&typeof D.apply==='function')D.apply(true);}catch(e){}return true;});
}
function installFinanceWindowOwner(){
  if(window.__pstFinanceWindowOwnerV1)return true;window.__pstFinanceWindowOwnerV1=true;
  /* Window capture runs before document capture, so a later navigation owner cannot blank Finance. */
  window.addEventListener('click',function(e){var b=e.target&&e.target.closest?e.target.closest('#pst-ws-canonical-nav .pst-ws-navbtn[data-key="finance"]'):null;if(!b)return;e.preventDefault();e.stopPropagation();if(typeof e.stopImmediatePropagation==='function')e.stopImmediatePropagation();recoverFinanceHard();[80,240,700].forEach(function(ms){setTimeout(recoverFinanceHard,ms);});},true);
  return true;
}
function timeoutPromise(p,ms,label){
  return Promise.race([Promise.resolve(p),new Promise(function(_,reject){setTimeout(function(){reject(new Error(label||'Veprimi tejkaloi afatin.'));},ms);})]);
}
function renderProjectCoreFallback(id,reason){
  var p=document.getElementById('page-workspace-project');if(!p)return Promise.resolve(false);
  function draw(project){
    var name=project&&project.name||'Projekti';var client=project&&(project.client||project.client_name)||'';var ref=project&&(project.business_ref||project.ref)||'';var status=project&&(project.operational_state||project.pipeline_stage||project.status)||'';
    p.innerHTML='<div class="pst-ws-page"><section class="pst-pi-head"><div class="pst-pi-top"><div><div class="pst-pi-title">'+String(name).replace(/</g,'&lt;')+'</div><div class="pst-pi-sub">'+[client,ref,status].filter(Boolean).map(function(x){return String(x).replace(/</g,'&lt;');}).join(' · ')+'</div></div><div class="pst-pi-actions"><button class="pst-pi-btn" type="button" onclick="pstWorkspaceGo(\'projects\')">Projektet</button><button class="pst-pi-btn primary" type="button" onclick="pstOpenProjectWorkspace(\''+String(id).replace(/'/g,'')+'\')">Riprovo</button></div></div></section><section class="pst-pi-card"><div class="pst-pi-body"><div class="pst-pi-note"><b>Projekti është hapur.</b><br>Të dhënat plotësuese nuk u kthyen brenda afatit; mund të vazhdosh me projektin ose të përdorësh “Riprovo”.</div></div></section></div>';
    return true;
  }
  if(typeof window.supaFetch!=='function'){draw(null);return Promise.resolve(true);}
  return timeoutPromise(window.supaFetch('projects?id=eq.'+encodeURIComponent(id)+'&select=*&limit=1'),3500,'').then(function(rows){draw(Array.isArray(rows)&&rows[0]||null);return true;}).catch(function(){draw(null);return true;});
}
function projectStillLoading(id){
  var p=document.getElementById('page-workspace-project');if(!p||!p.classList.contains('active'))return false;
  if(id&&window.__pstCurrentProjectId&&String(window.__pstCurrentProjectId)!==String(id))return false;
  return /duke (hapur|bashkuar|ngarkuar)/i.test(String(p.textContent||''));
}
function installProjectOpenGuard(){
  var current=window.pstOpenProjectWorkspace;
  if(typeof current!=='function'||current.__pstBoundedUiGuard)return false;
  var wrapped=function(id){
    var self=this,args=arguments,result;
    try{result=current.apply(self,args);}catch(e){renderProjectCoreFallback(id,e);return Promise.resolve(false);}
    return timeoutPromise(result,16000,'Ngarkimi i projektit tejkaloi afatin.').catch(function(error){if(projectStillLoading(id))return renderProjectCoreFallback(id,error);return false;});
  };
  wrapped.__pstBoundedUiGuard=true;wrapped.__pstBoundedUiBase=current;wrapped.__pstCanonicalOwner=current.__pstCanonicalOwner||'pristeel-project-integrity-ui-v1';wrapped.__pstTruthTransition=true;
  window.pstOpenProjectWorkspace=wrapped;
  return true;
}
function applyHomePresentation(){installStablePresentationCss();installAskModalChrome();installFinanceWindowOwner();installProjectOpenGuard();}
function apply(){installEntryCss();installRecoveryGate();installFinanceWindowOwner();installProjectOpenGuard();var X=window.PSTNativeUiV4||window.PSTNativeUiV3;if(X&&typeof X.apply==='function'){X.apply();applyHomePresentation();[120,360,900,1800].forEach(function(ms){setTimeout(applyHomePresentation,ms);});}return true;}
function loadAskFunctionalOwner(){
  if(window.PSTHomeAskFunctionalOwnerV1||document.querySelector('script[data-pst-home-ask-functional-owner]'))return;
  var s=document.createElement('script');s.src='pristeel-home-ask-functional-owner-v1.js?v=20260904-ask3';s.defer=true;s.setAttribute('data-pst-home-ask-functional-owner','1');document.head.appendChild(s);
}
function loadCore(){
  loadAskFunctionalOwner();
  if(window.PSTNativeUiV4){apply();return;}
  if(document.querySelector('script[data-pst-native-ui-v4-core]'))return;
  var s=document.createElement('script');s.src='pristeel-native-ui-v4-core.js?v=20260903-singleowner1';s.defer=true;s.setAttribute('data-pst-native-ui-v4-core','1');
  s.onload=apply;s.onerror=function(){console.error('Nuk u ngarkua Native UI v4 core.');};document.head.appendChild(s);
}
installEntryCss();installStablePresentationCss();installRecoveryGate();installFinanceWindowOwner();loadAskFunctionalOwner();[0,80,220,700,1600].forEach(function(ms){setTimeout(function(){installRecoveryGate();installFinanceWindowOwner();installProjectOpenGuard();installStablePresentationCss();},ms);});
document.addEventListener('pst:modules-ready',apply,{once:true});
document.addEventListener('pst:native-home-ready',function(){applyHomePresentation();setTimeout(applyHomePresentation,240);});
document.addEventListener('pst:project-control-home-rendered',function(){loadAskFunctionalOwner();setTimeout(function(){try{if(window.PSTHomeAskFunctionalOwnerV1)window.PSTHomeAskFunctionalOwnerV1.apply();}catch(e){}},0);});
window.addEventListener('pageshow',apply,{once:true});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){installRecoveryGate();installFinanceWindowOwner();loadCore();},{once:true});else loadCore();
window.PSTUiOwnershipCleanupV1={apply:apply,installRecoveryGate:installRecoveryGate,installAskModalChrome:installAskModalChrome,installAskOwnerQueryBridge:installAskOwnerQueryBridge,dismissAskModal:dismissAskModal,recoverFinance:recoverFinanceHard,installProjectOpenGuard:installProjectOpenGuard};
})();

/* Exact Home destination owner. Kept separate from the visual owner so it can
 * be retired independently without touching Home rendering or business logic. */
(function(){
'use strict';
if(window.__pstHomeRoutePrecisionLoaderV1)return;
window.__pstHomeRoutePrecisionLoaderV1=true;
function load(){
  if(window.PSTHomeRoutePrecisionV1||document.querySelector('script[data-pst-home-route-precision]'))return;
  var s=document.createElement('script');
  s.src='pristeel-home-route-precision-v1.js?v=20260904-route2';
  s.defer=true;
  s.setAttribute('data-pst-home-route-precision','1');
  document.head.appendChild(s);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load,{once:true});else load();
document.addEventListener('pst:native-home-ready',load,{once:true});
})();
