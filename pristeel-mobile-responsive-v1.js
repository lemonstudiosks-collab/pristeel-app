/* PRISTEEL Mobile Responsive v1
 * Presentation/navigation-only mobile shell.
 * Reuses canonical PPPP navigation and existing business/data owners.
 * No Supabase reads/writes, no polling, no outbound actions.
 */
(function(){
'use strict';
if(window.__pstMobileResponsiveV1)return;
window.__pstMobileResponsiveV1=true;

var ITEMS=[
  {key:'home',label:'Ballina',icon:'<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10.5V20h13v-9.5"/><path d="M9.5 20v-5h5v5"/>'},
  {key:'tenders',label:'Mundësitë',icon:'<path d="M4 5h16v14H4z"/><path d="M8 9h8M8 13h8M8 17h5"/>'},
  {key:'projects',label:'Projektet',icon:'<path d="M3.5 7.5h7l2 2h8v10h-17z"/><path d="M3.5 7.5V5h7l2 2"/>'},
  {key:'contacts',label:'Partnerët',icon:'<circle cx="9" cy="8" r="3"/><path d="M3.5 19c.5-4 2.5-6 5.5-6s5 2 5.5 6"/><path d="M16 8h4M18 6v4"/>'},
  {key:'finance',label:'Financat',icon:'<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 10h18M16 14h2"/>'},
  {key:'apps',label:'Sistemi',icon:'<circle cx="12" cy="12" r="3"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4"/>'}
];

function installCss(){
  if(document.getElementById('pst-mobile-responsive-v1-css'))return;
  var s=document.createElement('style');
  s.id='pst-mobile-responsive-v1-css';
  s.textContent=`
#pst-mobile-nav-v1{display:none}
@media(max-width:900px), (max-device-width:900px){
  html,body{max-width:100%;overflow-x:hidden}
  body #app-shell-root,
  body .app-shell{display:block!important;grid-template-columns:minmax(0,1fr)!important;width:100%!important;max-width:100%!important}
  body #app-sidebar,
  body #pst-v2-sidebar,
  body #pst-ws-sidebar,
  body #app-shell-root>.sidebar,
  body .app-shell>.sidebar{display:none!important}
  body #app-shell-root>.main,
  body .app-shell>.main{width:100%!important;max-width:100%!important;min-width:0!important;margin:0!important}
  body .content{max-width:100%!important;min-width:0!important;padding-left:12px!important;padding-right:12px!important;padding-bottom:calc(88px + env(safe-area-inset-bottom))!important}
  body .topbar{max-width:100%!important;min-width:0!important;padding-left:12px!important;padding-right:12px!important;gap:8px!important;flex-wrap:wrap!important}
  body .page{max-width:100%!important;min-width:0!important}
  body input,body select,body textarea{max-width:100%}
  #pst-mobile-nav-v1{
    position:fixed!important;left:0!important;right:0!important;bottom:0!important;z-index:2147483000!important;
    display:grid!important;visibility:visible!important;opacity:1!important;pointer-events:auto!important;
    grid-template-columns:repeat(6,minmax(0,1fr));
    padding:6px 6px calc(6px + env(safe-area-inset-bottom));
    background:rgba(255,255,255,.96);border-top:1px solid rgba(28,39,49,.12);
    box-shadow:0 -6px 22px rgba(24,34,44,.08);
    backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)
  }
  #pst-mobile-nav-v1 button{
    appearance:none;border:0;background:transparent;color:#6D7880;
    min-width:0;min-height:48px;padding:4px 2px;border-radius:10px;
    display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;
    font:650 8.5px/1.1 -apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif;
    cursor:pointer;-webkit-tap-highlight-color:transparent;overflow:hidden;pointer-events:auto!important;touch-action:manipulation
  }
  #pst-mobile-nav-v1 button svg{width:20px;height:20px;flex:0 0 auto;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
  #pst-mobile-nav-v1 button span{display:block;max-width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  #pst-mobile-nav-v1 button.active{color:var(--pst-section-deep,#34758B);background:var(--pst-section-soft,#EEF5F7)}
  #pst-mobile-nav-v1 button:focus-visible{outline:2px solid var(--pst-section-accent,#4F97AF);outline-offset:-2px}
  body #util-fab{bottom:calc(78px + env(safe-area-inset-bottom))!important;right:10px!important}
  body div[onclick="openCmdK()"][title^="Kërko"]{bottom:calc(78px + env(safe-area-inset-bottom))!important;left:10px!important;padding:7px 10px!important}
  body div[onclick="openCmdK()"][title^="Kërko"]>span:last-child{display:none!important}
  body #mini-calc{max-width:calc(100vw - 24px)!important;right:12px!important}
  body #cmdk-bg{padding-left:12px!important;padding-right:12px!important}
  body .pst-ws-table,
  body .table-wrap,
  body .table-responsive{max-width:100%!important;overflow-x:auto!important;-webkit-overflow-scrolling:touch}
  body .ov-modal,
  body .pst-modal,
  body [role="dialog"]{max-width:calc(100vw - 16px)!important;max-height:calc(100dvh - 20px)!important}
  body button,body [role="button"],body .btn{touch-action:manipulation}
  body #page-workspace-project .pst-operating-phase-nav,
  body #page-workspace-project .pwb3-path{scrollbar-width:thin;-webkit-overflow-scrolling:touch}
  body #page-workspace-project .pst-business-phases{min-width:max-content}
}
`;
  document.head.appendChild(s);
}

function zoneFor(key){
  return key==='tenders'?'opportunities':key==='contacts'?'partners':key==='apps'?'system':key;
}
function markMobileRoute(key){
  try{
    if(document.body&&document.body.dataset)document.body.dataset.pstBusinessZone=zoneFor(key);
    if(key!=='home'&&document.body)document.body.classList.remove('pst-mobile-home-active');
  }catch(e){}
}
function route(key){
  key=String(key||'').toLowerCase();
  markMobileRoute(key);
  try{
    var R=window.PSTPrimaryNavResilienceV10||window.PSTPrimaryNavResilienceV9||window.PSTPrimaryNavResilienceV1;
    if(R&&typeof R.route==='function'&&R.route(key)!==false){markMobileRoute(key);return true;}
  }catch(e){}
  var canonical=document.querySelector('#pst-ws-canonical-nav .pst-ws-navbtn[data-key="'+key+'"]');
  if(canonical&&typeof canonical.click==='function'){canonical.click();markMobileRoute(key);return true;}
  if(typeof window.pstWorkspaceGo==='function'){
    if(key==='tenders'){
      try{if(typeof window.pstTenderBizOpenMonitor==='function'){window.pstTenderBizOpenMonitor();markMobileRoute(key);return true;}}catch(e){}
      try{if(typeof window.pstWsKekTenders==='function'){window.pstWsKekTenders();markMobileRoute(key);return true;}}catch(e){}
      return false;
    }
    window.pstWorkspaceGo(key);markMobileRoute(key);return true;
  }
  return false;
}
function activeKey(){
  try{
    var R=window.PSTPrimaryNavResilienceV10||window.PSTPrimaryNavResilienceV9||window.PSTPrimaryNavResilienceV1;
    if(R&&R._test&&typeof R._test.currentKey==='function'){
      var k=R._test.currentKey();
      if(k)return k;
    }
  }catch(e){}
  var active=document.querySelector('#pst-ws-canonical-nav .pst-business-primary.active[data-key],#pst-ws-canonical-nav .pst-ws-navbtn.active[data-key]');
  if(active)return active.getAttribute('data-key');
  var zone=document.body&&document.body.dataset?document.body.dataset.pstBusinessZone:'';
  var byZone={home:'home',opportunities:'tenders',projects:'projects',partners:'contacts',finance:'finance',system:'apps'};
  return byZone[zone]||'home';
}
function sync(){
  var nav=document.getElementById('pst-mobile-nav-v1');if(!nav)return;
  var key=activeKey();
  nav.querySelectorAll('button[data-key]').forEach(function(b){
    var on=b.getAttribute('data-key')===key;
    b.classList.toggle('active',on);
    b.setAttribute('aria-current',on?'page':'false');
  });
}
function ensureNav(){
  var nav=document.getElementById('pst-mobile-nav-v1');
  if(nav){
    if(document.body&&nav.parentNode!==document.body)document.body.appendChild(nav);
    nav.style.removeProperty('display');nav.style.removeProperty('visibility');nav.style.removeProperty('pointer-events');
    sync();return nav;
  }
  nav=document.createElement('nav');
  nav.id='pst-mobile-nav-v1';
  nav.setAttribute('aria-label','Navigimi kryesor në telefon');
  nav.innerHTML=ITEMS.map(function(x){
    return '<button type="button" data-key="'+x.key+'" aria-label="'+x.label+'"><svg viewBox="0 0 24 24" aria-hidden="true">'+x.icon+'</svg><span>'+x.label+'</span></button>';
  }).join('');
  nav.addEventListener('click',function(e){
    var b=e.target&&e.target.closest?e.target.closest('button[data-key]'):null;
    if(!b)return;
    e.preventDefault();e.stopPropagation();
    if(typeof e.stopImmediatePropagation==='function')e.stopImmediatePropagation();
    var key=b.getAttribute('data-key');
    nav.querySelectorAll('button[data-key]').forEach(function(x){x.classList.toggle('active',x===b);});
    markMobileRoute(key);
    route(key);
    setTimeout(function(){ensureNav();sync();},0);
    setTimeout(function(){ensureNav();sync();},80);
    setTimeout(function(){ensureNav();sync();},180);
    setTimeout(function(){ensureNav();sync();},420);
    setTimeout(function(){ensureNav();sync();},900);
  });
  document.body.appendChild(nav);sync();return nav;
}
function schedule(){
  [0,80,220,600].forEach(function(ms){setTimeout(function(){installCss();ensureNav();sync();},ms);});
}
function install(){
  installCss();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
  document.addEventListener('pst:modules-ready',schedule);
  document.addEventListener('pst:home-canonical-rendered',schedule);
  document.addEventListener('pst:project-opened',schedule);
  document.addEventListener('pst:page-opened',schedule);
  document.addEventListener('click',function(e){
    var t=e.target&&e.target.closest?e.target.closest('#pst-ws-canonical-nav [data-key],[onclick*="pstWorkspaceGo"]'):null;
    if(t)setTimeout(sync,80);
  },true);
  window.addEventListener('pageshow',schedule);
  window.addEventListener('hashchange',schedule);
  window.addEventListener('focus',schedule);
}
install();
window.PSTMobileResponsiveV1={schedule:schedule,sync:sync,route:route,_test:{activeKey:activeKey,zoneFor:zoneFor,markMobileRoute:markMobileRoute}};
})();