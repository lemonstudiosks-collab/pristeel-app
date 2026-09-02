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
#pst-ui-recovery-clean{position:fixed;z-index:2147483000;top:16px;left:50%;transform:translateX(-50%);width:min(720px,calc(100vw - 32px));display:flex;align-items:center;justify-content:space-between;gap:20px;padding:14px 16px;background:#FBFAF7;border:1px solid #DED8CC;border-left:3px solid #B08A57;border-radius:12px;box-shadow:0 12px 34px rgba(69,59,44,.10);font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#2F3437}
#pst-ui-recovery-clean>div:first-child{display:grid;gap:3px}#pst-ui-recovery-clean b{font-size:13px}#pst-ui-recovery-clean span{font-size:11px;color:#77746E;line-height:1.45}.pst-rec-actions{display:flex;gap:8px;flex-shrink:0}.pst-rec-actions button{min-height:36px;padding:0 13px;border-radius:8px;border:1px solid #D8D0C2;background:#FBFAF7;color:#5F625F;font-weight:700;cursor:pointer}.pst-rec-actions button[data-rec="restore"]{background:#B08A57;border-color:#B08A57;color:#fff}
#pst-native-home-v3 #pn-ask .pst-live-command-shell{background:#FBFAF7!important;border:1px solid #DED8CC!important;border-left:3px solid #B08A57!important;border-radius:11px!important;box-shadow:0 6px 20px rgba(69,59,44,.045)!important;padding:14px 16px!important;color:#2F3437!important;min-height:0!important}
#pst-native-home-v3 #pn-ask .pst-live-command-shell *{text-shadow:none!important}
#pst-native-home-v3 #pn-ask .pst-live-command-shell h1,#pst-native-home-v3 #pn-ask .pst-live-command-shell h2,#pst-native-home-v3 #pn-ask .pst-live-command-shell h3,#pst-native-home-v3 #pn-ask .pst-live-command-shell b,#pst-native-home-v3 #pn-ask .pst-live-command-shell strong{color:#2F3437!important}
#pst-native-home-v3 #pn-ask .pst-live-command-shell p,#pst-native-home-v3 #pn-ask .pst-live-command-shell small,#pst-native-home-v3 #pn-ask .pst-live-command-shell span{color:#77746E!important}
#pst-native-home-v3 #pn-ask .pst-live-command-shell form{margin-top:10px!important;background:#F0ECE3!important;border:1px solid #DED8CC!important;border-radius:9px!important;padding:7px!important}
#pst-native-home-v3 #pn-ask .pst-live-command-shell input,#pst-native-home-v3 #pn-ask .pst-live-command-shell textarea{background:transparent!important;color:#2F3437!important;border:0!important;box-shadow:none!important}
#pst-native-home-v3 #pn-ask .pst-live-command-shell button{background:#B08A57!important;border-color:#B08A57!important;color:#fff!important;border-radius:8px!important;box-shadow:none!important}
@media(max-width:720px){#pst-ui-recovery-clean{align-items:stretch;flex-direction:column}.pst-rec-actions{justify-content:flex-end}}
`;
  document.head.appendChild(s);
}

function installWarmEarthTheme(){
  var id='pst-warm-earth-theme-v1',s=document.getElementById(id);
  if(!s){s=document.createElement('style');s.id=id;s.textContent=`
html.pst-native-ui-ready{--bg:#F4F1EA!important;--bg2:#FBFAF7!important;--bg3:#F0ECE3!important;--text:#2F3437!important;--text2:#4D514F!important;--text3:#77746E!important;--border:#DED8CC!important;--border2:#D4CCBE!important;--bronze:#B08A57!important;--bronze-bg:#EEE7D8!important;--blue:#6E8793!important;--pst-warm-bg:#F4F1EA;--pst-warm-card:#FBFAF7;--pst-warm-soft:#F0ECE3;--pst-warm-line:#DED8CC;--pst-warm-text:#2F3437;--pst-warm-muted:#77746E;--pst-warm-primary:#B08A57;--pst-warm-primary-hover:#9A7443;--pst-warm-blue:#6E8793;--pst-warm-success:#71836D;--pst-warm-warning:#B78B4A;--pst-warm-danger:#A96F63}
html.pst-native-ui-ready,html.pst-native-ui-ready body,html.pst-native-ui-ready .content,html.pst-native-ui-ready .page,html.pst-native-ui-ready [id^="page-workspace-"]{background:#F4F1EA!important;color:#2F3437!important}
html.pst-native-ui-ready body{background-image:none!important}
html.pst-native-ui-ready .card,html.pst-native-ui-ready .pst-card{background:#FBFAF7!important;border-color:#DED8CC!important;box-shadow:0 6px 20px rgba(69,59,44,.04)!important}
html.pst-native-ui-ready input,html.pst-native-ui-ready textarea,html.pst-native-ui-ready select{accent-color:#B08A57}
html.pst-native-ui-ready input:focus,html.pst-native-ui-ready textarea:focus,html.pst-native-ui-ready select:focus{border-color:#B08A57!important;box-shadow:0 0 0 3px rgba(176,138,87,.10)!important;outline:none!important}
html.pst-native-ui-ready #pst-ws-sidebar,html.pst-native-ui-ready .sidebar{background:#FAF8F3!important;border-right:1px solid #DED8CC!important;box-shadow:none!important}
html.pst-native-ui-ready #pst-ws-sidebar .pst-ws-create{background:#B08A57!important;border-color:#B08A57!important;color:#fff!important;box-shadow:none!important}
html.pst-native-ui-ready #pst-ws-sidebar .pst-ws-create:hover{background:#9A7443!important;border-color:#9A7443!important}
html.pst-native-ui-ready #pst-ws-canonical-nav .pst-ws-navbtn{background:transparent!important;border-color:transparent!important;color:#616662!important}
html.pst-native-ui-ready #pst-ws-canonical-nav .pst-ws-navbtn:hover{background:#F2EEE6!important;border-color:#E5DED2!important;color:#2F3437!important}
html.pst-native-ui-ready #pst-ws-canonical-nav .pst-ws-navbtn.active{background:#EEE7D8!important;border-color:#DDD2BF!important;color:#80633D!important}
html.pst-native-ui-ready #pst-ws-canonical-nav .pst-ws-navbtn.active:before{background:#B08A57!important}
html.pst-native-ui-ready #pst-ws-canonical-nav .pst-ws-badge{background:#F0ECE3!important;color:#77746E!important}
html.pst-native-ui-ready #page-workspace-home,html.pst-native-ui-ready #pst-native-home-v3{background:#F4F1EA!important;color:#2F3437!important}
html.pst-native-ui-ready #pst-native-home-v3 .pn-kicker,html.pst-native-ui-ready #pst-native-home-v3 .pn-head p,html.pst-native-ui-ready #pst-native-home-v3 .pn-card>header span{color:#8A806F!important}
html.pst-native-ui-ready #pst-native-home-v3 .pn-live{background:#FBFAF7!important;border-color:#DED8CC!important;color:#77746E!important}
html.pst-native-ui-ready #pst-native-home-v3 .pn-kpi,html.pst-native-ui-ready #pst-native-home-v3 .pn-card,html.pst-native-ui-ready #pst-native-home-v3 .pn-ask-wait{background:#FBFAF7!important;border-color:#DED8CC!important;box-shadow:0 6px 20px rgba(69,59,44,.035)!important}
html.pst-native-ui-ready #pst-native-home-v3 .pn-kpi:hover,html.pst-native-ui-ready #pst-native-home-v3 .pn-card:hover{border-color:#CFC3AF!important;box-shadow:0 8px 24px rgba(69,59,44,.055)!important}
html.pst-native-ui-ready #pst-native-home-v3 .pn-kpi:nth-child(-n+2):after{background:#B08A57!important;opacity:.72!important}
html.pst-native-ui-ready #pst-native-home-v3 .pn-card>header{border-bottom-color:#E6E0D5!important}
html.pst-native-ui-ready #pst-native-home-v3 .pn-card>header button{color:#8A683F!important}
html.pst-native-ui-ready #pst-native-home-v3 .pn-row{border-bottom-color:#E9E3D8!important}
html.pst-native-ui-ready #pst-native-home-v3 .pn-row:hover{background:#F6F2EA!important}
html.pst-native-ui-ready #pst-native-home-v3 .pn-row>i{background:#6E8793!important}
html.pst-native-ui-ready #pst-native-home-v3 .pn-row.warn>i{background:#B78B4A!important}html.pst-native-ui-ready #pst-native-home-v3 .pn-row.danger>i{background:#A96F63!important}html.pst-native-ui-ready #pst-native-home-v3 .pn-row.good>i{background:#71836D!important}
html.pst-native-ui-ready #pst-native-home-v3 .pn-clear{color:#63735F!important}html.pst-native-ui-ready #pst-native-home-v3 .pn-clear i{background:#E9EFE6!important;color:#71836D!important}
html.pst-native-ui-ready #pst-native-home-v3 .pn-donut{background:conic-gradient(#B08A57 0 calc(var(--a)*1%),#B78B4A calc(var(--a)*1%) calc(var(--b)*1%),#6E8793 calc(var(--b)*1%) calc(var(--c)*1%),#D9D4CA calc(var(--c)*1%) 100%)!important}
html.pst-native-ui-ready #pst-native-home-v3 .pn-donut:after{background:#FBFAF7!important}
html.pst-native-ui-ready #pst-native-home-v3 .pn-legend button:hover{background:#F2EEE6!important}
html.pst-native-ui-ready #pst-native-home-v3 .pn-funnel div{background:#E7E1D6!important}html.pst-native-ui-ready #pst-native-home-v3 .pn-funnel i{background:#6E8793!important}
html.pst-native-ui-ready #pst-native-home-v3 #pn-ask .pst-live-command-shell{background:#FBFAF7!important;border-color:#DED8CC!important;border-left-color:#B08A57!important;box-shadow:0 6px 20px rgba(69,59,44,.045)!important}
html.pst-native-ui-ready #pst-native-home-v3 #pn-ask .pst-live-command-shell form{background:#F0ECE3!important;border-color:#DED8CC!important}
html.pst-native-ui-ready #pst-native-home-v3 #pn-ask .pst-live-command-shell button{background:#B08A57!important;border-color:#B08A57!important}html.pst-native-ui-ready #pst-native-home-v3 #pn-ask .pst-live-command-shell button:hover{background:#9A7443!important;border-color:#9A7443!important}
html.pst-native-ui-ready #page-workspace-projects{background:#F4F1EA!important}
html.pst-native-ui-ready #page-workspace-projects .pst-pm-eyebrow{color:#8A806F!important}
html.pst-native-ui-ready #page-workspace-projects .pst-pm-controls,html.pst-native-ui-ready #page-workspace-projects .pst-pm-row,html.pst-native-ui-ready #page-workspace-projects .pst-pm-phase,html.pst-native-ui-ready #page-workspace-projects .pst-pm-empty,html.pst-native-ui-ready #page-workspace-projects .pst-pm-loading{background:#FBFAF7!important;border-color:#DED8CC!important;box-shadow:0 5px 18px rgba(69,59,44,.035)!important}
html.pst-native-ui-ready #page-workspace-projects .pst-pm-btn,html.pst-native-ui-ready #page-workspace-projects .pst-pm-more,html.pst-native-ui-ready #page-workspace-projects .pst-pm-search,html.pst-native-ui-ready #page-workspace-projects .pst-pm-select,html.pst-native-ui-ready #page-workspace-projects .pst-pm-chip{background:#FBFAF7!important;border-color:#D8D0C2!important;color:#5F625F!important}
html.pst-native-ui-ready #page-workspace-projects .pst-pm-btn.primary,html.pst-native-ui-ready #page-workspace-projects .pst-pm-open{background:#B08A57!important;border-color:#B08A57!important;color:#fff!important}
html.pst-native-ui-ready #page-workspace-projects .pst-pm-chip.on,html.pst-native-ui-ready #page-workspace-projects .pst-pm-chip:hover{background:#EEE7D8!important;border-color:#D8C9AE!important;color:#80633D!important}
html.pst-native-ui-ready #page-workspace-projects .pst-pm-toggle,html.pst-native-ui-ready #page-workspace-projects .pst-pm-col,html.pst-native-ui-ready #page-workspace-projects .pst-pm-col-head{background:#F0ECE3!important;border-color:#DED8CC!important}
html.pst-native-ui-ready #page-workspace-projects .pst-pm-toggle button.on{background:#FBFAF7!important;color:#80633D!important}
html.pst-native-ui-ready #page-workspace-projects .pst-pm-row:hover{border-color:#CFC3AF!important;box-shadow:0 7px 22px rgba(69,59,44,.055)!important}
html.pst-native-ui-ready #page-workspace-projects .pst-pm-name{color:#2F3437!important}html.pst-native-ui-ready #page-workspace-projects .pst-pm-client,html.pst-native-ui-ready #page-workspace-projects .pst-pm-desc,html.pst-native-ui-ready #page-workspace-projects .pst-pm-meta-label{color:#817D75!important}html.pst-native-ui-ready #page-workspace-projects .pst-pm-meta-value{color:#5F625F!important}
html.pst-native-ui-ready #page-workspace-project{background:#F4F1EA!important}
html.pst-native-ui-ready #page-workspace-project .pst-pi-tabs{background:#FBFAF7!important;border-color:#DED8CC!important;box-shadow:0 4px 16px rgba(69,59,44,.03)!important}
html.pst-native-ui-ready #page-workspace-project .pst-pi-tab{color:#696C68!important}html.pst-native-ui-ready #page-workspace-project .pst-pi-tab.on{background:#EEE7D8!important;color:#80633D!important}
html.pst-native-ui-ready #page-workspace-project .pf2-card,html.pst-native-ui-ready #page-workspace-project .pf2-current,html.pst-native-ui-ready #page-workspace-project .pf2-next,html.pst-native-ui-ready #page-workspace-project .pf2-summary-tile,html.pst-native-ui-ready #page-workspace-project .pf2-attention,html.pst-native-ui-ready #page-workspace-project .pf2-gate,html.pst-native-ui-ready #page-workspace-project .pf2-shortcut{background:#FBFAF7!important;border-color:#DED8CC!important;box-shadow:0 5px 18px rgba(69,59,44,.035)!important}
html.pst-native-ui-ready #page-workspace-project .pf2-next{border-left-color:#B08A57!important}html.pst-native-ui-ready #page-workspace-project .pf2-btn.p{background:#B08A57!important;border-color:#B08A57!important;color:#fff!important}html.pst-native-ui-ready #page-workspace-project .pf2-btn{background:#FBFAF7!important;border-color:#D8D0C2!important;color:#5F625F!important}
html.pst-native-ui-ready #page-workspace-project .pf2-badge.info{background:#EEE7D8!important;color:#80633D!important}html.pst-native-ui-ready #page-workspace-project .pf2-line,html.pst-native-ui-ready #page-workspace-project .pf2-mail,html.pst-native-ui-ready #page-workspace-project .pf2-time{border-color:#E5DED2!important}html.pst-native-ui-ready #page-workspace-project .pf2-mail p{background:#F0ECE3!important}
html.pst-native-ui-ready #fin-hub,html.pst-native-ui-ready #page-finance,html.pst-native-ui-ready #page-workspace-finance{background:#F4F1EA!important}
html.pst-native-ui-ready #fin-hub-grid>div[onclick*="finSwitchTab"],html.pst-native-ui-ready #fin-hub-grid>a,html.pst-native-ui-ready [id^="fin-view-"] .card,html.pst-native-ui-ready [id^="fin-view-"] .fin-card,html.pst-native-ui-ready #fin-inv-sum>div{background:#FBFAF7!important;border-color:#DED8CC!important;box-shadow:0 5px 18px rgba(69,59,44,.035)!important}
html.pst-native-ui-ready #fin-hub-grid>div[onclick*="finSwitchTab"]:hover,html.pst-native-ui-ready #fin-hub-grid>a:hover{border-color:#CFC3AF!important;box-shadow:0 7px 22px rgba(69,59,44,.055)!important}
html.pst-native-ui-ready #fin-hub-grid>div[onclick*="finSwitchTab"]>div:first-child{background:#B08A57!important}html.pst-native-ui-ready #fin-hub-grid>a{background:#F7F3EC!important}
html.pst-native-ui-ready #fin-tabs button.active,html.pst-native-ui-ready #fin-tabs button.on{background:#EEE7D8!important;color:#80633D!important;border-color:#D8C9AE!important}html.pst-native-ui-ready [id^="fin-view-"] table th,html.pst-native-ui-ready #fin-inv-list table th{background:#F0ECE3!important;color:#77746E!important;border-color:#DED8CC!important}html.pst-native-ui-ready [id^="fin-view-"] table td,html.pst-native-ui-ready #fin-inv-list table td{border-color:#E5DED2!important}
html.pst-native-ui-ready #page-kek-tenders{background:#F4F1EA!important}
html.pst-native-ui-ready #page-kek-tenders #pst-opportunities-focus,html.pst-native-ui-ready #page-kek-tenders .card,html.pst-native-ui-ready #page-kek-tenders .pst-card,html.pst-native-ui-ready #page-kek-tenders .pst-pwf-card,html.pst-native-ui-ready #page-kek-tenders .pst-ted-card{background:#FBFAF7!important;border-color:#DED8CC!important;box-shadow:0 5px 18px rgba(69,59,44,.035)!important}
html.pst-native-ui-ready #page-kek-tenders .pst-pwf-card:hover,html.pst-native-ui-ready #page-kek-tenders .pst-ted-card:hover{border-color:#CFC3AF!important;box-shadow:0 7px 22px rgba(69,59,44,.055)!important}
html.pst-native-ui-ready #page-kek-tenders table th{background:#F0ECE3!important;color:#77746E!important;border-color:#DED8CC!important}html.pst-native-ui-ready #page-kek-tenders table td{border-color:#E5DED2!important}
html.pst-native-ui-ready #page-kek-tenders button.primary,html.pst-native-ui-ready #page-kek-tenders .btn-primary,html.pst-native-ui-ready #page-kek-tenders button[style*="#185FA5"],html.pst-native-ui-ready #page-kek-tenders button[style*="#3F7F98"]{background:#B08A57!important;border-color:#B08A57!important;color:#fff!important}
html.pst-native-ui-ready #page-kek-tenders button:not(.primary):not(.btn-primary),html.pst-native-ui-ready #pst-pcw-ted-sales-link{background:#FBFAF7!important;border-color:#D8D0C2!important;color:#80633D!important;box-shadow:none!important}
html.pst-native-ui-ready #page-kek-tenders [class*="chip"],html.pst-native-ui-ready #page-kek-tenders [class*="pill"],html.pst-native-ui-ready #page-kek-tenders [class*="badge"]{border-color:#DDD3C2!important}
html.pst-native-ui-ready #page-workspace-contacts,html.pst-native-ui-ready #page-contacts,html.pst-native-ui-ready #page-workspace-apps,html.pst-native-ui-ready #page-document-center,html.pst-native-ui-ready #page-settings{background:#F4F1EA!important}
html.pst-native-ui-ready #page-workspace-contacts .pcm-card,html.pst-native-ui-ready #page-contacts .pcm-card,html.pst-native-ui-ready #page-workspace-apps .card,html.pst-native-ui-ready #page-document-center .card,html.pst-native-ui-ready #page-settings .card{background:#FBFAF7!important;border-color:#DED8CC!important;box-shadow:0 5px 18px rgba(69,59,44,.035)!important}
html.pst-native-ui-ready #page-workspace-contacts table th,html.pst-native-ui-ready #page-contacts table th,html.pst-native-ui-ready #page-document-center table th{background:#F0ECE3!important;color:#77746E!important}
html.pst-native-ui-ready .status-success,html.pst-native-ui-ready .badge-success,html.pst-native-ui-ready [class*="status"][class*="green"]{background:#E8EEE5!important;color:#61705D!important;border-color:#D3DDCF!important}
html.pst-native-ui-ready .status-warning,html.pst-native-ui-ready .badge-warning{background:#F3EBDD!important;color:#8D6A34!important;border-color:#E4D4B9!important}
html.pst-native-ui-ready .status-danger,html.pst-native-ui-ready .badge-danger{background:#F3E6E2!important;color:#8B5D54!important;border-color:#E3CFC9!important}
`;}else if(s.parentNode){s.parentNode.removeChild(s);}
  document.head.appendChild(s);
}

function cleanVisibleUi(){installRecoveryGate();normalizeNav();translateAsk();suppressLegacyRecovery();installWarmEarthTheme();}
function boundedCleanup(){if(cleanupStarted){cleanVisibleUi();return;}cleanupStarted=true;[0,250].forEach(function(ms){setTimeout(cleanVisibleUi,ms);});}

installOwnershipCss();installWarmEarthTheme();installRecoveryGate();
[0,40,120,300].forEach(function(ms){setTimeout(installRecoveryGate,ms);});

document.addEventListener('pst:modules-ready',function(){cleanVisibleUi();setTimeout(cleanVisibleUi,250);},{once:true});
document.addEventListener('pst:home-canonical-rendered',function(){setTimeout(cleanVisibleUi,0);});
document.addEventListener('click',function(){setTimeout(function(){normalizeNav();translateAsk();installWarmEarthTheme();},0);},true);
window.addEventListener('pageshow',boundedCleanup,{once:true});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boundedCleanup,{once:true});else boundedCleanup();

function loadCore(){
  if(document.querySelector('script[data-pst-native-ui-v3-core]'))return;
  var s=document.createElement('script');s.src='pristeel-native-ui-v3-core.js?v=20260901-ownership1';s.defer=true;s.setAttribute('data-pst-native-ui-v3-core','1');
  s.onload=function(){installOwnershipCss();installWarmEarthTheme();boundedCleanup();};
  s.onerror=function(){console.error('Native UI v3 core failed to load');};document.head.appendChild(s);
}
loadCore();
window.PSTUiOwnershipCleanupV1={apply:cleanVisibleUi,installRecoveryGate:installRecoveryGate,installWarmEarthTheme:installWarmEarthTheme};
})();