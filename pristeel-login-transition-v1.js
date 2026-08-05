/* PRISTEEL login transition guard
 * Covers the old UI while login hands control to the final workspace.
 */
(function(){
'use strict';
if(window.__pstLoginTransitionV1)return;
window.__pstLoginTransitionV1=true;

var root=document.documentElement;
var state={active:false,modules:false,lastMutation:0,observer:null,poll:null,timeout:null,wrapped:false};

var style=document.createElement('style');
style.id='pst-login-transition-style';
style.textContent=`
html.pst-login-switching,html.pst-login-switching body{overflow:hidden!important;background:#F3F8FA!important}
html.pst-login-switching #auth-gate,html.pst-login-switching #app-shell-root{opacity:0!important;visibility:hidden!important;pointer-events:none!important}
#pst-login-transition{position:fixed;inset:0;z-index:2147483001;display:flex;align-items:center;justify-content:center;background:radial-gradient(circle at 72% 18%,rgba(103,168,192,.14),transparent 33%),linear-gradient(145deg,#F8FBFC,#EEF6F8);font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#20282C;opacity:1;transition:opacity .22s ease,visibility .22s ease}
#pst-login-transition.leaving{opacity:0;visibility:hidden;pointer-events:none}
.pst-login-transition-card{display:flex;flex-direction:column;align-items:center;gap:13px;text-align:center;transform:translateY(-2vh)}
.pst-login-transition-mark{width:48px;height:48px;border-radius:15px;background:linear-gradient(145deg,#67A8C0,#3F7F98);box-shadow:0 14px 34px rgba(63,127,152,.22);display:grid;place-items:center;color:#fff}
.pst-login-transition-mark svg{width:25px;height:25px;fill:currentColor}.pst-login-transition-name{font-size:20px;font-weight:790;letter-spacing:.4px}.pst-login-transition-copy{font-size:11px;color:#78868D}.pst-login-transition-line{width:126px;height:3px;border-radius:999px;background:#DCE9ED;overflow:hidden}.pst-login-transition-line i{display:block;width:38%;height:100%;border-radius:inherit;background:linear-gradient(90deg,#67A8C0,#3F7F98);animation:pstLoginMove 1.1s ease-in-out infinite}
.pst-login-transition-retry{display:none;margin-top:5px;border:1px solid #CFE0E6;border-radius:9px;background:#fff;color:#3F7F98;padding:8px 12px;font-size:10.5px;font-weight:700;cursor:pointer}.pst-login-transition-stalled .pst-login-transition-line{display:none}.pst-login-transition-stalled .pst-login-transition-retry{display:inline-flex}
@keyframes pstLoginMove{0%{transform:translateX(-110%)}55%{transform:translateX(165%)}100%{transform:translateX(300%)}}
`;
document.head.appendChild(style);

function logo(){return '<svg viewBox="0 0 24 24"><path d="M12 1.8c.7 5.45 4.75 9.5 10.2 10.2-5.45.7-9.5 4.75-10.2 10.2C11.3 16.75 7.25 12.7 1.8 12 7.25 11.3 11.3 7.25 12 1.8Z"/></svg>';}
function intendedVisible(el){return !!el&&!el.hidden&&!(el.style&&el.style.display==='none');}
function ensureOverlay(){
  var old=document.getElementById('pst-login-transition');if(old)return old;
  var el=document.createElement('div');el.id='pst-login-transition';
  el.innerHTML='<div class="pst-login-transition-card"><div class="pst-login-transition-mark">'+logo()+'</div><div class="pst-login-transition-name">PRISTEEL</div><div class="pst-login-transition-copy">Duke hapur workspace-in aktual…</div><div class="pst-login-transition-line"><i></i></div><button type="button" class="pst-login-transition-retry">Rifresko faqen</button></div>';
  el.querySelector('button').onclick=function(){location.reload();};
  (document.body||document.documentElement).appendChild(el);return el;
}
function observeApp(){
  if(state.observer)return;
  var app=document.getElementById('app-shell-root');if(!app)return;
  state.observer=new MutationObserver(function(){state.lastMutation=Date.now();});
  state.observer.observe(app,{subtree:true,childList:true,attributes:true,attributeFilter:['style','class','hidden']});
}
function finalModulesReady(){
  if(state.modules)return true;
  if(window.PSTStartupGuard&&window.PSTStartupGuard.state&&window.PSTStartupGuard.state.modules)return true;
  return !!(window.__pstWorkspaceArchitectureV1Loaded&&window.__pstProjectsModernV1&&window.__pstModulesUnifiedV1&&window.__pstProjectBulkGmailRecoveryV1);
}
function finish(){
  if(!state.active)return;state.active=false;
  clearInterval(state.poll);clearTimeout(state.timeout);if(state.observer){state.observer.disconnect();state.observer=null;}
  root.classList.remove('pst-login-switching');
  var el=document.getElementById('pst-login-transition');if(el){el.classList.add('leaving');setTimeout(function(){if(el.parentNode)el.remove();},260);}
}
function check(){
  if(!state.active)return;
  observeApp();
  var app=document.getElementById('app-shell-root'),gate=document.getElementById('auth-gate');
  if(!intendedVisible(app)||intendedVisible(gate)||!finalModulesReady())return;
  if(Date.now()-state.lastMutation<650)return;
  finish();
}
function begin(){
  if(state.active)return;state.active=true;state.lastMutation=Date.now();
  root.classList.add('pst-login-switching');ensureOverlay();observeApp();
  state.poll=setInterval(check,100);
  state.timeout=setTimeout(function(){
    if(!state.active)return;
    var el=document.getElementById('pst-login-transition');if(el)el.classList.add('pst-login-transition-stalled');
    var copy=el&&el.querySelector('.pst-login-transition-copy');if(copy)copy.textContent='Ngarkimi po zgjat më shumë se zakonisht.';
  },15000);
}
function wrapStartApp(){
  if(state.wrapped||typeof window.startApp!=='function')return;
  var original=window.startApp;state.wrapped=true;
  window.startApp=function(){begin();var result=original.apply(this,arguments);state.lastMutation=Date.now();return result;};
}
function install(){
  var form=document.getElementById('auth-form');if(form&&!form.__pstLoginTransition){form.__pstLoginTransition=true;form.addEventListener('submit',begin,true);}
  wrapStartApp();
}
document.addEventListener('pst:modules-ready',function(){state.modules=true;check();});
if(window.PSTStartupGuard&&window.PSTStartupGuard.state&&window.PSTStartupGuard.state.modules)state.modules=true;
var installer=setInterval(function(){install();if(state.wrapped&&document.getElementById('auth-form'))clearInterval(installer);},80);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
window.PSTLoginTransition={begin:begin,finish:finish,state:state};
})();