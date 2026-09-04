/* PRISTEEL global search compatibility/router
 * Loaded directly by pristeel-procurement.html before the redesign bootstrap.
 * Owns global search routing plus the critical startup curtain that prevents
 * legacy/intermediate layouts from becoming visible before final Home is ready.
 * The search UI/data engine lives in pristeel-search-stable-v2.js.
 */
(function(){
'use strict';
if(window.__pstSearchAuthorityInstalled)return;
window.__pstSearchAuthorityInstalled=true;

/* Prevent the legacy Home-only 12s reveal in roles. Startup visibility is
 * released only after the full runtime, visual owner and final cosmetic pass
 * are ready, with a progress-aware bounded fail-open below. */
if(typeof window.__pstRuntimeRevealFallback==='undefined')window.__pstRuntimeRevealFallback=-1;

/* Warm the long ordered runtime without changing execution order. The actual
 * bootstrap remains strictly sequential; these exact first-attempt URLs are
 * only fetched into the browser cache early so later script insertion does not
 * pay one network round-trip per module. */
(function warmRuntimeAssets(){
  if(window.__pstRuntimeAssetsWarmV1)return;
  window.__pstRuntimeAssetsWarmV1=true;
  if(typeof window.fetch!=='function')return;
  window.fetch('pristeel-project-emails.js',{credentials:'same-origin',cache:'force-cache'}).then(function(r){return r&&r.ok?r.text():'';}).then(function(text){
    var block=String(text||'').match(/var files=\[([\s\S]*?)\];/);if(!block)return;
    var re=/'([^']+\.js\?[^']+)'/g,m,seen={},urls=[];
    while((m=re.exec(block[1]))){
      var src=m[1];
      if(src.indexOf('pristeel-project-open-direct-v1.js?')===0)src+='&pst_hotfix=20260830-navrepair2';
      if(!seen[src]){seen[src]=1;urls.push(src);}
    }
    urls.forEach(function(src){
      var l=document.createElement('link');l.rel='preload';l.as='script';l.href=src;l.setAttribute('data-pst-runtime-preload','1');document.head.appendChild(l);
    });
  }).catch(function(){});
})();

/* Critical startup curtain. This runs before pristeel-roles.js. It deliberately
 * uses its own class and shell id so later compatibility startup guards cannot
 * remove the final curtain while the sequential runtime is still executing. */
(function installStartupCurtain(){
  if(window.__pstStartupCurtainV2)return;
  window.__pstStartupCurtainV2=true;window.__pstStartupCurtainV1=true;
  var root=document.documentElement;
  var released=false;
  var modulesReady=!!window.__pstModulesReady;
  var visualReady=false;
  var cosmeticsReady=root.classList.contains('pst-final-cosmetics-ready');
  var releaseScheduled=false;
  var authTimer=null;
  var cosmeticFallback=null;
  var watchdogTimer=null;
  var hardTimer=null;
  var startedAt=Date.now();
  var lastProgressAt=startedAt;
  var lastProgressSig='';

  function hasStoredSession(){
    try{
      if(localStorage.getItem('pristeel_session'))return true;
      if(localStorage.getItem('pst_auth_remembered_session_v3'))return true;
    }catch(e){}
    return false;
  }
  function intendedVisible(el){
    if(!el||el.hidden)return false;
    try{var cs=window.getComputedStyle?window.getComputedStyle(el):null;if(cs&&(cs.display==='none'||cs.visibility==='hidden'))return false;}catch(e){}
    return !(el.style&&el.style.display==='none');
  }
  function ensureCss(){
    if(document.getElementById('pst-stable-startup-curtain-style'))return;
    var s=document.createElement('style');
    s.id='pst-stable-startup-curtain-style';
    s.textContent=`
html.pst-stable-booting,html.pst-stable-booting body{min-height:100%;background:#F7F6F3!important;overflow:hidden!important}
html.pst-stable-booting #app-shell-root,html.pst-stable-booting #auth-gate{opacity:0!important;visibility:hidden!important;pointer-events:none!important}
html.pst-stable-booting #app-shell-root *,html.pst-stable-booting #auth-gate *{animation:none!important;transition:none!important}
#pst-stable-startup-shell{position:fixed;inset:0;z-index:2147483600;display:flex;align-items:center;justify-content:center;background:#F7F6F3;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#2F3437;opacity:1;transition:opacity .18s ease,visibility .18s ease}
#pst-stable-startup-shell.pst-leaving{opacity:0;visibility:hidden;pointer-events:none}
.pst-startup-card{display:flex;flex-direction:column;align-items:center;gap:13px;text-align:center;transform:translateY(-2vh)}
.pst-startup-mark{width:48px;height:48px;border-radius:14px;background:#4F97AF;box-shadow:0 10px 26px rgba(79,151,175,.15);display:grid;place-items:center;color:#fff}
.pst-startup-mark svg{width:25px;height:25px;fill:currentColor}
.pst-startup-name{font-size:20px;line-height:1;font-weight:790;letter-spacing:.4px}
.pst-startup-copy{font-size:11px;color:#7D8589;letter-spacing:.1px;max-width:290px}
.pst-startup-line{width:126px;height:3px;border-radius:999px;background:#E1E8EA;overflow:hidden;margin-top:4px}
.pst-startup-line i{display:block;width:38%;height:100%;border-radius:inherit;background:#4F97AF;animation:pstStartupMove 1.05s ease-in-out infinite}
@keyframes pstStartupMove{0%{transform:translateX(-110%)}55%{transform:translateX(165%)}100%{transform:translateX(300%)}}
`;
    document.head.appendChild(s);
  }
  function ensureShell(){
    if(document.getElementById('pst-stable-startup-shell'))return;
    var host=document.body||document.documentElement;if(!host)return;
    var shell=document.createElement('div');shell.id='pst-stable-startup-shell';
    shell.innerHTML='<div class="pst-startup-card"><div class="pst-startup-mark"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1.8c.7 5.45 4.75 9.5 10.2 10.2-5.45.7-9.5 4.75-10.2 10.2C11.3 16.75 7.25 12.7 1.8 12 7.25 11.3 11.3 7.25 12 1.8Z"/></svg></div><div class="pst-startup-name">PRISTEEL</div><div class="pst-startup-copy" id="pst-stable-startup-copy">Duke përgatitur platformën…</div><div class="pst-startup-line"><i></i></div></div>';
    host.appendChild(shell);
  }
  function setCopy(text){var e=document.getElementById('pst-stable-startup-copy');if(e&&e.textContent!==text)e.textContent=text;}
  function progressSignature(){
    var d=window.__pstBootstrapDiagnostics||{};
    return [d.loaded||0,(d.errors||[]).length,(d.timeouts||[]).length,(d.retries||[]).length,d.completed?1:0,window.__pstModulesReady?1:0].join('|');
  }
  function watchdog(){
    if(released)return;
    var sig=progressSignature(),now=Date.now();
    if(sig!==lastProgressSig){lastProgressSig=sig;lastProgressAt=now;}
    if(now-lastProgressAt>26000){release('stalled-bootstrap');return;}
    watchdogTimer=setTimeout(watchdog,2500);
  }
  function begin(){
    if(released)return;
    ensureCss();root.classList.add('pst-stable-booting');ensureShell();
    lastProgressSig=progressSignature();lastProgressAt=Date.now();
    clearTimeout(watchdogTimer);watchdogTimer=setTimeout(watchdog,2500);
    clearTimeout(hardTimer);hardTimer=setTimeout(function(){release('hard-fallback');},120000);
    clearTimeout(authTimer);
    authTimer=setTimeout(function(){
      if(released||hasStoredSession())return;
      var gate=document.getElementById('auth-gate'),app=document.getElementById('app-shell-root');
      if(intendedVisible(gate)&&!intendedVisible(app))release('auth');
    },2500);
  }
  function release(reason){
    if(released)return;
    released=true;clearTimeout(authTimer);clearTimeout(cosmeticFallback);clearTimeout(watchdogTimer);clearTimeout(hardTimer);
    root.classList.remove('pst-stable-booting');
    /* If a compatibility startup guard still owns pst-booting, the final stable
     * coordinator is now authoritative and may release that class as well. */
    if(reason!=='auth')root.classList.remove('pst-booting');
    if(reason!=='auth')root.classList.add('pst-runtime-ready');
    var shell=document.getElementById('pst-stable-startup-shell');
    if(shell){shell.classList.add('pst-leaving');setTimeout(function(){if(shell.parentNode)shell.remove();},220);}
  }
  function scheduleFinalRelease(){
    if(released||releaseScheduled||!modulesReady||!visualReady||!cosmeticsReady)return;
    releaseScheduled=true;
    setCopy('Gati…');
    var raf=window.requestAnimationFrame||function(cb){return setTimeout(cb,16);};
    raf(function(){raf(function(){setTimeout(function(){release('app');},90);});});
  }
  function maybeCosmeticFallback(){
    if(released||cosmeticsReady||!modulesReady||!visualReady||cosmeticFallback)return;
    cosmeticFallback=setTimeout(function(){
      cosmeticFallback=null;if(released||cosmeticsReady)return;cosmeticsReady=true;scheduleFinalRelease();
    },4000);
  }
  function onModulesReady(){modulesReady=true;lastProgressAt=Date.now();setCopy('Duke stabilizuar pamjen finale…');scheduleFinalRelease();maybeCosmeticFallback();}
  function onVisualReady(){
    var gate=document.getElementById('auth-gate'),app=document.getElementById('app-shell-root');
    if(!hasStoredSession()&&intendedVisible(gate)&&!intendedVisible(app)){release('auth');return;}
    visualReady=true;
    if(root.classList.contains('pst-final-cosmetics-ready'))cosmeticsReady=true;
    scheduleFinalRelease();maybeCosmeticFallback();
  }
  function onCosmeticsReady(){cosmeticsReady=true;scheduleFinalRelease();}
  document.addEventListener('pst:modules-ready',onModulesReady);
  document.addEventListener('pst:visual-ready',onVisualReady);
  document.addEventListener('pst:cosmetics-ready',onCosmeticsReady);
  document.addEventListener('pst-final-cosmetics-ready',onCosmeticsReady);
  document.addEventListener('DOMContentLoaded',function(){ensureShell();if(!hasStoredSession())setTimeout(function(){var g=document.getElementById('auth-gate'),a=document.getElementById('app-shell-root');if(intendedVisible(g)&&!intendedVisible(a))release('auth');},250);},{once:true});
  window.addEventListener('load',function(){if(!hasStoredSession()){var g=document.getElementById('auth-gate'),a=document.getElementById('app-shell-root');if(intendedVisible(g)&&!intendedVisible(a))release('auth');}},{once:true});
  window.PSTStartupCurtainV1={release:release,isReleased:function(){return released;},state:function(){return{modulesReady:modulesReady,visualReady:visualReady,cosmeticsReady:cosmeticsReady,startedAt:startedAt};}};
  window.PSTStartupCurtainV2=window.PSTStartupCurtainV1;
  begin();
})();

var pending=null;
function stable(){return window.PSTSearchStableV2&&typeof window.PSTSearchStableV2.open==='function'?window.PSTSearchStableV2:null;}
function hardClose(){
  pending=null;
  var modal=document.getElementById('pst-bcc');
  if(modal)modal.remove();
  document.body.classList.remove('pst-bcc-open');
  return true;
}
function open(initial){
  var q=typeof initial==='string'?initial:'';
  var engine=stable();
  if(engine){pending=null;engine.open(q);return true;}
  pending=q;
  return true;
}
function flush(){var engine=stable();if(!engine||pending===null)return;var q=pending;pending=null;engine.open(q);}
function searchTrigger(target){return target&&target.closest?target.closest('#pst-bcc-home-search,.pst-bcc-sidebar-search,[onclick*="openCmdK"],[onclick*="pstWsSearch"],[onclick*="pstOpenSearch"]'):null;}
document.addEventListener('click',function(e){
  var modal=document.getElementById('pst-bcc');
  if(modal){
    var closeBtn=e.target&&e.target.closest?e.target.closest('.pst-bcc-close'):null;
    if(closeBtn||e.target===modal){
      e.preventDefault();
      e.stopImmediatePropagation();
      hardClose();
      return;
    }
  }
  var t=searchTrigger(e.target);if(!t)return;
  e.preventDefault();e.stopImmediatePropagation();open('');
},true);
document.addEventListener('keydown',function(e){
  if((e.ctrlKey||e.metaKey)&&String(e.key||'').toLowerCase()==='k'){
    e.preventDefault();e.stopImmediatePropagation();open('');return;
  }
  if(e.key==='Escape'&&document.getElementById('pst-bcc')){
    e.preventDefault();
    e.stopImmediatePropagation();
    hardClose();
  }
},true);
document.addEventListener('pst:modules-ready',flush,{once:true});
window.pstOpenSearch=open;
window.openCmdK=open;
window.PSTLegacySearchShim={open:open,flush:flush,close:hardClose};
})();