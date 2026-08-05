/* PRISTEEL bounded login transition
 * No MutationObserver and no endless intervals.
 */
(function(){
'use strict';
if(window.__pstLoginTransitionV2)return;
window.__pstLoginTransitionV2=true;
var root=document.documentElement,state={active:false,started:0,timer:null,installTries:0};
var style=document.createElement('style');style.id='pst-login-transition-v2-style';style.textContent=`
html.pst-login-switching,html.pst-login-switching body{overflow:hidden!important;background:#F3F8FA!important}
html.pst-login-switching #auth-gate,html.pst-login-switching #app-shell-root{opacity:0!important;visibility:hidden!important;pointer-events:none!important}
#pst-login-transition-v2{position:fixed;inset:0;z-index:2147483001;display:flex;align-items:center;justify-content:center;background:radial-gradient(circle at 72% 18%,rgba(103,168,192,.14),transparent 33%),linear-gradient(145deg,#F8FBFC,#EEF6F8);font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#20282C;transition:opacity .2s ease,visibility .2s ease}
#pst-login-transition-v2.leaving{opacity:0;visibility:hidden;pointer-events:none}.pst-lt-card{display:flex;flex-direction:column;align-items:center;gap:13px;transform:translateY(-2vh)}.pst-lt-mark{width:48px;height:48px;border-radius:15px;background:linear-gradient(145deg,#67A8C0,#3F7F98);box-shadow:0 14px 34px rgba(63,127,152,.22);display:grid;place-items:center;color:#fff}.pst-lt-mark svg{width:25px;height:25px;fill:currentColor}.pst-lt-name{font-size:20px;font-weight:790;letter-spacing:.4px}.pst-lt-copy{font-size:11px;color:#78868D}.pst-lt-line{width:126px;height:3px;border-radius:999px;background:#DCE9ED;overflow:hidden}.pst-lt-line i{display:block;width:38%;height:100%;border-radius:inherit;background:linear-gradient(90deg,#67A8C0,#3F7F98);animation:pstLtMove 1.1s ease-in-out infinite}@keyframes pstLtMove{0%{transform:translateX(-110%)}55%{transform:translateX(165%)}100%{transform:translateX(300%)}}
`;
document.head.appendChild(style);
function logo(){return '<svg viewBox="0 0 24 24"><path d="M12 1.8c.7 5.45 4.75 9.5 10.2 10.2-5.45.7-9.5 4.75-10.2 10.2C11.3 16.75 7.25 12.7 1.8 12 7.25 11.3 11.3 7.25 12 1.8Z"/></svg>';}
function intendedVisible(el){return !!el&&!el.hidden&&!(el.style&&el.style.display==='none');}
function ensure(){var el=document.getElementById('pst-login-transition-v2');if(el)return el;el=document.createElement('div');el.id='pst-login-transition-v2';el.innerHTML='<div class="pst-lt-card"><div class="pst-lt-mark">'+logo()+'</div><div class="pst-lt-name">PRISTEEL</div><div class="pst-lt-copy">Duke hapur workspace-in aktual…</div><div class="pst-lt-line"><i></i></div></div>';document.body.appendChild(el);return el;}
function ready(){var app=document.getElementById('app-shell-root'),gate=document.getElementById('auth-gate');return intendedVisible(app)&&!intendedVisible(gate)&&!!window.__pstWorkspaceArchitectureV1Loaded&&!!window.__pstProjectsModernV1;}
function finish(){if(!state.active)return;state.active=false;clearTimeout(state.timer);root.classList.remove('pst-login-switching');var el=document.getElementById('pst-login-transition-v2');if(el){el.classList.add('leaving');setTimeout(function(){if(el.parentNode)el.remove();},220);}}
function check(){if(!state.active)return;var age=Date.now()-state.started;if((age>650&&ready())||age>5000){finish();return;}state.timer=setTimeout(check,140);}
function begin(){if(state.active)return;state.active=true;state.started=Date.now();root.classList.add('pst-login-switching');ensure();state.timer=setTimeout(check,180);}
function install(){var form=document.getElementById('auth-form');if(form&&!form.__pstLoginTransitionV2){form.__pstLoginTransitionV2=true;form.addEventListener('submit',begin,true);return;}if(!form&&state.installTries++<40)setTimeout(install,100);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
window.PSTLoginTransition={begin:begin,finish:finish,state:state};
})();