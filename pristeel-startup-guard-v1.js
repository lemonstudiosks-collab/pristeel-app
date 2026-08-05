/* PRISTEEL polished startup shell
 * Runs before the legacy document is painted.
 * Keeps the old UI hidden until the current workspace modules are ready.
 */
(function(){
'use strict';
if(window.__pstStartupGuardV1)return;
window.__pstStartupGuardV1=true;

var root=document.documentElement;
var state={dom:false,loaded:false,modules:false,revealed:false,started:Date.now(),quietTimer:null,maxTimer:null,observer:null};
root.classList.add('pst-booting');

var style=document.createElement('style');
style.id='pst-startup-critical-css';
style.textContent=`
:root{
  --bronze:#5B9BB3!important;--bronze-light:#67A8C0!important;--bronze-dark:#3F7F98!important;
  --bronze-bg:rgba(91,155,179,.10)!important;--bronze-text:#3F7F98!important;
  --copper:#5B9BB3!important;--copper-bg:rgba(91,155,179,.10)!important;
}
html.pst-booting,html.pst-booting body{min-height:100%;background:#F3F8FA!important;overflow:hidden!important}
html.pst-booting #app-shell-root,html.pst-booting #auth-gate{opacity:0!important;visibility:hidden!important;pointer-events:none!important}
#pst-startup-shell{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;background:radial-gradient(circle at 72% 18%,rgba(103,168,192,.14),transparent 33%),linear-gradient(145deg,#F8FBFC 0%,#EEF6F8 100%);font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#20282C;opacity:1;transition:opacity .22s ease,visibility .22s ease}
#pst-startup-shell.pst-leaving{opacity:0;visibility:hidden;pointer-events:none}
.pst-startup-card{display:flex;flex-direction:column;align-items:center;gap:13px;text-align:center;transform:translateY(-2vh)}
.pst-startup-mark{width:48px;height:48px;border-radius:15px;background:linear-gradient(145deg,#67A8C0,#3F7F98);box-shadow:0 14px 34px rgba(63,127,152,.22);display:grid;place-items:center;color:#fff}
.pst-startup-mark svg{width:25px;height:25px;fill:currentColor}
.pst-startup-name{font-size:20px;line-height:1;font-weight:790;letter-spacing:.4px}
.pst-startup-copy{font-size:11px;color:#78868D;letter-spacing:.1px}
.pst-startup-line{width:126px;height:3px;border-radius:999px;background:#DCE9ED;overflow:hidden;margin-top:4px}
.pst-startup-line i{display:block;width:38%;height:100%;border-radius:inherit;background:linear-gradient(90deg,#67A8C0,#3F7F98);animation:pstStartupMove 1.1s ease-in-out infinite}
@keyframes pstStartupMove{0%{transform:translateX(-110%)}55%{transform:translateX(165%)}100%{transform:translateX(300%)}}

/* Modern login. These rules override the old inline bronze styles before first paint. */
#auth-gate{background:radial-gradient(circle at 75% 17%,rgba(103,168,192,.15),transparent 32%),linear-gradient(145deg,#F8FBFC,#EDF5F8)!important;padding:22px!important;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif!important}
#auth-gate>.pst-auth-card,#auth-gate>div{width:min(390px,calc(100vw - 40px))!important;text-align:left!important;background:rgba(255,255,255,.96)!important;border:1px solid #D9E6EB!important;border-radius:20px!important;padding:31px 30px 28px!important;box-shadow:0 28px 75px rgba(36,67,80,.14),0 2px 8px rgba(36,67,80,.05)!important}
#auth-gate .pst-auth-head{display:flex;align-items:center;gap:12px;margin-bottom:24px}
#auth-gate .pst-auth-mark{width:42px;height:42px;border-radius:13px;display:grid;place-items:center;background:linear-gradient(145deg,#67A8C0,#3F7F98);color:#fff;box-shadow:0 10px 25px rgba(63,127,152,.20);flex:0 0 auto}
#auth-gate .pst-auth-mark svg{width:22px;height:22px;fill:currentColor}
#auth-gate .pst-auth-brand{font-size:19px!important;line-height:1.05!important;font-weight:790!important;color:#20282C!important;letter-spacing:.25px!important;margin:0!important}
#auth-gate .pst-auth-sub{font-size:10.5px!important;line-height:1.35!important;color:#7A888F!important;margin:4px 0 0!important}
#auth-gate #auth-form{margin:0!important}
#auth-gate #auth-form input{width:100%!important;height:45px!important;padding:0 13px!important;margin:0 0 10px!important;border:1px solid #D8E3E7!important;border-radius:11px!important;background:#FBFDFD!important;color:#20282C!important;font-size:12.5px!important;outline:0!important;box-shadow:none!important;transition:border-color .15s ease,box-shadow .15s ease,background .15s ease!important}
#auth-gate #auth-form input:hover{border-color:#BFD5DE!important;background:#fff!important}
#auth-gate #auth-form input:focus{border-color:#5B9BB3!important;background:#fff!important;box-shadow:0 0 0 4px rgba(91,155,179,.14)!important}
#auth-gate #auth-form button{width:100%!important;height:45px!important;padding:0 15px!important;margin-top:4px!important;border:0!important;border-radius:11px!important;background:linear-gradient(135deg,#67A8C0,#3F7F98)!important;color:#fff!important;font-size:12.5px!important;font-weight:760!important;letter-spacing:.1px!important;cursor:pointer!important;box-shadow:0 10px 24px rgba(63,127,152,.20)!important;transition:transform .15s ease,box-shadow .15s ease!important}
#auth-gate #auth-form button:hover{transform:translateY(-1px)!important;box-shadow:0 13px 29px rgba(63,127,152,.25)!important}
#auth-gate #auth-err{color:#A64B42!important;font-size:10.5px!important;margin-top:11px!important;min-height:15px!important;text-align:center!important}
#auth-gate .pst-auth-note{font-size:9.5px;color:#94A0A5;text-align:center;margin-top:13px}
html.pst-auth-ready #auth-gate{opacity:1!important;visibility:visible!important;pointer-events:auto!important}
html.pst-app-ready #app-shell-root{animation:pstAppReveal .22s ease both}
@keyframes pstAppReveal{from{opacity:0;transform:translateY(3px)}to{opacity:1;transform:none}}
@media(max-width:520px){#auth-gate>div{padding:27px 22px 24px!important;border-radius:17px!important}.pst-startup-card{transform:none}}
`;
document.head.appendChild(style);

function logo(){return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1.8c.7 5.45 4.75 9.5 10.2 10.2-5.45.7-9.5 4.75-10.2 10.2C11.3 16.75 7.25 12.7 1.8 12 7.25 11.3 11.3 7.25 12 1.8Z"/></svg>';}
function ensureShell(){
  if(!document.body||document.getElementById('pst-startup-shell'))return;
  var shell=document.createElement('div');shell.id='pst-startup-shell';shell.innerHTML='<div class="pst-startup-card"><div class="pst-startup-mark">'+logo()+'</div><div class="pst-startup-name">PRISTEEL</div><div class="pst-startup-copy" id="pst-startup-copy">Duke përgatitur workspace-in…</div><div class="pst-startup-line"><i></i></div></div>';
  document.body.appendChild(shell);
}
function polishLogin(){
  var gate=document.getElementById('auth-gate'),form=document.getElementById('auth-form');if(!gate||!form)return false;
  var card=gate.firstElementChild;if(!card)return false;card.classList.add('pst-auth-card');
  if(!card.querySelector('.pst-auth-head')){
    var children=card.children,title=children[0],sub=children[1];
    if(title&&sub){
      title.className='pst-auth-brand';sub.className='pst-auth-sub';sub.textContent='Workspace i sigurt për ekipin PRISTEEL';
      var head=document.createElement('div');head.className='pst-auth-head';
      var mark=document.createElement('div');mark.className='pst-auth-mark';mark.innerHTML=logo();
      var words=document.createElement('div');
      card.insertBefore(head,title);head.appendChild(mark);head.appendChild(words);words.appendChild(title);words.appendChild(sub);
    }
  }
  var button=form.querySelector('button[type="submit"]');if(button)button.textContent='Hyr në PRISTEEL';
  if(!card.querySelector('.pst-auth-note')){var note=document.createElement('div');note.className='pst-auth-note';note.textContent='Qasje e mbrojtur · PRISTEEL Sh.p.k.';card.appendChild(note);}
  return true;
}
function sessionExists(){try{return !!localStorage.getItem('pristeel_session');}catch(e){return false;}}
function visible(el){if(!el)return false;var s=getComputedStyle(el);return s.display!=='none'&&s.visibility!=='hidden';}
function setCopy(text){var e=document.getElementById('pst-startup-copy');if(e)e.textContent=text;}
function finish(kind){
  if(state.revealed)return;state.revealed=true;
  clearTimeout(state.maxTimer);clearTimeout(state.quietTimer);if(state.observer)state.observer.disconnect();
  polishLogin();
  root.classList.remove('pst-booting');root.classList.add(kind==='auth'?'pst-auth-ready':'pst-app-ready');
  var shell=document.getElementById('pst-startup-shell');if(shell){shell.classList.add('pst-leaving');setTimeout(function(){if(shell.parentNode)shell.remove();},260);}
}
function settleApp(){
  if(state.revealed)return;
  clearTimeout(state.quietTimer);
  state.quietTimer=setTimeout(function(){
    var app=document.getElementById('app-shell-root'),gate=document.getElementById('auth-gate');
    if(state.modules&&app&&visible(app)&&(!gate||!visible(gate)))finish('app');
    else check();
  },420);
}
function check(){
  if(state.revealed||!state.dom)return;
  polishLogin();
  var gate=document.getElementById('auth-gate'),app=document.getElementById('app-shell-root');
  var gateOn=visible(gate),appOn=visible(app);
  if(gateOn&&!appOn&&!sessionExists()&&state.loaded){finish('auth');return;}
  if(state.modules&&appOn&&!gateOn){settleApp();return;}
  if(state.loaded&&gateOn&&!appOn&&Date.now()-state.started>900){finish('auth');}
}
function observe(){
  if(!document.body||state.observer)return;
  state.observer=new MutationObserver(function(){check();if(state.modules)settleApp();});
  state.observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['style','class']});
}
function domReady(){state.dom=true;ensureShell();polishLogin();observe();check();}
function modulesReady(){state.modules=true;setCopy('Duke finalizuar workspace-in…');settleApp();}

window.PSTStartupGuard={
  modulesReady:modulesReady,
  reveal:function(){check();},
  state:state
};
document.addEventListener('pst:modules-ready',modulesReady);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',domReady,{once:true});else domReady();
window.addEventListener('load',function(){state.loaded=true;check();setTimeout(check,250);});
state.maxTimer=setTimeout(function(){
  if(state.revealed)return;
  var app=document.getElementById('app-shell-root'),gate=document.getElementById('auth-gate');
  if(app&&visible(app)&&(!gate||!visible(gate)))finish('app');else finish('auth');
},12000);
})();
