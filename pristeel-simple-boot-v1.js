/* PRISTEEL bounded boot screen. No observers, no intervals. */
(function(){
'use strict';
if(window.__pstSimpleBootV1)return;
window.__pstSimpleBootV1=true;
var root=document.documentElement,hideTimer=null,fallbackTimer=null;
var style=document.createElement('style');style.id='pst-simple-boot-style';style.textContent=`
:root{--bronze:#5B9BB3!important;--bronze-light:#67A8C0!important;--bronze-dark:#3F7F98!important;--bronze-bg:rgba(91,155,179,.10)!important;--bronze-text:#3F7F98!important}
html.pst-simple-boot,html.pst-simple-boot body{overflow:hidden!important;background:#F3F8FA!important}
html.pst-simple-boot #auth-gate,html.pst-simple-boot #app-shell-root{opacity:0!important;visibility:hidden!important;pointer-events:none!important}
#pst-simple-boot{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;background:radial-gradient(circle at 72% 18%,rgba(103,168,192,.14),transparent 33%),linear-gradient(145deg,#F8FBFC,#EEF6F8);font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#20282C;transition:opacity .2s ease,visibility .2s ease}
#pst-simple-boot.leaving{opacity:0;visibility:hidden;pointer-events:none}.pst-sb-card{display:flex;flex-direction:column;align-items:center;gap:13px;transform:translateY(-2vh)}.pst-sb-mark{width:48px;height:48px;border-radius:15px;background:linear-gradient(145deg,#67A8C0,#3F7F98);box-shadow:0 14px 34px rgba(63,127,152,.22);display:grid;place-items:center;color:#fff}.pst-sb-mark svg{width:25px;height:25px;fill:currentColor}.pst-sb-name{font-size:20px;font-weight:790;letter-spacing:.4px}.pst-sb-copy{font-size:11px;color:#78868D}.pst-sb-line{width:126px;height:3px;border-radius:999px;background:#DCE9ED;overflow:hidden}.pst-sb-line i{display:block;width:38%;height:100%;background:linear-gradient(90deg,#67A8C0,#3F7F98);animation:pstSbMove 1.1s ease-in-out infinite}@keyframes pstSbMove{0%{transform:translateX(-110%)}55%{transform:translateX(165%)}100%{transform:translateX(300%)}}
#auth-gate{background:radial-gradient(circle at 75% 17%,rgba(103,168,192,.15),transparent 32%),linear-gradient(145deg,#F8FBFC,#EDF5F8)!important}
#auth-gate #auth-form input:focus{border-color:#5B9BB3!important;box-shadow:0 0 0 4px rgba(91,155,179,.14)!important}
#auth-gate #auth-form button{background:linear-gradient(135deg,#67A8C0,#3F7F98)!important;color:#fff!important;border:0!important}
`;
document.head.appendChild(style);
function logo(){return '<svg viewBox="0 0 24 24"><path d="M12 1.8c.7 5.45 4.75 9.5 10.2 10.2-5.45.7-9.5 4.75-10.2 10.2C11.3 16.75 7.25 12.7 1.8 12 7.25 11.3 11.3 7.25 12 1.8Z"/></svg>';}
function ensure(){var el=document.getElementById('pst-simple-boot');if(el)return el;el=document.createElement('div');el.id='pst-simple-boot';el.innerHTML='<div class="pst-sb-card"><div class="pst-sb-mark">'+logo()+'</div><div class="pst-sb-name">PRISTEEL</div><div class="pst-sb-copy">Duke hapur platformën…</div><div class="pst-sb-line"><i></i></div></div>';(document.body||document.documentElement).appendChild(el);return el;}
function show(copy){clearTimeout(hideTimer);root.classList.add('pst-simple-boot');var el=ensure(),c=el.querySelector('.pst-sb-copy');el.classList.remove('leaving');if(c)c.textContent=copy||'Duke hapur platformën…';}
function hide(delay){clearTimeout(hideTimer);hideTimer=setTimeout(function(){root.classList.remove('pst-simple-boot');var el=document.getElementById('pst-simple-boot');if(el){el.classList.add('leaving');setTimeout(function(){if(el.parentNode)el.remove();},230);}},Math.max(0,delay||0));}
show('Duke përgatitur platformën…');
document.addEventListener('pst:modules-ready',function(){hide(180);},{once:true});
window.addEventListener('load',function(){hide(1800);},{once:true});
fallbackTimer=setTimeout(function(){hide(0);},6500);
function install(){var form=document.getElementById('auth-form');if(!form)return;form.addEventListener('submit',function(){show('Duke hapur workspace-in…');hide(1800);},true);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
window.PSTSimpleBoot={show:show,hide:hide};
})();