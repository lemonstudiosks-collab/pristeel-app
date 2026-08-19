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
 * released by pst:visual-ready, with a bounded fail-open below. */
if(typeof window.__pstRuntimeRevealFallback==='undefined')window.__pstRuntimeRevealFallback=-1;

/* Critical startup curtain. This runs before pristeel-roles.js, so the user
 * never sees the legacy module grid or a half-rendered Workspace Home. */
(function installStartupCurtain(){
  if(window.__pstStartupCurtainV1)return;
  window.__pstStartupCurtainV1=true;
  var root=document.documentElement;
  var released=false;
  var failTimer=null;
  var authTimer=null;

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
    if(document.getElementById('pst-startup-curtain-v1-style'))return;
    var s=document.createElement('style');
    s.id='pst-startup-curtain-v1-style';
    s.textContent=`
html.pst-booting,html.pst-booting body{min-height:100%;background:#F3F8FA!important;overflow:hidden!important}
html.pst-booting #app-shell-root,html.pst-booting #auth-gate{opacity:0!important;visibility:hidden!important;pointer-events:none!important}
#pst-startup-shell{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;background:radial-gradient(circle at 72% 18%,rgba(103,168,192,.14),transparent 33%),linear-gradient(145deg,#F8FBFC 0%,#EEF6F8 100%);font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#20282C;opacity:1;transition:opacity .20s ease,visibility .20s ease}
#pst-startup-shell.pst-leaving{opacity:0;visibility:hidden;pointer-events:none}
.pst-startup-card{display:flex;flex-direction:column;align-items:center;gap:13px;text-align:center;transform:translateY(-2vh)}
.pst-startup-mark{width:48px;height:48px;border-radius:15px;background:linear-gradient(145deg,#67A8C0,#3F7F98);box-shadow:0 14px 34px rgba(63,127,152,.22);display:grid;place-items:center;color:#fff}
.pst-startup-mark svg{width:25px;height:25px;fill:currentColor}
.pst-startup-name{font-size:20px;line-height:1;font-weight:790;letter-spacing:.4px}
.pst-startup-copy{font-size:11px;color:#78868D;letter-spacing:.1px;max-width:290px}
.pst-startup-line{width:126px;height:3px;border-radius:999px;background:#DCE9ED;overflow:hidden;margin-top:4px}
.pst-startup-line i{display:block;width:38%;height:100%;border-radius:inherit;background:linear-gradient(90deg,#67A8C0,#3F7F98);animation:pstStartupMove 1.1s ease-in-out infinite}
@keyframes pstStartupMove{0%{transform:translateX(-110%)}55%{transform:translateX(165%)}100%{transform:translateX(300%)}}
`;
    document.head.appendChild(s);
  }
  function ensureShell(){
    if(document.getElementById('pst-startup-shell'))return;
    var host=document.body||document.documentElement;if(!host)return;
    var shell=document.createElement('div');shell.id='pst-startup-shell';
    shell.innerHTML='<div class="pst-startup-card"><div class="pst-startup-mark"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1.8c.7 5.45 4.75 9.5 10.2 10.2-5.45.7-9.5 4.75-10.2 10.2C11.3 16.75 7.25 12.7 1.8 12 7.25 11.3 11.3 7.25 12 1.8Z"/></svg></div><div class="pst-startup-name">PRISTEEL</div><div class="pst-startup-copy">Duke përgatitur workspace-in…</div><div class="pst-startup-line"><i></i></div></div>';
    host.appendChild(shell);
  }
  function begin(){
    if(released)return;
    ensureCss();root.classList.add('pst-booting');ensureShell();
    clearTimeout(failTimer);
    failTimer=setTimeout(function(){release('fallback');},30000);
    clearTimeout(authTimer);
    authTimer=setTimeout(function(){
      if(released)return;
      var gate=document.getElementById('auth-gate'),app=document.getElementById('app-shell-root');
      if(intendedVisible(gate)&&!intendedVisible(app))release('auth');
    },2500);
  }
  function release(reason){
    if(released)return;
    released=true;clearTimeout(failTimer);clearTimeout(authTimer);
    root.classList.remove('pst-booting');
    if(reason!=='auth')root.classList.add('pst-runtime-ready');
    var shell=document.getElementById('pst-startup-shell');
    if(shell){shell.classList.add('pst-leaving');setTimeout(function(){if(shell.parentNode)shell.remove();},240);}
  }
  function onVisualReady(){
    var gate=document.getElementById('auth-gate'),app=document.getElementById('app-shell-root');
    if(!hasStoredSession()&&intendedVisible(gate)&&!intendedVisible(app)){release('auth');return;}
    release('app');
  }
  document.addEventListener('pst:visual-ready',onVisualReady);
  document.addEventListener('DOMContentLoaded',function(){ensureShell();if(!hasStoredSession())setTimeout(function(){var g=document.getElementById('auth-gate'),a=document.getElementById('app-shell-root');if(intendedVisible(g)&&!intendedVisible(a))release('auth');},250);},{once:true});
  window.addEventListener('load',function(){if(!hasStoredSession()){var g=document.getElementById('auth-gate'),a=document.getElementById('app-shell-root');if(intendedVisible(g)&&!intendedVisible(a))release('auth');}},{once:true});
  window.PSTStartupCurtainV1={release:release,isReleased:function(){return released;}};
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