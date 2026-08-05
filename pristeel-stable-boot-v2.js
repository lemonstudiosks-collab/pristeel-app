/* PRISTEEL stable startup v2
 * Keeps legacy/intermediate layouts hidden until the final modules and fonts are ready.
 * No MutationObserver, no setInterval, no background polling.
 */
(function(){
'use strict';
if(window.__pstStableBootV2)return;
window.__pstStableBootV2=true;

var root=document.documentElement;
var state={
  modules:!!window.__pstModulesReady,
  appStarted:false,
  revealed:false,
  generation:0,
  appRevealScheduled:false,
  loginFallback:null,
  finalFallback:null,
  startWrapped:false
};

root.classList.add('pst-stable-boot','pst-stable-freeze');

var style=document.createElement('style');
style.id='pst-stable-boot-v2-style';
style.textContent=`
:root{
  --bronze:#5B9BB3!important;--bronze-light:#67A8C0!important;--bronze-dark:#3F7F98!important;
  --bronze-bg:rgba(91,155,179,.10)!important;--bronze-text:#3F7F98!important;
  --copper:#5B9BB3!important;--copper-bg:rgba(91,155,179,.10)!important;
}
html{scrollbar-gutter:stable;background:#F3F8FA}
html.pst-stable-boot,html.pst-stable-boot body{min-height:100%;overflow:hidden!important;background:#F3F8FA!important}
html.pst-stable-boot #auth-gate,html.pst-stable-boot #app-shell-root{visibility:hidden!important;opacity:0!important;pointer-events:none!important}
html.pst-stable-freeze #app-shell-root *,html.pst-stable-freeze #auth-gate *{transition:none!important;animation:none!important}
#pst-stable-boot-v2{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;background:radial-gradient(circle at 72% 18%,rgba(103,168,192,.14),transparent 33%),linear-gradient(145deg,#F8FBFC,#EEF6F8);font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#20282C;opacity:1;visibility:visible;transition:opacity .16s ease,visibility .16s ease}
#pst-stable-boot-v2.leaving{opacity:0;visibility:hidden;pointer-events:none}
.pst-stable-card{display:flex;flex-direction:column;align-items:center;gap:13px;text-align:center;transform:translateY(-2vh)}
.pst-stable-mark{width:48px;height:48px;border-radius:15px;background:linear-gradient(145deg,#67A8C0,#3F7F98);box-shadow:0 14px 34px rgba(63,127,152,.22);display:grid;place-items:center;color:#fff}
.pst-stable-mark svg{width:25px;height:25px;fill:currentColor}.pst-stable-name{font-size:20px;font-weight:790;letter-spacing:.4px}.pst-stable-copy{font-size:11px;color:#78868D}.pst-stable-line{width:126px;height:3px;border-radius:999px;background:#DCE9ED;overflow:hidden}.pst-stable-line i{display:block;width:38%;height:100%;border-radius:inherit;background:linear-gradient(90deg,#67A8C0,#3F7F98);animation:pstStableMove 1.1s ease-in-out infinite}
@keyframes pstStableMove{0%{transform:translateX(-110%)}55%{transform:translateX(165%)}100%{transform:translateX(300%)}}
#auth-gate{background:radial-gradient(circle at 75% 17%,rgba(103,168,192,.15),transparent 32%),linear-gradient(145deg,#F8FBFC,#EDF5F8)!important}
#auth-gate #auth-form input:focus{border-color:#5B9BB3!important;box-shadow:0 0 0 4px rgba(91,155,179,.14)!important}
#auth-gate #auth-form button{background:linear-gradient(135deg,#67A8C0,#3F7F98)!important;color:#fff!important;border:0!important}
`;
document.head.appendChild(style);

function logo(){return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1.8c.7 5.45 4.75 9.5 10.2 10.2-5.45.7-9.5 4.75-10.2 10.2C11.3 16.75 7.25 12.7 1.8 12 7.25 11.3 11.3 7.25 12 1.8Z"/></svg>';}
function intendedVisible(el){return !!el&&!el.hidden&&!(el.style&&el.style.display==='none');}
function ensureOverlay(copy){
  var el=document.getElementById('pst-stable-boot-v2');
  if(!el){
    el=document.createElement('div');el.id='pst-stable-boot-v2';
    el.innerHTML='<div class="pst-stable-card"><div class="pst-stable-mark">'+logo()+'</div><div class="pst-stable-name">PRISTEEL</div><div class="pst-stable-copy">Duke përgatitur platformën…</div><div class="pst-stable-line"><i></i></div></div>';
    (document.body||document.documentElement).appendChild(el);
  }
  el.classList.remove('leaving');
  var label=el.querySelector('.pst-stable-copy');if(label&&copy)label.textContent=copy;
  return el;
}
function enter(copy){
  state.generation++;
  state.revealed=false;state.appRevealScheduled=false;
  root.classList.remove('pst-auth-ready','pst-app-ready');
  root.classList.add('pst-stable-boot','pst-stable-freeze');
  ensureOverlay(copy||'Duke përgatitur platformën…');
}
function afterTwoFrames(fn){
  var raf=window.requestAnimationFrame||function(cb){return setTimeout(cb,16);};
  raf(function(){raf(fn);});
}
function fontsReady(){
  if(!document.fonts||!document.fonts.ready)return Promise.resolve();
  return Promise.race([
    document.fonts.ready.catch(function(){}),
    new Promise(function(resolve){setTimeout(resolve,2500);})
  ]);
}
function finish(kind,generation){
  if(generation!=null&&generation!==state.generation)return;
  if(state.revealed)return;
  state.revealed=true;
  clearTimeout(state.loginFallback);clearTimeout(state.finalFallback);
  root.classList.remove('pst-stable-boot');
  root.classList.add(kind==='auth'?'pst-auth-ready':'pst-app-ready');
  var el=document.getElementById('pst-stable-boot-v2');
  if(el){el.classList.add('leaving');setTimeout(function(){if(el.parentNode)el.remove();},190);}
  setTimeout(function(){root.classList.remove('pst-stable-freeze');},360);
}
function revealAuth(delay){
  var generation=state.generation;
  fontsReady().then(function(){afterTwoFrames(function(){setTimeout(function(){finish('auth',generation);},Math.max(0,delay||0));});});
}
function scheduleAppReveal(){
  if(state.appRevealScheduled||!state.appStarted||!state.modules)return;
  state.appRevealScheduled=true;
  var generation=state.generation;
  ensureOverlay('Duke finalizuar workspace-in…');
  fontsReady().then(function(){
    afterTwoFrames(function(){
      setTimeout(function(){finish('app',generation);},700);
    });
  });
}
function hasSessionHint(){
  try{if(typeof window.authGetSession==='function'){var s=window.authGetSession();if(s&&(s.access_token||s.user||s.email))return true;}}catch(e){}
  try{if(localStorage.getItem('pst_auth_session_snapshot_v2'))return true;}catch(e){}
  try{
    for(var i=0;i<sessionStorage.length;i++){
      var key=sessionStorage.key(i)||'',value=sessionStorage.getItem(key)||'';
      if(/access[_-]?token|refresh[_-]?token|auth[_-]?session|supabase|sb-/i.test(key+' '+value))return true;
    }
  }catch(e){}
  return false;
}
function wrapStartApp(){
  if(state.startWrapped||typeof window.startApp!=='function')return false;
  var original=window.startApp;
  window.startApp=function(){
    enter('Duke hapur workspace-in aktual…');
    state.appStarted=true;
    clearTimeout(state.loginFallback);
    var result=original.apply(this,arguments);
    scheduleAppReveal();
    return result;
  };
  window.startApp.__pstStableBootWrapped=true;
  state.startWrapped=true;
  return true;
}
function installLogin(){
  var form=document.getElementById('auth-form');
  if(!form||form.__pstStableBootSubmit)return;
  form.__pstStableBootSubmit=true;
  form.addEventListener('submit',function(){
    enter('Duke verifikuar hyrjen…');
    state.appStarted=false;
    state.loginFallback=setTimeout(function(){
      var app=document.getElementById('app-shell-root'),gate=document.getElementById('auth-gate');
      if(intendedVisible(app)&&!intendedVisible(gate)){state.appStarted=true;scheduleAppReveal();}
      else revealAuth(0);
    },4200);
  },true);
}
function initialState(){
  ensureOverlay('Duke përgatitur platformën…');
  wrapStartApp();installLogin();
  var app=document.getElementById('app-shell-root'),gate=document.getElementById('auth-gate');
  if(intendedVisible(app)&&!intendedVisible(gate)){
    state.appStarted=true;scheduleAppReveal();return;
  }
  if(intendedVisible(gate)&&!hasSessionHint()){
    revealAuth(100);return;
  }
  setTimeout(function(){
    wrapStartApp();installLogin();
    var currentApp=document.getElementById('app-shell-root'),currentGate=document.getElementById('auth-gate');
    if(intendedVisible(currentApp)&&!intendedVisible(currentGate)){
      state.appStarted=true;scheduleAppReveal();
    }else if(intendedVisible(currentGate)&&!state.appStarted){
      revealAuth(0);
    }
  },900);
}

document.addEventListener('pst:modules-ready',function(){state.modules=true;window.__pstModulesReady=true;scheduleAppReveal();},{once:true});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initialState,{once:true});else initialState();
window.addEventListener('load',function(){wrapStartApp();installLogin();},{once:true});
state.finalFallback=setTimeout(function(){
  if(state.revealed)return;
  var app=document.getElementById('app-shell-root'),gate=document.getElementById('auth-gate');
  if(intendedVisible(app)&&!intendedVisible(gate))finish('app');else finish('auth');
},10000);

window.PSTStableBoot={enter:enter,revealApp:function(){state.appStarted=true;scheduleAppReveal();},revealAuth:revealAuth,state:state};
})();
